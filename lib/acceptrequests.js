var SteamID = require('steamid');

module.exports = function(steamClient, SteamUser) {

    steamClient.on('friendRelationship', function (source, type) {
        //  Auto accept friend requests

        if (type == SteamUser.Steam.EFriendRelationship.RequestRecipient) {
            steamClient.addFriend(source, function(err, personaName) {
                steamClient.chatMessage(source, "Hey there" + personaName + ", in order to get verified on the TeamSpeak server please write !verify in this chat.");
            });
        }
    });

    //  Look if people sent us requests while the bot was offline.
    for (var prop in steamClient.myFriends) {
        if (steamClient.myFriends.hasOwnProperty(prop)) {
            if (steamClient.myFriends[prop] == SteamUser.Steam.EFriendRelationship.RequestRecipient) {
                var steamid3 = new SteamID(prop);
                steamClient.addFriend(steamid3);
            }
        }
    }
};