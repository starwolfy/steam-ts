var fs = require('fs'),
    path = require('path'),
    SteamID = require('steamid');

module.exports = function(io) {
    var attemptedLogins = {};
    
    io.on('connection', function (socket) {

        var address = socket.handshake.address;
        var referer = socket.request.headers.referer;

        var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "config.json")));
        var waitInterval = configjson.webserver.timeOut;

        var webminUsername = configjson.webserver.webminUsername;
        var webminPassword = configjson.webserver.webminPassword;

        if (referer.indexOf('/login') >= 0) {

            if (attemptedLogins[address] > 3) {

                    socket.emit('timeout', waitInterval);

            }

        }

        socket.on('login', function (msg, respond) {

            if (typeof attemptedLogins[address] === "undefined") {

                attemptedLogins[address] = 1;

            } else {

                if (attemptedLogins[address] == 4) {

                    setTimeout(function() {

                        attemptedLogins[address] = 0;

                    }, waitInterval);

                    respond({type: -1, wait: waitInterval});

                    return;

                } else if (attemptedLogins[address] > 4) {

                    respond({type: 2});

                }

            }
            
            if (msg.username == webminUsername && msg.password == webminPassword) {

                socket.handshake.session.loggedIn = true;
                respond({type: 1});

            } else {

                attemptedLogins[address]++;

                respond({type: 0});

            }

        });


        if (socket.handshake.session.loggedIn) {

            socket.on('editLink', function(msg, respond) {

                try {
                    var sid = new SteamID(msg.new_steamid);
                } catch (err) {
                    respond(0);
                    return;
                }

                if (!sid.isValid() || sid.isGroupChat() || sid.isLobby()) {
                    respond(0);
                    return;
                }

                var verifiedjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "data", "verified.json")));

                for (var i=0;i<verifiedjson.users.length;i++) {

                    if (verifiedjson.users[i].steamid == msg.old_steamid && verifiedjson.users[i].teamspeakid == msg.old_teamspeakid) {

                        verifiedjson.users[i].teamspeakid = msg.new_teamspeakid;
                        verifiedjson.users[i].steamid = msg.new_steamid;

                        break;

                    }

                }

                fs.writeFileSync(path.join(__dirname, '../', '../', "data", "verified.json"), JSON.stringify(verifiedjson, null, 4));
                respond(1);

            });

            socket.on("deleteLink", function (msg, respond) {

                console.log("Delete link request received!");

                var verifiedjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "data", "verified.json")));


                for (var i=0;i<verifiedjson.users.length;i++) {


                    if (verifiedjson.users[i].steamid == msg.steamid && verifiedjson.users[i].teamspeakid == msg.teamspeakid) {

                        verifiedjson.users.splice([i], 1);

                        fs.writeFileSync(path.join(__dirname, '../', '../', "data", "verified.json"), JSON.stringify(verifiedjson, null, 4));
                        respond();
                        break;

                    }

                    if (found) {
                        break;
                    }

                }

            });

            socket.on("requestTeamspeak", function (msg, respond) {

                var verified = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "data", "verified.json")));

                for(var i=0;i<verified.users.length;i++) {

                    if (verified.users[i].teamspeakid == msg) {

                        respond({nicknames: verified.users[i].nicknames, addresses: verified.users[i].addresses});

                        break;

                    }

                }

            });

        }


    });
}
