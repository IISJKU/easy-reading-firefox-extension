let contentScriptController = {
    init: function () {
        document.addEventListener('cloudRequestResult', function (event) {
            let requestResult = document.getElementById('easy-reading-debug');
            let result =  JSON.parse(requestResult.dataset.result);
            requestManager.receiveRequestResult(result);
        });

    },

    sendMessageToBackgroundScript: function (message) {
        let event = new CustomEvent('cloudRequest', {
            detail: {
                message: message,
            }

        });
        document.dispatchEvent(event);
    }


};

contentScriptController.init();