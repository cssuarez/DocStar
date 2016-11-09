var ReportParameterLibraryView = Backbone.View.extend({
    className: 'reportParameterLibrary',
    parameters: [],
    parameterViews: [],
    options: {},
    events: {
        'click #submitCtl': 'submitClick'
    },
    initialize: function (options) {
        this.options = options || {};
        this.options.displaySubmit = this.options.displaySubmit || false;
        this.options.displayUseDefault = this.options.displayUseDefault || false;
        this.compiledTemplate = doT.template(Templates.get('reportparameterslibrarylayout'));
        this.parameters = this.options.parameters;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        var i = 0;
        var length = this.parameters.length;
        var $parameterContainer = this.$el.find('.reportParametersContainer');
        for (i = 0; i < length; i++) {
            var parameter = this.parameters[i];
            var pv = new ReportParameterView({
                model: new ReportParameter(parameter),
                displayUseDefault: this.options.displayUseDefault
            });
            this.parameterViews.push(pv);
            $parameterContainer.append(pv.render().$el);
        }
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        ro.displaySubmit = this.options.displaySubmit;
        return ro;
    },
    close: function () {
        var i = 0;
        var pvs = this.parameterViews || [];
        var length = pvs.length;
        for (i = 0; i < length; i++) {
            var pv = pvs[i];
            if (pv[i] && pv.close) {
                pv.close();
            }
        }
        this.unbind();
        this.remove();
    },
    submitClick: function (ev) {
        var $targ = $(ev.currentTarget);
        if ($targ.hasClass('disabled')) {
            return;
        }
        $targ.addClass('disabled');
        this.$el.find('select, input').prop('readonly', true);
        this.$el.find('#submitCtlThrobber').show();
        var $reportForm = $('form').has(this.$el);
        $reportForm.submit();
    }
});