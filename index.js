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
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())



app.use(express.static(path.join(__dirname, 'uploads')));
  var nodeSession = require('node-session');
var session = new nodeSession({
    secret: 'Q3UBzdH9GEfiRCTKbi5MTPyChpzXLsTD',
    'lifetime': 1800000, // 30 minutes 
    'expireOnClose': true,
});

var LoginApi = require('./server/controller/login.controller');
var loginRouter = new LoginApi(router, session, bodyParser);
var multer = require('multer');
var storage = multer.diskStorage({
  // destination
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
var upload = multer({ storage: storage });
app.post("/upload", upload.array("uploads[]", 12), function (req, res) {
  console.log('files', req.files);
  res.send(req.files);
});
app.post('/api/login', function(req, res) {
    //router.get("/api/login",function(req,res){
    
      session.startSession(req, res, function() {
          if(req.body.emailid=="test@gmail.com" && req.body.password=="test")
          {
             req.session.put('emailid', req.body.emailid);
              req.session.put('name', 'Guest');
              res.send({status:true,msg:"Login sucessfully"})
              
          }
          else{
                res.send({status:false,msg:"Invalid Email Id / Password "})
                 //req.session.flush();
          }
        })

})
      app.get('/api/checksession', function(req, res) {
        session.startSession(req, res, function() {
        if (req.session.has('name'))
          {
              res.send({status:true,msg:req.session.get("name")})
          }
        })       
      })
      app.get('*', function(req, res, next) {
  res.sendFile(__dirname+"/dist/index.html");
});
app.listen(145,function(){
  console.log("Server is running on port: 145")
});


