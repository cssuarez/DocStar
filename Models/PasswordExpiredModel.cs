using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.IO;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.UI.ServiceInterop;
using Astria.Framework.Utility;
using System.Web.Script.Serialization;
using Astria.UI.Web.Utility;
using Astria.Framework.Hosting.OperationContracts;
namespace Astria.UI.Web.Models
{
    public class PasswordExpiredModel : ModelBase
    {
        public Boolean PasswordStrengthEnforcement { get; set; }
        public String LoginMessage { get; set; }

        public PasswordExpiredModel()
        {
        }

        public PasswordExpiredModel(ServiceBuilder sb)
        {
            _sb = sb;
        }

        public void InitModel()
        {
            LoadData();
        }

        private void LoadData()
        {
            var userV2 = _sb.UserV2();
            var settings = userV2.GetPasswordManagementSetting();
            if (settings.Result != null)
            {
                PasswordStrengthEnforcement = settings.Result.EnforceStrongPassword;
            }

        }
    }
}