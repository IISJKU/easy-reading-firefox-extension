"use strict";

const ASTERICS_WS = "ws://localhost:8082/ws/astericsData";

var trackingWebSocket = {
    webSocket: null,
    config: null,
    isConnected: false,

    initWebSocket: function (config) {

        if(config){
            this.config = JSON.parse(JSON.stringify(config));
        }
        trackingWebSocket.closeWebSocket();
        trackingWebSocket.webSocket = new WebSocket(ASTERICS_WS);
        trackingWebSocket.webSocket.onopen = this.onOpen;
        trackingWebSocket.webSocket.onmessage = this.onMessage;
        trackingWebSocket.webSocket.onclose = this.onClose;
        trackingWebSocket.webSocket.onerror = this.onError;
    },

    closeWebSocket: function () {

        if (this.webSocket) {
            this.webSocket.onopen = null;
            this.webSocket.onmessage = null;
            this.webSocket.onclose = null;
            this.webSocket.onerror = null;
            this.webSocket.close();
        }
    },

    onOpen: function (event) {
        trackingWebSocket.isConnected = true;
        background.onConnectedToTracking(event);
        trackingWebSocket.ping();
    },

    onMessage: function (message) {
        try {
            if ('data' in message && message.data) {
                background.onMessageFromTracking(message.data);
                console.log("tracking-ws: message received: " + message);
            }
        } catch (e) {
            console.log("tracking-ws: error on message- " + e);
            throw e;
        }
    },

    onClose: function (event) {
        trackingWebSocket.isConnected = false;
        trackingWebSocket.webSocket = undefined;
        background.onDisconnectFromTracking("Connection to user tracking was closed.");
    },

    onError: function (event) {
        let errorMsg = "Could not connect to: "+event.currentTarget.url;
        trackingWebSocket.isConnected = false;
        trackingWebSocket.webSocket = undefined;
        background.onDisconnectFromTracking(errorMsg);
        trackingWebSocket.reconnect();
    },

    sendMessage: function (message) {
        if (this.webSocket) {
            console.log("tracking-ws: send message-sent");
            this.webSocket.send(message);
        }
    },

    reconnect: function () {
        setTimeout(function () {
            trackingWebSocket.initWebSocket();
        }, 1000);
    },

    ping:function () {
        if(this.isConnected){
            this.sendMessage(JSON.stringify({type: "ping"}));
            setTimeout(function () {
                trackingWebSocket.ping();
            }, 10000);
        }
    },

    getConfig:function () {
        return this.config;
    },
    
    isReady: function () {
        return true;  // TODO test: remove after testing
        return this.isConnected;
    }

};
