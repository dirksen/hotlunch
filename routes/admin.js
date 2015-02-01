var express = require('express');
var router = express.Router();
var ensureAuthenticated = module.parent.ensureAuthenticated;
var db = module.parent.db;
var async = require('async');

router.get('/', ensureAuthenticated, function(req, res){
	async.parallel([
		function(callback){
			db.get('select count(*) as family_cnt from hotlunch_orders where total>0', function(err, row){
				if (err) throw(err);
				res.locals.family_cnt = row.family_cnt;
				callback();
			});
		},
		function(callback){
			db.get('select count(*) as cnt from confirmation_log where confirmed', function(){}, function(err, row){
				if (err) throw(err);
				res.locals.confirmed_cnt = row.cnt;
				callback();
			});
		},
		function(callback){
			db.each('select distinct child_name, teacher from order_items where quantity>0', function(){}, function(err, row_cnt){
				if (err) throw(err);
				res.locals.order_cnt = row_cnt;
				callback();
			});
		},
	], function(){
		res.render('admin');
	});
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
					db.all("SELECT confirmed, note, datetime(ts, 'localtime') as ts from confirmation_log where pin_code=? order by datetime(ts) desc", pin_code, function(err, log){
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
	db.all("select lunch_date, meal_type, option, sum(quantity) as quantity, true_cost, case meal_type when 'PIZZA' then round(sum(quantity)/8.)*true_cost else sum(quantity)*true_cost end as cost from order_items where quantity>0 group by lunch_date, option order by lunch_date", function(err, rows) {
		res.send(rows);
	});
});

module.exports = router;

