var isEasyReadingConfigPage = true;

$(document).ready(function () {

    /*
    $('#loginMessage').html(browser.i18n.getMessage("loginMessage"));
    $('#loginDescription').html(browser.i18n.getMessage("loginDescription"));
    $('#loginGoogle').html(browser.i18n.getMessage("loginGoogle"));
    $('#loginFacebook').html(browser.i18n.getMessage("loginFacebook"));
    $('#anonymLogin').html(browser.i18n.getMessage("loginAnonym"));


     */
    let backgroundPage = browser.extension.getBackgroundPage();
    let easyReadingConfig = backgroundPage.easyReading.config;
    let selectEndpointURLFieldSetHTML = '<fieldset class="cloudServerSelect">\n' +
        '    <legend>Select cloud host</legend>';
    for(let i = 0; i < backgroundPage.easyReading.cloudEndpoints.length; i++){

        if(i === parseInt(easyReadingConfig.cloudEndpointIndex)){
            selectEndpointURLFieldSetHTML+=
                ' <input type="radio" id="endpoint'+i+'" name="cloudServer" value="'+i+'" checked>\n' +
                ' <label for="endpoint'+i+'">'+backgroundPage.easyReading.cloudEndpoints[i].description+'</label>\n' +
                ' <br>';
        }else{
            selectEndpointURLFieldSetHTML+=
                ' <input type="radio" id="endpoint'+i+'" name="cloudServer" value="'+i+'">\n' +
                ' <label for="endpoint'+i+'">'+backgroundPage.easyReading.cloudEndpoints[i].description+'</label>\n' +
                ' <br>';
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