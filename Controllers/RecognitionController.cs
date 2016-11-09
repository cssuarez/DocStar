using System;

using System.IO;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using System.Collections.Generic;
using Astria.Framework.DataContracts.Imaging;
using System.Drawing;
using System.Drawing.Imaging;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts.V2;
using Newtonsoft.Json;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used for getting OCR Data
    /// </summary>
    public class RecognitionController : ControllerBase
    {
        /// <summary>
        /// Gets OCR Data
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetRecognitionData(string versionId, string pageId, float x1, float y1, float width, float height, string lassoType, string recognitionOptions, int rotation)
        {
            Guid docVersId = new Guid(versionId);
            Guid docPageId = new Guid(pageId);
            var docClient = SvcBldr.DocumentV2();
            if (lassoType.ToLower() == "ocr")
            {
                var sr = docClient.RecogniseText(new RecognisePackage { VersionId = docVersId, PageId = docPageId, Height = height, Top = y1, Left = x1, Width = width, Rotate = rotation });
                return Result(sr.Result, sr.Error, JsonRequestBehavior.AllowGet);
            }
            else
            {
                Dictionary<string, object> settings = JsonConvert.DeserializeObject<Dictionary<string, object>>(recognitionOptions);
                var sr = docClient.RecogniseBarcode(new RecognisePackage { VersionId = docVersId, PageId = docPageId, Height = height, Top = y1, Left = x1, Width = width, Settings = settings }); // intentionally ignores rotation
                var oneString = "";
                if (sr.Result != null)
                    oneString = string.Join(Environment.NewLine, sr.Result);
                return Result(oneString, sr.Error);
            }
        }
    }
}
