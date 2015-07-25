angular.module('impulse.controllers', [])

.controller('TheController', function() {
  var self = this;
  var socket = io.connect('http://192.168.0.102:1337');

  self.genres = ['Electronic', 'Jazz', 'Metal'];
  self.currentGenre = self.genres[0];

  socket.on('connected', function(currentState) {
    self.currentVolumeVote = currentState.volume;
    self.currentGenres = currentState.genre;
    console.log('Got state: ');
    console.log(currentState);
  });

  socket.on('volume', function(currentVolumeVote) {
    self.currentVolumeVote = currentVolumeVote;
    console.log('Got Volume ' + currentVolumeVote);
  });

  socket.on('genre', function(genres) {
    self.currentGenres = genres;
    console.log('Got Genres');
    console.log(genres);
  });

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
});
