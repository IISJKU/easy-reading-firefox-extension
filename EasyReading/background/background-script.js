//var ports = [];

var background = {
    errorMsg: null,
    uuid: null,
   // authMethod: null,
    config: null,
    reasoner: null,

    connectToCloud: function (config) {

        cloudWebSocket.initWebSocket(config);
        this.config = config;
    },

    onConnectedToCloud: function (event) {


        background.errorMsg = null;
        background.uuid = null;
        cloudWebSocket.sendMessage(JSON.stringify({
            type: "getUUID",
            redirectURL: browser.extension.getURL('/background/config/config.html'),
        }));

        setTimeout(function () {
            if (!background.uuid) {

                let optionsPage = background.getActiveOptionsPage();
                if (optionsPage) {
                    optionsPage.updateStatus("Did not receive UUID");
                }
            }
        }, 2000);
        let optionsPage = background.getActiveOptionsPage();

        if (optionsPage) {
            optionsPage.updateStatus();
        }

        trackingWebSocket.initWebSocket();

    },

    onConnectedToTracking: function (event) {
        if (this.reasoner) {
            this.reasoner.active = true;
        }
    },

    onMessageFromCloud: async function (message) {

        let receivedMessage = JSON.parse(message.data);
        let optionsPage = background.getActiveOptionsPage();

        switch (receivedMessage.type) {
            case "getUUIDResult" :
                //Try silent login
                background.uuid = receivedMessage.result;

                silentLogin.login(this.config, receivedMessage.result);

                break;
            case "userLoginResult":
                scriptManager.reset();
                scriptManager.loadScripts(receivedMessage.result, cloudWebSocket.config.url);


                let configTabs = await background.getOpenConfigTabs(true);
                let configTabIds = [];
                if (configTabs.length !== 0) {
                    configTabs.forEach((tab) => {
               //         browser.tabs.update(tab.id, {url: browser.extension.getURL('/background/config/config.html')});
                        configTabIds.push(tab.id);
                    });
                }
                /*else{
                    let optionsPage = await browser.runtime.openOptionsPage();
                    console.log(optionsPage);
                }*/

                try {

                    let m = {
                        type: "getUserProfile",
                        data: JSON.parse(JSON.stringify(scriptManager)),
                    };

                    let tabs = await browser.tabs.query({});

                    tabs.forEach(async (tab) => {

                        if (!easyReading.isIgnoredUrl(tab.url) && !tab.url.startsWith("about:")) {

                            if (tab.status === "complete") {

                                if (scriptManager.debugMode) {

                                    browser.tabs.sendMessage(tab.id, m);

                                } else {
                                    for (let i = 0; i < scriptManager.contentScripts.length; i++) {
                                        try {
                                            await browser.tabs.executeScript(tab.id, {code: (atob(scriptManager.contentScripts[i].source))});
                                        } catch (error) {
                                            console.log(error);
                                        }

                                    }
                                    for (let i = 0; i < scriptManager.contentCSS.length; i++) {
                                        try {
                                            await browser.tabs.insertCSS(tab.id, {code: (atob(scriptManager.contentCSS[i].css))});
                                        } catch (error) {
                                            console.log(error);
                                        }

                                    }

                                    browser.tabs.sendMessage(tab.id, m);

                                }
                            }
                        }


                    });
                } catch (error) {

                }

                if (!this.reasoner) {
                    this.reasoner = new EasyReadingReasoner(0.01, 'q_learning', 3, 0.1, 0.2, 0.9);
                } else {
                    this.reasoner.active = true;
                }

                break;
            case "userUpdateResult":

                scriptManager.reset();
                scriptManager.loadScripts(receivedMessage.result, cloudWebSocket.config.url, true);

                console.log("user update");
                let message = {
                    type: receivedMessage.type,
                    data: JSON.parse(JSON.stringify(scriptManager)),
                };


                if (scriptManager.debugMode) {

                    for (let i = 0; i < ports.length; i++) {

                            message.data.uiCollection.uiTabConfig = tabUiConfigManager.getConfigForTab(portManager.ports[i].p.sender.tab.id);
                            portManager.ports[i].p.postMessage(message);
                        }

                } else {

                    for (let k = 0; k < portManager.ports.length; k++) {

                        console.log(portManager.ports[k].p.sender.tab.url.indexOf("client/function-overview") !== -1);

                        //! HACK: needs to be fixed. custom functions do not load sometimes without this. due to race condition.....
                        if (portManager.ports[k].p.sender.tab.status === "loading" && portManager.ports[k].p.sender.tab.url.indexOf("client/function-overview") !== -1) {
                            continue;
                        }

                        if (portManager.ports[k].startUpComplete) {
                            let tabId = portManager.ports[k].p.sender.tab.id;

                            for (let i = 0; i < scriptManager.updatedContentScripts.length; i++) {
                                try {
                                    await browser.tabs.executeScript(tabId, {code: (atob(scriptManager.updatedContentScripts[i].source))});
                                } catch (error) {
                                    console.log(error);
                                }

                    }
                    for (let i = 0; i < scriptManager.updatedContentCSS.length; i++) {
                        try {
                            await browser.tabs.insertCSS({code: (atob(scriptManager.updatedContentCSS[i].css))});
                        } catch (error) {
                            console.log(error);
                        }

                            }
                            message.data.uiCollection.uiTabConfig = tabUiConfigManager.getConfigForTab(portManager.ports[k].p.sender.tab.id);
                            portManager.ports[k].p.postMessage(message);
                        }

                    }
                }


                // background.updateTabs();

                break;
            case "cloudRequestResult":
                portManager.getPort(receivedMessage.windowInfo.tabId).p.postMessage(receivedMessage);
                // getPort(receivedMessage.windowInfo.windowId, receivedMessage.windowInfo.tabId).postMessage(receivedMessage);
                // ports[receivedMessage.data.tab_id].postMessage(receivedMessage);
                break;
            case "userLogout" : {

                await background.logoutUser();

            }
                break;
            case "triggerHelpFailed":
                background.reasoner.resetStatus();
                console.log('Reset by triggerHelpFailed');
                portManager.getPort(receivedMessage.windowInfo.tabId).p.postMessage(receivedMessage);
                break;
            case "triggerRequest":
                background.reasoner.unfreeze();
                let wait_presentation = !! receivedMessage.waitForPresentation;
                if (wait_presentation) {
                    if (receivedMessage.automatic) {
                        console.log("waiting to estimate feedback... (triggerRequest)");
                        background.reasoner.waitToEstimateFeedback();
                    }
                    background.reasoner.startCollectingNextState();
                } else {
                    console.log("waiting for user reaction... (triggerRequest)");
                    background.reasoner.waitForUserReaction();
                }
                // Forward message to tab content script
                portManager.getPort(receivedMessage.windowInfo.tabId).p.postMessage(receivedMessage);
                break;
            default:
                console.log("Error: Unknown message type:" + receivedMessage.type);
                console.log(message);
                break;
        }

    },
    onDisconnectFroCloud: async function (error) {
        background.errorMsg = error;
        if (scriptManager.profileReceived || background.getActiveOptionsPage()) {
            background.logoutUser(error);
        }
        trackingWebSocket.closeWebSocket();
    },

    onDisconnectFromTracking: async function (error) {
        background.errorMsg = error;
        // this.reasoner.active = false; // TODO: uncomment when not testing
    },

    onMessageFromTracking: async function (json_msg) {
        if (json_msg && this.reasoner && this.reasoner.active) {
            let this_reasoner = this.reasoner;
            let bg = this;
            let system_tab = true;
            // Ignore incoming tracking message when user visits system pages
            browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
                    let tab = tabs[0];
                    if (tab && !this_reasoner.isIgnoredUrl(tab.url)) {
                        let port = portManager.getPort(tab.id);
                        if (port) {
                            try {
                                let message = JSON.parse(json_msg);
                                let action = this_reasoner.step(message);
                                bg.handleReasonerAction(action);
                                system_tab = false;
                            } catch (error) {
                                if (error instanceof SyntaxError) {
                                    console.log("onMessageFromTracking: received message is not valid JSON!");
                                }
                            }
                        }
                    } else {
                        console.log("onMessageFromTracking: No active tab found");
                    }
                    if (system_tab) {
                        console.log('Reset by onMessageFromTracking');
                        this_reasoner.resetStatus();  // User can't be helped on system tabs
                    }
                },
                (error) => {
                    console.log('onMessageFromTracking error: ' + error);
                    this_reasoner.resetStatus();
                }
            );
        }
    },

    handleReasonerAction(action) {
        if (!action) {
            return;
        }
        let this_reasoner = this.reasoner;
        let pos_x = -1;
        let pos_y = -1;
        if (this.reasoner.gaze_info.length === 2) {
            pos_x = this.reasoner.gaze_info[0];
            pos_y = this.reasoner.gaze_info[1];
        }
        switch (action) {
            case EasyReadingReasoner.A.askUser:
            case EasyReadingReasoner.A.showHelp:
                let reset_status = true;
                browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
                        let tab = tabs[0];
                        if (tab && !this_reasoner.isIgnoredUrl(tab.url)) {
                            let port = portManager.getPort(tab.id);
                            if (port) {
                                this_reasoner.freeze();  // Freeze while dialog onscreen
                                if (action === EasyReadingReasoner.A.askUser) {
                                    console.log('Action taken: ask user');
                                    port.p.postMessage(
                                        {   type: "askuser",
                                            posX: pos_x,
                                            posY: pos_y,
                                        });
                                } else {
                                    console.log('Action taken: show help');
                                    port.p.postMessage(
                                        {   type: "triggerhelp",
                                            posX: pos_x,
                                            posY: pos_y,
                                        });
                                }
                                reset_status = false;
                            }
                        } else {
                            console.log("handleReasonerAction: No active tab found");
                        }
                        if (reset_status) {
                            console.log("Reset by handleReasonerAction");
                            this_reasoner.resetStatus();  // User can't be helped on system tabs
                        }
                    },
                    (error) => {
                        console.log("handleReasonerAction error: " + error);
                        this_reasoner.resetStatus();
                    }
                );
                break;
            case EasyReadingReasoner.A.nop:
                console.log('Action taken: nop');
                this_reasoner.waitForUserReaction();
                break;
        }
    },

    getActiveOptionsPage: function () {
        let windows = browser.extension.getViews();

        for (let i = 0; i < windows.length; i++) {
            if (windows[i].isEasyReadingConfigPage) {

                return windows[i];
            }
        }
    },

    getActiveOptionPages: function () {
        let optionPages = [];
        let windows = browser.extension.getViews();

        for (let i = 0; i < windows.length; i++) {
            if (windows[i].isEasyReadingConfigPage) {

                optionPages.push(windows[i]);
            }
        }

        return optionPages;

    },
    getOpenConfigTabs: async function (includeOptionsPage = false) {

        let configTabs = [];


        let backgroundUrl = browser.extension.getURL('/background/config/config.html');

        let tabs = await browser.tabs.query({});

        tabs.forEach((tab) => {
            if (tab.url.indexOf("https://" + cloudWebSocket.config.url + "/client/") !== -1) {
                configTabs.push(tab);
            } else if (tab.url.indexOf(backgroundUrl) !== -1) {
                if (includeOptionsPage) {
                    configTabs.push(tab);
                }

            }
        });

        return configTabs;
    },
    updateTabs: function () {

        browser.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {


                if (tab.url) {
                    //only reload non system pages...
                    if (tab.url.startsWith("http")) {

                        browser.tabs.update(tab.id, {url: tab.url});
                    }
                }
            });
        });
    },

    logoutUser: async function (errorMsg) {
        scriptManager.reset();

        let m = {
            type: "userLogout",
            data: null,
        };

        let tabs = await browser.tabs.query({});

        tabs.forEach(async (tab) => {

            if (!tab.url.startsWith("about:") && !easyReading.isIgnoredUrl(tab.url)) {

                if (tab.status === "complete") {

                    browser.tabs.sendMessage(tab.id, m);
                }
            }


        });

        this.reasoner = null;

        let configTabs = await background.getOpenConfigTabs();
        configTabs.forEach(async (tab) => {
            browser.tabs.update(tab.id, {url: browser.extension.getURL('/background/config/config.html')});
        });

        let activeOptionPages = background.getActiveOptionPages();
        activeOptionPages.forEach((optionsPage) => {
            optionsPage.updateStatus(errorMsg);
        });

        if (configTabs.length === 0 && activeOptionPages.length === 0) {
            browser.runtime.openOptionsPage();
        }
    },

    sendFeedbackToReasoner(feedback, wait=false) {
        if (this.reasoner.active) {
            this.reasoner.setHumanFeedback(feedback);
            if (wait) {
                this.reasoner.startCollectingNextState();
            } else {
                this.reasoner.collectNextStateAndUpdate();
            }
        }
    },

};

// Mock tracking session
let log_example = "{\"timestamp\":\"2019.10.16.11.53.22\",\"fixation_ms\":277.666667,\"blink_ms\":59.000000,\"blink_rate\":1.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.27\",\"fixation_ms\":191.000000,\"blink_ms\":0.000000,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.33\",\"fixation_ms\":214.454545,\"blink_ms\":44.666667,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.38\",\"fixation_ms\":647.000000,\"blink_ms\":45.000000,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.43\",\"fixation_ms\":428.750000,\"blink_ms\":52.142857,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.48\",\"fixation_ms\":166.181818,\"blink_ms\":66.250000,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.53.58\",\"fixation_ms\":646.692308,\"blink_ms\":37.166667,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.54.05\",\"fixation_ms\":1272.000000,\"blink_ms\":0.000000,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.54.10\",\"fixation_ms\":655.142857,\"blink_ms\":0.000000,\"blink_rate\":0.000000,\"gaze_x\":439,\"gaze_y\":289}\n" +
    "{\"timestamp\":\"2019.10.16.11.54.15\",\"fixation_ms\":138.523810,\"blink_ms\":64.142857,\"blink_rate\":1.000000,\"gaze_x\":439,\"gaze_y\":289}\n";

let allLines = log_example.split(/\r\n|\n/);
let n_lines = allLines.length;
let i = 0;

function timeout () {
    setTimeout(function () {
        let message = JSON.parse(allLines[i]);
        if (message && background.reasoner && background.reasoner.active) {
            let action = background.reasoner.step(message);
            background.handleReasonerAction(action);
            if (i < n_lines - 2) {
                i += 1;
            } else {
                i = 0;
            }
        }
        if (i < n_lines - 2) {
            i += 1;
        } else {
            i = 0;
        }
        timeout();
    },  5000);
}
timeout();

browser.runtime.onConnect.addListener(function (p) {
    //if (scriptManager.profileReceived) {
    if (true) {

        if (easyReading.isIgnoredUrl(p.sender.tab.url)) {
            return;
        }
        //Store port to content script
        portManager.addPort(p);
        // ports[p.sender.tab.id] = p;
        var currentPort = p;
        currentPort.onMessage.addListener(async function (m) {

            switch (m.type) {
                case "cloudRequest":
                    //Add window id and tab id to the request, so that it can be send back to the original content script
                    portManager.addPortInfoToMessage(m, p);
                    cloudWebSocket.sendMessage(JSON.stringify(m));
                    break;
                case "getUserProfile":
                    console.log("GETTING PROFLE");
                    if (scriptManager.profileReceived) {
                        if (scriptManager.debugMode) {
                            m.data = JSON.parse(JSON.stringify(scriptManager));
                            m.data.uiCollection.uiTabConfig = tabUiConfigManager.getConfigForTab(p.sender.tab.id);
                            console.log(m);
                            currentPort.postMessage(m);
                        } else {
                            for (let i = 0; i < scriptManager.contentScripts.length; i++) {
                                try {
                                    await browser.tabs.executeScript(p.sender.tab.id, {code: (atob(scriptManager.contentScripts[i].source))});
                                } catch (error) {
                                    console.log(error);
                                }

                            }
                            for (let i = 0; i < scriptManager.contentCSS.length; i++) {
                                try {
                                    await browser.tabs.insertCSS(p.sender.tab.id, {code: (atob(scriptManager.contentCSS[i].css))});
                                } catch (error) {
                                    console.log(error);
                                }

                            }

                            m.data = JSON.parse(JSON.stringify(scriptManager));
                            m.data.uiCollection.uiTabConfig = tabUiConfigManager.getConfigForTab(p.sender.tab.id);
                            currentPort.postMessage(m);

                        }
                    }

                    break;

                case "startUpComplete":

                    let portInfo = portManager.getPort(p.sender.tab.id);
                    portInfo.startUpComplete = true;
                    console.log(p.sender.tab.id);
                    console.log("startup complete");
                    if (background.reasoner.active) {
                        console.log("startUpComplete reset");
                        background.reasoner.resetStatus();
                    }
                    break;

                case "saveUiConfigurationForTab":

                    tabUiConfigManager.addConfig(p.sender.tab.id,
                        {
                            id: m.id,
                            configuration: m.configuration,
                        });
                    break;
                case "requestHelpNeeded":
                    if (m.automatic === false) {
                        background.reasoner.user_action = 'help';
                        console.log('requestHelpNeeded: setting user action: help');
                    }
                    // Freeze reasoner until response from cloud (triggerRequest or triggerHelpFailed message)
                    background.reasoner.freeze();
                    if (cloudWebSocket.isConnected) {
                        let msg = {
                            type: "triggerHelp",
                            gaze_x: m.posX,
                            gaze_y: m.posY,
                            input: m.input,
                            automatic: m.automatic,  // True if help was triggered by reasoner, false if user-initiated
                        };
                        portManager.addPortInfoToMessage(msg, p);
                        cloudWebSocket.sendMessage(JSON.stringify(msg));
                    } else {
                        console.log('Websocket to cloud not connected, can\'t help user');
                    }
                    break;
                case "toolTriggered":
                    if (background.reasoner.active) {
                        background.reasoner.handleToolTriggered();
                        currentPort.postMessage({
                            type: "closeDialogs",
                        });
                    }
                    break;
                case "confirmHelp":
                    background.reasoner.unfreeze();
                    console.log('confirmHelp: setting user action: help');
                    background.reasoner.user_action = 'help';
                    background.sendFeedbackToReasoner("help");
                    break;
                case "helpRejected":
                    console.log('helpRejected: setting user action: ok');
                    background.reasoner.unfreeze();
                    background.reasoner.user_action = 'ok';
                    background.sendFeedbackToReasoner("ok");
                    break;
                case "requestHelpRejected":
                    background.reasoner.unfreeze();
                    background.reasoner.user_action = 'ok';
                    console.log('requestHelpRejected: setting user action: ok');
                    background.sendFeedbackToReasoner("ok");
                    break;
                case "helpComplete":
                    if (background.reasoner.active) {
                        background.reasoner.unfreeze();
                        background.reasoner.setHelpDoneFeedback();
                        currentPort.postMessage({
                            type: "resetDialogs",
                        });
                        console.log('Presentation complete; trying to update model.');
                    }
                    break;
                case "helpCancelled":
                    if (background.reasoner.active) {
                        console.log('Presentation cancelled; trying to update model.');
                        background.reasoner.unfreeze();
                        background.reasoner.setHelpCanceledFeedback();
                        currentPort.postMessage({
                            type: "closeDialogs",
                        });
                    }
                    break;
                case "resetReasoner":
                    if (background.reasoner) {
                        background.reasoner.resetStatus();
                    }
                    break;
            }
        });

        currentPort.onDisconnect.addListener((p) => {
            portManager.removePort(p);
            if (p.error) {
                console.log(`Disconnected due to an error: ${p.error.message}`);
            }
        });

    }

});

let portManager = {
    ports: [],
    addPort: function (p) {
        let portInfo = {
            p: p,
            startUpComplete: false,
        };

        for (let i = 0; i < portManager.ports.length; i++) {
            if (portManager.ports[i].p.sender.tab.id === p.sender.tab.id) {

                portManager.ports[i] = portInfo;
                console.log("adding new port");
                return;
            }
        }
        portManager.ports.push(portInfo);
    },
    removePort: function (p) {
        for (let i = 0; i < portManager.ports.length; i++) {
            if (portManager.ports[i].p === p) {
                portManager.ports.splice(i, 1);
                return;
            }
        }

    },

    getPort: function (tab_id) {
        for (let i = 0; i < portManager.ports.length; i++) {
            if (portManager.ports[i].p.sender.tab.id === tab_id) {
                return portManager.ports[i];
            }
        }

    },

    addPortInfoToMessage(m, p) {
        m.windowInfo = {
            tabId: p.sender.tab.id,
            windowId: p.sender.tab.windowId,
        };
    }

};

browser.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    tabUiConfigManager.removeTab(tabId);
});

browser.tabs.onCreated.addListener(function (tab) {

    tabUiConfigManager.addTab(tab.id)

});

let tabUiConfigManager = {
    tabConfigs: [],
    addTab: function (tabID) {
        this.tabConfigs.push({
            tabID: tabID,
            uiConfigurations: [],
        })
    },
    removeTab: function (tabID) {
        for (let i = 0; i < this.tabConfigs.length; i++) {
            if (this.tabConfigs[i].tabID === tabID) {
                this.tabConfigs.splice(i, 1);

                return;
            }
        }
    },

    addConfig: function (tabID, configuration) {
        for (let i = 0; i < this.tabConfigs.length; i++) {
            if (this.tabConfigs[i].tabID === tabID) {

                //Try to update...
                for (let j = 0; j < this.tabConfigs[i].uiConfigurations.length; j++) {
                    if (this.tabConfigs[i].uiConfigurations[j].id === configuration.id) {
                        this.tabConfigs[i].uiConfigurations[j] = configuration;
                        return;
                    }
                }

                this.tabConfigs[i].uiConfigurations.push(configuration);


            }
        }
    },

    getConfigForTab(tabID) {
        for (let i = 0; i < this.tabConfigs.length; i++) {
            if (this.tabConfigs[i].tabID === tabID) {
                return this.tabConfigs[i].uiConfigurations;

            }
        }

        return [];
    }

};

/*cloudRequest

function addPort(p) {
    for (let i = 0; i < ports.length; i++) {
        if (ports[i].sender.tab.id === p.sender.tab.id) {

            ports[i] = p;
            return;
        }
    }
    ports.push(p);
}

function removePort(p) {

    for (let i = 0; i < ports.length; i++) {
        if (ports[i] === p) {
            ports.splice(i, 1);
            return;
        }

    }
}

function getPort(window_id, tab_id) {

    for (let i = 0; i < ports.length; i++) {
        if (ports[i].sender.tab.windowId === window_id && ports[i].sender.tab.id === tab_id) {
            return ports[i];
        }
    }
}
*/

browser.browserAction.onClicked.addListener(async () => {

    let configTabs = await background.getOpenConfigTabs(true);
    if (configTabs.length !== 0) {
        browser.tabs.update(configTabs[0].id, {active: true});
    } else {
        browser.runtime.openOptionsPage();
    }
});

