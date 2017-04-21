var Users = require('./users.js');

var isReported = function(id_reported, id_reporter, conn, callback)
{
	var query = 'SELECT 1 '
				+ 'FROM reports '
				+ 'WHERE id_reported = ? AND id_reporter = ?';
	conn.query(query, [id_reported, id_reporter], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var isLocked = function(id_locked, id_locker, conn, callback)
{
	var query = 'SELECT 1 '
				+ 'FROM locks '
				+ 'WHERE id_locked = ? AND id_locker = ?';
	conn.query(query, [id_locked, id_locker], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};


var addReport = function(id_reported, id_reporter, conn, callback)
{
	Users.userExist(id_reported, conn, function(ret) {
		if (ret)
			isReported(id_reported, id_reporter, conn, function (ret) {
				if (!ret)
				{
					var query = 'INSERT INTO reports (id_reported, id_reporter) VALUES (?, ?)';
					conn.query(query, [id_reported, id_reporter], function(err, result) {
						if (!err && result.affectedRows > 0)
							callback(1);
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

var delReport = function(id_reported, id_reporter, conn, callback)
{
	Users.userExist(id_reported, conn, function (ret) {
		if (ret)
			isReported(id_reported, id_reporter, conn, function (ret) {
				if (ret)
				{
					var query = 'DELETE FROM reports WHERE id_reported = ? AND id_reporter = ?';
					conn.query(query, [id_reported, id_reporter], function(err, result) {
						if (!err && result.affectedRows > 0)
							callback(1);
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

var addLock = function(id_locked, id_locker, conn, callback)
{
	Users.userExist(id_locked, conn, function(ret) {
		if (ret)
			isLocked(id_locked, id_locker, conn, function (ret) {
				if (!ret)
				{
					var query = 'INSERT INTO locks (id_locked, id_locker) VALUES (?, ?)';
					conn.query(query, [id_locked, id_locker], function(err, result) {
						if (!err && result.affectedRows > 0)
							callback(1);
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

var delLock = function(id_locked, id_locker, conn, callback)
{
	Users.userExist(id_locked, conn, function (ret) {
		if (ret)
			isLocked(id_locked, id_locker, conn, function (ret) {
				if (ret)
				{
					var query = 'DELETE FROM locks WHERE id_locked = ? AND id_locker = ?';
					conn.query(query, [id_locked, id_locker], function(err, result) {
						if (!err && result.affectedRows > 0)
							callback(1);
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

exports.addReport = addReport;
exports.delReport = delReport;
exports.addLock = addLock;
exports.delLock = delLock;
exports.isReported = isReported;
exports.isLocked = isLocked;
