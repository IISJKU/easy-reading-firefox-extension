class TextSelector extends WidgetBase {

    constructor(functionInfo, userInterface, targetID, configuration) {
        super(functionInfo, userInterface, targetID, configuration);

        this.textSelections = [];
        this.currentTextSelection = 0;
        this.widgetID = 'er_button_' + this.widgetID;
        $("#" + targetID).append("<button id='" + this.widgetID + "' class='easy-reading-button'><img src='" + functionInfo.source.defaultIconURL + "' title='" + functionInfo.source.name + ": " + functionInfo.source.description + "'> </button>");

        globalEventListener.addPresentationFinishListener(this);
        globalEventListener.addWidgetActivatedListeners(this);
        this.enable();

    }

    enable() {
        $("#" + this.widgetID).on("click", this, this.buttonClicked);

    }

    disable() {
        $("#" + this.widgetID).off("click", this, this.buttonClicked);

        globalEventListener.removeWidgetActivatedListeners(this);
        globalEventListener.removePresentationFinishListener(this);


    }

    buttonClicked(e) {

        let textSelector = e.data;
        if(textSelector.active){

            textSelector.deactivateWidget(true);
            $("#" + e.data.widgetID).removeClass("er-button-active");

        }



        let selectedText = pageUtils.getSelectedText();

        if(selectedText.textNodes){


            let currentParentBlockNode = null;
            let textNodesWithSameParentBlockNode = [];
            textSelector.textSelections = [];
            textSelector.currentTextSelection = 0;
            for(let i=0; i < selectedText.textNodes.length; i++){

                let nextParentBlockNode = pageUtils.getParentBlockContainerFromNode(selectedText.textNodes[i]);
                if(currentParentBlockNode != nextParentBlockNode){

                    currentParentBlockNode = nextParentBlockNode;

                    if(textNodesWithSameParentBlockNode.length){


                        for(let k=0; k< textNodesWithSameParentBlockNode.length; k++){

                            if(pageUtils.containsTextContent(textNodesWithSameParentBlockNode[k])){

                                let lastNode = textNodesWithSameParentBlockNode[textNodesWithSameParentBlockNode.length-1];

                                if($(lastNode).parents('a').length){
                                    if(lastNode.nextSibling){
                                        textNodesWithSameParentBlockNode.push(lastNode.nextSibling);
                                    }
                                }
                                textSelector.textSelections.push(new TextSelection(textNodesWithSameParentBlockNode,500));
                                break;
                            }

                        }

                    }

                    textNodesWithSameParentBlockNode = [];

                }
                textNodesWithSameParentBlockNode.push(selectedText.textNodes[i]);

            }
            if(textNodesWithSameParentBlockNode.length){
                for(let k=0; k< textNodesWithSameParentBlockNode.length; k++) {

                    if (pageUtils.containsTextContent(textNodesWithSameParentBlockNode[k])) {

                        let lastNode = textNodesWithSameParentBlockNode[textNodesWithSameParentBlockNode.length-1];

                        if($(lastNode).parents('a').length){
                            if(lastNode.nextSibling){
                                textNodesWithSameParentBlockNode.push(lastNode.nextSibling);
                            }
                        }

                        textSelector.textSelections.push(new TextSelection(textNodesWithSameParentBlockNode, 500));
                        break;
                    }

                }
            }



            //Check if result was there. If yes. Remove it and stop. New selection needs to be done.
            if(pageUtils.removeDisplayInTextNodes(selectedText.textNodes)){


                return;
            }

            textSelector.active = true;


            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }else if (document.selection) {
                document.selection.empty();
            }



            if(textSelector.textSelections.length){
                let nextParagraph = textSelector.textSelections[0].getNextParagraph();



                requestManager.createRequest(e.data, nextParagraph, e);

                $("#" + e.data.widgetID).addClass("er-button-active");
            }


        }


    }

    presentationFinished(presentation){
        if(!this.active){
            return;
        }
        let nextParagraph = this.textSelections[this.currentTextSelection].getNextParagraph();

        if(!nextParagraph && this.currentTextSelection < this.textSelections.length-1){

            this.currentTextSelection++;
            nextParagraph = this.textSelections[this.currentTextSelection].getNextParagraph();

        }

        if(nextParagraph){
            requestManager.createRequest(this, nextParagraph, null, true);
        }else{
            $("#" + this.widgetID).removeClass("er-button-active");
            this.active = false;
        }


    }
    remove(){
        $("#"+this.widgetID).remove();

    }
}
