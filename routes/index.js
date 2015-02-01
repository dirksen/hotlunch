var express = require('express');
var router = express.Router();
var db = module.parent.db;
var async = require('async');

// Import menu data
require('../public/js/data');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Hot Lunch' });
});

/* Authenticate. */
router.post('/auth', function(req, res) {
  var reqbody = req.body;
  var pin_code = reqbody.pin_code.toUpperCase();

  // Demo
  if (pin_code === 'DEMO9') {
    res.send({user_id: 9999999});
    return;
  }

  var stmt = "SELECT * FROM hotlunch_orders WHERE pin_code=?";
  db.get(stmt, pin_code, function(err, row) {
    if (row) {
			if (row.orders) {
				// Retrive the orders
				var orders = JSON.parse(row.orders);
				res.send({orders:orders});
			} else {
				var user_id = row.user_id;
				var stmt = "UPDATE hotlunch_orders SET redemption_ts=DATETIME('NOW') WHERE user_id=?";
				db.run(stmt, user_id);
				res.send({user_id: user_id});
			}
    } else {
      res.send({});
    }
  });
});

/* :orders: is a hash, break it up into a table of order items */
function break_up(orders, pin_code) {
	try {
		orders = JSON.parse(orders);
	} catch (err) {
		return
	}
	orders.forEach(function(order) {
		async.series([
			function(callback){
				// Clear the old records by the same child
				db.run('delete from order_items where pin_code=?', [pin_code], function(err){callback()});
			},
			function(callback){
				var stmt = db.prepare('insert into order_items values (?, ?, ?, ?, ?, ?, ?, ?, ?)');
				order.by_days.forEach(function(quantity_list, day_idx) {
					quantity_list.forEach(function(quantity, option_idx) {
						if (quantity > 0) {
							stmt.run([
								order.child_name
								, order.teacher
								, menu[day_idx].date
								, menu[day_idx].options[option_idx].option
								, menu[day_idx].options[option_idx].price
								, menu[day_idx].options[option_idx].price
								, menu[day_idx].meal_type
								, quantity
								, pin_code
							]);
						}
					});
				});
				callback();
			},
		]);
	});
}

/* Save orders */
router.post('/submit-orders', function(req, res) {
  var params = req.body;
	var pin_code = params.pin_code.toUpperCase();
  var stmt = "UPDATE hotlunch_orders SET submit_ts=DATETIME('NOW'), orders=?, total=? WHERE user_id=? and pin_code=? and not orders";
  db.run(stmt, params.orders, params.total, params.user_id, pin_code, function(err){
		if (err) throw(err);
		//break_up(params.orders, pin_code);
  });
  res.send('done');
});

router.get('/break-up-orders', function(req, res) {
	db.each("select orders, pin_code from hotlunch_orders where total>0", function(err, row) {
		if (err) throw(err);
		break_up(row.orders, row.pin_code);
	}, function(err, row_cnt) {
		res.send('Breaking up ' + row_cnt + ' orders.\n');
	});
});

module.exports = router;
