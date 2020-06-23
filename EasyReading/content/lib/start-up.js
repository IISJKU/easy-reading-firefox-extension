var easyReading = {
    started: false,
    currentToolID: 0,
    init: function () {
        easyReading.uiCollection = [];
        easyReading.userInterfaces = [];
        easyReading.widgets = [];
        easyReading.presentations = [];
        easyReading.busyAnimation = null;
        easyReading.uiUpdated = false;
        easyReading.currentToolCount = 0;
        easyReading.currentUICount = 0;
    },

    startup: function (uiCollection) {

        if(!classMapping){
            setTimeout(function () {
                easyReading.startup(uiCollection);
            },100 );

            return;
        }

        
        let updated = easyReading.uiUpdated;
        this.init();
        easyReading.started = true;
        globalEventListener.init();
        this.uiCollection = uiCollection;


        //https://jsperf.com/fast-array-foreach

        for (let i = 0; i < this.uiCollection.userInterfaces.length; i++) {

            let uiTabConfig = null;
            if (uiCollection.uiTabConfig) {

                for (let j = 0; j < uiCollection.uiTabConfig.length; j++) {

                    if (uiCollection.uiTabConfig[j].id === uiCollection.userInterfaces[i].source.id) {

                        uiTabConfig = uiCollection.uiTabConfig[j].configuration;
                    }

                }
            }

            let currentUserInterface = new classMapping[this.uiCollection.userInterfaces[i].source.implementationClass](this.uiCollection.userInterfaces[i].configuration, uiTabConfig);
            currentUserInterface.id = this.uiCollection.userInterfaces[i].source.id;
            currentUserInterface.uiId = this.createUIID();
            currentUserInterface.uiIndex = i;
            currentUserInterface.initUI();
            currentUserInterface.tools = [];


            for (let j = 0; j < this.uiCollection.userInterfaces[i].tools.length; j++) {

                //Unique tool id during instance
                let toolID = this.createToolID();
                this.uiCollection.userInterfaces[i].tools[j].function.toolId = toolID;


                let targetID = currentUserInterface.getToolContainerIDForLayout(toolID, this.uiCollection.userInterfaces[i].tools[j].layout);
                let currentWidget = new classMapping[this.uiCollection.userInterfaces[i].tools[j].widget.source.implementationClass](this.uiCollection.userInterfaces[i].tools[j].function, currentUserInterface, targetID, this.uiCollection.userInterfaces[i].tools[j].widget.configuration);
                this.widgets.push(currentWidget);
                let currentPresentation = null;

                if (typeof this.uiCollection.userInterfaces[i].tools[j].presentation !== "undefined") {

                    currentPresentation = new classMapping[this.uiCollection.userInterfaces[i].tools[j].presentation.source.implementationClass](this.uiCollection.userInterfaces[i].tools[j].function, currentUserInterface, this.uiCollection.userInterfaces[i].tools[j].presentation.configuration);

                    this.presentations.push(currentPresentation);
                }

                let newTool = {
                    function: this.uiCollection.userInterfaces[i].tools[j].function,
                    widget: currentWidget,
                    presentation: currentPresentation,
                    id: toolID,
                    //Creates a signature to check if a function has changed when user interfaces is changed/updated
                    toolSignature: this.createToolSignatureID(this.uiCollection.userInterfaces[i], this.uiCollection.userInterfaces[i].tools[j]),

                };
                //Tool index is the index of the tool in the user interface needed in node.js
                this.setToolIndexID(newTool, j);
                currentUserInterface.tools.push(newTool);

            }
            currentUserInterface.toolsLoaded();
            easyReading.userInterfaces.push(currentUserInterface);
        }

        easyReading.busyAnimation = new classMapping[this.uiCollection.busyAnimation.source.implementationClass](this.uiCollection.busyAnimation.configuration);


        globalEventListener.initEventListeners();

        if (updated) {
            for (let i = 0; i < easyReading.userInterfaces.length; i++) {
                easyReading.userInterfaces[i].uiUpdated();
            }
        }

        console.log("startup - complete");

    },
    setToolIndexID: function (tool, toolIndex) {
        tool.toolIndex = toolIndex;
        tool.function.toolIndex = toolIndex;

        tool.widget.setToolIndex(toolIndex);
        if (tool.presentation) {
            tool.presentation.setToolIndex(toolIndex);
        }
    },
    update: function (uiCollection) {

        console.log("UPDAte");
        if (easyReading.started) {

            let uiChanged = false;

            for (let i = 0; i < this.uiCollection.userInterfaces.length; i++) {

                for (let k = 0; k < uiCollection.userInterfaces.length; k++) {

                    if (uiCollection.userInterfaces[k].source.id !== this.uiCollection.userInterfaces[i].source.id) {
                        uiChanged = true;

                    }

                    let oldConfig = JSON.parse(JSON.stringify(this.uiCollection.userInterfaces[i].configuration));
                    delete oldConfig.id;
                    delete oldConfig.remoteAssetDirectory;

                    let newConfig = JSON.parse(JSON.stringify(uiCollection.userInterfaces[k].configuration));
                    delete newConfig.id;
                    delete newConfig.remoteAssetDirectory;

                    if (JSON.stringify(newConfig) !== JSON.stringify(oldConfig)) {


                        uiChanged = true;

                    }

                }
            }

            if (uiChanged) {
                easyReading.shutdown();
                easyReading.startup(uiCollection);

            } else {
                for (let i = 0; i < uiCollection.userInterfaces.length; i++) {

                    let currentUserInterface = this.getUserInterfaceWithID(uiCollection.userInterfaces[i].source.id);

                    let toolIndexesToRemove = [];
                    //Remove old tools
                    for (let j = 0; j < currentUserInterface.tools.length; j++) {
                        let toolFound = false;
                        for (let k = 0; k < uiCollection.userInterfaces[i].tools.length; k++) {
                            let toolSignature = this.createToolSignatureID(uiCollection.userInterfaces[i], uiCollection.userInterfaces[i].tools[k]);
                            if (toolSignature === currentUserInterface.tools[j].toolSignature) {
                                toolFound = true;

                                //Check if configuration updated
                                let newTool = uiCollection.userInterfaces[i].tools[k];
                                let oldTool = currentUserInterface.tools[j];



                                if (!easyReading.compareConfiguration(newTool.function.configuration, oldTool.function.configuration)) {
                                    //Set it to false so it gets re-added
                                    toolFound = false;

                                }

                                if (! easyReading.compareConfiguration(newTool.widget.configuration, oldTool.widget.configuration)) {
                                    //Set it to false so it gets re-added
                                    toolFound = false;

                                }

                                if (newTool.widget.presentation) {

                                    if (!easyReading.compareConfiguration(newTool.presentation.configuration, oldTool.presentation.configuration)) {
                                        //Set it to false so it gets re-added
                                        toolFound = false;

                                    }
                                }
                            }
                        }


                        if (!toolFound) {

                            currentUserInterface.tools[j].widget.remove();
                            if (currentUserInterface.tools[j].presentation) {
                                currentUserInterface.tools[j].presentation.remove();
                            }
                            currentUserInterface.removeContainerForTool(currentUserInterface.tools[j].id);


                            toolIndexesToRemove.push(j);

                        }
                    }

                    //Remove high to low to not fuck up indexes
                    for (let i = toolIndexesToRemove.length - 1; i >= 0; i--) {
                        currentUserInterface.tools.splice(toolIndexesToRemove[i], 1);
                    }

                    //Add new tools
                    for (let k = 0; k < uiCollection.userInterfaces[i].tools.length; k++) {
                        let toolSignature = this.createToolSignatureID(uiCollection.userInterfaces[i], uiCollection.userInterfaces[i].tools[k]);

                        let toolAlreadyInUserInterface = false;
                        if (typeof currentUserInterface.tools[k] === 'undefined') {
                            toolAlreadyInUserInterface = false;
                        } else {
                            if (toolSignature === currentUserInterface.tools[k].toolSignature) {
                                toolAlreadyInUserInterface = true;
                            }
                        }
                        if (!toolAlreadyInUserInterface) {

                            let toolID = this.createToolID();
                            uiCollection.userInterfaces[i].tools[k].toolId = toolID;

                            let targetID = currentUserInterface.getToolContainerIDForLayout(toolID, uiCollection.userInterfaces[i].tools[k].layout, k);
                            let currentWidget = new classMapping[uiCollection.userInterfaces[i].tools[k].widget.source.implementationClass](uiCollection.userInterfaces[i].tools[k].function, currentUserInterface, targetID, uiCollection.userInterfaces[i].tools[k].widget.configuration);
                            this.widgets.push(currentWidget);
                            let currentPresentation = null;

                            if (typeof uiCollection.userInterfaces[i].tools[k].presentation !== "undefined") {

                                currentPresentation = new classMapping[uiCollection.userInterfaces[i].tools[k].presentation.source.implementationClass](uiCollection.userInterfaces[i].tools[k].function, currentUserInterface, uiCollection.userInterfaces[i].tools[k].presentation.configuration);

                                this.presentations.push(currentPresentation);
                            }

                            let newTool = {
                                function: uiCollection.userInterfaces[i].tools[k].function,
                                widget: currentWidget,
                                presentation: currentPresentation,
                                id: toolID,
                                //Creates a signature to check if a function has changed when user interfaces is changed/updated
                                toolSignature: this.createToolSignatureID(uiCollection.userInterfaces[i], uiCollection.userInterfaces[i].tools[k]),

                            };
                            currentUserInterface.tools.splice(k, 0, newTool);
                        } else {
                            currentUserInterface.tools[k].widget.updateConfigurationAndFunction(uiCollection.userInterfaces[i].tools[k].widget.configuration, uiCollection.userInterfaces[i].tools[k].function);
                            if (currentUserInterface.tools[k].presentation) {

                                currentUserInterface.tools[k].presentation.updateConfigurationAndFunction(uiCollection.userInterfaces[i].tools[k].presentation.configuration, uiCollection.userInterfaces[i].tools[k].function);
                            }
                        }

                        this.setToolIndexID(currentUserInterface.tools[k], k);

                    }

                    currentUserInterface.uiUpdated();
                }
                this.uiCollection = uiCollection;
            }


        } else {

            this.startup(uiCollection);
        }
    },
    createUIID: function () {
        return this.currentUICount++;
    },

    createToolID: function () {
        return this.currentToolCount++;
    },

    createToolSignatureID: function (userInterface, tool) {


        let id = tool.function.source.id + "-" + tool.widget.source.id;
        if (tool.presentation) {
            id = id + "-" + tool.presentation.source.id;
        }
        return id;
    },

    getUserInterfaceWithID: function (id) {
        for (let i = 0; i < this.userInterfaces.length; i++) {
            if (this.userInterfaces[i].id === id) {
                return this.userInterfaces[i];
            }
        }

    },

    shutdown: function () {

        if (easyReading.started) {
            easyReading.uiUpdated = true;
            globalEventListener.reset();
            easyReading.widgets.forEach(function (widget) {
                widget.remove();
            });

            easyReading.presentations.forEach(function (presentation) {
                presentation.remove();
            });

            easyReading.userInterfaces.forEach(function (userInterface) {
                userInterface.remove();
            });

            if(easyReading.busyAnimation){
                easyReading.busyAnimation.stopAnimation();
            }
            easyReading.started = false;

            console.log("SHUTING DOWN");
        }

    },

    compareConfiguration: function (config1, config2) {

        let conf1 = { ...config1 };
        let conf2 = { ...config2 };

        Object.keys(conf1).forEach(function(key) {
            if(conf1[key] === null){
                conf1[key] = false;
            }
        });

        Object.keys(conf2).forEach(function(key) {
            if(conf2[key] === null){
                conf2[key] = false;
            }
        });

        if(conf1.id){
            delete conf1.id;
        }

        if(conf2.id){
            delete conf2.id;
        }

        return JSON.stringify(conf1) === JSON.stringify(conf2)


    }

};


document.addEventListener('easyReadingStartUp', function (event) {
    let requestResult = document.getElementById('easy-reading-debug');
    let uiCollection = JSON.parse(requestResult.dataset.result);
    if (easyReading.started) {
        easyReading.update(uiCollection);
    } else {
        easyReading.shutdown();
        easyReading.startup(uiCollection);
    }


});

document.addEventListener('userLogout', function (event) {
    easyReading.shutdown();

});