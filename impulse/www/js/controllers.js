angular.module('impulse.controllers', [])

.controller('TheController', function($http, $interval) {
  var self = this;

  self.genres = ['Electronic', 'Jazz', 'Metal'];
  self.currentGenre = self.genres[0];
  self.currentSongId = 0;

  // configure the server ip
  var SERVER_IP = '10.0.1.26';
  var socket = io.connect('http://' + SERVER_IP + ':1337');

  var status_bar_dom = document.querySelector('.status-bar');

  var HARMAN_SERVER_IP = 'http://10.0.1.13:8080/';
  $http.get(HARMAN_SERVER_IP + 'v1/init_session')
    .then(function(response) {
      self.harmanSession = response.data.SessionID;
      console.log('Got Session ID: ' + self.harmanSession);

      $http.get(HARMAN_SERVER_IP + 'v1/set_party_mode?SessionID=' + self.harmanSession)
        .then(function(res) {
          console.log('Added all speakers to list');
        });

      $http.get(HARMAN_SERVER_IP + 'v1/media_list?SessionID=' + self.harmanSession)
        .then(function(res) {
          console.log('Got play list');
          console.log(res.data.MediaList);
          self.playList = res.data.MediaList;
          self.currentSong = self.playList[self.currentSongId];

          self.track_job = $interval(function() {
            $http.get(HARMAN_SERVER_IP + 'v1/playback_status?SessionID=' + self.harmanSession)
              .then(function(res) {
                // dataformat:
                // {
                //    "PlaybackState": "PlayerStatePlaying",
                //    "TimeElapsed": "15"
                // }
                console.log(parseInt(res.data.TimeElapsed));
                console.log(self.currentSong.Duration);
                var percentage = Math.floor(
                  parseInt(res.data.TimeElapsed) / self.currentSong.Duration * 100
                );

                console.log('current play percentage: ' + percentage);

                percentage = (percentage === -1) ? 0 : percentage;

                status_bar_dom.setAttribute(
                  'style',
                  'width: ' + percentage + '%'
                );
              });
          }, 1000);
        });
    });

  var volume_vote_dom = document.querySelector('.volume .feedback-bar');
  var genre_vote_dom = document.querySelector('.genre .feedback-bar');

  socket.on('connected', function(currentState) {
    self.currentVolumeVote = currentState.volume;
    self.currentGenres = currentState.genre;
    self.currentSong = currentState.currentSong;

    console.log('Got state: ');
    console.log(currentState);

    updateVotes();
  });

  socket.on('volume', function(currentVolumeVote) {
    self.currentVolumeVote = currentVolumeVote;
    console.log('Got Volume ' + currentVolumeVote);
    updateVotes();
  });

  socket.on('genre', function(genres) {
    self.currentGenres = genres;
    console.log('Got Genres');
    console.log(genres);
    updateVotes();
  });

  self.nextSong = function() {
    if (self.currentSongId < self.playList.length - 1) {
      self.currentSongId ++;
    } else {
      self.currentSongId = 0;
    }
    self.currentSong = self.playList[self.currentSongId];
  };

  self.previousSong = function() {
    if (self.currentSongId > 0) {
      self.currentSongId --;
    } else {
      self.currentSongId = self.playList.length - 1;
    }
    self.currentSong = self.playList[self.currentSongId];
  };

  self.upvote = function() {
    self.upvoted = !self.upvoted;
  };

  self.downvote = function() {
    self.downvoted = !self.downvoted;
  };

  self.updateCurrentGenre = function(genre) {
    if (
      self.currentGenres[self.currentGenre] &&
      self.currentGenres[self.currentGenre] > 0
    ) {
      var oldTransferData = {};
      oldTransferData[self.currentGenre] = '-1';
      socket.emit('genre', oldTransferData);
    }

    self.currentGenre = genre;

    var newGenreTransferData = {};
    newGenreTransferData[self.currentGenre] = '+1';

    socket.emit('genre', newGenreTransferData);
  };

  self.upVoteVolume = function() {
    console.debug('Upvoting volume');
    socket.emit('volume', '+1');
  };

  self.downVoteVolume = function() {
    console.debug('Downvoting volume');
    socket.emit('volume', '-1');
  };

  self.toggleDropdown = function() {
    document.querySelector('.dropdown')
      .classList.toggle('open');
  };

  self.addToPersonalAlbum = function() {
    self.isInPersonalAlbum = !self.isInPersonalAlbum;
  };

  function updateVotes () {
    if (self.currentVolumeVote >= -10 && self.currentVolumeVote <= 10) {
      var vote_dom_progress = volume_vote_dom.querySelector('.progress');
      vote_dom_progress
        .setAttribute('width', Math.abs(self.currentVolumeVote) * 15);
      if (self.currentVolumeVote < 0) {
        vote_dom_progress
          .setAttribute('x', 156 - Math.abs(self.currentVolumeVote * 15));
        vote_dom_progress
          .setAttribute('style', 'fill: #FF00A4');
      } else {
        vote_dom_progress
          .setAttribute('style', 'fill: #00FF86');
        vote_dom_progress
          .setAttribute('x', 164);
      }
    }

    genre_vote_dom.querySelector('.progress')
      .setAttribute('width',
        (self.currentGenres[self.currentGenre]) ?
          self.currentGenres[self.currentGenre] * 15 :
          0
      );
  }
});
