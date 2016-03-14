# a Steambot for TeamSpeak
[![Dependency Status](https://david-dm.org/nikitavondel/steam-ts.svg)](https://david-dm.org/nikitavondel/steam-ts)
### version

1.2.1b

```sh
$ npm install steam-ts
```

[steam-ts] is a [Node.js] module which allows for fast and easy verification between a [TeamSpeak] account and a [Steam] account of the same user.

  - Extremely easy to configure
  - No experience in programming is required in order to set this bot up if you follow the documentation carefully
  - Secure
  - Stores the **links** in a .json file
  - Allows you to set a minimum Steam level required in order to use automatic verification.
  - Perfect Steam Guard support.
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
    "editdescription": false, // Should the bot adjust users descriptions as well so that it will display their steamid64 there?
    "clanabbreviation": "" // Should not be bigger than 4 letters. The abbreviation of your clan name if you have one.
  },
  "twoFactor": {
    "enabled": false // Enable or disable mobile authentication; **if you want to let this module support the two factor authentication you need to go through a small process described below!**
  }
}
```

**A few important notices:**
  - If your TeamSpeak server runs on a custom port that does not matter, no need to include it.
  - Two factor authentication does not go automatically, you need to manually enter the current code displayed on your phone each time it connects to steam (after maintenance too).
  - If you enable twoFactor you need to go through the process mentioned below, after having completed this process the module is able to automatically generate Steam Guard codes for you!
  which allows for automation and stability.

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
    "editdescription": true,
    "clanabbreviation": "CLWO"
  },
  "twoFactor": {
    "enabled": true
  }
}
```

### Two factor authentication

If you would like to enable this feature you need to complete the following steps:
- twoFactor.enabled should currently be false.
- Log into the Steam account of your bot, enable verification through your mobile device so that Steam guard is enabled.
- Then disable it, the reason why we previously enabled it is to link your phone number with your Steam account.
- Now change twoFactor.enabled to true in the config.json.
- Grab your phone and launch your Nodejs app, the module will enable Steam Guard for you again but first needs to know the verification code sent through SMS to your phone.
- After having entered the code you have successfully enabled Steam guard, your app will now log into the Steam account automatically without needing you to keep on entering Steam guard codes!

**IMPORTANT** : After the process of enabling Steam Guard has been completed it will create a file inside the data folder called twofactor.json, it is of **extreme importance** to keep that file in a secure place.
**NEVER** share that file with anyone as it contains the shared secret between your phone and the Steam Guard codes, anyone with this file can generate Steam Guard codes for your Steam account.
Also **make sure** that you backup that file as it contains important codes which you might need later on to recover your Steam account.
Your mobile phone will no longer be able to generate Steam Guard codes for this account untill you have deactivated mobile authentication and enabled it yourself again. As long as the bot
is in control of your Steam Guard codes you can find the current Steam guard codes used to login in /data/code.txt .

If you used to have two factor authentication enabled with this module and recently decided to disable it but want it enabled again, make sure to remove the twofactor.json and code.txt file.


### Changelog
- **UPDATE 1.2.0**:
- Added better Steam Guard support.
- The app will no longer crash when steam goes down for maintenance.
- Removed the serverchannel feature, will create a separate GitHub repo for that feature.

### Development

Please do report all the bugs you encounter.

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
