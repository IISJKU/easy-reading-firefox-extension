// dislays tooltips on touch-hold for all elements inside a given parent-Object, if they contain a "title"-attribute
// usage: simply call constructor with a jQuery Object containing the elements that might need tooltips displayed as an argument

class erMobileToolTips {
    constructor(parentObj) { // parentObj is a jQuery-Object containing the elements that might need tooltips displayed
        let stopBubbleForClick = false;

        let showToolTip = function(evt, domObj) {
            // first remove other tooltips that might be active
            $(document).find('.erToolTip').remove();
            // then add the new one
            let toolTipY = Math.round(evt.touches[0].clientY - $('#er-tab-slide-out').offset().top) - 30;
            $(domObj).parent().append('<div class="erToolTip" style=" top: ' + toolTipY + 'px;">' + $(domObj).attr('title') + '</div>');
            stopBubbleForClick = true;
            $(domObj).next().on('click', function(evt) {
                evt.stopPropagation();
                if (stopBubbleForClick) {
                    stopBubbleForClick = false;
                } else {
                    this.remove();
                }
            });  
        };
        
        let objArray = parentObj.find("[title]");
        for (let i = 0; i < objArray.length; i++) {
            let timer;
            let touchDuration = 1000;
            let curObj = objArray[i];
            $(curObj).on('touchstart', function(evt) {
                timer = setTimeout(function() {
                            showToolTip(evt, curObj);
                        }, touchDuration);
            });
            $(curObj).on('touchend', function(evt) {
                if (timer) clearTimeout(timer);
            });
            $(curObj).on('touchmove', function(evt) {
                if (timer) clearTimeout(timer);
            });
            $(curObj).on('click', function(evt) {
                if (stopBubbleForClick) {
                    evt.stopPropagation();
                    stopBubbleForClick = false;
                }
            });
        }
        $(document).on('click', function(evt) {
            $(document).find('.erToolTip').remove();
        });
    }
    
    
}