function restapi(router, session, bodyParser) {
    var self = this;
    self.handleRoutes(router, session, bodyParser);
}
restapi.prototype.handleRoutes = function (router, session, bodyParser) {
router.get('/api/login', function(req, res) {
    //router.get("/api/login",function(req,res){
    console.log("login")
    if(req.body.emailid=="test@gmail.com"&&req.body.password=="test")
        {
            res.send({status:true,msg:"Login sucessfully"})
        }
        else{
             res.send({status:false,msg:"Invalid Email Id / Password "})
        }

})
}

module.exports = restapi;