/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

/*
* This is the database server adaptor for MySQL
* Modify this file allows different database implantations to be used
*/

var mysql = require('mysql');

//Handle disconnect
function handleDisconnect(conn) {
	conn.on('error', function(err) {
		if (!err.fatal) {
			return;
		}
		
		if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
			throw err;
		}
		
		console.log('Re-connecting lost connection: ' + err.stack);
		
		conn = reconnect(conn);
		handleDisconnect(conn);
	});
};

//Function to do the reconnection
function reconnect(old){
	var conn = mysql.createConnection(old.config);
	conn.connect();
	return conn;
};

//Our database adapter
var db = function(){
	var self = this;
	
	//We're on our production server
	if(process.env.OPENSHIFT_MYSQL_DB_HOST && process.env.OPENSHIFT_MYSQL_DB_PORT){
		this.conn = mysql.createConnection({
			host:process.env.OPENSHIFT_MYSQL_DB_HOST,
			port:process.env.OPENSHIFT_MYSQL_DB_PORT,
			user:process.env.OPENSHIFT_MYSQL_DB_USERNAME,
			password:process.env.OPENSHIFT_MYSQL_DB_PASSWORD,
			database:'pollendpoint'
		});
	}
	else {
		//We're on a developememt machine
		this.conn = mysql.createConnection({
			host:'127.0.0.1',
			user:'root',
			password:'',
			database:'poll'
		});
	}
	
	//Attempt to connect
	this.conn.connect(function(err){
		if(err){
			console.log('Error connecting to MySQL database',err);
			if(err.fatal) process.exit();
		}
		else {
			console.log('Successfully connected to MySQL database.');
		}
		
		//Create the tables if not exists
		var noop = function(e){
			!e && console.log('Table creation succeed.');
		};
		self.conn.query('SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";',noop);
		self.conn.query('SET time_zone = "+00:00";',noop);
		self.conn.query('CREATE TABLE IF NOT EXISTS `answers` (`question_id` varchar(40) NOT NULL,`poll_id` varchar(25) NOT NULL,`id` varchar(40) NOT NULL,`value` text NOT NULL,`date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`),KEY `poll_id` (`poll_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',noop);
		self.conn.query('CREATE TABLE IF NOT EXISTS `polls` ( `id` varchar(25) NOT NULL, `name` varchar(100) NOT NULL, `desc` text, `keywords` varchar(200) DEFAULT NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;',noop);
		self.conn.query('CREATE TABLE IF NOT EXISTS `questions` ( `id` varchar(40) NOT NULL, `belongs` varchar(25) NOT NULL, `type` varchar(20) NOT NULL, `name` text NOT NULL, `choices` text, `required` tinyint(1) NOT NULL DEFAULT \'1\', PRIMARY KEY (`id`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;',noop);
		self.conn.query('CREATE TABLE IF NOT EXISTS `stats` (`poll_id` varchar(25) NOT NULL,`time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY `poll_id` (`poll_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;',noop);
	});
	handleDisconnect(this.conn);
	
	//Reconnect every 15 minutes to wake the server up
	setInterval(function(){
		self.conn.end(function(){
			console.log('Reconnecting...');
			self.conn = reconnect(self.conn);
		});
	},30*60*1000);
};

module.exports = {driver:db,escape:mysql.escape};