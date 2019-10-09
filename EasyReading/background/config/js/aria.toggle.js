
var funkanu = funkanu || {};

funkanu.ariatoggle = (function (_window, _document) {
    var $ = _window.jQuery;

    var enterKeycode = 13;
    var spaceKeyCode = 32;
    var downArrowKeyCode = 40;
    var escapeKeyCode = 27;


    function ariaToggle(conf) {
        this.elems = {
            container: conf.container,
            triggerSelector: conf.triggerSelector,
            target: conf.target,
        };

        this.toggleCallback = conf.clickEvent;
        this.expandedInitially = conf.expandedInitially || false;
        this.toggleAction = function (target) {
            conf.toggleAction != null ? conf.toggleAction(target) : $(target).toggle();
            return $(target);
        }

        this.setupEvents();
        this.setupAriaControls();
    }

    ariaToggle.prototype.setupAriaControls = function () {

        function newGuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
              function (c) {
                  var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
              }).toUpperCase();
        }

        function setUniqueIdForElementIfEmpty($element) {
            if (typeof $element.attr('id') == typeof undefined || typeof $element.attr('id') == false) {
                $element.attr('id', newGuid());
            }
            return;
        }

        var self = this;
        $(self.elems.triggerSelector).each(function () {
            var $elem = $(this),
                $target = self.elems.target($elem);

            setUniqueIdForElementIfEmpty($elem);
            setUniqueIdForElementIfEmpty($target);

            $elem.attr("aria-controls", $target.attr('id'));
            if (!$elem.is(':button')) {
                $elem.attr('role', 'button');
            }

            $target.attr('aria-labelledby', $elem.attr('id'));

            if (self.expandedInitially === true) {
                $target.attr('aria-hidden', 'false');
                $elem.attr('aria-expanded', 'true');
                return;
            }

            $target.hide().attr('aria-hidden', 'true');
            $elem.attr('aria-expanded', 'false');
        });
    };

    ariaToggle.prototype.setupEvents = function () {
        var self = this;

        $(this.elems.container).on('click', this.elems.triggerSelector, function (e) {
            e.preventDefault();
            self.toggle.apply(self, [e]);
        });

        $(this.elems.container).on('keydown', this.elems.triggerSelector, function (e) {
            var openKeyPress = e.charCode === enterKeycode || e.charCode === spaceKeyCode || e.charCode === downArrowKeyCode;
            var closeKeyPress = (e.charCode === escapeKeyCode && $(e.currentTarget).attr('aria-expanded') === "true");

            if (openKeyPress || closeKeyPress) {
                e.preventDefault();
                self.toggle.apply(self, [e]);
            }
        });


    };

    ariaToggle.prototype.toggle = function (e) {
        var $this = $(e.currentTarget);
        var $target = this.elems.target($this);

        this.toggleAction($target).toggleAttr("aria-hidden");
        $this.attr('aria-expanded', $this.attr('aria-expanded') === "false");

        if (this.toggleCallback)
            this.toggleCallback($this);
    };

    return ariaToggle;

})(window, document);

(function ($) {
    $.fn.toggleAttr = function (attribute) {
        if ($(this).attr(attribute) === "false") {
            $(this).attr(attribute, true);
        }
        else {
            $(this).attr(attribute, false);
        }
    };
})(jQuery);