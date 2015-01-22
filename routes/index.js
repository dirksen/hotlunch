var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db');

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

/* Save orders */
router.post('/submit-orders', function(req, res) {
  var params = req.body;
  var stmt = "UPDATE hotlunch_orders SET submit_ts=DATETIME('NOW'), orders=?, total=? WHERE user_id=? and pin_code=? and not orders";
  db.run(stmt, params.orders, params.total, params.user_id, params.pin_code.toUpperCase(), function(err){
    console.error(err);
  });
  res.send('done');
});

module.exports = router;
