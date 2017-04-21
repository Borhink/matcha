var addPicture = function(id, img_id, name, conn, callback)// ADD a tag FOR user's id entered
{
	var query = 'UPDATE accounts SET image' + img_id + ' = ? WHERE id = ?';
	conn.query(query, [name, id], function(err, result) {
		if (!err && result.affectedRows > 0)
			callback(result.affectedRows);
		else
			callback(0);
	});
};

var delPicture = function(id, img_id, conn, callback)// ADD a tag FOR user's id entered
{
	var query = 'UPDATE accounts SET image' + img_id + ' = NULL WHERE id = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.affectedRows > 0)
			callback(result.affectedRows);
		else
			callback(0);
	});
};

var swapPictures = function(id, imgId1, imgId2, conn, callback)// ADD a tag FOR user's id entered
{
	var name1 = 'image' + imgId1;
	var name2 = 'image' + imgId2;

	var query = 'UPDATE accounts SET '
				+ name1 + ' = (@temp:=' + name1 + '), '
				+ name1 + ' = ' + name2 + ', '
				+ name2 + ' = @temp '
				+ 'WHERE id = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.affectedRows > 0)
			callback(result.affectedRows);
		else
			callback(0);
	});
};

exports.addPicture = addPicture;
exports.delPicture = delPicture;
exports.swapPictures = swapPictures;
