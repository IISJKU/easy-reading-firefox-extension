class TextMarker {
    constructor(textNodes, wordsToHighLight, configuration) {
        this.textNodes = textNodes;
        this.markedTextNodes = [];
        this.words = wordsToHighLight;


        this.textNodesToMark = [];
        this.currentMarkedWordIndex = 0;

        this.uniCodeLetter = XRegExp('^\\pL+$');

        this.finished = false;

        let defaultConfiguration = {
            highlightElementName: "span",
            highlightElementClass: "word-highlighter",
            backgroundColor: "#000000",
            color: "#ffff00",

        };

        if (configuration) {
            this.configuration = $.extend(defaultConfiguration, configuration);
        } else {
            this.configuration = defaultConfiguration;
        }


    }


    markNext() {


        if (this.textNodes.length === 0) {
            return;
        }

        let nextTextNodeIndex;

        if (this.textNodesToMark.length === 0) {
            nextTextNodeIndex = 0;
        } else {

            //When marking sentences and words. Sentence gets highlighted first. Wraps class over text node. Text node get sepererated and wrapped by word. We find now the last element
            let currentTextNodes = this.getTextNodes($(this.textNodesToMark[this.textNodesToMark.length - 1]).parents("." + this.configuration.highlightElementClass));

            for (let i = 0; i < this.textNodes.length; i++) {
                if (this.textNodes[i] === currentTextNodes[currentTextNodes.length - 1]) {
                    nextTextNodeIndex = i + 1;
                    break;
                }
            }

        }

        this.remove();

        this.textNodesToMark = [];

        if (this.currentMarkedWordIndex === this.words.length) {

            //We are at the end ;-)
            this.finished = true;
            return;
        }


        let currentCharIndex = 0;
        let wordStartIndex = -1;
        let wordStart = -1;
        let firstCharFound = false;

        for (let i = nextTextNodeIndex; i < this.textNodes.length; i++) {


            let currentText = this.textNodes[i].data;


            let validTextNode = true;
            for (let k = 0; k < currentText.length; k++) {

                if (this.words[this.currentMarkedWordIndex].charAt(currentCharIndex) === currentText.charAt(k)) {

                    if (wordStartIndex === -1) {
                        wordStartIndex = k;
                        wordStart = i;
                        firstCharFound = true;
                    }

                    currentCharIndex++;

                    if (currentCharIndex === this.words[this.currentMarkedWordIndex].length) {
                        //Word found!
                        this.currentMarkedWordIndex++;


                        this.textNodesToMark.push(this.textNodes[i]);

                        let found = false;

                        //Split Front TextNode
                        if (wordStartIndex !== 0) {


                            let newTextNode = this.textNodes[wordStart].splitText(wordStartIndex);

                            let startIndex = 0;
                            for (let l = 0; l < this.textNodes.length; l++) {
                                if (this.textNodesToMark[0] === this.textNodes[l]) {
                                    startIndex = l;
                                }
                            }
                            i++;
                            this.textNodes.splice(startIndex + 1, 0, newTextNode);
                            this.textNodesToMark[0] = newTextNode; //this.textNodesToMark[0].splitText(wordStartIndex);
                        }

                        //Split Back TextNode
                        if (wordStartIndex !== 0 && this.textNodesToMark.length === 1) {
                            let newTextNode = this.textNodesToMark[0].splitText(k + 1 - wordStartIndex);
                            this.textNodes.splice(i + 1, 0, newTextNode);

                        } else {

                            let newTextNode = this.textNodes[i].splitText(k + 1);
                            this.textNodes.splice(i + 1, 0, newTextNode);


                        }

                        $(this.textNodesToMark).wrap("<" + this.configuration.highlightElementName + " class='" + this.configuration.highlightElementClass + "' style='background:" + this.configuration.backgroundColor + "; color:" + this.configuration.color + "'></" + this.configuration.highlightElementName + ">");


                        return;


                    }


                } else {

                    if (this.isNumberOrUnicodeLetter(currentText.charAt(k))) {
                        validTextNode = false;

                        console.log("------------------------------");
                        console.log("Not conform letter detected.");
                        console.log("TTS word letters do not match the HTML letters");
                        console.log("------------------------------");


                    }
                }
            }
            if (validTextNode && firstCharFound) {
                this.textNodesToMark.push(this.textNodes[i]);
            }

        }

    }

    remove() {

        if (this.textNodes.length > 0) {


            for (let i = 0; i < this.textNodes.length; i++) {

                let highlightSpan = $(this.textNodes[i]).parents("." + this.configuration.highlightElementClass);
                if (highlightSpan.length !== 0) {

                    if(highlightSpan[0].childNodes[0]){
                        $(highlightSpan[0].childNodes[0]).unwrap();
                    }

                }
            }

        }



    }


    getTextNodes(element) {

        let textNodes = [];

        for (let i = 0; i < element.length; i++) {
            if (element[i].nodeName !== '#text') {
                textNodes = textNodes.concat(this.getChildTextNodes(element[i]))
            } else {
                textNodes.push(element[i]);
            }
        }
        return textNodes;
    }

    getChildTextNodes(node) {
        let textNodes = [];

        let childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            if (childNodes[i].nodeName !== '#text') {
                textNodes = textNodes.concat(this.getChildTextNodes(childNodes[i]));
            } else {

                textNodes.push(childNodes[i]);
            }
        }
        return textNodes;

    }

    isNumberOrUnicodeLetter(char) {

        if (char === "" || char === ":" || char === "." || char === '"' || char === ',') {
            return false;
        }
        //Check if it is a number...
        if ('0123456789'.indexOf(char) !== -1) {
            return true;
        }

        //Check if it is a unicocde char
        return this.uniCodeLetter.test(char);

    }

}