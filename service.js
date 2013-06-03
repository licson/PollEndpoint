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

var async = require('async');

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
	console.log('Request page %s from %s',req.url,req.ip);
	next();
});
//static files and assets
app.use('/assets',express.static(__dirname+'/assets/'));
//help parsing form data
app.use(express.bodyParser());
//Trust the reverse proxy
app.enable('trust proxy');

//our index page
app.get('/',function(req,res){
	sql.conn.query('SELECT * FROM `polls` ORDER BY `created_at` DESC',function(err,latest){
		if(err){
			res.send(view.error(err));
		}
		else {
			sql.conn.query('SELECT p.`id`, p.`name`, p.`created_at` FROM `polls` AS p LEFT JOIN (SELECT COUNT(*) AS `count`, `poll_id`, `time` FROM `stats` GROUP BY `poll_id`) AS s ON p.`id` = s.`poll_id` ORDER BY s.`count` DESC LIMIT 0, 10',function(err,popular){
				if(err){
				}
				else {
				res.send(view.page('index',{
					polls:{
						latest:latest,
						popular:popular
					}
				}));
				}
			});
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
	var id = req.params.id;
	async.parallel({
		info:function(cb){
			sql.conn.query('SELECT * FROM `polls` WHERE `id` = ?',[id],function(err,info){
				cb(err,info);
			});
		},
		data:function(cb){
			sql.conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `time` ASC',[id],function(err,data){
				cb(err,data);
			});
		}
	},
	function(err,result){
		if(err){
			res.send(view.error(err));
		}
		else {
			if(result.data.length > 0){
				res.send(view.page('question',{
					id:id,
					meta:result.info,
					questions:result.data
				}));
			}
			else {
				res.send(view.error(new Error('The poll specified does not exists anymore.')));
			}
		}
	});
});

app.get('/widget/:id',function(req,res){
	var id = req.params.id;
	async.parallel({
		info:function(cb){
			sql.conn.query('SELECT * FROM `polls` WHERE `id` = ?',[id],function(err,info){
				cb(err,info);
			});
		},
		data:function(cb){
			sql.conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `time` ASC',[id],function(err,data){
				cb(err,data);
			});
		}
	},
	function(err,result){
		if(err){
			res.send(view.error(err));
		}
		else {
			if(result.data.length > 0){
				res.send(view.page('widget',{
					id:id,
					meta:result.info,
					questions:result.data
				}));
			}
			else {
				res.send(view.error(new Error('The poll specified does not exists anymore.')));
			}
		}
	});
});

app.get('/robots.txt',function(req,res){
	var lines = [
		'User-agent: *',
		'Disallow: /phpmyadmin/',
		'Disallow: /haproxy-status',
		'Sitemap: https://pollendpoint-licson.rhcloud.com/sitemap',
		'Crawl-delay: 0'
	].join("\n");
	res.send(lines);
});

app.get('/sitemap',function(req,res){
	sql.conn.query("SELECT `id` FROM `polls` LIMIT 0,100",function(err,data){
		if(!err){
			var sitemap = [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/</loc><changefreq>daily</changefreq><priority>1</priority></url>',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/about</loc><priority>0.8</priority></url>',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/create</loc><priority>1</priority></url>'
			];
			for(var i = 0; i < data.length; i++){
				sitemap.push('<url><loc>https://pollendpoint-licson.rhcloud.com/question/'+data[i].id+'</loc></url>');
			}
			sitemap.push('</urlset>');
			res.writeHead(200,{'Content-type':'text/xml'});
			res.end(sitemap.join(''));
		}
		else {
			var sitemap = [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/</loc><changefreq>daily</changefreq><priority>1</priority></url>',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/about</loc><priority>0.8</priority></url>',
				'<url><loc>https://pollendpoint-licson.rhcloud.com/create</loc><priority>1</priority></url>',
				'</urlset>'
			].join('');
			res.writeHead(200,{'Content-type':'text/xml'});
			res.end(sitemap);
		}
	});
});

app.get('/search',function(req,res){
	var keywords = req.query.q;
	var page = parseInt(typeof req.query.page === "undefined" ? 1 : req.query.page);
	sql.conn.query('SELECT count(*) AS `count` FROM `polls` WHERE `name` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\' OR `keywords` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\' OR `desc` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\'',function(err,rows){
		if(!err){
			var count = rows[0].count;
			sql.conn.query('SELECT * FROM `polls` WHERE `name` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\' OR `keywords` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\' OR `desc` LIKE \'%'+db.escape(keywords).replace(/^'|'$/g,'')+'%\' LIMIT '+(page-1)*20+', 20',function(err,result){
				if(!err){
					res.send(view.page('search',{
						keyword: keywords,
						result: result,
						page: page,
						count: count,
						limit: 20
					}));
				}
				else {
					res.send(view.error(err));
				}
			});
		}
		else {
			res.send(view.error(err));
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
	sql.conn.query('INSERT INTO `stats` SET ?',{poll_id:req.params.id},function(e){
		if(e){
			success = false;
		}
	});
	res.json({success:success});
});

app.get('/create',function(req,res){
	res.send(view.page('create',{}));
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
	var date = new Date();
	var data = [];
	date.setSeconds(0);
	console.log(req.body);
	if(req.body.questions.belongs instanceof Array){
		for(var i = 0; i < req.body.questions.belongs.length; i++){
			date.setSeconds(i+1);
			var q = {
				belongs:req.body.questions.belongs[i],
				name:req.body.questions.name[i],
				type:req.body.questions.type[i],
				choices:req.body.questions.choices[i],
				required:req.body.questions.required[i],
				id:genID(40),
				time:date
			};
			data.push(q);
		}
	}
	else {
		var q = {
			belongs:req.body.questions.belongs,
			name:req.body.questions.name,
			type:req.body.questions.type,
			choices:req.body.questions.choices,
			required:req.body.questions.required,
			id:genID(40),
			time:date
		};
		data.push(q);
	}
	async.map(data,function(q,cb){
		sql.conn.query('INSERT INTO `questions` SET ?',q,function(err){
			if(err){
				console.log(err);
				success = false;
			}
			cb(err);
		});
	},function(e){
		var message = {success:success};
		if(!success){
			message.message = "Database error, please try again later.";
		}
		res.json(message);
	});
});

app.get('/stats/:id',function(req,res){
	var id = req.params.id;
	async.parallel({
		questions:function(cb){
			sql.conn.query('SELECT * FROM `questions` WHERE `belongs` = ? ORDER BY `time` ASC',[req.params.id],function(err,questions){
				cb(err,questions);
			});
		},
		t_count:function(cb){
			sql.conn.query('SELECT count(*) AS `count` FROM `stats` WHERE `poll_id` = ?',[id],function(err,data){
				var t_count = typeof data[0] == "undefined" ? 0 : data[0].count;
				cb(err,t_count);
			});
		},
		q_count:function(cb){
			sql.conn.query('SELECT count(*) AS `count` FROM `answers` WHERE `poll_id` = ?',[id],function(err,data){
				var q_count = typeof data[0] == "undefined" ? 0 : data[0].count;
				cb(err,q_count);
			});
		},
		meta:function(cb){
			sql.conn.query('SELECT * FROM `polls` WHERE `id` = ?',[id],function(err,meta){
				cb(err,meta);
			});
		},
		questionnaires:function(cb){
			sql.conn.query('SELECT COUNT(*) AS `count`, `date` FROM `answers` WHERE `poll_id` = ? GROUP BY `date` ORDER BY `date` DESC',[id],function(err,result){
				cb(err,result);
			});
		}
	},function(err,result){
		if(err){
			res.send(view.error(err));
		}
		else {
			if(result.meta.length === 0){
				res.send(view.error(new Error("The poll specified doesn't exists anymore.")));
			}
			else {
				res.send(view.page('stats',{
					count:{
						users:result.t_count,
						total:result.q_count
					},
					meta:result.meta[0],
					id:id,
					questions:result.questions,
					questionnaires:result.questionnaires
				}));
			}
		}
	});
});

app.get('/stats/time/:id',function(req,res){
	sql.conn.query('SELECT COUNT(*) AS `count`, `time` FROM `stats` WHERE `poll_id` = ? GROUP BY `time` ORDER BY `time` ASC',[req.params.id],function(err,data){
		var intital_date = null;
		var _return = [];
		var _return_i = 0;
		for(var i = 0; i < data.length; i++){
			data[i].time.setHours(0);
			data[i].time.setMinutes(0);
			data[i].time.setSeconds(0);
			if(intital_date == null || (data[i].time.getFullYear() !== intital_date.getFullYear() || data[i].time.getMonth() !== intital_date.getMonth() || data[i].time.getDate() !== intital_date.getDate())){
				_return.push([data[i].time.getTime(),data[i].count]);
				_return_i = _return.length == 1 ? 0 : _return_i+1;
			}
			else {
				_return[_return_i][1] += (data[i].count);
			}
			intital_date = data[i].time;
		}
		res.json(_return);
	});
});

app.get('/stats/questionnaire/:id/:time',function(req,res){
	var id = req.params.id;
	var time = req.params.time;
	sql.conn.query('SELECT q.`name`, a.`value` FROM `questions` AS q INNER JOIN `answers` AS a ON (q.`id` = a.`question_id`) WHERE a.`poll_id` = ? AND a.`date` = ? ORDER BY a.`date` DESC',[id,new Date(time)],function(err,result){
		res.json(result);
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
					_data.push({
						data:[
							[0,data[i].count]
						],
						label:data[i].value
					});
				}
				res.json(_data);
				break;
				
				case 'mmc':
				//Multiple answers, show a multiple answers chart
				var _data = {}, _final = [];
				sql.conn.query('SELECT COUNT(*) AS `count`, `value` FROM `answers` WHERE `question_id` = ? GROUP BY `value` ORDER BY `value` ASC',[req.params.id],function(err,data){
					for(var i = 0; i < data.length; i++){
						var choices = String(data[i].value).split(',');
						for(var j = 0; j < choices.length; j++){
							if(_data[choices[j]]){
								_data[choices[j]] += data[i].count;
							}
							else {
								_data[choices[j]] = data[i].count;
							}
						}
					}
					
					for(var i in _data){
						_final.push({
							data:[
								[0,_data[i]]
							],
							label:i
						});
					}
					
					res.json(_final);
				});
				break;
				
				case 'fillin':
				sql.conn.query('SELECT `value` FROM `answers` WHERE `question_id` = ? AND `value` != \'\'',[req.params.id],function(err,data){
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

module.exports = {
	start:function(){
		http.listen(process.env.OPENSHIFT_INTERNAL_PORT||8000,process.env.OPENSHIFT_INTERNAL_IP||'127.0.0.1');
		console.log('Server #%d listening at port %d',process.pid,process.env.OPENSHIFT_INTERNAL_PORT||8000);
	}
};