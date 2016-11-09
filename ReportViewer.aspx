<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="ReportViewer.aspx.cs" Inherits="Astria.UI.Web.ReportViewer" %>

<%@ Register Assembly="Microsoft.ReportViewer.WebForms, Version=12.0.0.0, Culture=neutral, PublicKeyToken=89845dcd8080cc91" Namespace="Microsoft.Reporting.WebForms" TagPrefix="rsweb" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title></title>
    <%-- Only obtain js files and css and render the parameters, if the query string doesn't contain the getParameters value --%>
    <% if(Request.QueryString["getParameters"] != "getParameters") { %> 
    <%{ Response.Write(System.Web.Optimization.Styles.Render("~/Content/css/reportscss")); }%>
    <% } %>
</head>
<body>
    <input type="hidden" id="useSSL" value="<%{ Response.Write(Request.IsSecureConnection.ToString()); }%>" />
    <input type="hidden" id="BaseURI" value="<%{ Response.Write(System.Web.Mvc.UrlHelper.GenerateContentUrl("~", new HttpContextWrapper(HttpContext.Current))); }%>" />
    <input type="hidden" id="LoginURI" value="<%{ Response.Write(Astria.Framework.Utility.Functions.GetAuthenticationProxyUrl()); }%>" />
    <input type="hidden" id="ServerVD" value="<%{ Response.Write(Astria.Framework.Utility.Functions.GetSetting(Astria.Framework.Utility.Constants.SERVER_VD, "/FusionServer")); }%>" />
    <% if(Request.QueryString["getParameters"] != "getParameters") { %> 
    <%{ Response.Write(System.Web.Optimization.Scripts.Render("~/reportsjs")); }%>
    <% } %>
    <form id="reportForm" runat="server">
        <asp:ScriptManager runat="server"></asp:ScriptManager>
        <%-- Add Parameter controls to the below div --%>
        <div class="fullHeight fullWidth inlineblock overflowHidden">
            <asp:PlaceHolder ID="PlaceHolderReportData" runat="server"></asp:PlaceHolder>
            <asp:PlaceHolder ID="PlaceHolderParameterData" runat="server"></asp:PlaceHolder>
            <asp:PlaceHolder ID="PlaceHolderParameters" runat="server"></asp:PlaceHolder>
            <asp:Label ID="Error" runat="server" Visible="false" CssClass="warningErrorClass"></asp:Label>
            <input type="hidden" name="error" />
            <rsweb:ReportViewer ID="ReportViewer1" runat="server" Width="100%" Height="100%"></rsweb:ReportViewer>
        </div>
    </form>
    <% if(Request.QueryString["getParameters"] != "getParameters") { %> 
        <script type="text/javascript">    
            $(document).ready(function () {
                var reportViewerClientId = '<%=ReportViewer1.ClientID%>';
                var rv = ReportViewer();
                rv.initialize({ reportViewerClientId: reportViewerClientId });
                rv.render();
            });
        </script>
      <% } %>
</body>
</html>
