var express = require('express');
var router = express.Router();
var ensureAuthenticated = module.parent.ensureAuthenticated;

router.get('/', ensureAuthenticated, function(req, res){
	res.render('admin');
});


router.get('/confirm-order', ensureAuthenticated, function(req, res){
	res.render('confirm-order');
});


module.exports = router;

