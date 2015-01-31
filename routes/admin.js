var express = require('express');
var router = express.Router();
var ensureAuthenticated = module.parent.ensureAuthenticated;
var db = module.parent.db;

router.get('/', ensureAuthenticated, function(req, res){
	res.render('admin');
});


router.all('/confirm-orders', ensureAuthenticated, function(req, res){
	if ('pin_code' in req.body) {
		var pin_code = req.body.pin_code;
		function render_order() {
			var stmt = "SELECT * FROM hotlunch_orders WHERE pin_code like ?";
			db.get(stmt, pin_code, function(err, row){
				if (err || !row) {
					console.error(err);
					req.flash('error', 'Incorrect PIN');
					res.render('confirm-orders', {total:null});
				} else {
					total = row ? row.total:null;
					db.all("SELECT * from confirmation_log where pin_code=? order by datetime(ts) desc", pin_code, function(err, log){
						if (err)
							throw(err);
						res.render('confirm-orders', {pin_code: pin_code, total: total, log:log});
					});
				}
			});
		}
		var note = req.body.note;
		if (note) {
			db.run("UPDATE confirmation_log set confirmed=0 where pin_code=?", pin_code, function(err){
				db.run("INSERT INTO confirmation_log (pin_code, confirmed, note, ts) values (?, ?, ?, datetime('now'))", pin_code, note === 'Cheque' || note === 'Cash', note);
				req.flash('success', 'The log for order #' + pin_code + ' has been updated.');
				render_order();
			});
		} else {
			render_order();
		}
	} else {
		res.render('confirm-orders', {total:null});
	}
});

router.all('/purchase-orders', ensureAuthenticated, function(req, res){
});

module.exports = router;

