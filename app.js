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

var Docker = require('dockerode');
var CronJob = require('cron').CronJob;
var nmap = require('libnmap');
var fs = require('fs');
var enableDestroy = require('./CloseServer.js');

var opts = {range: ['localhost'], ports: '10000-60000'}; // allow docker containers to be run on this port range
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var running_containers = [];
var algopiper_containers = [];
var available_images;
var server_path = 'http://go.algorun.org:';
//var server_path = "http://localhost:";

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scanPorts(callback){
    var busy_ports = [];
    nmap.scan(opts, function(err, report) {
        if (err) {
            callback({status: "fail", error: err});
        }
        for (var item in report) {
	       var ports = report[item]['host'][0]['ports'][0]['port'];
	           ports.forEach(function(entry){
		          busy_ports.push(parseInt(entry['item']['portid']));
	           });
        }
        callback({status: "success", ports: busy_ports});
    });
}

function getRandomAvailablePort(callback){
    scanPorts(function(result){
        if(result['status'] === 'fail'){
            console.error(result['error'])
            callback(-1);
            return;
        }
        var available = result['ports'];
        var port = getRandomInt(10000, 60000);
        while(available.indexOf(port) >= 0){
            port = getRandomInt(10000, 60000);
        }
        callback(port);
    });
}

function cleanup(filename){
    // stop all running AlgoManager containers

    for(var i=0;i<running_containers.length;i++){
        docker.getContainer(running_containers[i]["container_id"]).stop(function(error, response, body){});
        console.log("container " + running_containers[i]["container_id"] + " stopped .. ");
    }
    running_containers = [];
    fs.writeFile(filename, JSON.stringify(running_containers), function (err) {
        if (err) return console.log(err);
    });
}


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

app.get('/launch', function (req, res) {
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


app.get('/submit-pipeline', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;

    var templateData = {title: "Submit Workflow", submit_tab: "class='active'"};
    res.render('submit-pipeline.html', templateData);
});

app.get('/contact-us', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;

    var templateData = {title: "Contact Us"};
	  res.render('contact-us.html', templateData);
});

app.get('/try-algopiper', function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.status = 200;

    var docker_image = 'algorun/algopiper';
    var node_id = req.cookies['AlgoPiper'];
    var pipeline_file = req.query.pipeline_file;
    var pipeline_name = req.query.pipeline_name;
    
    if(node_id == undefined){
        node_id = uuid.v4();
        res.cookie('AlgoPiper', node_id);
    }
    
    if (pipeline_file != undefined && pipeline_name != undefined){
        node_id = uuid.v4();
        res.cookie('AlgoPiper', node_id);
        request.post('http://manager.algorun.org/api/v1/deploy', {form:{'node_id': node_id, 'docker_image': 'algorun/algopiper', 'pipeline_file': pipeline_file, 'pipeline_name': pipeline_name}}, function(error, response, body){
            res.send(body);
        });    
    } else {
        request.post('http://manager.algorun.org/api/v1/deploy', {form:{'node_id': node_id, 'docker_image': 'algorun/algopiper'}}, function(error, response, body){
            res.send(body);
        });
    }
});

app.post('/deploy', function(req, res){
    var docker_image = 'algorun/algopiper';
    var node_id = req.body.node_id;
    var pipeline_file = req.body.pipeline_file;
    var pipeline_name = req.body.pipeline_name;

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    // check to see if the node already has a running container
    for(var i = 0; i<running_containers.length; i++){
        if(running_containers[i]['node_id'] === node_id && running_containers[i]['docker_image'] === docker_image){
            res.status = 200;
            res.send({"status": 'success', "endpoint": server_path + running_containers[i]['port']});
            return;
        }
    }

    // node doesn't have a container running. get a random available port and initialize container.
    getRandomAvailablePort(function(container_port){
        // failed to allocate port numer (most probably nmap is not installed or not properly configured)
        if(container_port == -1){
            res.status = 500;
            res.send({"status": 'fail', "error_message": "failed to allocate port number"});
            return;
        }
        var env_list;
        if (pipeline_file != undefined && pipeline_name != undefined){
            pipeline_url = "http://algopiper.org/resources/pipelines/" + pipeline_file;
            env_list = ['MANAGER=manager.algorun.org', 'PIPELINE_URL='+pipeline_url, 'PIPELINE_NAME='+pipeline_name];
        } else{
            env_list = ['MANAGER=manager.algorun.org'];
        }
        docker.createContainer({Image: docker_image, Env: env_list, Cmd: ['/bin/bash']}, function (err, container) {
            if(err){
                res.status = 500;
                res.send({"status": 'fail', "error_message": JSON.stringify(err)});
                return;
            }
            container.start({"PortBindings": {"8765/tcp": [{"HostPort": container_port.toString()}]}}, function (err, data) {
                if(err){
                    res.status = 500;
                    res.send({"status": 'fail', "error_message": JSON.stringify(err)});
                    return;
                }

                // save running container info
                running_containers.push({'node_id': node_id, container_id: container.id, 'port': container_port, 'docker_image': docker_image, 'created': new Date()});
                fs.writeFile('algorun-tmp.json', JSON.stringify(running_containers), function (err) {
                    if (err) return console.log(err);
                });
                res.status = 200;
                res.send({"status": 'success', "endpoint": server_path + container_port});
                return;
            });
        });
    });
});

var server = app.listen(31332, function(){
  fs.readFile('algorun-tmp.json', 'utf8', function (err,data) {
        if (!err) {
          // load running containers to stop them
          running_containers = JSON.parse("[" + data.substring(1, data.length -1) + "]");
          // cleanup('algorun-tmp.json');
        }
    });
});
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

// definition for the garbage collector
// run every minute
var cron_expression = '0 * * * * *';
var gc = new CronJob(cron_expression, function(){
    var now = new Date();
    var stop_after = 24 * 60 * 60 * 1000;   // the time after which to stop a running container in milliceconds (24 hours)

    // loop through running containers to stop the ones that have more than X hours being idle
    for(var i=0;i<running_containers.length;i++){
        var running_since = now - running_containers[i]['created'];
        if(running_since >= stop_after){
            docker.getContainer(running_containers[i]['container_id']).stop(function(error, response, body){});
            running_containers.splice(i--, 1); // remove it from the running containers
        }
    }
}, null, true, "America/New_York");

// stop running containers on process exit
process.on('SIGINT', function () {
    gc.stop();
    server.destroy();
});
