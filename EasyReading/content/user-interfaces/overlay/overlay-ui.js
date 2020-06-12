class OverlayUserInterface extends UserInterfaceBase {
    constructor(configuration,tabConfiguration) {
        super(configuration,tabConfiguration);
        this.configuration.startPositionXInPercent = 20;
        this.configuration.startPositionYInPercent = 20;
        this.currentToolId = 1;
        this.toolsContainers = [];
    }

    initUI() {
        let userInterface = this;
        let config = this.configuration;
        $("body").prepend('<div id="overlay_ui_wrapper"></div>');
        $("#overlay_ui_wrapper").prepend('<div id="easy_reader_overlay_dialog" class="easy-reading-interface" title="Easy Reader"><p><div id="overlay-grid-container" class="easy-reader-controls-container"></div></p></div>');

        this.overlayWidth = this.configuration.buttonSize * 3 + 10;
        let position = { my: "left+" + ((window.innerWidth - this.overlayWidth)*this.configuration.startPositionXInPercent/100) + " top+" + (window.innerHeight*this.configuration.startPositionYInPercent/100), at: "left top", of: window };
        if(this.tabConfiguration && this.tabConfiguration.aktpos) {
            position = {
                my: "left+" + this.tabConfiguration.aktpos.left + " top+" + this.tabConfiguration.aktpos.top,
                at: "left top",
                of: window,
            };
        }

        let mousePosInDialog = {'left': 0, 'top': 0};
        let ER_dialog = $("#easy_reader_overlay_dialog").dialog({
            appendTo: '#overlay_ui_wrapper',
            dialogClass: 'overlay-fixed-dialog no-close',
            drag: function(event, ui) {
                // keep complete dialog in the visible part of the window and
                // set dialog to position of mouse after returning from leaving page (otherwise wrong position after page has been scrolled)
                if ((event.clientY > mousePosInDialog.top) && (event.clientY < window.innerHeight - $("#easy_reader_overlay_dialog").parent().height() + mousePosInDialog.top)) {
                    ui.position.top = event.clientY - mousePosInDialog.top;
                } else {
                    if (event.clientY < mousePosInDialog.top) {
                        ui.position.top = 0;
                    } else if (event.clientY > window.innerHeight - $("#easy_reader_overlay_dialog").parent().height() + mousePosInDialog.top) {
                        ui.position.top = window.innerHeight - $("#easy_reader_overlay_dialog").parent().height();
                    }
                }
                
                if ((event.clientX > mousePosInDialog.left) && (event.clientX < window.innerWidth - mousePosInDialog.left)) {
                    ui.position.left = event.clientX - mousePosInDialog.left;
                } else {
                    if (event.clientX < mousePosInDialog.left) {
                        ui.position.left = 0;
                    } else if (event.clientX > window.innerWidth - mousePosInDialog.left) {
                        ui.position.left = window.innerWidth - $("#easy_reader_overlay_dialog").parent().width();
                    }
                }
            },
            dragStart: function(event, ui)  {
                // remember position of mouse in dialog to set it again after leaving page (otherwise wrong position after page has been scrolled)
                mousePosInDialog = {'left': (event.clientX - ui.position.left), 'top': (event.clientY - ui.position.top)};
            },
            dragStop: function(event, ui) {
                userInterface.saveConfiguration();
            },
            position: position,
            width: this.overlayWidth,

        });

        // add callback to recalculate and set y-position, once we know the actual hight of the dialog box
        if (!this.tabConfiguration) {
            let overLWidth = this.overlayWidth;
            let conf = this.configuration;
            $("#easy_reader_overlay_dialog").parent().imagesLoaded(function() {
                position.my = "left+" + ((window.innerWidth - overLWidth)*config.startPositionXInPercent/100) + " top+" + ((window.innerHeight - $("#easy_reader_overlay_dialog").parent().height())*config.startPositionYInPercent/100);
                $("#easy_reader_overlay_dialog").dialog( "option", "position", position);
                // save freshly calculated position to background
                userInterface.saveConfiguration();
            });
        }

        $("#easy_reader_overlay_dialog").parent().addClass("easy-reading-interface");
        
        $(".ui-dialog").css('z-index', 9999999);

        ER_dialog.parent().attr("id","overlay_ui");

        $(document).on('keydown', function(evt) {
            if ($(evt.target).attr('id') && (($(evt.target).attr('id') === 'overlay_ui') || ($(evt.target).attr('class').includes('ui-dialog-titlebar')) || ($(evt.target).attr('class').includes('overlay-grid-item') || ($(evt.target).attr('class').includes('easy-reading-button'))))) {
                if ((evt.ctrlKey) && (evt.which === 114)) { // jump out of overlayUI on CTRL-Alt-2
                    evt.preventDefault(); // prevent default action for keys
                    $('body').find(':tabbable').not('.easy-reading-button').first().focus();
                } else if (evt.shiftKey) { // drag with shift-arrowKey
                    switch(evt.which) {
                        case 37: { // arrow left
                            evt.preventDefault(); // prevent default action for keys
                            let nextLeft = parseInt($("#overlay_ui").css('left')) - 2;
                            if (nextLeft < 0) nextLeft = 0;
                            $("#overlay_ui").css('left', nextLeft + 'px');
                            userInterface.saveConfiguration();
                            break;
                        }
                        case 38: { // arrow up
                            evt.preventDefault(); // prevent default action for keys
                            let nextTop = parseInt($("#overlay_ui").css('top')) - 2;
                            if (nextTop < 0) nextTop = 0;
                            $("#overlay_ui").css('top', nextTop + 'px');
                            userInterface.saveConfiguration();
                            break;
                        }
                        case 39: { // arrow right
                            evt.preventDefault(); // prevent default action for keys
                            let nextLeft = parseInt($("#overlay_ui").css('left')) + 2;
                            if (nextLeft > window.innerWidth - userInterface.overlayWidth) nextLeft = window.innerWidth - userInterface.overlayWidth;
                            $("#overlay_ui").css('left', nextLeft + 'px');
                            userInterface.saveConfiguration();
                            break;
                        }
                        case 40: { // arrow down
                            evt.preventDefault(); // prevent default action for keys
                            let nextTop = parseInt($("#overlay_ui").css('top')) + 2;
                            if (nextTop > window.innerHeight - parseInt($("#overlay_ui").css('height'))) nextTop = window.innerHeight - parseInt($("#overlay_ui").css('height'));
                            $("#overlay_ui").css('top', nextTop + 'px');
                            userInterface.saveConfiguration();
                            break;
                        }
                    }
                }
            } else if ((evt.ctrlKey) && (evt.which === 113)) { // jump into overlayUI on CTRL-Alt-1
                evt.preventDefault(); // prevent default action for keys
                $("#overlay_ui").find('.easy-reading-button').first().focus();
            }
        });
    }


    show() {

        $("#easy_reader_overlay_dialog").show();
    }

    hide() {

        $("#easy_reader_overlay_dialog").hide();
    }

    getToolContainerIDForLayout(toolID,layoutConfig,order){
        let currentContainerID = "overlay-container-" + this.currentToolId;
        this.currentToolId++;

        let toolInfo = {
            toolID: toolID,
            containerID: currentContainerID,
        };
        let animatedCSSClass = "";
        if(typeof order !== "undefined"){
            animatedCSSClass = " overlay-animated";
        }
        if(typeof order !== "undefined" && order < this.toolsContainers.length) {
            let currentToolInThatOrder = this.toolsContainers[order];
            $("#"+currentToolInThatOrder.containerID).before('<div class="overlay-grid-item'+animatedCSSClass+'" id="'+currentContainerID+'" style="width: ' + this.configuration.buttonSize + 'px;height: ' + this.configuration.buttonSize + 'px;"></div>');
            this.toolsContainers.splice(order,0,toolInfo);
        }else{

            $('#overlay-grid-container').append('<div class="overlay-grid-item'+animatedCSSClass+'" id="'+currentContainerID + '" style="width: ' + this.configuration.buttonSize + 'px;height: ' + this.configuration.buttonSize + 'px;"></div>');
            this.toolsContainers.push(toolInfo);
        }

        return currentContainerID;
    }

    removeContainerForTool(toolID){
        for(let i=0; i < this.toolsContainers.length; i++){
            if(this.toolsContainers[i].toolID === toolID){


                $('#'+this.toolsContainers[i].containerID).remove();
                this.toolsContainers.splice(i,1);
                console.log("REMOVING:"+toolID);
                return;
            }
        }
    }

    toolsLoaded() {
        // add special buttons in a separate container
        $("#overlay_ui").append(
            '<div id="er-overlay-special-button-container">' + 
                '<div id="er-overlay-container-settings" class="er-overlay-grid-item" style="width: ' + this.configuration.buttonSize + 'px;height: ' + this.configuration.buttonSize + 'px;">' + 
                    '<button id="er-overlay-settings-button" class="easy-reading-button" onclick="location.href=\'' + easyReading.uiCollection.serverURL + '/client/welcome\';">' +
                        '<img src="' + easyReading.uiCollection.serverURL + '/components/user-interface/overlay/1.0/ui/images/settings.png" title="Opens settings">' +
                    '</button>' + 
                '</div>' + 
                '<div id="er-overlay-container-feedback" class="er-overlay-grid-item" style="width: ' + this.configuration.buttonSize + 'px;height: ' + this.configuration.buttonSize + 'px;">' + 
                    '<button id="er-overlay-feedback_button" class="easy-reading-button" style="width: ' + this.configuration.buttonSize + 'px;height: ' + this.configuration.buttonSize + 'px;">' +
                        '<img src="' + easyReading.uiCollection.serverURL + '/components/user-interface/overlay/1.0/ui/images/feedback.png" title="Opens feedback form">' +
                    '</button>' + 
                '</div>' +
            '</div>');

        $("#er-overlay-feedback_button").click(function() {
            feedbackForm.showFeedbackForm();
        });      

        $("#er-overlay-special-button-container").css("grid-template-columns", this.configuration.buttonSize + "px " + this.configuration.buttonSize + "px"); 
    }    

    remove() {
        $("#easy_reader_overlay_dialog").dialog("destroy").remove();
    }

    uiUpdated() {
        if (this.tabConfiguration && this.tabConfiguration.startX && ((this.tabConfiguration.startX != this.configuration.startPositionXInPercent) || (this.tabConfiguration.startY != this.configuration.startPositionYInPercent))) {
            $("#easy_reader_overlay_dialog").dialog("option", "position", {my: "left+" + ((window.innerWidth - this.overlayWidth)*this.configuration.startPositionXInPercent/100) + " top+" + ((window.innerHeight - $("#easy_reader_overlay_dialog").parent().height())*this.configuration.startPositionYInPercent/100), at: "left top", of: window});
            this.saveConfiguration();
        }

        $("#er-overlay-special-button-container").css("grid-template-columns", this.configuration.buttonSize + "px " + this.configuration.buttonSize + "px");
    }
    
    saveConfiguration() {
        uiUpdateManager.saveCurrentConfiguration(this, {'aktpos': {'top': parseInt($("#overlay_ui").css('top')), 'left': parseInt($("#overlay_ui").css('left'))}, 'startX': this.configuration.startPositionXInPercent, 'startY': this.configuration.startPositionYInPercent});
    }
}