var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());
var port = process.env.PORT || 1337;


app.get('/', function (req, res) {
 
 res.send("hahaha");

});

app.post('/', function (req, res) {
 
 console.log("reqest: "+JSON.stringify(req.body));
 res.send("post hahahah");

});




var server = app.listen(port, function () {

  var host = server.address().address;
  var port = server.address().port;




  console.log('Example app listening at http://%s:%s', host, port);
});
