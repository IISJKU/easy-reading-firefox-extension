let tracking_dialog = {

    dialog: null,
    help_requested: false,
    // Position where help is requested, not dialog coordinates!
    pos_x: -1,
    pos_y: -1,

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
                    posY: tracking_obj.pos_y
                });
            } else {
                console.log('User rejected help');
                contentScriptController.portToBackGroundScript.postMessage({type: "requestHelpRejected"});
            }
        });
        this.help_requested = false;
    },

    cleanDialog() {
      this.dialog = null;
    },

    showDialog(x, y) {
        this.loadDialog();
        this.pos_x = x;
        this.pos_y = y;
        this.dialog.show();
    }
};

let confirm_dialog = {

    dialog: null,
    help_accepted: true,
    pos_x: -1,
    pos_y: -1,

    init: function () {
        this.loadDialog();
    },

    loadDialog() {
        let tracking_obj = this;
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
                contentScriptController.portToBackGroundScript.postMessage({type: "undoHelp"});
            }
        });
        this.help_accepted = true;
    },

    cleanDialog() {
        this.dialog = null;
    },

    showDialog() {
        this.loadDialog();
        this.dialog.show();
    }
};

tracking_dialog.init();
confirm_dialog.init();
