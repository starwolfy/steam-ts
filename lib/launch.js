var fs = require('fs'),
    SteamUser = require('steam-user'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    async = require('async'),
    SteamTotp = require('steam-totp'),
    crypto = require('crypto'),
    listenChat = require('./listenchat.js'),
    enableMobile = require('./enablemobile.js'),
    acceptRequests = require('./acceptrequests.js'),
    keepAlive = require('./keepalive.js').main,
    updateTwoFactorCode = require('./updatetwofactorcode.js'),
    launchTeamspeak = require('./launchteamspeak.js'),
    queryUsers = require('./queryusers.js');

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
            wantedrankid: configjson.main.wantedrankid,
            editdescription: configjson.main.editdescription,
            queryinterval: configjson.main.queryinterval,
            twofactor: configjson.twofactor.enabled,
            clanabbreviation: configjson.main.clanabbreviation,
            webserverEnabled: configjson.webserver.enabled,
            webserverPort: configjson.webserver.port,
            sessionSecret: configjson.doNotEdit.sessionSecret
        })
    }, function(callback) {
        //  Check if verified.json needs to be updated.

        var verified = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data", "verified.json")));

        if (typeof verified.users[0].nicknames === "undefined") {
            //  Still using verified.json from update older than 1.3.1 . Let's convert!

            console.log("Making verified.json compatible for >v1.3.1");

            for (var i=0;i<verified.users.length;i++) {

                verified.users[i].nicknames = [];
                verified.users[i].addresses = [];

                for (var key in verified.users[i]) {
                    if (key != "nicknames" && key != "addresses") {
                        verified.users[i].steamid = key;
                        verified.users[i].teamspeakid = verified.users[i][key];
                        delete verified.users[i][key];
                    }
                }

            }

            try {
                fs.writeFileSync(path.join(__dirname, '../', "data", "verified.json"), JSON.stringify(verified, null, 4));
            } catch(err) {
                callback(err);
                return;
            }

            callback(null);

        } else {
            callback(null);
        }

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

            steamClient.once('loggedOn', function () {
                var pjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "package.json")));
                steamClient.setPersona(1, config.clanabbreviation + " bot (" + pjson.version + ")");
                callback(null, steamClient);
            });

            steamClient.once('error', function (err) {
                callback(err);
            })
        },
        function (callback) {
            //  Log into TeamSpeak

            launchTeamspeak(config, callback);
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

        var teamspeakStatus = true;
        
        listenChat(config, steamClient, teamspeakClient, teamspeakStatus);

        acceptRequests(steamClient, SteamUser);

        keepAlive(teamspeakClient, teamspeakStatus, steamClient, config);

        queryUsers(teamspeakClient, config.queryinterval);

        if (config.twofactor) {
            setInterval(updateTwoFactorCode, 2000);
        }

        if (config.webserverEnabled) {
            var launchwww = require('./' + path.join('../', 'webserver', 'bin', 'www'));

            if (config.sessionSecret == "") {

                console.log("Generating new secret token for sessions used in admin panel.");

                var newSecret = crypto.randomBytes(64).toString('hex');

                var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "config.json")));
                configjson.doNotEdit.sessionSecret = newSecret;

                fs.writeFileSync(path.join(__dirname, '../', "config.json"), JSON.stringify(configjson, null, 4));

                configjson = false;

            }

            launchwww(config.webserverPort, config.sessionSecret);
            console.log("Admin panel available on port: " + config.webserverPort);
        }

    })
})
