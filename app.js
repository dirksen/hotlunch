var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('express-flash');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var url = require('url');
var session = require('cookie-session')
var sqlite3 = require('sqlite3').verbose();
module.db = new sqlite3.Database('db');

var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser('keyboard cat'));
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// Init flash
app.use(flash());



/* ----
 * Set up passport for auth
 */
var users = [
	{ id: 1, username: 'admin', password: 'terces' }
];
try {
	users = require('./users.json');
} catch(err) {}


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


app.get('/login', function(req, res){
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	res.render('login', {
		login: true
		, user: req.user
		, r: query['r']
	});
});

// POST /login
//	 Use passport.authenticate() as route middleware to authenticate the
//	 request.	If authentication fails, the user will be redirected back to the
//	 login page.	Otherwise, the primary route function function will be called,
//	 which, in this example, will redirect the user to the home page.
//
app.post('/login', function(req, res, next) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err) }
		if (!user) {
			req.flash('error', info.message);
			return res.redirect('/login' + (query.r ? ('?r=' + query.r) : ''))
		}
		req.logIn(user, function(err) {
			if (err) { return next(err); }
			return res.redirect(query.r ? query.r : '');
		});
	})(req, res, next);
});


app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});


module.ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) { return next(); }

	if (req.originalUrl) {
		res.redirect('/login?r=' + req.originalUrl);
	} else {
		res.redirect('/login');
	}
}

// Import admin routs after ensureAuthenticated is defined
var admin_routes = require('./routes/admin');



app.use('/', routes);
app.use('/admin', admin_routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.locals.pretty = true;

module.exports = app;
