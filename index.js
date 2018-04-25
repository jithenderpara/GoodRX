// var express = require('express');
// var app = express();
// var bodyParser = require('body-parser');
// var config = require('./server/config');
// var path = require('path');
// var port = process.env.PORT || config.serverport;
// app.listen(port);
// console.log('app is listening at http://localhost:' + port)
// app.use(express.static(path.join(__dirname, '/dist')));

// app.get('*', function(req, res, next) {
//   res.sendFile(__dirname+"/dist/index.html");
// });

// //----- Error Handler
// app.use(function(err, req, res, next) {
//     if (res) {
//         res.status(500).json({
//             "code": 500,
//             "status": "failure",
//             "message": "Server Error",
//             "data": err instanceof Error ? err.message : err
//         });
//     }
// });


var http = require('http');
var path = require('path');
var express = require('express');
var config = require('./server/config');
var port = process.env.PORT || config.serverport;
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
app.use(express.static(path.join(__dirname, '/dist')));

app.get('*', function(req, res, next) {
  res.sendFile(__dirname+"/dist/index.html");
});
var UploadApi = require('./server/controller/Upload-controller');
var UploadRouter = new UploadApi(router, bodyParser);
var scheduleApi = require('./server/controller/schedule-job-controller');
var scheduleRouter = new scheduleApi(router, bodyParser,schedule);

var server = http.createServer(app);
var io = require('socket.io')(server);
app.use('/', router);
server.listen(port,function(){
  console.log("Server is running on port: "+port)
});

  // app.post('/api/scheduleNew', function (req, res) { 
  //       res.json("hello")
  //     })

