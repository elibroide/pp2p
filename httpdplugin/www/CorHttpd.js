
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

var corhttpd_exports = {};
var sockets = [];

corhttpd_exports.startServer = function(options, success, error) {
	  var defaults = {
			    'www_root': '',
			    'port': 8888,
			    'localhost_only': false
			  };
	  
	  // Merge optional settings into defaults.
	  for (var key in defaults) {
	    if (typeof options[key] !== 'undefined') {
	      defaults[key] = options[key];
	    }
	  }
			  
  exec(success, error, "CorHttpd", "startServer", [ defaults ]);
};

corhttpd_exports.stopServer = function(success, error) {
	  exec(success, error, "CorHttpd", "stopServer", []);
};

corhttpd_exports.getURL = function(success, error) {
	  exec(success, error, "CorHttpd", "getURL", []);
};

corhttpd_exports.getLocalPath = function(success, error) {
	  exec(success, error, "CorHttpd", "getLocalPath", []);
};

corhttpd_exports.socket = {
	connect: function(uid){
		var socket = { uid: uid };
		socket.send = function(data, success, error){
	  		exec(success, error, "CorHttpd", "send", [this.uid, data]);
		}.bind(socket);
		socket.close = function(success, error){
			exec(success, error, "CorHttpd", "close", [this.uid]);
		}.bind(this);
		sockets[uid] = socket;
		this.connected(socket);
	},
	connected: function(){
		console.log('connected: NOT HANDLED');
	},
	disconnect: function(uid){
		sockets[uid].disconnect();
		delete sockets[uid];
	},
	receive: function(uid, data){
		sockets[uid].receive(data);
	},
};

module.exports = corhttpd_exports;

