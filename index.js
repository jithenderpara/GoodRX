var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var config = require('./server/config');
var path = require('path');
var port = process.env.PORT || config.serverport;
app.listen(port);
console.log('app is listening at http://localhost:' + port)
app.use(express.static(path.join(__dirname, '/dist')));

app.get('*', function(req, res, next) {
  res.sendFile(__dirname+"/dist/index.html");
});

//----- Error Handler
app.use(function(err, req, res, next) {
    if (res) {
        res.status(500).json({
            "code": 500,
            "status": "failure",
            "message": "Server Error",
            "data": err instanceof Error ? err.message : err
        });
    }
});