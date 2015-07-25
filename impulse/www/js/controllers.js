angular.module('impulse.controllers', [])

.controller('TheController', function() {
  var self = this;

  var socket = io.connect('http://192.168.0.102:1337');

  socket.on('connected', function(msg) {
    console.log('connected');
  });

  socket.on('message', function(msg) {
    console.log(msg);
  });

  self.toggleDropdown = function() {
    document.querySelector('.dropdown')
      .classList.toggle('open');
  };
});
