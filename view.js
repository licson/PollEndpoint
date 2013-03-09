var ejs = require('ejs');
var fs = require('fs');

module.exports = {
	page:function(name,opts){
		return ejs.render(fs.readFileSync(__dirname + '/view/' + name,'utf-8'),opts);
	},
	error:function(){
		return ejs.render(fs.readFileSync(__dirname + '/view/error','utf-8'),{});
	}
}