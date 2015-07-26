//Express setup
var express = require('express');
var libUtil = require('util');
var libBleacon = require('bleacon');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var port = process.env.PORT || 1337;

var request = require('request');

app.get('/', function (req, res) {
  res.send("server is running, this is root pah");
});

var harmonIp = 'http://10.0.1.13:8080';
var harmonSession = '';
var currentVolume = 0;
var playLists = [];
var currentPlayingId = 0;

request(harmonIp + '/v1/init_session', function(error, resp, body) {
  if (!error && resp.statusCode == 200) {
    console.log(body);
    harmonSession = JSON.parse(body).SessionID;
    console.log('Connect to Harmon -- session id ' + harmonSession);

    request(
      harmonIp + '/v1/set_party_mode?SessionID=' + harmonSession,
      function(err, res, body) {
        if (!err) {
          console.log('Set to party mode');
        }
      });

    request(
      harmonIp + '/v1/get_volume?SessionID=' + harmonSession,
      function(error, resp, body) {
        currentVolume = JSON.parse(JSON.parse(body).Volume);
        console.log('Current Volume ' + currentVolume);
      }
    );

    request(
      harmonIp + '/v1/media_list?SessionID=' + harmonSession,
      function(err, res, body) {
        playLists = JSON.parse(body).MediaList;

        console.log('Got play list:');
        console.log(playLists);
      }
    );
  } else {
    console.log('Failed to connect to Harmon');
    console.log(error);
  }
});

app.post('/myo_command/:command', function (req, res) {
  var command = req.param("command");
  console.log("myo)_command: "+command);
  switch (command) {
    case "volume_up":
      currentVolume += 5;
      request(harmonIp + '/v1/set_volume?SessionID=' + harmonSession +
        '&Volume=' + currentVolume, function(err, res, body) {
          console.log('Volume changed to ' + currentVolume);
        });
      break;
    case "volume_down":
      currentVolume -= 5;
      request(harmonIp + '/v1/set_volume?SessionID=' + harmonSession +
        '&Volume=' + currentVolume, function(err, res, body) {
          if (!err) {
            console.log('Volume changed to ' + currentVolume);
          }
        });
      break;
    case "next_track":
      if (currentPlayingId < playLists.length - 1) {
        currentPlayingId ++;
      } else {
        currentPlayingId = 0;
      }
      request(
        harmonIp + '/v1/play_hub_media?SessionID=' + harmonSession +
          '&PersistentID=' + playLists[currentPlayingId].PersistentID,
        function(err, res, body) {
          if (!err) {
            console.log('Start playing song');
          }
        });
      io.emit('change_song',
        {
          PersistentID: playLists[currentPlayingId].PersistentID
        },
        { for: 'everyone' }
      );
      currentSong = playLists[currentPlayingId];
      break;
    case "previous_track":
      if (currentPlayingId > 0) {
        currentPlayingId --;
      } else {
        currentPlayingId = playLists.length - 1;
      }
      request(
        harmonIp + '/v1/play_hub_media?SessionID=' + harmonSession +
          '&PersistentID=' + playLists[currentPlayingId].PersistentID,
        function(err, res, body) {
          if (!err) {
            console.log('Start playing song');
          }
        });
      io.emit('change_song',
        {
          PersistentID: playLists[currentPlayingId].PersistentID
        },
        { for: 'everyone' }
      );
      currentSong = playLists[currentPlayingId];
      break;
    case "play":
      console.log(playLists[currentPlayingId].PersistentID);
      request(
        harmonIp + '/v1/play_hub_media?SessionID=' + harmonSession +
          '&PersistentID=' + playLists[currentPlayingId].PersistentID,
        function(err, res, body) {
          console.log(body);
          if (!err) {
            console.log('Start playing song');
          }
        });
      io.emit('change_song',
        {
          PersistentID: playLists[currentPlayingId].PersistentID
        },
        { for: 'everyone' }
      );
      currentSong = playLists[currentPlayingId];
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
             console.log("timestamp value: "+data.timestamp);
             var values = {
                rssi:  [ { value: data.rssi, timestamp: data.timestamp }]
            };
            console.log("sending: to M2X");

            // Write the different values into AT&T M2X
            m2xClient.devices.postMultiple(config.device, values, function(result) {
               // console.log(result);
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
      case "reset":
        volumeCounter = 0;
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
/* format(uuid is unique):
{ id: '721e8bed36a69719',
  uuid: 'd0d3fa86ca7645ec9bd96af4721e8bed36a69719',
  type: 'SB0',
  firmware: 'unknown',
  bootloader: 'SB1.0.0',
  temperature: 26.25,
  moving: true,
  batteryLevel: 'unknown',
  acceleration: { x: -31.25, y: -62.5, z: -937.5 },
  currentMotionStateDuration: 0,
  previousMotionStateDuration: 360,
  power: 4,
  firmwareState: 'app',
  rssi: -81 }
*/
/*var nodelist = {};
var nAverageSamples = 3;
var bDanceMode = 0;
var EstimoteSticker = require('./estimote-sticker');
EstimoteSticker.on('discover', function(estimoteSticker) {
 // console.log(estimoteSticker);
   //nodelist[estimoteSticker.uuid] = estimoteSticker.id;
   //console.log(JSON.stringify(nodelist));

	var uuid = estimoteSticker.id;
	var rssi = estimoteSticker.rssi;

	if (!(uuid in nodelist)) {
		nodelist[uuid] = {rssiarray: []};
	}

	nodelist[uuid].rssi = rssi;

	var rssiArray = nodelist[uuid].rssiarray;
	rssiArray.push(rssi);

	if (rssiArray.length > nAverageSamples) {
		rssiArray.shift();
	}

	var nRssiTotal = 0;
	var nRssiEntries = rssiArray.length;

	rssiArray.map(function(curEntry) {
		nRssiTotal += curEntry;
	});

	nodelist[uuid].averagerssi = Math.round(nRssiTotal / nRssiEntries);

	var logArray = [];
	var nCloseNodes = 0;
	Object.keys(nodelist).map(function(curKey) {
		logArray.push(nodelist[curKey].averagerssi);
		if (nodelist[curKey].averagerssi > -80) {
			nCloseNodes ++;
		}
	});

	var nNodes = Object.keys(nodelist).length;

	if (nCloseNodes / nNodes > 0.5 && nCloseNodes >=3) {
		if (bDanceMode === 0) {
			bDanceMode = 1;
		    currentVolume = 35;
		  request(harmonIp + '/v1/set_volume?SessionID=' + harmonSession +
			'&Volume=' + currentVolume, function(err, res, body) {
			  console.log('Volume changed to ' + currentVolume);
			});
		}
			
		console.log(libUtil.inspect(logArray) + ' Half of nodes are close');
	} else {
		console.log(libUtil.inspect(logArray));
	}

    var at = Date.now();
    at = new Date(at).toISOString();

    var output = {
       
        "temperature": estimoteSticker.temperature,
        "rssi": estimoteSticker.rssi,
        "moving": estimoteSticker.moving==true?1:0,
         "timestamp" : at,
        "crowdcount": nCloseNodes
            
    };
        dataCache.push(output);
});

EstimoteSticker.startScanning();*/

var nodelist = {};
var trackingTimeout = 5000;
var nearThreshold = -65;
var nAverageSamples = 10;
var bDanceMode = 0;
var targetUuid = '8492e75f4fd6469db132043fe94921d8';

libBleacon.startScanning([targetUuid]);

libBleacon.on('discover', function(bleacon) { 
	var uuid = bleacon.uuid;
	var major = bleacon.major;
	var minor = bleacon.minor;
	var measuredPower = bleacon.measuredPower;
	var rssi = bleacon.rssi;
	var accuracy = bleacon.accuracy;
	var proximity = bleacon.proximity;

	if (!(uuid in nodelist)) {
		nodelist[uuid] = {rssiarray: []};
	}

	nodelist[uuid].major = major,
	nodelist[uuid].minor = minor,
	nodelist[uuid].measuredPower = measuredPower,
	nodelist[uuid].rssi = rssi,
	nodelist[uuid].accuracy = accuracy,
	nodelist[uuid].proximity = proximity,
	nodelist[uuid].lastupdate = Date.now()

	var rssiArray = nodelist[uuid].rssiarray;

	rssiArray.push(rssi);

	if (rssiArray.length > (nAverageSamples + 4)) {
		rssiArray.shift();
	}

	var averageArray = rssiArray.slice(0);
	if (averageArray.length == nAverageSamples + 4) {
		averageArray.splice(averageArray.indexOf(Math.max.apply(Math, averageArray)), 1);
		averageArray.splice(averageArray.indexOf(Math.max.apply(Math, averageArray)), 1);
		averageArray.splice(averageArray.indexOf(Math.min.apply(Math, averageArray)), 1);
		averageArray.splice(averageArray.indexOf(Math.min.apply(Math, averageArray)), 1);
	}

	var nRssiTotal = 0;
	var nRssiEntries = averageArray.length;

	averageArray.map(function(curEntry) {
		nRssiTotal += curEntry;
	});

	nodelist[uuid].averagerssi = Math.round(nRssiTotal / nRssiEntries);

//console.log(nodelist[uuid].averagerssi);
	
});

var bDanceMode = 0;
function report() {
	var curTime = Date.now();
	var oldKeys = [];
/*
	Object.keys(nodelist).map(function(curKey) {
		if ((curTime - nodelist[curKey].lastupdate) > trackingTimeout) {
			oldKeys.push(curKey);
		}
	});

	oldKeys.map(function(curKey) {
		delete nodelist[curKey];
	});
*/
	//console.log('\n' + libUtil.inspect(nodelist, {depth: null}));
	if (Object.keys(nodelist).length > 0) {
		var averageRssi = nodelist[Object.keys(nodelist)[0]].averagerssi;
		console.log(averageRssi);

		var at = Date.now();
		at = new Date(at).toISOString();

		var output = {
		   
			"rssi": averageRssi,
			 "timestamp" : at
				
		};
        dataCache.push(output);
		if (averageRssi >= -59 && bDanceMode === 0) {
			bDanceMode = 1;
		    currentVolume = 35;
		  request(harmonIp + '/v1/set_volume?SessionID=' + harmonSession +
			'&Volume=' + currentVolume, function(err, res, body) {
			  console.log('Volume changed to ' + currentVolume);
			});
		}
	}
	/*if (targetUuid in nodelist) {
		if (nodelist[targetUuid].averagerssi > nearThreshold) {
			console.log(nodelist[targetUuid].averagerssi + 'Target is near');
		} else {
			console.log(nodelist[targetUuid].averagerssi + 'Target is far');
		}
	} else {
		console.log('Target not found');
	}*/
	
}

setInterval(report, 300);
