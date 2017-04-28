/**
 * Created by Li hui on 17/04/19.跑通前后端
 */
var express = require('express');  // 加载express模块
var port = process.env.PORT || 3000; //// 设置端口号：3000。环境变量要是设置了PORT，那么就用环境变量的PORT
var app = express();  //启动Web服务器,将实例赋给变量app

var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/imooc'); // 连接mongodb本地数据库imooc
/*  mongoose 简要知识点补充
* mongoose模块构建在mongodb之上，提供了Schema[模式]、Model[模型]和Document[文档]对象，用起来更为方便。
* Schema对象定义文档的结构（类似表结构），可以定义字段和类型、唯一性、索引和验证。
* Model对象表示集合中的所有文档。
* Document对象作为集合中的单个文档的表示。
* mongoose还有Query和Aggregate对象，Query实现查询，Aggregate实现聚合。
* */

var Movie = require('./models/movie'); // 载入mongoose编译后的模型movie
var _ = require('underscore'); // _.extend用新对象里的字段替换老的字段(line.88)

app.set('views', './views/pages'); // 设置默认的视图文件路径
app.set('view engine', 'jade'); // 设置视图引擎：jade
var bodyParser = require('body-parser')//不再与express捆绑需单独安装
app.use(bodyParser.json()); //for parseing application json
app.use(bodyParser.urlencoded({extended: true})); // 因为后台录入页有提交表单的步骤，故加载此模块方法（bodyParser模块来做文件解析），将表单里的数据进行格式化
var path = require('path'); // app.use是用来给path注册中间函数的。引入path模块的作用：因为页面样式的路径放在了bower_components，告诉express，请求页面里所过来的请求中，如果有请求样式或脚本，都让他们去bower_components中去查找
app.use(express.static(path.join(__dirname, 'public'))); //多个路径拼接起来，__dirname为当前目录,express.static是中间函数，为指定静态文件查找目录
app.locals.moment = require('moment'); // 载入moment模块，格式化日期
app.listen(port);

console.log('imooc started on port: ' + port);

// 编写主要页面路由
// 路由器解析index page
app.get('/', function(req, res){
	//查询一下所有数据
	Movie.fetch(function(err, movies){
		if(err){
			console.log(err);
		}
		
		res.render('index', {
		title: 'imooc 首页',
		movies: movies
		});
	});
});
	

// 路由器解析detail page
app.get('/movie/:id', function(req, res){
	//参数在url中时,通过req.parmas可以拿到id参数值
	var id = req.params.id;
	
	//在模式定义好的方法,传入id在回调方法拿到查询到的单条电影数据
	Movie.findById(id, function(err, movie){
		res.render('detail', {
			title: 'imooc ' + movie.title,
			movie: movie
		});
	});
});

// 路由器解析admin page
app.get('/admin/movie', function(req, res){
	res.render('admin', {
		title: 'imooc 后台录入页',
		movie: {
			title: '',
			doctor: '',
			country: '',
			year: '',
			poster: '',
			language: '',
			flash: '',
			summary: ''
		}
	});
});
 
// 路由器解析admin update movie(倒数第二步)
// 这个URL地址过来后就是要更新电影
app.get('/admin/update/:id', function(req, res){
	//同样是先拿到，判断如果存在
	var id = req.params.id;
	
	if(id){
		//通过模型拿到此方法
		Movie.findById(id, function(err, movie){
			//拿到电影数据直接渲染后台录入页
			res.render('admin', {
				title: 'imooc 后台更新页',
				movie: movie
			});
		});
	}
});
 
// admin post movie 后台更新页
//拿到从后台录入页post过来的数据
app.post('/admin/movie/new', function(req, res){
	//从表单post过来的数据可能是新加的也可能是再次更新过的然后再post,所以要做个判断是否有id的定义
	//(来自admin.jade的input)提交表单后，服务端会接收到表单信息（包括隐藏域的值）。服务端通过 bodyParser 解析表单信息，将结果放在 req.body 中。
	//于是，我们可以通过 req.body.movie 取到该表单中的信息。那么 req.body.movie._id 就是隐藏表单项的值了（_id）。
	//这个 _id 用来区分“已存在的”和 “新添加”的内容。结合视频，理清 list.jade 中关于“修改”部分的逻辑，就知道为什么会这样写了 :)
	var id = req.body.movie._id;
	//拿到movie对象，再声明一个movie的变量
	var movieObj = req.body.movie;
	var _movie;
	
	//若id不等于undefined说明电影已存储到数据库过的，则进行更新
	if(id !== 'undefined'){
		Movie.findById(id, function(err, movie){
			if(err){
				console.log(err);
			}
			
			//用post过来的电影数据里面的更新过的字段来替换掉老的数据,先将要查询的movie放第一个参数，在post过来的movie放第二个参数
			_movie = _.extend(movie, movieObj);
			//在save的时候,回调方法里一样能拿到是否有异常和save后的movie
			_movie.save(function(err, movie){
				if(err){
					console.log(err);
				}
				
				//若电影更新了也存入成功了,应把页面重定向到这部电影对应的详情页
				res.redirect('/movie/' + movie._id);
			});
		});
	}
	else{ //若这部电影是没定义过的(post表单没movie._id这个值)，所以电影为新加的，就可直接调用模型的构造函数
		_movie = new Movie({
			doctor: movieObj.doctor,
			title: movieObj.title,
            country: movieObj.country,
            language: movieObj.language,
            year: movieObj.year,
            poster: movieObj.poster,
            summary: movieObj.summary,
            flash: movieObj.flash
		});
		
		_movie.save(function(err, movie){
			if(err){
					console.log(err);
				}
				
				//若电影更新了也存入成功了,应把页面重定向到这部电影对应的详情页
				res.redirect('/movie/' + movie._id);
		});
	}
});

// 路由器解析list page
app.get('/admin/list', function(req, res){
	//同样要查询一下和首页查询一样
	Movie.fetch(function(err, movies){
		if(err){
			console.log(err);
		}
		
		res.render('list', {
			title: 'imooc 列表页',
			movies: movies
		});		
	});
});
//在列表页点更新后会重新回到后台录入页，这时候需要将电影数据给初始化到表单中所以还需要加一个路由admin update movie

// 路由器解析list delete movie(最后一步)
app.delete('/admin/list', function(req, res){
	var id = req.query.id;
	
	if(id){
		Movie.remove({_id: id}, function(err, movie){
			if(err){
				console.log(err);
			}
			else{
				res.json({success: 1});
			}
		});
	}
});
