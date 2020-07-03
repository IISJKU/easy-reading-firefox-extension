let erReadabilityActive = false;

function readability(req, config,widget) {

    config = {
        contentWidth: 50,
        fontSize: 24,
        lineSpacing: 2.5,
    };

    if(erReadabilityActive){

        $(".er-readability-hidden").removeClass("er-readability-hidden");
        $("#er-readability-container").remove();
        $("body").removeClass("er-readability-body");
    }else{
        let sentenceTokenizer = new SentenceTokenizer();
        if(isProbablyReaderable(document)){

            let options = {
                "newline_boundaries" : false,
                "html_boundaries"    : false,
                "sanitize"           : false,
                "allowed_tags"       : false,
                "preserve_whitespace" : true,
                "abbreviations"      : null
            };
            let documentClone = document.cloneNode(true);
            let article = new Readability(documentClone).parse();


            let title = "<h1>"+article.title+"</h1>";
            let readabilityContent = $.parseHTML(title+article.content);

            let container = $.parseHTML("<div class='er-readability-background'>" +
                "   <div class='er-readability-container' id='er-readability-container'>" +
                "   </div>" +
                "</div>");
            $('body').append(container);
            $('#er-readability-container').append(readabilityContent);


            $('#er-readability-container *:empty' ).each(function () {
                if($(this).is("img")){

                }else{
                    $(this).remove();
                }
            });


            let whitelist = ["src","alt","title","href","colspan","rowspan","scope","lang"];
            $('#er-readability-container *').each(function() {
                var attributes = this.attributes;
                var i = attributes.length;
                while( i-- ) {
                    var attr = attributes[i];
                    if( $.inArray(attr.name,whitelist) == -1 )
                        this.removeAttributeNode(attr);
                }
            });

            $('#er-readability-container p').each(function () {

                let html = $(this).html();
                let sentences = tokenizer.sentences(html,options);
                let sentencesWithBR = "";
                for(let i=0; i < sentences.length; i++){

                    sentencesWithBR+=sentences[i];
                    if(i < sentences.length-1){
                        sentencesWithBR+="<br>";
                    }
                }
                $(this).html(sentencesWithBR);
            });
            $('body').children().each(function () {

                if($(this).hasClass("easy-reading-interface") || $(this).hasClass("er-readability-background")){

                }else{
                    $(this).addClass('er-readability-hidden');
                }
            });

            $("body").addClass("er-readability-body");
            $('#er-readability-container *').addClass("er-readability-style-revert");

            $(".er-readability-container").css("max-width", config.contentWidth+"%");
            $(".er-readability-container").css("font-size", config.fontSize);
            $(".er-readability-container").css("line-height", config.lineSpacing);

        }else{
            alertManager.showErrorAlert("Sorry I could not detect the content of the page.");

            widget.requestFailed(req,config);
            return;
        }


    }

    erReadabilityActive = !erReadabilityActive;





}