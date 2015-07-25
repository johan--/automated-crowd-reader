//Express setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var port = process.env.PORT || 1337;

app.get('/', function (req, res) {

  res.send("server is running, this is root pah");

});


app.post('/myo_command/:command', function (req, res) {
  var command = req.param("command");
  console.log(command);
  switch (command) {
    case "volume_up":
      break;
    case "volume_down":
      break;
    case "next_track":
      break;
    case "previous_track":
      break;
    case "play":
      break;
    case "start_stop":
      break;
  }



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
var dataCache = [];

//SocketIO setup
var sockets = [];
var io = require('socket.io')(server);
io.on('connection', function (socket) {
  var currentState = {
    "volume": volumeCounter,
    "genre": genreCounter
  };
  socket.emit('connected', currentState);
  sockets.push(socket);

  socket.on('volume', function (data) {
    console.log("recieved volume: " + data);
    switch (data) {
      case "+1":
        volumeCounter++;
        break;
      case "-1":
        volumeCounter--;
        break;
    }

    socket.emit('volume', volumeCounter);
  });

  socket.on('genre', function (data) {
    console.log("recieved genre: " + data);
    var key = Object.keys(data)[0];
    switch (data[key]) {
      case "+1":
        if (genreCounter[key] == undefined) genreCounter[key] = 0;
        genreCounter[key]++;
        break;
      case "-1":
        if (genreCounter[key] == undefined) genreCounter[key] = 0;
        genreCounter[key]--;
        break;
    }
    console.log(JSON.stringify(genreCounter));
    socket.emit('genre', genreCounter);
  });




});

