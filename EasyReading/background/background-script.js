//var ports = [];

var background = {
    errorMsg: null,
    uuid: null,
    connectToCloud: function (config) {

        cloudWebSocket.initWebSocket(config);
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
    },
    onMessageFromCloud: async function (message) {

        let receivedMessage = JSON.parse(message.data);
        let optionsPage = background.getActiveOptionsPage();

        switch (receivedMessage.type) {
            case "getUUIDResult" :

                //Try silent login
                background.uuid = receivedMessage.result;

                silentLogin.login("https://" + cloudWebSocket.config.url, receivedMessage.result);

                break;
            case "userLoginResult":
                scriptManager.reset();
                scriptManager.loadScripts(receivedMessage.result, cloudWebSocket.config.url);


                let configTabs = await background.getOpenConfigTabs(true);
                let configTabIds = [];
                if (configTabs.length !== 0) {
                    configTabs.forEach((tab) => {
                        browser.tabs.update(tab.id, {url: browser.extension.getURL('/background/config/config.html')});
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

                        if (!easyReading.isIgnoredUrl(tab.url) && tab.url !== "about:debugging" && !configTabIds.includes(tab.id)) {
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

                    for (let i = 0; i < portManager.ports.length; i++) {
                        if (portManager.ports[i].startUpComplete) {
                            portManager.ports[i].p.postMessage(message);
                        }

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
                                    await browser.tabs.insertCSS(tabId, {code: (atob(scriptManager.updatedContentCSS[i].css))});
                                } catch (error) {
                                    console.log(error);
                                }

                            }

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

            if (tab.url !== "about:debugging") {

                if (tab.status === "complete") {

                    browser.tabs.sendMessage(tab.id, m);
                }
            }


        });


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
    }
};


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
                    m.windowInfo = {
                        tabId: p.sender.tab.id,
                        windowId: p.sender.tab.windowId,
                    };
                    cloudWebSocket.sendMessage(JSON.stringify(m));
                    break;
                case "getUserProfile":
                    console.log("GETTING PROFLE");
                    if (scriptManager.profileReceived) {
                        if (scriptManager.debugMode) {
                            m.data = JSON.parse(JSON.stringify(scriptManager));
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
                            currentPort.postMessage(m);

                        }
                    }

                    break;

                case "startUpComplete":

                    let portInfo = portManager.getPort(p.sender.tab.id);
                    portInfo.startUpComplete = true;
                    console.log(p.sender.tab.id);
                    console.log("startup complete");
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

    }


};

/*

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

