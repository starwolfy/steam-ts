exports.launch = function() {
    var TeamSpeakClient = require("node-teamspeak"),
        fs = require('fs'),
        Steam = require('steam'),
        crypto = require('crypto'),
        serverchannel = require('./serverchannel.js'),
        mkdirp = require('mkdirp'),
        path = require('path'),

        steamClient = new Steam.SteamClient(),
        steamUser = new Steam.SteamUser(steamClient),
        steamFriends = new Steam.SteamFriends(steamClient),

        //read the config.json
        configjson = JSON.parse(fs.readFileSync(path.join(__dirname , '../', "config.json"))),
        ts_ip = configjson.main.ts_ip,
        q_username = configjson.main.q_username,
        q_password = configjson.main.q_password,
        bot_username = configjson.main.bot_username,
        bot_password = configjson.main.bot_password,
        minlevel = configjson.main.minlevel,
        defaultrankid = configjson.main.defaultrankid,
        wantedrankid = configjson.main.wantedrankid,
        querytime = configjson.serverchannel.querytime,
        useserverchannel = configjson.serverchannel.enabled;
        exports.teamspeakstatus = false;

    if (!fs.existsSync(path.join(__dirname , '../', "data"))) {
        console.log("Creating data folder...");
        mkdirp.sync(path.join(__dirname , '../', "data"));
    }

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
            console.log("Accepted a friend request from: " + source);
            steamFriends.addFriend(source);
        }
    });

    steamFriends.on('relationships', function() {
        for (var prop in steamFriends.friends) {
            if (steamFriends.friends.hasOwnProperty(prop)) {
                if (steamFriends.friends[prop] == 2) {
                    steamFriends.addFriend(prop);
                    console.log("Accepted a friend request from (offline): " + prop);
                }
            }
        }
    });

    if (!fs.existsSync(path.join(__dirname , '../', "data/verified.json"))) {
        //if verified.json doesnt exist create it
        var writeMe = {
            users: []
        };
        fs.writeFileSync(path.join(__dirname , '../', "data/verified.json"), JSON.stringify(writeMe, null, 2), 'utf-8');
    }

    //initialize variables wherein the temporary keys will be stored which will be messaged
    // and wherein the users who are in the middle of a verification process will be stored.
    var verifying = {}; //store in which part certain steamids of the verifying process are
    var userKeys = {}; //store steamids with randomly generated keys which get sent to them in teamspeak
    var messageStamps = {};
    setInterval(function () {
        messageStamps = {};
    }, 30000);

    //read and process input through steam chat
    steamFriends.on('message', function (source, message) {
        //empty messages are received when the user is still typing. useless information for us.
        if (message != "") {
            //spam protection
            if (typeof messageStamps[source] === "undefined") {
                //first message
                messageStamps[source] = 0;
                messageStamps[source]++;
            } else {
                messageStamps[source]++;
                if (messageStamps[source] > 6) {
                    //too many messages
                    console.log(source + " is spamming.");
                    steamFriends.sendMessage(source, "\nYou're sending too many messages, please wait.", Steam.EChatEntryType.ChatMsg);
                    return;
                }
            }

            console.log('Received message from ' + source + ': ' + message);
            if (message == '!verify') {
                //check if theyre not verified already
                var verified_users = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/verified.json")));
                for (var i=0;i<verified_users.users.length;i++) {
                    var currentuser = verified_users.users[i];
                    if (typeof currentuser[source] !== "undefined") {
                        steamFriends.sendMessage(source, "\nThis account has been assigned to: " + currentuser[source] +
                            "\n If you believe that this is not true, feel free to report it to a staff member.", Steam.EChatEntryType.ChatMsg);
                        return;
                    }
                }

                if (typeof verifying[source] === "undefined") {
                    //start a new process
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
                } else {
                    //youre already in the middle of a process
                    steamFriends.sendMessage(source, "\nYou're currently already in the middle of a verification process." +
                        "\nPlease enter the random generated string which got messaged to you here in the Steam chat:", Steam.EChatEntryType.ChatMsg);
                }
            } else {
                //if the message isnt a command but in the middle of a verification process,
                //check which one and then execute a function with the given message as parameter
                if (typeof verifying[source] === "undefined") {
                    steamFriends.sendMessage(source, '\nCommand not recognized, please use !verify', Steam.EChatEntryType.ChatMsg);
                } else if (verifying[source] == "nickname") {
                    verifyUser(message, source);
                } else {
                    //must remain the last option
                    checkKey(message, source);
                }
            }
        }
    });

    var cl = new TeamSpeakClient(ts_ip);
    exports.cl = cl;

    //log into the teamspeak query server and use a virtual machine so we can dig deeper for information
    function loginTs(q_username, q_password) {
        cl.send("login", {client_login_name: q_username, client_login_password: q_password}, function (err) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                exports.teamspeakstatus = true;
                console.log("Connected to the query.");
                cl.send("use", {sid: 1}, function (err, response) {
                    if (typeof err !== "undefined") {
                        console.log(err);
                    } else {
                        console.log("Using virtual server 1 now.");
                        launchChannels();
                        cl.send("clientupdate", {client_nickname: "Steambot"}, function (err) {
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
    loginTs(q_username, q_password);

    function launchChannels() {
        serverchannel();
        if (useserverchannel) {
            setInterval(serverchannel, querytime);
        }
    }

    cl.on("error", function(err){
        console.log("Socket error: " + err);
    });
    cl.on("close", function() {
        exports.teamspeakstatus = false;
        console.log("Connection closed, attempting to reconnect...");
       loginTs(q_username, q_password);
    });
    cl.on("connect", function(){
        exports.teamspeakstatus = true;
    });

    //if we're disconnected keep on trying to connect again
    setInterval(function() {keepitAlive(q_username, q_password)},10000);

    function keepitAlive(q_username, q_password) {
        if (!exports.teamspeakstatus) {
            console.log("Trying to reconnect...");
            loginTs(q_username, q_password);
        }
    }

    //prevents our query bot from being timed out by the teamspeak query server
    setInterval(decoyQuery, 180000);
    function decoyQuery() {
        if (!exports.teamspeakstatus) {
            console.log("Can't send a decoy query, server down.");
            return;
        }
        cl.send("version", function (err) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                console.log("Sent decoy query.");
            }
        })
    }

    //this initiates the verifying process
    function verifyUser(message, source) {
        //if we're online
        if (exports.teamspeakstatus) {
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
        } else {
            steamFriends.sendMessage(source, "\nThe TeamSpeak server is offline, please try again later.", Steam.EChatEntryType.ChatMsg);
        }
    }

    //generate random key and message the teamspeak user with it
    function sendKeyTs(clid, source) {
        if (exports.teamspeakstatus) {
            var key = crypto.randomBytes(20).toString('hex');
            //store the key in userKeys
            userKeys[source] = [];
            userKeys[source].push(key);

            var sendmessage = "Random token: " + key + "\nGenerated by: " + source + "\nThis is an automated message, if you didn't use !verify please report the above steamid64 to a staff member.";

            cl.send("sendtextmessage", {targetmode: 1, target: clid, msg: sendmessage}, function (err) {
                if (typeof err !== "undefined") {
                    console.log(err);
                } else {
                    steamFriends.sendMessage(source, '\nWe have messaged you on TeamSpeak.' +
                        '\nPlease copy the random string and paste it here in the Steam chat:', Steam.EChatEntryType.ChatMsg);
                    verifying[source] = clid;
                }
            })
        } else {
            steamFriends.sendMessage(source, "\nThe TeamSpeak server is offline, please try again later.", Steam.EChatEntryType.ChatMsg);
        }
    }

    //check the received key through Steam chat and see if it matches the key sent and stored in the function sendKeyTs
    function checkKey(message, source) {
        if (exports.teamspeakstatus) {
            console.log("Checking key...");
            var keysArray = userKeys[source];
            for (i=0;i<keysArray.length;i++) {
                if (keysArray[i] == message) {
                    //great, keys match now store the link in a json file and promote them
                    var verified_users = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/verified.json")));
                    for (var i = 0; i < verified_users.users.length; i++) {
                        if (source in verified_users.users[i]) {
                            steamFriends.sendMessage(source, '\nThis steam account already belongs to another TeamSpeak identity.', Steam.EChatEntryType.ChatMsg);
                            delete userKeys[source];
                            delete verifying[source];
                            return;
                        }
                    }

                    cl.send("clientinfo", {clid: verifying[source]}, function (err, response) {
                        if (typeof err !== "undefined") {
                            console.log(err);
                        } else {
                            var identity = response.client_unique_identifier;
                            var pushMe = {};
                            pushMe[source] = identity;
                            verified_users.users.push(pushMe);
                            fs.writeFileSync(path.join(__dirname, '../', "data/verified.json"), JSON.stringify(verified_users, null, 4));
                            console.log("Added " + source + " to verified.json");
                            var cldbid = response.client_database_id;
                            cl.send("servergroupaddclient", {sgid: wantedrankid, cldbid: cldbid}, function (err) {
                                if (typeof err !== "undefined") {
                                    console.log(+err);
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
            }
            //delete their stored info
            delete userKeys[source];
            delete verifying[source];
        } else {
            steamFriends.sendMessage(source, "\nThe TeamSpeak server is offline, please try again later.", Steam.EChatEntryType.ChatMsg);
        }
    }
};
