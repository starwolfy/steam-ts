var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  if (req.session.loggedIn == true) {
    res.redirect('/');
  } else {
    res.render('login', { title: 'Express' });
  }

});

module.exports = router;