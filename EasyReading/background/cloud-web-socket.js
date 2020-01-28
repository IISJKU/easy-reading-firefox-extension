"use strict";
var cloudWebSocket = {
    webSocket: null,
    config: null,
    isConnected: false,
    initWebSocket: function (config) {

        try{
            if(config){
                this.config = JSON.parse(JSON.stringify(config));
            }
            cloudWebSocket.closeWebSocket();
            cloudWebSocket.webSocket = new WebSocket("wss://"+this.config.url);
            cloudWebSocket.webSocket.onopen = this.onOpen;
            cloudWebSocket.webSocket.onmessage = this.onMessage;
            cloudWebSocket.webSocket.onclose = this.onClose;
            cloudWebSocket.webSocket.onerror = this.onError;

            return true;
        }catch (e) {
            console.log(e);
            return false;
        }


    },

    closeWebSocket: function () {

        if (this.webSocket) {
            try{
                this.webSocket.onopen = null;
                this.webSocket.onmessage = null;
                this.webSocket.onclose = null;
                this.webSocket.onerror = null;
                this.webSocket.close();
            }catch (e) {
                console.log(e);
            }
        }
    },

    onOpen: function (event) {
        cloudWebSocket.isConnected = true;
        background.onConnectedToCloud(event);
        cloudWebSocket.ping();

    },

    onMessage: function (message) {

        try {
            background.onMessageFromCloud(message);
        } catch (e) {
            console.log("ws: error on m essage- " + e);
            throw e; // intentionally re-throw (caught by window.onerror)
        }
    },
    onClose: function (event) {
        if(!cloudWebSocket.isConnected){
            //set user logged in to false as we could not connect to cloud endpoint - new user login is required.
            background.userLoggedIn = false;
        }
        cloudWebSocket.isConnected = false;
        cloudWebSocket.closeWebSocket();
        cloudWebSocket.webSocket = null;
        let errorMsg = "Could not connect to: "+event.currentTarget.url;
        background.onDisconnectFroCloud(errorMsg);

    },
    onError: function (event) {
        cloudWebSocket.onClose(event);

    },
    sendMessage: function (message) {

        if (this.webSocket) {
            this.webSocket.send(message);
        }
    },

    reconnect: function () {

        setTimeout(function () {
             cloudWebSocket.initWebSocket();
        }, 2000);
    },

    ping:function () {

        if(this.isConnected){
            this.sendMessage(JSON.stringify({type: "ping"}));
            setTimeout(function () {
                cloudWebSocket.ping();
            }, 10000);
        }


    },

    getConfig:function () {
      return this.config;
    },

};