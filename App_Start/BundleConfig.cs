using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Reflection;
using System.Text;
using System.Web;
using System.Web.Optimization;
using System.Linq;
using System.IO;
using Astria.UI.Web.Utility;
using Astria.Framework.DataContracts.V2;
namespace Astria.UI.Web
{
    public class BundleConfig
    {
        static Version _devVersion = new Version("99.99.9999");
        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            var constPath = GetConstString();
            AceEditorBundles(bundles, constPath);
            /****** BuzzSpace *********************************/
            BuzzSpaceBundles(bundles, constPath);
            /****** BuzzSpace Editor *********************************/
            BuzzSpaceEditorBundles(bundles, constPath);
            /****** Constants And Jquery *********************************/
            bundles.Add(new CustomScriptBundle("~/constantjqueryjs").Include(constPath, "~/Content/LibsExternal/jquery.js"));
            /****** Login *********************************/
            LoginBundles(bundles, constPath);
            /****** Print *********************************/
            PrintBundles(bundles, constPath);
            /****** Reports *********************************/
            ReportsBundles(bundles, constPath);
            /****** SystemNotificationsEditor *********************************/
            SystemNotificationEditorBundles(bundles, constPath);
            /****** Upload *********************************/
            UploadBundles(bundles, constPath);
            /****** Guest (ProxyAuthRequest) *********************************/
            GuestBundles(bundles, constPath);
            /****** Workflow *********************************/
            WorkflowBundles(bundles, constPath);
            /****** Default JS and CSS *********************************/
            DefaultBundles(bundles, constPath);
        }
        static void AceEditorBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new CustomScriptBundle("~/acejs").Include(constPath,
                "~/Content/LibsExternal/ace/ace.js"));
        }
        static void BuzzSpaceBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/buzzspacecss").Include("~/Content/css/BuzzSpace.css"));
            bundles.Add(new CustomScriptBundle("~/buzzspacejs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/jquery.ui.js",
                "~/Content/LibsInternal/BuzzUtil.js"));
        }
        static void BuzzSpaceEditorBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/buzzspaceeditorcss").Include(
                "~/Content/css/BuzzSpaceEditor.css",
                "~/Content/css/jquery-ui.css"));
            bundles.Add(new CustomScriptBundle("~/buzzspaceeditorjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/jquery.ui.js",
                 "~/Content/LibsExternal/String.js",
                "~/Content/LibsExternal/goog.math.long.js",
                "~/Content/LibsInternal/DateUtil.js",
                "~/Content/LibsExternal/jquery.l.datetimepicker.js",
                "~/Content/LibsInternal/ErrorHandler.js",
                "~/Content/LibsInternal/BuzzEditor.js")); //removed jquery.tinymce.min.js and tinymce.min.js from here 
        }                                                 // see this post http://stackoverflow.com/questions/15923805/mvc4-bundling-with-tinymce
        static void LoginBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/logincss").Include(
                "~/Content/css/login.css",
                "~/Content/css/jquery-ui.css"));
            bundles.Add(new CustomScriptBundle("~/loginjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/jquery.cookie.js",
                "~/Content/LibsExternal/jquery.ui.js",
                "~/Content/LibsInternal/ErrorHandler.js",
                "~/Content/LibsInternal/Utility.js")
                .IncludeDirectory("~/Content/LibsLogin", "*.js", false));
        }
        static void PrintBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/printcss").Include(
                "~/Content/css/Print.css",
                "~/Content/css/Dialog.css"));
            bundles.Add(new CustomScriptBundle("~/printjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js"));
        }
        static void ReportsBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/reportscss").Include(
                "~/Content/css/ReportViewer.css",
                "~/Content/css/Icons.css",
                "~/Content/css/jquery-ui.css"));
            bundles.Add(new CustomScriptBundle("~/reportsjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/jquery.ui.js",
                "~/Content/LibsExternal/jquery.l.datetimepicker.js",
                "~/Content/LibsExternal/goog.math.long.js",
                "~/Content/LibsExternal/jquery.combobox.js",
                "~/Content/LibsExternal/purl.js",
                "~/Content/LibsInternal/a_jquery.custom.autocomplete.js",
                "~/Content/LibsInternal/CssConstants.js",
                "~/Content/LibsInternal/DateUtil.js",
                "~/Content/LibsInternal/Utility.js",
                "~/Content/LibsInternal/Templates.js",
                "~/Content/JSProxy/aa_AjaxCore.js",
                "~/Content/JSProxy/aa_ServiceProxyCore.js",
                "~/Content/JSProxy/DataLinkServiceProxy.js",
                "~/Content/ReportWorks/DynamicDates.js",
                "~/Content/ReportWorks/ReportViewer.js",
                "~/jsmvc/a_underscore.js",
                "~/jsmvc/backbone.js",
                "~/jsmvc/doT.js",
                "~/jsmvc/backboneextensions.js",
                "~/jsmvc/a_models/ReportParameter.js",
                "~/jsmvc/collections/ReportParameters.js",
                "~/jsmvc/views/ReportParameterLibraryView.js",
                "~/jsmvc/views/ReportParameterView.js"));
        }
        static void SystemNotificationEditorBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new CustomScriptBundle("~/systemnotificationseditorjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/jquery.ui.js",
                "~/Content/LibsExternal/goog.math.long.js",
                "~/Content/LibsInternal/date.format.js",
                "~/Content/LibsExternal/jquery.l.datetimepicker.js",
                "~/Content/LibsInternal/DateUtil.js",
                "~/Content/LibsExternal/String.js",
                "~/Content/LibsInternal/ErrorHandler.js",
                "~/Content/LibsInternal/SystemNotificationEditor.js"));//removed jquery.tinymce.min.js and tinymce.min.js from here 
        }                                                 // see this post http://stackoverflow.com/questions/15923805/mvc4-bundling-with-tinymce        
        static void UploadBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/uploadcss").Include("~/Content/css/Import.css"));
            bundles.Add(new CustomScriptBundle("~/uploadjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                "~/Content/LibsExternal/json.js",
                "~/Content/LibsInternal/Acquire.js",
                "~/Content/LibsInternal/ClientService.js",
                "~/Content/LibsInternal/ErrorHandler.js"));
        }
        static void GuestBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/guestChallangecss").Include(
                "~/Content/css/Site.css",
                "~/Content/css/SiteOld.css",
                "~/Content/css/GuestChallenge.css"));
            bundles.Add(new CustomScriptBundle("~/guestChallengejs").Include(constPath,
                "~/Content/LibsExternal/jquery.js"));
            bundles.Add(new StyleBundle("~/Content/css/formCompletecss").Include(
                "~/Content/css/Site.css",
                "~/Content/css/SiteOld.css",
                "~/Content/css/GuestFormComplete.css"));
            bundles.Add(new CustomScriptBundle("~/formCompletejs").Include(constPath,
                "~/Content/LibsExternal/jquery.js"));
            bundles.Add(new StyleBundle("~/Content/css/guestdownloadcss").Include("~/Content/css/GuestDownload.css"));
            bundles.Add(new CustomScriptBundle("~/guestdownloadjs").Include(constPath,
                "~/Content/LibsExternal/jquery.js",
                 "~/Content/LibsExternal/jquery.ui.js",
                "~/Content/LibsExternal/jquery.cookie.js",
                "~/Content/LibsExternal/jquery.signalR.js",
                "~/Content/LibsInternal/Utility.js",
                "~/Content/JSProxy/CompanyInstanceHubProxy.js",
                "~/Content/LibsGuest/GuestDownload.js"));

            //For the guest viewer only include styles that related to the guest viewer
            bundles.Add(new StyleBundle("~/Content/css/guestviewercss").Include(
                "~/Content/css/Site.css",
                "~/Content/css/SiteOld.css",
                "~/Content/css/jquery.wysiwyg.css",
                "~/Content/css/jquery-ui.css",
                "~/Content/css/Dialog.css",
                "~/Content/css/Icons.css",
                "~/Content/css/jPicker-1.1.6.css",
                "~/Content/css/ui.multiselect.css",
                "~/Content/css/perfect-scrollbar.css",
                "~/Content/css/CustomGrid.css"));
            bundles.Add(new StyleBundle("~/Content/css/Views/guestviewerViewcss").Include(
                 "~/Content/css/Views/AnnotationView.css",
                "~/Content/css/Views/BookmarksView.css",
                "~/Content/css/Views/CustomFieldValueView.css",
                "~/Content/css/Views/DocumentFormView.css",
                "~/Content/css/Views/DocumentImageContentItemThumbnailsView.css",
                "~/Content/css/Views/DocumentImageThumbnailsView.css",
                "~/Content/css/Views/DocumentImageThumbnailView.css",
                "~/Content/css/Views/DocumentImageView.css",
                "~/Content/css/Views/DocumentMetaApprovalView.css",
                "~/Content/css/Views/DocumentMetaFieldGroupsView.css",
                "~/Content/css/Views/DocumentMetaFieldGroupView.css",
                "~/Content/css/Views/DocumentMetaFieldSetView.css",
                "~/Content/css/Views/DocumentMetaFieldsView.css",
                "~/Content/css/Views/DocumentMetaFieldView.css",
                "~/Content/css/Views/DocumentMetaFolderView.css",
                "~/Content/css/Views/DocumentMetaHistoryView.css",
                "~/Content/css/Views/DocumentMetaRelatedItemsView.css",
                "~/Content/css/Views/DocumentMetaVersioningView.css",
                "~/Content/css/Views/DocumentMetaView.css",
                "~/Content/css/Views/DocumentMetaWorkflowView.css",
                "~/Content/css/Views/DocumentNativeView.css",
                "~/Content/css/Views/DocumentPagerView.css",
                "~/Content/css/Views/DocumentPreviewView.css",
                "~/Content/css/Views/DocumentVersioningCommentView.css",
                "~/Content/css/Views/DocumentVersioningGridItemView.css",
                "~/Content/css/Views/DocumentVersioningGridView.css",
                "~/Content/css/Views/DocumentView.css",
                "~/Content/css/Views/DocumentViewerMenuView.css",
                "~/Content/css/Views/DocumentViewerView.css"));
            bundles.Add(new CustomScriptBundle("~/guestviewerjs")
                .Include(constPath)
                .IncludeDirectory("~/Content/LibsExternal", "*js", false)
                .IncludeDirectory("~/Content/JSProxy", "*js", false)
                .IncludeDirectory("~/Content/LibsInternal", "*js", false)
                .IncludeDirectory("~/Content/ReportWorks", "*js", false)
                .Include("~/jsmvc/a_underscore.js",
                    "~/jsmvc/backbone.js",
                    "~/jsmvc/doT.js",
                    "~/jsmvc/backboneextensions.js")
                .IncludeDirectory("~/jsmvc/a_base_a_models", "*js", false)
                .IncludeDirectory("~/jsmvc/a_base_collections", "*js", false)
                .IncludeDirectory("~/jsmvc/a_complexModels", "*js", false)
                .IncludeDirectory("~/jsmvc/a_models", "*js", false)
                .IncludeDirectory("~/jsmvc/collections", "*js", false)
                .IncludeDirectory("~/jsmvc/compositecollections", "*js", false)
                .IncludeDirectory("~/jsmvc/controllers", "*js", false)
                .IncludeDirectory("~/jsmvc/views", "*js", false)
                .Include("~/Content/LibsGuest/GuestDocumentView.js"));

        }
        static void WorkflowBundles(BundleCollection bundles, string constPath)
        {
            bundles.Add(new StyleBundle("~/Content/css/workflowcss").Include(
                "~/Content/css/WorkflowDesigner.css",
                "~/Content/css/CustomGrid.css",
                "~/Content/css/Icons.css"));
            bundles.Add(new CustomScriptBundle("~/workflowjs").IncludeDirectory("~/Content/LibsWorkflow", "*js"));
        }
        static void DefaultBundles(BundleCollection bundles, string constPath)
        {
            //If any sytles or JS is added the effects the document viewer remember to update the bundles under Guest Bundles.
            bundles.Add(new StyleBundle("~/Content/css/defaultcss").Include(
                "~/Content/css/Site.css",
                "~/Content/css/SiteOld.css",
                "~/Content/css/jquery.wysiwyg.css",
                "~/Content/css/jquery-ui.css",
                "~/Content/css/Dialog.css",
                "~/Content/css/Icons.css",
                "~/Content/css/jPicker-1.1.6.css",
                "~/Content/css/ui.multiselect.css",
                "~/Content/css/perfect-scrollbar.css",
                "~/Content/css/CustomGrid.css"));
            bundles.Add(new StyleBundle("~/Content/css/Views/defaultcss").IncludeDirectory("~/Content/css/Views", "*.css", false));
            bundles.Add(new CustomScriptBundle("~/defaultjs")
                .Include(constPath)
                .IncludeDirectory("~/Content/LibsExternal", "*js", false)
                .IncludeDirectory("~/Content/JSProxy", "*js", false)
                .IncludeDirectory("~/Content/LibsInternal", "*js", false)
                .IncludeDirectory("~/Content/ReportWorks", "*.js", false)
                .Include("~/jsmvc/a_underscore.js",
                    "~/jsmvc/backbone.js",
                    "~/jsmvc/doT.js",
                    "~/jsmvc/backboneextensions.js")
                .IncludeDirectory("~/jsmvc/a_base_a_models", "*js", false)
                .IncludeDirectory("~/jsmvc/a_base_collections", "*js", false)
                .IncludeDirectory("~/jsmvc/a_complexModels", "*js", false)
                .IncludeDirectory("~/jsmvc/a_models", "*js", false)
                .IncludeDirectory("~/jsmvc/collections", "*js", false)
                .IncludeDirectory("~/jsmvc/compositecollections", "*js", false)
                .IncludeDirectory("~/jsmvc/controllers", "*js", false)
                .IncludeDirectory("~/jsmvc/views", "*js", false));
        }
        static string GetConstString()
        {
            var version = Version.Parse(Functions.GetVersion());
            var appDataPath = System.Web.Hosting.HostingEnvironment.MapPath("~/Content");
            var path = Path.Combine(appDataPath, String.Format("Constants{0}.js", version));
            if (!File.Exists(path) || version >= _devVersion)
            {
                var colorPalette = new String[] { "ffffaa", "d4ffaa", "aaffaa", "aaffff", "aad4ff", "aaaaff", "d4aaff", "ffaaff", "ffaad4", "ffaaaa", "ffd4aa" };
                var helpUrl = Functions.GetSetting(Constants.HELPURL, "http://www.docstar.com/help");
                StringBuilder script = new StringBuilder();
                script.AppendLine("var Constants = {");
                script.AppendLine("t:function(s){return this.c[s]===undefined?'missing trans key ' + s: this.c[s];},");
                List<String> strList = new List<string>();
                //The following is set in the JS file ConstantUrls
                //strList.Add(BundleConfig.JSConstant("Url_Base", basePath));
                //strList.Add(BundleConfig.JSConstant("Server_Url", serverUri));
                //strList.Add(BundleConfig.JSConstant("Login_Url", loginUrl));
                //strList.Add(BundleConfig.JSConstant("Url_Help", String.IsNullOrWhiteSpace(helpUrl) ? Functions.CombineUri(basePath, "help", "help") : helpUrl));
                strList.Add(BundleConfig.JSConstant("ProxyCookieDomain", Functions.GetProxyCookieDomain()));
                strList.Add(BundleConfig.JSConstant("TypeAheadDelay", Functions.GetSettingInt("TypeAheadDelay", 500).ToString()));
                strList.Add(BundleConfig.JSConstant("PreviewDelay", Functions.GetSettingInt("PreviewDelay", 500).ToString()));
                strList.Add(BundleConfig.JSConstant("RefreshDelay", Functions.GetSettingInt("RefreshDelay", 1000).ToString()));
                strList.Add(BundleConfig.JSConstant("AutoSaveDelay", Functions.GetSettingInt("AutoSaveDelay", 10).ToString()));
                strList.Add(BundleConfig.JSConstant("IntMin", Int32.MinValue.ToString()));
                strList.Add(BundleConfig.JSConstant("IntMax", Int32.MaxValue.ToString()));
                strList.Add(BundleConfig.JSConstant("LongMin", Int64.MinValue.ToString()));
                strList.Add(BundleConfig.JSConstant("LongMax", Int64.MaxValue.ToString()));
                strList.Add(BundleConfig.JSConstant("DateTimeMin", DateTime.MinValue.ToString()));
                strList.Add(BundleConfig.JSConstant("DateTimeMax", DateTime.MaxValue.ToString()));
                strList.Add("UtilityConstants : { WhatAmI:'All Constants defined in Astria.Framework.Utility.Constants'");
                foreach (var constant in GetConstants(typeof(Constants)))
                {
                    strList.Add(BundleConfig.JSConstant(constant.Key, constant.Value));
                }
                //strList.Add("}");
                script.AppendLine(String.Join(",", strList.ToArray()) + "},");
                //add constants translations
                script.AppendLine("c : " + JsonConvert.SerializeObject(Constants.GetTranslations(Constants.GetLocale())));
                script.AppendLine(", gp : " + JsonConvert.SerializeObject(GatewayPermissions.NotSet.EnumToDictionary<long>()));
                script.AppendLine(", sp : " + JsonConvert.SerializeObject(PermissionType.NotSet.EnumToDictionary()));
                script.AppendLine(", moy : " + JsonConvert.SerializeObject(MonthsOfYear.None.EnumToDictionary(false)));
                script.AppendLine(", dow : " + JsonConvert.SerializeObject(DaysOfWeek.None.EnumToDictionary(false)));
                script.AppendLine(", at : " + JsonConvert.SerializeObject(ActionType.Modified.EnumToDictionary()));
                script.AppendLine(", et : " + JsonConvert.SerializeObject(EntityType.All.EnumToDictionary<uint>()));
                script.AppendLine(", tk : " + JsonConvert.SerializeObject(TokenKey.View.EnumToDictionary()));
                script.AppendLine(", tt : " + JsonConvert.SerializeObject(TokenType.Concurrent.EnumToDictionary()));
                script.AppendLine(", lt : " + JsonConvert.SerializeObject(LicenseTerm.None.EnumToDictionary()));
                script.AppendLine(", mt : " + JsonConvert.SerializeObject(MarkType.Arrow.EnumToDictionary()));
                script.AppendLine(", uf : " + JsonConvert.SerializeObject(UserFlags.SuperAdmin.EnumToDictionary()));
                // workflow enums
                script.AppendLine(", wfs : " + JsonConvert.SerializeObject(WFStates.Complete.EnumToDictionary()));
                script.AppendLine(", am : " + JsonConvert.SerializeObject(WFAssigneeMode.None.EnumToDictionary()));
                script.AppendLine(", cm : " + JsonConvert.SerializeObject(Comparisons.EQ.EnumToDictionary()));
                script.AppendLine(", sarg : " + JsonConvert.SerializeObject(SystemArguments.CurrentUser.EnumToDictionary()));
                script.AppendLine(", mop : " + JsonConvert.SerializeObject(MathOperations.Add.EnumToDictionary()));
                script.AppendLine(", amop : " + JsonConvert.SerializeObject(AggregateMathOperations.Sum.EnumToDictionary()));
                script.AppendLine(", sop : " + JsonConvert.SerializeObject(StringOperations.PadLeft.EnumToDictionary()));
                script.AppendLine(", co : " + JsonConvert.SerializeObject(CleanupOptions.None.EnumToDictionary()));
                script.AppendLine(", wfrm : " + JsonConvert.SerializeObject(WFExceptionResolutionMethods.Remove.EnumToDictionary()));
                script.AppendLine(", fro : " + JsonConvert.SerializeObject(FieldRelatedOn.AllRelatedFields.EnumToDictionary()));
                script.AppendLine(", wftf : " + JsonConvert.SerializeObject(WFTaskFlags.OnePerAction.EnumToDictionary()));
                // custom field types
                script.AppendLine(", ty : " + JsonConvert.SerializeObject(CFTypeCode.Boolean.EnumToDictionary()));
                // record mgmt disposition types
                script.AppendLine(", rmd : " + JsonConvert.SerializeObject(DispositionType.Event.EnumToDictionary()));
                script.AppendLine(", as : " + JsonConvert.SerializeObject(ApprovalState.None.EnumToDictionary()));
                script.AppendLine(", awf : " + JsonConvert.SerializeObject(AdvancedWFFlags.NotCalculated.EnumToDictionary()));
                script.AppendLine(", pl : " + JsonConvert.SerializeObject(PriorityLevel.Normal.EnumToDictionary()));
                script.AppendLine(", igf : " + JsonConvert.SerializeObject(ImageFlags.Pending.EnumToDictionary()));
                script.AppendLine(", fs : " + JsonConvert.SerializeObject(FontStyle.Regular.EnumToDictionary()));
                script.AppendLine(", rl : " + JsonConvert.SerializeObject(DQRunLocation.Local.EnumToDictionary()));
                script.AppendLine(", dlt : " + JsonConvert.SerializeObject(DataLinkType.MSSQL.EnumToDictionary()));
                script.AppendLine(", sqldbt : " + JsonConvert.SerializeObject(SqlDbType.VarChar.EnumToDictionary()));
                script.AppendLine(", sap : " + JsonConvert.SerializeObject(SyncActionPreference.SyncAndSave.EnumToDictionary()));
                script.AppendLine(", wfat : " + JsonConvert.SerializeObject(WFActionType.Standard.EnumToDictionary()));
                script.AppendLine(", edt : " + JsonConvert.SerializeObject(ExportDocumentType.Native.EnumToDictionary()));
                script.AppendLine(", sro : " + JsonConvert.SerializeObject(ServiceRequestOptions.None.EnumToDictionary()));
                script.AppendLine(", dtfs : " + JsonConvert.SerializeObject(DistributedTaskFlags.None.EnumToDictionary()));
                script.AppendLine(", pds : " + JsonConvert.SerializeObject(PredefinedSearch.None.EnumToDictionary()));
                script.AppendLine(", im : " + JsonConvert.SerializeObject(InvokableMethod.GetAcquireData.EnumToDictionary()));
                script.AppendLine(", apiev : " + JsonConvert.SerializeObject(ApiEvents.ActionCreated.EnumToDictionary()));
                script.AppendLine(", capm : " + JsonConvert.SerializeObject(SplitMethod.AnyBarcodeSeparatorAssignContentType.EnumToDictionary()));
                script.AppendLine(", dps : " + JsonConvert.SerializeObject(DetectPageSide.NotSet.EnumToDictionary()));
                script.AppendLine(", ps : " + JsonConvert.SerializeObject(PageSize.A3.EnumToDictionary()));
                script.AppendLine(", psDefs : " + JsonConvert.SerializeObject(PageSize.A3.EnumMapToDictionary<Int32, double[]>()));
                script.AppendLine(", cs : " + JsonConvert.SerializeObject(ColorSetting.BlackAndWhite.EnumToDictionary()));
                script.AppendLine(", ds : " + JsonConvert.SerializeObject(DocumentStatus.Draft.EnumToDictionary()));
                script.AppendLine(", gvo : " + JsonConvert.SerializeObject(CFGroupValidationOptions.None.EnumToDictionary()));
                script.AppendLine(", ijs : " + JsonConvert.SerializeObject(ImportJobStatus.Completed.EnumToDictionary()));
                script.AppendLine(", js : " + JsonConvert.SerializeObject(JobStatus.Active.EnumToDictionary()));
                script.AppendLine(", ef : " + JsonConvert.SerializeObject(ExecutionFrequency.OneTime.EnumToDictionary()));
                script.AppendLine(", ert : " + JsonConvert.SerializeObject(ExportReportType.PDF.EnumToDictionary()));
                script.AppendLine(", dqnt : " + JsonConvert.SerializeObject(DQNotificationType.Start.EnumToDictionary()));
                script.AppendLine(", emt : " + JsonConvert.SerializeObject(MessagingType.SyncActionException.EnumToDictionary()));
                script.AppendLine(", colorPalette : " + JsonConvert.SerializeObject(colorPalette));
                script.AppendLine(", safeFonts : " + JsonConvert.SerializeObject(Constants.SafeFonts));
                script.AppendLine(", fontSizes : " + JsonConvert.SerializeObject(Constants.FontSizes));
                script.AppendLine(", ft : " + JsonConvert.SerializeObject(FormTag.TextInput.EnumToDictionary()));
                script.AppendLine(", vt : " + JsonConvert.SerializeObject(ViewerType.Native.EnumToDictionary()));
                script.AppendLine(", fp : " + JsonConvert.SerializeObject(FormProperty.None.EnumToDictionary()));
                script.AppendLine(", c3p : " + JsonConvert.SerializeObject(C3PI.eConnect.EnumToDictionary()));
                script.AppendLine(", rd : " + JsonConvert.SerializeObject(RepeatDirection.None.EnumToDictionary()));
                script.AppendLine(", rd : " + JsonConvert.SerializeObject(RepeatDirection.None.EnumToDictionary()));
                script.AppendLine(", dgop : " + JsonConvert.SerializeObject(DocumentGetOptions.ByVersion.EnumToDictionary()));
                script.AppendLine(", dgf : " + JsonConvert.SerializeObject(DocumentGetFlags.Document.EnumToDictionary()));
                script.AppendLine(", ext : " + JsonConvert.SerializeObject(ExpirationMode.NoExpiration.EnumToDictionary()));
                script.AppendLine(", part : " + JsonConvert.SerializeObject(ProxyAuthRequestType.DownloadFiles.EnumToDictionary()));
                script.AppendLine(", fe : " + JsonConvert.SerializeObject(FormulaElements.Element.EnumToDictionary()));
                script.AppendLine("};");
                var urlsPath = System.Web.Hosting.HostingEnvironment.MapPath("~/Content/ConstantUrls");
                urlsPath = Path.Combine(urlsPath, "ConstantUrls.js");
                script.AppendLine(File.ReadAllText(urlsPath));
                File.WriteAllText(path, script.ToString());
            }
            return "~/Content/" + Path.GetFileName(path);
        }
        static Dictionary<string, string> GetConstants(System.Type type)
        {
            //The "BindingFlags.Public" gets all public fields.
            //The "BindingFlags.Static" gets all static fields.
            //The "BindingFlags.FlattenHierarchy" gets fields from all base types.
            var fieldInfos = type.GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);

            // Go through the list and only pick out the constants

            // Return an array of FieldInfos
            return fieldInfos.Where(fi => fi.IsLiteral && !fi.IsInitOnly).ToDictionary(fi => fi.Name, fi => fi.GetRawConstantValue().ToString());
        }
        static string JSConstant(string name, string value)
        {
            if (!String.IsNullOrEmpty(value))
            {
                value = value.Replace("\\", "\\\\").Replace("\"", "\\\"");
            }
            return String.Format("{0}:\"{1}\"", name, value);
        }
    }
}
