using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.DataContracts.V2Extensions;
using Astria.Framework.Datalink;
using Astria.Framework.Datalink.Queries;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using Microsoft.Reporting.WebForms;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Xml.Linq;


namespace Astria.UI.Web
{
    public partial class ReportViewer : System.Web.UI.Page
    {
        Button _submitControl = new Button();
        Panel _parameterContainer = new Panel();
        ServiceBuilder _sb;
        Guid _reportId;
        Boolean _displayError = false;  // Used to hide Error Control on Load Complete
        Boolean _getParameters = false; // Add parameter to a hidden input, but don't render it
        List<ReportParameterPackage> _parameterPackages = null;
        protected void Page_PreInit(object sender, EventArgs e)
        {
            _displayError = false;
            _parameterContainer.ID = "parameterContainer";
            ReportViewer1.ReportError += ReportViewer1_ReportError;
            ReportViewer1.ReportRefresh += ReportViewer1_ReportRefresh;
            ReportViewer1.LocalReport.EnableHyperlinks = true;
            PlaceHolderParameterData.Controls.Clear();

            if (Request != null)
            {
                if (Request.QueryString == null || Request.QueryString.Count == 0)
                {
                    throw new Exception(Constants.i18n("reportIdNotFound"));
                }
                var qsId = Request.QueryString["reportId"];
                _reportId = Guid.Empty;
                Guid.TryParse(qsId, out _reportId);
                if (_reportId == Guid.Empty)
                {
                    throw new Exception(Constants.i18n("reportIdNotFound"));
                }
                if (Request.QueryString.Count > 1)
                {
                    _getParameters = Request.QueryString["getParameters"] == "getParameters";
                }
                var token = AstriaCookie.GetToken();
                var ip = Request.UserHostAddress;
                var currentDomain = String.Format("{0}://{1}:{2}",
                        Request.IsSecureConnection ? "https" : "http",
                        Request.ServerVariables["SERVER_NAME"],
                        Request.ServerVariables["SERVER_PORT"]);
                var serverUrl = Functions.CombineUri(currentDomain, Functions.GetSetting(Constants.SERVER_VD, "/FusionServer"));
                _sb = new ServiceBuilder(serverUrl, token, ip, Constants.WEB_TIER_SOURCE);
            }
            var report = GetReportPackage();
            var reportDef = GetReportDefinition();

            var paramInfo = ReportViewer1.LocalReport.GetParameters();
            try
            {
                if (!Page.IsPostBack && !_getParameters)
                {
                    if (paramInfo.Count > 1)
                        LoadReport(report, reportDef, null);
                    else
                        RefreshReport();
                }
                else
                {
                    // Empty controls so they aren't added more than once
                    PlaceHolderParameters.Controls.Clear();
                    RenderReportData(report);
                }
                _parameterPackages = GetReportParameterPackages(report, reportDef);
                var hiddenInput = new HiddenField();
                hiddenInput.ID = "reportParameterData";
                PlaceHolderParameterData.Controls.Add(hiddenInput);
            }
            catch (LocalProcessingException lex)
            {
                ErrorHandler(lex.InnerMost());
            }
            catch (Exception ex)
            {
                ErrorHandler(ex);
            }
        }
        protected void Page_Load(object sender, EventArgs e)
        {
            // Set Default values to  ones provided by the user, don't use the one's provided by the report
            // This will allow the parameters to be refreshed with the values the user submitted
            var hiddenInput = (HiddenField)PlaceHolderParameterData.FindControl("reportParameterData");
            var idx = 0;
            var length = _parameterPackages.SafeLength();
            for (idx = 0; idx < length; idx++)
            {
                var pkg = _parameterPackages[idx];
                var dfLen = pkg.DefaultValues.SafeLength();
                var values = Request.Form.GetValues(pkg.Name);
                pkg.DefaultValues = values;
                if (values != null && values.SafeLength() > 0)
                    pkg.Values = values;
            }
            if (_parameterPackages != null)
                hiddenInput.Value = JsonConvert.SerializeObject(_parameterPackages);
        }
        protected void Page_LoadComplete(object sender, EventArgs e)
        {
            ReportViewer1.LocalReport.EnableHyperlinks = true;
            // NOTE: Without the check to make sure ASYNCPOST is null, this would cause an infinite loop to occur.
            if (!_getParameters && Request.Form.Count > 0 && Request.Form.GetValues("__ASYNCPOST") == null)
            {
                RefreshReport();
            }
            // If no error has been set, hide it so previously execute reports don't display the error.
            if (!_displayError)
            {
                Error.Visible = false;
            }
        }
        private ReportPackage GetReportPackage()
        {
            var reportSvc = _sb.ReportingV2();
            var rptSR = reportSvc.Get(_reportId);
            ExceptionsML.Check(rptSR.Error);
            return rptSR.Result;
        }
        private XElement GetReportDefinition()
        {
            var reportSvc = _sb.ReportingV2();
            var rSR = reportSvc.GetRdlc(_reportId);
            ExceptionsML.Check(rSR.Error);
            var reportStream = new MemoryStream(rSR.Result);
            ReportViewer1.LocalReport.LoadReportDefinition(reportStream);
            ReportViewer1.LocalReport.DataSources.Clear();
            reportStream.Seek(0, SeekOrigin.Begin);
            return XElement.Load(reportStream);
        }
        private void LoadReport(ReportPackage report, XElement reportDef, Dictionary<String, String> parameters)
        {
            var paramInfo = ReportViewer1.LocalReport.GetParameters();
            ReportViewer1.Visible = !((paramInfo.Count > 1) && parameters == null);
            RenderReportData(report);
            if ((Page.IsPostBack && paramInfo.Count > 0) || (parameters != null && parameters.Count == 0)) //Don't load report data on page load unless there are 0 parameters
                LoadReportData(report, parameters, reportDef, _sb);
            ReportViewer1.LocalReport.Refresh();
        }
        private void LoadReportData(ReportPackage report, Dictionary<String, String> parameters, XElement reportDef, ServiceBuilder sb)
        {
            try
            {
                var reportParams = ReportViewer1.LocalReport.GetParameters();
                sb.SendTimeout = TimeSpan.FromMinutes(30);
                var dlSvc = sb.DataLinkV2();
                var newParams = new Dictionary<String, String>();
                var xmlns = reportDef.GetDefaultNamespace().ToString();
                var rd = reportDef.GetNamespaceOfPrefix("rd").ToString();

                var dataSets = reportDef.Descendants(XName.Get("DataSet", xmlns));
                if (dataSets == null)
                    throw new Exception("DataSet not found in report"); //We control writing this, so we should never see this occur. 

                foreach (var dataSet in dataSets)
                {
                    var dsName = dataSet.SafeAttributeValue<String>("Name", Constants.ECLIPSE_DATASOURCE);
                    var rds = report.ReportDataSets.FirstOrDefault(r => r.Name == dsName);
                    var dlSR = dlSvc.GetReportData(new GetReportDataArgs { Parameters = parameters, QueryDefinition = rds.QueryDefinition });
                    ExceptionsML.Check(dlSR.Error);
                    newParams.AddRange(dlSR.Result.Parameters);
                    var dt = new DataTable(dsName);
                    var fields = dataSet.Descendants(XName.Get("Field", xmlns));
                    if (fields != null)
                    {
                        foreach (var field in fields)
                        {
                            var fieldName = field.Element(XName.Get("DataField", xmlns)).Value;
                            var fieldType = field.Element(XName.Get("TypeName", rd)).Value;
                            dt.Columns.Add(new DataColumn(fieldName, Converter.GetType(fieldType)));
                        }
                        if (dlSR.Result != null)
                        {
                            dlSR.Result.FillDataTable(dt);
                        }
                    }
                    var rptData = new ReportDataSource(dsName, dt);
                    ReportViewer1.LocalReport.DataSources.Add(rptData);
                }
                // Set the parameters for the report
                var length = reportParams == null ? 0 : reportParams.Count;
                var setParams = new ReportParameter[length];
                var eclipseURL = String.Format("{0}://{1}:{2}{3}",
                    Request.IsSecureConnection ? "https" : "http",
                    Request.ServerVariables["SERVER_NAME"],
                    Request.ServerVariables["SERVER_PORT"],
                    Request.ApplicationPath);
                var idx = 0;
                foreach (var param in reportParams)
                {
                    // Add a hardcoded EclipseURL parameter so the report can use it to navigate documents
                    var name = param.Name;
                    var newParamsName = "@" + name;
                    if (name == Constants.REPORTS_ECLIPSE_URL)
                        setParams[idx] = new ReportParameter(name, eclipseURL);
                    else if (newParams.ContainsKey(newParamsName)) // newParams names begin with "@", where as name does not
                        setParams[idx] = new ReportParameter(name, newParams[newParamsName]);
                    else
                        setParams[idx] = new ReportParameter(name);
                    idx++;
                }
                setParams = setParams.RemoveNulls();    // Prevents setting null parameters (ones' that have been deleted)
                ReportViewer1.LocalReport.SetParameters(setParams);
            }
            catch (LocalProcessingException lex)
            {
                ErrorHandler(lex.InnerMost());
            }
            catch (Exception ex)
            {
                ErrorHandler(ex);
            }
        }
        private void RefreshReport()
        {
            // Obtain last used parameters
            var paramInfo = ReportViewer1.LocalReport.GetParameters();
            var parameters = new Dictionary<String, String>();
            var length = paramInfo.Count;
            for (int idx = 0; idx < length; idx++)
            {
                var param = paramInfo[idx];
                var name = "@" + param.Name;
                // Skip internal hidden parameter "EclipseURL" (Used to link documents)
                if (param.Name == Constants.REPORTS_ECLIPSE_URL)
                    continue;
                String[] values = new String[] { String.Empty };
                if (!String.IsNullOrEmpty(param.Name) && Request.Form.Count > 0)
                {
                    var value = GetFormValue(param.Name);
                    parameters.Add(name, value);
                }
            }
            if (length == 0)
                parameters = null;

            var report = GetReportPackage();
            var reportDef = GetReportDefinition();
            LoadReport(report, reportDef, parameters);
        }

        #region Render Controls
        /// <summary>
        /// Render any report data above the parameters. eg. Report Name, Report Description, etc...
        /// </summary>
        /// <param name="report"></param>
        /// <param name="reportDef"></param>
        private void RenderReportData(ReportPackage report)
        {
            // Empty controls so they aren't added more than once
            PlaceHolderReportData.Controls.Clear();
            var panel = new Panel();
            var reportName = new Label();
            reportName.ID = "reportName";
            reportName.Text = report.Report.DisplayName;
            panel.Controls.Add(reportName);
            var reportDescription = new Label();
            reportDescription.CssClass = "reportDescription";
            PlaceHolderReportData.Controls.Add(panel);
            PlaceHolderParameters.Controls.Add(_parameterContainer);
        }
        private List<ReportParameterPackage> GetReportParameterPackages(ReportPackage report, XElement reportDef)
        {
            var dataSets = report.ReportDataSets;
            var xmlns = reportDef.GetDefaultNamespace().ToString();
            var reportParams = reportDef.Descendants(XName.Get("ReportParameter", xmlns));
            var localReportParams = ReportViewer1.LocalReport.GetParameters();
            var reportParameterPkgs = new List<ReportParameterPackage>();
            foreach (var reportParam in reportParams)
            {
                var reportParamName = reportParam.SafeAttributeValue("Name", "");
                // Skip internal hidden parameter "EclipseURL" (Used to link documents)
                if (reportParamName == Constants.REPORTS_ECLIPSE_URL)
                    continue;
                //TODO: Use the report parameter prompt instead of the name
                var multiValue = reportParam.Element(XName.Get("MultiValue", xmlns));
                var hasMultiValues = false;
                if (multiValue != null)
                    Boolean.TryParse(multiValue.Value, out hasMultiValues);
                var allowBlank = reportParam.Element(XName.Get("AllowBlank", xmlns));
                var hasAllowBlank = false;
                if (allowBlank != null)
                    Boolean.TryParse(allowBlank.Value, out hasAllowBlank);


                var validValues = reportParam.Descendants(XName.Get("ValidValues", xmlns));
                var paramValidValues = new List<ParameterValidValue>();
                var hasValidValues = false;
                String lrpLabel = String.Empty;
                String lrpValue = String.Empty;
                var rpPkg = new ReportParameterPackage
                {
                    Name = reportParamName
                };
                foreach (var validValue in validValues)
                {
                    hasValidValues = true;
                    var paramValue = validValue.Descendants(XName.Get("ParameterValue", xmlns));
                    foreach (var param in paramValue)
                    {
                        var vvLabel = param.Element(XName.Get("Label", xmlns));
                        var vvValue = param.Element(XName.Get("Value", xmlns));
                        var lblVal = vvLabel == null ? null : vvLabel.Value;
                        GetReportParameters(localReportParams, reportParamName, lblVal, out lrpLabel, out lrpValue);
                        paramValidValues.Add(new ParameterValidValue
                        {
                            Name = reportParamName,
                            Label = lrpLabel,
                            Value = lrpValue
                        });
                    }
                }
                rpPkg.ValidValues = paramValidValues.ToArray();
                var defaultValues = reportParam.Descendants(XName.Get("DefaultValue", xmlns));
                var paramDefaultValues = new List<String>();
                foreach (var defaultValue in defaultValues)
                {
                    var defParamValues = defaultValue.Descendants(XName.Get("Values", xmlns));
                    foreach (var defParamValue in defParamValues)
                    {
                        var dvValue = defParamValue.Element(XName.Get("Value", xmlns));
                        var val = dvValue == null ? null : dvValue.Value;
                        GetReportParameters(localReportParams, reportParamName, val, out lrpLabel, out lrpValue);
                        paramDefaultValues.Add(lrpValue);
                    }
                }
                rpPkg.DefaultValues = paramDefaultValues.ToArray();
                if (hasValidValues)
                {
                    var dataSetRefs = reportParam.Descendants(XName.Get("DataSetReference", xmlns));
                    foreach (var dataSetRef in dataSetRefs)
                    {
                        var fieldValue = dataSetRef.Element(XName.Get("ValueField", xmlns)).Value;
                        var fieldLabel = dataSetRef.Element(XName.Get("LabelField", xmlns)).Value;
                        var dataSetName = dataSetRef.Element(XName.Get("DataSetName", xmlns)).Value;
                        // Obtain the dataset from the reports data sets, matched on name
                        int idx;
                        var dataSetsLen = dataSets.SafeLength();
                        for (idx = 0; idx < dataSetsLen; idx++)
                        {
                            var queryParams = new Dictionary<String, String>();
                            if (dataSets[idx].Name == dataSetName)
                            {
                                var sqlQuery = DLUtility.Deserialize<SQLQuery>(dataSets[idx].QueryDefinition);
                                if (sqlQuery.Params.Count == 0)
                                {
                                    var args = new GetReportDataArgs { QueryDefinition = dataSets[idx].QueryDefinition };
                                    _sb.SendTimeout = TimeSpan.FromMinutes(30);
                                    var dlSvc = _sb.DataLinkV2();
                                    var rdSR = dlSvc.GetReportData(args);
                                    ExceptionsML.Check(rdSR.Error);

                                    var colLen = rdSR.Result.Columns[fieldLabel].SafeLength();
                                    for (int colIdx = 0; colIdx < colLen; colIdx++)
                                    {
                                        paramValidValues.Add(new ParameterValidValue
                                        {
                                            Name = reportParamName,
                                            Label = rdSR.Result.Columns[fieldLabel][colIdx],
                                            Value = rdSR.Result.Columns[fieldValue][colIdx] ?? String.Empty
                                        });
                                    }
                                    rpPkg.ValidValues = paramValidValues.ToArray();
                                }
                                else
                                {
                                    rpPkg.Name = reportParamName;
                                    rpPkg.ValidValues = new ParameterValidValue[0];
                                    rpPkg.IsTypeAhead = true;
                                    rpPkg.DataSetId = dataSets[idx].Id;
                                }

                            }
                        }
                    }
                    rpPkg.IsMultiValued = hasMultiValues;
                    rpPkg.AllowBlank = hasAllowBlank;
                }
                else
                {
                    var type = reportParam.Descendants(XName.Get("DataType", xmlns));
                    var values = reportParam.Descendants(XName.Get("Value", xmlns));
                    var vals = GetStandardReportParameters(localReportParams, reportParamName);
                    rpPkg.Values = vals;
                    rpPkg.Type = reportParam.Element(XName.Get("DataType", xmlns)).Value;
                }
                rpPkg.ValidValues.Sort<ParameterValidValue>((a, b) => a.Label.CompareTo(b.Label));
                reportParameterPkgs.Add(rpPkg);
            }

            return reportParameterPkgs;
        }

        private static void GetReportParameters(ReportParameterInfoCollection localReportParams, String reportParamName, String paramName, out string lrpLabel, out string lrpValue)
        {
            lrpLabel = String.Empty;
            lrpValue = String.Empty;
            if (String.IsNullOrWhiteSpace(paramName))
                paramName = reportParamName;

            var localReportParamsLen = localReportParams.SafeLength();
            for (int lrpIdx = 0; lrpIdx < localReportParamsLen; lrpIdx++)
            {
                var lrp = localReportParams[lrpIdx];
                if (lrp.Name == reportParamName)
                {
                    var vvLen = lrp.ValidValues.SafeLength();
                    for (int vvIdx = 0; vvIdx < vvLen; vvIdx++)
                    {
                        var vv = lrp.ValidValues[vvIdx];
                        if (vv.Label == paramName)
                        {
                            lrpLabel = vv.Label;
                            lrpValue = vv.Value;
                            break;
                        }
                    }
                }
            }
        }
        private static String[] GetStandardReportParameters(ReportParameterInfoCollection localReportParams, String reportParamName)
        {
            var vals = new List<String>();
            var localReportParamsLen = localReportParams.SafeLength();
            for (int lrpIdx = 0; lrpIdx < localReportParamsLen; lrpIdx++)
            {
                var lrp = localReportParams[lrpIdx];
                if (lrp.Name == reportParamName)
                {
                    var vLen = lrp.Values.SafeLength();
                    for (int idx = 0; idx < vLen; idx++)
                    {
                        vals.Add(lrp.Values[idx]);
                    }
                }
            }
            return vals.ToArray();
        }
        private String GetFormValue(String parameterName)
        {
            var values = Request.Form.GetValues(parameterName);
            var valLen = values.SafeLength();
            var value = String.Empty;
            for (int i = 0; i < valLen; i++)
            {
                value += values[i];
                if (i < valLen - 1)
                    value += ", ";
            }
            return value;
        }
        #endregion Render Controls

        #region Events
        void _submitControl_Click(object sender, EventArgs e)
        {
            RefreshReport();
        }

        void ReportViewer1_ReportRefresh(object sender, System.ComponentModel.CancelEventArgs e)
        {
            RefreshReport();
        }

        void ReportViewer1_ReportError(object sender, ReportErrorEventArgs e)
        {
            ErrorHandler(e.Exception);
        }
        #endregion Events


        private void ErrorHandler(Exception ex)
        {
            _displayError = true;
            ReportViewer1.Visible = false;
            Error.Visible = true;
            Error.Text = ex.Message;
            Functions.WriteToEventLog("Application", Constants.EVENTSOURCE_UI_WEB, ex.ToString());
        }

    }
}