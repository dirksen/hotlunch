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
  var pin_code = reqbody.pin_code.toLowerCase();

  // Demo
  if (pin_code === 'demo9') {
    res.send({user_id: 9999999});
    return;
  }
  
  var stmt = "SELECT * FROM hotlunch_orders WHERE pin_code=? AND orders IS NULL";
  db.get(stmt, pin_code, function(err, row) {
    if (row) {
      var user_id = row.user_id;
      var stmt = "UPDATE hotlunch_orders SET redemption_ts=DATETIME('NOW') WHERE user_id=?";
      db.run(stmt, user_id);
      res.send({user_id: user_id});
    } else {
      res.send({});
    }
  });
});

/* Save orders */
router.post('/submit-orders', function(req, res) {
	console.log(req.body);
  var stmt = "UPDATE hotlunch_orders SET submit_ts=DATETIME('NOW'), orders=$order, total=$total WHERE user_id=$user_id and pin_code=$pin_code";
  db.run(stmt, req.body);
  res.send('done');
});

module.exports = router;
