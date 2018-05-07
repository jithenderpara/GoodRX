function restapi(router,bodyParser) {
    var self = this;
    self.handleRoutes(router, bodyParser);
}
restapi.prototype.handleRoutes = function (router, bodyParser) {
    var multer  = require('multer')
    var upload = multer({ dest: 'uploads/' })
    router.post('/uploadFile', upload.single('uploadFile'), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
    })
}

module.exports = restapi;