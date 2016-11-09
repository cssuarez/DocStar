var CollapsedApprovalStampView = Backbone.View.extend({
    mark: null, // Mark.js
    model: null, // BulkViewerDataPackageCPX
    className: 'CollapsedApprovalStampView no_text_select',
    events: {
        'click': 'uncollapse'
    },
    initialize: function (options) {
        this.options = options;
        this.pzr = this.options.pzr;
        this.mark = this.options.mark;
        this.compiledTemplate = doT.template(Templates.get('collapsedapprovalstamplayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        var title = '';
        // Obtain the approval based on the mark's Approval Id
        var dp = this.model.get('DocumentPackage');
        var approvalId = this.mark.get('ApprovalId');
        var approval = dp.get('Approvals').findWhere({ Id: approvalId });
        if (approval) {
            title += approval.isApproved() ? Constants.t('as_Approved') : approval.isDenied() ? Constants.t('as_Denied') : '';
            title += '\r\n';
            title += approval.get('CreatedOn');
            title += '\r\n';
            title += approval.get('UserName');
        }
        ro.title = title;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.attr('title', viewData.title);
        var $region = $(document.createElement('img'));
        var rect = this.mark.get('Rectangle');
        $region.width(rect.Width).height(rect.Height);
        $region.css('left', rect.Left);
        $region.css('top', rect.Top);
        var imageCoords = this.pzr.getRect($region);
        var screenCoords = this.pzr.imageToScreenRect(imageCoords);
        this.$el.css('top', screenCoords.Top);
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    uncollapse: function () {
        this.mark.set('isCollapsed', false);
    }
    //#endregion Event Handling
});