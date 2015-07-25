//Express setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var port = process.env.PORT || 1337;


app.get('/', function (req, res) {

  res.send("hahaha");

});

app.post('/', function (req, res) {

  console.log("reqest: " + JSON.stringify(req.body));
  res.send("post hahahah");

});


app.post('/music_command/:command', function (req, res) {

  var command = req.param("command");
  console.log("reqest: " + JSON.stringify(req.body));
  res.send("post hahahah");

});

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Raspberry Pi server listening at http://%s:%s', host, port);
});


var volumeCounter = 0;
//Key is genre name, value is vote count
var genreCounter = {};

//SocketIO setup
var sockets = [];
var io = require('socket.io')(server);
io.on('connection', function (socket) {
  socket.emit('connected', 'connected To Raspberry-pi Server');
  sockets.push(socket);

  socket.on('volume', function (data) {
    console.log(data);
  });

  socket.on('genre', function (data) {
    console.log(data);
  });
  
   socket.on('myo_command', function (data) {
    console.log(data);
  });


});