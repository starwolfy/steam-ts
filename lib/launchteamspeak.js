module.exports = function(config, callback) {
    //  Only use teamspeakClient in keepalive.js, so we replace the already existing client when TeamSpeak goes down.

    var async = require('async'),
        TeamSpeakClient = require("node-teamspeak");

    async.waterfall([
        function (callback) {
            console.log("Trying to connect to the TeamSpeak server...");

            var teamspeakClient = new TeamSpeakClient(config.ts_ip, config.q_port);

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
            callback(err);
        } else {
            callback(null, results);
        }
    });
};