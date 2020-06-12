let uiUpdateManager = {
    saveCurrentConfiguration: function (ui,configuration) {

        let message ={
            type: "saveUiConfigurationForTab",
            id: ui.id,
            configuration: configuration,
        };
        contentScriptController.sendMessageToBackgroundScript(message);

    }
};