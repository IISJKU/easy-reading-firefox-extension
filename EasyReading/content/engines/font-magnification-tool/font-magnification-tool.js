let zoom = 0;
let zoomInit = false;

function initFontMagnification() {
    if (!zoomInit) {
        $('*').each(function () {
            let el = $(this);
            let size = parseInt(el.css('font-size'));
            el.data('font-size', size);


        });
        zoomInit = true;
    }

}

function magnifyFont(req, config,widget) {
    initFontMagnification();
    zoom++;
    $('*').each(function () {
        if(!$(this).parents('.easy-reading-interface').length){
            let el = $(this);
            let size = el.data('font-size');
            el.css('font-size', Math.max(size + zoom, 0) + 'px');
        }

    });


}

function shrinkFont(req, config) {
    initFontMagnification();
    zoom--;
    $('*').each(function () {
        if(!$(this).parents('.easy-reading-interface').length){
            let el = $(this);
            let size = el.data('font-size');
            el.css('font-size', Math.max(size + zoom, 0) + 'px');
        }

    });
}
