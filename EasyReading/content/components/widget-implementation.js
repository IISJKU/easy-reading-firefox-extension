class WidgetBase{

    constructor(functionInfo, userInterface,targetID, configuration){
        this.functionInfo = functionInfo;
        this.userInterface = userInterface;
        this.targetID = targetID;
        this.configuration = configuration;
        this.toolId = this.functionInfo.toolId;
        this.widgetID = userInterface.id+"_"+functionInfo.source.id+"_"+functionInfo.toolId;

    }

    disable(){

    }

    enable(){

    }


    presentationFinished(presentation){

    }

    requestFailed(req,config){

    }

    activateWidget(){


    }
    deactivateWidget(manual=true){
        if(easyReading.userInterfaces[this.userInterface.uiId]){
            if(easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolIndex]){
                if(easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolIndex].presentation){
                    easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolIndex].presentation.removeAnimatedResult();
                }
                if (manual) {
                    // If request has been manually cancelled by user, inform reasoner
                    contentScriptController.sendMessageToBackgroundScript({
                        type: "helpCancelled",
                        ui_i: this.userInterface.id,
                        tool_i: this.toolId,
                    });
                }
            }
        }
        requestManager.cancelRequest(this);
    }


    widgetActivated(widget){
        if(widget !== this){

            /*
            if(easyReading.userInterfaces[this.userInterface.uiId]){
                if(easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolId]){
                    if(easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolId].presentation){
                        easyReading.userInterfaces[this.userInterface.uiId].tools[this.toolId].presentation.removeResult();
                    }
                }
            }
            */
            requestManager.cancelRequest(this);
            this.deactivateWidget(false);
        }
    }

    requestFinished() {

    }

    getPresentation(){

        return this.userInterface.tools[this.toolIndex].presentation;
    }

    stopPresentation(){

        let presentation = this.getPresentation();

        if(presentation){
            presentation.removeResult();
        }


    }

    remove(){
        console.log("Removing widget:");
    }

    setToolIndex(toolIndex){
        this.toolIndex = toolIndex;
    }

    updateConfigurationAndFunction(configuration,functionInfo){
        this.functionInfo = functionInfo;
        this.configuration = configuration;
        this.toolId = this.functionInfo.toolId;
    }


}