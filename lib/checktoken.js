module.exports = function(token, senderID, currentlyVerifying, steamClient, teamspeakClient, config) {
    var fs = require('fs'),
        path = require('path'),
        async = require('async');

    if (currentlyVerifying[senderID.accountid].key == token) {
        //  Keys match now.

        //  Important: check this real quick before actually writing to verified.json.
        var verified_users = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/verified.json")));
        for (var i = 0; i < verified_users.users.length; i++) {
            if (senderID.accountid in verified_users.users[i]) {
                steamClient.chatMessage(senderID, "This Steam account already belongs to another TeamSpeak identity.");
                delete currentlyVerifying[senderID.accountid];
                return;
            }
        }

        //  Everything is correct, start verifying.

        var current_clid = currentlyVerifying[senderID.accountid].clid;

        teamspeakClient.send("clientinfo", {clid: current_clid}, function (err, response) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                var identity = response.client_unique_identifier;
                var pushMe = {};
                var steamid3 = "[U:1:" + senderID.accountid + "]";
                pushMe[steamid3] = identity;
                verified_users.users.push(pushMe);
                if (verified_users == "" || typeof verified_users === "undefined") {
                    console.log("Tried to write an empty/undefined var to verified.json...");
                    steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                    return;
                }
                fs.writeFileSync(path.join(__dirname, '../', "data/verified.json"), JSON.stringify(verified_users, null, 4));
                console.log("Added " + senderID.accountid + " to verified.json");
                var cldbid = response.client_database_id;
                teamspeakClient.send("servergroupaddclient", {sgid: config.wantedrankid, cldbid: cldbid}, function (err) {
                    if (typeof err !== "undefined") {
                        console.log(err);
                        steamClient.chatMessage(senderID, "Something went wrong, either retry !verify or contact an admin please!");
                    } else {
                        if (config.editdescription) {
                            teamspeakClient.send("clientedit", {clid: current_clid, client_description: senderID.accountid}, function (err) {
                                if (typeof err !== "undefined") {
                                    console.log(err);
                                } else {
                                    console.log("Verified " + senderID.accountid);
                                    steamClient.chatMessage(senderID, "You have been successfully verified!");
                                }
                            })
                        } else {
                            console.log("Verified " + senderID.accountid);
                            steamClient.chatMessage(senderID, "You have been successfully verified!");
                        }
                    }
                })
            }
        });
    } else {
        //  Token was incorrect, restart verfication process to prevent bruteforce
        console.log(senderID.accountid + " entered an invalid verifykey.");
        steamClient.chatMessage(senderID, "Invalid key, use !verify to restart the process.");
    }
    //  Delete their stored info
    delete currentlyVerifying[senderID.accountid];
};