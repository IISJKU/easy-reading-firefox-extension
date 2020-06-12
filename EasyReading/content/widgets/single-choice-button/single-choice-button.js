class SingleChoiceButton extends WidgetBase {

    constructor(functionInfo, userInterface, targetID, configuration) {
        super(functionInfo, userInterface, targetID, configuration);

        this.active = false;
        this.outputTypeClass = null;
        this.requestInProgress = false;
        this.widgetID = 'er_single_choice_button_' + this.widgetID;
        $("#" + targetID).append("<button id='" + this.widgetID + "' class='easy-reading-single-choice easy-reading-button'><img src='" + functionInfo.source.defaultIconURL + "' title='" + functionInfo.source.name + ": " + functionInfo.source.description + "'> </button>");

     //   $("#" + this.widgetID).css('cssText', 'background-color: '+configuration.backgroundColorButtonActive+' !important');
        this.enable();
        globalEventListener.addWidgetActivatedListeners(this);
    }


    enable() {
        $("#" + this.widgetID).on("click", this, this.singleChoiceButtonClicked);

    }

    disable() {
        $("#" + this.widgetID).off("click", this, this.singleChoiceButtonClicked);
        globalEventListener.removeWidgetActivatedListeners(this);

    }

    activateWidget(){
        console.log("Single Choice Button Active");
        $("#" + this.widgetID).addClass("easy-reading-single-choice-active");
        if(this.functionInfo.source.inputTypes.length > 0){
            switch (this.functionInfo.source.inputTypes[0].inputType) {

                case Paragraph.className:
                    globalEventListener.addParagraphClickListener(this);
                    break;

                case Word.className:
                    globalEventListener.addWordClickListener(this);
                    break;

                case AnnotatedParagraph.className:
                    globalEventListener.addParagraphClickListener(this);
                    break;
                default:
                    break;
            }
            this.outputTypeClass = this.functionInfo.source.inputTypes[0].inputType;
        }

        globalEventListener.widgetActivated(this);

        this.active = true;

    }

    deactivateWidget(manual=true){
        super.deactivateWidget(manual);
        console.log("Single Choice Button Not Active");
        $("#" + this.widgetID).removeClass("easy-reading-single-choice-active");

        for (let i = 0; i < this.functionInfo.source.inputTypes.length; i++) {
            switch (this.functionInfo.source.inputTypes[i].inputType) {
                case Word.className:
                    globalEventListener.removeWordClickListener(this);
                    break;
                case Paragraph.className:
                    globalEventListener.removeParagraphClickListener(this);
                    break;
                case AnnotatedParagraph.className:
                    globalEventListener.removeParagraphClickListener(this);
                    break;
                default:
                    break;



            }

        }

        this.active = false;
    }

    singleChoiceButtonClicked(e) {
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
            if(this.outputTypeClass === Paragraph.className){
                requestManager.createRequest(this, paragraph, e);
            }else if(this.outputTypeClass === AnnotatedParagraph.className){
                paragraph.type = AnnotatedParagraph.className;
                requestManager.createRequest(this, paragraph, e);
            }
        }
    }

    filterUserInterfaceElements(element){
        return $(element).parents('.easy-reading-interface').length;
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