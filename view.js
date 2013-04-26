/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

/*
* This is the EJS view engine adaptor
*/

var ejs = require('ejs');
var fs = require('fs');

module.exports = {
	page:function(name,opts){
		return ejs.render(fs.readFileSync(__dirname + '/view/' + name + '.html','utf-8'),opts);
	},
	error:function(err){
		return ejs.render(fs.readFileSync(__dirname + '/view/error.html','utf-8'),{err:err});
	}
}