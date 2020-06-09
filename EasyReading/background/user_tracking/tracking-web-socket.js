"use strict";

/**
 * WebSocket URI of the AsTeRICS server that provides user tracking data
 * Default value ws://localhost:8082/ws/astericsData
 * @type {string}
 */
const ASTERICS_WS = "ws://localhost:8082/ws/astericsData";

/**
 * Utils of the WebSocket connection between the AsTeRICS server and the EasyReading extension
 */
var trackingWebSocket = {

    /**
     * WebSocket instance
     */
    webSocket: null,

    /**
     * Configuration object
     */
    config: null,

    /**
     * Whether the WebSocket connection is currently alive
     */
    isConnected: false,

    /**
     * Initialize a new WebSocket connection to the URI given by ASTERICS_WS
     * @param {Object.} config: configuration array (not used)
     */
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

    /**
     * Close any existing WebSocket connection to ASTERICS_WS
     */
    closeWebSocket: function () {

        if (this.webSocket) {
            this.webSocket.onopen = null;
            this.webSocket.onmessage = null;
            this.webSocket.onclose = null;
            this.webSocket.onerror = null;
            this.webSocket.close();
        }
    },

    /**
     * onOpen event handler. Enable reasoner.
     * @param {Event} event: open event
     */
    onOpen: function (event) {
        trackingWebSocket.isConnected = true;
        background.onConnectedToTracking(event);
        trackingWebSocket.ping();
    },

    /**
     * onMessage event handler. Handle an incoming message.
     * @param {Event} message: incoming message
     */
    onMessage: function (message) {
        try {
            if ('data' in message && message.data) {
                background.onMessageFromTracking(message.data);
            }
        } catch (e) {
            console.log("tracking-ws: error on message- " + e);
            throw e;
        }
    },

    /**
     * onClose event handler. Disable reasoner.
     * @param {Event} event: close event
     */
    onClose: function (event) {
        trackingWebSocket.isConnected = false;
        trackingWebSocket.webSocket = undefined;
        background.onDisconnectFromTracking("Connection to user tracking was closed.");
    },

    /**
     * onError event handler. Log error and disconnect.
     * @param {Event} event: error event
     */
    onError: function (event) {
        let errorMsg = "Could not connect to: "+event.currentTarget.url;
        trackingWebSocket.isConnected = false;
        trackingWebSocket.webSocket = undefined;
        background.onDisconnectFromTracking(errorMsg);
        trackingWebSocket.reconnect();
    },

    /**
     * Send a message through the WS connection, if connected.
     * @param {Object.} message: message to be sent
     */
    sendMessage: function (message) {
        if (this.webSocket) {
            this.webSocket.send(message);
        }
    },

    /**
     * Retry to establish the WS connection
     */
    reconnect: function () {
        setTimeout(function () {
            trackingWebSocket.initWebSocket();
        }, 1000);
    },

    /**
     * Send a ping message through the WS connection at a 10s interval
     */
    ping:function () {
        if(this.isConnected){
            this.sendMessage(JSON.stringify({type: "ping"}));
            setTimeout(function () {
                trackingWebSocket.ping();
            }, 10000);
        }
    },

    /**
     * Return this WebSocket's configuration (not used)
     * @returns {null}
     */
    getConfig:function () {
        return this.config;
    },

    /**
     * Check whether the WS connection is alive
     * @returns {boolean} True if the connection is running, False otherwise
     */
    isReady: function () {
        // return true;  // uncomment when testing
        return this.isConnected;
    }

};
