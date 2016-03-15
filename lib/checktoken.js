module.exports = function(token, senderID, currentlyVerifying, steamClient, teamspeakClient, config, verified_users) {
    var fs = require('fs'),
        path = require('path'),
        async = require('async');

    async.waterfall([
        function(callback) {
            if (currentlyVerifying[senderID.accountid].key == token) {
                //  Keys match now.
                var current_clid = currentlyVerifying[senderID.accountid].clid;
                callback(null, current_clid, verified_users)
            } else {
                //  Token was incorrect, restart verfication process to prevent bruteforce
                console.log(senderID.accountid + " entered an invalid verifykey.");
                steamClient.chatMessage(senderID, "Invalid key, use !verify to restart the process.");
                callback("Invalid key.")
            }
        },
        function(current_clid, verified_users, callback) {
            teamspeakClient.send("clientinfo", {clid: current_clid}, function (err, response) {
                if (typeof err !== "undefined") {
                    console.log(err);
                    callback("Error sending clientinfo query: " + err)
                } else {
                    var identity = response.client_unique_identifier;
                    var pushMe = {};
                    var steamid3 = "[U:1:" + senderID.accountid + "]";
                    pushMe[steamid3] = identity;
                    verified_users.users.push(pushMe);
                    if (verified_users == "" || typeof verified_users === "undefined") {
                        steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                        callback("Tried to write empty/undefined var to verified.json.")
                    }
                    fs.writeFileSync(path.join(__dirname, '../', "data/verified.json"), JSON.stringify(verified_users, null, 4));
                    console.log("Added " + senderID.accountid + " to verified.json");
                    var cldbid = response.client_database_id;
                    callback(null, cldbid, current_clid)
                }
            })
        },
        function(cldbid, current_clid, callback) {
            teamspeakClient.send("servergroupaddclient", {sgid: config.wantedrankid, cldbid: cldbid}, function (err) {
                if (typeof err !== "undefined") {
                    steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                    callback("Error sending servergroupaddclient query: " + err)
                } else {
                    callback(null, config.editdescription, current_clid)
                }
            })
        }, function(editdescription, current_clid, callback) {
            if (editdescription) {
                teamspeakClient.send("clientedit", {clid: current_clid, client_description: senderID.accountid}, function (err) {
                    if (typeof err !== "undefined") {
                        callback("Error sending clientedit query: " + err)
                    } else {
                        console.log("Verified " + senderID.accountid);
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