var WorkflowItemPerStepSubgridView = CustomGridView.extend({
    model: undefined, // WorkflowItemByWorkflow
    tagName: 'tr',
    className: 'WorkflowItemPerStepSubgridView',
    resultViews: [],
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperstepsubgridviewlayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            headers: []
        };
        // Create columns from model
        var wfCurrSteps = this.model.get('WorkflowCurrSteps');
        var idx = 0;
        var length = wfCurrSteps.length;
        // Dynamc number of columnns
        ro.headers[0] = { value: Constants.t('assignee') };
        for (idx; idx < length; idx++) {
            var wfCurrStep = wfCurrSteps[idx].split(',');
            var wfCurrStepIdx = 2;
            var wfCurStepLen = wfCurrStep.length;
            for (wfCurrStepIdx; wfCurrStepIdx < wfCurStepLen; wfCurrStepIdx++) {
                if (!ro.headers[wfCurrStepIdx - 1]) {   // Add to headers if it doesn't exist already, skip 0th item (assignee id, not needed)
                    ro.headers[wfCurrStepIdx - 1] = { value: Constants.t('stepItems') };
                }
            }

        }
        // Loop back over headers to set widths
        idx = 0;
        length = ro.headers.length;
        var width = 100 / length;
        for (idx; idx < length; idx++) {
            ro.headers[idx].style = 'width: ' + width + '%;';
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.renderItemViews();
        return this;
    },
    renderItemViews: function () {
        var results = this.model.get('WorkflowCurrSteps');
        if (!results) {
            return;
        }
        var $container = this.$el.find('.customGridTable tbody');
        var idx = 0;
        var length = results.length;
        for (idx; idx < length; idx++) {
            var wfItemPerStepSubgridItemView = new WorkflowItemPerStepSubgridItemView({
                wfCurrentStepItems: results[idx] ? results[idx].split(',') : []
            });
            $container.append(wfItemPerStepSubgridItemView.render().$el);
            this.resultViews.push(wfItemPerStepSubgridItemView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', 2);
        tr.appendChild(td);
        $container.append(tr);
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});