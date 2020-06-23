class AutoButton extends WidgetBase{

    constructor(functionInfo, userInterface,targetID, configuration){
        super(functionInfo,userInterface,targetID,configuration);

        this.widgetID = 'er_button_'+this.widgetID;
        $("#"+targetID).append("<button id='"+this.widgetID+"' class='easy-reading-button'><img src='"+functionInfo.source.defaultIconURL+"' title='"+functionInfo.source.name+": "+functionInfo.source.description+"'> </button>");
        this.enable();

        this.isActivated = false;
        this.initialRequest = true;

        this.requestInProgress = true;
        globalEventListener.addPresentationFinishListener(this);
        let autoButton = this;
        $(document).ready(()=>{
            autoButton.createRequest();
            //autoButton.toggle();
        });
    }

    enable(){
        $("#"+this.widgetID).on( "click",this, this.buttonClicked);

    }

    disable(){
        $("#"+this.widgetID).off( "click",this, this.buttonClicked);


    }

    buttonClicked(e){
        if(!e.data.requestInProgress){

            if(e.data.isActivated){
                e.data.toggle();
            }else{
                e.data.createRequest();
            }


        }

    }

    toggle(){
        if(this.isActivated){
            $("#"+this.widgetID).removeClass("er-button-active");
            this.stopPresentation();
        }else{
            $("#"+this.widgetID).addClass("er-button-active");
        }
        this.isActivated = !this.isActivated;
    }

    createRequest(){
        this.requestInProgress = true;
        requestManager.createRequest(this,{
            type: "URL",
            url: window.location.href,
        }, null, this.initialRequest);
    }

    remove(){
        this.isActivated = false;
        $("#"+this.widgetID).remove();
    }

    presentationFinished(presentation) {
        super.presentationFinished(presentation);


        if(presentation.requestCounter > 0){
            this.toggle()

        }

        this.initialRequest = false;
        this.requestInProgress = false;


    }
}
