// ========================================================================== //
// ==                               INIT                                   == //
// ========================================================================== //
var Fs = require("fs");
var express = require('express');
var session = require("express-session")({
	secret: "matcha",
	resave: true,
	saveUninitialized: false
});
var sharedsession = require("express-socket.io-session");
var bodyParser = require('body-parser');
var mysql = require('mysql');
var whirlpool = require('whirlpool');
var nodemailer = require('nodemailer');
var Entities = require('html-entities').AllHtmlEntities;
var nodeGeocoder = require('node-geocoder');
var distance = require('gps-distance');
var io = require('socket.io')();
var Tags = require('./js/tags.js');
var Likes = require('./js/likes.js');
var Search = require('./js/search.js');
var Users = require('./js/users.js');
var Pictures = require('./js/pictures.js');
var Blacklist = require('./js/blacklist.js');
var Notification = require('./js/notification.js');
var app = express();

var users = {};

var conn = mysql.createConnection({
  host     : 'mysql-qhonore.alwaysdata.net',
  user     : 'qhonore',
  password : 'rush00',
  database : 'qhonore_matcha'
});
conn.connect(function(err){
	if(!err)
		console.log("Connected to the database");
	else
		console.log("Connection failed");
});

var transporter = nodemailer.createTransport("SMTP",{
	service: "Gmail",
	auth: {
		user: "42subjects@gmail.com",
		pass: "mgalhonor42"
	}
});

app.use(express.static('public/css'));
app.use(express.static('public/gallery'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session);
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

entities = new Entities();
var geocoder = nodeGeocoder({ provider: 'google' });

// ========================================================================== //
// ==                               HOME                                   == //
// ========================================================================== //

app.get('/', function(req, res){
	if (!req.session.user)
		res.redirect('index');
	else
		res.redirect('home');
});

app.get('/home', function(req, res){
	if (!req.session.user)
		res.redirect('index');
	else
	{
		Search.getBestUsers(req.session.user, conn, function (ret) {
			res.render('home', {
				title: 'Matcha',
				sess: req.session.user,
				valide: req.session.log,
				matchs: ret
			});
			if (req.session.log)
			{
				delete req.session.log;
				req.session.save();
			}
		});
	}
});

// ========================================================================== //
// ==                             CONNECT                                  == //
// ========================================================================== //
app.route('/index')
.get(function(req, res) {
	if (req.session.user)
		res.redirect('home');
	else
	{
		Users.getUsersList(10, "score DESC", conn, function (ret) {
			res.render('index', {
				title: 'Matcha',
				users: ret
			});
		});
	}
})
.post(function(req, res) {
	if (req.session.user)
		res.redirect('home');
	else
	{
		if (req.body.login && req.body.passwd)
		{
			var login = entities.encode(req.body.login);
			var passwd = entities.encode(req.body.passwd);
			var query = 'SELECT * FROM accounts WHERE login = ?';
			conn.query(query, [login], function(err, result) {
				if (!err && result.length > 0)
				{
					var hash = whirlpool(passwd);
					if (result[0].passwd == hash)
					{
						var newUser = {
							id: result[0].id,
							login: result[0].login,
							passwd: result[0].passwd,
							mail: result[0].mail,
							firstname: result[0].firstname,
							lastname: result[0].lastname,
							age: result[0].age,
							gender: result[0].gender,
							search: result[0].search,
							bio: result[0].bio,
							image1: result[0].image1,
							image2: result[0].image2,
							image3: result[0].image3,
							image4: result[0].image4,
							image5: result[0].image5,
							score: result[0].score,
							last_conn: new Date().getTime(),
							city: result[0].city,
							longitude: result[0].longitude,
							latitude: result[0].latitude
						};
						req.session.user = newUser;
						req.session.log = 'You are now logged on !';
						req.session.save();
						var query = 'UPDATE accounts SET last_conn = ? WHERE login = ?';
						conn.query(query, [new Date().getTime(), login], function(err, result) {});
						console.log("User " + result[0].login + " connected");
						res.redirect('home');
					}
				}
				if (!req.session.user)
					Users.getUsersList(10, "score DESC", conn, function (ret) {
						res.render('index', {
							title: 'Matcha',
							users: ret,
							error: 'Failed to connect'
						});
					});
			});
		}
		else
			Users.getUsersList(10, "score DESC", conn, function (ret) {
				res.render('index', {
					title: 'Matcha',
					users: ret,
					error: 'Failed to connect'
				});
			});
	}
});

// ========================================================================== //
// ==                             SIGN UP                                  == //
// ========================================================================== //
app.route('/signup')
.get(function(req, res) {
	if (req.session.user)
		res.redirect('home');
	else
	{
		res.render('signup', {
			title: 'Matcha - Sign Up'
		});
	}
})
.post(function(req, res) {
	if (req.session.user)
		res.redirect('home');
	else
	{
		if (!req.body.login || !req.body.pwd || !req.body.pwd2 || !req.body.mail || !req.body.firstname || !req.body.lastname || !req.body.gender || !req.body.bday || !req.body.city)
			res.render('signup', { title: 'Matcha', error: 'Fill all the fields with an *', data: req.body});
		else if ((req.body.login).length < 4)
			res.render('signup', { title: 'Matcha', error: 'Your login contain less than 4 characters', data: req.body });
		else if (!(req.body.login).match(/^\w+$/))
			res.render('signup', { title: 'Matcha', error: 'Login must be only alphanumeric', data: req.body });
		else if (req.body.pwd != req.body.pwd2)
			res.render('signup', { title: 'Matcha', error: 'Your passwords are differents', data: req.body });
		else if ((req.body.pwd).length < 6)
			res.render('signup', { title: 'Matcha', error: 'Your password contain less than 6 characters', data: req.body });
		else if ((req.body.pwd).match(/[0-9]/g) < 2)
			res.render('signup', { title: 'Matcha', error: 'Your password contain less than 2 numerics', data: req.body });
		else if (!(req.body.mail).match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/))
			res.render('signup', { title: 'Matcha', error: 'Invalid email', data: req.body });
		else if (!(req.body.firstname).match(/^[a-z]+([ \-']?[a-z]+[ \-']?[a-z]+[ \-']?)[a-z]+$/ig))
			res.render('signup', { title: 'Matcha', error: 'Firstname must be only alphabetics, accents, - or space', data: req.body });
		else if (!(req.body.lastname).match(/^[a-z]+([ \-']?[a-z]+[ \-']?[a-z]+[ \-']?)[a-z]+$/ig))
			res.render('signup', { title: 'Matcha', error: 'Lastname must be only alphabetics, accents, - or space', data: req.body });
		else if ((new Date().getTime() - new Date(req.body.bday).getTime()) < 567648000000)
			res.render('signup', { title: 'Matcha', error: 'Your age need to be greater than 18', data: req.body });
		else
		{
			var login = entities.encode(req.body.login);
			var mail = entities.encode(req.body.mail);
			var firstname = entities.encode(req.body.firstname);
			var lastname = entities.encode(req.body.lastname);
			var bio = entities.encode(req.body.bio);
			var gender = entities.encode(req.body.gender);
			var search = entities.encode(req.body.search);
			var query = 'SELECT * FROM accounts WHERE login = ?';
			var longitude;
			var latitude;
			var city;
			geocoder.geocode({address: req.body.city, country: 'France'}, function(err, result) {
				if (err || !result || !result[0])
			  		res.render('signup', { title: 'Matcha', error: 'City not found', data: req.body });
				else if (result[0].city == "Paris" && !result[0].extra.neighborhood)
					res.render('signup', { title: 'Matcha', error: 'Please specify neighborhood (ex: Paris 8)', data: req.body });
			  	else
			  	{
			    	longitude = result[0].longitude;
				    latitude = result[0].latitude;
					city = result[0].city;
					if (result[0].extra.neighborhood)
						city += ", " + result[0].extra.neighborhood;
					conn.query(query, [login], function(err, result) {
						if (err || result.length > 0)
							res.render('signup', { title: 'Matcha', error: 'Login already used', data: req.body });
						else
						{
							query = 'SELECT * FROM accounts WHERE mail = ?';
							conn.query(query, [mail], function(err, result) {
								if (err || result.length > 0)
									res.render('signup', { title: 'Matcha', error: 'Email already used', data: req.body });
								else
								{
									query = 'INSERT INTO accounts (login, passwd, mail, firstname, lastname, gender, search, age, bio, last_conn, city, longitude, latitude) '
											+ 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
									var passwd = whirlpool(entities.encode(req.body.pwd));
									var age = new Date(req.body.bday).getTime();
									var tab = [
										login,
										passwd,
										mail,
										firstname,
										lastname,
										gender,
										search,
										age,
										bio,
										new Date().getTime(),
										city,
										longitude,
										latitude
									];
									conn.query(query, tab, function(err, result) {
										if (!err)
										{
											var newUser = {
												id: result.insertId,
												login: login,
												passwd: passwd,
												mail: mail,
												firstname: firstname,
												lastname: lastname,
												age: age,
												gender: gender,
												search: search,
												bio: bio,
												image1: null,
												image2: null,
												image3: null,
												image4: null,
												image5: null,
												score: 0,
												last_conn: new Date().getTime(),
												city: city,
												longitude: longitude,
												latitude: latitude
											};
											req.session.user = newUser;
											req.session.log = 'You successfully subscribed !';
											req.session.save();
											console.log("New user '" + login + "' subscribed. ID:" + result.insertId);
											res.redirect('home');
										}
									});
								}
							});
						}
					});
			  	}
			});
		}
	}
});

// ========================================================================== //
// ==                             PROFILE                                  == //
// ========================================================================== //
app.route('/profile')
.get(function(req, res) {
	if (!req.session.user)
		res.redirect('index');
	else
	{
		Likes.getAllLikersOf(req.session.user, conn, function (likers) {
			Likes.getAllLikedsBy(req.session.user, conn, function (likeds) {
				Users.getAllVisitors(req.session.user, conn, function (visitors) {
					Likes.getConnections(req.session.user, conn, function (connects) {
						Tags.getTagsById(req.session.user.id, conn, function(tags) {
							var query = 'SELECT * FROM accounts WHERE id = ?';
							conn.query(query, [req.session.user.id], function(err, result) {
								if (!err && result.length > 0)
								{
									var newUser = {
										id: result[0].id,
										login: result[0].login,
										passwd: result[0].passwd,
										mail: result[0].mail,
										firstname: result[0].firstname,
										lastname: result[0].lastname,
										age: result[0].age,
										gender: result[0].gender,
										search: result[0].search,
										bio: result[0].bio,
										image1: result[0].image1,
										image2: result[0].image2,
										image3: result[0].image3,
										image4: result[0].image4,
										image5: result[0].image5,
										score: result[0].score,
										last_conn: new Date().getTime(),
										city: result[0].city,
										longitude: result[0].longitude,
										latitude: result[0].latitude
									};
									req.session.user = newUser;
									req.session.save();
									res.render('profil', {
										title: 'Matcha - Profile',
										sess: req.session.user,
										tags: tags,
										likeds: likeds,
										likers: likers,
										visitors: visitors,
										connects: connects
									});
								}
							});
						});
					});
				});
			});
		});
	}
})
.post(function(req, res) {
	if (!req.session.user)
		res.redirect('index');
	else
	{
		var error = null;
		if (req.body.edit)
		{
			if (req.body.oldpwd && req.body.pwd && req.body.pwd2 && whirlpool(req.body.pwd) != req.session.user.passwd)
			{
				var passwd = entities.encode(req.body.pwd);
				var passwd2 = entities.encode(req.body.pwd2);
				if (req.session.user.passwd != whirlpool(entities.encode(req.body.oldpwd)))
					error = 'Old password is not good';
				else if (passwd.length < 6)
					error = 'Password contain less than 6 characters';
				else if (passwd != passwd2)
					error = 'Passwords are differents';
				else if (passwd.match(/[0-9]/g) < 2)
					error = 'Password contain less than 2 numerics';
				else
					req.session.user.passwd = whirlpool(passwd);
			}
			if (req.body.mail && req.session.user.mail != req.body.mail)
			{
				var mail = entities.encode(req.body.mail);
				if (!mail.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/))
					error = 'Invalid email';
				else
					req.session.user.mail = mail;
			}
			if (req.body.firstname && req.session.user.firstname != req.body.firstname)
			{
				var firstname = entities.encode(req.body.firstname);
				if (!firstname.match(/^[a-z]+([ \-']?[a-z]+[ \-']?[a-z]+[ \-']?)[a-z]+$/ig))
					error = 'Firstname must be only alphabetics, accents, - or space';
				else
					req.session.user.firstname = firstname;
			}
			if (req.body.lastname && req.session.user.lastname != req.body.lastname)
			{
				var lastname = entities.encode(req.body.lastname);
				if (!lastname.match(/^[a-z]+([ \-']?[a-z]+[ \-']?[a-z]+[ \-']?)[a-z]+$/ig))
					error = 'Lastname must be only alphabetics, accents, - or space';
				else
					req.session.user.lastname = lastname;
			}
			if (req.body.city && req.session.user.city != req.body.city)
			{
				geocoder.geocode({address: req.body.city, country: 'France'}, function(err, result) {
					if (err || !result || !result[0])
				  		error = 'City not found';
					else if (result[0].city == "Paris" && !result[0].extra.neighborhood)
				  		error = 'Please specify neighborhood (ex: Paris 8)';
				  	else
				  	{
						req.session.user.longitude = result[0].longitude;
					    req.session.user.latitude = result[0].latitude;
						req.session.user.city = result[0].city;
						if (result[0].extra.neighborhood)
							req.session.user.city += ", " + result[0].extra.neighborhood;
						req.session.save();
						var query = 'UPDATE accounts '
									+ 'SET city = ?, longitude = ?, latitude = ? '
									+ 'WHERE login = ?';
						conn.query(query, [req.session.user.city, req.session.user.longitude, req.session.user.latitude, req.session.user.login], function(err, result) {});
					}
				});
			}
			if (req.body.bday && req.session.user.bday != new Date(req.body.bday).getTime())
			{
				if ((new Date().getTime() - new Date(req.body.bday).getTime()) < 568036800000)
					error = 'Your age need to be greater than 18';
				else
					req.session.user.age = new Date(req.body.bday).getTime();
			}
			if (req.body.bio && req.session.user.bio != entities.encode(req.body.bio))
				req.session.user.bio = entities.encode(req.body.bio);
			req.session.user.gender = entities.encode(req.body.gender);
			req.session.user.search = entities.encode(req.body.search);
			req.session.save();
			var query = 'UPDATE accounts '
						+ 'SET passwd = ?, mail = ?, firstname = ?, lastname = ?, gender = ?, age = ?, bio = ?, search = ?, city = ?, longitude = ?, latitude = ? '
						+ 'WHERE login = ?';
			var tab = [
				req.session.user.passwd,
				req.session.user.mail,
				req.session.user.firstname,
				req.session.user.lastname,
				req.session.user.gender,
				req.session.user.age,
				req.session.user.bio,
				req.session.user.search,
				req.session.user.city,
				req.session.user.longitude,
				req.session.user.latitude,
				req.session.user.login
			];
			conn.query(query, tab, function(err, result) {});
		}
		if (error)
			Likes.getAllLikersOf(req.session.user, conn, function (likers) {
				Likes.getAllLikedsBy(req.session.user, conn, function (likeds) {
					Users.getAllVisitors(req.session.user, conn, function (visitors) {
						Likes.getConnections(req.session.user, conn, function (connects) {
							Tags.getTagsById(req.session.user.id, conn, function(tags) {
								res.render('profil', {
									title: 'Matcha - Profile',
									sess: req.session.user,
									tags: tags,
									likeds: likeds,
									likers: likers,
									visitors: visitors,
									connects: connects,
									error: error
								});
							});
						});
					});
				});
			});
		else
			Likes.getAllLikersOf(req.session.user, conn, function (likers) {
				Likes.getAllLikedsBy(req.session.user, conn, function (likeds) {
					Users.getAllVisitors(req.session.user, conn, function (visitors) {
						Likes.getConnections(req.session.user, conn, function (connects) {
							Tags.getTagsById(req.session.user.id, conn, function(tags) {
								res.render('profil', {
									title: 'Matcha - Profile',
									sess: req.session.user,
									tags: tags,
									likeds: likeds,
									likers: likers,
									visitors: visitors,
									connects: connects
								});
							});
						});
					});
				});
			});
	}
});

// ========================================================================== //
// ==                        PROFILE OTHER USER                            == //
// ========================================================================== //
app.get('/profile/:username', function(req, res) {
	if (!req.session.user)
		res.redirect('/index');
	else
	{
		var userName = entities.encode(req.params.username);
		var query = 'SELECT * FROM accounts WHERE login = ?';
		conn.query(query, [userName], function(err, result) {
			if (!err && result.length > 0)
			{
				Likes.isLiked(result[0].id, req.session.user.id, conn, function (liked) {
					Likes.areConnected(result[0].id, req.session.user.id, conn, function(connect) {
						Blacklist.isReported(result[0].id, req.session.user.id, conn, function (report) {
							Blacklist.isLocked(result[0].id, req.session.user.id, conn, function (lock) {
								Likes.isLiked(req.session.user.id, result[0].id, conn, function (likeMe) {
									Users.isVisited(result[0].id, req.session.user.id, conn, function(visited) {
										var dist = distance(req.session.user.latitude, req.session.user.longitude, result[0].latitude, result[0].longitude);

										var userProfile = {
											id: result[0].id,
											login: result[0].login,
											firstname: result[0].firstname,
											lastname: result[0].lastname,
											age: result[0].age,
											gender: result[0].gender,
											search: result[0].search,
											bio: result[0].bio,
											image1: result[0].image1,
											image2: result[0].image2,
											image3: result[0].image3,
											image4: result[0].image4,
											image5: result[0].image5,
											score: result[0].score,
											last_conn: result[0].last_conn,
											city: result[0].city,
											longitude: result[0].longitude,
											latitude: result[0].latitude,
											liked: liked,
											dist: dist,
											connect: connect,
											report: report,
											lock: lock,
											likeMe: likeMe,
											visited: visited
										};
										Users.addVisit(userProfile.id, req.session.user.id, conn, function(err, result) {
											Tags.getTagsById(userProfile.id, conn, function(ret) {
												console.log(userProfile);
												res.render('users', {
													title: 'Matcha - Profile ' + userName,
													username: userName,
													sess: req.session.user,
													data: userProfile,
													tags: ret
												});
											});
										});
									});
								});
							});
						});
					});
				});
			}
			else
				res.redirect('/profile');
		});
	}
});

// ========================================================================== //
// ==                              RESET                                   == //
// ========================================================================== //
app.route('/reset')
.get(function(req, res) {
	if (req.session.user)
		res.redirect('home');
	else
	{
		res.render('reset', {
			title: 'Matcha - Reset Password'
		});
	}
})
.post(function(req, res){
	if (req.session.user)
		res.redirect('home');
	else
	{
		if (!req.body.login || !req.body.mail)
			res.render('reset', { title: 'Matcha - Reset Password', error: 'Please fill all the fields' });
		else
		{
			var login = entities.encode(req.body.login);
			var mail = entities.encode(req.body.mail);
			var query = 'SELECT * FROM accounts WHERE login = ? AND mail = ?';
			conn.query(query, [login, mail], function(err, result) {
				if (err || result.length < 1)
					res.render('reset', { title: 'Matcha - Reset Password', error: 'Account not found' });
				else
				{
					var newPassword = whirlpool(new Date().getTime() + login).substring(9, 20);
					var hash = whirlpool(newPassword);
					var query = 'UPDATE accounts SET passwd = ? WHERE login = ?';
					conn.query(query, [hash, login], function(err, result) {
						if (!err)
						{
							var mailOptions = {
							    from: '"Matcha" <borhink@gmail.com>', // sender address
							    to: mail, // list of receivers
							    subject: 'New Password', // Subject line
							    html: '<b>Your new password: </b>' + newPassword // html body
							};
							transporter.sendMail(mailOptions, function(error, info){
							    if(!error)
									console.log('Password reset for: ' + login);
								else
									console.log(error);
							});
						}
					});
					res.render('reset', {
						title: 'Matcha - Reset Password',
						valide: 'A new password as sent to you'
					});
				}
			});
		}
	}
});

// ========================================================================== //
// ==                              LOGOUT                                  == //
// ========================================================================== //
app.get('/logout', function(req, res){
	if (!req.session.user)
		res.redirect('index');
	else
	{
		Users.getUsersList(10, "score DESC", conn, function (ret) {
			res.render('index', {
				title: 'Matcha',
				users: ret,
				valide: 'You are disconnect.'
			});
		});
		delete req.session.user;
		req.session.save();
	}
});


// ========================================================================== //
// ==                           SEARCH PAGE                                == //
// ========================================================================== //
app.route('/search')
.get(function(req, res) {
	if (!req.session.user)
		res.redirect('index');
	else
	{
		res.render('search', {
			title: 'Matcha - Search',
			sess: req.session.user,
			result: {}
		});
	}
})
.post(function(req, res){
	if (!req.session.user)
		res.redirect('index');
	else
	{
		Search.getUsers(req.session.user, req.body, conn, function(users) {
			Search.sortUsers(null, users, function(ret) {
				res.render('search', {
					title: 'Matcha - Search',
					sess: req.session.user,
					search: req.body,
					result: ret
				});
			});
		});
	}
});

// ========================================================================== //
// ==                            WRONG PAGE                                == //
// ========================================================================== //
app.get('*', function(req, res){
	res.status(400);
	res.render('content', {
		  title: 'Matcha',
		  msg_title: '404 Not Found',
		  msg: 'Sorry cant find that!',
		  sess: req.session.user
	});
});


// ========================================================================== //
// ==                            RUN Server                                == //
// ========================================================================== //
var serv = app.listen(8080);

// ========================================================================== //
// ==                            Socket.IO                                 == //
// ==  http://socket.io/docs/                                              == //
// ==  https://www.npmjs.com/package/express-socket.io-session             == //
// ========================================================================== //
io.use(sharedsession(session));

io.attach(serv);

var usernames = {};

io.on('connection', function (socket) {
	var userSession;
	console.log("[Socket.IO] New socket");
	socket.on('loggedOn', function () {
		console.log("loggedOn");
		console.log(socket.handshake.session);
	});
	if (socket.handshake.session.user)
	{
		userSession = socket.handshake.session.user;
		console.log(userSession);
		usernames[userSession.id] = {login: userSession.login, id: userSession.id};
		console.log("[Socket.IO] Connect " + userSession.login + ' [' + userSession.id + ']');
		if (userSession.login)
		{
			var query = 'UPDATE accounts SET last_conn = ? WHERE login = ?';
			conn.query(query, [new Date().getTime(), userSession.login], function(err, result) {});
		}
		if (!users[userSession.login])
			users[userSession.login] = {user: userSession.login, id: userSession.id, socket: socket, chat: []};
		else
		{
			users[userSession.login]['id'] = userSession.id;
			users[userSession.login]['socket'] = socket;
		}
		for (var i = 0; i < users[userSession.login]['chat'].length; i++) {
			socket.emit('msg', { to: users[userSession.login]['chat'][i]['to'], msg: users[userSession.login]['chat'][i]['msg']});
			if (users[users[userSession.login]['chat'][i]['to']]['socket'] != null)
			{
				socket.emit('isconnect', { name: users[userSession.login]['chat'][i]['to'], connect: 1});
				users[users[userSession.login]['chat'][i]['to']]['socket'].emit('isconnect', { name: userSession.login, connect: 1});
			}
			else
				socket.emit('isconnect', { name: users[userSession.login]['chat'][i]['to'], connect: 0});
		}
	}
	socket.on('disconnect', function () {
		if (userSession)
		{
			console.log("[Socket.IO] Disconnect " + userSession.login);
			users[userSession.login]['socket'] = null;
			for (var i = 0; i < users[userSession.login]['chat'].length; i++) {
				if (users[users[userSession.login]['chat'][i]['to']]['socket'] != null)
					users[users[userSession.login]['chat'][i]['to']]['socket'].emit('isconnect', { name: userSession.login, connect: 0});
			}
		}
		userSession = null;
	});

	socket.on('msg', function (data) {
		if (!users[data['to']])
			users[data['to']] = {login: data['to'], id: null, socket: null, chat: []};
		Likes.areConnected(users[data['to']]['id'], userSession.id, conn, function(connect) {
			if (connect)
			{
				if (users[data['to']]['socket'] != null)
				{
					users[data['to']]['socket'].emit('msg', { to: userSession.login, msg: '<strong>' + userSession.login + ': </strong>' + entities.encode(data['msg'])});
					socket.emit('isconnect', { name: data['to'], connect: 1});
				}
				else
				{
					socket.emit('isconnect', { name: data['to'], connect: 0});
					Notification.addMessage(userSession.login, data['to'], entities.encode(data['msg']), conn, function(ret) {
					});
				}

				socket.emit('msg', { to: data['to'], msg: '<strong>You: </strong>' + entities.encode(data['msg'])});
				users[data['to']]['chat'].push({ to: userSession.login, msg: '<strong>' + userSession.login + ': </strong>' + entities.encode(data['msg'])});
				users[userSession.login]['chat'].push({ to: data['to'], msg: '<strong>You: </strong>' + entities.encode(data['msg'])});
				if (users[data['to']]['chat'].length > 30)
					users[data['to']]['chat'].shift();
				if (users[userSession.login]['chat'].length > 30)
				 	users[userSession.login]['chat'].shift();
			}
		});
	});

	socket.on('addTag', function (data) {
		if (userSession)
		{
			Tags.addTag(userSession.id, data['tag'], entities, conn, function(ret) {
				console.log(ret);
			});
		}
	});

	socket.on('rmTag', function (data) {
		if (userSession)
		{
			Tags.deleteTag(userSession.id, data['tag'], entities, conn, function(ret) {
				console.log(ret);
			});
		}
	});

	socket.on('writeTag', function (data) {
		if (userSession)
		{
			Tags.getTagsByName(data['tag'], entities, conn, function(ret) {
				socket.emit('writeTag', ret);
			});
		}
	});

	socket.on('uploadImg', function (data) {
		if (userSession && data['id'] > 0 && data['id'] < 6)
		{
			var	name = userSession.login + "_" + data['id'] + ".png";
			var matches = data['data'].match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
			response = {};
			if (!matches || matches.length !== 3)
			{
				socket.emit('notify', { type: "error", msg: "No valid file!"});
			}
			else
			{
				response.type = matches[1];
				if (response.type.search("image") >= 0)
				{
					response.data = new Buffer(matches[2], 'base64');
					Fs.writeFile("public/gallery/" + name, response.data, 'base64', function(err) {
						console.log(err);
					});
					Pictures.addPicture(userSession.id, data['id'], name, conn, function(result) {
						console.log(result);
						userSession["image" + data['id']] = name;
						socket.emit('uploadImg', { id: data['id'], link: name});
					});
				}
				else
				{
					socket.emit('notify', { type: "error", msg: "No valid file!"});
				}
			}
		}
	});

	socket.on('deleteImg', function (data) {
		if (userSession && data['id'] > 0 && data['id'] < 6)
		{
			var	name = "public/gallery/" + userSession.login + "_" + data['id'] + ".png";
			Fs.unlink(name, function(err) {
				console.log(err);
			});
			Pictures.delPicture(userSession.id, data['id'], conn, function(result) {
				console.log(result);
				userSession["image" + data['id']] = null;
			});
		}
	});

	socket.on('like', function (data) {
		if (userSession)
		{
			console.log("[Socket.IO] " + userSession.login + " like or dislike " + data['id']);
			var toUserName;
			if (usernames[data['id']])
				toUserName = usernames[data['id']]['login'];
			Likes.isLiked(data['id'], userSession.id, conn, function(isLiked) {
				if (!isLiked)
					Likes.addLike(data['id'], userSession.id, conn, function(newScore) {
						if (newScore)
							userSession["score"] = newScore;
					});
				else
					Likes.deleteLike(data['id'], userSession.id, conn, function(newScore) {
						if (newScore)
							userSession["score"] = newScore;
					});
				Blacklist.isLocked(userSession.id, data['id'], conn, function(isBlocked) {
					if (!isBlocked)
					{
						Likes.isLiked(userSession.id, data['id'], conn, function(isLiking) {
							if (toUserName && users[toUserName] && users[toUserName]['socket'])
							{
								if (!isLiked && !isLiking)
									users[toUserName]['socket'].emit('notify', { type: "valide", msg: userSession.login + ", likes you"});
								else if (!isLiked && isLiking)
									users[toUserName]['socket'].emit('notify', { type: "valide", msg: userSession.login + ", likes you too (you are connected)"});
								else if (isLiked && !isLiking)
									users[toUserName]['socket'].emit('notify', { type: "error", msg: userSession.login + ", dislikes you"});
								else
									users[toUserName]['socket'].emit('notify', { type: "error", msg: userSession.login + ", dislikes you (you are disconnected)"});
							}
							else
							{
								if (!isLiked && !isLiking)
									Notification.addNotification(data['id'], userSession.login + ", likes you", "valide", conn, function(ret) {
									});
								else if (!isLiked && isLiking)
									Notification.addNotification(data['id'], userSession.login + ", likes you too (you are connected)", "valide", conn, function(ret) {
									});
								else if (isLiked && !isLiking)
									Notification.addNotification(data['id'], userSession.login + ", dislikes you", "error", conn, function(ret) {
									});
								else
									Notification.addNotification(data['id'], userSession.login + ", dislikes you (you are disconnected)", "error", conn, function(ret) {
									});
							}
						});
					}
				});
			});
		}
	});

	socket.on('searchSort', function (data) {
		if (userSession && data['users'].length)
		{
			console.log(data);
			Search.sortUsers(data['sort'], data['users'], function(ret) {
				socket.emit("searchSort", ret);
			});
		}
	});

	socket.on('homeSort', function (data) {
		if (userSession)
		{
			console.log(data);
			Search.getUsers(userSession, data, conn, function(users) {
				Search.sortUsers(data['sort'], users, function(ret) {
					socket.emit("homeSort", ret);
				});
			});
		}
	});

	socket.on('bloqueUser', function (data) {
		if (userSession)
		{
			console.log(data);
			if (data.type == "block")
			{
				Blacklist.isLocked(data['id'], userSession.id, conn, function(ret) {
					if (ret)
						Blacklist.delLock(data['id'], userSession.id, conn, function(ret) {});
					else
						Blacklist.addLock(data['id'], userSession.id, conn, function(ret) {});
				});
			}
			else if (data.type == "report")
			{
				Blacklist.isReported(data['id'], userSession.id, conn, function(ret) {
					if (ret)
						Blacklist.delReport(data['id'], userSession.id, conn, function(ret) {});
					else
						Blacklist.addReport(data['id'], userSession.id, conn, function(ret) {});
				});
			}
		}
	});

	socket.on('newVisit', function (data) {
		if (userSession)
		{
			console.log(data);
			var toUserName;
			if (usernames[data['id']])
				toUserName = usernames[data['id']]['login'];
			Blacklist.isLocked(userSession.id, data['id'], conn, function(isBlocked) {
				if (!isBlocked)
				{
					if (toUserName && users[toUserName] && users[toUserName]['socket'])
					{
						users[toUserName]['socket'].emit('notify', { type: "valide", msg: userSession.login + ", visited your profile"});
					}
					else
						Notification.addNotification(data['id'], userSession.login + ", visited your profile", "valide", conn, function(ret) {
						});
				}
			});
		}
	});
});
