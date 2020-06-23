class TippyTooltip extends Presentation {
    constructor(functionInfo, userInterface, configuration) {
        super(functionInfo, userInterface, configuration);

    }

    renderResult(request, result) {

        let ioRes = ioTypeUtils.toIOTypeInstance(result.result);
        let resultHTML = ioRes.toHtml();
        let requestID = this.createRequestId();

        if (request.inputType instanceof Word) {



            //let className = "easy-reading-tippy-tooltip-"+this.requestCounter;
            //pageUtils.wrapWordIn(request.input, "span",this.createRequestId(),"easy-reading-result easy-reading-tippy-tooltip "+className);

            let span = pageUtils.wrapWordIn(request.input, "span", requestID+" easy-reading-tippy-tooltip " + this.getResultClass(), this.getPresentationAndRequestIdentifier(requestID));

            if (ioRes instanceof ImageIOType) {
                const INITIAL_CONTENT = 'Loading...';

                const state = {
                    isFetching: false,
                    canFetch: true
                };

                tippy("." + requestID, {
                    content: INITIAL_CONTENT,
                    theme: 'light-border',
                    async onShow(tip) {
                        if (state.isFetching || !state.canFetch) return;

                        state.isFetching = true;
                        state.canFetch = false;

                        try {


                            let downloadingImage = new Image();
                            downloadingImage.onload = function () {
                                if (tip.state.isVisible) {
                                    this.width = 100;
                                    tip.setContent(this)
                                }
                            };
                            downloadingImage.src = result.result.url;

                        } catch (e) {
                            tip.setContent(`Fetch failed. ${e}`)
                        } finally {
                            state.isFetching = false
                        }
                    },
                    onHidden(tip) {

                    }
                });

            } else {
                tippy("." + requestID, {
                    content: resultHTML,
                    theme: 'light-border',
                });
            }

        } else if (request.inputType instanceof Paragraph) {

            let div = $( request.input.element).wrap( "<div class='"+ requestID+" easy-reading-tippy-tooltip "+this.getResultClass()+"' "+this.getPresentationAndRequestIdentifier(requestID)+"></div>" );

            tippy("." + requestID, {
                content: resultHTML,
                theme: 'light-border',
            });

        }

        globalEventListener.presentationFinished(this);

    }

    undo() {

    }
    removeResult(requestID){

        const tooltipElement = $("."+requestID);
        if(tooltipElement.length){
            const instance = tippy(tooltipElement[0]);
            if(instance){
                instance.destroy(true);
            }else{
                if(tooltipElement[0]._tippy){
                    tooltipElement[0]._tippy.destroy(true);
                }
            }

            let parent = tooltipElement.parent();
            tooltipElement.contents().unwrap();
            if(parent.length){
                parent.get(0).normalize();
            }
        }

    }


}