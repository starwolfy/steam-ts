var socket = io.connect();
var timedOut = false;

function loginClicked() {

    if (timedOut) {
        return;
    }

    var inputUsername = document.getElementById("inputUsername").value;
    var inputPassword = document.getElementById("inputPassword").value;

    socket.emit("login", {username: inputUsername, password: inputPassword}, function(msg) {

        if (msg.type == 1) {

            window.location.replace("/");

        } else if (msg.type == 0) {

            toastr["warning"]("Wrong credentials.", "Warning!");

        } else if (msg.type == -1) {

            timedOut = true;

            var waitInterval = Math.round(msg.wait/1000);

            var currentDate = new Date();

            document.cookie = "timeoutSent=" + currentDate.getTime() + ";";

            toastr.options = {
                "timeOut": msg.wait,
                "extendedTimeOut": msg.wait,
                "tapToDismiss": false
            }

            toastr["error"]("Please wait " + waitInterval +" seconds.", "Danger!");

            var cooldownTimer = setInterval(function() {

                if (waitInterval < 0) {
                    clearInterval(cooldownTimer);
                    return;
                }

                waitInterval--;

                $("#toast-container > [class='toast toast-error'] > .toast-message").html("Please wait " + waitInterval +" seconds.");

            }, 1000);
    
        }

    });
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

socket.on('timeout', function(msg) {

    timedOut = true;

    var currentDate = new Date();
    var currentTime = currentDate.getTime();
    var timeoutSent = getCookie("timeoutSent");

    var timePassedMs = currentTime - timeoutSent;
    var timePassedS = Math.round(timePassedMs/1000);

    var cooledDown = Math.round(msg/1000);

    var timeLeft = cooledDown - timePassedS;
    var timeLeftMS = msg - timePassedMs;

    toastr.options = {
    "timeOut": timeLeftMS,
    "extendedTimeOut": timeLeftMS,
    "tapToDismiss": false
    }

    toastr["error"]("Please wait " + timeLeft +" seconds.", "Danger!");

    var cooldownTimer = setInterval(function() {

                if (timeLeft < 0) {
                    clearInterval(cooldownTimer);
                    return;
                }

                timeLeft--;

                $("#toast-container > [class='toast toast-error'] > .toast-message").html("Please wait " + timeLeft +" seconds.");

            }, 1000);

});

$("#inputPassword").keypress(function (e) {
    if (e.which == 13) {
        loginClicked();
    }
});