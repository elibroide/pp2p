
/*

Dependencies:
1) Signals

Message:
1) key - the event to be called
2) data - information
3) ack - acknowledgement

Peer connection config
1) Max connections
2) Connection method

*/
var TrueSocial = (function(){

function TrueSocial(o){
	this.listeners = {};
	// Handling options
	this.options = {
		signalingAddress: 'http://10.0.0.9:3000',
		wwwRoot: 'root',
		category: 'test',
		port: 8080,
		isServer: ( 'cordova' in window && cordova.plugins && cordova.plugins.CorHttpd ) ? true : false,
	};

	if(o === undefined){
		o = {};
	}
	for(var key in o){
		this.options[key] = o[key];
	}

	// Initializing variables
	this.status  = TrueSocial.STATUS_INIT;
	this.available = [];
	this.websockets = [];

	// Testing dependencies

	// Settings server callbacks
	if(this.options.isServer){
		httpd = cordova.plugins.CorHttpd;
		httpd.socket.connected = onServerConnected.bind(this);
	}

	// Connecting to signaling server
	if(!("io" in window)){
		this.addSocketScript();
		return;
	}
};

TrueSocial.TYPE_STAGE = "stage";
TrueSocial.TYPE_PEER = "player";

TrueSocial.WEBSOCKET_SERVER = "server";
TrueSocial.WEBSOCKET_CLIENT = "client";

// Not connected to service statuses
TrueSocial.STATUS_DISCONNECTED = -1;
TrueSocial.STATUS_INIT = 0;

// X > Connecting = connected to signaling service
// X < Connecting = not connected to signaling service
TrueSocial.STATUS_CONNECTING = 1;

// Connected to service statuses
TrueSocial.STATUS_CONNECTED = 2;
TrueSocial.STATUS_DETECT_STAGE = 4;
TrueSocial.STATUS_DETECT_PEER = 5;

/*

	Signaling things

*/

TrueSocial.prototype.addSocketScript = function() {
	// Adds socket script to header
};

TrueSocial.prototype.init = function() {
	// Connecting to signaling server
	this.status = TrueSocial.STATUS_INIT;
	this.signalingService = new io(this.options.signalingAddress, { 
		'reconnection limit': 8000, 
		autoConnect: false,
	});
	// Binding connectivity events
	this.signalingService.on('connect', onConnectedSignaling.bind(this));
 	this.signalingService.on('disconnect', onDisconnectSignaling.bind(this));
	this.signalingService.on('error', onFailSignaling.bind(this));
	this.signalingService.on('connectError', onFailSignaling.bind(this));
	this.signalingService.on('connectTimeout', onFailSignaling.bind(this));
	this.signalingService.on('reconnect_failed', onFailSignaling.bind(this));

	// Binding connectivity events
	this.signalingService.on('signal:identification', onIdentification.bind(this));
	this.signalingService.on('signal:unidentification', onUndentification.bind(this));
	this.signalingService.on('signal:joinRequest', onSignalingJoinRequest.bind(this));
	this.signalingService.on('signal:callTo', onSignalingCallTo.bind(this));
	this.signalingService.on('signal:callFailed', onSignalingCallFailed.bind(this));

	// Bind server WIFI
	if(!this.options.isServer){
		return;
	}
	document.addEventListener('offline', onWifiOffline.bind(this));
	document.addEventListener('online', function(){
	    // Do something else with that
	    if(navigator.connection.type === Connection.WIFI){
			onWifiOnline.call(this);
	    } else {
			onWifiOffline.call(this);
	    }
	});
};

TrueSocial.prototype.connectSignaling = function() {
	// if(this.status === TrueSocial.STATUS_INIT){
	// 	this.status = TrueSocial.STATUS_CONNECTING;
	// 	this.signalingService.connect();
	// 	return;
	// }
	// Checking status
	if(this.status < TrueSocial.STATUS_CONNECTING){
		// perform reconnection
		this.status = TrueSocial.STATUS_CONNECTING;
		this.signalingService.connect();
	} else {
		// stop operation and retry after X ms
		this.stopSignaling();
		setTimeout(function(){
			this.connectSignaling();
		}.bind(this), 1000)
	}
};

TrueSocial.prototype.stopSignaling = function() {
	// Stops all current connections and the connection to the signaling service
	this.status = TrueSocial.STATUS_DISCONNECTED;
	this.signalingService.disconnect();
	// Check if connected
	if(this.status > TrueSocial.STATUS_CONNECTING){
		this.disconnect();
	}
};

TrueSocial.prototype.joinResponse = function(data) {
	// Overwrite me!
	console.log('joinResponse: Automatic response');
	return {confirm: true, reason: 'Automatic'};
};

TrueSocial.prototype.join = function(id, success, fail, done) {
	// Data must contain id
	this.signalingService.emit('signal:join', { id: id }, function(res){
		console.log('join response', res);
		if(res.confirm){
			if(success){
				success(res);
			}
		} else {
			if(fail){
				fail(res);
			}
		}
		if(done){
			done(res);
		}
	});
};

TrueSocial.prototype.updateSignaling = function(data, ack) {
	this.signalingService.emit('signal:update', data, ack);
};

TrueSocial.prototype.getWebsocket = function(id) {
	if(id){
		return this.websockets[id];
	}
	for(var key in this.websockets){
		return this.websockets[key];
	}
	return null;
};

TrueSocial.prototype.emit = TrueSocial.prototype.send = function(id, key, data, ack) {
	if(id){
		if(this.websockets[id]){
			this.websockets[id].send(key, data, ack);
			return true;
		} else {
			console.error('No Socket', id);
			return false;
		}
	}
	for(var id in this.websockets){
		var socket = this.websockets[id];
		socket.send(key, data, ack);
		return true;
	}
	console.error('No Socket', '[Any]');
	return false;
};

TrueSocial.prototype.broadcast = function(key, data) {
	for(var id in this.websockets){
		var socket = this.websockets[id];
		socket.send(key, data);
	}
};

TrueSocial.prototype.disconnectAll = function() {
	var keys = [];
	for(var key in this.websockets){
		keys.push(key);
	}
	for (var i = 0; i < keys.length; i++) {
		this.websockets[keys[i]].disconnect();
	};
};

function onConnectedSignaling(data){
	this.dispatch('connectedSignaling');
	this.status = TrueSocial.STATUS_CONNECTED;
	// Setting server or non-server
	if(!this.options.isServer){
		console.log('Does not have httpd, identified as client peer');
		this.signalingService.emit('signal:identification', { category: this.options.category, data: this.options.data, isServer: this.options.isServer }, onIdentificationResponse.bind(this));
		return;
	}
	// Set WIFI connection
	if(navigator.connection.type === Connection.WIFI){
		// startServer.call(this);
	}
	startServer.call(this);
}

function shutDownServices(){
	// stop the server
	if(this.options.isServer){
		stopServer.call(this);
	}
	// stop the websockets
	for (var i = 0; i < this.websockets.length; i++) {
		try{
			this.websockets[i].close();
		}catch(err){
			console.log('onDisconnectSignaling: Websocket close -> ' + err);
		}
	};
	this.available = [];
	this.websockets = [];
}

function onDisconnectSignaling(){
	shutDownServices.call(this);
	this.dispatch('disconnectedSignaling');
	this.status = TrueSocial.STATUS_DISCONNECTED;
}

function onFailSignaling(){
	this.dispatch('failSignaling');
	shutDownServices.call(this);
	this.status = TrueSocial.STATUS_DISCONNECTED;
}

function onWifiOffline(){
	shutDownServices.call(this);
	this.status = TrueSocial.STATUS_DISCONNECTED;
}

function onWifiOnline(){
}

function onIdentificationResponse(data){
	this.id = data.id;
	onIdentification.call(this, data.identifications);
}

function onIdentification(data){
	for (var i = 0; i < this.available.length; i++) {
		var peer = this.available[i];
		if(peer.id === data.id){
			this.available.splice(i, 1);
			break;
		}
	};
	this.available = this.available.concat(data);
	this.dispatch('identification', data);
}

function onUndentification(data){
	for (var i = 0; i < this.available.length; i++) {
		if(this.available[i].id === data.id){
			this.available.splice(i,1);
			this.dispatch('unidentification', data);
			break;
		}
	};
}

function onSignalingJoinRequest(data, ack){
	this.dispatch('joinRequest', data);
	var res = this.joinResponse(data);
	ack(res);
}

function onSignalingCallTo(data, ack){
	console.log('onSignalingCallTo', data);

	var socket = new WebSocket(data.localAddress + '/service');
    var wrapper = makeSocketWrapper.call(this, socket, TrueSocial.WEBSOCKET_CLIENT, data.id);
    wrapper.connectAck = ack;
    socket.onerror = websocketError.bind(wrapper);
    socket.onopen = websocketOpen.bind(wrapper);
    socket.onmessage = websocketMessage.bind(wrapper);
    socket.onclose = handleClose.bind(wrapper);
    this.websockets[data.id] = wrapper;
}

function onSignalingCallFailed(data){
	console.log('onSignalingCallFailed', data);

	this.dispatch('disconnect', data);
}

/*

	Client Websocket

*/

function websocketOpen(){
	this.connectAck({confirm: true, reason: 'Connected'});
	this.socket.send(JSON.stringify({ id: this.master.id }));
	this.master.dispatch('connected', this);
}

function websocketMessage(evt){
	handleReceive.call(this, evt.data);
}

function websocketError(){
	this.connectAck({confirm: false, reason: 'Could not connect to peer'});
	delete this.master.websockets[this.id];
}

/*

	Communication Server

*/

function startServer(){
	httpd.getURL(function(url){
    	if(url.length > 0) {
    		onServerUp.bind(this);
	    } else {
    	    httpd.startServer({
    	    	'www_root' : this.options.wwwRoot,
    	    	'port' : this.options.port
    	    }, onServerUp.bind(this), onServerError.bind(this) );
    	}
    }.bind(this), onServerError.bind(this));
}

function stopServer(){
	httpd.stopServer(function(){},function(){});
}

function onServerUp(url){
	console.log('Server is up', url);
	// Sending current IP to signaling server
	this.signalingService.emit('signal:identification', { category: this.options.category, data: this.options.data, isServer: this.options.isServer, localAddress: url }, onIdentificationResponse.bind(this));
	// Identify as peer to signaling server
	this.dispatch('serverUp');
}

function onServerError(error){
	alert('Httpd server error occured:', error);
	this.dispatch('serverError');
}

function onServerConnected(socket){
	var wrapper = makeSocketWrapper.call(this, socket, TrueSocial.WEBSOCKET_SERVER);
	socket.receive = onServerIdentity.bind(wrapper);
	socket.disconnect = handleClose.bind(wrapper);
}

function onServerIdentity(data){
	console.log('onServerIdentity' + data);
	data = JSON.parse(data);
	this.id = data.id;
	this.socket.receive = handleReceive.bind(this);
	this.master.websockets[this.id] = this;
	this.master.dispatch('connected', this);
}

/* 

	General Communication

*/

function makeSocketWrapper(socket, type, id){
	var wrapper = new StageNetworkSocket(this, socket, type, id);
	return wrapper;
}

function handleReceive(msg){
	console.log('handleReceive', msg)
	msg = JSON.parse(msg.replace(/\0/g, ''));
	if(msg.ackCounter !== undefined){
		msg.ack = function(){
			var res = {
				ackResponse: msg.ackCounter,
				arguments: arguments,
			}
			this.socket.send(JSON.stringify(res));
		}.bind(this);
	} else if(msg.ackResponse !== undefined){
		if(this.acks[msg.ackResponse]){
			var args = [];
			for (var key in msg.arguments) {
				args.push(msg.arguments[key]);
			};
			this.acks[msg.ackResponse].apply(this, args);
			delete this.acks[msg.ackResponse];
		}
		return;
	}
	this.master.dispatch(msg.key, msg.data, msg.ack, this.id);
	this.dispatch(msg.key, msg.data, msg.ack);
}

function handleClose(){
	this.master.dispatch('disconnect', this);
	delete this.master.websockets[this.id];
	this.dispatch('disconnect');
}

/*

	Wrapper

*/

var StageNetworkSocket = function(master, socket, type, id){
	this.listeners = {};
	this.master = master;
	this.socket = socket;
	this.type = type;
	this.id = id;
	this.ackCounter = 0;
	this.acks = [];
}

StageNetworkSocket.prototype.emit = StageNetworkSocket.prototype.send = function(key, data, ack) {
	var msg = {
		key: key,
		data: data,
	}
	var getType = {};
	if(ack && getType.toString.call(ack) === '[object Function]'){
		msg.ackCounter = this.ackCounter;
		this.acks[this.ackCounter] = ack;
		this.ackCounter++;
		// TODO add auto delete after a while
	}
	this.socket.send(JSON.stringify(msg));
};

/*

	Accessories

*/

var EventBusClass = function () {}
EventBusClass.prototype.apply = function(object) {
	object.addEventListener = EventBusClass.prototype.addEventListener;
	object.on = EventBusClass.prototype.addEventListener;
	object.hasEventListener = EventBusClass.prototype.hasEventListener;
	object.removeEventListener = EventBusClass.prototype.removeEventListener;
	object.off = EventBusClass.prototype.removeEventListener;
	object.dispatch = EventBusClass.prototype.dispatch;
};
EventBusClass.prototype.addEventListener = function(type, callback, scope) {
	var args = [];
	var numOfArgs = arguments.length;
	for(var i=0; i<numOfArgs; i++){
		args.push(arguments[i]);
	}		
	args = args.length > 3 ? args.splice(3, args.length-1) : [];
	if(typeof this.listeners[type] != "undefined") {
		this.listeners[type].push({scope:scope, callback:callback, args:args});
	} else {
		this.listeners[type] = [{scope:scope, callback:callback, args:args}];
	}
};
EventBusClass.prototype.removeEventListener = function(type, callback, scope) {
	if(typeof this.listeners[type] != "undefined") {
		var numOfCallbacks = this.listeners[type].length;
		var newArray = [];
		for(var i=0; i<numOfCallbacks; i++) {
			var listener = this.listeners[type][i];
			if(listener.scope == scope && listener.callback == callback) {
				
			} else {
				newArray.push(listener);
			}
		}
		this.listeners[type] = newArray;
	}
};
EventBusClass.prototype.hasEventListener = function(type, callback, scope) {
	if(typeof this.listeners[type] != "undefined") {
		var numOfCallbacks = this.listeners[type].length;
		if(callback === undefined && scope === undefined){
			return numOfCallbacks > 0;
		}
		for(var i=0; i<numOfCallbacks; i++) {
			var listener = this.listeners[type][i];
			if((scope ? listener.scope == scope : true) && listener.callback == callback) {
				return true;
			}
		}
	}
	return false;
};
EventBusClass.prototype.dispatch = function(type) {
	var numOfListeners = 0;
	var event = {
		type:type,
	};
	var args = [];
	var numOfArgs = arguments.length;
	for(var i=1; i<numOfArgs; i++){
		args.push(arguments[i]);
	};				
	if(typeof this.listeners[type] != "undefined") {
		var numOfCallbacks = this.listeners[type].length;
		for(var i=0; i<numOfCallbacks; i++) {
			var listener = this.listeners[type][i];
			if(listener && listener.callback) {					
				var concatArgs = args.concat(listener.args);
				listener.callback.apply(listener.scope, concatArgs);
				numOfListeners += 1;
			}
		}
	}
};
EventBusClass.prototype.getEvents = function() {
	var str = "";
	for(var type in this.listeners) {
		var numOfCallbacks = this.listeners[type].length;
		for(var i=0; i<numOfCallbacks; i++) {
			var listener = this.listeners[type][i];
			str += listener.scope && listener.scope.className ? listener.scope.className : "anonymous";
			str += " listen for '" + type + "'\n";
		}
	}
	return str;
};

EventBusClass.prototype.apply(TrueSocial.prototype);
EventBusClass.prototype.apply(StageNetworkSocket.prototype);
return TrueSocial;

})();


