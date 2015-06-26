
/* 

Definitions:
1) Stage = The TV game side
2) Player = The device game side
3) Server = A device's server capabilities
4) Peer = A device
5) Identification = The process of logging into the signaling server. Mobile devices must be connected to a local network to identify

*/

var _ = require('underscore');
var uuid = require('node-uuid');

var TYPE_STAGE = 'stage';
var TYPE_PLAYER = 'player';

var categories = [];

function getRoutes(io){

	console.log('Setting Signaling Server');

	io.on('connection', function(socket){
		// get remote address and add it to socket
		console.log('connected');
		socket.remoteAddress = getRemoteAddress.call(this);
		socket.on('disconnect', disconnect);

		socket.on('signal:identification', identification);
		socket.on('signal:join', join);
		socket.on('signal:leave', leave);
		socket.on('signal:update', update);
	});
}

function getRemoteAddress(){
	return 'localhost';
}

function disconnect(){
	if(!this.identity){
		return;
	}
	console.log('Disconnect', this.identity.id);
	// Remove from addresses lists
	var remoteAddress = getPeerRemoteAddressPeers(this.identity);
	if(remoteAddress){
		remoteAddress.splice(remoteAddress.indexOf(this.identity), 1);
		if(remoteAddress.length === 0){
			delete categories[this.identity.category][remoteAddress];
			return;
		}
		_.each(remoteAddress, function(peer){
			peer.getSocket().emit('signal:unidentification', {id: this.identity.id});
		}.bind(this));
	}
	// Remove from all friends lists
	_.each(this.identity.friends, function(friend){
		friend.friends.splice(friend.friends.indexOf(this.identity), 1);
	}.bind(this));
}

/*

	Routing methods

*/

function identification(data, ack){
	console.log('identification', data);
	// Get category/game
	if(!categories[data.category]){
		categories[data.category] = [];
	}
	// Get all remote address in the category
	if(!categories[data.category][this.remoteAddress]){
		categories[data.category][this.remoteAddress] = [];
	}
	var remoteAddress = categories[data.category][this.remoteAddress];
	// Already exist, reshaping data
	if(this.identity){
		this.identity.data = data.data;
		_.each(remoteAddress, function(peer){
			peer.getSocket().emit('signal:identification', [pickPeer(data)]);
		});
		return;
	}
	// If the remote address is common with other ones, send that info to them
	data.id = uuid.v4();
	data.remoteAddress = this.remoteAddress;
	ack({id: data.id, identifications: _.map(remoteAddress, function(peer){ return pickPeer(peer) })});
	_.each(remoteAddress, function(peer){
		peer.getSocket().emit('signal:identification', pickPeer(data));
	});
	// sets socket identity
	remoteAddress.push(data);
	data.friends = [];
	data.getSocket = function(){ return this; }.bind(this);
	if(data.localAddress){
		data.localAddress = data.localAddress.replace(/^https?:\/\//, '');
		data.localAddress = data.localAddress.replace('/', '');
	}
	this.identity = data;
}

function update(data, ack){
	console.log('update', data);
	var identity = this.identity;
	var remoteAddress = getPeerRemoteAddressPeers(identity);
	if(!remoteAddress){
		response.reason = "Weird Error (no remote address)";
		ack(response);
		return;
	}
	identity.data = data;
	_.each(remoteAddress, function(peer){
		if(peer.id === identity.id){
			return;
		}
		peer.getSocket().emit('signal:identification', pickPeer(identity));
	});
	if(ack){
		ack({id: identity.id});
	}
}

function join(data, ack){
	var identity = this.identity;
	var response = {
		confirm: false,
		id: data.id,
		reason: '',
	}
	console.log('join', data);
	var remoteAddress = getPeerRemoteAddressPeers(identity);
	if(!remoteAddress){
		response.reason = "Weird Error (no remote address)";
		ack(response);
		return;
	}
	var found = _.findWhere(remoteAddress, {id: data.id});
	if(!found){
		response.reason = "Not Exist";
		ack(response);
		return;
	}
	if(found.data && found.data.config){
		if(found.data.config.maxConnections && found.data.config.maxConnections < found.friends.length){
			response.reason = "Max connections is " + found.data.config.maxConnections + ' and current ' + found.friends.length;
			ack(response);
			return;
		}
		if(found.data.config.condition && false){
			response.reason = "Connection refused";
			ack(response);
			return;
		}
	}
	
	if(_.findWhere(found.friends, {id: identity.id})){
		response.confirm = true;
		response.reason = 'Already connected';
		ack(response);
		return;
	}
	// Asking other peer to join
	found.getSocket().emit('signal:joinRequest', pickPeer(identity), function(joinRes){
		console.log('Join response')
		joinRes.id = response.id;
		if(!joinRes.confirm){
			response.reason = joinRes.reason;
			ack(response);
			return;
		}
		if(_.findWhere(found.friends, {id: identity.id})){
			response.confirm = true;
			response.reason = 'Already connected';
			ack(response);
			return;
		}
		var callResponse = function(callRes){
			console.log(identity.id, 'to', found.id, 'call answered', callRes);
			if(_.findWhere(found.friends, {id: identity.id})){
				response.confirm = true;
				response.reason = 'Already connected';
				ack(response);
				return;
			}
			if(!callRes.confirm){
				// Send failed
				found.getSocket().emit('signal:callFailed', {id: identity.id});
				response.reason = callRes.reason;
				ack(response);
				return;
			}
			// Add to each other "friend" list
			joinRes.reason = 'Succeeded';
			// Send success
			found.getSocket().emit('signal:callSuccess', {id: identity.id});
			ack(joinRes);
			found.friends.push(identity);
			identity.friends.push(found);
			// Send to connector the ConnectTo command
			console.log('connecting between', data.id, 'and', found.id);
		}
		if(found.isServer){
			this.emit('signal:callTo', { id: found.id, localAddress: 'ws://' + found.localAddress }, callResponse);
		} else {
			found.getSocket().emit('signal:callTo', { id: identity.id, localAddress: 'ws://' + identity.localAddress }, callResponse);
		}
	});
}

function leave(data){
	// Remove from friends lists
}

/*

	Other methods

*/

function pickPeer(peer){
	return _.pick(peer, ['id', 'data']);
}

function getPeerRemoteAddressPeers(peer){
	var category = categories[peer.category];
	if(!category){
		return null;
	}
	return category[peer.remoteAddress];
}

module.exports = getRoutes;





