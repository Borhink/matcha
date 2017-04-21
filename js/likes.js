var Users = require('./users.js');
var Blacklist = require('./blacklist.js');
var distance = require('gps-distance');

var isLiked = function(id_liked, id_liker, conn, callback)
{
	var query = 'SELECT 1 '
				+ 'FROM likes '
				+ 'WHERE id_liked = ? AND id_liker = ?';
	conn.query(query, [id_liked, id_liker], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var updateScore = function(id_user, conn, callback)
{
	var query = 'UPDATE accounts '
				+ 'SET score = ('
				+ 'SELECT (COUNT(1) * 200) / '
				+ '(10 + (SELECT COUNT(1) FROM likes WHERE id_liker = ?)) AS SCORE '
				+ 'FROM likes WHERE id_liked = ?)'
				+ 'WHERE id = ?';
	conn.query(query, [id_user, id_user, id_user], function(err, result) {
		if (!err)
		{
			var query = 'SELECT score FROM accounts WHERE id = ?';
			conn.query(query, [id_user], function(err, newScore) {
					callback(newScore);
			});
		}
		else
			callback(0);
	});
};

var addLike = function(id_liked, id_liker, conn, callback)
{
	Users.userExist(id_liked, conn, function(ret) {
		if (ret)
			isLiked(id_liked, id_liker, conn, function (ret) {
				if (!ret)
				{
					var query = 'INSERT INTO likes (id_liked, id_liker) VALUES (?, ?)';
					conn.query(query, [id_liked, id_liker], function(err, result) {
						if (!err && result.affectedRows > 0)
						{
							updateScore(id_liked, conn, function (ret) {
								updateScore(id_liker, conn, function (score) {
									callback(score);
								});
							});
						}
						else
							callback(0);
					});
				}
				else
					callback(0);
			});
		else
			callback(0);
	});
};

var deleteLike = function(id_liked, id_liker, conn, callback)
{
	Users.userExist(id_liked, conn, function (ret) {
		if (ret)
			isLiked(id_liked, id_liker, conn, function (ret) {
				if (ret)
				{
					var query = 'DELETE FROM likes WHERE id_liked = ? AND id_liker = ?';
					conn.query(query, [id_liked, id_liker], function(err, result) {
						if (!err && result.affectedRows > 0)
						{
							updateScore(id_liked, conn, function (ret) {
								updateScore(id_liker, conn, function (score) {
									callback(score);
								});
							});
						}
						else
							callback(0);
					});
				}
				else
					callback(0);
			});
		else
			callback(0);
	});
};

var	areConnected = function(id_user1, id_user2, conn, callback)
{
	isLiked(id_user1, id_user2, conn, function (ret) {
		if (ret)
			isLiked(id_user2, id_user1, conn, function (ret) {
				if (ret)
					callback(true);
				else
					callback(false);
			});
		else
			callback(false);
	});
};

var	getIdsLiked = function(id, conn, callback)// RETURN all liked users FOR user's id
{
	var query = 'SELECT id_liked '
				+ 'FROM likes '
				+ 'WHERE id_liker = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
	        var users = JSON.parse(string);
			callback(users);
		}
		else
			callback(false);
	});
};

var	getIdsLiker = function(id, conn, callback)// RETURN all likers FOR user's id
{
	var query = 'SELECT id_liker '
				+ 'FROM likes '
				+ 'WHERE id_liked = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
	        var users = JSON.parse(string);
			callback(users);
		}
		else
			callback(false);
	});
};

var	getAllLikersOf = function(myUser, conn, callback)
{
	var likers = [];

	getIdsLiker(myUser.id, conn, function(likes) {
		if (likes)
		{
			var likesLeft = likes.length;
			likes.forEach(function(like)
			{
				Users.getUserById(like.id_liker, conn, function(user) {
					isLiked(like.id_liker, myUser.id, conn, function (ret) {
						Blacklist.isReported(user.id, myUser.id, conn, function (report) {
							Blacklist.isLocked(user.id, myUser.id, conn, function (lock) {
								if (!lock && (myUser.search == "bi" || myUser.search == user.gender))
								{
									var dist = distance(myUser.latitude, myUser.longitude, user.latitude, user.longitude);

									user.dist = dist;
									user.liked = ret;
									user.connect = ret;
									likers.push(user);
								}
								if (--likesLeft == 0)
									callback(likers);
							});
						});
					});
				});
			});
		}
		else
			callback(likers);
	});
};

var	getAllLikedsBy = function(myUser, conn, callback)
{
	var likeds = [];

	getIdsLiked(myUser.id, conn, function(likes) {
		if (likes)
		{
			var likesLeft = likes.length;
			likes.forEach(function(like)
			{
				Users.getUserById(like.id_liked, conn, function(user) {
					areConnected(myUser.id, like.id_liked, conn, function(connected) {
						Blacklist.isReported(user.id, myUser.id, conn, function (report) {
							Blacklist.isLocked(user.id, myUser.id, conn, function (lock) {
								if (!lock && (myUser.search == "bi" || myUser.search == user.gender))
								{
									var dist = distance(myUser.latitude, myUser.longitude, user.latitude, user.longitude);

									user.dist = dist;
									user.liked = 1;
									user.connect = connected;
									user.report = report;
									user.lock = lock;
									likeds.push(user);
								}
								if (--likesLeft == 0)
									callback(likeds);
							});
						});
					});
				});
			});
		}
		else
			callback(likeds);
	});
};

var	getConnections = function(myUser, conn, callback)
{
	var connections = [];

	getIdsLiked(myUser.id, conn, function(likes) {
		if (likes)
		{
			var likesLeft = likes.length;
			likes.forEach(function(like)
			{
				areConnected(myUser.id, like.id_liked, conn, function(connected) {
					if (connected)
					{
						Users.getUserById(like.id_liked, conn, function(user) {
							Blacklist.isReported(user.id, myUser.id, conn, function (report) {
								Blacklist.isLocked(user.id, myUser.id, conn, function (lock) {
									if (!lock)
									{
										var dist = distance(myUser.latitude, myUser.longitude, user.latitude, user.longitude);

										user.dist = dist;
										user.liked = 1;
										user.connect = 1;
										user.report = report;
										user.lock = lock;
										connections.push(user);
									}
									if (--likesLeft == 0)
										callback(connections);
								});
							});
						});
					}
					else if (--likesLeft == 0)
						callback(connections);
				});
			});
		}
		else
			callback(connections);
	});
};

exports.isLiked = isLiked;
exports.addLike = addLike;
exports.deleteLike = deleteLike;
exports.areConnected = areConnected;
exports.getConnections = getConnections;
exports.getAllLikersOf = getAllLikersOf;
exports.getAllLikedsBy = getAllLikedsBy;
