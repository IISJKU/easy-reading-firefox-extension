let contentScriptController = {
    debugModeListenerStarted:false,
    profileReceived: false,
    init: function () {

        document.addEventListener('easyReadingUpdate', contentScriptController.easyReadingUiUpdate);
        //listens to messages from the background script
        this.portToBackGroundScript = browser.runtime.connect({name: "port-to-bgs"});
        this.portToBackGroundScript.onMessage.addListener(function (m) {

            //Result of conversion request is send back to the injected content script.
            contentScriptController.receiveMessageFromBackgroundScript(m);

        });
        this.portToBackGroundScript.postMessage({type: "getUserProfile"});

    },

    receiveMessageFromBackgroundScript : function (m) {
        let input = null;
        let can_trigger = false;
        switch (m.type) {
            case "cloudRequestResult":

                requestManager.receiveRequestResult(m);

                if (m.agent === "reasoner") {
                    // Help was automatically triggered by reasoner. Ask user if help is actually needed.
                    confirm_dialog.showDialog();
                }
                break;
            case "getUserProfile":
                if(this.profileReceived){
                    console.log("profile already received");
                    return;
                }
                this.profileReceived = true;

                this.scriptManager = m.data;



                $(document).ready(function () {

                    if(easyReading.busyAnimation){
                        easyReading.busyAnimation.stopAnimation();
                    }

                    easyReading.startup( contentScriptController.scriptManager.uiCollection);
                    if(easyReading.busyAnimation) {
                        easyReading.busyAnimation.stopAnimation();
                    }


                });


                this.portToBackGroundScript.postMessage({type: "startUpComplete"});


                break;
            case "userUpdateResult":

                this.scriptManager = m.data;

                $(document).ready(function () {
                    if (typeof easyReading !== 'undefined') {
                        console.log("starting up updated");
                        if(easyReading.busyAnimation){
                            easyReading.busyAnimation.stopAnimation();
                        }
                        easyReading.update( contentScriptController.scriptManager.uiCollection);
                    }

                });
                easyReading.busyAnimation.stopAnimation();
                this.portToBackGroundScript.postMessage({type: "startUpComplete"});
                break;
            case "userLogout":

                this.profileReceived = false;

                easyReading.shutdown();
                this.scriptManager = m.data;
                break;
            case 'askuser':
                input = pageUtils.getParagraphUnderPosition(m.posX, m.posY);  // Debug mode must be false!
                if (input) {
                    console.log("Displaying tracking dialog");
                    tracking_dialog.showDialog(m.posX, m.posY, input);
                } else {
                    console.log("No input found. Dialog not shown and resetting reasoner.");
                    tracking_dialog.reset();
                    this.portToBackGroundScript.postMessage({type: "resetReasoner"});
                }
                break;
            case 'triggerhelp':
                let gazeX = m.posX;
                let gazeY = m.posY;
                input = pageUtils.getParagraphUnderPosition(gazeX, gazeY);
                if (input) {
                    can_trigger = true;
                    contentScriptController.portToBackGroundScript.postMessage({
                        type: "requestHelpNeeded",
                        posX: gazeX,
                        posY: gazeY,
                        input: JSON.stringify(input),
                        automatic: true,
                        wait_tools: JSON.stringify(util.delayedPresentations()),
                    });
                    confirm_dialog.setInput(input);
                }
                if (!can_trigger) {
                    console.log("No input found. Help could not be triggered. Reasoner reset.");
                    contentScriptController.portToBackGroundScript.postMessage({type: "resetReasoner"});
                }
                break;
            case 'triggerRequest':
                let reasoner_triggered = false;
                let tool = null;
                try {
                    if ('ui_i' in m && 'tool_i' in m) {
                        let ui = easyReading.userInterfaces[m['ui_i']];
                        tool = ui.tools[m['tool_i']];
                        if (tool) {
                            if (tracking_dialog.input !== null) {
                                tracking_dialog.setTool(m['ui_i'], m['tool_i']);
                                tracking_dialog.waitForPresentation = m['waitForPresentation'];
                                can_trigger = true;
                            }
                            if (confirm_dialog.input !== null) {
                                confirm_dialog.setTool(m['ui_i'], m['tool_i']);
                                confirm_dialog.waitForPresentation = m['waitForPresentation'];
                                can_trigger = true;
                                reasoner_triggered = true;
                            }
                        }
                    }
                } catch (error) {
                    console.log('triggerRequest error:' + error);
                } finally {
                    let target = null;
                    if (can_trigger) {
                        target = document.elementFromPoint(m.x, m.y);
                        if (globalEventListener.isIgnoredElement(target)) {
                            can_trigger = false;
                        }
                    }
                    if (can_trigger) {
                        let t_ms = 5;
                        let er_tab_slide = $('#er-tab-slide-out');
                        if (er_tab_slide.length) {
                            if (er_tab_slide.hasClass("er-tab-in")) {
                                t_ms = 500;
                                $("#er-tab-slide-out-handle").click();
                            }
                        }
                        setTimeout(function() {
                            pageUtils.removeDisplayUnderPosition(m.x, m.y);
                            tool.widget.activateWidget();
                            globalEventListener.paragraphClickListener({
                                target: target,
                                clientX: m.x,
                                clientY: m.y,
                                user_triggered: false,
                                reasoner_triggered: reasoner_triggered,
                            });
                        }, t_ms);
                    } else {
                        console.log("Cannot trigger requested help. Resetting reasoner");
                        this.portToBackGroundScript.postMessage({type: "resetReasoner"});
                    }
                    tracking_dialog.reset();
                }
                break;
            case 'triggerHelpFailed':
            case 'resetDialogs':
                console.log('resetting dialogs');
                tracking_dialog.reset();
                confirm_dialog.reset();
                break;
            case 'closeDialogs':
                tracking_dialog.removeAll();
                confirm_dialog.removeAll();
                break;
            case "recommendation": {
                if (typeof easyReading !== 'undefined') {
                    console.log(m.data);
                    recommendationDialog.showDialogForRecommendation(m.data);
                }
            }
        }
    },
    easyReadingUiUpdate:function (event){
        easyReading.busyAnimation.startAnimation();
    },
    sendMessageToBackgroundScript: function(message) {
        this.portToBackGroundScript.postMessage(message);
    }

};


let util ={
    isDefined: function (obj) {
        if (obj !== undefined && obj !== null && obj !== "" && obj !== {} && obj !== []) {
            return true;
        }
        return true;
    },
    appendPathToUrl:function (url, str) {
        if (url.startsWith("wss://")) {
            url = url.substr(6, url.length - 1);
        }
        if (!str.startsWith('/')) {
            str = '/' + str;
        }
        return "https://" + url + '/' + str;
    },
    delayedPresentations: function() {
        let tools = [];
        if (easyReading && 'userInterfaces' in easyReading) {
            for (let i=0; i<easyReading.userInterfaces.length; i++) {
                let ui = easyReading.userInterfaces[i];
                for (let j=0; j<ui.tools.length; j++) {
                    let tool = ui.tools[j];
                    if ('presentation' in tool && tool.presentation) {
                        let p = tool.presentation;
                        if ('instantDisplay' in p && !p.instantDisplay) {
                            tools.push([i, j]);
                        }
                    }
                }
            }
        }
        return tools;
    }
};


contentScriptController.init();

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    contentScriptController.receiveMessageFromBackgroundScript(request);

});

