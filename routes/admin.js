var express = require('express');
var router = express.Router();
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var session = require('cookie-session')
var url = require('url')

router.use(passport.initialize());
router.use(passport.session());

/* ----
 * Set up passport for auth
 */
var users = [
	{ id: 1, username: 'admin', password: 'terces' }
	, { id: 2, username: 'bfadmin', password: 'bfterces' }
	, { id: 3, username: 'translator', password: 'frterces' }
];


function findById(id, fn) {
	var idx = id - 1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}

function findByUsername(username, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}


// Passport session setup.
//	 To support persistent login sessions, Passport needs to be able to
//	 serialize users into and deserialize users out of the session.	Typically,
//	 this will be as simple as storing the user ID when serializing, and finding
//	 the user by ID when deserializing.
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	findById(id, function (err, user) {
		done(err, user);
	});
});

// Use the LocalStrategy within Passport.
//	 Strategies in passport require a `verify` function, which accept
//	 credentials (in this case, a username and password), and invoke a callback
//	 with a user object.	In the real world, this would query a database;
//	 however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
	function(username, password, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {

			// Find the user by username.	If there is no user with the given
			// username, or the password is not correct, set the user to `false` to
			// indicate failure and set a flash message.	Otherwise, return the
			// authenticated `user`.
			findByUsername(username, function(err, user) {
				if (err) { return done(err); }
				if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
				if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
				return done(null, user);
			})
		});
	}
));






router.get('/login', function(req, res){
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	res.render('login', {
		login: true
		, user: req.user
		, schema: JSON.stringify({
			username: 'Text',
			password: 'Password'
		})
		, r: query['r']
	});
});

// POST /login
//	 Use passport.authenticate() as route middleware to authenticate the
//	 request.	If authentication fails, the user will be redirected back to the
//	 login page.	Otherwise, the primary route function function will be called,
//	 which, in this example, will redirect the user to the home page.
//
router.post('/login', function(req, res, next) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err) }
		if (!user) {
			req.flash('error', info.message);
			console.log('shit', req.flash);
			return res.redirect('/admin/login' + (query.r ? ('?r=' + query.r) : ''))
		}
		req.logIn(user, function(err) {
			if (err) { return next(err); }
			return res.redirect('/admin' + (query.r ? query.r : ''));
		});
	})(req, res, next);
});


router.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
	//return next();
	if (req.isAuthenticated()) { return next(); }

	if (req.path) {
		res.redirect('/admin/login?r=' + req.path);
	} else {
		res.redirect('/admin/login');
	}
}

router.get('/', ensureAuthenticated, function(req, res){
	res.send('<h1>Admin</h1>');
});

module.exports = router;

