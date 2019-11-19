let tracking_dialog = {

    dialog: null,
    help_requested: false,
    // Position where help is requested, not dialog coordinates!
    pos_x: -1,
    pos_y: -1,
    // IOType with chosen input
    input: null,
    ui: -1,
    tool: -1,

    init: function () {
        this.loadDialog();
    },

    loadDialog() {
        let tracking_obj = this;
        this.dialog = new Noty({
            id: 'er-user-tracking-feedback-dialog',
            type: 'success',
            text: 'Do you need help?',
            layout: 'topRight',
            theme: 'relax',
            timeout: 3500,
            progressBar: true,
            buttons: [
                Noty.button('Yes',
                    'er-tracking-button',
                    function () {
                        tracking_obj.help_requested = true;
                        tracking_obj.dialog.close();
                    }
                ),
                Noty.button('No',
                    'er-tracking-button',
                    function () {
                        tracking_obj.help_requested = false;
                        tracking_obj.dialog.close();
                    }
                )
            ]
        }).on('onClose', function() {
            if (tracking_obj.help_requested) {
                console.log('User asked for help');
                contentScriptController.portToBackGroundScript.postMessage({
                    type: "requestHelpNeeded",
                    posX: tracking_obj.pos_x,
                    posY: tracking_obj.pos_y,
                    input: JSON.stringify(tracking_obj.input),
                    automatic: false,
                });
            } else {
                console.log('User rejected help');
                tracking_obj.reset();
                contentScriptController.portToBackGroundScript.postMessage({type: "requestHelpRejected"});
            }
        });
        this.help_requested = false;
    },

    cleanDialog() {
      this.dialog = null;
    },

    reset() {
        this.input = null;
        this.pos_y = -1;
        this.pos_x = -1;
    },

    setTool(ui_index, tool_index) {
        if (this.input) {
            this.ui = ui_index;
            this.tool = tool_index;
        } else {
            console.log("Tracking dialog assigned a tool no input stored. Skipping dialog.");
        }
    },

    showDialog(x, y, input) {
        if (!this.input) {
            this.loadDialog();
            this.pos_x = x;
            this.pos_y = y;
            this.input = input;
            this.dialog.show();
        } else {
            console.log("Dialog requested but previous dialog not resolved yet. Hiding new dialog.");
        }
    }
};

let confirm_dialog = {

    dialog: null,
    help_accepted: true,
    input: null,
    ui: -1,
    tool: -1,
    in_progress: false,

    init: function () {
        this.loadDialog();
    },

    loadDialog() {
        let tracking_obj = this;
        tracking_obj.in_progress = true;
        this.dialog = new Noty({
            id: 'er-user-tracking-feedback-dialog',
            type: 'information',
            text: 'Undo changes?',
            layout: 'topRight',
            theme: 'relax',
            timeout: 6000,
            progressBar: true,
            buttons: [
                Noty.button('Yes',
                    'er-tracking-button',
                    function () {
                        tracking_obj.help_accepted = false;
                        tracking_obj.dialog.close();
                    }
                ),
                Noty.button('No',
                    'er-tracking-button',
                    function () {
                        tracking_obj.help_accepted = true;
                        tracking_obj.dialog.close();
                    }
                )
            ]
        }).on('onClose', function() {
            if (tracking_obj.help_accepted) {
                console.log('User confirmed help');
                contentScriptController.portToBackGroundScript.postMessage({
                    type: "confirmHelp",
                });
            } else {
                console.log('User rejected given help');
                requestManager.cancelRequest(
                    easyReading.userInterfaces[tracking_obj.ui].tools[tracking_obj.tool],
                    true
                );
                contentScriptController.portToBackGroundScript.postMessage({type: "undoHelp"});
            }
            tracking_obj.reset();
        });
    },

    cleanDialog() {
        this.dialog = null;
    },

    reset() {
        this.input = null;
        this.ui = -1;
        this.tool = -1;
        this.in_progress = false;
    },

    setInput(input) {
        if (!this.input) {
            this.input = input;
        } else {
            console.log("Confirm dialog assigned new input but previous dialog not resolved yet. Ignoring new input");
        }
    },

    setTool(ui_index, tool_index) {
        if (this.input) {
            this.ui = ui_index;
            this.tool = tool_index;
        } else {
            console.log("Confirm dialog assigned a tool no input stored. Skipping dialog.");
        }
    },

    showDialog() {
        if (this.in_progress) {
            if (this.input) {
                this.loadDialog();
                this.dialog.show();
            } else {
                console.log("Confirm dialog requested but no input stored. Skipping dialog.");
            }
        } else {
            console.log("Confirm dialog requested but previous dialog not resolved yet. Hiding new dialog.");
        }
    }
};

tracking_dialog.init();
confirm_dialog.init();
