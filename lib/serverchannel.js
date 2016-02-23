var cl = require('./launch.js'),
    gamedig = require('gamedig'),
    fs = require('fs'),
    TeamSpeakClient = require("node-teamspeak"),
    path = require('path');

module.exports = function() {
    //read config
    console.log("Quering servers...");
    var configjson = JSON.parse(fs.readFileSync(path.join(__dirname , '../', 'config.json'))),
        channels = configjson.serverchannel.channels,
        serverinfo = [];

    //start quering for all channels

    for (var i=0;i<channels.length;i++) {
        var channelid = channels[i].channelid,
            serverip = channels[i].serverip,
            servertype = channels[i].servertype,
            customport = channels[i].customport;

        if (customport == 0) {
            gamedig.query(
                {
                    type: servertype,
                    host: serverip
                },
                function(state) {
                    //do stuff with query info
                    if(state.error) {
                        serverinfo = {
                            error: 1
                        };
                        console.log("Game server query error: " + state.error);
                    } else {
                        serverinfo = {
                            error: 0,
                            channelid: channelid,
                            name: state.name,
                            map: state.map,
                            maxplayers: state.maxplayers,
                            players: state.players
                        };
                    }
                    adjustChannel(serverinfo);
                }
            );
        } else {
            gamedig.query(
                {
                    type: servertype,
                    host: serverip,
                    port: customport
                },
                function(state) {
                    //do stuff with query info
                    if(state.error) {
                        serverinfo = {
                            error: 1
                        };
                        console.log("Game server query error: " + state.error);
                    } else {
                        serverinfo = {
                            error: 0,
                            channelid: channelid,
                            name: state.name,
                            map: state.map,
                            maxplayers: state.maxplayers,
                            players: state.players
                        };
                    }
                    adjustChannel(serverinfo);
                }
            );
        }
        console.log("Done querying, adjusting teamspeak channels...");
    }

    function adjustChannel(serverinfoarg) {
        //for each channel with the same queried server (start at 1 for convienence at naming)
        for (i = 1; i < serverinfoarg.channelid.length + 1; i++) {
            //if failed to query (probably downtime of the designated server).
            var channelname = "";
            if (serverinfoarg.error == 1) {
                channelname = "Server is down."
            } else {
                channelname = "[" + i + "]" + serverinfoarg.name + " [" + serverinfoarg.players.length + "/" + serverinfoarg.maxplayers + "]";
            }
            var sendcid = serverinfoarg.channelid[i - 1];
            cl.cl.send("channeledit", {cid: sendcid, channel_name: channelname}, function (err) {
                if (typeof err !== "undefined") {
                    if (err.id == 1541) {
                        console.log("Server name is too large!");
                    } else if(err.id ==771) {
                        console.log("No recent changes.");
                    } else {
                        console.log("Channel update error: " + JSON.stringify(err));
                    }
                } else {
                    console.log("Successfully updated the TeamSpeak channel name to: " + channelname);
                }
            });
            var printedplayers = "[b]" + serverinfoarg.map + "\nCurrent players online:\n\n";
            if (serverinfoarg.error == 1) {
                channelname = "Server is down."
            } else {
                //commence manipulating the description
                for (i = 0; i < serverinfoarg.players.length; i++) {
                    printedplayers = printedplayers + serverinfoarg.players[i].name + "\n";
                }
            }

            cl.cl.send("channeledit", {cid: sendcid, channel_description: printedplayers}, function (err) {
                if (typeof err !== "undefined") {
                    console.log("Description update error: " + JSON.stringify(err));
                } else {
                    console.log("Successfully updated the TeamSpeak description.");
                }
            })
        }
    }
};