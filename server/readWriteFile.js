var fs = require('fs');
function ReadFile(filename){
    fs.readFile(__dirname+"/"+filename, function(err, buf) {       
        if(err){
            console.log(err)
        }
        else{
            var data={"job":"hello1"}
            var _Arry=[]
            for(let i=0;buf.length;i++){
                _Arry.push(buf[i])
            }
            _Arry.push(data)
            console.log(_Arry)
            var data = "New File Contents";
            //WriteFile(filename,data) 
        }   
    });
}

function WriteFile(filename,data){
     fs.writeFile(__dirname+"/"+filename, data, function(err, data){
        if (err) console.log(err);
        console.log("Successfully Written to File.");
    });
}

module.exports= {	
    ReadFile,
    WriteFile
};