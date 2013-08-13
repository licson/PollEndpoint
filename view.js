/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

/*
* This is the EJS view engine adaptor
*/

var ejs = require('ejs');
var fs = require('fs');

var supportedLangs = ['en', 'zh-tw'];

module.exports = {
	page: function(name, opts, lang){
		lang = String(lang);
		if(supportedLangs.indexOf(lang.toLowerCase()) < 0) lang = supportedLangs[0];
		return ejs.render(fs.readFileSync(__dirname + '/view/' + lang + '/' + name + '.html','utf-8'),opts);
	},
	error: function(err, lang){
		lang = String(lang);
		if(supportedLangs.indexOf(lang.toLowerCase()) < 0) lang = supportedLangs[0];
		return ejs.render(fs.readFileSync(__dirname + '/view/' + lang + '/error.html','utf-8'),{err:err});
	}
}