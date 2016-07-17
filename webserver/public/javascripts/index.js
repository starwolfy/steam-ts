var socket = io.connect();

var editing = [];
var deleting = [];

function columnEdit(obj) {

    var steamid = obj.dataset.steam;
    var teamspeakid = obj.dataset.teamspeak;

    editing = [steamid, teamspeakid];

    document.getElementById("editSteam").value = steamid;
    document.getElementById("editTeamspeak").value = teamspeakid;

}

function columnEditSubmit() {

    var old_steamidInput = editing[0];
    var old_teamspeakidInput = editing[1];
    var new_steamidInput = document.getElementById("editSteam").value;
    var new_teamspeakidInput = document.getElementById("editTeamspeak").value;

    if (old_steamidInput == new_steamidInput && old_teamspeakidInput == new_teamspeakidInput) {
        toastr["info"]("Please adjust something first.", "Info!")
        return;
    }

    if (new_teamspeakidInput.substr(new_teamspeakidInput.length - 1, new_teamspeakidInput.length) != "=") {
        toastr["warning"]("Not a valid TeamSpeak ID.", "Error!")
        return;
    }

    editing = [new_steamidInput, new_teamspeakidInput];

    socket.emit('editLink', {
        old_steamid: old_steamidInput,
        old_teamspeakid: old_teamspeakidInput,
        new_steamid: new_steamidInput,
        new_teamspeakid: new_teamspeakidInput
    }, function(msg) {

        if (msg == 1) {

            $('#edit').modal('hide');
            toastr["success"]("You have edited this link.", "Success!");

            var tempLinkID = new_steamidInput.substr(1, new_steamidInput.length);
            var LinkID = tempLinkID.substr(0, tempLinkID.length - 1);

            $("button[data-steam='" + old_steamidInput + "'][data-teamspeak='" + old_teamspeakidInput + "']").attr({
                "data-steam": new_steamidInput,
                "data-teamspeak": new_teamspeakidInput
            }).parent().parent().parent().children("td[data-tdsteam='" + old_steamidInput +"']").html("<a href='https://steamid.io/lookup/" + LinkID + "'>" + new_steamidInput + "</a>").attr("data-tdsteam", new_steamidInput)
            .parent().css("background-color", "#e6e6ff").children("td[data-tdteamspeak='" + old_teamspeakidInput +"']").html(new_teamspeakidInput).attr("data-teamspeak", new_teamspeakidInput);
        } else if (msg == 0) {
            toastr["warning"]("Not a valid SteamID3.", "Error!")
        }

    });

}

function columnDelete(obj) {

    var steamid = obj.dataset.steam;
    var teamspeakid = obj.dataset.teamspeak;

    deleting = [steamid, teamspeakid];
}

function columnDeleteSubmit() {

    var steamidInput = deleting[0];
    var teamspeakidInput = deleting[1];

    socket.emit("deleteLink", {steamid: steamidInput, teamspeakid: teamspeakidInput}, function() {

        toastr["success"]("Link deleted.", "Success!");
        $('#delete').modal('hide');
        $("button[data-steam='" + steamidInput + "'][data-teamspeak='" + teamspeakidInput + "']").parent().parent().parent().fadeOut('slow');

    });

}