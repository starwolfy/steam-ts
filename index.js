var TeamSpeakClient = require("node-teamspeak");

var cl = new TeamSpeakClient("clwo.eu");
cl.send("login", {client_login_name: "##USERNAME##", client_login_password: "##PASSWORD##"}, function(err, response, rawResponse){
    cl.send("use", {sid: 1}, function(err, response, rawResponse){
        cl.send("clientlist", function(err, response, rawResponse){
            console.log(response);
        });
    });
});