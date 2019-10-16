var silentLogin = {
    httpRequest : null,
    url: null,
    uuid: null,
    login: function (url, uuid) {
        this.url = url;
        this.uuid = uuid;
        this.httpRequest = new XMLHttpRequest();
        this.httpRequest.open("POST",this.getLoginURL() );
        this.httpRequest.onreadystatechange = this.onReadyStateChange;
        this.httpRequest.send();
    },
    onReadyStateChange(e){
        if (e.target.readyState === XMLHttpRequest.DONE && e.target.status === 200) {
            let authFailed = false;
            try {
                let response = JSON.parse(silentLogin.httpRequest.responseText);


                if(!response.success){
                    authFailed = true;
                } else {
                    if (!background.reasoner) {
                        background.reasoner = new EasyReadingReasoner(0.01);
                    } else {
                        background.reasoner.active = true;
                    }
                }
            } catch (e) {
                authFailed = true;
            }

            if(authFailed){

                if (background.reasoner) {
                    background.reasoner.active = false;
                }

                browser.runtime.openOptionsPage();
                let optionsPage = background.getActiveOptionsPage();

                if(optionsPage){
                    optionsPage.silentLoginFailed(silentLogin.getLoginURL());
                }
            }

        }else{
            console.log("ERROR");
        }
    },

    getLoginURL: function () {

        return this.url+"/client/login?token="+this.uuid;
    }
};
