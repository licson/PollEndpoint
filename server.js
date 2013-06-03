/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

/*
* This is the wrapper of the main service
*/

var cluster = require('cluster');
var cpus = require('os').cpus().length;
/*require('nodefly').profile(
	'd69c16e081a68dc81aa53d423133cf95',
	[process.env.OPENSHIFT_APP_NAME || 'local_development',
	 process.env.OPENSHIFT_APP_DNS  || 'localhost',
	 process.env.OPENSHIFT_GEAR_UUID || 1]
);
*/

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
	require('./background.js').start();
}