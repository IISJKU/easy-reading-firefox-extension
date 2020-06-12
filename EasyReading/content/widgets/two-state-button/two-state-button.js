class TwoStateButton extends WidgetBase{

    constructor(functionInfo, userInterface,targetID, configuration){
        super(functionInfo,userInterface,targetID,configuration);

        console.log(this.widgetID );
        this.widgetID = 'er_button_'+this.widgetID;
        $("#"+targetID).append("<button id='"+this.widgetID+"' class='easy-reading-two-state-button'><img src='"+functionInfo.source.defaultIconURL+"' title='"+functionInfo.source.name+": "+functionInfo.source.description+"'> </button>");
        this.enable();
        this.pressed = false;
    }

    enable(){
        $("#"+this.widgetID).on( "click",this, this.buttonClicked);

    }

    disable(){
        $("#"+this.widgetID).off( "click",this, this.buttonClicked);


    }

    buttonClicked(e){
        e.data.pressed = !e.data.pressed;
        $("#"+e.data.widgetID).toggleClass( "er-button-active" );
        let voidInput = {
            type: "Void",
        };
        requestManager.createRequest(e.data, voidInput, e);
    }

    remove(){
        $("#"+this.widgetID).remove();


    }

    requestFailed(req,config){
        $("#"+this.widgetID).removeClass( "er-button-active" );
        this.pressed = false;
    }
}
