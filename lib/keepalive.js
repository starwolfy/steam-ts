var reconnectTeamspeak = require('./reconnectteamspeak.js');

exports.teamspeakOffline = function(teamspeakClient, teamspeakStatus, config) {

    var reconnectInterval = setInterval(function(){
        reconnectTeamspeak(teamspeakClient, config, teamspeakStatus, reconnectInterval);
    }, 10000);

    reconnectTeamspeak(teamspeakClient, config, teamspeakStatus, reconnectInterval);
};

exports.main = function(teamspeakClient, teamspeakStatus, steamClient, config) {

    teamspeakClient.on("close", function() {
        console.log("Lost connection to TeamSpeak, attempting to reconnect...");
        exports.teamspeakOffline(teamspeakClient, teamspeakStatus, config);
    });

    setInterval(function() {
        //  Prevent the query from timing us out.

        if (teamspeakStatus) {
            teamspeakClient.send("version", function (err) {
                if (typeof err !== "undefined") {
                    console.log(err);
                } else {
                    console.log("Sent decoy query to TeamSpeak server.");
                }
            })
        }
    }, 180000);


    steamClient.on('loggedOn', function () {
        steamClient.setPersona(1);
        console.log("Reconnected to Steam");
    });

    steamClient.on('error', function (err) {
        console.log(err);
    })

};