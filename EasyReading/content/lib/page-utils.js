var pageUtils = {
    sentenceTokenizer: new SentenceTokenizer(),
    containsTextContent:function(node) {

        for (let i = 0; i < node.textContent.length; i++) {
            if (pageUtils.util.unicodeChar.test(node.textContent[i])) {
                return true;
            }
        }
        return false;

    },
    removeDisplayUnderPosition:function (x,y) {
        let oldResult = $(document.elementFromPoint(x, y)).closest('.easy-reading-result');
        if (oldResult.length) {


            let presentationID = oldResult.data("presentationid").split('-');

            easyReading.userInterfaces[presentationID[0]].tools[presentationID[1]].presentation.removeResult(oldResult.data("requestid"));
        }
    },

    getWordUnderPosition: function (x, y) {


        /*
        let oldResult = $(document.elementFromPoint(x, y)).closest('.easy-reading-result');
        if (oldResult.length) {


            let presentationID = oldResult.data("presentationid").split('-');
            easyReading.userInterfaces[presentationID[0]].tools[presentationID[1]].presentation.removeResult(oldResult.attr('id'));
        }
        */

        let range, textNode, offset;
        // Internet Explorer
        if (document.body.createTextRange) {
            try {
                range = document.body.createTextRange();
                range.moveToPoint(x, y);
                range.select();
                range = pageUtils.util.getTextRangeBoundaryPosition(range, true);

                textNode = range.node;
                offset = range.offset;
            } catch (e) {
                return null; // Sigh, IE
            }
        }

            // Firefox, Safari
        // REF: https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
        else if (document.caretPositionFromPoint) {
            range = document.caretPositionFromPoint(x, y);
            textNode = range.offsetNode;
            offset = range.offset;

            // Chrome
            // REF: https://developer.mozilla.org/en-US/docs/Web/API/document/caretRangeFromPoint
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
            textNode = range.startContainer;
            offset = range.startOffset;
        }


        // Only act on text nodes
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            return null;
        }

        let data = textNode.textContent;

        // Sometimes the offset can be at the 'length' of the data.
        // It might be a bug with this 'experimental' feature
        // Compensate for this below
        if (offset >= data.length) {
            offset = data.length - 1;
        }

        // Ignore the cursor on spaces - these aren't words
        if (pageUtils.util.isW(data[offset])) {
            return null;
        }


        // Scan behind the current character until whitespace is found, or beginning
        i = offset;
        while (i > 0 && !pageUtils.util.isW(data[i - 1])) {
            i--;
        }
        let begin = i;

        // Scan ahead of the current character until whitespace is found, or end
        i = offset;
        while (i < data.length - 1 && !pageUtils.util.isW(data[i + 1])) {
            i++;
        }
        let end = i;

        // This is our temporary word
        let word = data.substring(begin, end + 1);

        let textNodes = [];
        textNodes.push(textNode);

        if (end === data.length - 1) {

            for (let nextNode = pageUtils.util.getNextNode(textNode); nextNode; nextNode = pageUtils.util.getNextNode(nextNode)) {
                let nextText = nextNode.textContent;
                if (nextText) {
                    // Add the letters from the next text block until a whitespace, or end
                    let i = 0;
                    let endIndex = -1;
                    while (i < nextText.length && !pageUtils.util.isW(nextText[i])) {
                        word += nextText[i];
                        endIndex = i;
                        end = endIndex;
                        i++;
                    }
                    if (endIndex !== -1) {
                        textNodes.push(nextNode);
                        if (i !== nextText.length) {
                            end = endIndex;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        }
        if (begin === 0) {
            for (let prevNode = pageUtils.util.getPrevNode(textNode); prevNode; prevNode = pageUtils.util.getPrevNode(prevNode)) {
                let prevText = prevNode.textContent;
                if (prevText) {
                    // Add the letters from the next text block until a whitespace, or end
                    let i = prevText.length - 1;
                    let beginIndex = -1;
                    while (i >= 0 && !pageUtils.util.isW(prevText[i])) {
                        word = prevText[i] + word;
                        beginIndex = i;
                        begin = beginIndex;
                        i--;
                    }

                    if (i !== prevText.length - 1) {
                        textNodes.unshift(prevNode);

                        if (beginIndex !== 0) {
                            begin = beginIndex;
                            break;
                        }

                    } else {
                        break;
                    }
                }
            }
        }

        textNodes = pageUtils.util.getTextNodes(textNodes);


        /*
        Used to mark
        textNodes[textNodes.length-1].splitText(end+1);

        if(begin !== 0){
            textNodes[0] = textNodes[0].splitText(begin);

        }

        for(let i=0; i < textNodes.length; i++){
            $( textNodes[i] ).wrap( "<span class='new' style='color: yellow'></span>" );

        }
        */


        //Check if element at point and parent container of textNode do match.
        //Because caret position can vary from container position

        let elem = $(document.elementFromPoint(x, y));
        let container = $(textNode).parent()[0];
        /*

                if (elem[0] !== $(textNode).parent()[0]) {
                    return "";

                }
                */

        //REMOVE &shy;
        word = word.replace(/\u00AD/g, '');
        let iterator = new HTMLIterator(textNodes[0]);
        let paragraph_container = iterator.getContainerOfTextNode(textNodes[0]);

        let text = $(paragraph_container).text();
        text = text.trim().replace(/(\r\n\t|\n|\r\t)/gm, "");
        text = text.replace(/\t/g, '');
        text = text.replace(/\n/g, '');
        let textPieces = text.split(word);



        let maxSentenceLength = 150;

        let beginString = textNodes[0].textContent.substring(0,begin);
        if(beginString.length < maxSentenceLength){
            let prevNode = pageUtils.util.getPrevNode(textNodes[0]);
            while(prevNode){

                let prevTextNodes = [];
                if(prevNode.nodeName !== '#text'){
                    prevTextNodes = pageUtils.util.getChildTextNodes(prevNode);
                }else{
                    prevTextNodes.push(prevNode);
                }

                let finished = false;
                for(let i= prevTextNodes.length-1; i >=0; i--){
                    beginString = prevTextNodes[i].textContent + beginString;
                    if(beginString.length >=maxSentenceLength){
                        finished = true;
                        break;
                    }
                }

                if(!finished){
                    prevNode = pageUtils.util.getPrevNode(prevNode);
                }else{
                    break;
                }
            }
        }

        let endString = textNodes[textNodes.length-1].textContent.substring(end+1);

        if(endString.length < maxSentenceLength){
            let nextNode = pageUtils.util.getNextNode(textNodes[textNodes.length-1]);
            while(nextNode){

                let nextTextNodes = [];
                if(nextNode.nodeName !== '#text'){
                    nextTextNodes = pageUtils.util.getChildTextNodes(nextNode);
                }else{
                    nextTextNodes.push(nextNode);
                }

                let finished = false;
                for(let i= nextTextNodes.length-1; i >=0; i--){
                    endString =  endString+nextTextNodes[i].textContent;
                    if(endString.length >=maxSentenceLength){
                        finished = true;
                        break;
                    }
                }

                if(!finished){
                    nextNode = pageUtils.util.getNextNode(nextNode);
                }else{
                    break;
                }
            }
        }


        beginString = beginString.trim().replace(/(\s+)/gm, " ").replace(/([\r\n])/gm, "");
        this.sentenceTokenizer.setEntry(beginString);
        let beginSentences = this.sentenceTokenizer.getSentences();


        endString = endString.trim().replace(/(\s+)/gm, " ").replace(/([\r\n])/gm, "");
        this.sentenceTokenizer.setEntry(endString);
        let endSentences = this.sentenceTokenizer.getSentences();


        return {
            type: Word.className,
            value: word,
            word: word,
            begin: begin,
            end: end,
            textNodes: textNodes,
            sentenceBegin: beginSentences[beginSentences.length-1],
            sentenceEnd: endSentences[0],
            lang: pageUtils.util.getLanguageOfElement(textNodes[0]),
            container: container,


        }

    },
    removeDisplayInTextNodes(textNodes){


        let foundResult = false;
        for(let i=0; i < textNodes.length; i++){
            let oldResult = $(textNodes[i]).closest('.easy-reading-result');

            if (oldResult.length) {

                let presentationID = oldResult.data("presentationid").split('-');
                easyReading.userInterfaces[presentationID[0]].tools[presentationID[1]].presentation.removeResult(oldResult.data("requestid"));

                foundResult =  true;
            }

        }

        return foundResult;
    },

    removeDisplayInParagraph(e){
        let target = $(e.target);
        if (target.length > 0) {

            let oldResult = $(e.target).closest('.easy-reading-result');
            if (oldResult.length) {


                let presentationID = oldResult.data("presentationid").split('-');
                easyReading.userInterfaces[presentationID[0]].tools[presentationID[1]].presentation.removeResult(oldResult.data("requestid"));
            }

            $(e.target).children('.easy-reading-result').each(function () {

                let presentationID = $(this).data("presentationid").split('-');
                easyReading.userInterfaces[presentationID[0]].tools[presentationID[1]].presentation.removeResult($(this).data("requestid"));
            });
        }
    },

    getParagraph(e) {
        // console.log("Paragraph at position: (" + e.clientX + ", " + e.clientY + ")");
        let target = $(e.target);
        if (target.length > 0) {
            let paragraph = '';
            let iterator = new HTMLIterator(target[0]);
            let textNodes = iterator.getChildTextNodes(target[0]);
            let paragraph_container = iterator.getContainerOfTextNode(textNodes[0]);

            if(!paragraph_container){
                //Element got removed-was old result - get new element
                target = $(document.elementFromPoint(e.clientX,e.clientY));
                if (target.length > 0) {
                    iterator = new HTMLIterator(target[0]);
                    textNodes = iterator.getChildTextNodes(target[0]);
                    paragraph_container = iterator.getContainerOfTextNode(textNodes[0]);

                    if(!paragraph_container){
                        return;
                    }
                }
            }
            if (paragraph_container.length > 0) {
                paragraph = paragraph_container[0].innerText.trim().replace(/(\r\n\t|\n|\r\t)/gm, "");
                paragraph = paragraph.replace(/\t/g, '');
                //Remove &shy; etc
                paragraph = paragraph.replace(/[\u00AD\u002D\u2011]+/g,'');
                return {
                    type: Paragraph.className,
                    value: paragraph,
                    word: paragraph,
                    element: paragraph_container[0],
                    textNodes: pageUtils.util.getTextNodes(paragraph_container),
                    lang: pageUtils.util.getLanguageOfElement(paragraph_container[0]),
                }
            } else {
                paragraph = target.text().trim().replace(/(\r\n\t|\n|\r\t)/gm, "");
                paragraph = paragraph.replace(/\t/g, '');
                //Remove &shy; etc
                paragraph = paragraph.replace(/[\u00AD\u002D\u2011]+/g,'');
                return {
                    type: Paragraph.className,
                    value: paragraph,
                    word: paragraph,
                    element: e.target,
                    textNodes: pageUtils.util.getTextNodes($(e.target)),
                    lang: pageUtils.util.getLanguageOfElement(e.target),
                }
            }
        } else {
            return {
                type: Paragraph.className,
                value: '',
                word: '',
                element: e.target,
                textNodes: [],
                lang: pageUtils.util.getLanguageOfElement(e.target),
            }
        }
    },

    getParagraphUnderPosition(x,y){
        let target = document.elementFromPoint(x, y);
        if (target) {
            return pageUtils.getParagraph({
                target: target,
                clientX: x,
                clientY: y,
            });
        } else {
            return null;
        }
    },

    wrapWordIn: function (word, element, classes,attributes="",id="") {
        word.textNodes[word.textNodes.length - 1].splitText(word.end + 1);

        if (word.begin !== 0) {
            word.textNodes[0] = word.textNodes[0].splitText(word.begin);

        }

        let idString= "";
        if(id){
            idString = " id='" + id + "' ";
        }

        return ($(word.textNodes).wrap("<" + element + idString + " class='" + classes + "' "+attributes+"></" + element + ">").parent());
        /*for(let i=0; i < word.textNodes.length; i++){
            $( word.textNodes[i] ).wrap( "<"+element+" class='"+classes+"'></"+element+">" );

        }*/
    },

    getSelectedText: function () {
        let textNodes = pageUtils.util.getSelectedTextNodes();
        let text = "";
        if(textNodes.length > 0){
            for(let i=0; i < textNodes.length; i++){
                text+=textNodes[i].textContent;
            }
        }else{
            textNodes = null;
        }


        return {
            type: Paragraph.className,
            value: text,
            word: text,
            element: textNodes,
            textNodes: textNodes,
            lang: pageUtils.util.getLanguageOfElement(textNodes[0]),

        }

    },
    getParentBlockContainerFromNode:function(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        while (!pageUtils.util.isBlockDisplay(node)) {
            node = node.parentElement;

        }

        return node;

    },
    util: {


        isBlockDisplay:function(element) {
            if (element.style.display) {
                switch (element.style.display.toLowerCase()) {
                    case "block":
                    case "flex":
                    case "grid":
                    case "list-item":
                    case "run-in":
                    case "table":
                    case "table-caption":
                    case "table-column-group":
                    case "table-header-group":
                    case "table-footer-group":
                    case "table-row-group":
                    case "table-cell":
                    case "table-column":
                    case "table-row": {
                        return true;
                    }

                    default: {
                        return false;
                    }
                }

            } else {
                switch (element.nodeName.toLowerCase()) {
                    case "body":
                    case "h1":
                    case "h2":
                    case "h3":
                    case "h4":
                    case "h5":
                    case "h6":
                    case "p":
                    case "div":
                    case "ul":
                    case "ol":
                    case "li":
                    case "dl":
                    case "dt":
                    case "dd":
                    case "th":
                    case "td":
                    case "tr":
                    case "thead":
                    case "tbody": {
                        return true;
                    }

                    default: {
                        return false;
                    }

                }
            }

        },

        unicodeWord: XRegExp('^\\pL+$'),
        unicodeChar: XRegExp('^\\pL+$'),
        unicodePunctuation: XRegExp("^\\p{P}"),

        getSelectedTextNodes:function () {
            let selection = window.getSelection();
            if(selection.rangeCount === 0){
                return [];
            }

            let textNodes = [];


            for(let i=0; i < selection.rangeCount; i++){
                let range = selection.getRangeAt(i);

                let startNode = range.startContainer;
                //Split text at start
                if(range.startContainer.nodeName === '#text'){
                    if(range.startContainer.length === range.startOffset){

                        startNode = range.startContainer.nextSibling;

                    }else{

                        startNode = range.startContainer.splitText(range.startOffset);
                    }
                }

                let endNode = null;
                if(range.endContainer.nodeName === '#text'){

                    if(range.endContainer.length !== range.endOffset){

                        range.endContainer.splitText(range.endOffset);

                    }
                    endNode = range.endContainer;
                }else{
                    let containerNodes = pageUtils.util.getChildTextNodes(range.endContainer);

                    endNode = containerNodes[containerNodes.length-1];
                }

                textNodes = textNodes.concat( pageUtils.util.getTextNodesBetweenRange(startNode, endNode));

            }

            return textNodes;

        },

        getTextNodesBetweenRange: function (node, endNode, result) {
            if (!result) {
                result = [];
            }

            if (endNode === node) {
                if (node.nodeName  !== '#text') {

                    return pageUtils.util.getChildTextNodes(node);
                }
                result.push(endNode);
                return result;
            }

            if (node.nodeName === '#text') {
                result.push(node);
                if (node.nextSibling) {
                    return  pageUtils.util.getTextNodesBetweenRange(node.nextSibling, endNode, result);
                } else {

                    let nextParentNode = pageUtils.util.getNextParentNode(node);
                    if(nextParentNode){
                        return pageUtils.util.getTextNodesBetweenRange(nextParentNode, endNode, result);
                    }
                    //This should never happen - but just in case....
                    return result;
                }

            } else {

                if (node.firstChild) {
                    return  pageUtils.util.getTextNodesBetweenRange(node.firstChild, endNode, result);
                } else if (node.nextSibling) {
                    return  pageUtils.util.getTextNodesBetweenRange(node.nextSibling, endNode, result);
                }


                let nextParentNode =  pageUtils.util.getNextParentNode(node);
                if(nextParentNode){
                    return pageUtils.util.getTextNodesBetweenRange(nextParentNode, endNode, result);
                }
                //This should never happen - but just in case....
                return [];

            }

        },

        getNextParentNode : function (node) {
            let currentNode = node;

            while (currentNode.parentNode) {

                if (currentNode.parentNode.nextSibling) {
                    return currentNode.parentNode.nextSibling;
                } else {
                    currentNode = currentNode.parentNode;
                }
            }
        },

        isW: function (s) {

            //&shy; etc
            if (s.charCodeAt(0).toString(16) === "ad") {
                return false;
            }


            return !pageUtils.util.unicodeWord.test(s);

            /*
            if(s===" "){
                return true;
            }

            return /[ \f\n\r\t\v\u00A0\u2028\u2029]/.test(s);
            */
        },

        isBarrierNode: function (node) {

            return node ? /^(BR|DIV|P|PRE|TD|TR|TABLE|HEAD|BODY)$/i.test(node.nodeName) : true;
        },

        getNextNode: function (node) {
            let n = null;

            // Does this node have a sibling?
            if (node.nextSibling) {
                n = node.nextSibling;

                // Doe this node's container have a sibling?
            } else if (node.parentNode && node.parentNode.nextSibling) {
                if (!pageUtils.util.isBarrierNode(node.parentNode)) {
                    n = node.parentNode.nextSibling;
                }

            }
            return pageUtils.util.isBarrierNode(n) ? null : n;
        },

        getPrevNode: function (node) {
            let n = null;

            // Does this node have a sibling?
            if (node.previousSibling) {
                n = node.previousSibling;

                // Does this node's container have a sibling?
            } else if (node.parentNode && node.parentNode.previousSibling) {
                if (!pageUtils.util.isBarrierNode(node.parentNode)) {
                    n = node.parentNode.previousSibling;
                }
            }
            return pageUtils.util.isBarrierNode(n) ? null : n;
        },


        getTextNodes: function (nodes) {

            let textNodes = [];


            for (let i = 0; i < nodes.length; i++) {

                if (nodes[i].nodeName !== '#text') {

                    textNodes = textNodes.concat(pageUtils.util.getChildTextNodes(nodes[i]))
                } else {
                    textNodes.push(nodes[i]);
                }

            }

            return textNodes;
        },

        getChildTextNodes: function (node) {
            let textNodes = [];

            let childNodes = node.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
                if (childNodes[i].nodeName !== '#text') {
                    textNodes = textNodes.concat(pageUtils.util.getChildTextNodes(childNodes[i]));
                } else {

                    textNodes.push(childNodes[i]);
                }
            }
            return textNodes;

        },

        getTextRangeBoundaryPosition: function (textRange, isStart) {

            let workingRange = textRange.duplicate();
            workingRange.collapse(isStart);
            let containerElement = workingRange.parentElement();
            let workingNode = document.createElement("span");
            let comparison, workingComparisonType = isStart ?
                "StartToStart" : "StartToEnd";

            let boundaryPosition, boundaryNode;

            // Move the working range through the container's children, starting at
            // the end and working backwards, until the working range reaches or goes
            // past the boundary we're interested in
            do {
                containerElement.insertBefore(workingNode, workingNode.previousSibling);
                workingRange.moveToElementText(workingNode);
            } while ((comparison = workingRange.compareEndPoints(
                workingComparisonType, textRange)) > 0 && workingNode.previousSibling);

            // We've now reached or gone past the boundary of the text range we're
            // interested in so have identified the node we want
            boundaryNode = workingNode.nextSibling;
            if (comparison === -1 && boundaryNode) {
                // This must be a data node (text, comment, cdata) since we've overshot.
                // The working range is collapsed at the start of the node containing
                // the text range's boundary, so we move the end of the working range
                // to the boundary point and measure the length of its text to get
                // the boundary's offset within the node
                workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);

                boundaryPosition = {
                    node: boundaryNode,
                    offset: workingRange.text.length
                };
            } else {
                // We've hit the boundary exactly, so this must be an element
                boundaryPosition = {
                    node: containerElement,
                    offset: getChildIndex(workingNode)
                };
            }

            // Clean up
            workingNode.parentNode.removeChild(workingNode);

            return boundaryPosition;

        },
        getLanguageOfElement(element) {

            if (typeof element === "undefined") {
                return "undefined";
            }

            if (typeof element.lang === "undefined" || element.lang === "") {


                if (element.parentNode !== null) {
                    return pageUtils.util.getLanguageOfElement(element.parentNode);
                } else {
                    //Return english as default language
                    return "undefined";
                }

            }

            return element.lang;

        },

    },


    getSentenceUnderPosition: function (x, y) {
        let range, textNode, offset;
        // Internet Explorer
        if (document.body.createTextRange) {
            try {
                range = document.body.createTextRange();
                range.moveToPoint(x, y);
                range.select();
                range = pageUtils.util.getTextRangeBoundaryPosition(range, true);

                textNode = range.node;
                offset = range.offset;
            } catch (e) {
                return ""; // Sigh, IE
            }
        }

            // Firefox, Safari
        // REF: https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
        else if (document.caretPositionFromPoint) {
            range = document.caretPositionFromPoint(x, y);
            textNode = range.offsetNode;
            offset = range.offset;

            // Chrome
            // REF: https://developer.mozilla.org/en-US/docs/Web/API/document/caretRangeFromPoint
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
            textNode = range.startContainer;
            offset = range.startOffset;
        }

        // Only act on text nodes
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            return "";
        }

        let data = textNode.textContent;

        // Sometimes the offset can be at the 'length' of the data.
        // It might be a bug with this 'experimental' feature
        // Compensate for this below
        if (offset >= data.length) {
            offset = data.length - 1;
        }

        // Ignore the cursor on spaces - these aren't words
        if (pageUtils.util.isW(data[offset])) {
            return "";
        }


    }

};

class TextSelection {
    constructor(textNodes, maxTextLength = 0) {

        this.textNodes = textNodes;
        this.maxTextLength = maxTextLength;
        this.textLength = 0;

        if (textNodes[0]) {

            this.currentTextNode = textNodes[0];

        } else {
            this.currentTextNode = null;
        }

        this.textLength = this.calculateTextLength();



    }


    calculateTextLength(fromIndex = 0) {

        let textLength = 0;
        for (let i = fromIndex; i < this.textNodes.length; i++) {
            textLength += this.textNodes[i].textContent.length;
        }

        return textLength;
    }

    getBlockContainersFromTextNodes() {

        let blockNodes = [];

        let currentBlockNode = null;

        for (let i = 0; i < this.textNodes.length; i++) {


            let nextBlockNode = this.getParentBlockContainerFromNode(this.textNodes[i]);

            if (nextBlockNode !== currentBlockNode) {

                if (this.containsTextContent(this.textNodes[i])) {

                    blockNodes.push(nextBlockNode);
                }
                currentBlockNode = nextBlockNode;
            }

        }


    }

    getNextBlockDisplayNodesFromNode(node) {

        let currentTextNodeIndex = this.textNodes.indexOf(node);

        let connectedTextNodes = [];
        let textContentLength = 0;
        let text = "";
        if (currentTextNodeIndex !== -1) {
            let currentBlockNode = this.getParentBlockContainerFromNode(this.textNodes[currentTextNodeIndex]);

            for (let i = currentTextNodeIndex; i < this.textNodes.length; i++) {

                let nextBlockNode = this.getParentBlockContainerFromNode(this.textNodes[i]);

                if (nextBlockNode !== currentBlockNode) {

                    if (this.containsTextContent(this.textNodes[i])) {

                        return {
                            startIndex: currentTextNodeIndex,
                            nextIndex: i,
                            lastBlock: false,
                            text: text,
                            textContentLength: textContentLength,
                            textNodes: connectedTextNodes
                        };
                    }

                    currentBlockNode = nextBlockNode;
                }

                text += this.textNodes[i].textContent;
                textContentLength += this.textNodes[i].textContent.length;
                connectedTextNodes.push(this.textNodes[i]);
            }
        }
        return {
            startIndex: currentTextNodeIndex,
            nextIndex: this.textNodes.length,
            lastBlock: true,
            text: text,
            textContentLength: textContentLength,
            textNodes: connectedTextNodes
        };
    }

    containsTextContent(node) {

        for (let i = 0; i < node.textContent.length; i++) {
            if (pageUtils.util.unicodeChar.test(node.textContent[i])) {
                return true;
            }
        }
        return false;

    }

    getParentBlockContainerFromNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        while (!this.isBlockDisplay(node)) {
            node = node.parentElement;

        }

        return node;

    }

    isBlockDisplay(element) {
        if (element.style.display) {
            switch (element.style.display.toLowerCase()) {
                case "block":
                case "flex":
                case "grid":
                case "list-item":
                case "run-in":
                case "table":
                case "table-caption":
                case "table-column-group":
                case "table-header-group":
                case "table-footer-group":
                case "table-row-group":
                case "table-cell":
                case "table-column":
                case "table-row": {
                    return true;
                }

                default: {
                    return false;
                }
            }

        } else {
            switch (element.nodeName.toLowerCase()) {
                case "body":
                case "h1":
                case "h2":
                case "h3":
                case "h4":
                case "h5":
                case "h6":
                case "p":
                case "div":
                case "ul":
                case "ol":
                case "li":
                case "dl":
                case "dt":
                case "dd":
                case "th":
                case "td":
                case "tr":
                case "thead":
                case "tbody": {
                    return true;
                }

                default: {
                    return false;
                }

            }
        }

    }

    getNextParagraph(maxTextLength){

        let nextParagraphTextNodes =  this.getNext(maxTextLength,true);


        if(nextParagraphTextNodes){
            let text = "";
            for(let i= 0; i < nextParagraphTextNodes.length; i++ ){
                text += nextParagraphTextNodes[i].textContent;
            }

            return {
                type: Paragraph.className,
                value: text,
                word: text,
                element: nextParagraphTextNodes,
                textNodes: nextParagraphTextNodes,
                lang: pageUtils.util.getLanguageOfElement(nextParagraphTextNodes[0]),
            }
        }



    }

    getNextText(maxTextLength){
        let nextTextNodes =  this.getNext(maxTextLength);

        if(nextTextNodes){
            let text = "";
            for(let i= 0; i < nextTextNodes.length; i++ ){
                text += nextTextNodes[i].textContent;
            }

            return {
                type: Paragraph.className,
                value: text,
                word: text,
                element: nextTextNodes,
                textNodes: nextTextNodes,
                lang: pageUtils.util.getLanguageOfElement(nextTextNodes[0]),
            }
        }
    }



    getNext(maxTextLength,paragraphOnly = false) {

        if(maxTextLength){
            this.maxTextLength = maxTextLength;
        }

        if (this.currentTextNode) {

            let currentTextNodeIndex = this.textNodes.indexOf(this.currentTextNode);

            if (currentTextNodeIndex !== -1) {
                let remainingTextLength = this.calculateTextLength(currentTextNodeIndex);


                //If remaining text is short enough
                if (remainingTextLength < this.maxTextLength) {

                    this.currentTextNode = null;
                    return this.textNodes.slice(currentTextNodeIndex);

                } else {

                    //Split remaining text
                    let currentTextLength = 0;
                    let textNodes = [];

                    while (currentTextLength <= this.maxTextLength) {

                        let currentBlock = this.getNextBlockDisplayNodesFromNode(this.currentTextNode);

                        if (currentTextLength + currentBlock.textContentLength > this.maxTextLength) {

                            let options = {
                                "newline_boundaries" : false,
                                "html_boundaries"    : false,
                                "sanitize"           : false,
                                "allowed_tags"       : false,
                                "preserve_whitespace" : true,
                                "abbreviations"      : null
                            };
                            let sentences = tokenizer.sentences(currentBlock.text, options);


                            //Sentence split possible
                            if (sentences.length > 1 && currentTextLength + sentences[0].length <= this.maxTextLength) {

                                let sentenceCharLength = 0;
                                for (let i = 0; i < sentences.length; i++) {
                                    if (currentTextLength + sentenceCharLength + sentences[i].length <= this.maxTextLength) {
                                        sentenceCharLength += sentences[i].length;
                                    } else {
                                        break;
                                    }

                                }
                                let splitBlocks = this.splitBlock(currentBlock,sentenceCharLength);
                                this.currentTextNode = splitBlocks.remainingTextNode;
                                return textNodes.concat(splitBlocks.textNodes);


                            } else {


                                //We already have a result and split it next time
                                if (sentences[0].length < this.maxTextLength && textNodes.length > 0) {

                                    let nextIndex = this.textNodes.indexOf(textNodes[textNodes.length-1])+1;
                                    this.currentTextNode = this.textNodes[nextIndex];
                                    return textNodes;

                                } else {

                                    //HARD SPLIT - No Other choice - Textnode is bigger then maxTextLength
                                    let maxIndex = this.maxTextLength - currentTextLength;

                                    //Check if we can split @ a punctuation
                                    for (let i = maxIndex; i > 0; i--) {
                                        if (pageUtils.util.unicodePunctuation.test(currentBlock.text.charAt(i))) {
                                            let currentChar = currentBlock.text.charAt(i);
                                            if(currentChar !== '"' && currentChar !== "'" && currentChar !== "´"&& currentChar !== "`"){
                                                let splitBlocks = this.splitBlock(currentBlock,i+1);
                                                this.currentTextNode = splitBlocks.remainingTextNode;
                                                return textNodes.concat(splitBlocks.textNodes);
                                            }


                                        }
                                    }
                                    for (let i = maxIndex; i > 0; i--) {
                                        if (currentBlock.text.charAt(i) ===" ") {
                                            let splitBlocks = this.splitBlock(currentBlock,i+1);
                                            this.currentTextNode = splitBlocks.remainingTextNode;
                                            return textNodes.concat(splitBlocks.textNodes);
                                        }

                                    }
                                    /*
                                    //Check if we can split @ non unicode char
                                    for (let i = maxIndex; i > 0; i--) {
                                        if (!pageUtils.util.unicodeChar.test(currentBlock.text.charAt(i))) {
                                            let splitBlocks = this.splitBlock(currentBlock,i+1);
                                            this.currentTextNode = splitBlocks.remainingTextNode;
                                            return textNodes.concat(splitBlocks.textNodes);
                                        }

                                    }*/

                                    //No non unicode chars or punctuations detected... just split the text
                                    let splitBlocks = this.splitBlock(currentBlock,maxIndex);
                                    this.currentTextNode = splitBlocks.remainingTextNode;
                                    return textNodes.concat(splitBlocks.textNodes);

                                }


                            }


                        } else {





                            currentTextLength+=currentBlock.textContentLength;
                            textNodes = textNodes.concat(currentBlock.textNodes);

                        }

                        if (currentBlock.lastBlock) {
                            this.currentTextNode = null; //Finished
                            return textNodes;
                        } else {

                            this.currentTextNode = this.textNodes[currentBlock.nextIndex];

                            if(paragraphOnly){
                                for(let i=0;i < currentBlock.text.length; i++){
                                    if(pageUtils.util.unicodeChar.test(currentBlock.text[i])){
                                        return currentBlock.textNodes;
                                    }
                                }
                            }
                        }


                    }


                }


            }


        }

    }

    splitBlock(block, splitIndex){
        let splitCalculation = this.calculateSplitOfBlock(block,splitIndex);
        if(splitCalculation){


            let remainingTextNode = this.splitTextNode(splitCalculation.textNode,splitCalculation.splitIndex);

            return {
                textNodes: block.textNodes.slice(0,splitCalculation.blockTextNodeIndex+1),
                remainingTextNode: remainingTextNode,
            };



        }
    }

    calculateSplitOfBlock(block, splitIndex) {
        let blockTextNodeCharLengthCount = 0;
        for (let i = 0; i < block.textNodes.length; i++) {
            if (blockTextNodeCharLengthCount + block.textNodes[i].textContent.length < splitIndex) {
                blockTextNodeCharLengthCount += block.textNodes[i].textContent.length;
            } else {

                return {
                    textNode: block.textNodes[i],
                    splitIndex: splitIndex - blockTextNodeCharLengthCount,
                    blockTextNodeIndex: i,
                }

            }

        }

    }



    splitTextNode(textNode, splitIndex) {

        let textNodeIndex = this.textNodes.indexOf(textNode);
        if (textNodeIndex !== -1) {
            let newNode = this.textNodes[textNodeIndex].splitText(splitIndex);
            this.textNodes.splice(textNodeIndex+1,0,newNode);
            return newNode;


        }
    }


}