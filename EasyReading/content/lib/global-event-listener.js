let globalEventListener = {
    listenersInitialized:false,
    init: function () {
        globalEventListener.activeClickListeners = [];
        globalEventListener.activeMouseMoveListeners = [];
        globalEventListener.activeMouseDownListeners = [];
        globalEventListener.activeMouseUpListeners = [];
        globalEventListener.activeKeyDownListeners = [];
        globalEventListener.activeKeyUpListeners = [];
        globalEventListener.activeWordClickListeners = [];
        globalEventListener.activeParagraphClickListeners = [];
        globalEventListener.activeWordMoveListeners = [];
        globalEventListener.activePresentationFinishListeners = [];
        globalEventListener.widgetActivatedListeners = [];
        globalEventListener.currentWord = "";
    },
    reset: function () {
        this.init();
    },
    initEventListeners: function () {
        if(globalEventListener.listenersInitialized){
            return;
        }
        globalEventListener.listenersInitialized = true;

        $(document).on("click touch", function (e) {
            if(alertManager.suppressClick()){
                return;
            }
            if (!globalEventListener.isIgnoredElement(e.target)) {


                if (globalEventListener.activeClickListeners.length || globalEventListener.activeWordClickListeners.length || globalEventListener.activeParagraphClickListeners.length) {
                    globalEventListener.clickListener(e);
                    globalEventListener.wordClickListener(e);
                    globalEventListener.paragraphClickListener(e);
                    e.stopPropagation();
                    e.preventDefault();
                }

            }
        });

        /*
        document.addEventListener('click', function(e){
            if (!$(e.target).closest('.easy-reading-interface').length){

                if(globalEventListener.activeClickListeners.length||globalEventListener.activeWordClickListeners.length || globalEventListener.activeParagraphClickListeners.length){
                    globalEventListener.clickListener(e);
                    globalEventListener.wordClickListener(e);
                    globalEventListener.paragraphClickListener(e);
                    e.stopPropagation();
                    e.preventDefault();
                }

            }
        }, true);
        */
        /*
        $(document).on("click touch", function (e) {
            if (!$(e.target).closest('.easy-reading-interface').length){
                globalEventListener.clickListener(e);
                globalEventListener.wordClickListener(e);
                globalEventListener.paragraphClickListener(e);

            }


        });*/

        $(document).mousemove(function (e) {
            globalEventListener.mouseMoveListener(e);
            globalEventListener.wordMoveListener(e);

        });

        $(document).mouseup(function (e) {
            globalEventListener.mouseUpListener(e);

        });

        $(document).mousedown(function (e) {
            globalEventListener.mouseDownListener(e);


        });


        $(document).keydown(function (e) {
            globalEventListener.keyDownListener(e);
        });

        $(document).keyup(function (e) {
            globalEventListener.keyUpListener(e);
        });


    },

    /*
    CLICK LISTENER
     */
    addClickListener: function (clickListener) {

        globalEventListener.activeClickListeners.push(clickListener);

    },

    removeClickListener: function (clickListener) {
        const index = globalEventListener.activeClickListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeClickListeners.splice(index, 1);
        }

    },

    clickListener: function (e) {
        for (let i = 0; i < globalEventListener.activeClickListeners.length; i++) {

            globalEventListener.activeClickListeners[i].onClick(e);

        }


    },

    /*
    MOUSE MOVE LISTENER
     */
    addMouseMoveListener: function (clickListener) {
        globalEventListener.activeMouseMoveListeners.push(clickListener);

    },

    removeMouseMoveListener: function (clickListener) {
        const index = globalEventListener.activeMouseMoveListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeMouseMoveListeners.splice(index, 1);
        }

    },


    mouseMoveListener: function (e) {
        for (let i = 0; i < globalEventListener.activeMouseMoveListeners.length; i++) {

            globalEventListener.activeMouseMoveListeners[i].onMouseMove(e);

        }
    },


    /*
    MOUSE DOWN LISTENER
     */
    addMouseDownListener: function (clickListener) {
        globalEventListener.activeMouseDownListeners.push(clickListener);

    },

    removeMouseDownListener: function (clickListener) {
        const index = globalEventListener.activeMouseDownListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeMouseDownListeners.splice(index, 1);
        }

    },


    mouseDownListener: function (e) {
        for (let i = 0; i < globalEventListener.activeMouseDownListeners.length; i++) {

            globalEventListener.activeMouseDownListeners[i].onMouseDown(e);

        }
    },

    /*
   MOUSE UP LISTENER
    */
    addMouseUpListener: function (clickListener) {
        globalEventListener.activeMouseUpListeners.push(clickListener);

    },

    removeMouseUpListener: function (clickListener) {
        const index = globalEventListener.activeMouseUpListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeMouseUpListeners.splice(index, 1);
        }

    },


    mouseUpListener: function (e) {
        for (let i = 0; i < globalEventListener.activeMouseUpListeners.length; i++) {

            globalEventListener.activeMouseUpListeners[i].onMouseUp(e);

        }
    },

    /*
   KEY DOWN LISTENER
    */
    addKeyDownListener: function (clickListener) {
        globalEventListener.activeKeyDownListeners.push(clickListener);

    },

    removeKeyDownListener: function (clickListener) {
        const index = globalEventListener.activeKeyDownListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeKeyDownListeners.splice(index, 1);
        }

    },


    keyDownListener: function (e) {
        for (let i = 0; i < globalEventListener.activeKeyDownListeners.length; i++) {

            globalEventListener.activeKeyDownListeners[i].onKeyDown(e);

        }
    },

    /*
   KEY UP LISTENER
    */
    addKeyUpListener: function (clickListener) {
        globalEventListener.activeKeyUpListeners.push(clickListener);

    },

    removeKeyUpListener: function (clickListener) {
        const index = globalEventListener.activeKeyUpListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeKeyUpListeners.splice(index, 1);
        }

    },


    keyUpListener: function (e) {
        for (let i = 0; i < globalEventListener.activeKeyUpListeners.length; i++) {

            globalEventListener.activeKeyUpListeners[i].onKeyUp(e);

        }
    },

    /*

    WordClickListener - gets Word when Clicked

     */

    addWordClickListener: function (clickListener,compatibleWithOtherPresentations= false) {
        globalEventListener.activeWordClickListeners.push({
            listener: clickListener,
            compatibleWithOtherPresentations: compatibleWithOtherPresentations
        });

    },


    removeWordClickListener: function (clickListener) {

        for(let i=0; i < globalEventListener.activeWordClickListeners.length; i++){
            if(globalEventListener.activeWordClickListeners[i].listener === clickListener){
                globalEventListener.activeWordClickListeners.splice(i, 1);
                return;
            }
        }
        /*
        const index = globalEventListener.activeWordClickListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeWordClickListeners.splice(index, 1);
        }
        */

    },
    wordClickListener: function (e) {
        if (globalEventListener.activeWordClickListeners.length > 0) {


            for(let i=0; i < globalEventListener.activeWordClickListeners.length; i++){

                if(!globalEventListener.activeWordClickListeners[i].compatibleWithOtherPresentations){

                    pageUtils.removeDisplayUnderPosition(e.clientX,e.clientY);
                    break;
                }

            }


            let currentWord = pageUtils.getWordUnderPosition(e.clientX, e.clientY);
            if (currentWord) {
                for (let i = 0; i < globalEventListener.activeWordClickListeners.length; i++) {

                    globalEventListener.activeWordClickListeners[i].listener.onWordClick(currentWord, e);

                }
            }

        }

    },

    addParagraphClickListener: function (clickListener,compatibleWithOtherPresentations= false) {
        globalEventListener.activeParagraphClickListeners.push({
            listener: clickListener,
            compatibleWithOtherPresentations: compatibleWithOtherPresentations
        });
    },


    removeParagraphClickListener: function (clickListener) {
        for(let i=0; i < globalEventListener.activeParagraphClickListeners.length; i++){
            if(globalEventListener.activeParagraphClickListeners[i].listener === clickListener){
                globalEventListener.activeParagraphClickListeners.splice(i, 1);
                return;
            }
        }
        /*
        const index = globalEventListener.activeParagraphClickListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeParagraphClickListeners.splice(index, 1);
        }
        */
    },


    paragraphClickListener: function (e) {
        if (globalEventListener.activeParagraphClickListeners.length > 0) {


            for(let i=0; i < globalEventListener.activeParagraphClickListeners.length; i++){

                if(!globalEventListener.activeParagraphClickListeners[i].compatibleWithOtherPresentations){

                    pageUtils.removeDisplayInParagraph(e);
                    break;
                }

            }


            let currentParagraph = pageUtils.getParagraph(e);
            if (currentParagraph) {
                for (let i = 0; i < globalEventListener.activeParagraphClickListeners.length; i++) {

                    globalEventListener.activeParagraphClickListeners[i].listener.onParagraphCLick(currentParagraph, e);

                }
            }

        }

    },

    /*

     */
    addWordMoveListener: function (clickListener) {
        globalEventListener.activeWordMoveListeners.push(clickListener);

    },

    removeWordMoveListener: function (clickListener) {
        const index = globalEventListener.activeWordMoveListeners.indexOf(clickListener);
        if (index !== -1) {
            globalEventListener.activeWordMoveListeners.splice(index, 1);
        }

    },


    wordMoveListener: function (e) {

        if (globalEventListener.activeWordMoveListeners.length > 0) {
            let newWord = pageUtils.getWordUnderPosition(e.clientX, e.clientY);

            if (globalEventListener.currentWord.word !== newWord.word ||
                globalEventListener.currentWord.begin !== newWord.begin ||
                globalEventListener.currentWord.end !== newWord.end ||
                globalEventListener.currentWord.textNode !== newWord.textNode) {
                globalEventListener.currentWord = newWord;
                for (let i = 0; i < globalEventListener.activeWordMoveListeners.length; i++) {
                    globalEventListener.activeWordClickListeners[i].onWordMove(newWord, e);

                }
            }
        }

    },


    addPresentationFinishListener: function (presentationFinishedListener) {
        globalEventListener.activePresentationFinishListeners.push(presentationFinishedListener);
    },


    removePresentationFinishListener: function (presentationFinishedListener) {
        const index = globalEventListener.activePresentationFinishListeners.indexOf(presentationFinishedListener);
        if (index !== -1) {
            globalEventListener.activePresentationFinishListeners.splice(index, 1);
        }
    },

    presentationFinished(presentation) {

        for (let i = 0; i < globalEventListener.activePresentationFinishListeners.length; i++) {

            if (globalEventListener.activePresentationFinishListeners[i].userInterface.uiId === presentation.userInterface.uiId
                && globalEventListener.activePresentationFinishListeners[i].toolId === presentation.functionInfo.toolId) {

                globalEventListener.activePresentationFinishListeners[i].presentationFinished(presentation);

            }

        }
    },

    addWidgetActivatedListeners: function (widgetActivatedListener) {
        globalEventListener.widgetActivatedListeners.push(widgetActivatedListener);
    },


    removeWidgetActivatedListeners: function (widgetActivatedListener) {
        const index = globalEventListener.widgetActivatedListeners.indexOf(widgetActivatedListener);
        if (index !== -1) {
            globalEventListener.widgetActivatedListeners.splice(index, 1);
        }
    },

    widgetActivated(widget) {

        for (let i = 0; i < globalEventListener.widgetActivatedListeners.length; i++) {
            globalEventListener.widgetActivatedListeners[i].widgetActivated(widget);
        }
    },

    isIgnoredElement(element){
        return $(element).closest('.easy-reading-interface').length || $(element).closest('button').length ||  $(element).closest('input').length || $(element).closest('select').length;
    }
};