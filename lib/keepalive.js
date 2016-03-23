module.exports = function(teamspeakClient, teamspeakStatus, steamClient) {
    setInterval(function () {
        teamspeakClient.send("version", function(err) {
            if (typeof err !== "undefined") {
                console.log(err);
            } else {
                console.log("Sent decoy query to TeamSpeak server.");
            }
        })
    }, 180000);

    teamspeakClient.on("error", function() {
        console.log("TeamSpeak socket error");
        teamspeakStatus = false;
    });

    teamspeakClient.on("close", function(){
        console.log("TeamSpeak connection closed.");
        teamspeakStatus = false;
    });

    steamClient.on('loggedOn', function () {
        steamClient.setPersona(1);
        console.log("Reconnected to Steam");
    });

    steamClient.on('error', function (err) {
        console.log(err);
    })

};