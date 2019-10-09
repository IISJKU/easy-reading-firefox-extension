
$(document).ready(function () {
    $("body").on("keyup", "a, button, input, textarea, select", function (e) {
        var code = e.keyCode ? e.keyCode : e.which;
        var el = document.activeElement;

        if (code == '9') {
            el.classList.add('tabbed');
        }
    });

    $('body').on('blur', '.tabbed', function (e) {
        e.currentTarget.classList.remove('tabbed');
        if (e.currentTarget.classList.length === 0) {
            e.currentTarget.removeAttribute("class");
        }
    });
});
