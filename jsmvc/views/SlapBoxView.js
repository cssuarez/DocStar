// View for displaying a slap box
var SlapBoxView = Backbone.View.extend({
    viewData: {},
    events: {
        "click .addToInclusion": "addToInclusion",
        "click .removeFromInclusion": "removeFromInclusion"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('slapboxlayout'));
        this.options = options || {};
    },
    render: function (getData, primary, inclusion) {
        // primary: list of elements to be chosen from
        // inclusion: list of elements that were chosen from primary
        this.viewData.listPrimary = primary;
        this.viewData.listInclusion = inclusion;
        this.viewData.getData = getData;
        var html_data = this.compiledTemplate(this.viewData);
        var elSelector = this.elSelector;
        if (!elSelector || !this.el) {
            elSelector = this.options.el;
            this.setElement(this.options.el);
        }
        $(this.el).html(html_data);
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
    },
    // TODO: scain make draggable/droppable
    // TODO: scain add add/remove all buttons
    addToInclusion: function () {
        // Add to the inclusion list, remove from the primary list (hide)
        var primary = $(this.el).find('.primaryList');
        var inclusion = $(this.el).find('.inclusionList');
        var selected = primary.find('option:selected');
        if (!selected.length) {
            return;
        }
        var length = selected.length;
        var i = 0;
        var $inclusionOpts = inclusion.find('option');
        for (i; i < length; i++) {
            var $sel = $(selected[i]);
            $inclusionOpts = $inclusionOpts.add($sel.clone());
            $sel.remove();
        }
        var sortedOpts = this.sortOptions($inclusionOpts);
        $inclusionOpts.prop('selected', false);
        inclusion.empty().append(sortedOpts);
    },
    removeFromInclusion: function () {
        // Remove from the inclusion list, add back to the primary list (show)
        var primary = $(this.el).find('.primaryList');
        var inclusion = $(this.el).find('.inclusionList');
        var selected = inclusion.find('option:selected');
        if (!selected.length) {
            return;
        }
        var length = selected.length;
        var i = 0;
        var $primaryOpts = primary.find('option');
        for (i; i < length; i++) {
            var $sel = $(selected[i]);
            $primaryOpts = $primaryOpts.add($sel.clone());
            $sel.remove();
        }
        var sortedOpts = this.sortOptions($primaryOpts);
        $primaryOpts.prop('selected', false);
        primary.empty().append(sortedOpts);
    },
    sortOptions: function (optionsToSort) {
        // sort added elements
        optionsToSort.sort(function (a, b) {
            a = $(a).text();
            b = $(b).text();
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
        });
        return optionsToSort;
    }
});