class SpinnerBusyAnimation extends BusyAnimation{

    constructor(configuration){
        super(configuration);

        this.numberOfBusyRequests = 0;

        $("body").append('<div id="er-busy-animation" style="display: none" class="lds-ring"><div></div><div></div><div></div><div></div></div>');
        $(document).on('mousemove', function(e){
            $('#er-busy-animation').css({
                left:  e.pageX-30,
                top:   e.pageY+20
            });
        });
    }


    startAnimation(textnodes){
        this.numberOfBusyRequests++;
        $('#er-busy-animation').show();

    }

    stopAnimation(){
        this.numberOfBusyRequests--;
        $('#er-busy-animation').hide();

    }
}
