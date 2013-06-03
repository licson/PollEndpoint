/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*
* This file is for background processing such as checking the database for irregular records.
*/

var sql = new (require('./db.js').driver)();
var escapeSQL = require('./db.js').escape;
var async = require('async');
var time_elasped = 0;

//The list of jobs
var jobs = {};

jobs.check_invalid_polls = function(){
	sql.conn.query('SELECT p.`id` FROM `polls` INNER JOIN (SELECT COUNT(*) AS `count`, `belongs` FROM `questions` WHERE `count` == 0 GROUP BY `belongs`) AS q ON q.`belongs` = p.`id`',function(err,result){
		if(err){
			console.log(err);
			return;
		}
		async.map(result.map(function(item){
			return "DELETE FROM `polls` WHERE `id` = " + escapeSQL(item.id);
		}),sql.conn.query.bind(sql.conn),function(e){
			console.log(e);
		});
	});
};
jobs.check_invalid_polls.interval = 3600;

var start = function(){
	setInterval(function(){
		for(var i in jobs){
			var job = jobs[i];
			var interval = job.interval;
			if(time_elasped % interval === 0){
				job();
			}
		}
		time_elasped += 10;
	},10000);
}

module.exports = {
	start:start
}