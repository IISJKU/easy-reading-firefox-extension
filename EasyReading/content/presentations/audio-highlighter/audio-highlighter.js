class AudioHighlighter extends Presentation {
    constructor(functionInfo, userInterface, configuration) {

        super(functionInfo, userInterface, configuration);

        this.audio = null;
        this.lastElement = null;
        this.wordSpeechMarks = null;
        this.wordTextMarker = null;
        this.sentenceTextMarker = null;
        this.sentenceSpeechMarks = [];
        this.isCompatibleWithOtherPresentations = true;
        this.instantDisplay = false;
    }

    renderResult(request, result) {

        let ioRes = ioTypeUtils.toIOTypeInstance(result.result);


        if (this.wordTextMarker) {
            this.wordTextMarker.remove();
        }
        if (this.sentenceTextMarker) {
            this.sentenceTextMarker.remove();
        }

        if (this.lastElement) {
            $(this.lastElement).removeClass("highlight-audio");
        }
        if (ioRes.name === "AudioType") {


            this.sentenceSpeechMarks = [];
            let sentences = [];
            for (let i = 0; i < ioRes.speechMarks.length; i++) {

                if (ioRes.speechMarks[i].type === "sentence") {

                    //AWS SPECIFIC STUFF
                    //Allow only unique starts. AWS sometimes produces more speechmarks with same start(e.g: 1845-1928 will return 3 speechmarks) this will confuse highlightning
                    if (this.sentenceSpeechMarks.length > 0) {
                        if (this.sentenceSpeechMarks[this.sentenceSpeechMarks.length - 1].start) {
                            if (this.sentenceSpeechMarks[this.sentenceSpeechMarks.length - 1].start === ioRes.speechMarks[i].start) {
                                continue;
                            }
                        }

                        if (this.sentenceSpeechMarks[this.sentenceSpeechMarks.length - 1].end) {
                            if (this.sentenceSpeechMarks[this.sentenceSpeechMarks.length - 1].end === ioRes.speechMarks[i].end) {
                                continue;
                            }
                        }
                    }


                    sentences.push(ioRes.speechMarks[i].value);
                    this.sentenceSpeechMarks.push(ioRes.speechMarks[i]);


                }
            }


            this.sentenceTextMarker = new TextMarker(request.input.textNodes, sentences, {
                highlightElementName: "span",
                highlightElementClass: "sentence-highlighter",
                backgroundColor: "#3ecfff",
                color: "inherit",

            });


            this.wordSpeechMarks = [];
            let words = [];
            for (let i = 0; i < ioRes.speechMarks.length; i++) {
                if (ioRes.speechMarks[i].type === "word") {

                    //AWS SPECIFIC STUFF
                    //Allow only unique starts. AWS sometimes produces more speechmarks with same start(e.g: 1845-1928 will return 3 speechmarks) this will confuse highlightning
                    if (this.wordSpeechMarks.length > 0) {

                        if (this.wordSpeechMarks[this.wordSpeechMarks.length - 1].start) {
                            if (this.wordSpeechMarks[this.wordSpeechMarks.length - 1].start === ioRes.speechMarks[i].start) {
                                continue;
                            }
                        }


                        if (this.wordSpeechMarks[this.wordSpeechMarks.length - 1].end) {
                            if (this.wordSpeechMarks[this.wordSpeechMarks.length - 1].end === ioRes.speechMarks[i].end) {
                                continue;
                            }
                        }


                    }

                    words.push(ioRes.speechMarks[i].value);
                    this.wordSpeechMarks.push(ioRes.speechMarks[i]);


                }
            }
            this.wordTextMarker = new TextMarker(request.input.textNodes, words);

            if (this.audio) {
                this.audio.pause();
                this.audio = null;
            }

            this.audio = new Audio(ioRes.mp3URL);
            if (this.configuration.speed) {
                if (this.configuration.speed === "slow") {
                    this.audio.playbackRate = 0.7;
                } else if (this.configuration.speed === "fast") {
                    this.audio.playbackRate = 1.3;
                }

            }

            //Disable highlighting because mark.js does not work properly

            let currentHighlightSentence = 0;
            let currentHighlightWord = 0;

            let audioHighlighter = this;
            this.audio.ontimeupdate = function () {
                if (currentHighlightSentence + 1 < audioHighlighter.sentenceSpeechMarks.length) {

                    if (audioHighlighter.sentenceSpeechMarks[currentHighlightSentence + 1].time < audioHighlighter.audio.currentTime * 1000) {
                        currentHighlightSentence++;
                        audioHighlighter.sentenceTextMarker.markNext();

                    }

                }

                if (currentHighlightWord + 1 < audioHighlighter.wordSpeechMarks.length) {


                    if (audioHighlighter.wordSpeechMarks[currentHighlightWord + 1].time < audioHighlighter.audio.currentTime * 1000) {
                        currentHighlightWord++;
                        audioHighlighter.wordTextMarker.markNext();

                    }

                }

            };
            this.sentenceTextMarker.markNext();
            this.wordTextMarker.markNext();

            this.audio.play();
            this.audio.onended = function () {

                if (audioHighlighter.wordTextMarker) {
                    audioHighlighter.wordTextMarker.remove();
                }
                if (audioHighlighter.sentenceTextMarker) {
                    audioHighlighter.sentenceTextMarker.remove();
                }

                if (audioHighlighter.lastElement) {
                    $(audioHighlighter.lastElement).removeClass("highlight-audio");
                }
                globalEventListener.presentationFinished(audioHighlighter);
            };

        } else if (ioRes.name === "Error") {

            alertManager.showErrorAlert(ioRes.message);

        } else if (ioRes.name === "NoResult") {
            alertManager.showErrorAlert(ioRes.message);
        }


    }

    removeResult(requestID) {

        if (this.wordTextMarker) {
            this.wordTextMarker.remove();
        }
        if (this.sentenceTextMarker) {
            this.sentenceTextMarker.remove();
        }


        if (this.audio) {
            this.audio.pause();
            this.audio.ontimeupdate = null;
            this.audio.onended = null;
            this.audio = null;
        }
    }

    removeAnimatedResult() {
        this.removeResult();
    }

    undo() {

    }
}
