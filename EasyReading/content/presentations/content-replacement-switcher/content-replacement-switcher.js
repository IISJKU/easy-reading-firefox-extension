class ContentReplacementSwitcher extends Presentation {
    constructor(functionInfo, userInterface, configuration) {
        super(functionInfo, userInterface, configuration);
        this.requestCounter = 0;
        this.currentRequestID = null;
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
        if(this.currentRequestID){

            let resultClass = this.getResultClass();
            let presentationIdentifier = this.getPresentationAndRequestIdentifier(this.currentRequestID);
            for(let i=0; i  < this.replacements.length; i++){


                if(this.replacements[i].type === "content_replacement"){

                    let replacementID = this.currentRequestID+'-'+i;

                    $(this.replacements[i].replacement.selector).removeClass(resultClass + ' ' + replacementID + ' er-crs-original-text ' + presentationIdentifier);
                    $(this.replacements[i].replacement.selector).show();
                    let tagName = $(this.replacements[i].replacement.selector).prop("tagName").toLowerCase();

                    $("." + replacementID + ".er-crs-replace-text").remove();
                    $("div." + replacementID).remove();
                }

            }

        }

        this.currentRequestID = null;
        this.replacments = [];
    }

    removeResult(requestID) {
        this.removeLastResult();
    }
}


