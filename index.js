module.exports = function(ts_ip, q_username, q_password, bot_username, bot_password, minlevel, defaultrankid, wantedrankid) {

    var TeamSpeakClient = require("node-teamspeak"),
        fs = require('fs'),
        Steam = require('steam'),
        crypto = require('crypto'),

        steamClient = new Steam.SteamClient(),
        steamUser = new Steam.SteamUser(steamClient),
        steamFriends = new Steam.SteamFriends(steamClient);


    //connect to steam with credentials
    steamClient.connect();
    steamClient.on('connected', function () {
        steamUser.logOn({
            account_name: bot_username,
            password: bot_password
        });
    });

    steamClient.on('logOnResponse', function (logonResp) {
        //log when logged in.
        if (logonResp.eresult == Steam.EResult.OK) {
            console.log('Logged in!');
            steamFriends.setPersonaState(Steam.EPersonaState.Online);
        }
    });

    steamFriends.on('friend', function(source, type) {
        //auto accept friend requests
        if(type == Steam.EFriendRelationship.RequestRecipient) {
            logText("Accepted a friend request from: " + source, false);
            steamFriends.addFriend(source);
        }
    });

    if (!fs.existsSync('verified.json')) {
        //if verified.json doesnt exist create it
        var writeMe = {
            users: []
        };
        fs.writeFileSync('verified.json', JSON.stringify(writeMe, null, 2), 'utf-8');
    }

    //initialize variables wherein the temporary keys will be stored which will be poked
    // and wherein the users who are in the middle of a verification process will be stored.
    var verifying = {};
    var userKeys = {};

    //read and process input through steam chat
    steamFriends.on('message', function (source, message) {
        //empty messages are received when the user is still typing. useless information for us.
        if (message != "") {
            console.log('Received message: ' + message);
            if (message == '!verify') {
                //if they are in the middle of a verification process at step "nickname" where they need to fill in their teamspeak username
                if (verifying[source] == "nickname") {
                    steamFriends.sendMessage(source, "\nYou're currently already in the middle of a verification process." +
                        "\nPlease enter your TeamSpeak nickname:", Steam.EChatEntryType.ChatMsg);
                    //else if they are in the middle of a verification process at step "randomcode" where they need to fill in their poked code
                } else if (verifying[source] == "randomcode")
                    steamFriends.sendMessage(source, "\nYou're currently already in the middle of a verification process." +
                        "\nPlease enter the random generated string which got poked to you here in the Steam chat:", Steam.EChatEntryType.ChatMsg);
                else {
                    //if not already verifying commence the process, first check if they meet the required min steam level
                    steamFriends.getSteamLevel([source], function (steamlvl) {
                        if (!steamlvl[source] >= minlevel) {
                            steamFriends.sendMessage(source, "\nYour steam level is too low for automated verification." +
                                "\nPlease refer to a staff member for manual verification.", Steam.EChatEntryType.ChatMsg);
                        } else {
                            verifying[source] = "nickname";
                            steamFriends.sendMessage(source, '\nVerifying process has started, make sure that you are currently connected to the TeamSpeak server.' +
                                '\nPlease enter your current TeamSpeak name here:', Steam.EChatEntryType.ChatMsg);
                        }
                    });
                }
            } else {
                //if the message isnt a command but in the middle of a verification process,
                //check which one and then execute a function with the given message as parameter
                if (typeof verifying[source] !== "undefined") {
                    var prandomcode = verifying[source].split("&");
                }
                if (verifying[source] == "nickname") {
                    verifyUser(message, source);
                } else if (typeof prandomcode !== "undefined") {
                    if (prandomcode[0] == "randomcode") {
                        checkKey(message, source);
                    }
                } else {
                    steamFriends.sendMessage(source, '\nCommand not recognized, please use !verify', Steam.EChatEntryType.ChatMsg);
                }
            }
        }
    });

    var cl = new TeamSpeakClient(ts_ip);

    //log into the teamspeak query server and use a virtual machine so we can dig deeper for information
    function loginTs() {
        cl.send("login", {client_login_name: q_username, client_login_password: q_password}, function (err, response) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                console.log("Connected to the query.");
                cl.send("use", {sid: 1}, function (err, response) {
                    if (typeof err !== "undefined") {
                        console.log(err);
                    } else {
                        console.log("Using virtual server 1 now.");
                        cl.send("clientupdate", {client_nickname: "Steambot"}, function (err, response) {
                            if (typeof err !== "undefined") {
                                console.log(err);
                            } else {
                                console.log("Changed query client name.");
                            }
                        })
                    }
                })
            }
        })
    }
    loginTs();

    //this initiates the verifying process
    function verifyUser(message, source) {
        cl.send("clientfind", {pattern: message}, function (err, response) {
            if (typeof err !== "undefined") {
                //if err 512 the user wasnt found, other errors might be on the server side instead = LOGGED
                //internal errors usually mean server side errors in this case, if you don't know whats wrong:
                //please report them at https://github.com/nikitavondel/steam-ts
                if (err.id == 512) {
                    console.log(message + " not found.");
                    steamFriends.sendMessage(source, '\nUser not found.', Steam.EChatEntryType.ChatMsg);
                    delete verifying[source];
                } else {
                    console.log(err);
                    console.log("Internal error" + message + "not found.");
                    steamFriends.sendMessage(source, '\nInternal error, user not found.', Steam.EChatEntryType.ChatMsg);
                    delete verifying[source];
                }
            } else {
                //if user was found, get their clientid
                var user_clid = response.clid;
                console.log(message + " was found, getting group...");
                //if there are multiple results tell the user to temporarily change their name.
                if (response.isArray) {
                    console.log(message + " nickname not specific enough");
                    steamFriends.sendMessage(source, "\nFound too many results, please change your teamspeak name temporarily for successful verification.", Steam.EChatEntryType.ChatMsg);
                    delete verifying[source];
                } else {
                    //good, we find the user, now lets get their groupid
                    cl.send("clientinfo", {clid: user_clid}, function (err, response) {
                        //if we cant find the group but it is a valid user then well shit... LOG
                        if (typeof err !== "undefined") {
                            console.log(err);
                            console.log("Internal error, verification failed.");
                            steamFriends.sendMessage(source, '\nInternal error, verification failed.', Steam.EChatEntryType.ChatMsg);
                            delete verifying[source];
                        } else {
                            //group found , run simple logic to check whether they are already verified or not
                            if (response.client_servergroups == defaultrankid) {
                                console.log("Sent user message on teamspeak, waiting for confirmation...");
                                sendKeyTs(user_clid, source);
                            } else {
                                console.log("You're already an approved member.");
                                steamFriends.sendMessage(source, "\nYou're already an approved member.", Steam.EChatEntryType.ChatMsg);
                                delete verifying[source];
                            }
                        }
                    })
                }
            }
        })
    }

    //generate random key and poke the teamspeak user with it
    function sendKeyTs(clid, source) {
        var key = crypto.randomBytes(20).toString('hex');
        //store the key in userKeys
        userKeys[source] = key;
        cl.send("clientpoke", {clid: clid, msg: key}, function (err, response) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                steamFriends.sendMessage(source, '\nWe have poked you on TeamSpeak.' +
                    '\nPlease copy the random string and paste it here in the Steam chat:', Steam.EChatEntryType.ChatMsg);
                verifying[source] = "randomcode&" + clid;
            }
        })
    }

    //check the received key through Steam chat and see if it matches the key sent and stored in the function sendKeyTs
    function checkKey(message, source) {
        console.log("Checking key...");
        if (userKeys[source] == message) {
            //great, keys match now store the link in a json file and promote them
            var verified_users = JSON.parse(fs.readFileSync('verified.json'));
            var split_clid = verifying[source].split("&");

            cl.send("clientinfo", {clid: split_clid[1]}, function (err, response) {
                if (typeof err !== "undefined") {
                    console.log(err);
                } else {
                    var identity = response.client_unique_identifier;
                    var pushMe = {};
                    pushMe[source] = identity;
                    verified_users.users.push(pushMe);
                    fs.writeFileSync('verified.json', JSON.stringify(verified_users, null, 4));
                    console.log("Added " + source + " to verified.json");

                    var cldbid = response.client_database_id;
                    cl.send("servergroupaddclient", {sgid: wantedrankid, cldbid: cldbid}, function (err, response) {
                        if (typeof err !== "undefined") {
                            console.log(err);
                        } else {
                            console.log("Verified " + source);
                            steamFriends.sendMessage(source, '\nYou have been successfully verified!', Steam.EChatEntryType.ChatMsg);
                        }
                    })
                }
            });
        } else {
            //key didnt match, restart verfication process to prevent bruteforce
            console.log(source + " entered an invalid verifykey.");
            steamFriends.sendMessage(source, '\nInvalid key, use !verify to restart the process.', Steam.EChatEntryType.ChatMsg);
        }
        //delete their stored info
        delete userKeys[source];
        delete verifying[source];
    }
};
