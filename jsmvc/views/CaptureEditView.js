/// <reference path="../../Content/LibsInternal/ClientService.js" />
/// <reference path="../../Content/LibsInternal/Utility.js" />
//IDEA: Replace iframe handling here with server side generic iframe. it would simplify some of this code by using the iframe communication class.
var CaptureEditView = Backbone.View.extend({
    className: 'CaptureEditView',
    collection: undefined, //SimpleDocuments
    progressCollection: undefined, //SimpleDocuments
    svcAdmin: new AdminServiceProxy(),
    captureGridView: undefined,
    progressGridView: undefined,
    capturePreviewer: undefined,
    $captureGridCont: undefined,
    $processingGridCont: undefined,
    capturedIds: undefined,
    bound: false,   // Track whether events have been bound
    htmlBrowseIframeId: '#uploadiframe_1',    // html browse iframe identifier (increment for each html browse performed, eg. uploadiframe_1, uploadiframe_2, etc.)
    webFileBrowseBackStack: [],   // Maintain a stack of parent directories for user navigation
    numSubmittedIframeRows: 0,  // How many iframes that submitted file uploads
    iframeErrorMsg: '', // The compound error message from all iframes that were submitted
    iframeUploadHasErrors: false,
    // A copy of a backbone scan setting before it was made 'single use'
    // reset the corresponding window.scanSetting to the singleUseScanSettingCopy on a change of scan setting
    // clear it on the save of a scan setting
    singleUseScanSettingCopy: undefined,
    events: {
        'change input[name="browseType"]': 'setBrowseType',
        'click .expand_arrow': "collapseDv",
        'click .collapse_arrow': "expandDv",
        'click #editSetting': "setupScanOptionsDialog",
        'click #newSetting': "setupScanOptionsDialog",
        'click #deleteSetting': "deleteScanSettings",
        'click #capture_layout .openBrowse': 'openBrowseDialog',
        'click #capture_layout .submitImport': 'submitImport',
        'click #capture_layout .cancelImport': 'cancelImport',
        'click #capture_layout .preProcessingOptions': 'setupPreProcessingOptionsDialog',
        'click span.browseSelection': 'toggleBrowseOptions',
        'blur .buttonOptions input': 'closeBrowseOptions',
        'click span.buttonOptionsClose': 'closeBrowseOptions',
        'click #scanDirect': 'scanDirect',
        'click #scanPreview': 'scanPreview',
        'click #cancelScan': 'cancelScan',
        'click #captureListActions .columnChooser': "activateColumnChooser",
        'click #captureListActions .removeFromImport': "removeFromImport",
        'click #captureListActions .merge': "merge",
        'click #captureListActions .unmerge': "unmerge",
        'click #systrayConnStatus.systrayConnectionPrompt #systrayConnStatusText': ClientService.systrayConnectionPrompt,
        'change #importAcc .preProcessing': "toggleOptionButton",
        'change #captureImportTabs input[name="IsDraft"]': 'setCreateAsPreference',
        'change #promptToContinue': 'togglePromptToContinue',
        'change .autoViewImport': 'setAutoViewImportPreference',
        'click #importAcc .gearIconSmall': 'enterContentTypeBuilderImport',
        'click #scanAcc .gearIconSmall': 'enterContentTypeBuilderScan'
    },
    initialize: function (options) {
        options = options || {};
        var that = this;
        this.collection = new SimpleDocuments();
        this.progressCollection = new SimpleDocuments();
        ClientService.importDocs = this.collection;
        ClientService.progressDocs = this.progressCollection;
        this.captureGridView = new CaptureGridView({ collection: this.collection });
        this.capturePreviewer = new CaptureViewerView({ collection: this.collection });
        this.progressGridView = new CaptureProgressGridView({ collection: this.progressCollection });
        this.compiledTemplate = doT.template(Templates.get('capturelayout'));
        $('body').bind('captureLayoutRenderedInit', function () {
            if (that.$el.is(':visible')) {
                ClientService.setSettingsHTML();
                that.setSplitMethod();
                ClientService.updateSystrayConnectionStatus(ClientService.currentStatus);
                that.setupPreviewPanel();
                $('body').trigger('captureLayoutRendered');
                $('body').unbind('captureLayoutRendered');
                ClientService.toggleScanButtons();
            }
            else {
                setTimeout(function () {
                    $('body').trigger('captureLayoutRenderedInit');
                }, 10);
            }
        });
        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'previewResizeWidth' || key === 'previewerCollapsed') {
                this.setupPreviewPanel();
            }
        });
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            if (options && options.windowResize) {
                that.setupPreviewPanel();
            }
        });
        this.listenTo(window.userPreferences, 'reset', this.setupPreviewPanel);
        var opts = Utility.GetUserPreference('preProcessingOptions');
        if (opts) {
            opts = JSON.parse(opts);
        }
        // If the option doesn't exist set it to its default
        opts = {
            Rotation: (opts && !isNaN(opts.Rotation)) ? opts.Rotation : 0,
            Duplex: !!(opts && opts.Duplex),
            Deskew: !!(opts && opts.Deskew),
            Despeckle: !!(opts && opts.Despeckle),
            RemoveBlankPages: !!(opts && opts.RemoveBlankPages),
            BlankPageThreshold: (opts && !isNaN(opts.BlankPageThreshold)) ? opts.BlankPageThreshold : 5,
            BlankPageMargin: (opts && opts.BlankPageMargin) || '10, 10, 10, 10',
            SplitMethod: (opts && !isNaN(opts.SplitMethod)) ? opts.SplitMethod : Constants.capm.Multipage,
            RemoveBarcodeCoversheet: (opts && opts.RemoveBarcodeCoversheet !== undefined) ? opts.RemoveBarcodeCoversheet : true,
            BarcodeText: (opts && opts.BarcodeText) || null
        };
        this.listenTo(this.progressCollection, 'add remove reset', this.setGridHeights);
        this.listenTo(this.collection, 'change:isSelected destroy', function (model, value, options) {
            var $submitBtn = this.$el.find('.submitImport');
            var models = this.collection.getSelected();
            if (models.length === 0) {
                $submitBtn.addClass('disabled');
            }
            else {
                $submitBtn.removeClass('disabled');
            }
        });
        this.listenTo(window.contentTypes, 'add reset', function () {
            this.updateContentTypes();
        });
        this.listenTo(window.contentTypes, 'remove', function (model, collection, options) {
            this.collection.replaceContentType(model, collection, options);
            this.updateContentTypes();
        });
        ClientService.preProcessingOptions = opts;
        return this;
    },
    render: function () {
        if (this.rendered) {
            this.setupPreviewPanel();
            return;
        }
        var that = this;
        this.rendered = true;
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.$el.css('visibility', 'hidden');
        this.$captureGridCont = this.$el.find('.captureGridCont'); //cached selector for progress performance. 
        this.$processingGridCont = this.$el.find('.processingGridCont'); //cached selector for progress performance. 
        this.$el.find('.document_preview_viewer').html(this.capturePreviewer.render().$el);
        this.$captureGridCont.prepend(this.captureGridView.render().$el);
        this.$processingGridCont.html(this.progressGridView.render().$el);
        $('#captureImportTabs').tabs();
        this.delegateEvents(this.events);
        this.applyEventHandlers();
        this.setGridHeights();
        $('body').trigger('captureLayoutRenderedInit');
        return this;
    },
    getRenderObject: function () {
        var isPreProcessing = ClientService.isSystrayConnected();//Should this become a user preference?
        var ro = {
            scanAccClosed: Utility.GetUserPreference('scanAcc') || 'open',
            importAccClosed: Utility.GetUserPreference('importAcc') || 'open',
            isPromptToContinue: Utility.convertToBool(Utility.GetUserPreference('promptToContinue')),
            preProcess: isPreProcessing ? 'checked' : '',
            progressBarLayout: doT.template(Templates.get('progressbarlayout'))({}),
            browseType: parseInt(Utility.GetUserPreference('browseType') || 5, 10),
            osFileBrowseType: false,
            webFileBrowseType: false,
            htmlFileSelectType: false,
            createAsPref: Utility.GetUserPreference('createAs'),
            autoViewImport: Utility.convertToBool(Utility.GetUserPreference('autoViewImport')),
            noContentTypesAvailable: window.contentTypes.length === 0,
            isReadOnlyUser: Utility.isReadOnlyUser(),
            scanDevicesHTML: '',
            scanContentTypesHTML: '',
            importContentTypesHTML: '',
            pageSizes: [],
            hasContentTypePermissions: Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Basic) || Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced)
        };
        if (ro.browseType === Constants.im.OSFileBrowse) {
            ro.osFileBrowseType = true;
        }
        else if (ro.browseType === Constants.im.WebFileBrowse) {
            ro.webFileBrowseType = true;
        }
        else {
            ro.htmlFileSelectType = true;
        }

        var menuTemplate = doT.template(Templates.get('dropdownlayout'));
        var ddList = new SlimEntities();
        var devices = {
            ddList: ddList,
            ddLabelClass: 'deviceText',
            selectedItemName: '',
            selectedId: '',
            firstItemInList: {
                include: true
            }
        };
        ro.scanDevicesHTML = menuTemplate(devices);
        var length = window.contentTypes.length;
        var i = 0;
        var spct = [];
        for (i; i < length; i++) {
            var cct = window.contentTypes.at(i);
            if (Utility.checkSP(cct.get("EffectivePermissions"), Constants.sp.Add_To)) {
                spct.push(cct);
            }
        }
        var contentTypes = new ContentTypes();
        contentTypes.reset(contentTypes.parse(spct));
        // Scan Content Type Dropdown
        var ctId = Utility.GetUserPreference('selectedScanContentType') || 'None Selected';
        var ct = window.contentTypes.get(ctId);
        var cts = {
            ddList: contentTypes,
            ddLabelClass: 'scanContentTypeDDText',
            selectedItemName: ct && ct.get ? ct.get('Name') : '',
            selectedId: ctId,
            firstItemInList: {
                include: true
            }
        };
        ro.scanContentTypesHTML = menuTemplate(cts);
        // Import Content Type dropdown
        cts.ddLabelClass = 'importContentTypeDDText';
        cts.selectedId = Utility.GetUserPreference('selectedImportContentType') || 'None Selected';
        ct = window.contentTypes.get(cts.selectedId);
        cts.selectedItemName = ct && ct.get ? ct.get('Name') : '';
        ro.importContentTypesHTML = menuTemplate(cts);

        var revPs = Utility.reverseMapObject(Constants.ps);
        var pageSizes = Utility.formatObjectIntoOrderedArray(Constants.ps);
        length = pageSizes.length;
        for (i = 0; i < length; i++) {
            if (pageSizes[i] !== revPs[Constants.ps.Letter]) {
                ro.pageSizes.unshift({ value: Constants.ps[pageSizes[i]], text: pageSizes[i] });
            } else if (pageSizes[i] !== revPs[Constants.ps.None]) {
                ro.pageSizes.push({ value: Constants.ps[pageSizes[i]], text: pageSizes[i] });
            }
        }
        return ro;
    },
    activateColumnChooser: function (ev) {
        this.captureGridView.chooseColumns();
    },
    close: function () {
        if (this.captureGridView) {
            this.captureGridView.close();
            this.captureGridView = undefined;
        }
        if (this.progressGridView) {
            this.progressGridView.close();
            this.progressGridView = undefined;
        }
        if (this.capturePreviewer) {
            this.capturePreviewer.close();
            this.capturePreviewer = undefined;
        }
        ClientService.importDocs = null;
        ClientService.progressDocs = null;
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    setGridHeights: function () {
        if (this.progressCollection.length === 0) {
            if (this.$processingGridCont.is(':visible')) {
                this.$processingGridCont.hide();
                this.$captureGridCont.height('100%');
                this.progressGridView.resizeGrid();
            }
        } else {
            if (!this.$processingGridCont.is(':visible')) {
                var parHeight = this.$captureGridCont.height();
                this.$captureGridCont.find('.CaptureGridView').height(0).height(parHeight / 2);
                this.$processingGridCont.find('.CaptureProgressGridView').height(0).height(parHeight / 2);
                this.$captureGridCont.height('50%');
                this.$processingGridCont.show();
                this.progressGridView.resizeGrid();
            }
        }
    },

    //#region Scan

    setSplitMethod: function () {
        var selectedSettingId = $('#scanSettings .settings .settingText').attr('value');
        var setting;
        if (selectedSettingId && window.scanSettings) {
            setting = window.scanSettings.get(selectedSettingId);
        }
        var separatorText = String.format(Constants.c.separator, Constants.c.blankPage);
        var smSel = this.$el.find('.scanTypeSeparator');
        var revCapm = Utility.reverseMapObject(Constants.capm);
        var sm = Constants.capm.Multipage;  // No scan setting selected set the split type to multipage (one document)
        if (setting) {
            sm = parseInt(setting.get('SplitMethod'), 10);
            var barcodeText = setting.get('BarcodeText');
            if (sm === Constants.capm.SinglePage || sm === Constants.capm.Multipage) {
                // set split method to single pages
                this.$el.find('input[name="ScanTypeSelection"][value="' + sm + '"]').prop('checked', true);
            }
            else if (sm) {
                var text = Constants.c['set_' + revCapm[sm]];
                if (text) {
                    if (sm === Constants.capm.SpecificBarcodeSeparator) {
                        text = text + ': ' + barcodeText;
                    }
                    separatorText = String.format(Constants.c.separator, text);
                }
                smSel.prop('checked', true).attr('value', sm);
            }
        }
        else {
            this.$el.find('input[name="ScanTypeSelection"][value="' + sm + '"]').prop('checked', true);
        }
        smSel.siblings().text(separatorText);
    },
    setScanContentType: function (ev) {
        var targ = $(ev.currentTarget);
        var id = targ.attr('name') || 'None Selected';
        Utility.SetSingleUserPreference('selectedScanContentType', id);
        ShowHideUtil.setDropdownTextGeneric(ev);
    },
    setSelectedScanDevice: function (ev) {
        var targ = $(ev.currentTarget);
        var id = targ.attr('name') || 'None Selected';
        this.resetSingleUseScanSetting();
        var cb = function () {
            ClientService.setSettingsHTML();
        };
        var prevDeviceId = ClientService.getDeviceId();
        Utility.SetSingleUserPreference('selectedScanDevice', id, cb);
        ShowHideUtil.setDropdownTextGeneric(ev);
        if (!prevDeviceId && id) {
            ClientService.toggleScanButtons();  // Only toggle if there was no previous device and there is a device being selected now
        }
    },
    setSelectedScanSetting: function (ev) {
        var targ = $(ev.currentTarget);
        var id = targ.attr('name');
        this.resetSingleUseScanSetting();
        ClientService.loadScannerSettings(id || Constants.c.emptyGuid);
        Utility.SetSingleUserPreference('selectedScanSetting', id || 'None Selected');
        ShowHideUtil.setDropdownTextGeneric(ev);
        if (id) {
            $('#deleteSetting').removeClass('disabled');
        } else {
            $('#deleteSetting').addClass('disabled');
        }
    },
    resetSingleUseScanSetting: function () {
        this.$el.find('#scanSettings .settingText').removeClass('italic');
        if (this.singleUseScanSettingCopy) {
            var settingId = this.singleUseScanSettingCopy.get('Id');
            if (settingId === Constants.c.emptyGuid) {  // Remove 'New' scan setting from window.scanSettings collection
                window.scanSettings.remove(settingId);
            }
            else {
                var resetScanSetting = window.scanSettings.get(settingId);
                resetScanSetting.set(new ScanSetting(this.singleUseScanSettingCopy));
            }
            this.singleUseScanSettingCopy = undefined;
        }
    },
    scanDirect: function (ev) {
        recentlySelectedIds = [];
        if ($(ev.currentTarget).hasClass('disabled')) {
            return;
        }
        var selectedScanCT = this.$el.find('#scanContentType .scanContentTypeDDText').attr('value');
        if (!selectedScanCT) {
            ErrorHandler.addErrors(Constants.t('scanDirectSelectContentType'));
            return;
        }
        ClientService.scan(this.$el, true);
    },
    scanPreview: function (ev) {
        this.recentlySelectedIds = [];
        if ($(ev.currentTarget).hasClass('disabled')) {
            return;
        }
        ClientService.scan(this.$el);
    },
    cancelScan: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        targ.addClass('disabled');
        // Cancel scan operation
        var method = Constants.im.Cancel;
        var args = [];
        var iMP = ClientService.setupInvokeMethod(method, args);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    // Scan Options
    setupScanOptionsDialog: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var diag = $('#scanOptionsDialog');
        var that = this;
        var options = {
            title: Constants.c.scanSettings,
            width: 900,
            height: 925,
            resizable: false,
            open: function () {
                // Apply validation to scan settings inputs
                diag.find('input[name="Resolution"]').numeric({ decimal: false, negative: false });
                diag.find('input[name="BlankPageThreshold"]').numeric({ decimal: false, negative: false });
                diag.data('eventsBound', true);
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                // Detect if user has 1D or 2D Barcode, if so hide barcode licensing in the scan options dialog
                if (ClientService.hasBarcodeLicense()) {
                    diag.find('.scanOptionsBarcodeLicense').hide();
                    diag.find('.barcodeSeparatorOptions').show();
                }
                else {
                    diag.find('.scanOptionsBarcodeLicense').show();
                    diag.find('.barcodeSeparatorOptions').hide();
                }
                // No selected device, have 'Advanced Settings' be disabled
                if (!ClientService.getDeviceId()) {
                    $('#advancedScanSettings').addClass('disabled');
                }
                else {
                    $('#advancedScanSettings').removeClass('disabled');
                }
                // Fill out selected setting being edited...
                var selectedSetting = $('#scanSettings .settingText').attr('value');
                var dto = {};
                if (selectedSetting) {
                    dto = window.scanSettings.get(selectedSetting);
                }
                if (targ.attr('id') === 'newSetting') {
                    selectedSetting = '';
                }
                if (selectedSetting && dto && dto.attributes) {
                    var attrs = dto.attributes;
                    if (attrs.ScannerName) {
                        $('#hasAdvancedSettings').show();
                        $('#scanOptionsDialog > div.fright').addClass('hasAdvanced');
                        $('#scanOptionsDialog').find('.advancedSetting').addClass('ignore');
                        $('#scanOptionsDialog').find('.advancedSetting').prop('disabled', true);
                    }
                    else {
                        $('#hasAdvancedSettings').hide();
                        $('#scanOptionsDialog > div.fright.hasAdvanced').removeClass('hasAdvanced');
                        $('#scanOptionsDialog').find('.advancedSetting').removeClass('ignore');
                        $('#scanOptionsDialog').find('.advancedSetting').prop('disabled', false);
                    }
                    DTO.setDTO(diag, attrs);
                }
                else {
                    that.setDefaultSettings();
                    DTO.setDTO(diag, { Name: Constants.c.newTitle, Id: Constants.c.emptyGuid });
                }
                that.triggerChangeSplitMethod(diag, that.changeSplitMethod);
            },
            buttons: [{
                text: Constants.c.save,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var scanSettings = DTO.getDTO(diag);
                    if (!scanSettings.Id) {
                        scanSettings.Id = Constants.c.emptyGuid;
                    }
                    if (scanSettings.Name === Constants.c.newTitle) {
                        that.saveScanSettingsAs(scanSettings);
                    }
                    else {
                        that.saveScanSettings(scanSettings);
                    }
                }
            }, {
                text: Constants.c.saveAs,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var scanSettings = DTO.getDTO(diag);
                    that.saveScanSettingsAs(scanSettings);
                }
            }, {
                text: Constants.c.ok,
                click: function () {
                    // persist 'one-time' setting until the user leaves the page or saves the setting (update the backbone collection, but never commit to the server)
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var scanSettings = DTO.getDTO(diag);
                    // Validate the name
                    //if (!that.isNameValidHandling(scanSettings.Name, 'Name', Constants.UtilityConstants.MAX_SCAN_SETTING_NAME_LENGTH)) {
                    //    return;
                    //}
                    // Validate Duplicate names, for one-time settings
                    var i;
                    var length = window.scanSettings.length;
                    for (i = 0; i < length; i++) {
                        var setting = window.scanSettings.at(i);
                        if (setting && setting.get('Name') === scanSettings.Name && setting.get('Id') !== scanSettings.Id) {
                            ErrorHandler.addErrors({ 'Name': Constants.c.duplicateNameError });
                            return;
                        }
                    }
                    var singleUseScanSetting = window.scanSettings.get(scanSettings.Id);
                    if (!singleUseScanSetting) {
                        window.scanSettings.add(scanSettings);
                        singleUseScanSetting = window.scanSettings.get(scanSettings.Id);
                        that.singleUseScanSettingCopy = new ScanSetting(singleUseScanSetting.attributes);
                    }
                    else {
                        that.singleUseScanSettingCopy = new ScanSetting(singleUseScanSetting.attributes);
                        singleUseScanSetting.set(scanSettings);
                    }

                    that.$el.find('#scanSettings .settingText').attr('value', scanSettings.Id).text(scanSettings.Name);
                    // Make the text for the scan setting italicized to emphasize that it has not been saved yet
                    that.$el.find('#scanSettings .settingText').addClass('italic');
                    that.setSplitMethod();    // Update split method text
                    $(diag).dialog('close');
                }
            }, {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(diag).dialog('close');
                }
            }]
        };
        DialogsUtil.generalDialog(diag, options);
    },
    requestBarcode: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var diag = $('#scanOptionsDialog');
        var dto = DTO.getDTO($('.scanOptionsBarcodeLicense'));
        var args = [
            dto.barcodeRequest
        ];
        targ.addClass('disabled');
        diag.find('.scanOptionsBarcodeLicense input').prop('disabled', true);
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var scb = function (result) {
            if (result) {
                diag.find('.scanOptionsBarcodeLicense span[name="requestBarcodeMessage"]').text(Constants.c.requestBarcodeSuccess).fadeOut(2000, function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    targ.removeClass('disabled');
                    diag.find('.scanOptionsBarcodeLicense input').prop('disabled', false);
                    diag.find('.scanOptionsBarcodeLicense').hide();
                    diag.find('.barcodeSeparatorOptions').show();
                });
            }
        };
        var ecb = function (err) {
            targ.removeClass('disabled');
            $('.scanOptionsBarcodeLicense input').prop('disabled', false);
            ErrorHandler.addErrors({ requestBarcodeMessage: err }, '', '', '', 'span');
        };
        var iMP = ClientService.setupInvokeMethod(Constants.im.RequestLicense, args, scb, ecb);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    setDefaultSettings: function () {
        var diag = $('#scanOptionsDialog');
        var defSettings = {
            ScannerName: '',
            Color: Constants.cs.BlackAndWhite,
            Resolution: 200,
            AutoSizeDetection: false,
            PageSize: Constants.ps.Letter,
            RemoveBlankPages: false,
            Deskew: false,
            Despeckle: false,
            Duplex: false,
            BlankPageThreshold: 5,
            BlankPageMargin: '10, 10, 10, 10',
            SplitMethod: Constants.capm.Multipage,
            Rotation: 0,
            OnePagePerFile: false,
            SplitDetectSides: Constants.dps.Either
        };
        DTO.setDTO(diag, defSettings);
        $('#hasAdvancedSettings').hide();
        $('#scanOptionsDialog > div.fright.hasAdvanced').removeClass('hasAdvanced');
        $('#scanOptionsDialog').find('.advancedSetting').removeClass('ignore');
        $('#scanOptionsDialog').find('.advancedSetting').prop('disabled', false);
    },
    clearScanSettings: function (ev, that) {
        that.setDefaultSettings();
        ClientService.loadScannerSettings(Constants.c.emptyGuid);
    },
    advancedScanSettings: function (ev) {
        //open advanced settings for the selected device
        if ($(ev.currentTarget).hasClass('disabled')) {
            return;
        }
        ClientService.showScannerSettings();
    },
    saveScanSettings: function (settings, callback) {
        var that = this;
        Utility.disableButtons([Constants.c.save, Constants.c.saveAs, Constants.c.ok, Constants.c.cancel]);
        if (!this.isNameValidHandling(settings.Name, 'Name', Constants.UtilityConstants.MAX_SCAN_SETTING_NAME_LENGTH)) {
            Utility.enableButtons([Constants.c.save, Constants.c.saveAs, Constants.c.ok, Constants.c.cancel]);
            return;
        }
        var success = function (result) {
            if (that.singleUseScanSettingCopy && that.singleUseScanSettingCopy.get) {
                window.scanSettings.remove(that.singleUseScanSettingCopy.get('Id'));    // Remove a single use scan setting from the window.scanSettings collection
            }
            // Clear the scan setting copy on a save (since it is no longer a one-time use setting)
            that.singleUseScanSettingCopy = undefined;
            var setting = window.scanSettings.get(result.Id);
            if (setting) {
                setting.set(result);
            }
            else {
                window.scanSettings.add(result);
            }
            Utility.SetSingleUserPreference('selectedScanSetting', result.Id, function () {
                ClientService.setSettingsHTML();
                that.setSplitMethod();    // Update split method text
            });
            Utility.enableButtons([Constants.c.save, Constants.c.saveAs, Constants.c.ok, Constants.c.cancel]);
            that.$el.find('#scanSettings .settingText').removeClass('italic');
            $('#scanOptionsDialog').dialog('close');
            Utility.executeCallback(callback);
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.enableButtons([Constants.c.save, Constants.c.saveAs, Constants.c.ok, Constants.c.cancel]);
            var errObj = {};
            if (errorThrown && (errorThrown.Message === Constants.c.duplicateNameError || errorThrown.Message === String.format(Constants.c.newNameWarning, Constants.t('newTitle')))) {
                errObj.Name = errorThrown.Message;
                if ($('input[name="new_name"]').is(':visible')) {
                    errObj.new_name = errorThrown.Message;
                }
            }
            else {
                errObj = errorThrown.Message;
            }
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        // Perform signalR advanced settings save
        if (settings.ScannerName) {
            ClientService.saveScannerSettings(settings, success);
        }
        else {  // Otherwise perform ajax generic settings save
            if (settings.Id === Constants.c.emptyGuid) {
                this.svcAdmin.createScanSettings(settings, success, failure);
            }
            else {
                this.svcAdmin.updateScanSettings(settings, success, failure);
            }
        }
    },
    saveScanSettingsAs: function (scanSettings) {
        var that = this;
        var saveAsDialog = '#saveAsDialog';
        DialogsUtil.generalDialog(saveAsDialog,
        {
            modal: true,
            width: 300,
            title: Constants.c.saveAs,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    // If the name has changed save it as a new scan setting; otherwise overwrite the selected setting
                    if (!that.isNameValidHandling($(saveAsDialog + ' input[name="new_name"]').val(), 'new_name', Constants.UtilityConstants.MAX_SCAN_SETTING_NAME_LENGTH)) {
                        Utility.enableButtons([Constants.c.save, Constants.c.saveAs, Constants.c.ok, Constants.c.cancel]);
                        return;
                    }
                    if (scanSettings.Name !== $(saveAsDialog + ' input[name="new_name"]').val()) {
                        scanSettings.Name = $(saveAsDialog + ' input[name="new_name"]').val();
                        scanSettings.Id = Constants.c.emptyGuid;
                    }
                    that.saveScanSettings(scanSettings, function () {
                        $(saveAsDialog).dialog('close');
                    });
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(saveAsDialog).dialog('close');
                }
            }],
            open: function () {
                $(saveAsDialog + ' input[name="new_name"]').val(scanSettings.Name);
            }
        });
    },
    deleteScanSettings: function (ev) {
        var targ = $(ev.currentTarget);
        var scanSettingId = $('#scanSettings .settingText').attr('value');
        if (!scanSettingId || scanSettingId === Constants.c.emptyGuid || targ.hasClass('disabled')) {
            return;
        }
        var success = function (result) {
            if (result) {
                window.scanSettings.remove(scanSettingId);
                ClientService.setSettingsHTML();
            }
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        this.svcAdmin.deleteScanSettings([scanSettingId], success, failure);
    },
    //#endregion Scan

    //#region Import

    setImportContentType: function (ev) {
        var targ = $(ev.currentTarget);
        var id = targ.attr('name') || 'None Selected';
        Utility.SetSingleUserPreference('selectedImportContentType', id);
        ShowHideUtil.setDropdownTextGeneric(ev);
    },
    // Pre-Processing Options

    setupPreProcessingOptionsDialog: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var that = this;
        var diag = $('#preProcDialog');
        var ppo = {};
        var changeSplitMethod = this.changeSplitMethod;
        var triggerChangeSplitMethod = this.triggerChangeSplitMethod;
        var options = {
            title: Constants.c.preProcessingOptions,
            width: 735,
            height: 620,
            resizable: false,
            open: function () {
                // Detect if user has 1D or 2D Barcode
                if (ClientService.hasBarcodeLicense()) {
                    diag.find('.barcodeSeparatorOptions').show();
                }
                else {
                    diag.find('.barcodeSeparatorOptions').hide();
                }
                ppo = ClientService.preProcessingOptions;
                DTO.setDTO(diag, ppo);
                triggerChangeSplitMethod(diag, changeSplitMethod);
            },
            buttons: [{
                text: Constants.c.save,
                click: function () {
                    ppo = DTO.getDTO($(diag));
                    var contentTypeId = $('#importContentType .importContentTypeDDText').attr('value');
                    var opts = {
                        ContentTypeId: contentTypeId,
                        Rotation: ppo.Rotation,
                        Deskew: ppo.Deskew,
                        Despeckle: ppo.Despeckle,
                        RemoveBlankPages: ppo.RemoveBlankPages,
                        BlankPageMargin: ppo.BlankPageMargin,
                        BlankPageThreshold: ppo.BlankPageThreshold,
                        RemoveBarcodeCoversheet: ppo.RemoveBarcodeCoversheet
                    };
                    if (parseInt(ppo.SplitMethod, 10) >= 0) {
                        opts.SplitMethod = ppo.SplitMethod;
                        opts.BarcodeText = ppo.BarcodeText;
                    }

                    Utility.SetSingleUserPreference('preProcessingOptions', JSON.stringify(opts), function () {
                        ClientService.preProcessingOptions = opts;
                        that.progressGridView.render();
                        $(diag).dialog('close');
                    });
                }
            }, {
                text: Constants.c.close,
                click: function () {
                    $(diag).dialog('close');
                }
            }]
        };
        DialogsUtil.generalDialog(diag, options);
    },

    // File Browse
    openBrowseDialog: function (ev) {
        var that = this;
        that.capturedIds = undefined;
        var cs = ClientService.connectionStatus;
        if (ClientService.currentStatus === cs.Connecting) {
            return false;
        }
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        // Determine type of browse
        var browseMethod = $('#captureImportTabs_Import input[name="browseType"]:checked').val();
        browseMethod = parseInt(browseMethod, 10);
        var im = Constants.im;
        // Perform html file select if the systray isn't connected
        if (!ClientService.isSystrayConnected()) {
            this.htmlFileSelect();
        }
        else if (browseMethod === im.WebFileBrowse) {
            this.toggleBrowseButtons(false);
            this.setupWebFileBrowse();
        }
        else if (browseMethod === Constants.im.OSFileBrowse) {
            this.toggleBrowseButtons(false);
            var toggleBrowseButtons = this.toggleBrowseButtons;
            var sf = function () {
                toggleBrowseButtons(true);
            };
            var ff = function (data) {
                toggleBrowseButtons(true);
                ErrorHandler.addErrors(data.Exception.Message);
            };
            ClientService.browse(browseMethod, sf, ff);
        }
        else {
            this.htmlFileSelect();
        }
    },
    toggleBrowseButtons: function (enable) {
        var $browseButtonsSel = $('#captureImportTabs_Import .buttons .custom_button');
        if (enable) {
            $browseButtonsSel.removeClass('disabled');
        }
        else {
            $browseButtonsSel.addClass('disabled');
        }
    },
    toggleBrowseOptions: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var btnOptsSel = $('#captureImportTabs_Import .buttonOptions');
        var systrayBrowseOptsSel = 'input[value="' + Constants.im.OSFileBrowse + '"], input[value="' + Constants.im.WebFileBrowse + '"]';
        var htmlBrowseSel = 'input[value="' + -1 + '"]';
        var browseTypeUserPref = parseInt(Utility.GetUserPreference('browseType') || 5, 10);
        var isSystrayConnected = ClientService.isSystrayConnected();
        if (!isSystrayConnected) {
            btnOptsSel.find(systrayBrowseOptsSel).parent().hide();
            btnOptsSel.find(htmlBrowseSel).prop('checked', true);
        }
        else {
            btnOptsSel.find(systrayBrowseOptsSel).parent().show();
            if (browseTypeUserPref) {
                btnOptsSel.find('input[value="' + browseTypeUserPref + '"]').prop('checked', true);
            }
            else {
                btnOptsSel.find(htmlBrowseSel).prop('checked', true);
            }
        }
        btnOptsSel.css('display', 'table');
        btnOptsSel.find(':checked').focus();
    },
    closeBrowseOptions: function (ev) {
        $('#captureImportTabs_Import .buttonOptions').fadeOut();
    },
    setBrowseType: function (ev) {
        var browseType = $(ev.currentTarget).val();
        Utility.SetSingleUserPreference('browseType', browseType);
        this.closeBrowseOptions(ev);
        ClientService.enablePreProcess(browseType);
    },
    createImportIframe: function (iframeId, bindOnload) {
        var that = this;
        var newIframe = $('#uploadiframe_0').clone();
        $(newIframe).attr('id', iframeId.replace('#', ''));
        // Bind onload event to ensure the iframe is fully loaded when the form submission occurs
        if (bindOnload) {
            $(newIframe).get(0).onload = function () {
                that.htmlFileSelect();
                this.onload = null;  // reset onload event so it isn't called when next load event occurs (eg. submission of form)
            };
        }
        $('#uploadiframe_0').parent().append(newIframe);
    },
    htmlFileSelect: function () {
        var that = this;
        var iframeId = this.htmlBrowseIframeId;
        var htmlBrowseSel = 'input[type="file"]';
        // Ensure that the iframe is there before attempting to bind to it
        if (!$('#captureImportTabs_Import ' + iframeId).get(0) ||
            !$('#captureImportTabs_Import ' + iframeId).get(0).contentWindow ||
            !$('#captureImportTabs_Import ' + iframeId).get(0).contentWindow.document) {
            $('#captureImportTabs_Import ' + iframeId).remove();
            var iframeSuffix = parseInt(iframeId.split('_')[1], 10);
            that.htmlBrowseIframeId = iframeId = '#uploadiframe_' + iframeSuffix;
            that.createImportIframe(iframeId, true);
            return;
        }
        $($('#captureImportTabs_Import ' + iframeId).get(0).contentWindow.document).off('change', htmlBrowseSel).on('change', htmlBrowseSel, function (ev) {
            var fileSize = Constants.c.notAvailable;
            that.toggleBrowseButtons(false);
            var hasError = false;
            var errMsg = [Constants.c.fileNotUploadedErrors];
            var data = {};
            var title = $(ev.currentTarget).val();
            var titleLen = title.split('\\').length;
            data.Id = Utility.getSequentialGuids(1)[0];
            data.Title = title.split('\\')[titleLen - 1];
            data.iframeId = iframeId;
            data.SortTicks = DateUtil.dotNetTicks();
            //  update iframe suffix, so a new iframe is created for next upload
            var iframeSuffix = parseInt(iframeId.split('_')[1], 10) + 1;
            that.htmlBrowseIframeId = iframeId = '#uploadiframe_' + iframeSuffix;
            that.createImportIframe(iframeId);
            if (Acquire.browserSupportsFileAPI()) {
                // Able to access file data from event target
                var files = ev.target.files;
                var i = 0;
                var length = files.length;
                for (i = 0; i < length; i++) {
                    var file = files[i];
                    fileSize = file.size;
                    fileSize = fileSize / (1024 * 1024);    // Convert bytes to MB
                    if (file.size >= Page.maxRequestLength) { // Check against maxRequestLength to prevent an upload attempt of a file that is larger than allowed
                        hasError = true;
                        errMsg.push(String.format(Constants.c.fileNotUploadedMaxLength, data.Title, Page.maxRequestLength / (1024 * 1024)) + '\n' + Constants.c.mobileOrOSFileBrowse);
                    }
                    fileSize = fileSize.toFixed(2);
                }
            }
            if (hasError) {
                ErrorHandler.addErrors(errMsg.join('\n\n'));
                $(data.iframeId).remove();   // On an error remove the iframe from the DOM
                that.toggleBrowseButtons(true);
                return;
            }
            var ctId = $('#importContentType .importContentTypeDDText').attr('value');
            var ct = window.contentTypes.get(ctId);
            if (ct) {
                data.ContentTypeId = ctId;
                data.InboxId = ct.get('DefaultInboxId');
                data.FolderId = ct.get('DefaultFolderId');
                data.FolderPath = ct.get('DefaultFolderName');
                data.WorkflowId = ct.get('DefaultWorkflowId');
                data.SecurityClassId = ct.get('DefaultSecurityClassId');
            }
            data.IsDraft = $('#captureImportTabs').find('input.draft').is(':checked');
            data.FileSize = fileSize;
            $('#capture_layout .submitImport').removeClass('disabled');
            that.toggleBrowseButtons(true);
            var model = that.collection.add(data);
            that.collection.setSelected([data.Id]);
        });
        $(iframeId).load(function (ev) {
            var i = 0;
            var length = that.collection.length;
            var currIframeId = '#' + $(this).attr('id');
            var model;
            var removeFromCollection = false;
            for (i = length - 1; i >= 0; i--) {
                var m = that.collection.at(i);
                var modelIframeId = m.get('iframeId');
                if (currIframeId === modelIframeId) {
                    model = m;
                    break;
                }
            }
            var message = '';
            var errMessage = '';
            if ($(this).get(0).contentWindow) {
                errMessage = $.trim($($(this).get(0).contentWindow.document).find('h2').text());
                var validationMessage = $.trim($($(this).get(0).contentWindow.document).find('.error li').text());
                errMessage = errMessage || validationMessage;
            }
            that.numSubmittedIframeRows--;
            if (!errMessage) {  // Success
                // Remove the item from the grid because it has succeeded in being uploaded
                removeFromCollection = true;
            }
            else {  // Failure
                that.iframeUploadHasErrors = true;
                if (errMessage.match('Maximum request length exceeded', 'ig')) {
                    message = String.format(Constants.c.fileNotUploadedMaxLength, model.get("Title"), Page.maxRequestLength / (1024 * 1024));
                    message += '\n' + Constants.c.mobileOrOSFileBrowse;
                    removeFromCollection = true;
                }
                else {
                    message = String.format(Constants.c.fileNotUploadedErrorMsg, model.get("Title"));
                    message += '\n' + errMessage;
                    removeFromCollection = true;
                }
                that.iframeErrorMsg += message + '\n\n';
            }
            if (that.iframeUploadHasErrors && that.numSubmittedIframeRows <= 0) {
                ErrorHandler.addErrors(Constants.c.fileNotUploadedErrors + '\n\n' + that.iframeErrorMsg);
                that.iframeErrorMsg = '';
            }
            if (removeFromCollection) {
                if (model) {
                    model.destroy();
                }
                $(this).remove();   // Remove the iframe from the DOM
            }
            if (that.numSubmittedIframeRows <= 0) {
                that.iframeUploadHasErrors = false;
                that.numSubmittedIframeRows = 0;
            }
        });
        $($(iframeId).get(0).contentWindow.document).find('#fid').trigger('click');
    },

    // Web File Browse
    setupWebFileBrowse: function () {
        var diagSel = $('#webFileBrowseDialog');
        var that = this;
        var webFileBrowseView;
        diagSel.dialog({
            minHeight: 400,
            minWidth: 500,
            width: 'auto',
            height: 'auto',
            modal: true,
            buttons: [{
                text: Constants.c.open,
                click: function () {
                    Utility.disableButtons([Constants.c.open, Constants.c.cancel]);
                    diagSel.find('.throbber').show();
                    // send file acquired...
                    var args = [
                        JSON.stringify(webFileBrowseView.collection.getSelectedFilesForImport(that.webFileBrowseBackStack[that.webFileBrowseBackStack.length - 1])),
                        ClientService.getPreProcessingOptions()
                    ];
                    ClientService.webFileSelect(args);
                    diagSel.fadeOut(function () {
                        diagSel.dialog('close');
                    });
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    diagSel.dialog('close');
                }
            }],
            open: function (event) {
                webFileBrowseView = new CaptureWebFileBrowseGridView();
                diagSel.find('.directoryContents').append(webFileBrowseView.render().$el);
                var acquireData = ClientService.getAcquireDataHTML();
                var webBrowseAccessSettings = acquireData.WebBrowseAccessSettings;
                var resizeWidth = diagSel.data('resizeWidth') || 700;
                var resizeHeight = diagSel.data('resizeHeight') || 500;
                if (resizeWidth) {
                    diagSel.width(resizeWidth);
                }
                if (resizeHeight) {
                    diagSel.height(resizeHeight);
                }
                Utility.enableButtons([Constants.c.open, Constants.c.cancel]);
                // Establish 'tree' like structure to display 'root folders'
                var rootFolders = webBrowseAccessSettings.SpecificDirectories;
                var rootLen = rootFolders.length;
                that.formatWebFileRootDirectoryBrowse(rootFolders, rootLen);
                that.setWebFileBrowseBackButtonText('');
                that.webFileBrowseBackStack = [];
                if ($('#directoriesResize').resizable('instance')) {
                    $('#directoriesResize').resizable('destroy');
                }
                $('#directoriesResize').resizable({
                    width: 150,
                    maxWidth: 250,
                    minWidth: 150,
                    handles: 'e',
                    resize: function (event, ui) {
                        that.resizeDirectoryContents();
                    }
                });
                $('#webFileBrowseBack').off('click').on('click', function (ev) {
                    // always pop off the current path form the stack, since we want the parent path not the current path
                    that.webFileBrowseBackStack.pop();
                    var parentPath = that.webFileBrowseBackStack[that.webFileBrowseBackStack.length - 1];
                    that.setWebFileBrowseBackButtonText(parentPath);
                    if (!parentPath) {
                        that.webFileBrowseBackStack = [];
                        that.formatWebFileRootDirectoryBrowse(rootFolders, rootLen);
                    }
                    else {
                        var args = [
                            parentPath
                        ];
                        that.webFileBrowse(args, webFileBrowseView);
                    }
                });
                $('#webFileBrowseDialog').off('click', '.directory').on('click', '.directory', function (ev) {
                    var targ = $(ev.currentTarget);
                    $('#webFileBrowseDialog .directory').removeClass('selected');
                    targ.addClass('selected');
                    var parentPath = targ.data('directoryPath');
                    that.setWebFileBrowseBackButtonText(parentPath);
                    that.webFileBrowseBackStack.push(parentPath);
                    var args = [
                        parentPath
                    ];
                    that.webFileBrowse(args, webFileBrowseView);
                });
                that.resizeDirectoryContents();
            },
            close: function () {
                // Clear grid, clear directories, close dialog
                webFileBrowseView.close();
                webFileBrowseView = undefined;
                that.toggleBrowseButtons(true);
                Utility.enableButtons([Constants.c.open, Constants.c.cancel]);
                diagSel.find('.throbber').hide();
            },
            resize: function () {
                that.resizeDirectoryContents();
                diagSel.data('resizeHeight', diagSel.height());
                diagSel.data('resizeWidth', diagSel.width());
            }
        });
    },
    webFileBrowse: function (args, webFileBrowseView) {
        var that = this;
        var success = function (results) {
            // Add results to directory contents grid
            var dirs = results.Directories;
            var files = results.Files;
            var length;
            if (dirs) {
                length = dirs.length;
                that.formatWebFileDirectoryBrowse(dirs, length);
            }
            if (files) {
                webFileBrowseView.collection.reset(files);
            }
        };
        ClientService.webFileBrowse(args, success);
    },
    formatWebFileRootDirectoryBrowse: function (data, length) {
        var dirsSel = $('#directories');
        dirsSel.empty();
        var i = 0;
        for (i; i < length; i++) {
            var datum = data[i];
            dirsSel.append(
                $('<li></li>').addClass('directory').append(
                    $('<span></span>').addClass('inlineblock fleft').text(datum)
                ).data('directoryPath', datum)
            );
        }
    },
    formatWebFileDirectoryBrowse: function (data, length) {
        var dirsSel = $('#directories');
        dirsSel.empty();
        var i = 0;
        for (i = 0; i < length; i++) {
            var datum = data[i];
            dirsSel.append(
                $('<li></li>').addClass('directory').append(
                    $('<span></span>').addClass('inlineblock fleft').text(datum.Name)
                ).data('directoryPath', datum.FullPath)
            );
        }
    },
    setWebFileBrowseBackButtonText: function (prevDirectoryPath) {
        if (!prevDirectoryPath) {
            prevDirectoryPath = Constants.c.rootDirectories;
        }
        $('#webFileBrowseBackText').text(prevDirectoryPath).attr('title', prevDirectoryPath);
    },
    resizeDirectoryContents: function () {
        var dirContentsWidth = $('#webFileBrowseDialog').width() - $('#directoriesContainer').outerWidth(true) - 2;
        var dirContentsHeight = $('#webFileBrowseDialog').height() - 2;
        $('#webFileBrowseDialog .directoryContents').width(dirContentsWidth);
        $('#directoriesResize').height('100%');
    },

    // Import / Cancel
    submitImport: function (ev, models) {
        // Set User preference for content type selection, only if it changed
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var method = Constants.im.Import;
        if (!models) {
            models = this.collection.getSelected();
        }
        ClientService.importDocuments = models;
        var numRows = models.length;
        // Nothing selected, don't perform submit
        if (numRows === 0) {
            return;
        }
        targ.addClass('disabled');
        var opts = Utility.GetUserPreference('preProcessingOptions');
        if (opts) {
            opts = JSON.parse(opts);
            var ctId = opts.ContentTypeId;
            var currCtId = $('#importContentType .importContentTypeDDText').attr('value');
            if (ctId !== currCtId) {
                opts.ContentTypeId = currCtId;
                Utility.SetSingleUserPreference('preProcessingOptions', JSON.stringify(opts));
            }
        }

        var simpleDocuments = [];
        var i = 0;
        // Determine number of iframes being submitted (to be used for any error messages to be displayed, when the iframe fails with some kind of error)
        this.numSubmittedIframeRows = this.collection.getSelectedIframeDocsCount();
        var iframeOnload = function () {
            targ.removeClass('disabled');
            this.onload = null;
        };
        var noCTsDefined = [];
        for (i = 0; i < numRows; i++) {
            var model = models[i];

            if (model) {
                if (!model.get('ContentTypeId')) {
                    noCTsDefined.push(model);
                }
                else {
                    var iframeId = model.get('iframeId');
                    if (iframeId) {
                        if (simpleDocuments.length === 0 && i === numRows - 1) {
                            $(iframeId).get(0).onload = iframeOnload;
                        }
                        this.importHTMLIframe(model);
                    }
                    else {
                        simpleDocuments.push(model);
                    }
                }
            }
        }
        if (noCTsDefined.length > 0) {
            var titles = [];
            var idx = 0;
            var length = noCTsDefined.length;
            for (idx; idx < length; idx++) {
                var modelNoCT = noCTsDefined[idx];
                modelNoCT.trigger('invalid', modelNoCT);
                if (idx < 5) {
                    titles.push(modelNoCT.get('Title')); // show items 0 through 4
                } else if (idx === 5) {
                    titles.push('...'); // show ... for the item 5 (the sixth)
                } // dont show the rest
            }
            targ.removeClass('disabled');
            ErrorHandler.addErrors(Constants.t('noContentTypeSelectedImport') + '\n\n' + titles.join(', '));
            return;
        }
        if (simpleDocuments.length === 0) {
            return;
        }
        var l = simpleDocuments.length;
        var j;
        for (j = 0; j < l; j++) {
            simpleDocuments[j] = simpleDocuments[j].toJSON();
        }
        var args = [
            JSON.stringify(simpleDocuments)
        ];
        var success = function () {
            // Disable all buttons
            $('#capture_layout .custom_button').addClass('disabled');

            // Enable Cancel, Browse and scan buttons
            $('#capture_layout .cancelImport').removeClass('disabled');
            $('#capture_layout .openBrowse').removeClass('disabled');
            $('#capture_layout .browseSelection').removeClass('disabled');
            ClientService.toggleScanButtons();
        };
        var failure = function (data) {
            $('#capture_layout .progressCont').hide();
            ClientService.resetCaptureButtonStates();
            if (data && data.Exception && data.Exception.Message) {
                ErrorHandler.addErrors(data.Exception.Message);
            }
        };
        var iMP = ClientService.setupInvokeMethod(method, args, success, failure);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },

    importHTMLIframe: function (model) {
        // Set iframe defaults (eg. InboxId, WorkflowId, etc)
        var iframeId = model.get('iframeId');
        var iframeDoc = $($(iframeId)[0].contentWindow.document);
        $(iframeDoc).find('select[name="ContentType"] option[id="' + model.get('ContentTypeId') + '"]').prop('selected', true);
        if (!model.get('InboxId')) {
            $(iframeDoc).find('select[name="Inbox"] option:first').prop('selected', true);    // Select first inbox in iframe, represents 'no inbox'
        }
        else {
            $(iframeDoc).find('select[name="Inbox"] option[id="' + model.get('InboxId') + '"]').prop('selected', true);
        }
        if (!model.get('WorkflowId')) {
            $(iframeDoc).find('select[name="Workflow"] option:first').prop('selected', true);    // Select first workflow in iframe, represents 'no workflow'
        }
        else {
            $(iframeDoc).find('select[name="Workflow"] option[id="' + model.get('WorkflowId') + '"]').prop('selected', true);
        }
        if (!model.get('SecurityClassId')) {
            $(iframeDoc).find('select[name="SecurityClass"] option:first').prop('selected', true);    // Select first security class in iframe, represents 'no workflow'
        }
        else {
            $(iframeDoc).find('select[name="SecurityClass"] option[id="' + model.get('SecurityClassId') + '"]').prop('selected', true);
        }
        $(iframeDoc).find('input[name="Title"]').val(model.get('Title'));
        $(iframeDoc).find('input[name="Keywords"]').val(model.get('Keywords'));
        $(iframeDoc).find('input[name="Folders"]').val(model.get('FolderId'));
        $(iframeDoc).find('input[name="IsDraft"]').val(model.get('IsDraft'));
        $(iframeDoc).find('input[name="IframeId"]').val(iframeId);
        $(iframeDoc).find('#ubtn').click();
    },
    cancelImport: function (ev) {
        var targ = $(ev.currentTarget);
        if (targ.hasClass('disabled')) {
            return;
        }
        var args = [];
        var success = function () {
            ClientService.resetCaptureButtonStates();
        };
        var failure = function (data) {
            ErrorHandler.addErrors(data.Exception.Message);
            ClientService.resetCaptureButtonStates();
        };
        var iMP = ClientService.setupInvokeMethod(Constants.im.Cancel, args, success, failure);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    // Remove from import grid
    removeFromImport: function (ev) {
        var that = this;
        var msg = Constants.c.deleteConfirm;
        var selectedImportDocs = this.collection.getSelected();
        var length = selectedImportDocs.length;
        var i = 0;
        if (length <= 0) {
            return;
        }
        var okFunc = function (cleanupFunc) {

            var success = function () {
                that.collection.deleteSelected();
                if (that.collection.length === 0) {
                    $('#capture_layout .submitImport').addClass('disabled');
                }
                Utility.executeCallback(cleanupFunc);
            };
            var failure = function (data) {
                ErrorHandler.addErrors(data.Exception.Message);
                Utility.executeCallback(cleanupFunc);
            };
            // Determine which selected docs are from 'Browser File Select', by seeing if they have a value for iframeid
            // If a selected doc is determined to be from 'Browser File Select' remove it from the selectedImportDocs collection and remove it from the grid.
            var ids = [];
            for (i = length -1 ; i >= 0 ; i--) {
                if (selectedImportDocs[i].get('iframeId')) {
                    selectedImportDocs[i].destroy();
                    selectedImportDocs.splice(i, 1);
                } else {
                    ids.push(selectedImportDocs[i].get('Id'));
                }
            }
            // After the above if there are no selected Import Docs left execute the cleanup method
            if (selectedImportDocs.length === 0) {
                Utility.executeCallback(cleanupFunc);
                return;
            }
            var isSystrayConnected = ClientService.isSystrayConnected();
            if (!isSystrayConnected) {
                success();
                return;
            }
            var args = [
                JSON.stringify(ids)
            ];
            var iMP = ClientService.setupInvokeMethod(Constants.im.RemoveFromImport, args, success, failure);
            window.CompanyInstanceHubProxy.invokeMethod(iMP);
        };
        DialogsUtil.generalPromptDialog(msg, okFunc);
    },
    merge: function (ev) {
        if ($(ev.currentTarget).parent().hasClass('disabled')) {
            return;
        }
        var selectedImportDocs = this.collection.getSelected();
        var length = selectedImportDocs.length;
        if (length < 2) {
            ErrorHandler.addErrors(Constants.c.mergeCount);
            return;
        }

        var mergeOperation = function (cleanup) {
            // Obtain selected document ids again, they may have changed due to having had HTML File Select documents selected (which can't be merged, so they were unselected)            
            ClientService.previewMode = Utility.GetUserPreference('capturePreviewMode') === 'fullSizePreview';
            var mergedDocId = selectedImportDocs[0].get('Id');
            var mergedDoc = selectedImportDocs[0];
            var pageNum = 1; // after the merge, reset view to page 1
            length = selectedImportDocs.length;
            var sidJson = [];
            var i = 0;
            for (i; i < length; i++) {
                sidJson[i] = selectedImportDocs[i].toJSON();
            }
            var args = [
                JSON.stringify(sidJson),
                JSON.stringify({
                    SimpleDocumentId: mergedDocId,
                    PageNumber: pageNum,
                    FullSizePreview: ClientService.previewMode
                })
            ];
            var success = function (result) {
                i = 0;
                // remove each item except for the document merged into (the first item in selectedImportDocIds) 
                for (i = length - 1; i > 0; i--) {
                    if (i !== 0) { // remove each item beginning with the second
                        selectedImportDocs[i].destroy();
                    }
                }
                mergedDoc.set(result.SimpleDocument);
                mergedDoc.PageRotations = result.SimpleDocument.PageRotations;
                ClientService.previewSimpleDocId = mergedDocId;
                Utility.executeCallback(cleanup);
            };
            var failure = function (data) {
                ErrorHandler.addErrors(data.Exception.Message);
                Utility.executeCallback(cleanup);
            };
            var iMP = ClientService.setupInvokeMethod(Constants.im.Merge, args, success, failure);
            window.CompanyInstanceHubProxy.invokeMethod(iMP);
        };
        var err = this.collection.validateForMerge();
        if (err.message) {
            if (err.fatal) {
                DialogsUtil.generalCloseDialog('', { title: Constants.c.resultActionsMerge, msg: err.message });
            } else {
                DialogsUtil.generalPromptDialog(err.message, mergeOperation, null, { title: Constants.c.resultActionsMerge });
            }
        } else {
            mergeOperation();
        }
    },
    unmerge: function (ev) {
        var that = this;
        if ($(ev.currentTarget).parent().hasClass('disabled')) {
            return;
        }
        var selectedImportDocs = this.collection.getSelected();
        var length = selectedImportDocs.length;
        if (length !== 1) {
            ErrorHandler.addErrors(Constants.c.onlySelectOneDoc);
            return;
        }
        var unmergeOperation = function (cleanup) {
            var pageNum = 1;    // Unmerged files will preview the first page, of the 'unmerged' file
            var origDoc = selectedImportDocs[0];
            var args = [JSON.stringify(origDoc.toJSON())];
            var success = function (result) {
                length = result.length;
                var i;
                var filesAcquired = [];

                // Reset original document. (Preview might currently be displaying a page from another document)
                origDoc.set(result[0]);
                origDoc.PageRotations = result[0].PageRotations;
                origDoc.set('currentPage', pageNum);
                ClientService.previewSimpleDocId = origDoc.get('Id');
                if (that.capturePreviewer) {
                    that.capturePreviewer.render(); // Force re-render
                }
                for (i = 1; i < length; i++) {
                    // Apply the changes that were explicitly made to the original document being unmerged to each of the documents returned from the unmerge process
                    result[i].ContentTypeId = origDoc.get('ContentTypeId');
                    result[i].InboxId = origDoc.get('InboxId');
                    result[i].FolderId = origDoc.get('FolderId');
                    result[i].FolderPath = origDoc.get('FolderPath');
                    result[i].WorkflowId = origDoc.get('WorkflowId');
                    result[i].SecurityClassId = origDoc.get('SecurityClassId');
                    var m = that.collection.get(result[i].Id);
                    if (m) {
                        m.set(result[i]);
                    } else {  // Data isn't in grid already, add data to grid
                        that.collection.add(result[i]);
                    }
                    filesAcquired.push(result[i]);
                }
                var idx = 0;
                var callback;
                callback = function () {
                    ++idx;
                    if (filesAcquired[idx]) {
                        ClientService.onSendFileAcquired(filesAcquired[idx], callback);
                    }
                    else {
                        Utility.executeCallback(cleanup);
                    }
                };
                ClientService.onSendFileAcquired(filesAcquired[0], callback);

            };
            var failure = function (data) {
                ErrorHandler.addErrors(data.Exception.Message);
                Utility.executeCallback(cleanup);
            };
            var iMP = ClientService.setupInvokeMethod(Constants.im.Unmerge, args, success, failure);
            window.CompanyInstanceHubProxy.invokeMethod(iMP);
        };
        var valRes = this.collection.validateForUnMerge();
        if (valRes.message) {
            if (err.fatal) {
                DialogsUtil.generalCloseDialog('', { title: Constants.c.resultActionsUnmerge, msg: err.message });
            } else {
                DialogsUtil.generalPromptDialog(err.message, unmergeOperation, null, { title: Constants.c.resultActionsUnmerge });
            }
        } else {
            unmergeOperation();
        }
    },

    //#endregion
    //#region Event Handling
    triggerChangeSplitMethod: function (selector, changeSplitMethod) {
        var ev = new $.Event();
        ev.delegateTarget = $(selector).get(0);
        ev.currentTarget = $(selector).find('input[name="SplitMethod"]:checked');
        changeSplitMethod(ev);
    },
    changeSplitMethod: function (ev) {
        var delegateTarget = $(ev.delegateTarget);
        var currTarg = $(ev.currentTarget);
        // On the selection of a barcode split method show the RemoveBarcodeCoversheet checkbox
        var splitMethod = parseInt(currTarg.val(), 10);
        var removeBarcodeCoversheetSel = delegateTarget.find('input[name="RemoveBarcodeCoversheet"]').parent();
        var splitDetectSides = delegateTarget.find('select[name="SplitDetectSides"]').parent();
        if (splitMethod === Constants.capm.SpecificBarcodeSeparator ||
            splitMethod === Constants.capm.AnyBarcodeSeparator ||
            splitMethod === Constants.capm.AnyBarcodeSeparatorAssignContentType ||
            splitMethod === Constants.capm.BarcodeChange) {
            removeBarcodeCoversheetSel.show();
        }
        else {
            // otherwise hide the RemoveBarcodeCoversheet checkbox
            removeBarcodeCoversheetSel.hide();
        }
        var duplexSetting = $('#scanOptionsDialog input[name="Duplex"]').prop('checked');
        if (duplexSetting && (splitMethod === Constants.capm.SpecificBarcodeSeparator ||
                    splitMethod === Constants.capm.AnyBarcodeSeparator ||
                    splitMethod === Constants.capm.AnyBarcodeSeparatorAssignContentType ||
                    splitMethod === Constants.capm.BarcodeChange || splitMethod === Constants.capm.BlankPageSeparator)) {
            splitDetectSides.show();

        } else {
            splitDetectSides.hide();
        }
    },
    applyEventHandlers: function () {
        var selector = this.$el;
        var that = this;
        // So event doesn't get bound more than once
        if (!this.bound) {
            selector.on('click', '#scanContentType .dropdown',
            {
                dropdownSelector: '#scanContentType .dropdown',
                childHoverSelector: '.dropdown li span.parent',
                childShowHideSelector: '.dropdown ul.children'
            }, function (ev) {
                ShowHideUtil.showHideDropdownMenu(ev);
                ClientService.toggleScanButtons();
            });
            selector.on('click', '#scanContentType .dropdown li span.anchor',
            {
                dropdownSelector: '#capture_layout .dropdown',
                containerSelector: '#capture_layout',
                dropdownFieldTextSelector: '.dropdown .scanContentTypeDDText',
                that: this
            }, that.setScanContentType);
            selector.on('click', '#importContentType .dropdown',
            {
                dropdownSelector: '#importContentType .dropdown',
                childHoverSelector: '.dropdown li span.parent',
                childShowHideSelector: '.dropdown ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
            selector.on('click', '#importContentType .dropdown li span.anchor',
            {
                dropdownSelector: '#capture_layout .dropdown',
                containerSelector: '#capture_layout',
                dropdownFieldTextSelector: '.dropdown .importContentTypeDDText',
                that: this
            }, that.setImportContentType);
            selector.on('click', '#scanDevices .dropdown',
            {
                dropdownSelector: '#scanDevices .dropdown',
                childHoverSelector: '.dropdown li span.parent',
                childShowHideSelector: '.dropdown ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
            selector.on('click', '#scanDevices .dropdown li span.anchor',
            {
                dropdownSelector: '#capture_layout .dropdown',
                containerSelector: '#capture_layout',
                dropdownFieldTextSelector: '.dropdown .deviceText',
                that: this
            }, function (ev) {
                that.setSelectedScanDevice(ev);
            });
            selector.on('click', '#scanSettings .dropdown',
            {
                dropdownSelector: '#scanSettings .dropdown',
                childHoverSelector: '.dropdown li span.parent',
                childShowHideSelector: '.dropdown ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
            selector.on('click', '#scanSettings .dropdown li span.anchor',
            {
                dropdownSelector: '#capture_layout .dropdown',
                containerSelector: '#capture_layout',
                dropdownFieldTextSelector: '.dropdown .settingText',
                that: this
            }, function (ev) {
                that.setSelectedScanSetting(ev);
                that.setSplitMethod();
            });
            selector.on('click', '#captureListActions .dropdown',
            {
                dropdownSelector: '#captureListActions .dropdown',
                parentSelector: '#captureListActions',
                childHoverSelector: '.dropdown li span.parent',
                childShowHideSelector: '.dropdown ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
            $('body').on('onSendFileAcquired', function (ev, data, callback) {
                if (data) {
                    // Determine if scanning, if so use scanning content type
                    var ctId = $('#importContentType .importContentTypeDDText').attr('value');
                    if (ClientService.isScanning) {
                        ctId = $('#scanContentType .scanContentTypeDDText').attr('value');
                    }
                    // Fill out using selected content type (with both default folder and default inbox ids)
                    var ct = window.contentTypes.get(ctId);
                    if (ct) {
                        data.ContentTypeId = (data.ContentTypeId && data.ContentTypeId !== Constants.c.emptyGuid) ? data.ContentTypeId : ctId;
                        data.InboxId = data.InboxId || ct.get('DefaultInboxId');
                        data.FolderId = data.FolderId || ct.get('DefaultFolderId');
                        data.FolderPath = data.FolderPath || ct.get('DefaultFolderName');
                        data.WorkflowId = data.WorkflowId || ct.get('DefaultWorkflowId');
                        data.SecurityClassId = data.SecurityClassId || ct.get('DefaultSecurityClassId');
                    }
                    data.IsDraft = $('#captureImportTabs').find('input.draft').is(':checked');
                    $('#capture_layout .submitImport').removeClass('disabled');

                    var addedModel = that.collection.add(data);
                    if (ClientService.scanDirect) {
                        ClientService.scanDirectSimpleDoc.push(addedModel);
                    }

                    if (!that.capturedIds) {
                        that.capturedIds = [];
                        that.collection.clearSelected();
                    }
                    addedModel.setSelected(true);
                    that.capturedIds.push(data.Id);
                    Utility.executeCallback(callback);
                }
            });
            $('body').on('scanDirectImport', function (ev, rowIds) {
                ev.currentTarget = $('#capture_layout .submitImport')[0];
                that.submitImport(ev, rowIds);
            });
            $('body').on('click', '#requestBarcode', that.requestBarcode);
            $('body').on('click', '#clearScanSettings', function (ev) { that.clearScanSettings(ev, that); });
            $('body').on('click', '#advancedScanSettings', that.advancedScanSettings);
            $('#scanOptionsDialog input[name="Resolution"]').on('keyup', function (ev) {
                var targ = $(ev.currentTarget);
                targ.val(InputUtil.textRangeCheck(0, 32000, targ.val()));
            });
            $('#scanOptionsDialog input[name="BlankPageThreshold"]').on('keyup', function (ev) {
                var targ = $(ev.currentTarget);
                targ.val(InputUtil.textRangeCheck(0, 1024, targ.val()));
            });
            $('#scanOptionsDialog input[name="BlankPageMargin"]').on('keyup', function (ev) {
                if (ev.which === 8 || ev.which === 9 || ev.which === 46) {
                    return true;
                }
                var targ = $(ev.currentTarget);
                var selection = targ[0].selectionStart;
                var values = targ.val().split(',');
                values = values.length > 4 ? values.splice(0, 4) : values;
                var i = 0;
                var length = values.length;
                for (i; i < length; i++) {
                    var val = values[i].match(/\d+/ig);
                    if (val && val instanceof Array) {
                        val = val.join('');
                    }
                    values[i] = $.trim(InputUtil.textRangeCheck(0, 1024, val));
                }
                targ.val(values.join(', '));
                targ[0].selectionStart = selection;
                targ[0].selectionEnd = selection;
            }).on('blur', function (ev) {
                var targ = $(ev.currentTarget);
                var values = targ.val().split(',');
                values = values.splice(0, 4);
                // Blank Page margin can  have 1, 2, or 4 comma separated values, don't allow for 3
                var length = values.length === 3 ? 4 : values.length;
                var i = 0;
                for (i; i < length; i++) {
                    var val = $.trim(values[i]);
                    if (val) {
                        values[i] = $.trim(InputUtil.textRangeCheck(0, 1024, val));
                    }
                    else {
                        values[i] = 10;
                    }
                }
                targ.val(values.join(', '));
            });
            $('#scanOptionsDialog, #preProcDialog').on('change', 'input[name="SplitMethod"]', that.changeSplitMethod);
            $('#scanOptionsDialog, input[name="Duplex"]').off('click').on('click', 'input[name="Duplex"]', that.DuplexSettingChange);
            this.bound = true;
        }
    },
    DuplexSettingChange: function (ev) {
        var delegateTarget = $(ev.delegateTarget);
        var splitMethod = parseInt($('#scanOptionsDialog, #preProcDialog').find('input[name="SplitMethod"]:checked').val(), 10);
        var duplexSetting = $('#scanOptionsDialog input[name="Duplex"]').prop('checked');
        var splitDetectSides = delegateTarget.find('select[name="SplitDetectSides"]').parent();
        if (duplexSetting && (splitMethod === Constants.capm.SpecificBarcodeSeparator ||
                   splitMethod === Constants.capm.AnyBarcodeSeparator ||
                   splitMethod === Constants.capm.AnyBarcodeSeparatorAssignContentType ||
                   splitMethod === Constants.capm.BarcodeChange || splitMethod === Constants.capm.BlankPageSeparator)) {
            splitDetectSides.show();

        } else {
            splitDetectSides.hide();
        }
    },
    collapseDv: function (e) {
        ShowHidePanel.collapseDocumentView(this.$el);
    },
    expandDv: function (e) {
        var that = this;
        ShowHidePanel.expandDocumentView(this.$el, function () {
            if (that.capturePreviewer) {
                that.capturePreviewer.togglePreviewControls(true);
            }
        });

    },
    toggleOptionButton: function (e) {
        if (e.target.checked) {
            $('#importAcc .preProcessingOptions').removeClass('disabled');
        } else {
            $('#importAcc .preProcessingOptions').addClass('disabled');
        }
    },
    togglePromptToContinue: function (ev) {
        var $targ = $(ev.currentTarget);
        var key = 'promptToContinue';
        var val = $targ.is(':checked');
        Utility.SetSingleUserPreference(key, val);
    },
    setCreateAsPreference: function (ev) {
        var $targ = $(ev.currentTarget);
        var key = 'createAs';
        var val = $targ.hasClass('published') ? 'published' : 'draft';
        Utility.SetSingleUserPreference(key, val);
    },
    setAutoViewImportPreference: function (ev) {
        var $targ = $(ev.currentTarget);
        var autoViewImport = $targ.is(':checked');
        var $autoViewImports = this.$el.find('.autoViewImport');
        $autoViewImports.prop('checked', autoViewImport);
        Utility.SetSingleUserPreference('autoViewImport', autoViewImport);
    },
    enterContentTypeBuilderImport: function (ev) {
        var that = this;
        var ctId = this.$el.find('#importContentType .dropdown .importContentTypeDDText').attr('value');
        var ct = window.contentTypes.get(ctId);
        var ctbView;
        ctbView = new ContentTypeBuilderEditView({
            model: ct,
            displayInDialog: true,
            renderRegions: false,
            dialogOptions: {
                position: {
                    my: 'left top',
                    at: 'right top',
                    of: this.$el.find('#importContentType dl')
                }
            },
            dialogCallbacks: {
                saveCallback: function (cleanup) {
                    that.updateContentTypes();
                    var ev = new $.Event();
                    ev.data = {};
                    ev.currentTarget = that.$el.find('#importContentType li span[name="' + ctbView.model.get('Id') + '"]').get(0);
                    ev.data.dropdownSelector = '#capture_layout .dropdown';
                    ev.data.containerSelector = '#capture_layout';
                    ev.data.dropdownFieldTextSelector = '.dropdown .importContentTypeDDText';
                    ev.data.that = this;
                    that.setImportContentType(ev);
                    Utility.executeCallback(cleanup);
                }
            }
        });
        ctbView.render();
    },
    enterContentTypeBuilderScan: function (ev) {
        var that = this;
        var ctId = this.$el.find('#scanContentType .dropdown .scanContentTypeDDText').attr('value');
        var ct = window.contentTypes.get(ctId);
        var ctbView;
        ctbView = new ContentTypeBuilderEditView({
            model: ct,
            displayInDialog: true,
            renderRegions: false,
            dialogOptions: {
                position: {
                    my: 'left top',
                    at: 'right top',
                    of: this.$el.find('#scanContentType dl')
                }
            },
            dialogCallbacks: {
                saveCallback: function (cleanup) {
                    var ev = new $.Event();
                    ev.data = {};
                    ev.currentTarget = that.$el.find('#scanContentType li span[name="' + ctbView.model.get('Id') + '"]').get(0);
                    ev.data.dropdownSelector = '#capture_layout .dropdown';
                    ev.data.containerSelector = '#capture_layout';
                    ev.data.dropdownFieldTextSelector = '.dropdown .scanContentTypeDDText';
                    ev.data.that = this;
                    that.setScanContentType(ev);
                    Utility.executeCallback(cleanup);
                }
            }
        });
        ctbView.render();
    },
    getSelectedContentTypeData: function (ctId) {
        var ct;
        var ctName = '';
        if (!ctId || ctId === 'None Selected') {
            ctId = '';
        }
        else {
            ct = window.contentTypes.get(ctId);
            if (!ct) {
                ct = window.contentTypes.at(0);
                if (ct && ct.get) {
                    ctId = ct.get('Id');
                    ctName = ct.get('Name');
                }
                else {
                    ctId = '';
                    ctName = '';
                }
            }
            else {
                ctId = ct.get('Id');
                ctName = ct.get('Name');
            }
        }
        return { Id: ctId, Name: ctName };
    },
    updateContentTypes: function () {
        var $selector = this.$el.find('#importContentType .contentType');
        var ddOpts = {
            firstItemInList: {
                include: true
            }
        };
        var ctId = Utility.GetUserPreference('selectedImportContentType');
        var ctData = this.getSelectedContentTypeData(ctId);
        Utility.updateCustomDropdown($selector, window.contentTypes, 'importContentTypeDDText', ctData, ddOpts);
        $selector = this.$el.find('#scanContentType .contentType');
        ctId = Utility.GetUserPreference('selectedScanContentType');
        ctData = this.getSelectedContentTypeData(ctId);
        Utility.updateCustomDropdown($selector, window.contentTypes, 'scanContentTypeDDText', ctData, ddOpts);
    },
    //#endregion Event Handling
    setupPreviewPanel: function () {
        var isCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        if (isCollapsed) {
            ShowHidePanel.collapseDocumentView(this.$el);
        }
        else {
            ShowHidePanel.expandDocumentView(this.$el);
        }
        this.$el.css('visibility', 'inherit');
    }
});