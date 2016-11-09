using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Runtime.Caching;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.UI.Web.Models;
using Astria.UI.Web.Utility;
using Newtonsoft.Json;
using Astria.Framework.DataContracts.V2;
using System.Web;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used for displaying containers
    /// </summary>
    public class ImagingController : ControllerBase
    {
        /// <summary>
        /// Provides a page for printing a document.
        /// </summary>
        [HttpGet]
        public System.Web.Mvc.ActionResult PrintDocument(string dlId)
        {
            var printModel = new PrintModel(SvcBldr);
            printModel.ServerURI = GetServerURI();

            var array = dlId.Split('|');
            if (array.Length >= 2)
            {
                string commonPath = array[0];
                for (int i = 1; i < array.Length; i++)
                    printModel.Paths.Add(Path.Combine(commonPath, array[i]));

                var docClient = SvcBldr.DocumentV2();
            }
            return View(printModel);
        }
        public System.Web.Mvc.ActionResult PrintServerDocument()
        {
            return View();
        }
    }

}
