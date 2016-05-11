var fs = require('fs'),
    path = require('path'),
    async = require('async');

module.exports = function(token, senderID, currentlyVerifying, steamClient, teamspeakClient, config, verified_users) {

    async.waterfall([
        function(callback) {
            if (currentlyVerifying[senderID.accountid].key == token) {
                //  Keys match now.
                var current_clid = currentlyVerifying[senderID.accountid].clid;
                callback(null, current_clid, verified_users);
            } else {
                //  Token was incorrect, restart verfication process to prevent bruteforce
                console.log(senderID.accountid + " entered an invalid verifykey.");
                steamClient.chatMessage(senderID, "Invalid key, use !verify to restart the process.");
                callback("Invalid key.");
            }
        },
        function(current_clid, verified_users, callback) {
            teamspeakClient.send("clientinfo", {clid: current_clid}, function (err, response) {
                if (typeof err !== "undefined") {
                    console.log(err);
                    callback("Error sending clientinfo query: " + JSON.stringify(err));
                } else {
                    callback(null, response, current_clid);
                }
            })
        },
        function(response, current_clid, callback) {

            var cldbid = response.client_database_id;

            teamspeakClient.send("servergroupaddclient", {sgid: config.wantedrankid, cldbid: cldbid}, function (err) {
                if (typeof err !== "undefined") {
                    steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                    callback("Error sending servergroupaddclient query: " + JSON.stringify(err));
                } else {

                    var identity = response.client_unique_identifier;
                    var pushMe = {};
                    var steamid3 = "[U:1:" + senderID.accountid + "]";
                    pushMe[steamid3] = identity;
                    verified_users.users.push(pushMe);
                    if (verified_users == "" || typeof verified_users === "undefined") {
                        steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                        callback("Tried to write empty/undefined var to verified.json.");
                    }

                    try {
                        fs.writeFileSync(path.join(__dirname, '../', "data/verified.json"), JSON.stringify(verified_users, null, 4));
                    } catch(err) {
                        console.log("Could not write to verified.json.");
                        process.exit();
                    }
                    console.log("Added " + senderID.accountid + " to verified.json");

                    callback(null, config.editdescription, current_clid);
                }
            })
        }, function(editdescription, current_clid, callback) {

            if (editdescription) {
                var steamid3 = "[U:1:" + senderID.accountid + "]";

                teamspeakClient.send("clientedit", {clid: current_clid, client_description: steamid3}, function (err) {
                    if (typeof err !== "undefined") {
                        callback("Error sending clientedit query: " + JSON.stringify(err));
                    } else {
                        callback(null);
                    }
                })
            }
        }
    ], function (err) {
        if (err != null) {
            console.log("checkToken error: " + err);
        } else {
            steamClient.chatMessage(senderID, "You have been successfully verified!");
        }
        //  Delete their stored info
        delete currentlyVerifying[senderID.accountid];
    });

};
