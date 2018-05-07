var fs = require('fs');
function ReadFileData(filename,callback){
    fs.readFile(__dirname+"/"+filename, 'utf8', function (err, data) {
     if(err){
            console.log(err)
            callback(false)
        }
        else{         
            callback(data);
            //var data = "New File Contents";
          
        } 
});
    // fs.readFile(__dirname+"/"+filename, function(err, buf) {       
    //     if(err){
    //         console.log(err)
    //     }
    //     else{
    //         var data={"job":"hello1"}
    //         var _Arry=[]
    //         for(let i=0;buf.length;i++){
    //             _Arry.push(buf[i])
    //         }
    //         _Arry.push(data)
    //         console.log(_Arry)
    //         var data = "New File Contents";
    //         //WriteFile(filename,data) 
    //     }   
    // });
}

function WriteFiledata(filename,data,callback){
    console.log(data)
    var path=__dirname+"/"+filename
    console.log(fs.existsSync(path))
    if(!fs.existsSync(path))
        callback(false)
    else{
     fs.writeFile(path, data, function(err, data){
        if (err) {
        console.log(err);
        callback(false)
        }else{
            console.log()
        callback(true)
        }
    });
    }
}

module.exports= {	
    ReadFileData,
    WriteFiledata
};