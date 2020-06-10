/**
 * Main extension singleton object
 */
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
            "/client/setup",
        ],

    /**
     * Initialize the extension from local storage
     */
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

    /**
     * This function is called at start-up time to run the options page
     */
    startup: function () {
        browser.runtime.openOptionsPage();
     },

    /**
     * Return the default configuration
     * @returns {{cloudEndpointIndex: number}}
     */
    getDefaultConfig: function () {
        return {
            cloudEndpointIndex: 0,
        };
    },

    /**
     * Initialize the WS connection to the cloud
     */
    getEndpoint: function () {
        if (easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex]) {
            cloudWebSocket.initWebSocket(easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex]);
        } else {
            cloudWebSocket.initWebSocket(easyReading.cloudEndpoints[0]);
        }
    },

    /**
     * Save current configuration to local storage
     */
    saveConfig: function () {
        if (!easyReading.config) {
            easyReading.config = easyReading.getDefaultConfig();
        }
        browser.storage.local.set(easyReading.config);

    },

    /**
     * Change the index of the cloud endpoint URL to be used in remote calls
     * @param {number} index: the new index to use
     */
    updateEndpointIndex: function (index) {
        easyReading.config.cloudEndpointIndex = index;
        easyReading.saveConfig();
    },

    /**
     * Returns whether the site given by an URL is to be ignored by the extension, such as Easy Reading configuration
     * web pages.
     * @param {string} url: An website URL
     * @returns {boolean}: True if the site must be ignored, False otherwise
     */
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