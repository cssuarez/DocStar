// Provide navigation for the Admin features
var AdminRouter = Backbone.Router.extend({

    //views
    //contentTypeManagerView: null,
    buzzSpacesManagerView: null,
    securityClassManagerView: null,
    systemPreferencesManagerView: null,
    userManagerView: null,
    roleManagerView: null,
    customFieldMetaManagerView: null,
    companyManagerView: null,
    indexManagerView: null,
    ipRestrictionsManagerView: null,
    auditManagerView: null,
    passwordManagerView: null,
    recycleBinManagerView: null,
    licenseManagerView: null,
    workflowDesignerManagerView: null,
    actionManagerView: null,
    retentionManagerView: null,
    retentionFreezeManagerView: null,
    customListManagerView: null,
    exportImportManagerView: null,
    distributedQueueManagerView: null,
    stampManagerView: null,
    ldapManagerView: null,
    dataLinkManagerView: null,
    c3piManagerView: null,
    importJobsView: null,
    systemNotificationsView: null,
    dbSyncManagerView: null,
    viewLicensesView: null,
    passwordManagementView: null,
    dataUsageReportView: null,
    /*
    * routes need to start with Admin (the global route controller will focus this in the UI)
    */
    routes: {
        "Admin": "adminPanel",
        //"AdminContentTypeManager": "contentTypeManager",
        "AdminBuzzSpacesManager": "buzzSpacesManager",
        "AdminSecurityClassManager": "securityClassManager",
        "AdminSystemPreferencesManager": "systemPreferencesManager",
        "AdminUserManager": "userManager",
        "AdminGroupManager": "roleManager",
        "AdminCustomFieldMetaManager": "customFieldMetaManager",
        "AdminIndexManager": "indexManager",
        "AdminCompanyManager": "companyManager",
        "AdminIpRestrictionsManager": "ipRestrictionsManager",
        "AdminAudit": "auditManager",
        "AdminChangePassword": "passwordManager",
        "AdminRecycleBin": "recycleBinManager",
        "AdminWorkflowDesignerManager": "workflowDesignerManager",
        "AdminActionsManager": "actionManager",
        "AdminRecordsRetentionFreezes": "retentionFreezeManager",
        "AdminRecordsRetention": "retentionManager",
        "AdminLicensing": "licenseManager",
        "AdminCustomListManager": "customListManager",
        "AdminExportImportManager": "exportImportManager",
        "AdminDistributedQueueManager": "distributedQueueManager",
        "AdminStampManager": "stampManager",
        "AdminLDAPManager": "ldapManager",
        "AdminDataLinkManager": "dataLinkManager",
        "AdminThirdPartyIntegrationManager": "c3piManager",
        "AdminImportJobs": "importJobs",
        "AdminDBSyncManager": "dbSyncManager",
        "AdminSystemNotifications": "systemNotifications",
        "AdminViewLicenses": "viewLicenses",
        "AdminPasswordManagement": "passwordManagement",
        "AdminDataUsageReport":"dataUsageReport"
    },
    /*
    * display the initial admin panel (as of yet undetermined)
    */
    adminPanel: function () {
        $('#view_layout').addClass('hideNative');
        this.onNavigate(name);
        setTimeout(function () {
            ShowHidePanel.resize();
        }, 0);
    },
    distributedQueueManager: function () {
        this.initManager('distributedQueueManagerView', 'DistributedQueueManagerView');
    },
    workflowDesignerManager: function () {
        this.initManager('workflowDesignerManagerView', 'WorkflowDesignerManagerView');
    },
    retentionFreezeManager: function () {
        this.initManager('retentionFreezeManagerView', 'RetentionFreezeManagerView');
    },
    retentionManager: function () {
        this.initManager('retentionManagerView', 'RetentionManagerView');
    },
    indexManager: function () {
        this.initManager('indexManagerView', 'IndexManagerView');
    },
    licenseManager: function () {
        this.initManager('licenseManagerView', 'LicenseManagerView');
    },
    customListManager: function () {
        this.initManager('customListManagerView', 'CustomListManagerView');
    },
    exportImportManager: function () {
        this.initManager('exportImportManagerView', 'ExportImportManagerView');
    },
    recycleBinManager: function () {
        if (Utility.checkGP(window.gatewayPermissions, Constants.gp.RecycleBin)) {
            this.initManager('recycleBinManagerView', 'RecycleBinManagerView');
        }
    },
    roleManager: function () {
        this.initManager('roleManagerView', 'RoleManagerView');
    },
    //contentTypeManager: function () {
    //    this.initManager('contentTypeManagerView', 'ContentTypeManagerView');
    //},
    buzzSpacesManager: function () {
        this.initManager('buzzSpacesManagerView', 'BuzzSpacesManagerView');
    },
    securityClassManager: function () {
        this.initManager('securityClassManagerView', 'SecurityClassManagerView');
    },
    systemPreferencesManager: function () {
        this.initManager('systemPreferencesManagerView', 'SystemPreferencesManagerView');
    },
    userManager: function () {
        this.initManager('userManagerView', 'UserManagerView');
    },
    viewLicenses: function () {
        this.initManager('viewLicensesView', 'ViewLicensesView');
    },
    passwordManagement: function () {
        this.initManager('passwordManagementView', 'PasswordManagementView');
    },
    customFieldMetaManager: function () {
        this.initManager('customFieldMetaManagerView', 'CustomFieldMetaManagerView');
    },
    companyManager: function () {
        this.initManager('companyManagerView', 'CompanyManagerView');
    },
    ipRestrictionsManager: function () {
        this.initManager('ipRestrictionsManagerView', 'IPMaskManagerView');
    },
    auditManager: function () {
        this.initManager('auditManagerView', 'AuditManagerView');
    },
    passwordManager: function () {
        this.initManager('passwordManagerView', 'PasswordManagerView');
    },
    importJobs: function () {
        this.initManager('importJobsView', 'ImportJobsView');
    },
    systemNotifications: function () {
        this.initManager('systemNotificationsView', 'SystemNotificationsView');
    },
    stampManager: function () {
        // Reset is first unless the page is refreshing
        if (Navigation.lastPage && Navigation.lastPage !== 'stampManagerView') {
            if (this.stampManagerView && this.stampManagerView.editView) {
                this.stampManagerView.editView.isFirst = true;
            }
        }
        this.initManager('stampManagerView', 'StampManagerView');
    },
    ldapManager: function () {
        this.initManager('ldapManagerView', 'LDAPManagerView');
    },
    dataLinkManager: function () {
        this.initManager('dataLinkManagerView', 'DataLinkManagerView');
    },
    c3piManager: function () {
        this.initManager('c3piManagerView', 'C3PIManagerView');
    },
    dbSyncManager: function () {
        this.initManager('dbSyncManagerView', 'DBSyncManagerView');
    },
    dataUsageReport: function () {
        this.initManager('dataUsageReportView', 'DataUsageReportView');
    },
    navSelection: function (route) {
        var revRoutes = Utility.reverseMapObject(this.routes);
        var selector = $('#admin_tab_panel').find('a[href="#' + revRoutes[route] + '"]');
        $('#admin_tab_panel .selected').removeClass('selected');
        $(selector).addClass('selected');
    },
    initManager: function (name, className) {
        //workflow iframe check
        if ($('#wf_designer_container').length > 0) {
            //check if there are changes to be saved.  
            if (frames.wf_designer_container.Workflow.uncommitted_changes) {
                if (!confirm(Constants.t('unsavedChangesAlert'))) {
                    //if false break out of switching screens
                    return;
                }
            }
        }
        $('#view_layout').addClass('hideNative');    // Hide the native viewer
        this.onNavigate(name);
        var route = name.split('View')[0];
        this.navSelection(route);
        // create the view once, passing it a container selector
        // Clear admin screen appending loading throbber
        $('#admin_action').html('<div id="admin_throbber"><div align="center"><img src="' + Constants.Url_Base + 'Content/themes/default/throbber.gif" /></div></div>');
        if (this[name] === null) {
            this[name] = new window[className]({
                el: "#admin_action"
            });
        }
        else {
            this[name].go();
        }
        var func = function () {
            ShowHidePanel.resizeAdminPage(true);
            ShowHidePanel.resize();
            $('#admin_screen').perfectScrollbar({
                wheelPropagation: true,
                useKeyboard: false
            });
        };
        setTimeout(func, 0);
    }
});
