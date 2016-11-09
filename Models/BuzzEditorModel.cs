using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;

namespace Astria.UI.Web.Models
{
    public class BuzzEditorModel
    {
        public BuzzSpace SelectedBuzz { get; set; }
        public List<BuzzSpace> BuzzSpaces { get; set; }

        public ExceptionsML Exception { get; set; }
    }
}