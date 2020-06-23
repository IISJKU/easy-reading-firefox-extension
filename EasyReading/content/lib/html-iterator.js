class HTMLIterator{

    constructor(initialElement){
        this.currentElements = [];
        this.currentElements.push(initialElement);
        this.currentElement = $(initialElement);
        this.initialState = true;
        this.textNodes = [];
        this.textContainerTypes = [
            "p",
            "div",
            "body",
            "code",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "dl",
            "ol",
            "ul",
            "table",
            "textarea",
            "blockquote",
            "aside",
            "article",
            "address",
            "fieldset",
            "figcaption",
            "footer",
            "form",
            "header",
            "main",
            "nav",
            "pre",
            "section",
            "table",
            "li",
            "td",






        ];

        this.possibleContainers = [
            "b",
            "big",
            "i",
            "small",
            "tt",
            "abbr","acronym","cite","code","dfn","em","kdb","strong","samp","var",
            "a", "bdo", "br", "img", "map", "object", "q", "sub", "sup",
            "span",
            "button",
            "input"


        ];

        this.nonTextContainerTypes = [
            "script",
            "noscript",
            "style"
        ];

        this.uniCodeLetter = XRegExp('^\\pL+$');
    }
    getNextElements(){

        this.currentElements = [];
        if(this.initialState){
            this.initialState = false;
        }else{

            if(this.currentElement.nodeName === "#text" && this.textNodes.length !== 0){
                //If the current node is a textnode it is likely that it has been splitted. Therefore we take the last element.
                //textNodes is shared by reference to all other highlightning mechanisms
                this.currentElement = this.getFirstElement(this.textNodes[this.textNodes.length-1]);
            }else{
                this.currentElement = this.getFirstElement(this.currentElement);
            }



        }
        this.textElementFound = false;

        if(this.currentElement){

            this.currentElements.push(this.currentElement);

            //while it is a textnode or inline element

            while(this.currentElement.nodeName ==="#text" || this.textContainerTypes.indexOf($(this.currentElement).prop('nodeName').toLowerCase()) === -1){


                if(!this.textElementFound){
                    if(this.currentElement.nodeName === "#text") {
                        if (this.containsText(this.currentElement)){
                            this.textElementFound = true;
                        }
                    }else{
                        this.textElementFound = true;
                    }
                }


                let newElement = this.getNextElement(this.currentElement,!this.textElementFound);

                if(!newElement){
                    break;
                }



                if(newElement.nodeName ==="#text" || this.textContainerTypes.indexOf($(newElement).prop('nodeName').toLowerCase()) === -1){
                    this.currentElement = newElement;
                    this.currentElements.push(newElement);
                }else if( !this.textElementFound){
                    this.currentElement = newElement;
                    this.currentElements.push(newElement);
                    break;
                }else{
                    break;
                }

            }

            this.normalizeOldTextNodes();

            this.textNodes = [];
            let oneTextNodeHasText = false;
            for(let i=0; i < this.currentElements.length; i++){
                let currentTextNodes = this.getTextNodes(this.currentElements[i]);
                for(let k=0; k < currentTextNodes.length; k++){

                    if($(currentTextNodes[k].parentNode).is(":visible") && $(currentTextNodes[k].parentNode).css('display') !== 'none' && $(currentTextNodes[k].parentNode).css("visibility") !== "hidden"){
                        // element is not hidden
                        this.textNodes.push(currentTextNodes[k]);

                        if(!oneTextNodeHasText){
                            if(this.containsText(currentTextNodes[k])){
                                oneTextNodeHasText = true;
                            }
                        }
                    }
                }

            }



            if(this.textNodes.length === 0 || !oneTextNodeHasText){

                return this.getNextElements();
            }else{

                return {
                    textNodes:this.textNodes,
                    element:this.currentElement,
                    elements: this.currentElements,
                    text:$(this.textNodes).text(),
                    value:$(this.textNodes).text(),
                    lang: pageUtils.util.getLanguageOfElement(this.textNodes[0]),
                }
            }





        }

    }

    getFirstElement(lastElement){

        if(lastElement){



            let textNode = null;
            let currentElementTemp = $(lastElement);
            while(!textNode){

                //<div>text</div>standaloneTextnode<p>some text</p> standalonetextnode = textnode between to blocks
                let standaloneTextNode = this.getNextStandaloneTextNode(currentElementTemp);

                if(standaloneTextNode){
                    //Only return this when the parent container does contain block containers
                    //  if(this.elementContainsTextContainer($(currentElementTemp).parent())){
                    return standaloneTextNode;

                    // }

                }

                currentElementTemp = this.getNextOrParentNext(currentElementTemp);

                if(!currentElementTemp){
                    return;
                }
                if(currentElementTemp.length === 0){
                    return;
                }

                textNode = this.getFirstTextNode(currentElementTemp);


                let nextElement = this.getContainerOfTextNode(textNode);


                //Found bad item looking for next
                if(nextElement){
                    if(this.nonTextContainerTypes.indexOf(nextElement.prop('nodeName').toLowerCase()) !== -1){

                        currentElementTemp = nextElement;
                        nextElement = null;

                    }
                }


                if(nextElement){
                    return nextElement;
                }else{
                    textNode = null;
                }


            }
        }

    }

    getNextElement(lastElement){

        if(lastElement){

            //<div>text</div>standaloneTextnode<p>some text</p> standalonetextnode = textnode between to blocks
            let standaloneTextNode = this.getNextStandaloneTextNode($(lastElement));

            if(standaloneTextNode){
                //Only return this when the parent container does contain block containers
                //  if(this.elementContainsTextContainer($(currentElementTemp).parent())){
                return standaloneTextNode;

                // }

            }

            if($(lastElement).next().length !== 0){

                //Be sure next element would not be a new block element....
                if( this.textContainerTypes.indexOf($(lastElement).next().prop('nodeName').toLowerCase()) === -1 ){

                    return $(lastElement).next();

                }
            }
        }

    }

    getFirstTextNode(element) {

        for(let i=0; i < element.length; i++){
            if(element[i].nodeName !== '#text'){

                return this.getFirstChildTextNodes(element[i]);
            }else{
                if(this.containsText( element[i])){
                    return element[i];
                }
            }
        }
    }

    getFirstChildTextNodes (node) {
        let childNodes = node.childNodes;
        for(let i=0; i < childNodes.length; i++){
            if(childNodes[i].nodeName !== '#text'){
                let textNode = this.getFirstChildTextNodes(childNodes[i]);
                if(textNode){
                    return textNode;
                }
            }else{

                if(this.containsText(childNodes[i])){
                    return childNodes[i];
                }


            }
        }


    }

    getTextNodes(element) {

        let textNodes = [];
        if(element.nodeName === "#text"){
            textNodes.push(element);
            return textNodes;
        }

        for(let i=0; i < element.length; i++){
            if(element[i].nodeName !== '#text'){
                textNodes = textNodes.concat(this.getChildTextNodes(element[i]))
            }else{
                textNodes.push(element[i]);
            }
        }
        return textNodes;
    }

    getChildTextNodes (node) {
        let textNodes = [];

        let childNodes = node.childNodes;
        for(let i=0; i < childNodes.length; i++){
            if(childNodes[i].nodeName !== '#text'){
                textNodes = textNodes.concat(this.getChildTextNodes(childNodes[i]));
            }else{

                textNodes.push(childNodes[i]);
            }
        }
        return textNodes;

    }

    getContainerOfTextNode(textNode){

        let parent = $(textNode).parent();

        if(parent.length !==0){



            if(this.textContainerTypes.indexOf(parent.prop('nodeName').toLowerCase()) !== -1){
                return parent;
            }
            else if(this.nonTextContainerTypes.indexOf(parent.prop('nodeName').toLowerCase()) !== -1){
                //Found bad item
                return parent;
            } else{

                /*
                if(this.possibleContainers.indexOf(parent.prop('nodeName').toLowerCase()) !== -1){

                    let parentNext = $(parent).next();

                    while(parentNext.length !== 0){

                        //Check if parent next is a text container
                        if(this.textContainerTypes.indexOf(parentNext.prop('nodeName').toLowerCase()) !== -1){
                            return parent;
                        }


                        //Check if any successor is a text container
                        for(let i= 0; i < this.textContainerTypes.length; i++){
                            if($(parentNext).find(this.textContainerTypes[i]).length !== 0){
                                return parent;
                            }

                        }
                        parentNext = $(parentNext).next();

                    }

                    let parentPrev = $(parent).prev();

                    while(parentPrev.length !== 0){

                        //Check if parent prev is a text container
                        if(this.textContainerTypes.indexOf(parentPrev.prop('nodeName').toLowerCase()) !== -1){

                            return parent;
                        }


                        //Check if any successor is a text container
                        for(let i= 0; i < this.textContainerTypes.length; i++){

                            if($(parentPrev).find(this.textContainerTypes[i]).length !== 0){
                                return parent;
                            }

                        }


                        parentPrev = $(parentPrev).prev();

                    }







                }
                */
                return this.getContainerOfTextNode(parent);
            }


        }






    }

    getNextOrParentNext(element){

        if(element.next().length !== 0){
            return element.next();
        }


        let parentElement = $(element).parent();
        while(parentElement.length !==0){


            if($(parentElement).next().length !== 0){

                return $(parentElement).next();
            }

            parentElement = $(parentElement).parent();


        }
    }

    isNumberOrUnicodeLetter(char){

        if(char === ""){
            return false;
        }

        //Check if it is a number...
        if ('0123456789!.?'.indexOf(char) !== -1) {
            return true;
        }

        //Check if it is a unnocdeLetter
        return this.uniCodeLetter.test(char);

    }

    containsText(textNode){

        let currentText = textNode.data;

        for (let i=0; i < currentText.length; i++) {

            if(this.isNumberOrUnicodeLetter(currentText.charAt(i))){

                return true;
            }

        }

        return false;
    }

    getNextStandaloneTextNode(element){

        let currentElement = $(element);
        if(currentElement.length > 0){
            if(currentElement[0].nextSibling){
                if(currentElement[0].nextSibling.nodeName === "#text"){
                    //     if(this.containsText(currentElement[0].nextSibling)){
                    return currentElement[0].nextSibling
                    //    }
                }
            }
        }

    }

    elementContainsTextContainer(element){
        for(let i = 0; i < this.textContainerTypes.length; i ++){

            if($(element).find(this.textContainerTypes[i]).length !== 0){
                return true;
            }
        }
        return false;
    }


    normalizeOldTextNodes(){
        let parentElements = [];
        for(let i=0; i < this.textNodes.length; i++){

            if(parentElements.indexOf(this.textNodes[i].parentNode) === -1){
                parentElements.push(this.textNodes[i].parentNode);
            }

        }
        for(let i=0; i < parentElements.length; i++){
            if(parentElements[i]){
                parentElements[i].normalize();
            }

        }

    }




}
