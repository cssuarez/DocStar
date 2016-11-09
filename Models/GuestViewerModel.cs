using Astria.Framework.DataContracts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts.V2;
using Newtonsoft.Json;
using System.Web.Configuration;
using System.Configuration;
using Astria.Framework.Utility;
using Newtonsoft.Json.Linq;

namespace Astria.UI.Web.Models
{    public class GuestViewerModel : ModelBase
    {
        private ServiceBuilder _svcBldr;
        public CompanyInstance[] Instances { get; set; }
        public String CompanyName { get; set; }
        public string BulkData { get; set; }
        public string CurrentUser { get; set; }
        public string CommonTemplates { get; set; }
        public string SystemPreferences { get; set; }
        public int MaxRequestLength { get; set; }
        public string Version { get; set; }
        public List<TokenKey> Licenses { get; set; }
        public User User { get; set; }
        public string EncryptedToken { get; set; }
        public string Options { get; set; }

        public GuestViewerModel(ServiceBuilder svcBldr)
        {
            _svcBldr = svcBldr;
        }
        internal void Load(string baseUri, ProxyAuthRequestResult par)
        {
            _svcBldr.Token = par.Token;
            EncryptedToken = par.Token;
            Options = par.Arguments;

            var svc = _svcBldr.BulkDataV2();
            var sr = svc.GetBulkGuestData();
            ExceptionsML.Check(sr.Error);
            var result = sr.Result;
            BulkData = JsonConvert.SerializeObject(sr);
            if (result.LicenseTokens != null)
                Licenses = new List<TokenKey>((result.LicenseTokens));

            User = result.CurrentUser;
            CurrentUser = JsonConvert.SerializeObject(new { Name = result.CurrentUser.Username, Id = result.CurrentUser.Id });
            CompanyName = result.CompanyName;

            HttpRuntimeSection httpRuntimeSection = ConfigurationManager.GetSection("system.web/httpRuntime") as HttpRuntimeSection;
            MaxRequestLength = httpRuntimeSection.MaxRequestLength;
            IsReadOnlyUser = result.CurrentUser.ReadOnlyUser;
            Version = Functions.GetVersion();
            SystemPreferences = JsonConvert.SerializeObject(result.CompanySettings);
            var views = GetCachedViews(baseUri);
            CommonTemplates = JsonConvert.SerializeObject(views);
        }
    }
}