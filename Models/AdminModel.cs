using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Utility;

namespace Astria.UI.Web.Models
{
    public class AdminModel : ModelBase
    {
        public Boolean IsDataLinkLicensed { get; set; }
        public AdminModel()
        {
            LoadUserData();
        }
        public AdminModel(ServiceBuilder sb)
        {
            _sb = sb;
            LoadUserData();
            this.IsDataLinkLicensed = IsLicensed(TokenKey.DataLink);
        }
    }
}