let audioPlayer = {
    audio: null,
    currentButton: null,
    currentTextElementId:null,
    currentAudioSrc: null,
    elementsToPlay:[],
    init:function(){
        $(document).ready(function () {

            $(".er-audio-player").each(function () {

                $(this).click(function () {

                    audioPlayer.playOrStop(this);

                });


            });
        });
    },
    playOrStop:function (button) {

        if(this.audio){
            this.audio.pause();
            this.audio = null;
        }
        if(this.currentTextElementId){
            this.toggleTextElementHighlight(this.currentTextElementId);
            this.currentTextElementId = null;
        }

        if(this.currentButton){
            this.toggleAudioButton(this.currentButton);

            //Return if we hit the button again while playing...
            if(this.currentButton === button){
                this.currentButton = null;
                return;
            }
        }





        let elementsToPlayString =  $(button).data("audio-elements");
        if(elementsToPlayString){
            this.elementsToPlay = elementsToPlayString.split(" ");


        }
        audioPlayer.toggleAudioButton(button);
        this.currentButton = button;
        audioPlayer.playNextElement();



    },
    playNextElement(){
        if(this.elementsToPlay.length === 0){
            audioPlayer.toggleAudioButton(audioPlayer.currentButton);
            audioPlayer.currentButton = null;
            return;
        }

        this.currentTextElementId = this.elementsToPlay[0];

        let audioSrc = $("#"+this.currentTextElementId).data("audio-src");

        audioPlayer.toggleTextElementHighlight(this.currentTextElementId);
        try{
            this.audio = new Audio(audioSrc);
            this.audio.onended = function () {
                audioPlayer.audio = null;
                audioPlayer.currentAudioSrc = "";
                audioPlayer.toggleTextElementHighlight(audioPlayer.currentTextElementId);
                audioPlayer.currentTextElementId = null;
                audioPlayer.playNextElement();
            };
            this.audio.play();

            this.elementsToPlay.shift();
        }catch (e) {
            console.log(e);
        }



    },

    toggleAudioButton:function (button) {

        $(button).toggleClass("active");


    },
    toggleTextElementHighlight:function (elementId) {
        $("#"+elementId).toggleClass("er-audio-player-text-highlight");
    }

};


audioPlayer.init();

