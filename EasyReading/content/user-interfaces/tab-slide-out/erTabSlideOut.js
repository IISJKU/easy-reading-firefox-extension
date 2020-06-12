/*
tab slide out interface, double-draggable (drag the whole element and drag the handle relative to the whole element), 
capable of holding n DOM elements in a line-layout (horizontal version) or 2-column-grid (vertical version)
for usage, your page must contain the following DOM elements:
    '<div id="er-tab-slide-out">' +
        '<div id="er-tab-slide-out-handle"></div>' +
        '<div id="er-tab-slide-out-grid-container"></div>' +
    '</div>');

options 
tabPositioning: top, bottom, left, right (default)
panelVisible: true, false (default)
panelPos: {top: x, left: y} (default: x=200, y=200)
handlePos: {top: x, left: y} (default: x=0, y=0)

methods
updatePanel: needs to be called every time the contents of the panel have changed
adaptToWindowSize: call when new items have been added or items have been taken away
refresh: refresh view status of panel
*/

$.widget("ui.erTabSlideOut", {
    
    // default options
    options: {
        tabPositioning: "right",
        panelVisible: false,
        panelPos: {top: 200, left: 200},
        handlePos: {top: 0, left: 0}, // position of handle relative to the panel
        saveConfig: function(oldConf) {}
    },

    _create: function() {
        this.ignoreNextClick = false;
        this.panel = $("#er-tab-slide-out");
        this.handle = $("#er-tab-slide-out-handle");
        this.gridContainer = $('#er-tab-slide-out-grid-container');
        this.dragAxis = 'y';
        if (this.options.tabPositioning === "top" || this.options.tabPositioning === "bottom") {
            this.gridContainer.addClass('er-tab-slide-out-grid-horizontal');
            this.dragAxis = 'x';
            this.panel.css({'left' : this.options.panelPos.left + 'px'});
            this.handle.css({'left' : this.options.handlePos.left + 'px'});
        } else {
            this.panel.css({'top' : this.options.panelPos.top + 'px'});
            this.handle.css({'top' : this.options.handlePos.top + 'px'});
        }
        this.panelHeight = 1; // the true height and width of the panel will be set, when panel images are loaded
        this.panelWidth = 1;

        // enable 2-level dragging of the panel
        let prevMouseX = 0;
        let prevMouseY = 0;
        let handleOffsetXOnMousedown = 0;
        let handleOffsetYOnMousedown = 0;
        let mouseXInHandleOnMousedown = 0;
        let mouseYInHandleOnMousedown = 0;
        let haveBeenDraggingHandle = false;
        let erTSO = this;
        this.handle.mousedown(function(event){
            prevMouseX = event.clientX; // needed for dragging handle horizontally
            prevMouseY = event.clientY; // needed for dragging handle vertically
            handleOffsetXOnMousedown = erTSO.handle.position().left;
            handleOffsetYOnMousedown = erTSO.handle.position().top;
            mouseXInHandleOnMousedown = event.clientX - erTSO.handle.position().left - erTSO.panel.position().left;
            mouseYInHandleOnMousedown = event.clientY - erTSO.handle.position().top - erTSO.panel.position().top;
            haveBeenDraggingHandle = false;
            erTSO.ignoreNextClick = false; // click-events shall be ignored, if fired directly after a drag-event; on mousedown, we assume this is going to be a click; ignorenextClick is set to true in the drag-event
        });
             
        this.panel.draggable({
            axis: this.dragAxis,
            scroll: false,
            drag: function(evt, ui) {
                erTSO.ignoreNextClick = true;
                if (erTSO.dragAxis === 'x') {
                    let handleLeft = evt.clientX - erTSO.panel.position().left - mouseXInHandleOnMousedown;
                    if (ui.position.left < 0) {
                        ui.position.left = 0;
                        haveBeenDraggingHandle = true;
                        if (handleLeft < 0) {
                            handleLeft = 0;
                        }
                        if (evt.clientX > prevMouseX) {
                            if (evt.clientX >= mouseXInHandleOnMousedown) {
                                erTSO.handle.css('left', handleLeft);
                            }
                        } else {
                            erTSO.handle.css('left', handleLeft);
                        }
                    } else {
                        let leftMax = document.documentElement.clientWidth - erTSO.panelWidth;
                        if (ui.position.left > leftMax) {
                            ui.position.left = leftMax;
                            haveBeenDraggingHandle = true;
                            let handleLeftMax = erTSO.panelWidth - erTSO.handle.outerWidth();
                            if (handleLeft > handleLeftMax) {
                                handleLeft = handleLeftMax;
                            }
                            if (evt.clientX < prevMouseX) {
                                let mouseXMostRightPosition = document.documentElement.clientWidth - (erTSO.handle.outerWidth() - mouseXInHandleOnMousedown); 
                                if (evt.clientX <= mouseXMostRightPosition) { // avoid moving handle while mouse is outside the page
                                    erTSO.handle.css('left', handleLeft);
                                }
                            } else {
                                erTSO.handle.css('left', handleLeft);
                            }
                        } else {
                            if (haveBeenDraggingHandle) {
                                // set handle to the position it had at mousdown (otherwise the last step in dragging it back would get lost)
                                erTSO.handle.css('left', handleOffsetXOnMousedown);
                                haveBeenDraggingHandle = false;
                            }
                        }
                    }
                    prevMouseX = evt.clientX;
                } else {
                    let handleTop = evt.clientY - erTSO.panel.position().top - mouseYInHandleOnMousedown;
                    if (ui.position.top < 0) {
                        ui.position.top = 0;
                        haveBeenDraggingHandle = true;
                        if (handleTop < 0) {
                            handleTop = 0;
                        }
                        if (evt.clientY > prevMouseY) {
                            if (evt.clientY >= mouseYInHandleOnMousedown) {
                                erTSO.handle.css('top', handleTop);
                            }
                        } else {
                            erTSO.handle.css('top', handleTop);
                        }
                    } else {
                        let topMax = window.innerHeight - erTSO.panelHeight;
                        if (ui.position.top > topMax) {
                            ui.position.top = topMax;
                            haveBeenDraggingHandle = true;
                            let handleTopMax = erTSO.panelHeight - erTSO.handle.outerHeight();
                            if (handleTop > handleTopMax) {
                                handleTop = handleTopMax;
                            }
                            if (evt.clientY < prevMouseY) {
                                let mouseYBottommostPosition = window.innerHeight - (erTSO.handle.outerHeight() - mouseYInHandleOnMousedown); 
                                if (evt.clientY <= mouseYBottommostPosition) { // avoid moving handle while mouse is outside the page
                                    erTSO.handle.css('top', handleTop);
                                    }
                            } else {
                                erTSO.handle.css('top', handleTop);
                            }
                        } else {
                            if (haveBeenDraggingHandle) {
                                // set handle to the position it had at mousdown (otherwise the last step in dragging it back would get lost)
                                erTSO.handle.css('top', handleOffsetYOnMousedown);
                                haveBeenDraggingHandle = false;
                            }
                        }
                    }
                    prevMouseY = evt.clientY; 
                }
            },
            stop: function(event, ui) {
                erTSO.saveConfiguration();
            }
        });

        // add callback for panel/handle positioning
        // (otherwise they might be positioned incorrectly if images in panel are not fully loaded yet)
        this.panel.imagesLoaded(function() {
            erTSO.panelHeight = erTSO.panel.outerHeight();
            erTSO.panelWidth = erTSO.panel.outerWidth();
            if (erTSO.options.tabPositioning === 'top') {
                erTSO.panel.css({'top' : '-' + erTSO.panelHeight + 'px'});
                erTSO.handle.css({'top' : (erTSO.panelHeight - 1) + 'px'});
            } else if (this.options.tabPositioning === 'left') {
                erTSO.panel.css({'left' : '-' + erTSO.panelWidth + 'px'});
                erTSO.handle.css({'left' : (erTSO.panelWidth - 1) + 'px'});
            }
            erTSO.adaptToWindowSize();
            erTSO.refresh();
            erTSO._setTransitions();

            // make tooltips work on touch-hold
            let tt = new erMobileToolTips(erTSO.panel);            
        });

        // change panel visibility on handle-click
        this.handle.click(function(evt) {
            if (!erTSO.ignoreNextClick) {
                erTSO.options.panelVisible = !erTSO.options.panelVisible;
                erTSO.refresh();
                erTSO.saveConfiguration();
            }
        });

        // window resize (or scaling) might change panel size
        $(window).resize(function(evt) {
            $('.er-tab-slide-out-grid-horizontal').css({'flex-wrap' : 'nowrap'});
            erTSO.adaptToWindowSize();
            erTSO.refresh();
        });

        // drag ui with touch events
        let prevTouchPositionX = 0;
        let prevTouchPositionY = 0;
        $('#er-tab-slide-out-handle').on('touchstart', function(evt) {
            if (erTSO.dragAxis === 'x') {
                prevTouchPositionX = evt.touches[0].clientX;
            } else {
                prevTouchPositionY = evt.touches[0].clientY;
            }
        });
        $('#er-tab-slide-out-handle').on('touchmove', function(evt) {
            if ((evt.touches[0].clientX > 0) && (evt.touches[0].clientX < document.documentElement.clientWidth)) { // if touch happens inside viewport
                if (erTSO.dragAxis === 'x') {
                    let leftMax = document.documentElement.clientWidth - erTSO.panelWidth;
                    let handleLeftMax = erTSO.panelWidth - erTSO.handle.outerWidth();
                    let movedpixels = 0;
                    if (prevTouchPositionX < 0) {
                        movedpixels = evt.touches[0].clientX;
                    } else if (prevTouchPositionX > document.documentElement.clientWidth) {
                        movedpixels = evt.touches[0].clientX - document.documentElement.clientWidth;
                    } else {
                        movedpixels = evt.touches[0].clientX - prevTouchPositionX;
                    }
                    if (erTSO.panel.position().left + movedpixels < 0) {
                        let reallyMovedPixels = -erTSO.panel.position().left;
                        let diffMovedPixels = movedpixels - reallyMovedPixels;
                        erTSO.panel.css('left', 0);
                        if (erTSO.handle.position().left + diffMovedPixels < 0) {
                            erTSO.handle.css('left', 0);
                        } else {
                            erTSO.handle.css('left', erTSO.handle.position().left + diffMovedPixels);
                        }
                    } else if (erTSO.panel.position().left + movedpixels > leftMax) {
                        let reallyMovedPixels = leftMax - erTSO.panel.position().left;
                        let diffMovedPixels = movedpixels - reallyMovedPixels;
                        erTSO.panel.css('left', leftMax);
                        if (erTSO.handle.position().left + diffMovedPixels > handleLeftMax) {
                            erTSO.handle.css('left', handleLeftMax);
                        } else {
                            erTSO.handle.css('left', erTSO.handle.position().left + diffMovedPixels);
                        }
                    } else {
                        erTSO.panel.css('left', erTSO.panel.position().left + movedpixels);
                    }
                    prevTouchPositionX = evt.touches[0].clientX;
                } else {
                    let topMax = window.innerHeight - erTSO.panelHeight;
                    let handleTopMax = erTSO.panelHeight - erTSO.handle.outerHeight();
                    let movedpixels = 0;
                    if (prevTouchPositionY < 0) {
                        movedpixels = evt.touches[0].clientY;
                    } else if (prevTouchPositionY > window.innerHeight) {
                        movedpixels = evt.touches[0].clientY - window.innerHeight;
                    } else {
                        movedpixels = evt.touches[0].clientY - prevTouchPositionY;
                    }
                    if (erTSO.panel.position().top + movedpixels < 0) {
                        let reallyMovedPixels = -erTSO.panel.position().top;
                        let diffMovedPixels = movedpixels - reallyMovedPixels;
                        erTSO.panel.css('top', 0);
                        if (erTSO.handle.position().top + diffMovedPixels < 0) {
                            erTSO.handle.css('top', 0);
                        } else {
                            erTSO.handle.css('top', erTSO.handle.position().top + diffMovedPixels);
                        }
                    } else if (erTSO.panel.position().top + movedpixels > topMax) {
                        let reallyMovedPixels = topMax - erTSO.panel.position().top;
                        let diffMovedPixels = movedpixels - reallyMovedPixels;
                        erTSO.panel.css('top', topMax);
                        if (erTSO.handle.position().top + diffMovedPixels > handleTopMax) {
                            erTSO.handle.css('top', handleTopMax);
                        } else {
                            erTSO.handle.css('top', erTSO.handle.position().top + diffMovedPixels);
                        }
                    } else {
                        erTSO.panel.css('top', erTSO.panel.position().top + movedpixels);
                    }
                    prevTouchPositionY = evt.touches[0].clientY;
                }
            }
        });

        // set handler for keyboard accessibility
        $(document).on('keydown', function(evt) {
            if ($(evt.target).attr('id') === 'er-tab-slide-out-handle') {
                
                // open/close panel on Enter
                if (evt.which === 13) {
                    erTSO.options.panelVisible = !erTSO.options.panelVisible;
                    erTSO.refresh();
                    erTSO.saveConfiguration();
                }

                // drag with shift-arrowKey
                if (evt.shiftKey) {
                    switch(evt.which) {
                        case 37: { // arrow left
                            if (erTSO.dragAxis === 'x') {
                                evt.preventDefault(); // prevent default action for keys
                                let nextPosXHandle = parseFloat(erTSO.handle.css('left')) - 2;
                                if (nextPosXHandle < 0) {
                                    let nextPosXPanel = parseFloat(erTSO.panel.css('left')) - 2;
                                    if (nextPosXPanel >= 0) {
                                        erTSO.panel.css('left', (nextPosXPanel) + 'px');
                                    }
                                } else {
                                    erTSO.handle.css('left', (nextPosXHandle) + 'px');
                                }
                                erTSO.saveConfiguration();
                            }
                            break;
                        }
                        case 38: { // arrow up
                            if (erTSO.dragAxis === 'y') {
                                evt.preventDefault();
                                let nextPosYHandle = parseFloat(erTSO.handle.css('top')) - 2;
                                if (nextPosYHandle < 0) {
                                    let nextPosYPanel = parseFloat(erTSO.panel.css('top')) - 2;
                                    if (nextPosYPanel >= 0) {
                                        erTSO.panel.css('top', (nextPosYPanel) + 'px');
                                    }
                                } else {
                                    erTSO.handle.css('top', (nextPosYHandle) + 'px');
                                }
                                erTSO.saveConfiguration();
                            }
                            break;
                        }
                        case 39: { // arrow right
                            if (erTSO.dragAxis === 'x') {
                                evt.preventDefault();
                                let handleLeftMax = erTSO.panelWidth - erTSO.handle.outerWidth();
                                let nextPosXHandle = parseFloat(erTSO.handle.css('left')) + 2;
                                if (nextPosXHandle > handleLeftMax) {
                                    let panelLeftMax = document.documentElement.clientWidth - erTSO.panelWidth;
                                    let nextPosXPanel = parseFloat(erTSO.panel.css('left')) + 2;
                                    if (nextPosXPanel <= panelLeftMax) {
                                        erTSO.panel.css('left', (nextPosXPanel) + 'px');
                                    }
                                } else {
                                    erTSO.handle.css('left', (nextPosXHandle) + 'px');
                                }
                                erTSO.saveConfiguration();
                            }
                            break;
                        }
                        case 40: { // arrow down
                            if (erTSO.dragAxis === 'y') {
                                evt.preventDefault();
                                let handleTopMax = erTSO.panelHeight - erTSO.handle.outerHeight();
                                let nextPosYHandle = parseFloat(erTSO.handle.css('top')) + 2;
                                if (nextPosYHandle > handleTopMax) {
                                    let panelTopMax = window.innerHeight - erTSO.panelHeight;
                                    let nextPosYPanel = parseFloat(erTSO.panel.css('top')) + 2;
                                    if (nextPosYPanel < panelTopMax) {
                                        erTSO.panel.css('top', (nextPosYPanel) + 'px');
                                    }
                                } else {
                                    erTSO.handle.css('top', (nextPosYHandle) + 'px');
                                }
                                erTSO.saveConfiguration();
                            }
                            break;
                        }
                    }
                }
            }
        });
    },

    _setTransitions: function() {
        if (this.options.tabPositioning === 'left' || this.options.tabPositioning === 'right') {
            this.panel.css({'-webkit-transition' : 'left 0.5s, top 0s', '-moz-transition' : 'left 0.5s, top 0s',
            '-o-transition' : 'left 0.5s, top 0s', 'transition' : 'left 0.5s, top 0s'});
        } else {
            this.panel.css({'-webkit-transition' : 'left 0s, top 0.5s', '-moz-transition' : 'left 0s, top 0.5s',
            '-o-transition' : 'left 0s, top 0.5s', 'transition' : 'left 0s, top 0.5s'});
        }
    },

    adaptToWindowSize: function() {
        if (this.dragAxis === 'x') {
            if (this.panel.position().left + this.panelWidth > document.documentElement.clientWidth) {
                let newPosLeft = document.documentElement.clientWidth - this.panelWidth;
                if (newPosLeft >= 0) {
                    this.panel.css({'left' : newPosLeft + 'px'});
                } else {
                    this.panel.css({'left' : '0px'});
                }
            }
            if (this.handle.position().left > document.documentElement.clientWidth - this.handle.outerWidth()) {
                this.handle.css({'left' : (document.documentElement.clientWidth - this.handle.outerWidth()) + 'px'});
            }
        } else {
            if (this.panelHeight > window.innerHeight) {
                 $('#er-tab-slide-out-grid-container').css({'grid-template-columns' : 'auto auto auto'});
                this.panelHeight = this.panel.outerHeight();
            } else {
                $('#er-tab-slide-out-grid-container').css({'grid-template-columns' : 'auto auto'});
                this.panelHeight = this.panel.outerHeight();
                if (this.panelHeight > window.innerHeight) {
                    $('#er-tab-slide-out-grid-container').css({'grid-template-columns' : 'auto auto auto'});
                    this.panelHeight = this.panel.outerHeight();
                }
            }
            if (this.panel.position().top + this.panelHeight > window.innerHeight) {
                let newPosTop = window.innerHeight - this.panelHeight;
                if (newPosTop >= 0) {
                    this.panel.css({'top' : newPosTop + 'px'});
                } else {
                    this.panel.css({'top' : '0px'});
                }
            }
            if (this.handle.position().top > window.innerHeight - this.handle.outerHeight()) {
                if (window.innerHeight - this.handle.outerHeight() > 0) {
                    this.handle.css({'top' : (window.innerHeight - this.handle.outerHeight()) + 'px'});
                } else {
                    this.handle.css({'top' : '0px'});
                }
            }            
        }
        $('.er-tab-slide-out-grid-horizontal').css({'flex-wrap' : 'wrap'});

        // set hight and width in case the panel has wrapped and has therefore a different size
        this.panelHeight = this.panel.outerHeight();
        this.panelWidth = this.panel.outerWidth();

        this.saveConfiguration();
    },

    _setOption: function(key, value) {
        this._super(key, value);
        if (key === "tabPositioning") {
            if (value === "top" || value === "bottom") {
                $('#er-tab-slide-out-grid-container').addClass('er-tab-slide-out-grid-horizontal');
                this.dragAxis = x;
            } else {
                this.dragAxis = y;
            }
            this.refresh();
            this._setTransitions();
        } else if(key === "panelVisible") {
            this.refresh();
        }
    },

    saveConfiguration: function() {
        this.options.saveConfig({tabPos: this.options.tabPositioning, // needed to recognize a change and then set options to default again
                                 panVis: this.options.panelVisible,
                                 panPos: {top: parseInt(this.panel.css('top'), 10), left: parseInt(this.panel.css('left'), 10)},
                                 hanPos: {top: parseInt(this.handle.css('top'), 10), left: parseInt(this.handle.css('left'), 10)}});
    },

    updatePanel: function() {
        // make sure panel is in display=grid to be able to set the correct dimensions of the panel
        let prevDisplaySetting = this.gridContainer.css('display');
        let hadClassHorizontal = this.gridContainer.hasClass('er-tab-slide-out-grid-horizontal');
        if (this.dragAxis === 'y') {
            this.gridContainer.css({'display' : 'grid'});
        } else {
            if (!hadClassHorizontal) {
                this.gridContainer.addClass('er-tab-slide-out-grid-horizontal');
            }
            this.gridContainer.css({'display' : 'flex'});
        }
        this.panelHeight = this.panel.outerHeight();
        this.panelWidth = this.panel.outerWidth();
        if ((this.dragAxis === 'x') && !hadClassHorizontal) {
            this.gridContainer.removeClass('er-tab-slide-out-grid-horizontal');
        }
        this.gridContainer.css('display', prevDisplaySetting);
    },

    refresh: function() {
        // adjust visibility depending on currently set options
        let erTSO = this;
        if (this.options.tabPositioning === 'right') {
            this.handle.css({'left' : '-' + (this.handle.outerWidth() + 1) + 'px'});
            if (this.options.panelVisible) {
                this.gridContainer.css({'display' : 'grid'});
                this.panel.css({'left' : document.documentElement.clientWidth - this.panelWidth + 'px'});
            } else {
                this.panel.css({'left' : document.documentElement.clientWidth + 'px'});
                setTimeout(function() {
                    if (!erTSO.options.panelVisible) { // it might have been set to true again during timeout duration
                        erTSO.gridContainer.css('display', 'none');
                    }
                }, 500);
            }
        } else if (this.options.tabPositioning === 'top') {
            this.handle.css({'top' : (this.panelHeight - 1) + 'px'});
            if (this.options.panelVisible) {
                this.gridContainer.addClass('er-tab-slide-out-grid-horizontal');
                this.gridContainer.css({'display' : 'flex'});
                this.panel.css({'top' : '0px'});
            } else {
                this.panel.css({'top' : '-' + this.panelHeight + 'px'});
                setTimeout(function() {
                    if (!erTSO.options.panelVisible) { // it might have been set to true again during timeout duration
                        erTSO.gridContainer.removeClass('er-tab-slide-out-grid-horizontal');
                        erTSO.gridContainer.css({'display' : 'none'});
                    }
                }, 500);
            }
        } else if (this.options.tabPositioning === 'bottom') {
            this.handle.css({'top' : '-' + (this.handle.outerHeight() + 1) + 'px'});
            if (this.options.panelVisible) {
                this.gridContainer.addClass('er-tab-slide-out-grid-horizontal');
                this.gridContainer.css({'display' : 'flex'});
                this.panel.css({'top' : window.innerHeight-this.panelHeight + 'px'});
             } else {
                this.panel.css({'top' : window.innerHeight + 'px'});
                setTimeout(function() {
                    if (!erTSO.options.panelVisible) { // it might have been set to true again during timeout duration
                        erTSO.gridContainer.removeClass('er-tab-slide-out-grid-horizontal');
                        erTSO.gridContainer.css({'display' : 'none'});
                    }
                }, 500);
            }
        } else if (this.options.tabPositioning === 'left') {
            this.handle.css({'left' : (this.panelWidth - 1) + 'px'});
            if (this.options.panelVisible) {
                this.gridContainer.css({'display' : 'grid'});
                this.panel.css({'left' : '0px'});
            } else {
                this.panel.css({'left' : '-' + this.panelWidth + 'px'});
                setTimeout(function() {
                    if (!erTSO.options.panelVisible) { // it might have been set to true again during timeout duration
                        erTSO.gridContainer.css({'display' : 'none'});
                    }
                }, 500);
            }
        }
        let tab_slide_out = $('#er-tab-slide-out');
        if (tab_slide_out.length) {
            if (erTSO.options.panelVisible) {
                tab_slide_out.removeClass('er-tab-in');
                tab_slide_out.addClass('er-tab-out');
            } else {
                tab_slide_out.removeClass('er-tab-out');
                tab_slide_out.addClass('er-tab-in');
            }
        }
    }
});

console.log('do not delete this comment - workaround to make injected code work properly in firefox'); // injecting the code in firefox will not work, if script returns nothing