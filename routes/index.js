var express = require('express');
var router = express.Router();
var db = module.parent.db;

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
function break_up(orders) {
	try {
		orders = JSON.parse(orders);
	} catch (err) {
		return
	}
	orders.forEach(function(order) {
		// Clear the old records by the same child
		db.run('delete from order_items where child_name=? and teacher=?', [
			order.child_name, order.teacher
		]);
		var stmt = 'insert into order_items values ';
		var stmt_params = [];
		order.by_days.forEach(function(quantity_list, day_idx) {
			quantity_list.forEach(function(quantity, option_idx) {
				stmt += '(?, ?, ?, ?, ?, ?, ?),';
				stmt_params = stmt_params.concat([
					order.child_name
					, order.teacher
					, menu[day_idx].date
					, menu[day_idx].options[option_idx].option
					, menu[day_idx].options[option_idx].cost
					, /PIZZA/i.test(menu[day_idx].meal_type)
					, quantity
				]);
			});
		});
		stmt = stmt.replace(/,$/, ';');
		db.run(stmt, stmt_params);
	});
}

/* Save orders */
router.post('/submit-orders', function(req, res) {
  var params = req.body;
  var stmt = "UPDATE hotlunch_orders SET submit_ts=DATETIME('NOW'), orders=?, total=? WHERE user_id=? and pin_code=? and not orders";
  db.run(stmt, params.orders, params.total, params.user_id, params.pin_code.toUpperCase(), function(err){
		if (err) throw(err);
		break_up(params.orders);
  });
  res.send('done');
});

router.get('/break-up-orders', function(req, res) {
	db.each("select orders from hotlunch_orders", function(err, row) {
		if (err) throw(err);
		break_up(row.orders);
	}, function(err, row_cnt) {
		res.send('Breaking up into ' + row_cnt + ' items.\n');
	});
});

module.exports = router;
