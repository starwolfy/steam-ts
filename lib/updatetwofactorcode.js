var SteamTotp = require('steam-totp'),
    fs = require('fs'),
    path = require('path');

module.exports = function() {

    if (fs.existsSync(path.join(__dirname, '../', "data/twofactor.json"))) {
        var twofactorj = JSON.parse(fs.readFileSync(path.join(__dirname, '../', "data/twofactor.json")));
        var code = SteamTotp.generateAuthCode(twofactorj.shared_secret);
        fs.writeFileSync(path.join(__dirname, '../', "data/code.txt"), code, 'utf-8');
    }
};