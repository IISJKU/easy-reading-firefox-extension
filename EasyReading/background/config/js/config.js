var isEasyReadingConfigPage = true;

$(document).ready(function () {

    $("#heading1").html(browser.i18n.getMessage("login_welcome"));
    $("#heading2_1").html(browser.i18n.getMessage("login_type_text"));

    $("#loginGoogle").html(browser.i18n.getMessage("login_type_google_text"));
    $("#button1_text_1").html(browser.i18n.getMessage("login_type_google_p1"));
    $("#button1_text_2").html(browser.i18n.getMessage("login_type_google_p2"));

    $("#loginFacebook").html(browser.i18n.getMessage("login_type_facebook_text"));
    $("#button2_text_1").html(browser.i18n.getMessage("login_type_facebook_p1"));
    $("#button2_text_2").html(browser.i18n.getMessage("login_type_facebook_p2"));

    $("#anonym").html(browser.i18n.getMessage("login_type_anonymous_text"));
    $("#button3_text_1").html(browser.i18n.getMessage("login_type_anonymous_p1"));
    $("#button3_text_2").html(browser.i18n.getMessage("login_type_anonymous_p2"));


    let backgroundPage = browser.extension.getBackgroundPage();
    let easyReadingConfig = backgroundPage.easyReading.config;
    let selectEndpointURLFieldSetHTML = '<fieldset class="cloudServerSelect">\n' +
        '    <legend>Select cloud host</legend>';
    for(let i = 0; i < backgroundPage.easyReading.cloudEndpoints.length; i++){

        if(i === parseInt(easyReadingConfig.cloudEndpointIndex)){
            selectEndpointURLFieldSetHTML+=
                ' <input type="radio" id="endpoint'+i+'" name="cloudServer" value="'+i+'" checked>\n' +
                ' <label for="endpoint'+i+'">'+backgroundPage.easyReading.cloudEndpoints[i].description+'</label>\n' +
                ' ';
        }else{
            selectEndpointURLFieldSetHTML+=
                ' <input type="radio" id="endpoint'+i+'" name="cloudServer" value="'+i+'">\n' +
                ' <label for="endpoint'+i+'">'+backgroundPage.easyReading.cloudEndpoints[i].description+'</label>\n' +
                '';
        }

    }
    selectEndpointURLFieldSetHTML+='</fieldset>';
    $("#cloudServerSelect").html(selectEndpointURLFieldSetHTML);

    $("#googleSignInButton").click(function () {
        if(backgroundPage.background.userLoggedIn){
            updateStatus();
        }else {
            let cloudEndpointIndex = $('input[name=cloudServer]:checked', '.cloudServerSelect').val();
            backgroundPage.easyReading.updateEndpointIndex(cloudEndpointIndex);

            let config = {
                url: backgroundPage.easyReading.cloudEndpoints[cloudEndpointIndex].url,
                authMethod: "google",

            };
            backgroundPage.background.connectToCloud(config);
        }
    });

    $("#fbSignInButton").click(function () {

        var x = document.getElementById("myAudio");
        x.play();

        if(backgroundPage.background.userLoggedIn){
            updateStatus();
        }else {

            let cloudEndpointIndex = $('input[name=cloudServer]:checked', '.cloudServerSelect').val();
            backgroundPage.easyReading.updateEndpointIndex(cloudEndpointIndex);

            let config = {
                url: backgroundPage.easyReading.cloudEndpoints[cloudEndpointIndex].url,
                authMethod: "fb",

            };
            backgroundPage.background.connectToCloud(config);
        }
    });

    $("#anonymLogin").click(function () {

        if(backgroundPage.background.userLoggedIn){
            updateStatus();
        }else{
            let cloudEndpointIndex = $('input[name=cloudServer]:checked', '.cloudServerSelect').val();
            backgroundPage.easyReading.updateEndpointIndex(cloudEndpointIndex);

            let userLang = (navigator.language || navigator.userLanguage).split("-");
            let userLangCode = "en";
            if(userLang.length > 0){
                userLangCode = userLang[0];
            }


            let config = {
                url: backgroundPage.easyReading.cloudEndpoints[cloudEndpointIndex].url,
                authMethod: "anonym",
                lang: userLangCode,

            };
            backgroundPage.background.connectToCloud(config);

        }


    });

    $("#toogleSetting").click(function () {
        $('#cloudServerSelect').toggle();
        $('#toogleSetting').toggleClass("selected");
    });



    let urlVars =  getUrlVars();

    if(urlVars['debug'] === "true"){
        $('#toggleContainer').show();
    }

    updateStatus();
});

function updateStatus(error) {
    $("#debugModeInfo").empty();
    let backgroundPage = browser.extension.getBackgroundPage();

    if(backgroundPage.cloudWebSocket.isConnected){

        if(backgroundPage.scriptManager.profileReceived){
            let backgroundPage = browser.extension.getBackgroundPage();
            let easyReadingConfig = backgroundPage.easyReading.config;

            window.location.replace("https://"+backgroundPage.easyReading.cloudEndpoints[easyReadingConfig.cloudEndpointIndex].url+"/client/welcome");
        }

    }else{
        $("#infoContainer").hide();
        $("#connectionInfo").html('Could not connect to cloud!');
    }


    if(error){
        $("#infoContainer").show();
        $("#connectionInfo").html(error);
    }else if(backgroundPage.background.errorMsg){
        $("#infoContainer").show();
        $("#connectionInfo").html(backgroundPage.background.errorMsg)
    }else {
        $("#infoContainer").hide();
        $("#connectionInfo").empty();
    }



}

function silentLoginFailed(url) {
    window.location.replace(url);
}

function getUrlVars() {
    let vars = {};
    let parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}