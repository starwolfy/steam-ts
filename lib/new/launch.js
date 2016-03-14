//TO DO:
//- Unit tests could easily be performed.
//- Certain modules need to use async.
//- enableGuard, test it!


exports.launch = function() {
    var TeamSpeakClient = require("node-teamspeak"),
        fs = require('fs'),
        SteamUser = require('steam-user'),
        crypto = require('crypto'),
        serverchannel = require('./serverchannel.js'),
        mkdirp = require('mkdirp'),
        path = require('path'),
        async = require('async'),
        SteamTotp = require('steam-totp'),
        listenChat = require('./listenchat.js'),
        enableMobile = require('./enablemobile.js'),
        acceptRequests = require('./acceptrequests.js'),
        keepAlive = require('./keepalive.js'),
        updateTwoFactorCode = require('./updatetwofactorcode.js');

    async.series([
        function(callback) {
            //  Create the data folder if it doesn't already exist.
            try {
                if (!fs.existsSync(path.join(__dirname, '../', "data"))) {
                    console.log("Creating data folder...");
                    mkdirp.sync(path.join(__dirname, '../', "data"));
                    var writeMe = {
                        users: []
                    };
                    fs.writeFileSync(path.join(__dirname, '../', "data/verified.json"), JSON.stringify(writeMe, null, 2), 'utf-8');
                }
                callback(null);
            } catch (err) {
                callback(err)
            }
        },
        function(callback) {
            //  Read config.json and initialize client.

            try {
                var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "config.json")));
            } catch (err) {
                callback(err);
            }
            callback(null, {
                ts_ip: configjson.main.ts_ip,
                q_port: configjson.main.q_port,
                q_username: configjson.main.q_username,
                q_password: configjson.main.q_password,
                bot_username: configjson.main.bot_username,
                bot_password: configjson.main.bot_password,
                q_vserverid: configjson.main.q_vserverid,
                minlevel: configjson.main.minlevel,
                defaultrankid: configjson.main.defaultrankid,
                wantedrankid: configjson.main.wantedrankid,
                querytime: configjson.serverchannel.querytime,
                useserverchannel: configjson.serverchannel.enabled,
                editdescription: configjson.main.editdescription,
                twofactor: configjson.twofactor.enabled,
                clanabbreviation: configjson.main.clanabbreviation
            })
        }
    ],
    function(err, results) {
        if (err != null) {
            console.log("Could not read config.json: " + err);
            process.exit();
        }
        var config = results[1];

        async.parallel([
            function (callback) {
                //  Log into Steam.

                var steamClient = new SteamUser();
                if (fs.existsSync(path.join(__dirname, '../', "data/twofactor.json")) && config.twofactor) {
                    var twofactorj = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/twofactor.json")));
                    var code = SteamTotp.generateAuthCode(twofactorj.shared_secret);
                    steamClient.logOn({
                        accountName: config.bot_username,
                        password: config.bot_password,
                        twoFactorCode: code
                    })
                } else {
                    steamClient.logOn({
                        accountName: config.bot_username,
                        password: config.bot_password
                    })
                }
                steamClient.on('loggedOn', function () {
                    var pjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "package.json")));
                    steamClient.setPersona(1, config.clanabbreviation + " bot (" + pjson.version + ")");
                    callback(null, steamClient);
                });

                steamClient.on('error', function (err) {
                    callback(err);
                })
            },
            function (callback) {
                //  Log into TeamSpeak

                var teamspeakClient = new TeamSpeakClient(config.ts_ip, config.q_port);
                teamspeakClient.send("login", {client_login_name: config.q_username, client_login_password: config.q_password}, function (err) {
                    if (typeof err !== "undefined") {
                        callback(err);
                    } else {
                        console.log("Logged into the query with credentials.");
                        teamspeakClient.send("use", {sid: config.q_vserverid}, function (err) {
                            if (typeof err !== "undefined") {
                                callback(err);
                            } else {
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
                        })
                    }
                })
            }
        ],
        function (err, results) {
            //  var config is already in bigger scope.
            //  results = [steamClient, teamspeakClient]

            if (err != null) {
                console.log(err);
                process.exit();
            }
            //  We are now successfully logged into steam.

            var steamClient = results[0];
            var teamspeakClient = results[1];
            console.log("Succesfully launched the bot.");

            //  Check if Steam Guard is enabled and if we need to set it up.
            if (!fs.existsSync(path.join(__dirname, '../', "data/twofactor.json"))) {
                //  Logged in; no Steam Guard enabled.

                if (config.twofactor) {
                    try {
                        enableMobile(steamClient);
                    } catch (err) {
                        console.log("There was an error while enabling Steam Guard: " + err);
                    }
                }
            }
            //  Apply regular logic here after bot is logged into Steam and connected to the TeamSpeak query.

            listenChat(config, steamClient, teamspeakClient);
            acceptRequests(steamClient, SteamUser);
            keepAlive(teamspeakClient);
            if (config.twofactor) {
                setInterval(updateTwoFactorCode, 2000);
            }
        })
    })
};

