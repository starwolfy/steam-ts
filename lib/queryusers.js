var async = require('async'),
    fs = require('fs'),
    path = require('path');

module.exports = function(teamspeakClient, queryinterval, teamspeakStatus) {

    setInterval(function() {
		if (!teamspeakStatus) {
			return;
		}

        async.waterfall([
            function(callback) {
                //  Check all the online users.

                teamspeakClient.send("clientlist", function (err, response) {

                    if (typeof err !== "undefined") {
                        callback(err);
                        return;
                    }

                    callback(null, response);

                });

            },
            function(users, callback) {

                try {
                    var verified = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data", "verified.json")));
                } catch (err) {
                    callback(err);
                    return;
                }
                
                for (var i=0;i<users.length;i++) {
                    //  Get detailed information for each online user.
                    
                    teamspeakClient.send("clientinfo", {clid: users[i].clid}, function (err, response) {

                        if (typeof err !== "undefined") {
                            callback(err);
                            return;
                        }

                        //  Go through the verified.json to see whether they got automatically verified, if so update their information where needed.

                        for (var j=0;j<verified.users.length;j++) {

                            if (verified.users[j].teamspeakid == response.client_unique_identifier) {

                                //  Ts3 query result match with person from verified.json

                                //  Check if we haven't already logged their name.
                                var foundNick = false;
                                var foundAddress = false;

                                for (var k=0;k<verified.users[j].nicknames.length;k++) {

                                    if (verified.users[j].nicknames[k] == response.client_nickname) {
                                        //  Already got it logged.

                                        foundNick = true;
                                        break;

                                    }

                                }

                                for (var l=0;l<verified.users[j].addresses.length;l++) {

                                    if (verified.users[j].addresses[l] == response.connection_client_ip) {
                                        //  Already got it logged.

                                        foundAddress = true;
                                        break;

                                    }

                                }

                                if (!foundNick) {
                                    //  Nickname is new. Add it to the list.

                                    console.log("New nickname logged for: " + response.client_nickname);
                                    verified.users[j].nicknames.push(response.client_nickname);

                                }

                                if (!foundAddress) {
                                    //  Address is new. Add it to the list.

                                    console.log("New ip address logged for: " + response.client_nickname);
                                    verified.users[j].addresses.push(response.connection_client_ip);

                                }
                                
                            }

                        }

                        try {
                            fs.writeFileSync(path.join(__dirname, '../', "data", "verified.json"), JSON.stringify(verified, null, 4));
                        } catch(err) {
                            callback(err);
                            return;
                        }

                    });

                    if (i == users.length-1) {
                        //  Last loop just finished, callback time!
                        callback(null);
                    }

                }

            },
        ], function (err) {
            //  Done with querying.
            
            if (err != null) {
                console.log("Error while querying users: " + err);
                return;
            }  

            console.log("Successfully queried users and updated userdata.");

        });

    }, queryinterval);

}
