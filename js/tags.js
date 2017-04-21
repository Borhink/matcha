var Likes = require('./likes.js');
var Blacklist = require('./blacklist.js');
var distance = require('gps-distance');

var getTagsById = function(id, conn, callback)// RETURN all tags FOR a user's id
{
	var query = 'SELECT name '
				+ 'FROM interests '
				+ 'WHERE id_user = ?';
	conn.query(query, [id], function(err, result) {
		if (!err && result.length > 0)
		{
	        var string = JSON.stringify(result);
	        var tags = JSON.parse(string);
			callback(tags);
		}
		else
			callback(null);
	});
};

var getTagsByName = function(tag, entities, conn, callback)// RETURN all tags FOR a tag's pattern
{
	tag = entities.encode(tag.toLowerCase()) + '%';
	var query = 'SELECT DISTINCT name '
				+ 'FROM interests '
				+ 'WHERE name LIKE ?'
				+ 'ORDER BY LENGTH(name) AND name';
	conn.query(query, [tag], function(err, result) {
		if (!err && result.length > 0)
		{
	        var string = JSON.stringify(result);
	        var tags = JSON.parse(string);
			callback(tags);
		}
		else
			callback(null);
	});
};

var getMatchsByTag = function(tag, conn, callback)// RETURN all matched profiles FOR a tag
{
	var profiles = [];
	var query = 'SELECT accounts.id, accounts.login, accounts.firstname, accounts.lastname, accounts.age, accounts.gender, '
				+ 'accounts.search, accounts.bio, accounts.image1, accounts.image2, accounts.image3, '
				+ 'accounts.image4, accounts.image5, accounts.score, accounts.last_conn, accounts.city, accounts.longitude, accounts.latitude '
				+ 'FROM accounts '
				+ 'JOIN interests ON interests.id_user = accounts.id '
				+ 'WHERE interests.name = ?';
	conn.query(query, [tag], function(err, result) {
		if (!err && result.length > 0)
		{
	        var string = JSON.stringify(result);
	        profiles = JSON.parse(string);
			callback(profiles);
		}
		else
			callback(profiles);
	});
};

var	isSet = function(id, tag, conn, callback)// RETURN if a tag already exist FOR an user
{
	var query = 'SELECT name '
				+ 'FROM interests '
				+ 'WHERE id_user = ? AND name = ?';
	conn.query(query, [id, tag], function(err, result) {
		if (!err && result.length > 0)
			callback(true);
		else
			callback(false);
	});
};

var getMatchsById = function(myUser, conn, callback)// RETURN all matched profils SORT BY match number FOR all profile's tags
{
	var matchs = [];

	getTagsById(myUser.id, conn, function(tags) {
		if (tags)
		{
			var tagsLeft = tags.length;
			tags.forEach(function(tag)
			{
				getMatchsByTag(tag.name, conn, function(profiles) {
					if (profiles)
					{
						var profilesLeft = profiles.length;
						profiles.forEach(function(profile)
						{
							var liked = 0;
							Likes.isLiked(profile.id, myUser.id, conn, function (liked) {
								Likes.areConnected(profile.id, myUser.id, conn, function (connected) {
									Blacklist.isReported(profile.id, myUser.id, conn, function (report) {
										Blacklist.isLocked(profile.id, myUser.id, conn, function (lock) {
											Likes.isLiked(myUser.id, profile.id, conn, function (likeMe) {
												if (!lock && profile.id != myUser.id && (myUser.search == "bi" || myUser.search == profile.gender))
												{
													if(matchs.hasOwnProperty(profile.login))
														matchs[profile.login].matchs++;
													else
													{
														var dist = distance(myUser.latitude, myUser.longitude, profile.latitude, profile.longitude);

														matchs[profile.login] = profile;
														matchs[profile.login].matchs = 1;
														matchs[profile.login].liked = liked;
														matchs[profile.login].dist = dist;
														matchs[profile.login].connect = connected;
														matchs[profile.login].report = report;
														matchs[profile.login].lock = lock;
														matchs[profile.login].likeMe = likeMe;
													}
												}
												--profilesLeft;
												if (profilesLeft == 0)
													--tagsLeft;
												if (!profilesLeft && !tagsLeft)
												{
													var final = [];
													for (var key in matchs)
														final.push(matchs[key]);
													final.sort(function (a, b) {
													    if (a.matchs > b.matchs)
															return -1;
														if (a.matchs < b.matchs)
															return 1;
														return 0;
													});
													callback(final);
												}
											});
										});
									});
								});
							});
						});
					}
				});
			});
		}
		else
			callback(matchs);
	});
};

var addTag = function(id, tag, entities, conn, callback)// ADD a tag FOR user's id entered
{
	tag = entities.encode(tag.toLowerCase());
	isSet(id, tag, conn, function(ret) {
		if (!ret)
		{
			var query = 'INSERT INTO interests (id_user, name) VALUES (?, ?)';
			conn.query(query, [id, tag], function(err, result) {
				if (!err && result.affectedRows > 0)
					callback(result.affectedRows);
				else
					callback(0);
			});
		}
		else
			callback(0);
	});
};

var deleteTag = function(id, tag, entities, conn, callback)// DELETE a tag FOR user's id entered
{
	tag = entities.encode(tag.toLowerCase());
	isSet(id, tag, conn, function(ret) {
		if (ret)
		{
			var query = 'DELETE FROM interests WHERE id_user = ? AND name = ?';
			conn.query(query, [id, tag], function(err, result) {
				if (!err && result.affectedRows > 0)
					callback(result.affectedRows);
				else
					callback(0);
			});
		}
		else
			callback(0);
	});
};

exports.getTagsById = getTagsById;
exports.getTagsByName = getTagsByName;
exports.getMatchsByTag = getMatchsByTag;
exports.getMatchsById = getMatchsById;
exports.addTag = addTag;
exports.deleteTag = deleteTag;
