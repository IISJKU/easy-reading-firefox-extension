class ContentReplacementSwitcher extends Presentation {
    constructor(functionInfo, userInterface, configuration) {
        super(functionInfo, userInterface, configuration);
        this.requestCounter = 0;
        this.currentRequestID = null;
        this.replacements = [];
    }

    renderResult(request, result) {

        if(this.currentRequestID){
            this.removeResult();
        }

        let ioRes = ioTypeUtils.toIOTypeInstance(result.result);
        if (ioRes.name === "Error") {
            alertManager.showErrorAlert(ioRes.message);

        } else if (ioRes.name === "NoResult") {

            if(!result.requestInfo.automaticRequest){
                alertManager.showInfoAlert(ioRes.message);
            }
        } else if (ioRes.name === "ContentReplacement") {

            if(ioRes.replacements.length > 0){
                let requestID = this.createRequestId();
                let resultClass = this.getResultClass();
                let presentationIdentifier = this.getPresentationAndRequestIdentifier(requestID);

                this.replacements = ioRes.replacements;
                this.currentRequestID = requestID;


                for(let i=0; i  < ioRes.replacements.length; i++){


                    if(ioRes.replacements[i].type === "content_replacement"){


                        try{
                            let replacementID = "replacement-" + i + "-" + ioRes.replacements[i].replacement.id;

                            ioRes.replacements[i].replacementID = replacementID;
                            let elementToReplace = $(ioRes.replacements[i].replacement.selector);

                            //We dont use tag name any more..... tag could be a span or a p and then headings and other p will break dom....
                            let tagName = $(ioRes.replacements[i].replacement.selector).prop("tagName").toLowerCase();
                            let originalClasses = $(ioRes.replacements[i].replacement.selector).attr('class')

                            $(elementToReplace).addClass(replacementID + ' er-crs-original-text er-content-replacement');




                            console.log(getMatchedCSSRules(elementToReplace[0]));
                            let rules = getMatchedCSSRules(elementToReplace[0]);
                            let combinedStyles = "";
                            for (let i = 0; i < rules.length; i++) {
                                console.log(rules[i].style.cssText);
                                combinedStyles += rules[i].style.cssText;
                            }

                            let html = '<span class="er-content-replacement er-content-replacement-ui"><span><span class="er-toggle-button  ' + replacementID + ' role="button" tabindex="0" aria-pressed="false" aria-label="Switch to simple version" >\n' +
                                '    <span class="er-toggle-button-inner">\n' +
                                '        <span class="er-toggle-button-front">\n' +
                                '            <img src="'+this.configuration.remoteAssetDirectory+'/help-logo.png" alt="">\n' +
                                '        </span>\n' +
                                '        <span class="er-toggle-button-back">\n' +
                                '             <img src="'+this.configuration.remoteAssetDirectory+'/original-logo.png" alt="">\n' +
                                '        </span>\n' +
                                '    </span>\n' +
                                '</span>';


                            html += "</span></span>";

                            $('<div class="' + replacementID + ' er-crs-replace-text er-content-replacement" style="' + combinedStyles + '">'+html + ioRes.replacements[i].replacement.replacement + '</div>').insertAfter($("." + replacementID + ".er-crs-original-text").last());


                            $("." + replacementID + ".er-crs-replace-text").addClass(originalClasses);

                            $("." + replacementID + ".er-crs-replace-text").hide();



                            $(html).prependTo($(elementToReplace));
                            //$(html).insertBefore($(elementToReplace));

                            $(".er-toggle-button." + replacementID).click(function () {
                                toggleButton(replacementID);
                            }).keydown(function (e) {
                                if (e.key === " " || e.key === "Enter") {
                                    toggleButton(replacementID);
                                }
                            });

                            function toggleButton(replacementID) {
                                $("." + replacementID + ".er-crs-original-text").toggle();
                                $("." + replacementID + ".er-crs-replace-text").toggle();
                                $("." + replacementID + ".er-crs-replace-text .er-toggle-button-inner").toggleClass("active");
                                let flipButton = $("." + replacementID + ".er-toggle-button");
                                if (flipButton.attr("aria-pressed") === "true") {
                                    flipButton.attr("aria-pressed", "false");
                                } else {
                                    flipButton.attr("aria-pressed", "true");
                                }


                            }



                            window.setInterval(function () {
                                $("."+replacementID).toggleClass("animation-active");
                            }, 1000);
                        }catch (e) {

                            console.log(e);
                        }
                        /*
                        let replacementID = requestID+'-'+i;

                        $(ioRes.replacements[i].replacement.selector).addClass(replacementID + ' er-crs-original-text ' + presentationIdentifier);

                        let tagName = $(ioRes.replacements[i].replacement.selector).prop("tagName").toLowerCase();

                        $('<'+tagName+' class="' + replacementID + ' er-crs-replace-text" ' + presentationIdentifier + '>' + ioRes.replacements[i].replacement.replacement+ '</'+tagName+'>').insertAfter($("." + replacementID + ".er-crs-original-text").last());

                        $("." + replacementID + ".er-crs-replace-text").hide();

                        let html = '<div class="er-toggle-button '+resultClass + ' ' + replacementID + '" ' + presentationIdentifier+'" role="button" tabindex="0" aria-pressed="false" aria-label="Switch to simple version" >\n' +
                            '    <div class="er-toggle-button-inner">\n' +
                            '        <div class="er-toggle-button-front">\n' +
                            '            <img src="'+this.configuration.remoteAssetDirectory+'/help-logo.png" alt="">\n' +
                            '        </div>\n' +
                            '        <div class="er-toggle-button-back">\n' +
                            '             <img src="'+this.configuration.remoteAssetDirectory+'/original-logo.png" alt="">\n' +
                            '        </div>\n' +
                            '    </div>\n' +
                            '</div>';


                        $(html).insertBefore($(ioRes.replacements[i].replacement.selector));

                        $(".er-toggle-button."+replacementID).click(function () {

                            toggleButton();
                        }).keydown(function(e) {
                            if (e.key === " " || e.key === "Enter") {
                                toggleButton();
                            }
                        });

                        window.setInterval(function() {
                            $("."+replacementID).toggleClass("animation-active");
                        }, 1000);

                        function toggleButton() {
                            $("." + replacementID + ".er-crs-original-text").toggle();
                            $("." + replacementID + ".er-crs-replace-text").toggle();
                            $(".er-toggle-button-inner").toggleClass("active");
                            let flipButton =  $("."+replacementID);
                            if(flipButton.attr("aria-pressed")==="true"){
                                flipButton.attr("aria-pressed", "false");
                            }else{
                                flipButton.attr("aria-pressed", "true");
                            }


                        }


                         */

                    }

                }


            }



        }

        globalEventListener.presentationFinished(this);


    }

    undo() {

    }

    remove(){
        console.log("Removing presentation");
        this.removeLastResult();
    }

    removeLastResult(){
        for (let i = 0; i < this.replacements.length; i++) {

            $("." + this.replacements[i].replacementID + ".er-crs-original-text .er-content-replacement-ui").remove();
            $("." + this.replacements[i].replacementID + ".er-crs-original-text").show().removeClass( [ "er-crs-original-text", "er-content-replacement"]);
            $("." + this.replacements[i].replacementID + ".er-crs-replace-text").remove();

        }
        this.replacements = [];
    }

    removeResult(requestID) {
        this.removeLastResult();
    }
}




// polyfill window.getMatchedCSSRules() in FireFox 6+
if (typeof window.getMatchedCSSRules !== 'function') {
    var ELEMENT_RE = /[\w-]+/g,
        ID_RE = /#[\w-]+/g,
        CLASS_RE = /\.[\w-]+/g,
        ATTR_RE = /\[[^\]]+\]/g,
        // :not() pseudo-class does not add to specificity, but its content does as if it was outside it
        PSEUDO_CLASSES_RE = /\:(?!not)[\w-]+(\(.*\))?/g,
        PSEUDO_ELEMENTS_RE = /\:\:?(after|before|first-letter|first-line|selection)/g;

    // convert an array-like object to array
    function toArray(list) {
        return [].slice.call(list);
    }

    // handles extraction of `cssRules` as an `Array` from a stylesheet or something that behaves the same
    function getSheetRules(stylesheet) {
        try {
            var sheet_media = stylesheet.media && stylesheet.media.mediaText;
            // if this sheet is disabled skip it
            if (stylesheet.disabled) return [];
            // if this sheet's media is specified and doesn't match the viewport then skip it
            if (sheet_media && sheet_media.length && !window.matchMedia(sheet_media).matches) return [];
            // get the style rules of this sheet

            return toArray(stylesheet.cssRules);
        } catch (e) {
            return [];
        }

    }

    function _find(string, re) {
        var matches = string.match(re);
        return matches ? matches.length : 0;
    }

    // calculates the specificity of a given `selector`
    function calculateScore(selector) {
        var score = [0, 0, 0],
            parts = selector.split(' '),
            part, match;
        //TODO: clean the ':not' part since the last ELEMENT_RE will pick it up
        while (part = parts.shift(), typeof part == 'string') {
            // find all pseudo-elements
            match = _find(part, PSEUDO_ELEMENTS_RE);
            score[2] += match;
            // and remove them
            match && (part = part.replace(PSEUDO_ELEMENTS_RE, ''));
            // find all pseudo-classes
            match = _find(part, PSEUDO_CLASSES_RE);
            score[1] += match;
            // and remove them
            match && (part = part.replace(PSEUDO_CLASSES_RE, ''));
            // find all attributes
            match = _find(part, ATTR_RE);
            score[1] += match;
            // and remove them
            match && (part = part.replace(ATTR_RE, ''));
            // find all IDs
            match = _find(part, ID_RE);
            score[0] += match;
            // and remove them
            match && (part = part.replace(ID_RE, ''));
            // find all classes
            match = _find(part, CLASS_RE);
            score[1] += match;
            // and remove them
            match && (part = part.replace(CLASS_RE, ''));
            // find all elements
            score[2] += _find(part, ELEMENT_RE);
        }
        return parseInt(score.join(''), 10);
    }

    // returns the heights possible specificity score an element can get from a give rule's selectorText
    function getSpecificityScore(element, selector_text) {
        var selectors = selector_text.split(','),
            selector, score, result = 0;
        while (selector = selectors.shift()) {
            if (matchesSelector(element, selector)) {
                score = calculateScore(selector);
                result = score > result ? score : result;
            }
        }
        return result;
    }

    function sortBySpecificity(element, rules) {
        // comparing function that sorts CSSStyleRules according to specificity of their `selectorText`
        function compareSpecificity(a, b) {
            return getSpecificityScore(element, b.selectorText) - getSpecificityScore(element, a.selectorText);
        }

        return rules.sort(compareSpecificity);
    }

    // Find correct matchesSelector impl
    function matchesSelector(el, selector) {
        var matcher = el.matchesSelector || el.mozMatchesSelector ||
            el.webkitMatchesSelector || el.oMatchesSelector || el.msMatchesSelector;
        return matcher.call(el, selector);
    }

    //TODO: not supporting 2nd argument for selecting pseudo elements
    //TODO: not supporting 3rd argument for checking author style sheets only
    window.getMatchedCSSRules = function (element /*, pseudo, author_only*/) {
        var style_sheets, sheet, sheet_media,
            rules, rule,
            result = [];
        // get stylesheets and convert to a regular Array
        style_sheets = toArray(window.document.styleSheets);

        // assuming the browser hands us stylesheets in order of appearance
        // we iterate them from the beginning to follow proper cascade order
        while (sheet = style_sheets.shift()) {
            // get the style rules of this sheet
            rules = getSheetRules(sheet);
            // loop the rules in order of appearance
            while (rule = rules.shift()) {
                // if this is an @import rule
                if (rule.styleSheet) {
                    // insert the imported stylesheet's rules at the beginning of this stylesheet's rules
                    rules = getSheetRules(rule.styleSheet).concat(rules);
                    // and skip this rule
                    continue;
                }
                // if there's no stylesheet attribute BUT there IS a media attribute it's a media rule
                else if (rule.media) {
                    // insert the contained rules of this media rule to the beginning of this stylesheet's rules
                    rules = getSheetRules(rule).concat(rules);
                    // and skip it
                    continue
                }

                // check if this element matches this rule's selector
                if (matchesSelector(element, rule.selectorText)) {
                    // push the rule to the results set
                    result.push(rule);
                }
            }
        }
        // sort according to specificity
        return sortBySpecificity(element, result);
    };
}