function restapi(router,bodyParser,schedule) {
    var self = this;
    self.handleRoutes(router, bodyParser,schedule);
}
restapi.prototype.handleRoutes = function (router, bodyParser,schedule) {
    var Jsonfile=require('../readWriteFile')
    console.log("scheduling")
     router.post('/api/scheduleNew', function (req, res) { 
        res.json("hello")
      })
    router.post('/api/schedule', function (req, res) {        
        var date = new Date(2012, 11, 21, 5, 30, 0); 
        var j = schedule.scheduleJob(date, function(){
        console.log('The world is going to end today.');
        res.send("Sending file")
        });
    })

     router.post('/api/scheduleWrite', function (req, res) {
        Jsonfile.ReadFile("Schedule.json")
        res.send("Sending file")      
    })
}

module.exports = restapi;