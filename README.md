# a Steambot for TeamSpeak
[![Dependency Status](https://david-dm.org/nikitavondel/steam-ts.svg)](https://david-dm.org/nikitavondel/steam-ts)
[![Github All Releases](https://img.shields.io/github/downloads/atom/atom/total.svg)](https://www.npmjs.com/package/steam-ts)
### version

1.1.6g

```sh
$ npm install steam-ts
```

[steam-ts] is a [Node.js] module which allows for fast and easy verification between a [TeamSpeak] account and a [Steam] account of the same user.

  - Extremely easy to configure
  - No experience in programming is required in order to set this bot up if you follow the documentation carefully
  - Secure
  - Stores the **links** in a .json file
  - Allows you to set a minimum Steam level required in order to use automatic verification.
  - [MIT-license]

### Explanation

As soon as your app is running with steam-ts your Steam bot will automatically log into Steam and into your TeamSpeak query server and start listening to **!verify** commands in the Steam chat.
When someone writes **!verify** to the Steambot, it will prompt the user to give their TeamSpeak username which they are currently recognized by on the given TeamSpeak server and it will also warn them that they have to be connected to the TeamSpeak server during the process.
When the given username was correct it will message the TeamSpeak client under that username with a randomly generated string and it will tell the user to send that string to the Steambot through the Steam chat. When the bot has successfully compared the both strings it will write to a file called **verified.json**.
This json file contains an array called users wherein each object represents a verified user.

An example of the **verified.json** file:
```json
{
    "users": [
        {
            "76561198034364892": "I7ubU2YcawFqYbzftZD3RIm8Fu4="
        },
        {
            "76561198034364892": "QuFmp68SUNzEvdNbU+6uYOHhcUQ="
        }
    ]
}
```
The keys represent the steam64id which can easily be converted to let's say a steamid, whereas the values store the TeamSpeak identity of the user.

Another feature of this module is allowing **dynamic TeamSpeak channel names**. It allows you to select a certain supported game server and then assign it to a channel *(or channels)*, from then on it will update the name of the channel depending on the server name and the amount of players on the server. It is possible to disable this feature in the config file.

### Usage

First make sure that you've installed the module, after that we can write an extremely small piece of code which instantly sets everything up for you. All you need to do is execute a single function and everything will be up and running:

```javascript
var steamts = require('steam-ts');

steamts.launch();
//voila, your bot is now up and running!
```

But first it is **required** to adjust the **config.json**.

information about all the values inside the config.json:

```javascript
{
  "main": {
    "ts_ip": "", // The IP adress of your TeamSpeak server, prefferably not a domain name and cannot contain a port. (Custom ports are not indicated.)
    "q_port": 10011, // Do not change this unless you know what you're doing. This is your TeamSpeak Query port and not your 'normal' port.
    "q_username": "", // The query username of your TeamSpeak Query server. (As admin: tools>ServerQuery Login)
    "q_password": "", // The query password of your TeamSpeak Query server.
    "q_vserverid": 1, // The id of your virtual server, default is 1.
    "bot_username": "", // The username of your Steam bot which you use to log in.
    "bot_password": "", // The password of your Steam bot account.
    "minlevel": 1, // The minimum required Steam level of the client who wants to utilize the verification system. Shouldn't be 0.
    "defaultrankid": 1, // The id of the rank which users start with. (unverified rank)
    "wantedrankid": 2, // The id of the rank the bot will promote them to once they are verified. (verified rank)
    "editdescription": false // Should the bot adjust users descriptions as well so that it will display their steamid64 there?
  },
  "serverchannel": {
    "enabled": false, // This is a beta feature, be careful when enabling this.
    "querytime": 0, // How many times (in ms) should it query the given game servers. (Do not set it lower than 10000)
    "channels":[ // An array possibly containing multiple game servers it needs to query.
      {
        "channelid": [], // An array containing the TeamSpeak channelID's which need to be manipulated (Read notes for info)
        "serverip": "", // The ip adress of the server you want to query (preferably no domain names here)
        "servertype": "", // Check the notes for more information on this one.
        "customport": 0 // Leave this at 0 if you haven't assigned a custom port to your server
      }
    ]
  }
}
```

**A few important notices:**
  - The serverchannel feature is still in a beta stage, please do forward all bugs to [this repo].
  - If your TeamSpeak server runs on a custom port that does not matter, no need to include it.
  - Channelids are obtainable by installing the [extended-default] TeamSpeak skin, otherwise make use of your TeamSpeak server query.
  - The querytime really shouldn't be lower than 10000ms (10 seconds), unless you'd like to get blocked out by your own game server.
  - Do **NOT** add the same game server twice in the channels array, instead use the channelid array to manipulate multiple TeamSpeak channels with the same server.
  - All server types can be found at [gameDig's page].

An example of the config.json file:

```javascript
{
  "main": {
    "ts_ip": "37.59.11.113",
    "q_port": 10011,
    "q_username": "nikitavondel",
    "q_password": "12345",
    "bot_username": "mybot",
    "bot_password": "54321",
    "q_vserverid": 1,
    "minlevel": 5,
    "defaultrankid": 33,
    "wantedrankid": 34,
    "editdescription": true
  },
  "serverchannel": {
    "enabled": true,
    "querytime": 60000,
    "channels":[
      {
        "channelid": [14,19],
        "serverip": "37.59.11.113",
        "servertype": "csgo",
        "customport": 0
      },
      {
        "channelid": [1],
        "serverip": "27.69.11.114",
        "servertype": "csgo",
        "customport": 0
      }
    ]
  }
}
```

### Changelog
- **UPDATE 1.1.6c**:
- On request; q_vserverid value has now been added to the config.json to specify on which virtual server the bot must operate.


- **UPDATE 1.1.6**:
- On request; q_port has now been added to the config.json to allow the bot to connect to custom TeamSpeak ports.
- Cleared up a few console messages.


- **UPDATE 1.1.5**:
- On request; the bot is now sending messages instead of poking the users.
- Added spam protection.
- Keys now get added to an array, so if someone else generates a key for them their old one will still work.
- Increased stability.
- The message states who generated the token for you.
- If your Steam account is already attached to a TeamSpeak identity, using !verify will give you that identity and quit the verification process.


- **UPDATE 1.1.0**:
- Moved main module file into new lib directory
- Moved verified.json inside data directory
- Data directory will now be created when running the module for the first time
- Launching the bot now requires the execution of the launch() function
- Launch parameters are replaced with the config.json file
- Added more dependencies
- Added the dynamic server channel function
- For detailed information on the newly added stuff see README.md

### Development

Currently still under heavy development, please do report all the bugs you encounter.

Suggestions are extremely welcome!

If you'd like to improve this project feel free to start a pull request, it will be reviewed as fast as possible.


[steam-ts]: <https://www.npmjs.com/package/steam-ts>
[Node.js]: <https://nodejs.org>
[TeamSpeak]: <https://teamspeak.com/>
[Steam]: <https://steamcommunity.com/>
[MIT-license]: <https://opensource.org/licenses/MIT>
[extended-default]: <http://addons.teamspeak.com/directory/skins/stylesheets/Extended-Client-Info.html>
[gameDig's page]: <https://github.com/sonicsnes/node-gamedig#supported>
[this repo]: <https://github.com/nikitavondel/steam-ts>
