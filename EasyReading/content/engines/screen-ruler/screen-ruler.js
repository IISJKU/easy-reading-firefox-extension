let easyReadingScreenRulerVisible = false;
let easyReadingScreenRulerCurrentClientY = 0;

function easyReadingScreenRuler(req, config,widget) {

    if(easyReadingScreenRulerVisible){
        hideEasyReadingScreenRuler();
    }else{
        showEasyReadingScreenRuler();
    }
    easyReadingScreenRulerVisible = !easyReadingScreenRulerVisible;
}

let listener = function(event){
    if(easyReadingScreenRulerVisible){
        $("#overlay-top").css("bottom", $(window).height() -event.clientY +20);
        $("#overlay-bottom").css("top", event.clientY +20);
    }

    easyReadingScreenRulerCurrentClientY = event.clientY;
};

function showEasyReadingScreenRuler() {

    $('body').append('<div id="overlay-top"></div><div id="overlay-bottom"></div>');
    $("#overlay-top").css("bottom", $(window).height() -easyReadingScreenRulerCurrentClientY +20);
    $("#overlay-bottom").css("top",easyReadingScreenRulerCurrentClientY +20);
}

function hideEasyReadingScreenRuler(){
    $("#overlay-top").remove();
    $("#overlay-bottom").remove();
}
let easyReadingScreenRulerDocumentReady = $(document).ready(function () {
    $(document).mousemove(listener);
});