module.exports = function(ts_ip, q_username, q_password, bot_username, bot_password, minlevel, defaultrankid, wantedrankid) {

    var TeamSpeakClient = require("node-teamspeak"),
        fs = require('fs'),
        Steam = require('steam'),
        crypto = require('crypto'),

        steamClient = new Steam.SteamClient(),
        steamUser = new Steam.SteamUser(steamClient),
        steamFriends = new Steam.SteamFriends(steamClient);


    steamClient.connect();
    steamClient.on('connected', function () {
        steamUser.logOn({
            account_name: bot_username,
            password: bot_password
        });
    });

    steamClient.on('logOnResponse', function (logonResp) {
        if (logonResp.eresult == Steam.EResult.OK) {
            console.log('Logged in!');
            steamFriends.setPersonaState(Steam.EPersonaState.Online);
        }
    });

    if (!fs.existsSync('verified.json')) {
        var writeMe = {
            users: []
        };
        fs.writeFileSync('verified.json', JSON.stringify(writeMe, null, 2), 'utf-8');
    }

    var verifying = {};
    var userKeys = {};
    steamFriends.on('message', function (source, message) {
        if (message != "") {
            console.log('Received message: ' + message);
            if (message == '!verify') {
                if (verifying[source] == "nickname") {
                    steamFriends.sendMessage(source, "\nYou're currently already in the middle of a verification process." +
                        "\nPlease enter your TeamSpeak nickname:", Steam.EChatEntryType.ChatMsg);
                } else if (verifying[source] == "randomcode")
                    steamFriends.sendMessage(source, "\nYou're currently already in the middle of a verification process." +
                        "\nPlease enter the random generated string which got poked to you here in the Steam chat:", Steam.EChatEntryType.ChatMsg);
                else {
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

    function verifyUser(message, source) {
        cl.send("clientfind", {pattern: message}, function (err, response) {
            if (typeof err !== "undefined") {
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
                var user_clid = response.clid;
                console.log(message + " was found, getting group...");
                if (response.isArray) {
                    console.log(message + " already is an approved member.");
                    steamFriends.sendMessage(source, "\nYou're already an approved member.", Steam.EChatEntryType.ChatMsg);
                    delete verifying[source];
                } else {
                    cl.send("clientinfo", {clid: user_clid}, function (err, response) {
                        if (typeof err !== "undefined") {
                            console.log(err);
                            console.log("Internal error, verification failed.");
                            steamFriends.sendMessage(source, '\nInternal error, verification failed.', Steam.EChatEntryType.ChatMsg);
                            delete verifying[source];
                        } else {
                            //group found use response to get it
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

    function sendKeyTs(clid, source) {
        var key = crypto.randomBytes(20).toString('hex');
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

    function checkKey(message, source) {
        console.log("Checking key...");
        if (userKeys[source] == message) {
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
            console.log(source + " entered an invalid verifykey.");
            steamFriends.sendMessage(source, '\nInvalid key, use !verify to restart the process.', Steam.EChatEntryType.ChatMsg);
        }
        delete userKeys[source];
        delete verifying[source];
    }
};
