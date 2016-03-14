module.exports = function(steamClient, SteamUser) {
    var SteamID = require('steamid');

    steamClient.on('friendRelationship', function (source, type) {
        //  Auto accept friend requests

        if (type == SteamUser.Steam.EFriendRelationship.RequestRecipient) {
            steamClient.addFriend(source);
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