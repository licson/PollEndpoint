var express = require('express');
var db = require('./db.js');
var conn = db.init();
var view = require('./view.js');
var app = express();
var http = require('http').createServer(app);
//var https = require('https').createServer(app);

//Unique ID generation
var genID = function(len){
	var ret = '';
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_-".split('');
	while(len--){
		ret += chars[~~(Math.random() * chars.length)];
	}
	
	return ret;
};

//Custom logger
app.use(function(req,res,next){
	console.log('Request page %s from %s',req.url,req.connection.remoteAddress);
	next();
});
app.use('/assets',express.static(__dirname+'/assets/'));
app.use(express.bodyParser());

app.get('/',function(req,res){
	conn.query('SELECT * FROM `polls` ORDER BY `created_at` DESC',function(err,data){
		if(err){
			res.send(view.error());
		}
		else {
			res.send(view.page('index',{polls:data}));
		}
	});
});

app.get('/thanks',function(req,res){
	res.send(view.page('thanks',{}));
});

app.get('/about',function(req,res){
	res.send(view.page('about',{}));
});

app.get('/question/:id',function(req,res){
	var meta;
	conn.query('SELECT * FROM `polls` WHERE `id` = ?',[req.params.id],function(err,info){
		if(err){
			res.send(view.error());
		}
		else {
			meta = info;
			conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `name` ASC',[req.params.id],function(err,data){
				if(err){
					res.send(view.error());
				}
				else {
					res.send(view.page('question',{
						id:req.params.id,
						meta:meta,
						questions:data
					}));
				}
			});
		}
	});
});

app.post('/question/:id/submit',function(req,res){
	var success = true;
	for(var q in req.body){
		var data = {
			question_id:q,
			poll_id:req.params.id,
			id:genID(40),
			value:typeof req.body[q] !== "string" ? req.body[q].join(',') : req.body[q]
		};
		conn.query('INSERT INTO `answers` SET ?',data,function(err){
			if(err){
				success = false;
			}
		});
	}
	
	res.json({success:success});
});

app.get('/create',function(req,res){
	res.end(view.page('create',{}));
});

app.post('/create/save/basic_info',function(req,res){
	var data = req.body;
	data.id = genID(25);
	if(!(data.name == '' || data.desc == '' || data.keywords == '')){
		conn.query('INSERT INTO `polls` SET ?',data,function(err){
			if(!err){
				res.json({success:true,id:data.id});
			}
			else {
				res.json({success:false,message:'Database Error, please try later.'});
				console.log(err);
			}
		});
	}
	else {
		res.json({success:false,message:'All fields were required.'});
	}
});

app.post('/create/save/questions',function(req,res){
	var success = true;
	for(var i = 0; i < req.body.questions.belongs.length; i++){
		var q = {
			belongs:req.body.questions.belongs[i],
			name:req.body.questions.name[i],
			type:req.body.questions.type[i],
			choices:req.body.questions.choices[i],
			required:req.body.questions.required[i],
			id:genID(40)
		};
		conn.query('INSERT INTO `questions` SET ?',q,function(err){
			if(err){
				success = false
			}
		});
	}
	var message = {success:success};
	if(!success){
		message.message = "Database error, please try again later.";
	}
	res.json(message);
});

app.get('/stats/:id',function(req,res){
	var id = req.params.id;
	conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `name` ASC',[req.params.id],function(err,questions){
		if(err){
			res.send(view.error());
		}
		else {
			conn.query('SELECT count(*) AS `count` FROM `answers` WHERE `poll_id` = ?',[id],function(err,data){
				if(err){
					res.send(view.error());
				}
				else {
					var t_count = typeof data[0] == "undefined" ? 0 : data[0].count;
					conn.query('SELECT count(*) AS `count` FROM (SELECT DISTINCT `poll_id`, `question_id` FROM `answers`) AS q WHERE q.`poll_id` = ? GROUP BY q.`poll_id`',[id],function(err,data){
						if(err){
							res.send(view.error());
						}
						else {
							var q_count = typeof data[0] == "undefined" ? 1 : data[0].count;
							conn.query('SELECT * FROM `polls` WHERE `id` = ?',[id],function(err,meta){
								if(err){
									res.send(view.error());
								}
								else {
									res.send(view.page('stats',{
										count:{
											users:t_count/q_count,
											total:t_count
										},
										meta:meta[0],
										id:id,
										questions:questions
									}));
								}
							});
						}
					});
				}
			});
		}
	});
});

app.get('/stats/:id/time',function(req,res){
	conn.query('SELECT count(*) AS `count` FROM (SELECT DISTINCT `poll_id`, `question_id` FROM `answers`) AS q WHERE q.`poll_id` = ? GROUP BY q.`poll_id`',[req.params.id],function(err,data){
		var q_count = typeof data[0] == "undefined" ? 1 : data[0].count;
		conn.query('SELECT COUNT(*) AS `count`, `date` FROM `answers` WHERE `poll_id` = ? GROUP BY `date` ORDER BY `date` ASC',[req.params.id],function(err,data){
			var intital_date = null;
			var _return = [];
			var _return_i = 0;
			for(var i = 0; i < data.length; i++){
				data[i].date.setHours(0);
				data[i].date.setSeconds(0);
				if(intital_date == null || (data[i].date.getFullYear() !== intital_date.getFullYear() || data[i].date.getMonth() !== intital_date.getMonth() || data[i].date.getDate() !== intital_date.getDate())){
					_return.push([data[i].date.getTime(),data[i].count/q_count]);
					_return_i = _return.length == 1 ? 0 : _return_i+1;
				}
				else {
					_return[_return_i][1] += (data[i].count/q_count);
				}
				intital_date = data[i].date;
			}
			res.json(_return);
		});
	});
});

app.get('/stats/question/:id',function(req,res){
	conn.query('SELECT `type` FROM `questions` WHERE `id` = ?',[req.params.id],function(err,type){
		conn.query('SELECT COUNT(*) AS `count`, `value` FROM `answers` WHERE `question_id` = ? GROUP BY `value` ORDER BY `value` ASC',[req.params.id],function(err,data){
			switch(type[0].type){
				case 'mc':
				//MC questions, send the data to the client
				var _data = [];
				for(var i = 0; i < data.length; i++){
					_data.push({data:[[0,data[i].count]],label:data[i].value});
				}
				res.json(_data);
				break;
				
				case 'mmc':
				//Multiple answers, show a table listing all choices
				conn.query('SELECT COUNT(*) AS `count`, `value` FROM `answers` WHERE `question_id` = ? GROUP BY `value` ORDER BY `value` ASC',[req.params.id],function(err,data){
					res.json({
						html:view.page('ques_dialog',{
							data:data,
							type:type[0].type
						})
					});
				});
				break;
				
				case 'fillin':
				conn.query('SELECT `value` FROM `answers` WHERE `question_id` = ? LIMIT 0,30',[req.params.id],function(err,data){
					res.json({
						html:view.page('ques_dialog',{
							data:data,
							type:type[0].type,
							id:req.params.id
						})
					});
				});
				break;
				
				default:
				res.json({});
				break;
			}
		});
	});
});

app.get('/stats/question/:id/search',function(req,res){
	conn.query('SELECT `type` FROM `questions` WHERE `id` = ?',[req.params.id],function(err,type){
		if(!type[0] || type[0].type !== 'fillin'){
			res.json({success:false});
			return;
		}
		conn.query('SELECT * FROM `answers` WHERE `question_id` = ? AND `value` LIKE \'%'+db.escape(req.query.q).replace(/^'|'$/g,'')+'%\'',[req.params.id],function(err,data){
			if(err){
				console.log(err);
			}
			else {
				res.json(data);
			}
		});
	});
});

http.listen(process.env.PORT||8000);
//https.listen(443);
console.log('Server listening at port %s',process.env.PORT||8000);