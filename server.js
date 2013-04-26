/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

/*
* This is the wrapper of the main service
*/

var cluster = require('cluster');
var cpus = require('os').cpus().length;

if(cluster.isMaster){
	console.log("Master initlizated, staring services.");
	console.log("%d CPUs have been detected.",cpus);
	for(;cpus--;) cluster.fork();
	cluster.on('death',function(worker){
		console.log("Worker #%d died, restart.",worker.pid);
		cluster.fork();
	})
}
else {
	require('./service.js').start();
}