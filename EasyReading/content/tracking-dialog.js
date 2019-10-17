let tracking_dialog = {

    dialog: null,
    help_requested: false,

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
                contentScriptController.portToBackGroundScript.postMessage({type: "requestHelpNeeded"});
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

    showDialog() {
        this.loadDialog();
        this.dialog.show();
    }
};

tracking_dialog.init();
