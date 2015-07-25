//Express setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var port = process.env.PORT || 1337;

app.get('/', function (req, res) {
  res.send("server is running, this is root pah");
});

var harmonIp = '';
var harmonSession ='';
app.post('/myo_command/:command', function (req, res) {
  var command = req.param("command");
  console.log("myo)_command: "+command);
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
 res.send("got command: "+command);

});


var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Raspberry Pi server listening at http://%s:%s', host, port);
});

var volumeCounter = 0;
//Key is genre name, value is vote count
var genreCounter = {};
var crowdCounter =0;
var currentSong = {};
//Cached Data to poll to M2X
var dataCache = [];


//M2X
var config = require("./config");
var M2X = require("m2x");
var m2xClient = new M2X(config.api_key);

//Push data to M2X
setInterval(function(){
         var data = dataCache.shift();
          if(data!==undefined)
          {
         var values = {
                temperature:  [ { value: 50, timestamp: data.timestamp } ],
                long: [ { value: crowdCounter, timestamp: data.timestamp } ]
            };
            console.log("sending: "+JSON.stringify(values));

            // Write the different values into AT&T M2X
            m2xClient.devices.postMultiple(config.device, values, function(result) {
                console.log(result);
            });

          }

}, 4000);

//SocketIO setup
var sockets = [];
var io = require('socket.io')(server);
io.on('connection', function (socket) {
  var currentState = {
    "volume": volumeCounter,
    "genre": genreCounter,
    "currentSong": currentSong
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

    io.emit('volume', volumeCounter, { for: 'everyone' });
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
    io.emit('genre', genreCounter, { for: 'everyone' });
  });

  socket.on('change_song', function(data) {
    currentSong = data;

    io.emit('change_song', currentSong, { for: 'everyone' });
  });




});

