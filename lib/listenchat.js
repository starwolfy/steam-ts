var sendToken = require('./sendtoken.js'),
    crypto = require('crypto'),
    checkToken = require('./checktoken.js'),
    SteamID = require('steamid'),
    fs = require('fs'),
    path = require('path'),
    async = require('async');

module.exports = function(config, steamClient, teamspeakClient, teamspeakStatus) {

    var currentlyVerifying = {};
    function VerifyingUser() {
        this.processid = 1;
        this.key = false;
        this.clid = false;
        var currentDate = new Date();
        this.date = currentDate.getTime();
    }

    //  Remove users in the middle of a verifying process when they have been inactive for a while.
    setInterval(function() {
        var currentDate = new Date();
        var currentTime = currentDate.getTime();
        for (var prop in currentlyVerifying) {
            if (currentlyVerifying.hasOwnProperty(prop)) {
                if (currentTime - currentlyVerifying[prop].date > 300000) {
                    var steamidObject = new SteamID("[U:1:" + prop + "]"); //  Ugh.
                    console.log(steamidObject);
                    steamClient.chatMessage(steamidObject, "Your verification session has expired.");
                    delete currentlyVerifying[prop];
                }
            }
        }
    }, 30000);

    //  Count how many messages per x time has been sent by users to possibly prevent them from spamming.
    var shortLog = {};
    setInterval(function() {
        shortLog = {};
    }, 30000);

    //  We do not want to spam Steam, so let's store Steam levels but release them every minute, in case people level up.
    var userLevels = {};
    setInterval(function(){
        userLevels = {};
    }, 60000);

    steamClient.on('friendMessage', function (senderID, message) {
        //  senderID = { universe: 1, type: 1, instance: 1, accountid: 74099164 }

        //  Spam protection.
        if (typeof shortLog[senderID.accountid] === "undefined") {
            shortLog[senderID.accountid] = {};
            shortLog[senderID.accountid].count = 0;
        }
        shortLog[senderID.accountid].count++;
        if (shortLog[senderID.accountid].count > 10) {
            return;
        }

        //  Inspect message and apply logic.
        var sendersteamid3 = "[U:1:" + senderID.accountid + "]";
        console.log("Received message from " + sendersteamid3 + ": " + message);
        if (message == "!verify") {
            if (teamspeakStatus) {
                if (typeof currentlyVerifying[senderID.accountid] === "undefined") {

                    async.series([
                        function (callback) {
                            if (typeof userLevels[senderID.accountid] === "undefined") {
                                //  Get Steam level and check if it is alright.
                                steamClient.chatMessage(senderID, "Obtaining data from your Steam profile...");
                                steamClient.getSteamLevels([senderID], function (result) {
                                    userLevels[senderID.accountid] = result;
                                    callback(null);
                                });
                            } else {
                                callback(null);
                            }
                        },
                        function (callback) {
                            for (var prop in userLevels[senderID.accountid]) {
                                if (prop >= config.minlevel) {
                                    //  User wasn't in the middle of a process, so commence a new one.

                                    //  Important: check this real quick before actually executing sendToken.
                                    var already_used = false;
                                    var verified_users = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/verified.json")));
                                    for (var i = 0; i < verified_users.users.length; i++) {
                                        if (sendersteamid3 in verified_users.users[i]) {
                                            already_used = true;
                                            break;
                                        }
                                    }

                                    //  Clear var to prevent unnecessary RAM usage(???)
                                    verified_users = false;

                                    if (already_used) {
                                        steamClient.chatMessage(senderID, "This Steam account already belongs to another TeamSpeak identity.");
                                        callback(true);
                                    } else {
                                        currentlyVerifying[senderID.accountid] = new VerifyingUser();
                                        currentlyVerifying[senderID.accountid].processid = 1;
                                        steamClient.chatMessage(senderID, "Your verification process has started, please enter your TeamSpeak username here:");
                                        callback(null);
                                    }
                                } else {
                                    steamClient.chatMessage(senderID, "Your Steam level is too low for automated verification (Level " + config.minlevel + "), please ask an admin to approve you.");
                                    callback(true);
                                }
                            }
                        }
                    ])

                } else if (currentlyVerifying[senderID.accountid].processid == 1) {
                    //  User is already in a process.

                    steamClient.chatMessage(senderID, "You are already in the middle of the verification process, please enter your TeamSpeak username here:");
                } else if (currentlyVerifying[senderID.accountid].processid == 2) {
                    //  User is already in a process.

                    steamClient.chatMessage(senderID, "You are already in the middle of the verification process, please enter your randomly generated token here:");
                }
            } else {
                //  !verify was called but the teamSpeak server is down.

                steamClient.chatMessage(senderID, "The TeamSpeak server is currently down, please retry later on.");
            }
        } else {
            if (typeof currentlyVerifying[senderID.accountid] === "undefined") {
                //  User wasn't in the middle of a process and didn't type !verify.

                steamClient.chatMessage(senderID, "Unknown command, please use !verify");
            } else if (currentlyVerifying[senderID.accountid].processid == 1) {
                //  User just entered a username to be found on the TeamSpeak server and to be sent a message to.


                var token = crypto.randomBytes(20).toString('hex');
                currentlyVerifying[senderID.accountid].key = token;
                try {
                    sendToken(message, senderID, token, currentlyVerifying, steamClient, teamspeakClient, config);
                    currentlyVerifying[senderID.accountid].processid = 2;
                } catch(err) {
                    console.log("sendToken() error: " + err);
                    delete currentlyVerifying[senderID.accountid];
                    steamClient.chatMessage(senderID, "sendToken() error, please report this on the forums!");
                }

            } else if (currentlyVerifying[senderID.accountid].processid == 2) {
                //  Check if key is correct.

                try {
                    checkToken(message, senderID, currentlyVerifying, steamClient, teamspeakClient, config, verified_users);
                } catch(err) {
                    console.log("checkToken() error: " + err);
                    delete currentlyVerifying[senderID.accountid];
                    steamClient.chatMessage(senderID, "checkToken() error, please report this on the forums!");
                }

            }
        }
    })
};