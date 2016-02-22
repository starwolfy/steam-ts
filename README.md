# Link TeamSpeak with Steam
[![Dependency Status](https://david-dm.org/nikitavondel/steam-ts.svg)](https://david-dm.org/nikitavondel/steam-ts)
### version

1.0.1

steam-ts is a [Node.js] module which allows for fast and easy verification between a [TeamSpeak] account and [Steam] account of the same client.

  - Extremely easy to configure
  - No experience in programming is required in order to set this bot up if you follow the documentation carefully
  - Secure
  - Stores the **links** in a .json file (MySQL support coming)
  - Allows you to set a minimum Steam level required in order to use automatic verification.
  - [MIT-license]

### Explaination

As soon as your app is running with steam-ts your Steam bot will automatically log into Steam and into your TeamSpeak query server and start listening to **!verify** commands in the Steam chat.
When someone writes **!verify** to the Steambot, it will prompt the user to give their TeamSpeak username which they are currently recognized by on the given TeamSpeak server and it will also warn them that they have to be connected to the TeamSpeak server during the process.
When the given username was correct it will poke the TeamSpeak client under that username with a randomly generated string and it will tell the user to send that string to the Steambot through the Steam chat. When the bot has successfully compared the both strings it will write to a file called **verified.json**.
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

The keys represent the steam64id which can easily be converted to let's say a steamid, whereas the values store the TeamSpeak identity of the user which is used to distuingish users from eachother.



### Installation

```sh
$ npm install steam-ts
```


### Usage

First make sure that you've installed the module, after that we can write an extremely small piece of code which instantly sets everything up for you.
All you need to do is execute a single function and everything will be up and running:
steamts(ts_ip, q_username, q_password, bot_username, bot_password, minlevel, defaultrankid, wantedrankid)
  - ts_ip - The IP adress of your TeamSpeak server
  - q_username - The query username of your TeamSpeak Query server (As admin: tools>ServerQuery Login)
  - q_password - The query password of your TeamSpeak Query server
  - bot_username - The username of your Steam bot which you use to log in.
  - bot_password - The password of your Steam bot account.
  - minlevel - The minimum required Steam level of the client who wants to utilize the verification system.
  - defaultrankid - The id of the rank which users start with. (unverified rank)
  - wantedrankid - The id of the rank the bot will promote them too once they are verified. (verified rank)

Example of main file:
```javascript
var steamts = require('steam-ts');

steamts("clwo.eu", "query_bot", "querypw12345", "steamclwobot", "steamclwopw123", 3, 37, 38);
//voila, your bot is now up and running!
```

### Changelog

-Currently empty.

### Development

Currently still under heavy development, please do report all the bugs you encounter.

Suggestions are extremely welcome!

If you'd like to improve this project feel free to start a pull request, it will be reviewed as fast as possible.


[Node.js]: <https://nodejs.org>
[TeamSpeak]: <https://teamspeak.com/>
[Steam]: <https://steamcommunity.com/>
[MIT-license]: <https://opensource.org/licenses/MIT>
