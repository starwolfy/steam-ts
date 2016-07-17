var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {

  if (req.session.loggedIn == true) {

    var verifiedjson = JSON.parse(fs.readFileSync(path.join(__dirname, '../', '../', 'data', 'verified.json')));
    var jsonLinks = verifiedjson.users;

    res.render('index', { links: jsonLinks });
  } else {
    res.redirect('/login');
  }
  
});

module.exports = router;
