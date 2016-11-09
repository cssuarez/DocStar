var FormTemplate = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    defaults: {
        Id: Constants.t('emptyGuid'),
        Name: Constants.t('blankFormTemplate'),
        PageSize: Constants.ps.Letter,
        Properties: Constants.fp.Portrait | Constants.fp.DisplayGrid,
        SnapToGridSize: 4,
        CSSLayout:
            '#masterForm div, #masterForm span, #masterForm input, #masterForm textarea, #masterForm select { font-size: 11px; font-type: Verdana; font-weight: normal; }' +
            '#masterForm div, #masterForm span, #masterForm input, #masterForm select, #masterForm textarea, #masterForm img { vertical-align: middle; }' +
            '#masterForm .formElementLabel { display: inline-block; white-space: pre; vertical-align: middle; }' +
            '#masterForm div.formElementMarkup { padding: 5px; }' + // make a higher priority then the one provided in FormElementView.css
            '#masterForm input[type="radio"] { margin: 0; }',
        Javascript:
            '/***************************** Form Cleanup **********************************\r' +
             '* The window.formCleanup object is provided to remove event bindings         *\r' +
             '* and timing events created by your javascript.                              *\r' +
             '* Report bindings and timing event functions to window.formCleaup            *\r' +
             '* per the following examples to ensure proper operation of your form.        *\r' +
             '* [Timers]                                                                   *\r' +
             '* var handle = setTimeout(function() { ... }, 100);                          *\r' +
             '* window.formCleanup.timeOuts.push(handle);                                  *\r' +
             '* handle = setInterval(function() { ... });                                  *\r' +
             '* window.formCleanup.intervals.push(handle); // push handles into intervals  *\r' +
             '* [Bindings]                                                                 *\r' +
             '* $form is a provided shortcut for $(\'#masterForm.js\');                      *\r' +
             '* $form.find(\'input[name="InvoiceAmount"]\').on(\'keyup.Form\',                 *\r' +
             '*          function(e) { ... });                                             *\r' +
             '* $form.find(\'input[name="InvoiceDate"]\').on(\'keyup.Form\',                   *\r' +
             '*          function(e) { ... });                                             *\r' +
             '* window.formCleanup.unbindFunction = function() {                           *\r' +
             '*     $.off(\'.Form\');//Removes all bindings with a Form namespace            *\r' +
             '* };                                                                         *\r' +
             '*****************************************************************************/\r' +
             '\r\n' +
             '/***************************** Updating Values *******************************\r' +
             '* To set a value for a field use .changeVal()                                *\r' +
             '*     $form.find(\'input\').changeVal(\'value\');                                *\r' +
             '* To check or uncheck a checkbox or radio field use .changeChecked()         *\r' +
             '*     $form.find(\'input[type="checkbox"]\').changeChecked({true or false});   *\r' +
             '*****************************************************************************/\r'
    },
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msg = {};
        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        if (attrs.SnapToGridSize < 1 || attrs.SnapToGridSize > 100) {
            msg.SnapToGridSize = String.format(Constants.c.notavalidnumber, attrs.SnapToGridSize, Constants.t('snapToGrid'));
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        switch (method) {
            case 'create':
                // Add a create call
                break;
            case 'update':
                // Add an update call
                break;
            case 'delete':
                // Add a delete call
                break;
        }
    },
    getSlimFormTemplate: function () {
        var sft = {
            Category: this.get('Category'),
            Description: this.get('Description'),
            EffectiveContentTypePermissions: this.get('EffectiveContentTypePermissions'),
            EffectivePermissions: this.get('EffectivePermissions'),
            FormTemplateId: this.get('Id'),
            Name: this.get('Name')
        };
        return sft;
    },
    mapCFTypeToControl: function (cfType) {
        var obj = {};
        var revFT = Utility.reverseMapObject(Constants.ft);
        switch (cfType) {
            case Constants.ty.Boolean:
                obj.formTag = revFT[Constants.ft.CheckBox];
                break;
            case Constants.ty.Date:
                obj.formTag = revFT[Constants.ft.Date];
                break;
            case Constants.ty.DateTime:
                obj.formTag = revFT[Constants.ft.DateTime];
                break;
            case Constants.ty.String:
                obj.formTag = revFT[Constants.ft.TextInput];
                break;
            case Constants.ty.Decimal:
                obj.formTag = revFT[Constants.ft.NumberInput];
                break;
            case Constants.ty.Double:
                obj.formTag = revFT[Constants.ft.NumberInput];
                break;
            case Constants.ty.Int16:
                obj.formTag = revFT[Constants.ft.NumberInput];
                break;
            case Constants.ty.Int32:
                obj.formTag = revFT[Constants.ft.NumberInput];
                break;
            case Constants.ty.Int64:
                obj.formTag = revFT[Constants.ft.NumberInput];
                break;
            case Constants.ty.Object:
                obj.formTag = revFT[Constants.ft.Select];
                break;
            default:
        }
        return obj;
    },
    getPageSizeDims: function (includeUnits) {  // See HtmlToPDF PaperSize
        var ps = parseInt(this.get('PageSize') || Constants.ps.Letter, 10);
        var psDims = {    // In inches - convert to pixels after
            Width: Constants.psDefs[ps][0],
            Height: Constants.psDefs[ps][1]
        };
        // Convert inches to pixels
        var res = { Width: psDims.Width * 96, Height: psDims.Height * 96 };
        if (includeUnits) {
            res.Width = res.Width.toString() + 'px';
            res.Height = res.Height.toString() + 'px';
        }
        return res;
    },
    getDisplayGrid: function () {
        return Utility.hasFlag(this.get('Properties'), Constants.fp.DisplayGrid);
    },
    ///<summary>
    /// Returns the snap to grid size value (always greater than 0)
    ///</summary>
    getSnapToGrid: function () {
        var stg = this.get('SnapToGridSize');
        if (!stg || stg < 1) {
            stg = 1;
        }
        return stg;
    },
    ///<summary>
    /// Returns the constant for the orientation (Constants.fp.Portrait or Constants.fp.Landscape)
    ///</summary>
    getOrientation: function () {
        if (Utility.hasFlag(this.get('Properties'), Constants.fp.Landscape)) {
            return Constants.fp.Landscape;
        }
        return Constants.fp.Portrait;
    },
    ///<summary>
    /// Returns whether or not Properties contains CreateAsDraft
    ///</summary>
    getCreateAsDraft: function () {
        return Utility.hasFlag(this.get('Properties'), Constants.fp.CreateAsDraft);
    },
    ///<summary>
    /// Returns whether or not Properties contain the specified form property
    ///</summary>
    hasFormProperty: function (formProperty) {
        return Utility.hasFlag(this.get('Properties'), formProperty);
    },
    ///<summary>
    /// Determine if the layout mode (Flow or Grid) has changed
    ///</summary>
    layoutModeChanged: function () {
        var oldAttrs = this.previousAttributes();
        var oldProps;
        if (oldAttrs) {
            oldProps = oldAttrs.Properties;
        }
        // defaults to flow layout, so if there are no old properties, than that is what the layout mode is
        var oldIsGroupGridLayout = oldProps && Utility.hasFlag(oldProps, Constants.fp.ElementGroupGridLayout);
        var newIsGroupGridLayout = Utility.hasFlag(this.get('Properties'), Constants.fp.ElementGroupGridLayout);
        return oldIsGroupGridLayout !== newIsGroupGridLayout;
    },
    ///<summary>
    /// Obtain css layout, either to display to the user or as is
    ///<param name="forDisplay">bool - displaying to the user, remove any '#masterForm' values from the css that were added by us</param>
    ///</summary>
    getCSSLayout: function (forDisplay) {
        var cssLayout = this.get('CSSLayout');
        if (cssLayout) {
            var cssParser = new cssjs();
            var parsedCSS = cssParser.parseCSS(cssLayout);
            if (forDisplay) {
                var idx = 0;
                var length = parsedCSS.length;

                for (idx; idx < length; idx++) {
                    var selector = parsedCSS[idx].selector;
                    var selectors = selector.split(',');
                    var selectorIdx = 0;
                    var selectorLen = selectors.length;
                    var parsedSelectors = [];
                    for (selectorIdx; selectorIdx < selectorLen; selectorIdx++) {
                        parsedSelectors.push(selectors[selectorIdx].replace('#masterForm ', ''));
                    }
                    parsedCSS[idx].selector = parsedSelectors.join(', ');
                }
                cssLayout = cssParser.getCSSForEditor(parsedCSS);
            }
        }
        return cssLayout || '';
    },
    ///<summary>
    /// Set the css layout in the model
    /// Parse the values entered by the user, adding in #masterForm if nto present
    ///<param name="cssLayout">string - csslayout entered by the user</param>
    ///</summary>
    setCSSLayout: function (cssLayout) {
        if (cssLayout) {
            var cssParser = new cssjs();
            var parsedCSS = cssParser.parseCSS(cssLayout);
            // Find all css  blocks and prepend with a #masterForm (if not already present)
            var idx = 0;
            var length = parsedCSS.length;
            for (idx; idx < length; idx++) {
                // split the selector on comma, adding #masterForm for each selector, and recombine the modified selectors with commas for the parsedCSS selector
                var selector = parsedCSS[idx].selector;
                var selectors = selector.split(',');
                var selectorIdx = 0;
                var selectorLen = selectors.length;
                var parsedSelectors = [];
                for (selectorIdx; selectorIdx < selectorLen; selectorIdx++) {
                    // Allow specifying '#masterForm' as itself in the css layout
                    if (selectors[selectorIdx] === '#masterForm') {
                        parsedSelectors.push(selectors[selectorIdx]);
                    }
                    else if (!selector.match('#masterForm')) {
                        parsedSelectors.push('#masterForm ' + selectors[selectorIdx]);
                    }
                }

                parsedCSS[idx].selector = parsedSelectors.join(', ');
            }
            cssLayout = cssParser.getCSSForEditor(parsedCSS);
        }
        this.set('CSSLayout', cssLayout);
    },
    ///<summary>
    /// Obtain javascript for viewing
    /// Remove the try catch block that was added by us
    ///</summary>
    getJavascript: function () {
        var savedJs = this.get('Javascript');
        if (!savedJs) {
            return '';
        }
        // unwrap js from try catch, for displaying to user
        var regEx = new RegExp('\\/\\/\\$\\$\\$ENDTRY\\$\\$\\$\\r*\\n*([\\s\\S]*)\\/\\/\\$\\$\\$CATCH\\$\\$\\$', 'i');
        var match = savedJs.match(regEx);
        if (match) {
            savedJs = match[1];
        }
        return savedJs;
    },
    ///<summary>
    /// Set the javascript in the model
    /// Wrap it in a try catch block, with our own keys to match on, so we can remove it when displaying it to the user.
    ///<param name="js">javascript entered by the user</param>
    ///<param name="options">object containing backbone options, eg. {validate: true}
    ///</summary>
    setJavascript: function (js, options) {
        options = options || {};
        // Wrap js in a try catch
        var tryCatch =
        '//# sourceURL=_FormTemplateDynamicScript.js \r\n' +
        '//$$$TRY$$$ \r\n' +
        'try {\r\n' +
            // Add javascript here, before any of the users own javascript is added
            'var $form = $(\'#masterForm.js\');' +
        '//$$$ENDTRY$$$\r\n' +
            js +
        '//$$$CATCH$$$\r\n' +
        '} catch (e) {\r\n' +
            '\tvar consoleExists = typeof console;\r\n' +
            '\tif (consoleExists !== "undefined") {\r\n' +
                '\t\tif (console.log && console.log.apply) {\r\n' +
                    '\t\t\tif(!(e instanceof Array)) {\r\n' +
                        '\t\t\t\te = [e]\r\n' +
                    '\t\t\t}\r\n' +
                    '\t\t\tconsole.log.apply(console, e);\r\n' +
                '\t\t}\r\n' +
                '\t\telse {\r\n' +
                    '\t\t\tconsole.log(e);\r\n' +
                '\t\t}\r\n' +
            '\t}\r\n' +
        '} //$$$ENDCATCH$$$';
        this.set('Javascript', tryCatch);
        this.trigger('change:Javascript', this, tryCatch, $.extend(options, { closeEditor: true }));
    },

    //#region Javascript Methods
    ///<summary>
    /// Create a public link for this form template    
    ///</summary>
    /// <param name="dialogFunc">Should always be RecordsManagementUtil.cutoffDialog, exception in unit tests where a UI will not be presented.</param>
    createPublicLink: function (dialogFunc) {
        var that = this;
        var callback = function (args, sf, ff) {
            if (!that.validatePublicLink(args, ff)) {
                return;
            }
            var proxy = SecurityServiceProxy();
            var req = {
                Parameters: JSON.stringify({
                    CompleteForm: args.CompleteForm,
                    UseRecaptcha: args.UseRecaptcha,
                    DisplayMeta: args.DisplayMeta,
                    EmbeddedViewer: !args.UseEclipseLayout,
                    FormTemplateId: that.get('Id')
                }),
                RequestType: Constants.part.CreateForm,
                ExpirationType: args.ExpirationType,
                ExpirationValue: args.ExpirationValue,
                Password: '' //None - yet
            };
            var prSF = function (requestId) {
                var u = document.location;
                var url = u.protocol + "//" + u.host + Constants.Url_Base + "Guest";
                url += "?RequestId=" + requestId;
                url += "&InstanceId=" + $('#companySelect').val();
                if (!args.sendEmail) {
                    Utility.executeCallback(sf, url);
                } else {
                    var adminProxy = AdminServiceProxy();
                    var emailArg = {
                        EmailOptions: args.EmailArgs
                    };

                    emailArg.EmailOptions.Body = '<html><body>' + emailArg.EmailOptions.Body + '<br />' + Constants.c.fillForm + ' <a href="' + url + '">' + Constants.c.here + '</a></body></html>';
                    var emailSF = function () {
                        Utility.executeCallback(sf);
                    };
                    adminProxy.emailMessage(emailArg, emailSF, ff);
                }
            };
            proxy.createProxyRequest(req, prSF, ff);
        };
        dialogFunc({ callback: callback });
    },
    validatePublicLink: function (args, ff) {
        switch (args.ExpirationType) {
            case Constants.ext.CreateCount:
                var count = parseInt(args.ExpirationValue, 10);
                if (isNaN(count) || count <= 0) {
                    ff((args.ExpirationValue || '') + Constants.c.invalidExpirationValue);
                    return false;
                }
                break;
            case Constants.ext.AbsoluteExpiration:
                if (!DateUtil.isDate(args.ExpirationValue)) {
                    ff((args.ExpirationValue || '') + Constants.c.invalidExpirationValue);
                    return false;
                }
                break;
        }
        var id = this.get('Id');
        if (!id || id === Constants.c.emptyGuid) {
            ff(Constants.c.saveFormFirst);
            return false;
        }

        if (args.sendEmail) {
            if (!args.EmailArgs.Addresses) {
                ff(Constants.c.emailAddressCannotBeEmpty);
                return false;
            }
        }
        return true;
    }
});