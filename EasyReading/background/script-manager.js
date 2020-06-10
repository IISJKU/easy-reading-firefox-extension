/**
 * Injected JS and CSS utility wrapper
 */
var scriptManager = {

    /**
     * Reset all injected content
     */
    reset: function () {

        if(scriptManager.remoteScripts){
            scriptManager.oldRemoteScripts = scriptManager.remoteScripts;
        }

        if(scriptManager.remoteCSS){
            scriptManager.oldRemoteCSS = scriptManager.remoteCSS;
        }

        if(scriptManager.contentScripts){
            scriptManager.oldContentScripts = scriptManager.contentScripts;
        }
        if(scriptManager.contentCSS){
            scriptManager.oldContentCSS = scriptManager.contentCSS;
        }

        scriptManager.profileReceived = false;
        scriptManager.debugMode = false;
        scriptManager.uiCollection = {};
        scriptManager.remoteScripts = [];
        scriptManager.remoteCSS = [];
        scriptManager.updatedRemoteScripts = [];
        scriptManager.updatedRemoteCSS = [];
        scriptManager.contentScripts = [];
        scriptManager.contentCSS = [];
        scriptManager.updatedContentScripts = [];
        scriptManager.updatedContentCSS = [];
        scriptManager.profile = {};
        scriptManager.webSocketUrl = "";

    },

    /**
     * Load all user scripts and CSS
     * @param {Object.} profile: User profile
     * @param {string} webSocketUrl: WebSocket URI
     * @param {boolean} update: Whether to update the user scripts
     */
    loadScripts(profile,webSocketUrl,update= false) {

        scriptManager.profile = profile;
        scriptManager.webSocketUrl = webSocketUrl;
        scriptManager.debugMode = profile.debugMode;
        scriptManager.profileReceived = true;

        scriptManager.parseScriptsForInjection(profile,update);
    },

    /**
     * Prepare content to be injected into the Web site
     * @param {Object.} profile: User profile
     * @param {boolean} update: Whether to update the user scripts
     */
    parseScriptsForInjection(profile,update=false) {

        scriptManager.uiCollection.userInterfaces = profile.userInterfaces;
        scriptManager.uiCollection.busyAnimation = profile.busyAnimation;
        scriptManager.uiCollection.serverURL = "https://"+scriptManager.webSocketUrl;
        scriptManager.uiCollection.lang = profile.locale;

        //static scripts
        if(profile.static){
            for(let i = 0; i < profile.static.length; i++){
                if(scriptManager.debugMode){
                    scriptManager.remoteScripts.push(profile.static[i]);

                }else{
                    scriptManager.contentScripts.push(scriptManager.createContentScriptEntry("static_"+i,profile.static[i]));
                }
            }
        }

        //static css
        if(profile.staticCSS){
            for(let i = 0; i < profile.staticCSS.length; i++){
                if(scriptManager.debugMode){
                    scriptManager.remoteCSS.push(profile.staticCSS[i]);

                }else{
                    scriptManager.contentCSS.push(scriptManager.createContentCSSEntry("static_"+i,profile.staticCSS[i]));
                }
            }
        }


        //Load script for plugins
        if ('plugins' in profile) {
            profile.plugins.forEach((plugin) => {
               scriptManager.insertComponent(plugin,update);
            });
        }
        //Load scripts for busy animation
        if (profile.busyAnimation) {
            scriptManager.insertComponent(profile.busyAnimation,update);
        }

        //Load user interfaces

        profile.userInterfaces.forEach((userInterface) => {
                       scriptManager.insertComponent(userInterface,update);
            userInterface.tools.forEach((tool) => {
                if (tool.widget) {
                    scriptManager.insertComponent(tool.widget,update);
                }
                if (tool.function.source.type === "LocalFunction") {
                    scriptManager.insertComponent(tool.function,update);
                }
                if (tool.presentation) {
                    scriptManager.insertComponent(tool.presentation,update);
                }
            });


        });

        if(scriptManager.debugMode){

            scriptManager.remoteScripts.push(profile.classMapping);

            if(update){
                scriptManager.updatedRemoteScripts.push(profile.classMapping);
            }

        }else{

            scriptManager.contentScripts.push(scriptManager.createContentScriptEntry("classMapping",profile.classMapping));

            if(update){
                scriptManager.updatedContentScripts.push(scriptManager.createContentScriptEntry("classMappingUpdate",profile.classMapping));
            }
        }

    },

    /**
     * Insert the required content for the given component
     * @param {Object.} component: a framework component e.g. an engine function
     * @param {boolean} update: Whether to update the user scripts
     */
    insertComponent:function (component,update) {
      if(scriptManager.debugMode){
          scriptManager.insertRemoteScriptsOfComponent(component,update);
      }else{
          scriptManager.insertScriptsOfComponent(component,update);
      }
    },

    /**
     * Insert a component's scripts on the page script
     * @param {Object.} component: a framework component e.g. an engine function
     * @param {boolean} update: Whether to update the user scripts
     */
    insertScriptsOfComponent: function (component,update) {

        let versionID = component.source.id + "/" + component.source.version + "/";

        if(!component.source.version){
            //Function of an engine detected....
            versionID = component.source.engine.id + "/" + component.source.engine.version + "/";
        }

        for (let i = 0; i < component.source.contentScripts.length; i++) {

            let id = versionID + component.source.contentScripts[i].id;


            if (!scriptManager.containsElement(scriptManager.contentScripts,id)) {
                let newScript = scriptManager.createContentScriptEntry(id,component.source.contentScripts[i].source);
                scriptManager.contentScripts.push(newScript);

                if (update) {
                    if (!scriptManager.containsElement(scriptManager.oldContentScripts,id)){
                        scriptManager.updatedContentScripts.push(newScript);
                    }

                }
            }


        }

        for (let i = 0; i < component.source.contentCSS.length; i++) {
            let id = versionID + component.source.contentCSS[i].id;

            if (!scriptManager.containsElement(scriptManager.contentCSS,id)) {
                let newCSS = scriptManager.createContentCSSEntry(id,component.source.contentCSS[i].css);
                scriptManager.contentCSS.push(newCSS);

                if(update){
                    if (!scriptManager.containsElement(scriptManager.oldContentCSS,id)){
                        scriptManager.updatedContentCSS.push(newCSS);
                    }

                }
            }

        }

    },

    /**
     * Insert scripts of a component remotely for debugging purposes
     * @param {Object.} component: a framework component e.g. an engine function
     * @param {boolean} update: Whether to update the user scripts
     */
    insertRemoteScriptsOfComponent: function (component,update) {
        for (let i = 0; i < component.source.remoteScripts.length; i++) {

            if(scriptManager.remoteScripts.indexOf(component.source.remoteScripts[i]) === -1){
                scriptManager.remoteScripts.push(component.source.remoteScripts[i]);

                if(update){
                    if(scriptManager.oldRemoteScripts.indexOf(component.source.remoteScripts[i]) === -1){
                        scriptManager.updatedRemoteScripts.push(component.source.remoteScripts[i]);
                    }

                }
            }
        }

        for (let i = 0; i < component.source.remoteCSS.length; i++) {
            if(scriptManager.remoteCSS.indexOf(component.source.remoteCSS[i]) === -1){
                scriptManager.remoteCSS.push(component.source.remoteCSS[i]);

                if(update){
                    if(scriptManager.oldRemoteCSS.indexOf(component.source.remoteCSS[i]) === -1){
                        scriptManager.updatedRemoteCSS.push(component.source.remoteCSS[i]);
                    }

                }
            }

        }

    },

    /**
     * Return whether the component with the given id is in an array
     * @param {number[]} array: list of component ids
     * @param {number} id: a component id
     * @returns {boolean}: True if id is array; False otherwise
     */
    containsElement: function (array, id) {
        for (let i = 0; i < array.length; i++) {

            if (array[i].id === id) {
                return true;
            }
        }
        return false;
    },

    /**
     * Create an object for the content script given by its id
     * @param {number} id: component ID
     * @param {string} source: component source
     * @returns {{id: {number}, source: {string}}}: component object
     */
    createContentScriptEntry: function (id, source){
        return {
            id: id,
            source : source,
        }
    },

    /**
     * Create an object for a CSS given by its id
     * @param {number} id: component ID
     * @param {string} css: CSS source
     * @returns {{id: {number}, source: {string}}}: component object
     */
    createContentCSSEntry: function (id, css){
        return {
            id: id,
            css: css,
        }
    }

};