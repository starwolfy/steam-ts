var fs = require('fs'),
    path = require('path'),
    SteamID = require('steamid');

module.exports = function(io) {
    var attemptedLogins = {};
    
    io.on('connection', function (socket) {

        var address = socket.handshake.address;
        var referer = socket.request.headers.referer;

        if (referer.indexOf('/login') >= 0) {

            if (attemptedLogins[address] > 3) {

                    var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "config.json")));
                    var waitInterval = configjson.webserver.timeOut;

                    socket.emit('timeout', waitInterval);

            }

        }

        socket.on('login', function (msg, respond) {

            if (typeof attemptedLogins[address] === "undefined") {

                attemptedLogins[address] = 1;

            } else {

                if (attemptedLogins[address] == 4) {

                    var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "config.json")));
                    var waitInterval = configjson.webserver.timeOut;

                    setTimeout(function() {

                        attemptedLogins[address] = 0;

                    }, waitInterval);

                    respond({type: -1, wait: waitInterval});

                    return;

                } else if (attemptedLogins[address] > 4) {

                    respond({type: 2});

                }

            }

            var configjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "config.json")));
            
            if (msg.username == configjson.webserver.webminUsername && msg.password == configjson.webserver.webminPassword) {

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

                if (!sid.isValid || sid.isGroupChat || sid.isLobby) {
                    respond(0);
                    return;
                }

                var verifiedjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "data", "verified.json")));
                var done = false;

                for (var i=0;i<verifiedjson.users.length;i++) {

                    for (var key in verifiedjson.users[i]) {

                        if (verifiedjson.users[i].hasOwnProperty(key)) {

                            if (key == msg.old_steamid) {

                                if (verifiedjson.users[i][key] != msg.old_teamspeakid) {
                                    return;
                                }

                                verifiedjson.users[i][key] = msg.new_teamspeakid;

                                function rename(obj, oldName, newName) {
                                    if (typeof obj === 'string') {
                                        newName = oldName;
                                        oldName = obj;
                                        obj = this;
                                    }
                                    if (obj.hasOwnProperty(oldName)) {
                                        obj[newName] = obj[oldName];
                                        delete obj[oldName];
                                    }
                                    return obj;
                                }

                                rename(verifiedjson.users[i], key, msg.new_steamid);

                                done = true;
                                break;

                            }

                        }
                    }

                    if (done) {
                        break;
                    }

                }

                fs.writeFileSync(path.join(__dirname, '../', '../', "data", "verified.json"), JSON.stringify(verifiedjson, null, 4));
                respond(1);

            });

            socket.on("deleteLink", function (msg, respond) {

                console.log("Delete link request received!");

                var verifiedjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', "data", "verified.json")));
                var found = false;


                for (var i=0;i<verifiedjson.users.length;i++) {

                    for (var key in verifiedjson.users[i]) {

                        if (verifiedjson.users[i].hasOwnProperty(key)) {

                            if (key == msg.steamid && verifiedjson.users[i][key] == msg.teamspeakid) {

                                verifiedjson.users.splice([i], 1);


                                fs.writeFileSync(path.join(__dirname, '../', '../', "data", "verified.json"), JSON.stringify(verifiedjson, null, 4));
                                respond();
                                found = true;
                                break;

                            }

                        }
                    }

                    if (found) {
                        break;
                    }

                }

            });

    

        }


    });
}