class AnnotatedParagraphSwitcher extends Presentation {
    constructor(functionInfo, userInterface, configuration) {
        super(functionInfo, userInterface, configuration);
        this.requestCounter = 0;
        this.annotations = [];
    }

    renderResult(request, result) {


        this.annotations = [];

        let ioRes = ioTypeUtils.toIOTypeInstance(result.result);

        if (ioRes.name === "Error") {

            alertManager.showErrorAlert(ioRes.message);

        } else if (ioRes.name === "NoResult") {
            alertManager.showErrorAlert(ioRes.message);
        } else if (ioRes.name === "AnnotatedParagraph") {

            if (request.input.type === Paragraph.className) {


                let requestID = this.createRequestId();
                let resultClass = this.getResultClass();
                let presentationIdentifier = this.getPresentationAndRequestIdentifier(requestID);

                let wikiClass = requestID + '-tooltip-wiki';

                for (let i = 0; i < ioRes.annotations.length; i++) {

                    if( ioRes.annotations[i].type = "wiki"){
                        if (this.insertAnnotation(ioRes.annotations[i])) {

                            ioRes.annotations[i].id = wikiClass + "-" + i;
                            ioRes.annotations[i].presentationHTML = '<span id="' + ioRes.annotations[i].id + '">' + ioRes.annotations[i].textToAnnotate + '</span>';
                        }
                    }


                }

                let presentationHTML = "";
                let curIndex = 0;
                for (let i = 0; i < this.annotations.length; i++) {

                    if (curIndex < this.annotations[i].position) {
                        presentationHTML += ioRes.paragraph.substring(curIndex, this.annotations[i].position);
                    }

                    presentationHTML += this.annotations[i].presentationHTML;

                    curIndex = this.annotations[i].position + this.annotations[i].textToAnnotate.length;

                }

                if (curIndex < ioRes.paragraph.length) {
                    presentationHTML += ioRes.paragraph.substring(curIndex);
                }

                //Render it
                for (let i = 0; i < request.input.textNodes.length; i++) {
                    $(request.input.textNodes[i]).wrap('<span class="' + resultClass + ' ' + requestID + ' er-ps-original-text" ' + presentationIdentifier + '></span>');
                }


                $('<span class="' + resultClass + ' ' + requestID + ' er-ps-replace-text" ' + presentationIdentifier + '>' + presentationHTML + '</span>').insertAfter($("." + requestID + ".er-ps-original-text").last());
                let button = $('<button class="' + resultClass + ' ' + requestID + '" ' + presentationIdentifier + ' style="width: 2em;height: 2em;padding: 0;border: 0;"><img src="' + this.configuration.remoteAssetDirectory + '/help-logo.png" style="width: 2em;height: 2em;"></button>');
                button.insertAfter($("." + requestID + ".er-ps-replace-text"));
                button.click(function () {
                    $("." + requestID + ".er-ps-original-text").toggle();
                    $("." + requestID + ".er-ps-replace-text").toggle();
                });
                $("." + requestID + ".er-ps-original-text").hide();


                //Create annotations
                for (let i = 0; i < this.annotations.length; i++) {
                    let currentAnnotation = this.annotations[i];
                    switch (this.annotations[i].type) {

                        case "wiki":
                            fetch(currentAnnotation.wikiLinks.summary)
                                .then(res => res.json())
                                .then((out) => {

                                    if (out.type !== "disambiguation" && out.description) {
                                        let popupHTML = "";
                                        if (out.thumbnail) {
                                            popupHTML = '<img src=' + out.thumbnail.source + ' alt="' + out.title + '"><br>';
                                        }
                                        popupHTML += out.description;

                                        tippy("#" + currentAnnotation.id, {
                                            content: popupHTML,
                                            animateFill: false,
                                            animation: 'fade',
                                            flipOnUpdate: true,
                                            theme: 'light-border',
                                            allowHTML: true,

                                        });
                                        $("#" + currentAnnotation.id).addClass("easy-reading-highlight");
                                    }



                                })
                                .catch(err => {
                                    throw err
                                });

                            break;

                        /*
                        tippy("#" + currentAnnotation.id, {
                            content: 'Loading...',
                            animateFill: false,
                            animation: 'fade',
                            flipOnUpdate: true,
                            onShow(instance) {
                                fetch(currentAnnotation.wikiLinks.summary)
                                    .then(res => res.json())
                                    .then((out) => {


                                        let popupHTML = "";
                                        if (out.thumbnail) {
                                            popupHTML = '<img src="' + out.thumbnail.source + '" alt="' + out.title + '"><br>';
                                        }
                                        popupHTML += out.description;


                                        instance.setContent(popupHTML)
                                    })
                                    .catch(err => {
                                        throw err
                                    });

                            },
                        });

                        break;*/

                    }
                }


            }
        }


    }


    insertAnnotation(annotation) {

        if (this.annotations.length === 0) {

            this.annotations.push(annotation);
            return true;
        } else {

            for (let i = 0; i < this.annotations.length; i++) {

                let start = this.annotations[i].position;
                let end = start + this.annotations[i].textToAnnotate.length;

                //Check overlap
                if (annotation.position === start) {

                    return false;
                }

                if (start < annotation.position && end > annotation.position) {

                    return false;
                }

                if (start < annotation.position + annotation.textToAnnotate.length && end > annotation.position + annotation.textToAnnotate.length) {

                    return false;
                }

            }


            for (let i = 0; i < this.annotations.length; i++) {

                if (this.annotations[i].position > annotation.position) {
                    this.annotations.splice(i, 0, annotation);
                    return true;

                }

            }
            this.annotations.push(annotation);
            return true;

        }

        return false;

    }

    undo() {

    }

    removeResult(requestID) {

        //Remove button
        $("button." + requestID).remove();
        //Remove replace text
        $("." + requestID + ".er-ps-replace-text").remove();

        let original = $("." + requestID + ".er-ps-original-text");
        let parent = original.last().parent();
        original.contents().unwrap();

        if (parent.length) {
            parent.get(0).normalize();
        }

    }
}