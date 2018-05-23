
function restapi(router, bodyParser, schedule, io, uploadscvtojson) {
    var self = this;
    self.handleRoutes(router, bodyParser, schedule, io, uploadscvtojson);
}
restapi.prototype.handleRoutes = function (router, bodyParser, schedule, io, uploadscvtojson) {
    var prompt = require('prompt');
    var exec = require('child_process').exec;
    var fs = require('fs');
    var fastCSV = require("fast-csv");
    var moment = require('moment');
    var request = require("request");
    var uuid = require('node-uuid');
    var cheerio = require("cheerio");
    var log4js = require('log4js');
    var path = require('path');
    var Curl = require('node-libcurl').Curl;
    var scheduleFile = require('./server/readWriteFile');
    log4js.configure({
        appenders: [{
            type: 'console'
        }, {
            "type": "file",
            "filename": "../log/app.log",
            "maxLogSize": 1000000,
            "backups": 5,
            "category": " "
        }]
    });
    
    var CONFIG = require("./config.js");
    var LOGGER = log4js.getLogger(" ");
    var appConfig = {
        dateTimeFormat: "YYYYMMDD_hhmmss",
        retryCount: {
            locationCookie: 1,
            drugInfo: 1,
            couponInfo: 1
        },
        locationCookieRefreshCount: 50,
        couponResultIncrementalThreshold: 50,
        csvHeaders: {
            inputReport: "ID,Drug Name (url/lipitor),Drug Name (?drug-name=lipitor),Form,Dosage,Quantity,Days Supply,Label Override,Location,Status,Pharmacy Count,Pharmacy with Coupon Count,Failure Reason\n",
            pharmacyReport: "ID,Parent ID,Discount Price,Discount Reason,Cash Price,Cash Desc,Store,Drug Name,Form,Dosage,Quantity,Label Override,Location,Method,Pharmacy ID,Brand/Generic, Coupon Network,Gold Price,URL\n",
            extentReport: "ID,Parent ID,Discount Price,Discount Reason,Cash Price,Cash Desc,Store,Drug Name,Form,Dosage,Quantity,Label Override,Location,Member ID,RxGroup,RxBin,RxPCN,Status,Failure Reason,Pharmacy ID,Brand/Generic, Coupon Network,Gold Pric,URL\n"
        },
        filePaths: {},
        isLiteVersion: true,
        expInc: {
            coupon: 0,
            pharmacyRowIndex: 0,
            rateLimitReached: 24
        }
    };
    var appData = {
        Startvalue: 0,
        Endvalue: 0,
        totalCouponHits: 0,
        ProcesssingJobId: null,
        couponProcessedHits: 0,
        totalInputReportHits: 0,
        inputReportProcessedHits: 0,
        totalCsvCount: 0,
        report: {
            totalNoOfLines: 0,
            linesParsedSuccessCount: 0,
            linesParseFailureCount: 0,
            totalDrugsByPharmacyCount: 0,
            drugsByPharmacySuccessCount: 0,
            drugsByPharmacyFailureCount: 0
        }
    };
    var rateLimitReachedRetryTimeout = 0;
    var TotalRecordCount = 0;
    var processingRecCount = 0;
    var _reccomplate = false;

    // restartjobs();

    function restartjobs() {
        scheduleFile.ReadFileAll(function (data) {
            if (data.length > 0) {
                for (i = 0; i <= data.length; i++) {
                    if (data[i].Status == "Processing") {
                        processInputFile(data[i].InputFile, data[i].jobId, true, data[i]["End Value"], function (d) {
                            console.log("job run From Time interval")
                        });
                        return false
                    }
                    else if (data[i].Status == "Started") {
                        processInputFile(data[i].InputFile, data[i].jobId, false, 0, function (d) {
                            console.log("job run From Time interval")
                        });
                        return false

                    }
                    // console.log(data[i])
                }
            }
        })


    }
    router.post('/api/scheduleWrite', function (req, res) {
        var fs = require('fs')
        var file = 'Schedule.json'
        fs.readFile(file, 'utf-8', function (err, data) {
            if (err) throw err
            var arrayOfObjects = JSON.parse(data)
            var _jobid = new Date().getMilliseconds()
            var obj = {
                "JobId": _jobid, "Status": "Started", "Percentage": "", "start Value": "", "Total Values": "", "Fineshcount": "", "Error": "", "Job Name": req.body.jobname, "Job Date": req.body.jobdate, "Job Time": req.body.jobtime,
                "No of Recods": req.body.NoofRecods, "Mail Ids": req.body.mailids, "outputpath": req.body.filepath, InputFile: req.body.InputFile
            }
            arrayOfObjects.push(obj)
            fs.writeFile(file, JSON.stringify(arrayOfObjects), 'utf-8', function (err) {
                if (err) throw err
                var minute = req.body.jobtime.split(":")[1] || '*';
                var hour = req.body.jobtime.split(":")[0] || '*';
                var dayofmonth = req.body.jobdate || '*';
                var month = "*";
                var dayofweek = "*";
                //*second (0 - 59, OPTIONAL) *minute (0 - 59) *hour (0 - 23) *day of month (1 - 31) *month (1 - 12) *day of week (0 - 7) (0 or 7 is Sun)
                var date = '* ' + minute + ' ' + hour + ' ' + dayofmonth + ' ' + month + ' ' + dayofweek;
                console.log(date)
                var j = schedule.scheduleJob(req.body.jobname + "_" + _jobid, date, function () {
                    console.log(j.name)
                    var jobId = j.name;
                    jobId = jobId.split("_")[1]
                    scheduleFile.ReadFileByJobId(jobId, function (data) {
                        if (data) {
                            processInputFile(data.InputFile, jobId, false, 0, function (d) {
                                console.log("job run From Time interval")
                            });
                        }
                        else {
                            console.log("Inavlid Job")
                        }
                    })
                    console.log("Job run sucessfully! at the time" + " " + req.body.jobname + "_" + _jobid)
                    j.cancel();

                })
                res.send({ status: true, msg: "Job is Schedule secussfully!" })
            })
        })
    })
    router.post('/api/scheduleUpdate', function (req, res) {
        scheduleFile.UpdateFileByJobId(
            req.body.jobid,
            req.body.jobname,
            req.body.jobdate,
            req.body.jobtime,
            req.body.NoofRecods,
            req.body.mailids,
            req.body.InputFile,
            function (data) {
                if (data) {
                    var _jobid = req.body.jobid;
                    var scheduleid = req.body.prejobname + "_" + _jobid
                    //console.log(scheduleid)
                    var my_job = schedule.scheduledJobs[scheduleid];
                    if (my_job) {
                        console.log(my_job)
                        my_job.cancel();
                    }

                    var minute = req.body.jobtime.split(":")[1] || '*';
                    var hour = req.body.jobtime.split(":")[0] || '*';
                    var dayofmonth = req.body.jobdate || '*';
                    var month = "*";
                    var dayofweek = "*";
                    //hour = '*'
                    console.log(new Date())
                    //*second (0 - 59, OPTIONAL) *minute (0 - 59) *hour (0 - 23) *day of month (1 - 31) *month (1 - 12) *day of week (0 - 7) (0 or 7 is Sun)
                    var date = '* ' + minute + ' ' + hour + ' ' + dayofmonth + ' ' + month + ' ' + dayofweek;
                    console.log(date)
                    var j = schedule.scheduleJob(req.body.jobname + "_" + _jobid, date, function () {
                        console.log(j.name)
                        var jobId = j.name;
                        jobId = jobId.split("_")[1]
                        scheduleFile.ReadFileByJobId(jobId, function (data) {
                            if (data) {
                                processInputFile(data.InputFile, jobId, false, 0, function (d) {
                                    console.log("job run From Time interval")
                                });
                            }
                            else {
                                console.log("Inavlid Job")
                            }
                        })
                        console.log("Job run sucessfully! at the time" + " " + req.body.jobname + "_" + _jobid)
                        j.cancel();

                    })
                    res.send({ status: true, msg: "Job is Updated secussfully!" })
                }
                else {
                    res.send({ status: false, msg: "Error occured while updating job..!" })
                }
            })
    })
    router.get('/api/Runschedule', function (req, res) {
        var _jobid = req.body.jobid || req.params.jobid || req.query.jobid
        var filepath = req.body.Filepath || req.params.Filepath || req.query.Filepath || 'i6.csv'
        processInputFile(filepath, _jobid, false, 0, function (d) {
            console.log("job run From API")
            ///req.io.sockets.emit('update', foo);   
            //req.app.io.broadcast.emit('new notification', "Job run sucessfully!"); 
            //req.app.io.socket.broadcast.emit('new notification', "Job run sucessfully!");         
            //io.socket.broadcast.emit('new notification', "Job run sucessfully!");

        });
        res.send({ "msg": "job run From API" })
    })
    var SendEmail = require('./server/controller/Sendemail.controller.js');
    router.get('/api/sendmail', function (req, res) {
        console.log("send email")
        SendEmail.sendemailToUser(198, function (d) {
            console.log("Resp frm send email")
            console.log(d)
            res.send(d)
        })
    })

    function init() {
        var schema = {
            properties: {
                inputFileLoc: {
                    description: 'Please give Input file path with filename(Ex:>C:/input.csv)',
                    required: true,
                    type: 'string',
                    pattern: ".*\.\(csv\)",
                    message: 'Not a CSV file'
                }

            }
        };
        prompt.start();
        prompt.get(schema, function (err, result) {
            appConfig.inputFilePath = result.inputFileLoc;
            LOGGER.info("Processing Input File");
            // processInputFile();
        });
    }
    var jobid, IslimitReachedTimeout=1000 * 60 * 60 * 24;
    function processInputFile(inputFilePath, jobid, isPending, indexValue, callback) {


        // console.log(jobid + "processInputFile Job Id")
        // console.log(indexValue + "stared values")

        appConfig.inputFilePath = inputFilePath;
        Excelrows = [];
        if (fs.existsSync(appConfig.inputFilePath)) {
            var rowIndex = 1;
            appData.ProcesssingJobId = jobid;
            appData.inputRowIndexToRowDataMap = {};
            appData.locationCookieMap = {};
            appData.totalCouponCount = 0;
            appData.processedCouponCount = 0;
            appData.report.totalNoOfLines = 0;
            appData.failedCouponCount = 0;
            fs.createReadStream(appConfig.inputFilePath).pipe(fastCSV()).on('data', function (rowData) {


                appData.totalCsvCount = rowData.length;
                readexcelcount(rowData)
                // return false
                var _liteVersion;
                var _outputFilePath;
                appData.Endvalue = 0;
                appData.Startvalue = indexValue;
                var _endcountvalue = 280//280
                appData.totalCsvCount = Excelrows.length;
                var endvalue = 0;
                if (appData.totalCsvCount > _endcountvalue) {
                    endvalue = parseInt(indexValue) + _endcountvalue; //no of records to be process at time

                }
                else {
                    endvalue = Excelrows.length;
                }
                appData.Endvalue = endvalue;
                // console.log(appData.totalCsvCount + "/" + _endcountvalue)
                // console.log(appData.totalCsvCount > _endcountvalue)
                //reset values
                appData.couponProcessedHits = 0
                _reccomplate = false
                if (rowIndex > 3 && !isPending && rowIndex <= appData.Endvalue) {
                    //console.log("=== records start value 0====")
                    if (rowData[7] && rowIndex > 3) {


                        appData.report.totalNoOfLines++;
                        var obj = {};

                        obj.rowIndex = rowIndex;
                        obj.drugNameReqParam = rowData[1];
                        obj.form = rowData[2];
                        obj.dosage = rowData[3];
                        obj.quantity = rowData[4];
                        obj.daysSupply = rowData[5];
                        obj.labelOverride = rowData[6];
                        obj.retryCount = 0;
                        obj.totalCouponCount = 0;
                        obj.isCallSuccess = false;
                        if (rowData[0] && rowData[7] && rowData[7].trim() !== '') {
                            obj.drugNamePathParam = rowData[0].toLowerCase();
                            obj.location = leftPad(rowData[7], 5);
                            if (appData.locationCookieMap[obj.location]) {
                                appData.locationCookieMap[obj.location].rowIndexs.push(rowIndex)
                            } else {
                                appData.locationCookieMap[obj.location] = {
                                    usageCount: 0,
                                    rowIndexs: [rowIndex],
                                    retryCount: 0,
                                    isCallSuccess: false
                                }
                            }
                            appData.report.linesParsedSuccessCount++;
                            appData.inputRowIndexToRowDataMap[rowIndex] = obj
                        } else {
                            appData.inputRowIndexToRowDataMap[rowIndex] = obj;
                            appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                            appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "No Path Param Defined";
                            appendToInputReport(rowIndex);
                            appData.report.linesParseFailureCount++;
                            LOGGER.error("Invalid Data > No Location Found or Drug Name Path Param Found for Row: " + rowIndex)
                        }
                    }
                }
                else if (rowIndex > indexValue && isPending && rowIndex <= appData.Endvalue) {
                    if (rowData[7] && rowIndex > 3) {

                        // console.log("===values in not 3 recods====" + appData.Endvalue+"/"+rowIndex)
                        appData.report.totalNoOfLines++;
                        var obj = {};

                        obj.rowIndex = rowIndex;
                        obj.drugNameReqParam = rowData[1];
                        obj.form = rowData[2];
                        obj.dosage = rowData[3];
                        obj.quantity = rowData[4];
                        obj.daysSupply = rowData[5];
                        obj.labelOverride = rowData[6];
                        obj.retryCount = 0;
                        obj.totalCouponCount = 0;
                        obj.isCallSuccess = false;
                        if (rowData[0] && rowData[7] && rowData[7].trim() !== '') {
                            obj.drugNamePathParam = rowData[0].toLowerCase();
                            obj.location = leftPad(rowData[7], 5);
                            if (appData.locationCookieMap[obj.location]) {
                                appData.locationCookieMap[obj.location].rowIndexs.push(rowIndex)
                            } else {
                                appData.locationCookieMap[obj.location] = {
                                    usageCount: 0,
                                    rowIndexs: [rowIndex],
                                    retryCount: 0,
                                    isCallSuccess: false
                                }
                            }
                            appData.report.linesParsedSuccessCount++;
                            appData.inputRowIndexToRowDataMap[rowIndex] = obj
                        } else {
                            appData.inputRowIndexToRowDataMap[rowIndex] = obj;
                            appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                            appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "No Path Param Defined";
                            appendToInputReport(rowIndex);
                            appData.report.linesParseFailureCount++;
                            LOGGER.error("Invalid Data > No Location Found or Drug Name Path Param Found for Row: " + rowIndex)
                        }
                    }

                }

                else if (rowIndex === 1 || rowIndex == indexValue) {
                    var colData;
                    colData = rowData[1] || '';
                    colData = colData.trim();
                    //Getting Lite Version, generate input excel headers
                    _liteVersion = colData[0]

                    appConfig.liteVersion = colData[0];
                    /*
                    if (colData[0].toLowerCase() === 'n') {
                        appConfig.isLiteVersion = false
                    }
                    */
                    //run only non isLiteVersion
                    appConfig.isLiteVersion = false

                } else if (rowIndex === 2) {
                    var outputFilePath;
                    var outputFileName;
                    if (rowData[1]) {
                        outputFilePath = "Output-01102018-1105.csv"
                        _outputFilePath = outputFilePath
                    }
                    if (outputFilePath) {
                        var outputFilePathSplit = outputFilePath.split("\\");
                        outputFileName = outputFilePathSplit[outputFilePathSplit.length - 1].split(".")[0];
                        outputFilePathSplit.pop();
                        appConfig.outputFilePath = "ExcelfilesDownload\\CouponIntelligence\\" + outputFilePathSplit.join("\\");
                        if (!fs.existsSync(appConfig.outputFilePath)) {
                            fs.mkdirSync(appConfig.outputFilePath)
                        }
                        appConfig.filePaths.inputReport = "ExcelfilesDownload\\CouponIntelligence\\" + outputFilePath;
                        appConfig.filePaths.pharmacyReport = appConfig.outputFilePath + "" + outputFileName + " � Drug price by pharmacy.csv";
                        appConfig.filePaths.extentReport = appConfig.outputFilePath + "" + outputFileName + " � Coupons by pharmacy.csv";
                        // appConfig.filePaths.pharmacyReport="pharmacyReport_Drug price by pharmacy.csv"
                        // appConfig.filePaths.extentReport="extentReport_Coupons by pharmacy.csv"
                        if (!isPending) {
                            fs.writeFile(appConfig.filePaths.inputReport, appConfig.csvHeaders.inputReport);
                            fs.writeFile(appConfig.filePaths.pharmacyReport, appConfig.csvHeaders.pharmacyReport);
                            !appConfig.isLiteVersion && fs.writeFile(appConfig.filePaths.extentReport, appConfig.csvHeaders.extentReport)
                        }
                    }
                }

                rowIndex++

            }).on('end', function () {
                //appData.totalCsvCount=appData.report.totalNoOfLines;
                // console.log(appData.totalCsvCount + "row index")
                LOGGER.info("Finished Processing Input File");
                LOGGER.info('APP Setting > Lite Version: ' + appConfig.isLiteVersion + ' > Input File Path: ' + appConfig.inputFilePath + ' > Output File Path: ' + appConfig.outputFilePath);
                //console.log(appConfig.inputFilePath + "input file")
                // if (isPending) { //for stop processing 
                //     return false
                // }
                if (!isPending) {
                    appData.Startvalue = indexValue;
                    //appData.Endvalue = Endvalue;
                }
                scheduleFile.WriteFileByJobIdEntry(
                    appData.ProcesssingJobId,
                    appConfig.inputFilePath,
                    appData.Startvalue,
                    appData.totalCsvCount,
                    rowIndex,
                    appConfig.filePaths.inputReport,
                    appConfig.filePaths.pharmacyReport,
                    appConfig.filePaths.extentReport,
                    function (d) {
                        if (d)
                            console.log("Percentage updated entry-->" + appData.ProcesssingJobId)
                        else
                            console.log("Percentage Not entry-->" + appData.ProcesssingJobId)
                    })
                ///return false
                var zipCodes = Object.keys(appData.locationCookieMap);
                var locationTimeout = 2000;
                for (var i = 0; i < zipCodes.length; i++) {
                    (function (n) {
                        setTimeout(function () {
                            crackLocationCookie(zipCodes[n])

                        }, CONFIG.timeouts.zipCode * n)
                    }(i))
                }
                callback("end file")

            })


        } else {
            LOGGER.error('INPUT File Error > No Such File Found in "' + appConfig.inputFilePath + '"')
        }
    }

    function crackLocationCookie(location, refresh) {
        // console.log("crackLocationCookie is called")
        //console.log(JSON.stringify(appData.locationCookieMap[location]))
        var IndexValue = 0;
        var url = "https://www.goodrx.com/change-location?location=" + location;
        request({
            uri: url,
            method: "GET"
        }, function (error, response, html) {
            var htmlParsed;
            try {
                htmlParsed = JSON.parse(html)
            } catch (err) { }
            if (!error && response.statusCode == 200) {
                if (response.headers["set-cookie"]) {
                    appData.locationCookieMap[location].isCallSuccess = true;
                    appData.locationCookieMap[location].cookieData = response.headers["set-cookie"];
                    if (!refresh) {
                        (function (loc) {
                            setTimeout(function () {
                                // processRowIndexesById(loc,IndexValue)
                                processRowIndexes(loc)
                            }, CONFIG.timeouts.default)

                        }(location))
                    }
                } else if (htmlParsed && htmlParsed.errors && htmlParsed.errors.length) {
                    LOGGER.error("ERROR: Processing Cookie > URL: " + url + " > Reason: " + html);
                    appData.locationCookieMap[location].isCallSuccess = false;
                    appData.locationCookieMap[location].noDataReason = replaceComma(htmlParsed.errors.join(','));
                    var rowIndexs = appData.locationCookieMap[location].rowIndexs;
                    rowIndexs.forEach(function (rowIndex) {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = replaceComma(htmlParsed.errors.join(','));
                        appendToInputReport(rowIndex)
                    })
                } else {
                    LOGGER.error("ERROR: Processing Cookie > URL: " + url + " > Reason: " + html);
                    appData.locationCookieMap[location].isCallSuccess = false;
                    appData.locationCookieMap[location].noDataReason = "NO SET-COOKIE FOUND";
                    var rowIndexs = appData.locationCookieMap[location].rowIndexs;
                    rowIndexs.forEach(function (rowIndex) {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "NO SET-COOKIE FOUND";
                        appendToInputReport(rowIndex)
                    })
                }

            } else if (!error && response.statusCode == 400 && htmlParsed) {
                LOGGER.error("ERROR: No Location Found > Processing Cookie > URL: " + url + " > Reason: " + html);
                try {
                    appData.locationCookieMap[location].isCallSuccess = false;
                    appData.locationCookieMap[location].noDataReason = replaceComma(htmlParsed.errors.join(','));
                    var rowIndexs = appData.locationCookieMap[location].rowIndexs;
                    rowIndexs.forEach(function (rowIndex) {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = replaceComma(htmlParsed.errors.join(','));
                        appendToInputReport(rowIndex)
                    })
                } catch (err) {
                    appData.locationCookieMap[location].isCallSuccess = false;
                    appData.locationCookieMap[location].noDataReason = "400 No Location Found";
                    var rowIndexs = appData.locationCookieMap[location].rowIndexs;
                    rowIndexs.forEach(function (rowIndex) {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "400 No Location Found";
                        appendToInputReport(rowIndex)
                    })
                }
            } else {
                appData.locationCookieMap[location].retryCount++;
                LOGGER.error("ERROR: Processing Location Cookie > URL: " + url + " > Response: " + response + " > Reason: " + html);
                appData.locationCookieMap[location].isCallSuccess = false;
                appData.locationCookieMap[location].noDataReason = "Error Processing Location Cookie";
                var rowIndexs = appData.locationCookieMap[location].rowIndexs;
                rowIndexs.forEach(function (rowIndex) {
                    appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                    appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "Error Processing Location Cookie";
                    appendToInputReport(rowIndex)
                })
            }
        })
    }
    function processRowIndexes(location) {
        var rowIndexs = appData.locationCookieMap[location].rowIndexs;
        var timeout = 1000;
        var expInc = 0;
        console.log(appData.locationCookieMap[location])
        for (var i = 0; i < rowIndexs.length; i++) {
            var rowIndex = rowIndexs[i];
            if (i % 50 === 0) {
                expInc++
            }
            var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
            var url = "https://www.goodrx.com/" + rowItem.drugNamePathParam;
            url += '?=';
            if (rowItem.drugNameReqParam) {
                url += '&drug-name=' + rowItem.drugNameReqParam
            }
            if (rowItem.dosage) {
                url += '&dosage=' + rowItem.dosage
            }
            if (rowItem.form) {
                url += '&form=' + rowItem.form
            }
            if (rowItem.quantity) {
                url += '&quantity=' + rowItem.quantity
            }
            if (rowItem.labelOverride) {
                url += '&label_override=' + rowItem.labelOverride
            }
            if (rowItem.daysSupply) {
                url += '&days_supply=' + rowItem.daysSupply
            } (function (n, rowIndexIn, urlIn) {
                setTimeout(function () {
                    rowItem.url = url;
                    console.log(urlIn)
                    getPharmaciesByLocation(rowIndexIn, urlIn)
                    //console.log(i)
                    if (i == rowIndexs.length - 1) {
                        console.log("recods comp=====")
                    }

                }, CONFIG.timeouts.pharmacy * (n + expInc))

            }(i, rowIndex, url))


        }

        // inputUrls()
    }


    function processRowIndexesById(location, index) {
        var rowIndexs = appData.locationCookieMap[location].rowIndexs;
        var timeout = 1000;
        console.log(appData.locationCookieMap[location])
        var expInc = 0;
        for (var i = index; i < rowIndexs.length; i++) {
            var rowIndex = rowIndexs[i];
            if (i % 50 === 0) {
                expInc++
            }
            var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
            var url = "https://www.goodrx.com/" + rowItem.drugNamePathParam;
            url += '?=';
            if (rowItem.drugNameReqParam) {
                url += '&drug-name=' + rowItem.drugNameReqParam
            }
            if (rowItem.dosage) {
                url += '&dosage=' + rowItem.dosage
            }
            if (rowItem.form) {
                url += '&form=' + rowItem.form
            }
            if (rowItem.quantity) {
                url += '&quantity=' + rowItem.quantity
            }
            if (rowItem.labelOverride) {
                url += '&label_override=' + rowItem.labelOverride
            }
            if (rowItem.daysSupply) {
                url += '&days_supply=' + rowItem.daysSupply
            } (function (n, rowIndexIn, urlIn) {
                setTimeout(function () {
                    rowItem.url = url;
                    //input file url generate code
                    //appendToInputCsv(rowIndexIn, rowItem)  
                    console.log(urlIn)
                    getPharmaciesByLocation(rowIndexIn, urlIn)
                    // console.log(i)
                    if (i == rowIndexs.length - 1) {
                        console.log("recods comp=====")
                    }

                }, CONFIG.timeouts.pharmacy * (n + expInc))

            }(i, rowIndex, url))


        }

        // inputUrls()
    }

    function setDelay(param1, param2, timeout, callback) {
        timeout += rateLimitReachedRetryTimeout;
        setTimeout(function () {
            callback && callback(param1, param2)
        }, timeout)
    }

    var TotalpharmacyCount = 0
    function getPharmaciesByLocation(rowIndex, url) {
        //console.log(rowIndex + "tttttttttttttttttttttttttttttttttttttttttt")
        appData.report.totalDrugsByPharmacyCount++;
        var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
        appData.totalInputReportHits++;
        appData.locationCookieMap[appData.inputRowIndexToRowDataMap[rowIndex].location].usageCount++;
        //gold price 
        var goldpriceurlIn = "https://gold.goodrx.com/" + rowItem.drugNamePathParam + "/price?q=" + rowItem.drugNamePathParam;
        getgoldprice(rowIndex, goldpriceurlIn, function (goldprice) {
            // var goldprice = 30;
            if (goldprice) {
                goldprice = goldprice
            } else {
                goldprice = "No price found"
            }
            //console.log("_goldprice===========" + goldprice)

            var curl = new Curl();
            var headers = [];
            headers.push("Cookie:" + appData.locationCookieMap[appData.inputRowIndexToRowDataMap[rowIndex].location].cookieData);
            headers.push("Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            headers.push("Accept-Language:en-US,en;q=0.8");
            headers.push("Host:www.goodrx.com");
            headers.push("Referer:" + url);
            headers.push("User-Agent:Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36");
            curl.setOpt("URL", url);
            curl.setOpt("FOLLOWLOCATION", true);
            curl.setOpt("SSL_VERIFYHOST", false);
            curl.setOpt("SSL_VERIFYPEER", false);
            curl.setOpt(Curl.option.HTTPHEADER, headers);
            //console.log(appData.report.linesParsedSuccessCount + "---------count")

            curl.on('end', function (statusCode, html, headers) {
                appData.inputReportProcessedHits++;
                try {
                    LOGGER.info("Percentage Input Report >>>>>>>>>>>>>>>>> Total Drugs: " + appData.report.linesParsedSuccessCount + " > Processed Drugs: " + appData.inputReportProcessedHits)
                } catch (err) { }
                if (statusCode == "200" && html) {
                    TotalRecordCount++
                    var $ = cheerio.load(html);

                    LOGGER.info("html code==========")
                    LOGGER.info($(this).find('#price-container').html())
                    LOGGER.info("End html code==========")

                    //return false
                    //console.log(TotalRecordCount + "---TotalRecordCount")
                    var brand = $("#configPanel").find("#drug").find(".manufacturer").text() //.find(".selector.-selected").text();
                    //console.log("=======>" + brand + "<=================")

                    var pharmacyCount = $(".price-row").length;
                    TotalpharmacyCount = pharmacyCount;
                    // console.log(pharmacyCount + "--pharmacyCount")
                    if (pharmacyCount) {
                        appData.report.drugsByPharmacySuccessCount++;
                        LOGGER.info("SUCCESS: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > URL: " + url);
                        appData.inputRowIndexToRowDataMap[rowIndex].pharmacyCount = pharmacyCount;
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = true;
                        appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap = {};
                        //schedule a task after 30 min





                        var couponNetworkArr = [];

                        $('script').each(function (i, elem) {
                            // temp = $(this).text();
                            var text = $(this).text();
                            if (text.indexOf("drug.couponNetwork =") !== -1) {
                                var couponNetwork = findTextAndReturnRemainder(text, "drug.couponNetwork =");
                                couponNetwork = JSON.parse(couponNetwork);
                                var pharmacyID = findTextAndReturnRemainder(text, "drug.pharmacyID =");
                                pharmacyID = JSON.parse(pharmacyID);
                                // console.log(result)
                                var obj = {
                                    "couponNetwork": couponNetwork,
                                    "pharmacyID": pharmacyID
                                }
                                couponNetworkArr.push(obj)
                            }
                            // console.log($(this).text());
                        });

                        // ($($('script')).text()).each(function(i,element){
                        // var text = $($('script')).text();
                        // var findAndClean = findTextAndReturnRemainder(text,"drug.couponNetwork =");
                        // var result = JSON.parse(findAndClean);
                        // console.log(result+"couponNetwork")
                        // });
                        //console.log("test------" + appData.report.linesParsedSuccessCount)
                        var finalcount = appData.report.linesParsedSuccessCount - 1
                        //console.log("final------"+finalcount)
                        //appData.report.linesParsedSuccessCount =finalcount

                        // if (appData.report.linesParsedSuccessCount > 0) {
                        //     var error = "Rate Limit reached.  Please contact api@goodrx.com to receive an API account."
                        //     scheduleFile.WriteFileByJobIdError(appData.ProcesssingJobId, finalcount, error, function (d) {
                        //         if (d)
                        //             console.log("Error updated-->" + finalcount)
                        //         else
                        //             console.log("Error Not updated-->" + finalcount)
                        //     })
                        //     return false
                        // }


                        processingRecCount = 0
                        $(".price-row").each(function (i, element) {
                            if (appConfig.expInc.pharmacyRowIndex % 50 === 0) {
                                appConfig.expInc.coupon++
                            }
                            var pharmacyIndex = 0;




                            var obj = {};
                            obj.parentId = appData.inputRowIndexToRowDataMap[rowIndex].rowIndex;
                            obj.brand = brand;
                            obj.goldprice = goldprice

                            console.log("++++++++++++++++++++++++--->" + i)
                            console.log($(this).find(".pricerow-store").find(".store-name").text())
                            console.log(url)
                            obj.store = $(this).find(".pricerow-store").find(".store-name").text();
                            // console.log($(this).find(".pricerow-store"))
                            // console.log($(this).find(".pricerow-store").find(".store-name").text())
                            // console.log("++++++++++++++++++++++++")

                            if (obj.store) {
                                //pricerow-drugprice
                                var _pharmacyID = $(this).find(".pricerow-button").find("button").attr("data-pharmacy-id")
                                obj.cashPrice = $(this).find(".pricerow-cashprice").find(".drug-price").text();
                                obj.estCashPriceText = $(this).find(".pricerow-cashprice").find(".est-price-text").text();
                                obj.drugPrice = $(this).find(".pricerow-drugprice").find(".drug-price").text();
                                console.log(obj.cashPrice + "====Price of drug======")

                                obj.drugQualifier = $(this).find(".pricerow-drugprice").find(".drug-qualifier").text();
                                obj.couponURL = $(this).find(".pricerow-button").find("button").attr("data-href");
                                obj.pharmacyID = _pharmacyID;
                                obj.linkurl = url;
                                console.log(url)
                                if (!$(this).find(".pricerow-drugprice").find(".drug-price").text()) {
                                    return false
                                }
                                couponNetworkArr.map(function (index) {
                                    if (_pharmacyID == index["pharmacyID"]) {
                                        obj.couponNetwork = index["couponNetwork"]
                                    }
                                })

                                //console.log("https://www.goodrx.com" + obj.couponURL);
                                obj.id = (appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + "_" + ($(this).find(".pricerow-button").find("button").attr("data-pharmacy-id") || uuid.v1()));
                                if (obj.couponURL && obj.couponURL["0"] === "/") {
                                    obj.method = "Coupon";
                                    obj.isCallSuccess = false;
                                    obj.retryCount = 0;
                                    obj.couponInfo = {
                                        timeout: 5000
                                    };
                                    obj.timeout = 5000;
                                    appData.totalCouponCount++;
                                    appData.inputRowIndexToRowDataMap[rowIndex].totalCouponCount++
                                }
                                processingRecCount++
                                //console.log(appData.totalCouponCount + "-----------------")
                                //console.log(appData.report.totalNoOfLines)
                                // console.log(processingRecCount + "-------processingRecCount")

                                // console.log("appConfig isLiteVersion " + !appConfig.isLiteVersion && false)
                                // console.log("=================================")
                                appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[obj.id] = obj;

                                if (!appConfig.isLiteVersion && false) {
                                    console.log("13333")
                                    if (obj.method === "Coupon") {
                                        appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[obj.id].timeout = (3000 + Math.floor((Math.random() * 1000) + 1));
                                        (function (n, rowIndexIn, objIdIn) {
                                            setTimeout(function () {
                                                console.log("crackCoupon is called")
                                                crackCoupon(rowIndexIn, objIdIn)
                                            }, CONFIG.timeouts.coupon * (n + appConfig.expInc.coupon))
                                        }(i, rowIndex, obj.id))
                                    }
                                }
                                pharmacyIndex++;

                                appendToPharmacyReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex, obj.id)

                            } else if ($(this).find(".pricerow-disclaimer").text() && $(this).find(".pricerow-disclaimer").text().toLowerCase() === "sponsored") {
                                console.log("123455")
                                obj.store = "manufacturer coupon";
                                obj.id = uuid.v1();
                                appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[obj.id] = obj;
                                appendToPharmacyReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex, obj.id);
                                !appConfig.isLiteVersion && appendToExtentReport(rowIndex, obj.id)
                            }
                            else {
                                console.log("Fail===")
                                //return true
                                //processCoupons()
                                obj.store = "No data found";
                                obj.id = uuid.v1();
                                appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[obj.id] = obj;
                                appendToPharmacyReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex, obj.id);
                                !appConfig.isLiteVersion && appendToExtentReport(rowIndex, obj.id)
                            }

                            appConfig.expInc.pharmacyRowIndex++
                        });
                        //console.log(rowIndex + "====stop rowIndex")

                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    } else if (html.indexOf("We looked everywhere, but we couldn't find your drug. :(") >= 0) {
                        console.log("1234577")
                        appData.report.drugsByPharmacyFailureCount++;
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "We looked everywhere, but we couldn't find your drug. :(";
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + appData.inputRowIndexToRowDataMap[rowIndex].noDataReason + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    } else if (html.indexOf("Rate Limit reached.  Please contact api@goodrx.com to receive an API account.") >= -1) {
                        (function (rowIndexIn, urlIn) {
                            appConfig.expInc.rateLimitReached++;
                            setTimeout(function () {
                                getPharmaciesByLocation(rowIndexIn, urlIn)

                            }, 1000 * 60 * 60 * (appConfig.expInc.rateLimitReached))
                        }(rowIndex, url))

                        console.log("1234578")
                        var error = "Rate Limit reached.  Please contact api@goodrx.com to receive an API account."
                        scheduleFile.WriteFileByJobIdError(appData.ProcesssingJobId, appData.report.linesParsedSuccessCount, error, function (d) {
                            if (d)
                                console.log("Error updated-->" + appData.report.linesParsedSuccessCount)
                            else
                                console.log("Error Not updated-->" + appData.report.linesParsedSuccessCount)
                        })

                    } else if ($(".pricepanel-title").text()) {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = replaceComma($(".pricepanel-title").text());
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + appData.inputRowIndexToRowDataMap[rowIndex].noDataReason + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    } else {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "200 Error Data";
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + html + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    }
                    // })
                }
                else if (html) {
                    var $ = cheerio.load(html);
                    console.log(html.indexOf("Rate Limit reached.  Please contact api@goodrx.com to receive an API account.") + "=====Rate Limit reached Error Index")
                    if (html.indexOf("We looked everywhere, but we couldn't find your drug. :(") >= 0) {
                        console.log("We looked everywhere, but we couldn't find your drug")
                        appData.report.drugsByPharmacyFailureCount++;
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "We looked everywhere, but we couldn't find your drug. :(";
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + appData.inputRowIndexToRowDataMap[rowIndex].noDataReason + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    } else if (html.indexOf("Rate Limit reached.  Please contact api@goodrx.com to receive an API account.") >= -1) {

                        // var error = "Rate Limit reached.  Please contact api@goodrx.com to receive an API account. form 2"
                        // scheduleFile.WriteFileByJobIdError(appData.ProcesssingJobId, appData.report.linesParsedSuccessCount, error, function (d) {
                        //     if (d)
                        //         console.log("Error updated-->" + appData.report.linesParsedSuccessCount)
                        //     else
                        //         console.log("Error Not updated-->" + appData.report.linesParsedSuccessCount)
                        // })
                        (function (rowIndexIn, urlIn) {
                            console.log("===========limit reched============" + appData.report.linesParsedSuccessCount)
                            appConfig.expInc.rateLimitReached++;
                            setTimeout(function () {
                                getPharmaciesByLocation(rowIndexIn, urlIn)

                            }, 1000 * 60 * 60 * (appConfig.expInc.rateLimitReached))
                        }(rowIndex, url))
                    } else if ($(".pricepanel-title").text()) {
                        console.log($(".pricepanel-title").text() + "Price text")
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = replaceComma($(".pricepanel-title").text());
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + appData.inputRowIndexToRowDataMap[rowIndex].noDataReason + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    } else {
                        appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                        appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = "200 Error Data";
                        LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + html + " > URL: " + url);
                        appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex)
                    }
                } else {
                    appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                    appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = statusCode + " Error Data";
                    LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + html + " > URL: " + url)
                }
                console.log("processing hits")
                // console.log(appData.report.linesParsedSuccessCount)
                // console.log(appData.inputReportProcessedHits)
                if (appData.report.linesParsedSuccessCount === appData.inputReportProcessedHits) {
                    if (!appConfig.isLiteVersion) {
                        LOGGER.info("Process Coupons Initiated");
                        //return false
                        processCoupons()
                    }
                }

                if (processingRecCount === TotalpharmacyCount && TotalRecordCount === appData.report.linesParsedSuccessCount) {



                }
                this.close()
            }); curl.on('error', function (err, curlErrCode) {
                appData.inputReportProcessedHits++;
                try {
                    LOGGER.info("Percentage Input Report >>>>>>>>>>>>>>>>> Total Drugs: " + appData.report.linesParsedSuccessCount + " > Processed Drugs: " + appData.inputReportProcessedHits)
                } catch (err) { }
                appData.inputRowIndexToRowDataMap[rowIndex].isCallSuccess = false;
                appData.inputRowIndexToRowDataMap[rowIndex].noDataReason = curlErrCode + " " + replaceComma(err);
                LOGGER.error("ERROR: Processing | getPharmaciesByLocation > Row Index: " + appData.inputRowIndexToRowDataMap[rowIndex].rowIndex + " > Failure Reason: " + err + " > URL: " + url);
                appendToInputReport(appData.inputRowIndexToRowDataMap[rowIndex].rowIndex);
                if (appData.report.linesParsedSuccessCount === appData.inputReportProcessedHits) {
                    if (!appConfig.isLiteVersion) {
                        LOGGER.info("Process Coupons Initiated");
                        processCoupons()
                    }
                }
                this.close()

            }); curl.perform()
        })


    }

    function getgoldprice(rowIndex, url, callback) {


        var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];

        var curl = new Curl();
        var headers = [];
        headers.push("Cookie:" + appData.locationCookieMap[appData.inputRowIndexToRowDataMap[rowIndex].location].cookieData);
        headers.push("Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        headers.push("Accept-Language:en-US,en;q=0.8");
        headers.push("Host:www.gold.goodrx.com");
        headers.push("Referer:" + url);
        headers.push("User-Agent:Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36");
        curl.setOpt("URL", url);
        curl.setOpt("FOLLOWLOCATION", true);
        curl.setOpt("SSL_VERIFYHOST", false);
        curl.setOpt("SSL_VERIFYPEER", false);
        curl.setOpt(Curl.option.HTTPHEADER, headers);
        console.log(url)

        curl.on('end', function (statusCode, html, headers) {
            if (statusCode == "200" && html) {
                var $ = cheerio.load(html);
                var goldprice = $(".logged-out-price-page").find(".pt-4.mb-4").text()
                //console.log(goldprice)
                if (goldprice.indexOf("$") > -1) {
                    goldprice = goldprice.split("$")[1].split(" ")[0]
                    //  console.log(goldprice + "---==========>goldprice")
                    callback(goldprice)
                } else
                    callback(false)

                //            LOGGER.info("Gold price processing html code--->"+html)
                //           console.log("Gold price processing html code--->"+html)
            }
            else {
                callback(false)
            }
            this.close()
        });
        curl.on('error', function (err, curlErrCode) {
            callback(false)
            this.close()

        });
        curl.perform()

    }

    function processCoupons() {
        var rowIndexs = Object.keys(appData.inputRowIndexToRowDataMap);
        var indexInc = 0;
        for (var i = 0; i < rowIndexs.length; i++) {
            var rowIndex = rowIndexs[i];
            var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
            if (rowItem && rowItem.pharmacyInfoMap) {
                var pharmacyIndexs = Object.keys(rowItem.pharmacyInfoMap);
                for (var j = 0; j < pharmacyIndexs.length; j++) {
                    var pharmacyIndex = pharmacyIndexs[j];
                    var pharmacyObj = rowItem.pharmacyInfoMap[pharmacyIndex];
                    if (pharmacyObj.method === "Coupon") {
                        indexInc++;
                        (function (rowIndexIn, pharmacyIndexIn) {
                            setTimeout(function () {
                                crackCoupon(rowIndexIn, pharmacyIndexIn)
                            }, CONFIG.timeouts.coupon * indexInc)
                        }(rowIndex, pharmacyIndex))
                    }
                }
            }
        }
    }

    function crackCoupon(rowIndex, pharmacyIndex) {
        scheduleFile.UpdateFileCountByJobId(appData.ProcesssingJobId, rowIndex, function (d) {
            console.log("record updated coupan count")
        })
        console.log(rowIndex)
        console.log(pharmacyIndex)
        appData.totalCouponHits++;
        if (!appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex]) {
            return false
        }
        var url = "https://www.goodrx.com" + appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponURL;
        LOGGER.info("Processing Coupon > Row Index: " + rowIndex + " >  Pharmacy Index: " + pharmacyIndex + " > URL > " + url);
        var curl = new Curl();
        var headers = [];
        headers.push("Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        headers.push("Accept-Language:en-US,en;q=0.8");
        headers.push("Host:www.goodrx.com");
        headers.push("Referer:" + url);
        headers.push("User-Agent:Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36");
        curl.setOpt("URL", url);
        curl.setOpt("FOLLOWLOCATION", true);
        curl.setOpt("SSL_VERIFYHOST", false);
        curl.setOpt("SSL_VERIFYPEER", false);
        curl.on('end', function (statusCode, html, headers) {
            appData.couponProcessedHits++;
            try {
                LOGGER.info("Percentage Processed Coupon >>>>>>>>>>>>>>>>> Total Coupons: " + appData.totalCouponCount + " > Processed Coupon Count: " + appData.couponProcessedHits)
            } catch (err) { }
            LOGGER.info("Done Processing Coupon > statusCode: " + statusCode + " > Row Index: " + rowIndex + " >  Pharmacy Index: " + pharmacyIndex + " > URL > " + url);
            if (statusCode == "200" && html) {




                // if (appData.report.linesParsedSuccessCount > 0) {
                //     var error = "Rate Limit reached.  Please contact api@goodrx.com to receive an API account."
                //     scheduleFile.WriteFileByJobIdError(appData.ProcesssingJobId, finalcount, error, function (d) {
                //         if (d)
                //             console.log("Error updated-->" + finalcount)
                //         else
                //             console.log("Error Not updated-->" + finalcount)
                //     })
                //     return false
                // }
                var $ = cheerio.load(html);
                if (html.indexOf("Rate Limit reached.  Please contact api@goodrx.com to receive an API account.") >= 0) {
                    var error = "Rate Limit reached.  Please contact api@goodrx.com to receive an API account. from 4"
                    scheduleFile.WriteFileByJobIdError(appData.ProcesssingJobId, appData.report.linesParsedSuccessCount, error, function (d) {
                        if (d)
                            console.log("Error updated-->" + appData.report.linesParsedSuccessCount)
                        else
                            console.log("Error Not updated-->" + appData.report.linesParsedSuccessCount)
                    })
                        (function (rowIndexIn, objIdIn) {
                            appConfig.expInc.rateLimitReached++;
                            setTimeout(function () {
                                crackCoupon(rowIndexIn, objIdIn)
                            }, 1000 * 60 * 60 * (appConfig.expInc.rateLimitReached))
                        }(rowIndex, pharmacyIndex))
                } else if ($(".span12").find("h1.light-text") && $(".span12").find("h1.light-text").text().indexOf("HTTP Error 404") >= 0) {
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].isCallSuccess = false;
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.noDataReason = "Page Not Found(Error 404)";
                    appData.failedCouponCount++;
                    appendToExtentReport(rowIndex, pharmacyIndex)
                } else if ($(".pharmacist-info").find("dl")) {
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].isCallSuccess = true;
                    LOGGER.info("SUCCESS: Processing Coupon > Row Index: " + rowIndex + " > Pharmacy Index: " + pharmacyIndex + " > URL > " + url);
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.memberId = $(".pharmacist-info").find("dl").find("dd:nth-child(2)").find("span").text() + "";
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.rxGroup = $(".pharmacist-info").find("dl").find("dd:nth-child(4)").find("span").text() + "";
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.rxBin = $(".pharmacist-info").find("dl").find("dd:nth-child(6)").find("span").text() + "";
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.rxPCN = $(".pharmacist-info").find("dl").find("dd:nth-child(8)").find("span").text() + "";
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.timestamp = getCurrentDate();
                    appData.processedCouponCount++;
                    appendToExtentReport(rowIndex, pharmacyIndex)
                } else {
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].isCallSuccess = false;
                    appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.noDataReason = "200 No Data Found";
                    appData.failedCouponCount++;
                    appendToExtentReport(rowIndex, pharmacyIndex)
                }
            } else if (html && html.indexOf("Rate Limit reached.  Please contact api@goodrx.com to receive an API account.") >= 0) {
                (function (rowIndexIn, objIdIn) {
                    appConfig.expInc.rateLimitReached++;
                    setTimeout(function () {
                        crackCoupon(rowIndexIn, objIdIn)
                    }, 1000 * 60 * 60 * (appConfig.expInc.rateLimitReached))
                }(rowIndex, pharmacyIndex))
            } else {
                appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].isCallSuccess = false;
                appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.noDataReason = statusCode + " No Data Found";
                appData.failedCouponCount++
            }
            console.log(appData.totalCouponCount + " / " + appData.couponProcessedHits)
            console.log(appData.Endvalue + " / " + rowIndex)
            if (appData.totalCouponCount == appData.couponProcessedHits) {

                console.log("processing is finesh value--> " + appData.Endvalue)

                scheduleFile.WriteFileByJobId(appData.ProcesssingJobId, appData.report.linesParsedSuccessCount, function (d) {
                    if (d)
                        console.log("Percentage updated-->" + appData.report.linesParsedSuccessCount)
                    else
                        console.log("Percentage Not updated-->" + appData.report.linesParsedSuccessCount)
                    console.log("Files are finesh")
                    console.log(rowIndex)
                    console.log(appData.report.linesParsedSuccessCount)
                    scheduleFile.ReadFileByJobId(appData.ProcesssingJobId, function (data) {
                        console.log(data["Total Values"])
                        console.log(data["Total Values"] == rowIndex)
                        if (data["Total Values"] == rowIndex) {
                            SendEmail.sendemailToUser(appData.ProcesssingJobId, function (d) {
                                console.log("mail send sucess")
                                console.log(d)
                            })
                        }
                        else {
                            //var date = '* ' + minute + ' ' + hour + ' ' + dayofmonth + ' ' + month + ' ' + dayofweek;
                            var date = '* 1 * * * *'
                            //console.log(date)
                            var waitTime = 30 * 60 * 1000; // = 30min.
                            setTimeout(function () {
                                scheduleFile.ReadFileByJobId(appData.ProcesssingJobId, function (data) {
                                    //console.log(data)
                                    if (data) {
                                        processInputFile(data.InputFile, appData.ProcesssingJobId, true, data["End Value"], function (d) {
                                            console.log("job run From Time interval")
                                        });
                                    }
                                    else {
                                        console.log("Inavlid Job")
                                    }
                                })
                                console.log("Job run sucessfully!")
                            }, waitTime);
                        }


                    })

                })

            }

            this.close()
        });
        curl.on('error', function (err, curlErrCode) {
            appData.couponProcessedHits++;
            LOGGER.info("Percentage Processed Coupon >>>>>>>>>>>>>>>>> Total Coupons: " + appData.totalCouponCount + " > Processed Coupon Count: " + appData.couponProcessedHits);
            appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].isCallSuccess = false;
            appData.inputRowIndexToRowDataMap[rowIndex].pharmacyInfoMap[pharmacyIndex].couponInfo.noDataReason = curlErrCode + " " + replaceComma(err);
            appData.failedCouponCount++;
            appendToExtentReport(rowIndex, pharmacyIndex);
            this.close()
        });
        curl.perform()


    }


    function appendToInputReport(rowIndex) {
        console.log("")
        console.log(rowItem)
        console.log(appConfig.filePaths.inputReport + "=======Path")
        var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
        var rowDataCSV = replaceComma(rowItem.rowIndex) + ',' + replaceComma(rowItem.drugNamePathParam) + ',' + replaceComma(rowItem.drugNameReqParam) + ',' + replaceComma(rowItem.form) + ',' + replaceComma(rowItem.dosage) + ',' + replaceComma(rowItem.quantity) + ',' + replaceComma(rowItem.daysSupply) + ',' + replaceComma(rowItem.labelOverride) + ',' + replaceComma(rowItem.location) + ',' + (rowItem.isCallSuccess ? "SUCCESS" : "FAILURE") + ',' + replaceComma(rowItem.pharmacyCount) + ',' + replaceComma(rowItem.totalCouponCount) + ',' + replaceComma(rowItem.noDataReason) + '\n';
        fs.appendFile(appConfig.filePaths.inputReport, rowDataCSV)

    }

    function appendToPharmacyReport(rowIndex, pharmacyIndex) {

        var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
        var pharmacyItem = rowItem.pharmacyInfoMap[pharmacyIndex];
        var rowDataCSV = replaceComma(pharmacyItem.id) + ',' + replaceComma(pharmacyItem.parentId) + ',' + replaceComma(pharmacyItem.drugPrice, '') + ',' + replaceComma(pharmacyItem.drugQualifier) + ',' + replaceComma(pharmacyItem.cashPrice, '') + ',' + replaceComma(pharmacyItem.estCashPriceText) + ',' + replaceComma(pharmacyItem.store) + ',' + replaceComma(rowItem.drugNamePathParam) + ',' + replaceComma(rowItem.form) + ',' + replaceComma(rowItem.dosage, '') + ',' + replaceComma(rowItem.quantity, '') + ',' + replaceComma(rowItem.labelOverride) + ',' + replaceComma(rowItem.location) + ',' + replaceComma(pharmacyItem.method) + ',' + replaceComma(pharmacyItem.pharmacyID) +
            ',' + replaceComma(pharmacyItem.brand) + ',' + replaceComma(pharmacyItem.couponNetwork) + ',' + replaceComma(pharmacyItem.goldprice, '') + ',' + pharmacyItem.linkurl + '\n';
        fs.appendFile(appConfig.filePaths.pharmacyReport, rowDataCSV)

    }

    function appendToExtentReport(rowIndex, pharmacyIndex) {

        var rowItem = appData.inputRowIndexToRowDataMap[rowIndex];
        var pharmacyItem = rowItem.pharmacyInfoMap[pharmacyIndex];
        var couponInfo = pharmacyItem.couponInfo || {};
        var rowDataCSV = replaceComma(pharmacyItem.id) + ',' + replaceComma(pharmacyItem.parentId) + ',' + replaceComma(pharmacyItem.drugPrice, '') + ',' + replaceComma(pharmacyItem.drugQualifier) + ',' + replaceComma(pharmacyItem.cashPrice, '') + ',' + replaceComma(pharmacyItem.estCashPriceText) + ',' + replaceComma(pharmacyItem.store) + ',' + replaceComma(rowItem.drugNamePathParam) + ',' + replaceComma(rowItem.form) + ',' + replaceComma(rowItem.dosage, '') + ',' + replaceComma(rowItem.quantity, '') + ',' + replaceComma(rowItem.labelOverride) + ',' + replaceComma(rowItem.location) + ',' + replaceComma(couponInfo.memberId) + ',' + replaceComma(couponInfo.rxGroup) + ',' + replaceComma(couponInfo.rxBin) + ',' + replaceComma(couponInfo.rxPCN) + ',' + (pharmacyItem.isCallSuccess ? "SUCCESS" : "FAILURE") + ',' + replaceComma(couponInfo.noDataReason) + ',' + replaceComma(pharmacyItem.pharmacyID) +
            ',' + replaceComma(pharmacyItem.brand) + ',' + replaceComma(pharmacyItem.couponNetwork) + ',' + replaceComma(pharmacyItem.goldprice, '') + ',' + pharmacyItem.linkurl + '\n';
        fs.appendFile(appConfig.filePaths.extentReport, rowDataCSV)

    }

    function appendToInputCsv(rowIndex, item) {

        console.log(item.url + "++++++++++")
        //daysSupply	
        console.log(rowIndex)
        if (rowIndex == 4) {
            //appConfig.filePaths.inputReport, appConfig.isLiteVersion
            var inputFileHeader = "Lite Version(Y/N)," + appConfig.liteVersion + "\n" + "Output File Location," + appConfig.filePaths.inputReport + "\n" + "Drug Name (url/lipitor),Drug Name (?drug-name=lipitor),Form,Dosage,Quantity,Days Supply,Label Override,Location, URL\n"
            fs.writeFile(appConfig.inputFilePath.split(".csv")[0] + "_new.csv", inputFileHeader);
        }
        var rowDataCSV = replaceComma(item.drugNamePathParam) + ',' + replaceComma(item.drugNameReqParam) + ',' + replaceComma(item.form, '') + ',' +
            replaceComma(item.dosage) + ',' + replaceComma(item.quantity, '') + ',' + replaceComma(item.daysSupply, '') + ',' +
            replaceComma(item.labelOverride, '') + ',' + replaceComma(item.location) + ',' + replaceComma(item.url) + '\n';
        fs.appendFile(appConfig.inputFilePath.split(".csv")[0] + "_new.csv", rowDataCSV)

    }

    function replaceComma(str, delimeter) {
        delimeter = delimeter || '';
        if (typeof str != 'undefined' && str != null && str != "") {
            str = '"' + str + '"';
            return str
        } else {
            return " "
        }
    }

    function objToString(obj) {
        var str = '';
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str += p + '::' + obj[p] + ' | '
            }
        }
        return str
    }

    function leftPad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
    }

    function getCurrentDate(format) {
        var formattedDate = moment(new Date()).format(format || appConfig.dateTimeFormat);
        return formattedDate
    }

    function findTextAndReturnRemainder(target, variable) {
        var chopFront = target.substring(target.search(variable) + variable.length, target.length);
        var result = chopFront.substring(0, chopFront.search(";"));
        return result;
    }
    var Excelrows = [];
    function readexcelcount(data) {
        Excelrows.push(data);
        //console.log(Excelrows.length + "======= of recods in excel file ========")
    }
}
module.exports = restapi;
//init();
//module.exports={processInputFile}
