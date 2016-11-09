using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
namespace Astria.UI.Web.Models
{
    public class SystemNotificationEditorModel
    {
        public SystemNotification SelectedNotification { get; set; }
        public List<SystemNotification> Notifications { get; set; }

        public ExceptionsML Exception { get; set; }
    }
}