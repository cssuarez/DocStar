using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Utility;
using Newtonsoft.Json;

namespace Astria.UI.Web.Utility
{
    public class JQGridRow
    {
        public JQGridRow()
        {
        }
        public JQGridRow(SearchableEntity se)
        {
            id = se.Id.ToString();
            cell = new List<string>
                {
                    se.Id.ToString()
                };
            // For determining what type is being retrieved(doc, inbox, folder) and to display the corresponding icon
            switch (se.Type)
            {
                case 1:
                    cell.Add(se.Extension);
                    break;
                case 512:
                    cell.Add("inbox_icon");
                    break;
                case 1024:
                    cell.Add("folder_icon");
                    break;
            }
            cell.AddRange(new List<string>{se.Type.ToString(),
                    se.Title,
                    se.Created.ToE3DateFormat(),
                    se.Modified.ToE3DateFormat(),
                    se.SecurityClassId,
                    se.Keywords,
                    se.ContentTypeId,
                    JsonConvert.SerializeObject(se.DynamicFields)
                });
        }
       
        private void AddJstring(string name, string value)
        {
            var result = value;//String.Format("'{0}':'{1}'", name, value);
            cell.Add(result);
        }

        public string id { get; set; }
        public List<string> cell { get; set; }
    }

    public class JQGridRelatedRow
    {
        public string id { get; set; }
        public Dictionary<string, object> cell { get; set; }

        private void AddJstring(string name, object value)
        {
            //var result = String.Format("'{0}':'{1}'", name, value);
            if (cell == null)
                cell = new Dictionary<string, object> { { name, value } };
            else if (cell.ContainsKey(name))
                cell[name] = value;
            else
                cell.Add(name, value);
        }
        
        public JQGridRelatedRow(SearchableEntity se, Guid currentUser, String[] customFields)
        {
            id = se.Id.ToString();
            AddJstring(Constants.CN_ENTITY_ID, se.Id);

            // For determining what type is being retrieved(doc, inbox, folder) and to display the corresponding icon
            string typeIcon = se.Extension;
            switch (se.Type)
            {
                case 1:
                    typeIcon = se.Extension;
                    break;
                case 512:
                    typeIcon = "inbox_icon";
                    break;
                case 1024:
                    typeIcon = "folder_icon";
                    break;
            }
            AddJstring(Constants.SF_TYPE, typeIcon);

            AddJstring(Constants.DOCTYPE, se.Type.ToString());
            AddJstring(Constants.SF_TITLE, se.Title);
            AddJstring(Constants.SF_CREATED, se.Created.ToE3DateFormat());
            AddJstring(Constants.SF_MODIFIED, se.Modified.ToE3DateFormat());
            AddJstring(Constants.SF_SECURITYCLASS_ID, se.SecurityClassId);
            AddJstring(Constants.SF_KEYWORDS, se.Keywords);
            AddJstring(Constants.SF_CONTENTTYPE_ID, se.ContentTypeId);
            var cfs = new HashSet<String>(customFields);
            foreach (var dynamicField in se.DynamicFields)
            {
                AddJstring(dynamicField.Key, dynamicField.Value);
            }

        }
    }
}
