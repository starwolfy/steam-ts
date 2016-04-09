var readline = require('readline'),
    fs = require('fs'),
    path = require('path');

module.exports = function(steamClient) {
		
    //  Commence twoFactor authentication process.

    steamClient.enableTwoFactor(function(response) {
        console.log(response);
        if (response.status != 1) {
            console.log("Error at start of twoFactor authentication process: " + response.status);
        } else {
            try {
                fs.writeFileSync(path.join(__dirname, '../', "data/twofactor.json"), JSON.stringify(response, null, 4), 'utf-8');
            } catch(err) {
                console.log("Error while creating twofactor.json: " + err);
                return;
            }

            //  Finalize it with the SMS code.
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question("Enter the SMS code: ", function(answer){
                steamClient.finalizeTwoFactor(response.shared_secret, answer, function(err) {
                    if (err == null) {
                        console.log("Steam Guard enabled.");
                    } else {
                        console.log("Error during Steam Guard finalisation: " + err);
                    }
                })
            })
        }
    })
};