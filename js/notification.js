var	isNotified = function(id, message, conn, callback)
{
	var query = 'SELECT 1 '
				+ 'FROM notifications '
				+ 'WHERE id_user = ? AND message = ?';
	conn.query(query, [id, message], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var addNotification = function(id, message, type, conn, callback)
{
	isNotified(id, message, conn, function(ret) {
		if (!ret)
		{
			var query = 'INSERT INTO notifications (id_user, message, type) VALUES (?, ?, ?)';
			conn.query(query, [id, message, type], function(err, result) {
				if (!err && result.affectedRows > 0)
					callback(1);
				else
					callback(0);
			});
		}
	});
};

var getNotifications = function(id, conn, callback)
{
	var query = 'SELECT * '
				+ 'FROM notifications '
				+ 'WHERE id_user = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
			var notifications = JSON.parse(string);
			var query = 'DELETE FROM notifications WHERE id_user = ?';
			conn.query(query, [id], function(err, result) {
				callback(notifications);
			});
		}
		else
			callback(false);
	});
};

var addMessage = function(sender, receiver, message, conn, callback)
{
	var message = entities.encode(message);
	var query = 'INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)';
	conn.query(query, [sender, receiver, message], function(err, result) {
		if (!err && result.affectedRows > 0)
			callback(1);
		else
			callback(0);
	});
};

var getMessages = function(login, conn, callback)
{
	var query = 'SELECT sender, receiver, message '
				+ 'FROM messages '
				+ 'WHERE receiver = ?';
	conn.query(query, [login], function(err, result) {
		if (!err && result.length > 0)
		{
			var string = JSON.stringify(result);
			var messages = JSON.parse(string);
			var query = 'DELETE FROM messages WHERE receiver = ?';
			conn.query(query, [id], function(err, result) {
				callback(messages);
			});
		}
		else
			callback(false);
	});
};

exports.addNotification = addNotification;
exports.getNotifications = getNotifications;
exports.addMessage = addMessage;
exports.getMessages = getMessages;
