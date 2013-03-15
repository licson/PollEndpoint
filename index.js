/*
* PollEndpoint © 2013 -
* Created By Licson Lee (licson0729@gmail.com)
*/

//Database stuff
var db = require('./db.js');
var sql = new db.driver();

//Express web server and related stuff
var express = require('express');
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
	sql.conn.query('SELECT * FROM `polls` ORDER BY `created_at` DESC',function(err,data){
		if(err){
			res.send(view.error(err));
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
	sql.conn.query('SELECT * FROM `polls` WHERE `id` = ?',[req.params.id],function(err,info){
		if(err){
			res.send(view.error(err));
		}
		else {
			meta = info;
			sql.conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `name` ASC',[req.params.id],function(err,data){
				if(err){
					res.send(view.error(err));
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
		sql.conn.query('INSERT INTO `answers` SET ?',data,function(err){
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
		sql.conn.query('INSERT INTO `polls` SET ?',data,function(err){
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
		sql.conn.query('INSERT INTO `questions` SET ?',q,function(err){
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
	sql.conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `name` ASC',[req.params.id],function(err,questions){
		if(err){
			res.send(view.error(err));
		}
		else {
			sql.conn.query('SELECT count(*) AS `count` FROM `answers` WHERE `poll_id` = ?',[id],function(err,data){
				if(err){
					res.send(view.error(err));
				}
				else {
					var t_count = typeof data[0] == "undefined" ? 0 : data[0].count;
					sql.conn.query('SELECT count(*) AS `count` FROM (SELECT DISTINCT `poll_id`, `question_id` FROM `answers`) AS q WHERE q.`poll_id` = ? GROUP BY q.`poll_id`',[id],function(err,data){
						if(err){
							res.send(view.error(err));
						}
						else {
							var q_count = typeof data[0] == "undefined" ? 1 : data[0].count;
							sql.conn.query('SELECT * FROM `polls` WHERE `id` = ?',[id],function(err,meta){
								if(err){
									res.send(view.error(err));
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
	sql.conn.query('SELECT count(*) AS `count` FROM (SELECT DISTINCT `poll_id`, `question_id` FROM `answers`) AS q WHERE q.`poll_id` = ? GROUP BY q.`poll_id`',[req.params.id],function(err,data){
		var q_count = typeof data[0] == "undefined" ? 1 : data[0].count;
		sql.conn.query('SELECT COUNT(*) AS `count`, `date` FROM `answers` WHERE `poll_id` = ? GROUP BY `date` ORDER BY `date` ASC',[req.params.id],function(err,data){
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
	sql.conn.query('SELECT `type` FROM `questions` WHERE `id` = ?',[req.params.id],function(err,type){
		sql.conn.query('SELECT COUNT(*) AS `count`, `value` FROM `answers` WHERE `question_id` = ? GROUP BY `value` ORDER BY `value` ASC',[req.params.id],function(err,data){
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
				sql.conn.query('SELECT COUNT(*) AS `count`, `value` FROM `answers` WHERE `question_id` = ? GROUP BY `value` ORDER BY `value` ASC',[req.params.id],function(err,data){
					res.json({
						html:view.page('ques_dialog',{
							data:data,
							type:type[0].type
						})
					});
				});
				break;
				
				case 'fillin':
				sql.conn.query('SELECT `value` FROM `answers` WHERE `question_id` = ? LIMIT 0,30',[req.params.id],function(err,data){
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
	sql.conn.query('SELECT `type` FROM `questions` WHERE `id` = ?',[req.params.id],function(err,type){
		if(!type[0] || type[0].type !== 'fillin'){
			res.json({success:false});
			return;
		}
		sql.conn.query('SELECT * FROM `answers` WHERE `question_id` = ? AND `value` LIKE \'%'+db.escape(req.query.q).replace(/^'|'$/g,'')+'%\'',[req.params.id],function(err,data){
			if(err){
				console.log(err);
			}
			else {
				res.json(data);
			}
		});
	});
});

http.listen(process.env.OPENSHIFT_INTERNAL_PORT||(process.env.VMC_APP_PORT||8000),process.env.OPENSHIFT_INTERNAL_IP||'127.0.0.1');
//https.listen(443);
console.log('Server listening at port %s',process.env.OPENSHIFT_INTERNAL_PORT||8000);