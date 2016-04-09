var TeamSpeakClient = require("node-teamspeak"),
    keepAlive = require("./keepalive.js"),
    async = require('async');

module.exports = function(teamspeakClient, config, teamspeakStatus, interval) {

    teamspeakStatus = false;

    teamspeakClient.removeAllListeners("close");

    teamspeakClient = null;

    teamspeakClient = new TeamSpeakClient(config.ts_ip, config.q_port);

    var failed = false;
    teamspeakClient.on("error", function() {
        failed = true;
        console.log("Failed to reconnect..");
    });

    setTimeout(function() {
        //  If the error event has not been fired after x ms then we have successfully been connected.
        //  We cannot rely on the "connect" event as that for some reason it always fires, even when ts3 is offline.

        if (!failed) {
            console.log("Successfully reconnected!");

            //  We are back online, change the listerens again to the normal ones.
            teamspeakClient.removeAllListeners("error");

            teamspeakClient.on("close", function() {
                console.log("Lost connection to TeamSpeak, attempting to reconnect...");
                keepAlive.teamspeakOffline(teamspeakClient, teamspeakStatus, config);
            });

            teamspeakStatus = true;

            //  Clear the interval running this function.
            clearInterval(interval);


            //  Initialize the bot again.

            async.waterfall([
                    function (callback) {
                        teamspeakClient.send("login", {client_login_name: config.q_username, client_login_password: config.q_password}, function (err) {
                            if (typeof err !== "undefined") {
                                callback(err);
                            } else {
                                callback(null, teamspeakClient)
                            }
                        });
                    },
                    function (teamspeakClient, callback) {
                        console.log("Logged into the query with credentials.");
                        teamspeakClient.send("use", {sid: config.q_vserverid}, function (err) {
                            if (typeof err !== "undefined") {
                                callback(err);
                            } else {
                                callback(null, teamspeakClient)
                            }
                        })
                    },
                    function (teamspeakClient, callback) {
                        console.log("Using virtual server " + config.q_vserverid + " now.");
                        teamspeakClient.send("clientupdate", {client_nickname: "Steambot"}, function (err) {
                            if (typeof err !== "undefined") {
                                callback(err);
                            } else {
                                console.log("Changed query client name.");
                                callback(null, teamspeakClient);
                            }
                        })
                    }
                ],
                function (err, results) {
                    //  results = teamspeakClient

                    if (err != null) {
                        console.log(err);
                    } else {
                        teamspeakClient = results;
                    }
                });
        }
    }, 1000);

};