//Express setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var port = process.env.PORT || 1337;

app.get('/', function (req, res) {

  res.send("server is running, this is root pah");

});

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Raspberry Pi server listening at http://%s:%s', host, port);
});

var volumeCounter = 0;
//Key is genre name, value is vote count
var genreCounter = {};
//Cached Data to poll to M2X
var dataCache=[];

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