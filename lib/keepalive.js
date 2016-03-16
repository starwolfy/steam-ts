module.exports = function(teamspeakClient) {
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
        process.exit();
    });

    teamspeakClient.on("close", function(){
        console.log("TeamSpeak connection closed.");
        process.exit();
    });
};