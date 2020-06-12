class ContinuousChoiceButton extends WidgetBase {

    constructor(functionInfo, userInterface, targetID, configuration) {
        super(functionInfo, userInterface, targetID, configuration);
        this.continuesToCreateRequests = true;
        this.active = false;
        this.requestInProgress = false;
        this.widgetID = 'er_continuous_choice_button_' + this.widgetID;
        $("#" + targetID).append("<button id='" + this.widgetID + "' class='easy-reading-continuous-choice easy-reading-button'><img src='" + functionInfo.source.defaultIconURL + "' title='" + functionInfo.source.name + ": " + functionInfo.source.description + "'> </button>");

        globalEventListener.addPresentationFinishListener(this);

        this.htmlIterator = null;
        this.textSelection = null;
        this.enable();

        globalEventListener.addWidgetActivatedListeners(this);

    }


    enable() {
        $("#" + this.widgetID).on("click", this, this.continuousChoiceButtonClicked);

    }

    disable() {
        $("#" + this.widgetID).off("click", this, this.continuousChoiceButtonClicked);
        globalEventListener.removeWidgetActivatedListeners(this);
        globalEventListener.removePresentationFinishListener(this);


    }

    activateWidget(){
        console.log("continuous Choice Button Active");
        $("#" + this.widgetID).addClass("easy-reading-continuous-choice-active");


        //Only consider first input type as valid one
        if(this.functionInfo.source.inputTypes.length > 0){
            switch (this.functionInfo.source.inputTypes[0].inputType) {
                case Word.className:
                    globalEventListener.addWordClickListener(this,this.getPresentation().isCompatibleWithOtherPresentations);
                    break;
                case Paragraph.className:
                    globalEventListener.addParagraphClickListener(this,this.getPresentation().isCompatibleWithOtherPresentations);
                    break;
                default:
                    break;
            }
        }

        globalEventListener.widgetActivated(this);

        this.active = true;
    }

    deactivateWidget(manual=true){
        super.deactivateWidget(manual);


        console.log("continuous Choice Button Not Active");
        $("#" + this.widgetID).removeClass("easy-reading-continuous-choice-active");

        for (let i = 0; i < this.functionInfo.source.inputTypes.length; i++) {
            switch (this.functionInfo.source.inputTypes[i].inputType) {
                case Word.className:
                    globalEventListener.removeWordClickListener(this);
                    break;
                case Paragraph.className:
                    globalEventListener.removeParagraphClickListener(this);
                    break;
                default:
                    break;
            }
        }


        if(this.htmlIterator){
            this.htmlIterator.normalizeOldTextNodes();
        }

        this.active = false;
    }

    continuousChoiceButtonClicked(e) {

        if(e.data.active){
            e.data.deactivateWidget(true);
        }else{
            e.data.activateWidget();
        }
    }

    onWordClick(word, e) {
        if(this.requestInProgress){
            return;
        }
        this.requestInProgress = true;

        easyReading.busyAnimation.startAnimation();

        if(!this.filterUserInterfaceElements(word)){
            requestManager.createRequest(this, word, e);
        }

    }

    onParagraphCLick(paragraph, e) {
        if(this.requestInProgress){
            return;
        }
        this.requestInProgress = true;
        easyReading.busyAnimation.startAnimation();

        if(!this.filterUserInterfaceElements(paragraph)){

            this.htmlIterator = new HTMLIterator(paragraph.element);


            let currentParagraph = this.htmlIterator.getNextElements();
            if(currentParagraph){
                this.textSelection =  new TextSelection(currentParagraph.textNodes,500);
                let nextParagraph = this.textSelection.getNextParagraph();
                if(nextParagraph){
                    requestManager.createRequest(this, nextParagraph, e);
                }
            }
        }
    }

    filterUserInterfaceElements(element){
        return $(element).parents('.easy-reading-interface').length;
    }

    presentationFinished(presentation){

        if(!this.active || !this.textSelection){
            return;
        }

        let nextParagraph = this.textSelection.getNextParagraph();
        if(nextParagraph){
            requestManager.createRequest(this, nextParagraph, null, true);
        }else{
            let nextElements = this.htmlIterator.getNextElements();
            if(nextElements){
                this.textSelection =  new TextSelection(nextElements.textNodes,500);
                nextParagraph = this.textSelection.getNextParagraph();
                if(nextParagraph){
                    requestManager.createRequest(this, nextParagraph, null, true);
                }
            }
        }

        if (!nextParagraph) {
            console.log('no next paragraph found!!');
            contentScriptController.sendMessageToBackgroundScript({
                type: "helpComplete",
                ui_i: this.userInterface.id,
                tool_i: this.toolId,
            });
        }

    }

    requestFinished(){
        super.requestFinished();
        easyReading.busyAnimation.stopAnimation();
        this.requestInProgress = false;
    }

    remove(){


        if(this.active){
            this.deactivateWidget(false);
        }
        this.disable();

        $("#" + this.widgetID).remove();
    }
}