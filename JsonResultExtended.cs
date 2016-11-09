using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Astria.UI.Web
{
    /// <summary>
    /// when plain old json result just isn't good enough :)  
    /// </summary>
    public class JsonResultExtended : JsonResult
    {
        /// <summary>
        /// encode -> make it so
        /// </summary>
        /// <param name="context"></param>
        public override void ExecuteResult(ControllerContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException("context");
            }
            var response = context.HttpContext.Response;
            response.ContentType = "application/json";

            if (this.Data != null)
            {                
                response.Write(JsonConvert.SerializeObject(this.Data));
            }
        }
    }
}