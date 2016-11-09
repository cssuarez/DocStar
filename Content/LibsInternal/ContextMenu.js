/*
 * ContextMenu functions
 * TODO: Every panzoom call adds to event propagation
 */
var ContextMenu = {
    options_default: {
        width: 150,
        items: [
			{ text: "contextmenu", icon: "", alias: "menu_1-0", type: "group", width: 170, items: [
				{ text: "1-1", icon: "", alias: "menu_1-1", action: function () { } },
				{ text: "1-2", icon: "", alias: "menu_1-2", action: function () { } },
				{ text: "1-3", icon: "", alias: "menu_1-3", action: function () { } },
				{ text: "1-4", icon: "", alias: "menu_1-4", action: function () { } },
				{ text: "1-5", icon: "", alias: "menu_1-5", action: function () { } },
				{ text: "1-6", icon: "", alias: "menu_1-6", action: function () { } },
				{ text: "1-7", icon: "", alias: "menu_1-7", action: function () { } },
				{ text: "1-8", icon: "", alias: "menu_1-8", action: function () { } }
				]
			}
		],
        id: '#img'
    },
    init: function (options) {

        if ($.isEmptyObject(options) === true) {
            options = ContextMenu.options_default;
        }
        return $(options.id).contextmenu(options);
    },
    destroy: function (initObj) {
        var $el = $(initObj.item);
        $el.find('*').off(initObj.options.namespace);
        $el.off(initObj.options.namespace);
        $(document).off(initObj.options.namespace);
        $(initObj.ctxRoot).remove();
    }
};
