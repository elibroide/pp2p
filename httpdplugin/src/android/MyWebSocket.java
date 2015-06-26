package com.rjfun.cordova.httpd;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.WebSocket;
import fi.iki.elonen.WebSocketFrame;

import java.io.IOException;

class MyWebSocket extends WebSocket {

    private String id;
    private WebServer server;

    public MyWebSocket(String id, WebServer server, NanoHTTPD.IHTTPSession handshake) {
        super(handshake);
        this.id = id;
        this.server = server;
    }

    @Override
    protected void onMessage(WebSocketFrame messageFrame) {
        // messageFrame.setUnmasked();
        server.onSocketReceive(id, messageFrame.getTextPayload());
    }

    @Override
    protected void onClose(WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
        server.onSocketClose(id);
        server = null;
    }

    @Override
    protected void onPong(WebSocketFrame pongFrame) {
    }

    @Override
    protected void onException(IOException e) {
        e.printStackTrace();
    }

    @Override
    protected void handleWebsocketFrame(WebSocketFrame frame) throws IOException {
        super.handleWebsocketFrame(frame);
    }

    @Override
    public synchronized void sendFrame(WebSocketFrame frame) throws IOException {
        super.sendFrame(frame);
    }
}
