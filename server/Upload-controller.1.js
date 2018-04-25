function restapi(router,bodyParser) {
    var self = this;
    self.handleRoutes(router, bodyParser);
}
restapi.prototype.handleRoutes = function (router, bodyParser) {
    router.post('/api/uploadFile', function (req, res) {
        res.send("Sending file")
    })
}

module.exports = restapi;