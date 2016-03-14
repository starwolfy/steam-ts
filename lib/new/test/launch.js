//TO DO:
//- Utilize https://github.com/DoctorMcKay/node-steam-user instead of node-steam
//- Get automated two-factor authentication to work.
//- Make sure that the new code is scalable and that unit tests could easily be performed on it.
//- Let the bot reconnect after Steam went down.


exports.launch = function() {
    var TeamSpeakClient = require("node-teamspeak"),
        fs = require('fs'),
        SteamUser = require('steam-user'),
        crypto = require('crypto'),
        serverchannel = require('./serverchannel.js'),
        mkdirp = require('mkdirp'),
        path = require('path'),
        async = require('async');

    async.parallel([
        function(callback) {
            async.waterfall([
                function (callback) {
                    //  Read config.json and initialize client.
                    var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "config.json")));
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
                        twoFactor: configjson.twoFactor.enabled,
                        enteredCode: configjson.twoFactor.code
                    })
                },
                function (data, callback) {
                    callback(null, data, new SteamUser());
                },
                function (config, client, callback) {
                    //  Log into Steam.
                    var loginCredentials = {
                        accountName: config.bot_username,
                        password: config.bot_password
                    };
                    if (config.twoFactor) {
                        loginCredentials.twoFactorCode = config.twoFactor;
                    }
                    client.logOn(loginCredentials);

                    client.on('loggedOn', function() {
                        callback(null, details);
                    });

                    client.on('error', function(err) {
                        callback(SteamUser.Steam.EResult[err], null);
                    })
                }
            ], function (err) {
                if ( err != null) {
                    console.log("Error found: " + err);
                    callback();
                } else {
                    console.log("Sucessfully logged into Steam.");
                    callback();
                }
            })
        },
        function () {
            //  Create the data folder if it doesn't already exist.
            if (!fs.existsSync(path.join(__dirname, '../', "data"))) {
                console.log("Creating data folder...");
                mkdirp.sync(path.join(__dirname, '../', "data"));
            }
        }
    ])
};

