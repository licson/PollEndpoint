var mysql = require('mysql');

module.exports = {
	init:function(){
		var conn = mysql.createConnection({
			host:'127.0.0.1',
			user:'root',
			password:'',
			db:'poll'
		});
		conn.connect(function(err){
			if(err) console.log('Error connecting to MySQL database',err);
		});
		return conn;
	}
};