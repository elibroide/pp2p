package com.rjfun.cordova.httpd;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWebSocketServer;
import fi.iki.elonen.WebSocket;
import fi.iki.elonen.WebSocketFrame;
import fi.iki.elonen.WebSocketFrame.CloseCode;
import java.util.Map;

import java.io.IOException;
import java.net.InetSocketAddress;

import java.util.UUID;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;


public class WebServer extends NanoWebSocketServer
{
	private CorHttpd plugin;
	private Map<String, WebSocket> dictionary;

	public WebServer(CorHttpd plugin, String root, int port) throws IOException {
		super(port);
		this.plugin = plugin;
		dictionary = new HashMap();
	}

	@Override
    public WebSocket openWebSocket(IHTTPSession handshake) {
    	String id = UUID.randomUUID().toString();
    	WebSocket socket = new MyWebSocket(id, this, handshake);
    	dictionary.put(id, socket);
    	// Send new one
    	plugin.webView.loadUrl("javascript:httpd.socket.connect('"+id+"')");

        return socket;
    }

    public void send(String id, String data){
    	WebSocket socket = dictionary.get(id);
    	if(socket == null){
    		return;
    	}
    	try{
    		socket.send(data);
    	} catch(Exception ex){
    	}
    }

    public void onSocketClose(final String id){
    	dictionary.remove(id);
    	plugin.webView.loadUrl("javascript:httpd.socket.disconnect('"+id+"')");
    }

    public void onSocketReceive(final String id, final String data){
        plugin.webView.loadUrl("javascript:httpd.socket.receive('"+id+"', '"+data+"')");
    }
}










