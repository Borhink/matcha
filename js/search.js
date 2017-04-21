var Tags = require('./tags.js');
var distance = require('gps-distance');

var getAge = function(birth, date, callback) {
		var ydate = date.getFullYear();
		var mdate = date.getMonth();
		var ddate = date.getDate();
		var ybirth = birth.getFullYear();
		var mbirth = birth.getMonth();
		var dbirth = birth.getDate();
		var age = ydate - ybirth;
		if(mbirth > mdate) age--;
		else
		{
			if(mbirth == mdate)
			{
				if(dbirth > ddate) age--;
			}
		}
		callback(age);
};

var sortByPopularity = function(users, sort, callback) {
	if (sort && sort == "popularity")
	{
		users.sort(function (a, b) {
			if (a.score > b.score)
				return -1;
			if (a.score < b.score)
				return 1;
			return 0;
		});
	}
	callback(users);
};

var sortByAge = function(users, sort, callback) {
	if (sort && sort == "age")
	{
		users.sort(function (a, b) {
			if (a.age > b.age)
				return -1;
			if (a.age < b.age)
				return 1;
			return 0;
		});
	}
	callback(users);
};

var sortByTag = function(users, sort, callback) {
	if (sort && sort == "tag")
	{
		users.sort(function (a, b) {
			if (a.matchs > b.matchs)
				return -1;
			if (a.matchs < b.matchs)
				return 1;
			return 0;
		});
	}
	callback(users);
};

var sortByAffinity = function(users, sort, callback) {
	if (sort && sort == "affinity")
	{
		users.sort(function (a, b) {
			if (a.affinity > b.affinity)
				return -1;
			if (a.affinity < b.affinity)
				return 1;
			return 0;
		});
	}
	callback(users);
};

var sortByLocation = function(users, sort, callback) {
	if (sort && sort == "location")
	{
		users.sort(function (a, b) {
			if (a.dist < b.dist)
				return -1;
			if (a.dist > b.dist)
				return 1;
			return 0;
		});
	}
	callback(users);
};

var	filterByPopularity = function(popularity, users, callback) {
	if (popularity && popularity != "all" && users && users.length > 0 && !isNaN(parseInt(popularity)))
	{
		var value = parseInt(popularity);
		for (var i = 0; i < users.length; i++)
		{
			if (users[i].score < value)
				users.splice(i--, 1);
		}
	}
	callback(users);
};

var	filterByTag = function(tag, users, callback) {
	if (tag && tag != "all" && users && users.length > 0 && !isNaN(parseInt(tag)))
	{
		var value = parseInt(tag);
		for (var i = 0; i < users.length; i++)
		{
			if (users[i].matchs < value)
				users.splice(i--, 1);
		}
	}
	callback(users);
};

var	filterByAge = function(age, users, callback) {
	if (age && age != "all" && users && users.length > 0 && !isNaN(parseInt(age)))
	{
		var min;
		var max;

		if (age == "18-25")
		{
			min = 18;
			max = 25;
		}
		else if (age == "90-99")
		{
			min = 90;
			max = 99;
		}
		else
		{
			min = parseInt(age);
			max = min + 5;
		}
		for (var i = 0; i < users.length;)
		{
			getAge(new Date(users[i].age), new Date(), function(userAge) {
				if (userAge < min || userAge > max)
					users.splice(i--, 1);
				if (++i == users.length)
					callback(users);
			});
		}
	}
	else
		callback(users);
};

var	filterByLocation = function(location, users, callback) {
	if (location && location != "all" && users && users.length > 0)
	{
		if (location == "my")
			var value = 1;
		else if (location == "+500")
			var value = 0;
		else if (!isNaN(parseInt(location)))
			var value = parseInt(location);
		else
		{
			callback(users);
			return;
		}
		for (var i = 0; i < users.length; i++)
		{
			if (!value && users[i].dist < 500)
				users.splice(i--, 1);
			else if (value && users[i].dist > value)
				users.splice(i--, 1);
		}
	}
	callback(users);
};

var getUsers = function(user, data, conn, callback) {
	Tags.getMatchsById(user, conn, function(ret) {
		filterByPopularity(data.popularityInterval, ret, function(ret1) {
			filterByTag(data.tag, ret1, function(ret2) {
				filterByAge(data.ageInterval, ret2, function(ret3) {
					filterByLocation(data.loc, ret3, function(ret4) {
						callback(ret4);
					});
				});
			});
		});
	});
};

var getBestUsers = function(user, conn, callback) {
	var scale = 0;
	Tags.getMatchsById(user, conn, function(ret) {
		for (var i = 0; i < 10 && i < ret.length; i++)
		{
			ret[i].affinity = ret[i].affinity ? ret[i].affinity + (scale + 30 - i * 3) : scale + 30 - i * 3;
			if (i + 1 < ret.length && ret[i].matchs == ret[i + 1].matchs)
				scale += 3;
		}
		scale = 0;
		sortByPopularity(ret, "popularity", function(ret1) {
			for (var i = 0; i < 10 && i < ret1.length; i++)
			{
				ret1[i].affinity = ret1[i].affinity ? ret1[i].affinity + (scale + 10 - i) : scale + 10 - i;
				if (i + 1 < ret1.length && ret1[i].score == ret1[i + 1].score)
					scale++;
			}
			scale = 0;
			sortByLocation(ret1, "location", function(ret2) {
				for (var i = 0; i < 10 && i < ret2.length; i++)
				{
					ret2[i].affinity = ret2[i].affinity ? ret2[i].affinity + (scale + 20 - i * 2) : scale + 20 - i * 2;
					if (i + 1 < ret2.length && ret2[i].dist == ret2[i + 1].dist)
						scale += 2;
				}
				sortByAffinity(ret2, "affinity", function(ret3) {
					for (var i = 0; i < ret2.length; i++)
						ret2[i].affinity = ret2[i].affinity ? ret2[i].affinity * 100 / 60 : 0;
					callback(ret3);
				});
			});
		});
	});
};

var sortUsers = function(sort, users, callback) {
	sortByPopularity(users, sort, function(ret1) {
		sortByLocation(ret1, sort, function(ret2) {
			sortByAge(ret2, sort, function(ret3) {
				sortByTag(ret3, sort, function(ret4) {
					callback(ret4);
				});
			});
		});
	});
};

exports.getUsers = getUsers;
exports.getBestUsers = getBestUsers;
exports.sortUsers = sortUsers;
