var DocumentPageCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.JSAnnotationsList) {
            attr = Utility.tryParseJSON(attrs.JSAnnotationsList);
            if (attr === false) {
                attr = undefined;
            }
            if (this.get('AnnotationCollection') instanceof Backbone.Collection) {
                this.get('AnnotationCollection').reset(attr, options);
            }
            else {
                attrs.AnnotationCollection = new Marks();
                attrs.AnnotationCollection.set(attr, options);
                this.bindSubModelEvents(attrs.AnnotationCollection, 'AnnotationCollection');
            }
        }
        if (attrs.JSRedactionsList) {
            attr = Utility.tryParseJSON(attrs.JSRedactionsList);
            if (attr === false) {
                attr = undefined;
            }
            if (this.get('RedactionCollection') instanceof Backbone.Collection) {
                this.get('RedactionCollection').reset(attr, options);
            }
            else {
                attrs.RedactionCollection = new Marks();
                attrs.RedactionCollection.set(attr, options);
                this.bindSubModelEvents(attrs.RedactionCollection, 'RedactionCollection');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function () {
        this.annotationsToXML();
        return this.toJSONComplex();
    },
    getRotation: function () {
        return parseInt((this.get('Rotation') || 0), 10);
    },
    applyRotation: function (rotateValue) {
        rotateValue = parseInt(rotateValue, 10);
        var currentRotation = this.getRotation();
        var newRotation = currentRotation + rotateValue;
        //Ensure a positive number between 0 and 360;
        newRotation = 360 + newRotation;
        newRotation %= 360;

        this.set('Rotation', newRotation);
        return newRotation;
    },
    hasDirtyAnnotations: function () {
        var ac = this.get('AnnotationCollection');
        var rc = this.get('RedactionCollection');
        return (ac && ac.anyDirty()) || (rc && rc.anyDirty());
    },
    annotationsToXML: function () {
        if (this.hasDirtyAnnotations()) {
            var ac = this.get('AnnotationCollection');
            var rc = this.get('RedactionCollection');
            this.getXML(ac ? ac.toJSON() : [], rc ? rc.toJSON() : []);
        }
    },    
    getXML: function (marks, redactions) {
        // Obtain xml for both marks and redactions
        var marksXML = '';
        var redactionsXML = '';
        var success = false;
        $.ajax({
            url: Constants.Url_Base + "Annotations/GetXML",
            data: { jsAnnotations: JSON.stringify(marks), jsRedactions: JSON.stringify(redactions) },
            type: "POST",
            async: false,
            success: function (result) {
                if (result.status === 'ok') {
                    var resMarks = result.result.marks;
                    var resRedactions = result.result.redactions;
                    if (resMarks) {
                        marksXML = resMarks.marksXML;
                    }
                    if (resRedactions) {
                        redactionsXML = resRedactions.redactionsXML;
                    }
                    success = true;
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        if (success) {
            this.set('Annotations', marksXML, { silent: true });
            this.set('Redactions', redactionsXML, { silent: true });
        }
    }
});