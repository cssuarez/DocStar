using Microsoft.Ajax.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Optimization;

namespace Astria.UI.Web.Utility
{
    public class CustomScriptBundle : Bundle
    {
        public CustomScriptBundle(string virtualPath)
            : this(virtualPath, null)
        {
        }

        public CustomScriptBundle(string virtualPath, string cdnPath)
            : base(virtualPath, cdnPath, null)
        {
            this.ConcatenationToken = ";" + Environment.NewLine;
            this.Builder = new CustomBundleBuilder();
        }
    }


    public class CustomBundleBuilder : IBundleBuilder
    {
        internal static string ConvertToAppRelativePath(string appPath, string fullName)
        {
            return (string.IsNullOrEmpty(appPath) || !fullName.StartsWith(appPath, StringComparison.OrdinalIgnoreCase) ? fullName : fullName.Replace(appPath, "~/")).Replace('\\', '/');
        }

        public string BuildBundleContent(Bundle bundle, BundleContext context, IEnumerable<BundleFile> files)
        {
            if (files == null)
                return string.Empty;
            if (context == null)
                throw new ArgumentNullException("context");
            if (bundle == null)
                throw new ArgumentNullException("bundle");

            StringBuilder stringBuilder = new StringBuilder();
            foreach (BundleFile bundleFile in files)
            {
                bundleFile.Transforms.Add(new CustomJsMinify());
                stringBuilder.Append(bundleFile.ApplyTransforms());
                stringBuilder.Append(bundle.ConcatenationToken);
            }

            return stringBuilder.ToString();
        }
    }

    public class CustomJsMinify : IItemTransform
    {
        static HashSet<String> _ignoreMinify = new HashSet<string> { "tinymce.min.js", "css.js", "goog.math.long.js", "jpicker.js", "jquery.jstree.js", "jquery.scrollto.js", "jquery.signalr.js", "jquery.ui.js", "jquery.ui.touch-punch.js", "jquery.wysiwyg.js", "json.js", 
            "wysiwyg.colorpicker.js", "wysiwyg.image.js", "wysiwyg.link.js", "wysiwyg.table.js", "jquery.json-2.3.js", "jquery.jsplumb.js", "jquery.qtip.js", "a_underscore.js", "backbone.js", "dot.js" };

        public string Process(string includedVirtualPath, string input)
        {
            if (includedVirtualPath.EndsWith("min.js", StringComparison.OrdinalIgnoreCase) || _ignoreMinify.Contains(System.IO.Path.GetFileName(includedVirtualPath).ToLower()))
            {
                return input;
            }

            Minifier minifier = new Minifier();
            var codeSettings = new CodeSettings();
            codeSettings.EvalTreatment = EvalTreatment.MakeImmediateSafe;
            codeSettings.PreserveImportantComments = false;

            string str = minifier.MinifyJavaScript(input, codeSettings);

            if (minifier.ErrorList.Count > 0)
                return "/* " + string.Concat(minifier.Errors) + " */";

            return str;
        }
    }
}