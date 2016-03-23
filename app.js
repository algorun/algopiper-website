var express = require('express')
  , app = express()
  , doT = require('express-dot')
  , pub = __dirname+'/public'
  , view = __dirname+'/views';
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var multer = require('multer');
var upload = multer();
var uuid = require('node-uuid');
var request = require('request');

app.set('views', __dirname+'/views');
app.set('view engine', 'dot');
app.engine('html', doT.__express);
app.use(cookieParser('AlgoPiper'));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/css',express.static(__dirname+'/public/css'));
app.use('/fonts',express.static(__dirname+'/public/fonts'));
app.use('/js',express.static(__dirname+'/public/js'));
app.use('/resources',express.static(__dirname+'/public/resources'));
app.use('/img',express.static(__dirname+'/public/img'));

app.get('/', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "AlgoPiper", home_tab: "class='active'"};
	res.render('index.html', templateData);
});

app.get('/try', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Try AlgoPiper", try_tab: "class='active'"};
	res.render('try.html', templateData);
});

app.get('/browse', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Browse", browse_tab: "class='active'"};
	res.render('browse.html', templateData);
});

app.get('/documentation', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Documentation", doc_tab: "class='active'"};
	res.render('documentation.html', templateData);
});


app.get('/submit-workflow', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Submit Workflow", submit_tab: "class='active'"};
	res.render('submit-workflow.html', templateData);
});

app.get('/try-algopiper', function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var docker_image = 'algorun/algopiper';
    var node_id = req.cookies['AlgoPiper'];
    if(node_id == undefined){
        node_id = uuid.v4();
        res.cookie('AlgoPiper', node_id);
    }
    
    request.post('http://manager.algorun.org/api/v1/deploy', {form:{'docker_image': docker_image, 'node_id': node_id}}, function(error, response, body){
        res.send(body);
    });
});
app.get('/algopiper', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "AlgoPiper", algopiper_tab: "class='active'"};
    if(req.cookies['AlgoPiper'] == undefined){
        res.cookie('AlgoPiper', uuid.v4());
    }
	res.render('algopiper.html', templateData);
});

app.get('/contact-us', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Contact Us"};
	res.render('contact-us.html', templateData);
});

app.get('/input-output-types', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;
    
    var templateData = {title: "Input & Output Types"};
	res.render('input-output-types.html', templateData);
});

var server = app.listen(31332);
enableDestroy(server);

process.on('SIGINT', function () {
    server.destroy();
});
function enableDestroy(server) {
  var connections = {}

  server.on('connection', function(conn) {
    var key = conn.remoteAddress + ':' + conn.remotePort;
    connections[key] = conn;
    conn.on('close', function() {
      delete connections[key];
    });
  });

  server.destroy = function(cb) {
    server.close(cb);
    for (var key in connections)
      connections[key].destroy();
  };
}