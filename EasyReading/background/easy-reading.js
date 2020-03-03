var easyReading = {
        config: null,
        cloudEndpoints: [
            {
                description: "Prod server",
                url: "easyreading-cloud.eu",
            },
            {
                description: "DEV server",
                url: "dev.easyreading-cloud.eu",
            },
            {
                description: "Localhost",
                url: "localhost:8080"
            }
        ],
        ignoredConfigSites: [
            "/client/function-editor",
        //    "/client/setup",
        ],

        init: function () {

            let gettingConfig = browser.storage.local.get(easyReading.getDefaultConfig());

            gettingConfig.then(function (config) {

                easyReading.config = config;
                easyReading.saveConfig();
                easyReading.startup();

            }, function (error) {

                easyReading.config = easyReading.getDefaultConfig();
                easyReading.saveConfig();
                easyReading.startup();

            });
        }

        ,
        startup: function () {


            browser.runtime.openOptionsPage();

        },
        getDefaultConfig: function () {

            return {
                cloudEndpointIndex: 0,
            };
        },
        getEndpoint: function () {
            if (easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex]) {
                cloudWebSocket.initWebSocket(easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex]);
            } else {
                cloudWebSocket.initWebSocket(easyReading.cloudEndpoints[0]);
            }
        },
        saveConfig: function () {

            if (!easyReading.config) {
                easyReading.config = easyReading.getDefaultConfig();
            }
            browser.storage.local.set(easyReading.config);

        },

        updateEndpointIndex: function (index) {
            easyReading.config.cloudEndpointIndex = index;
            easyReading.saveConfig();
        },

        isIgnoredUrl(url){
            for(let i=0; i < easyReading.ignoredConfigSites.length; i++){

                let currentURL = easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex].url;
                if(url.includes(currentURL+easyReading.ignoredConfigSites[i])){
                    return true;
                }

            }

            return false;
        }


    }
;


easyReading.init();