var alertManager = {

    alertWasClosed: false,
    alertIsOpen: false,

    suppressClick:function () {

        if(alertManager.alertIsOpen){
            return true;
        }

        if(alertManager.alertWasClosed){
            alertManager.alertWasClosed = false;
            return true;
        }
        return false;
    },

    showErrorAlert: function (title,description) {
        alertManager.alertIsOpen = true;
        Swal.fire({
            title: title,
            text: description,
            type: 'error',
            confirmButtonText: 'Ok',
            width: 250,
            padding: '1em',
        }).then((result) => {
            alertManager.alertWasClosed = true;
            alertManager.alertIsOpen = false;
        });
    },

    showInfoAlert: function (title,description) {
        alertManager.alertIsOpen = true;
        Swal.fire({
            title: title,
            text: description,
            type: 'info',
            confirmButtonText: 'Ok',
            width: 250,
            padding: '1em',
        }).then((result) => {
            alertManager.alertIsOpen = true;
            alertManager.alertIsOpen = false;
        });
    }


};