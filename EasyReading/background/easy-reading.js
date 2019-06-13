var easyReading = {
        config: null,
        cloudEndpoints: [
            {
                description: "AWS Prod server",
                url: "easyreading-cloud.eu",
            },
            {
                description: "AWS DEV server",
                url: "dev.easyreading-cloud.eu",
            },
            {
                description: "Production server",
                url: "easy-reading.eu-gb.mybluemix.net",
            },
            {
                description: "Development server",
                url: "dev-easy-reading.eu-gb.mybluemix.net",
            },
            {
                description: "Localhost",
                url: "localhost:8080"
            }
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
        }


    }
;


easyReading.init();