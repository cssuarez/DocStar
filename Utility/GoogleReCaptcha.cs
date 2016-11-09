using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;

namespace Astria.UI.Web.Utility
{
    /// <summary>
    /// Implementation for Googles Recaptcha API
    /// Under the account DocstarDev@google.com, password is docstar Bemis's way.
    /// JS Source: <script src='https://www.google.com/recaptcha/api.js'></script>
    /// Markup Required In form tag:  <div class="g-recaptcha" data-sitekey="6LcBGg8TAAAAAOXMaOShwDwa_pSZTTeqJ8L1pA1_"></div>
    /// </summary>
    public class GoogleReCaptcha
    {
        const string _sitekey = "6LcBGg8TAAAAAOXMaOShwDwa_pSZTTeqJ8L1pA1_";
        const string _secretKey = "6LcBGg8TAAAAAMsZy-cv3jnR69fPGfLvYxiMQW3K";
        const string _apiUrl = "https://www.google.com/recaptcha/api/siteverify";

        internal static bool CanAccess()
        {
            try
            {
                var request = System.Net.WebRequest.Create("https://www.google.com/");
                request.Method = "HEAD";
                request.Timeout = (int)TimeSpan.FromSeconds(2).TotalMilliseconds;
                using (var response = request.GetResponse()) { }
                return true;
            }
            catch { }
            return false;
        }
        internal bool IsValid(string recapResponse, string ipAddress)
        {
            var webClient = new WebClient();
            var args = new NameValueCollection();
            args.Add("secret", _secretKey);
            args.Add("response", recapResponse);
            args.Add("remoteip", ipAddress);
            var resp = webClient.UploadValues(_apiUrl, args);
            var rstr = Encoding.UTF8.GetString(resp);
            var jObj = (JObject)JsonConvert.DeserializeObject(rstr);
            var successStr = jObj["success"].Value<string>();
            var success = false;
            bool.TryParse(successStr, out success);
            return success;
        }
    }
}