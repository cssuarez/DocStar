using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;

namespace Astria.UI.Web.Models
{
    public class PromptPasswordModel
    {
        public ExceptionsML Error { get; set; }
        public string Message { get; set; }
    }
}