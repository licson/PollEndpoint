var express = require('express');
var conn = require('./db.js').init();
var view = require('./view.js');
var app = express();
var http = require('http').createServer(app);
//var https = require('https').createServer(app);

var genID = function(len){
	var ret = '';
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_-".split('');
	while(len--){
		ret += chars[~~(Math.random() * chars.length)];
	}
	
	return ret;
};

app.use(express.logger());
app.use(express.static(__dirname));
app.use(express.bodyParser());

app.get('/',function(req,res){
	conn.query('SELECT * FROM `polls` ORDER BY `created_at` DESC OFFSET 0,5',function(err,data){
		res.end(view.page('index',{polls:data}));
	});
});

app.get('/question/:id',function(req,res){
	conn.query('SELECT * FROM `polls` WHERE `id` = ?',req.params.id,function(err,meta){
		conn.query('SELECT * FROM `questions` WHERE `belongs` = ?',req.params.id,function(err,data){
			res.end(view.page('question',{
				id:req.params.id,
				info:meta,
				questions:data
			}));
		});
	});
});

app.post('/question/:id/submit',function(req,res){
	for(var q in req.body){
		var data = {
			question_id:req.params.id,
			poll_id:q,
			id:genID(40),
			value:typeof req.body[q] !== "string" ? req.body[q].join(',') : req.body[q]
		};
		conn.query('INSERT INTO `answers` SET ?',data,function(err){
			if(err){
				res.end(JSON.stringify({success:false}));
			}
		});
	}
	
	try{
		res.end(JSON.stringify({success:true}));
	}
	catch(e){}
});

app.get('/create',function(req,res){
	res.end(view.page('create',{}));
});

app.post('/create/save/basic_info',function(req,res){
	res.writeHead(200,{'Content-type':'application/json'});
	var data = req.body;
	data.id = genID(25);
	conn.query('INSERT INTO `polls` SET ?',data,function(err){
		if(!err){
			conn.query('SELECT id FROM `polls` WHERE `name` = ? AND `desc` = ? AND `keywords` = ?',[data.name,data.desc,data.keywords],function(err,data){
				if(!err){
					res.end(JSON.stringify({success:true,id:data.id}));
				}
				else {
					res.end(JSON.stringify({success:false}));
				}
			});
		}
		else {
			res.end(JSON.stringify({success:false}));
		}
	});
});

http.listen(process.env.PORT||8000);
//https.listen(443);
console.log('Server listening at port %s',process.env.PORT||8000);