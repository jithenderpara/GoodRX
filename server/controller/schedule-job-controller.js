function restapi(router,bodyParser,schedule,io) {
    var self = this;
    self.handleRoutes(router, bodyParser,schedule,io);
}
restapi.prototype.handleRoutes = function (router, bodyParser,schedule,io) {
    var Jsonfile=require('../readWriteFile')
    var jsonfile = require('jsonfile')
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
        var fs = require('fs')
        var file = __dirname+'/Schedule.json'
        fs.readFile(file, 'utf-8', function(err, data) {
            if (err) throw err
            var arrayOfObjects = JSON.parse(data)
            var obj={"Job Name":req.body.jobname,"Job Date":req.body.jobdate,"Job Time":req.body.jobtime,
            "No of Recods":req.body.NoofRecods,"Mail Ids":req.body.mailids,"outputpath":req.body.filepath}
            arrayOfObjects.push(obj)
                fs.writeFile(file, JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
                    if (err) throw err
                   // console.log('Done!')
                    //  fs.readFile(file, 'utf-8', function(err, data) {
                    //      var arrayOfObjects = JSON.parse(data)
                    //      res.send(arrayOfObjects)
                    //  })
                    var minute=req.body.jobtime.split(":")[1]||'*';
                    var hour=req.body.jobtime.split(":")[0]||'*';
                    var dayofmonth=req.body.jobdate||'*';
                    var month="*";
                    var dayofweek="*";
                    //*second (0 - 59, OPTIONAL) *minute (0 - 59) *hour (0 - 23) *day of month (1 - 31) *month (1 - 12) *day of week (0 - 7) (0 or 7 is Sun)
                    var date='* '+minute+' '+hour+' '+dayofmonth+' '+month+' '+dayofweek;
                    console.log(date)
                    var j = schedule.scheduleJob(req.body.jobname,date, function(){
                        console.log("Job run sucessfully!")   
                        j.cancel();       
                    });
                    res.send({ status: true, msg: "Job is Schedule secussfully!"})
                })
        })
     })  
    sendNotifications()
    function sendNotifications(){
        
    }      
}


module.exports = restapi;