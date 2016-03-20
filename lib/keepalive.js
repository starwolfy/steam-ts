module.exports = function(teamspeakClient, teamspeakStatus) {
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

    setInterval(function(){
        if (!teamspeakStatus) {

        }
    }, 15000);
};