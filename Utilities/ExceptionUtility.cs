using System;
using System.IO;
using System.Web;
using System.Xml;

public sealed class ExceptionUtility
{
    private ExceptionUtility()
    {
    }

    private static readonly string EXCEPTIONS_LOG_PATH = "~/App_Data/Exceptions.xml";

    private static void RebuildLog()
    {
        XmlDocument newDoc = new XmlDocument();

        XmlDeclaration decl = newDoc.CreateXmlDeclaration("1.0", "UTF-8", "yes");
        XmlElement root = newDoc.CreateElement("Exceptions");

        newDoc.AppendChild(decl);
        newDoc.AppendChild(root);

        newDoc.Save(HttpContext.Current.Server.MapPath(EXCEPTIONS_LOG_PATH));
        newDoc = null;
    }

    private static void CheckErrorLogExists()
    {
        if (System.IO.File.Exists(HttpContext.Current.Server.MapPath(EXCEPTIONS_LOG_PATH)) == false)
        {
            RebuildLog();
        }
    }

    public static void ReadExceptions()
    {
        ExceptionUtility.CheckErrorLogExists();

        try
        {
            XmlDocument doc = new XmlDocument();
            doc.Load(HttpContext.Current.Server.MapPath(EXCEPTIONS_LOG_PATH));

            HttpContext.Current.Response.ContentType = "text/xml";
            doc.Save(HttpContext.Current.Response.Output);
        }
        catch
        {
            RebuildLog();
            ReadExceptions();
        }
    }

    public static void LogException(string url, string function, string message)
    {
        ExceptionUtility.CheckErrorLogExists();

        try
        {
            XmlDocument doc = new XmlDocument();
            doc.Load(HttpContext.Current.Server.MapPath(EXCEPTIONS_LOG_PATH));

            XmlNode root = doc.DocumentElement;

            XmlElement errorNode = doc.CreateElement("Exception");

            XmlElement messageNode = doc.CreateElement("Message");
            messageNode.InnerText = message;

            XmlElement functionNode = doc.CreateElement("Function");
            functionNode.InnerText = function;

            XmlElement urlNode = doc.CreateElement("Url");
            urlNode.InnerText = url;

            XmlElement timeNode = doc.CreateElement("Time");
            timeNode.InnerText = DateTime.Now.ToString("dd MMM HH:mm:ss");

            errorNode.AppendChild(timeNode);
            errorNode.AppendChild(urlNode);
            errorNode.AppendChild(functionNode);
            errorNode.AppendChild(messageNode);

            root.AppendChild(errorNode);

            doc.Save(HttpContext.Current.Server.MapPath(EXCEPTIONS_LOG_PATH));
        }
        catch
        {
            RebuildLog();
            LogException(url, function, message);
        }
    }
}