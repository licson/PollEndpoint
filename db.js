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
			console.log(err);
		}
		
		console.log('Re-connecting lost connection: ' + err.stack);
		
		conn = reconnect(conn);
		handleDisconnect(conn);
	});
};

//Function to do the reconnection
function reconnect(old){
	var conn = mysql.createConnection({
		host:process.env.OPENSHIFT_MYSQL_DB_HOST,
		port:process.env.OPENSHIFT_MYSQL_DB_PORT,
		user:process.env.OPENSHIFT_MYSQL_DB_USERNAME,
		password:process.env.OPENSHIFT_MYSQL_DB_PASSWORD,
		database:'pollendpoint'
	});
	conn.connect(function(){
		console.log('Successfully connected to MySQL database.');
	});
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
			database:'pollendpoint',
			multipleStatements:true
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
	});
	handleDisconnect(this.conn);
	
	//Reconnect every 30 minutes to wake the server up
	setInterval(function(){
		self.conn.end(function(){
			console.log('Reconnecting...');
			self.conn = reconnect(self.conn);
		});
	},20*60*1000);
};

module.exports = {driver:db,escape:mysql.escape};