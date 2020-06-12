let recommendationDialog = {

    dialogVisible: false,
    showDialogForRecommendation:function(recommendation){

        recommendationDialog.recommendation = recommendation;


        recommendationDialog.hideDialog();

        let functionDescriptionsHTML = this.creatFunctionDescriptionHTML(recommendation.functions);

        let dialogHTML =  '<div class="modal micromodal-slide" id="er-recommendation-1" aria-hidden="true">\n' +
            '    <div class="modal__overlay" tabindex="-1" data-micromodal-close>\n' +
            '        <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="er-recommendation-1-title">\n' +
            '            <header class="modal__header">\n' +
            '                <h2 class="modal__title" id="er-recommendation-1-title">\n' +
            '                    '+recommendation.title+
            '                </h2>\n' +
            '                <button class="modal__close" aria-label="Close" data-micromodal-close></button>'+
            '            </header>\n' +
            '            <main class="modal__content" id="er-recommendation-1-content">\n' +
            '               <div><strong class="recommendation_description">'+recommendation.description+'</strong></div>' +
            '               <div class="recommendation_outer">'+
            functionDescriptionsHTML+
            '               </div>' +
            '           </main>\n' +
            '            <footer class="modal__footer">\n' +
            '                <button id="erRecommendationDialogYes" class="modal__btn modal__btn-primary recommendation_yes" data-micromodal-close >'+recommendation.yes+'</button>\n' +
            '                <button id="erRecommendationDialogNo" class="modal__btn recommendation_no">'+recommendation.no+'</button>\n' +
            '            </footer>\n' +
            '        </div>\n' +
            '    </div>\n' +
            '</div>';


        $("body").append(dialogHTML);

        MicroModal.show('er-recommendation-1');

        recommendationDialog.dialogVisible = true;


        $("#erRecommendationDialogYes").click(function () {
            recommendationDialog.recommendation.result = true;
            contentScriptController.sendMessageToBackgroundScript({
                type: "recommendationResult",
                data: recommendationDialog.recommendation,
            });

            recommendationDialog.hideDialog();
        });

        $("#erRecommendationDialogNo").click(function () {
            recommendationDialog.recommendation.result = false;
            contentScriptController.sendMessageToBackgroundScript({
                type: "recommendationResult",
                data: recommendationDialog.recommendation,
            });
            recommendationDialog.hideDialog();
        });

    },

    hideDialog: function () {

        if(recommendationDialog.dialogVisible){
            MicroModal.close('er-recommendation-1');
            $("#er-recommendation-1").remove();
            recommendationDialog.dialogVisible = false;
        }


    },

    creatFunctionDescriptionHTML:function (functions) {

        let html =  "<div class='recommendation_functions_container'>";

        for(let i=0; i < functions.length; i++){

            html+=   "<div class='recommendation_function_container'>" +
                        "<h3>"+functions[i].transtlatedTitle+"</h3>" +
                        "<div class='recommendation_image'><img src='"+functions[i].defaultIconURL+"' alt=''></div>" +
                        "<div>"+functions[i].translatedDescription+"</div>" +
                     "</div>";

        }

        html+="</div>";

        return html;

    }
};