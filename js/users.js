var distance = require('gps-distance');
var Likes = require('./likes.js');
var Blacklist = require('./blacklist.js');

var userExist = function(id, conn, callback) {
	var query = 'SELECT 1 '
				+ 'FROM accounts '
				+ 'WHERE id = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var	getUserById = function(id, conn, callback) {
	var query = 'SELECT id, login, firstname, lastname, age, gender, '
				+ 'search, bio, image1, image2, image3, '
				+ 'image4, image5, score, last_conn, city, longitude, latitude '
				+ 'FROM accounts '
				+ 'WHERE id = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result[0]);
			var user = JSON.parse(string);
			callback(user);
		}
		else
			callback(null);
	});
};

var	getUsersList = function(nb, sort, conn, callback) {
	var final = [];
	var query = 'SELECT id, login, firstname, lastname, age, gender, '
				+ 'search, bio, image1, image2, image3, '
				+ 'image4, image5, score, last_conn, city, longitude, latitude '
				+ 'FROM accounts ';
	if (sort)
		query += 'ORDER BY ' + sort;
	query += ' LIMIT ' + (nb && nb > 0 ? nb : 10);
	conn.query(query, function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
			var users = JSON.parse(string);
			var usersLeft = users.length;
			users.forEach(function(user)
			{
				final.push(user);
				if (--usersLeft == 0)
					callback(final);
			});
		}
		else
			callback(final);
	});
};

var addVisit = function(id_visited, id_visitor, conn, callback)
{
	var query = 'INSERT INTO visits (id_visited, id_visitor, nb) '
				+ 'VALUES (?, ?, 1) '
				+ 'ON DUPLICATE KEY UPDATE '
				+ 'nb = nb + 1';
	conn.query(query, [id_visited, id_visitor], function(err, result) {
		if (err)
			callback(false);
		else
			callback(true);
	});
};

var isVisited = function(id_visited, id_visitor, conn, callback)
{
	var query = 'SELECT 1 '
				+ 'FROM visits '
				+ 'WHERE id_visited = ? AND id_visitor = ?';
	conn.query(query, [id_visited, id_visitor], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var	getAllVisitors = function(myUser, conn, callback)
{
	var	final = [];
	var query = 'SELECT visits.nb AS visit_nb, accounts.id, accounts.login, accounts.firstname, accounts.lastname, accounts.age, accounts.gender, '
				+ 'accounts.search, accounts.bio, accounts.image1, accounts.image2, accounts.image3, '
				+ 'accounts.image4, accounts.image5, accounts.score, accounts.last_conn, accounts.city, accounts.longitude, accounts.latitude '
				+ 'FROM accounts '
				+ 'JOIN visits ON visits.id_visitor = accounts.id '
				+ 'WHERE visits.id_visited = ?';
	if (myUser.search != "bi")
		query += ' AND accounts.gender = ?';
	conn.query(query, [myUser.id, myUser.search], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
	    	var users = JSON.parse(string);
			users.sort(function (a, b) {
				if (a.visit_nb > b.visit_nb)
					return -1;
				if (a.visit_nb < b.visit_nb)
					return 1;
				return 0;
			});
			var usersLeft = users.length;
			users.forEach(function(profile)
			{
				Likes.isLiked(profile.id, myUser.id, conn, function (liked) {
					Likes.areConnected(profile.id, myUser.id, conn, function (connected) {
						Blacklist.isReported(profile.id, myUser.id, conn, function (report) {
							Blacklist.isLocked(profile.id, myUser.id, conn, function (lock) {
								if (!lock)
								{
									var dist = distance(myUser.latitude, myUser.longitude, profile.latitude, profile.longitude);

									profile.liked = liked;
									profile.dist = dist;
									profile.connect = connected;
									profile.report = report;
									profile.lock = lock;
									final.push(profile);
								}
								if (--usersLeft == 0)
									callback(final);
							});
						});
					});
				});
			});
		}
		else
			callback(final);
	});
};

exports.addVisit = addVisit;
exports.isVisited = isVisited;
exports.getUserById = getUserById;
exports.getUsersList = getUsersList;
exports.userExist = userExist;
exports.getAllVisitors = getAllVisitors;
