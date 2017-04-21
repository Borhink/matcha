var mysql = require('mysql');
var dbname = 'qhonore_matcha';

var conn = mysql.createConnection({
  host     : 'mysql-qhonore.alwaysdata.net',
  user     : 'qhonore',
  password : 'rush00'
});

conn.connect(function(err){
	if(!err)
	{
		conn.query('CREATE DATABASE ' + dbname, function(err, result) {
			if (!err)
				console.log('Database created ...');
			else
				console.error('Database creation error ...\n', err);
		});

		conn.end();
		conn = mysql.createConnection({
		  host     : 'mysql-qhonore.alwaysdata.net',
		  user     : 'qhonore',
		  password : 'rush00',
		  database : dbname
		});
		conn.connect(function(err){
			if(!err)
			{
				var query = 'CREATE TABLE accounts (\
							id int NOT NULL AUTO_INCREMENT PRIMARY KEY,\
							login varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							passwd varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							mail varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							firstname varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							lastname varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							age bigint(14) NOT NULL,\
							gender enum("male", "female") NOT NULL DEFAULT "male",\
							search enum("male", "female", "bi") NOT NULL DEFAULT "bi",\
							bio text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							image1 varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							image2 varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							image3 varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							image4 varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							image5 varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,\
							score tinyint(3) DEFAULT 0,\
							last_conn bigint(14) NOT NULL,\
							city varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
							longitude decimal(10,6) DEFAULT 0,\
							latitude decimal(10,6) DEFAULT 0)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table accounts created ...');
					else
						console.error('Table accounts creation error ...\n', err);
				});
				query = 'CREATE TABLE likes (\
						id_liked int NOT NULL,\
						id_liker int NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table likes created ...');
					else
						console.error('Table likes creation error ...\n', err);
				});
				query = 'CREATE TABLE visits (\
						id_visited int NOT NULL,\
						id_visitor int NOT NULL,\
						nb int NOT NULL DEFAULT 1,\
						PRIMARY KEY (id_visited, id_visitor))';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table visits created ...');
					else
						console.error('Table visits creation error ...\n', err);
				});
				query = 'CREATE TABLE interests (\
						id_user int NOT NULL,\
						name varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table interests created ...');
					else
						console.error('Table interests creation error ...\n', err);
				});
				query = 'CREATE TABLE locks (\
						id_locked int NOT NULL,\
						id_locker int NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table locks created ...');
					else
						console.error('Table locks creation error ...\n', err);
				});
				query = 'CREATE TABLE reports (\
						id_reported int NOT NULL,\
						id_reporter int NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table reports created ...');
					else
						console.error('Table reports creation error ...\n', err);
				});
				query = 'CREATE TABLE messages (\
						id int NOT NULL AUTO_INCREMENT PRIMARY KEY,\
						sender varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
						receiver varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
						message text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table messages created ...');
					else
						console.error('Table messages creation error ...\n', err);
				});
				query = 'CREATE TABLE notifications (\
						id_user int NOT NULL,\
						message varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,\
						type varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL)';
				conn.query(query, function(err, result) {
					if (!err)
						console.log('Table notifications created ...');
					else
						console.error('Table notifications creation error ...\n', err);
				});
				conn.end();
			}
		});
	}
	else
	    console.error("Error connecting database ...\n", err);
});
