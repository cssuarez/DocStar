using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Utility;
using System.IO;
using Astria.Framework.OperationContracts;

namespace Astria.UI.Web.Models
{
    /// <summary>
    /// 
    /// </summary>
    public class PrintModel : ModelBase
    {
        private ServiceBuilder _sb;
        /// <summary>
        /// These should be relative paths from the Root/Source as are recognized within GetFile.ashx
        /// </summary>
        public List<String> Paths { get; set; }
        public PrintModel(ServiceBuilder sb)
        {
            _sb = sb;
            Paths = new List<string>();
        }
    }
}