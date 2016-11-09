using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Astria.UI.Web.Utility
{
    public class JSTreeAttr
    {
        /// <summary>
        /// id
        /// </summary>
        public string Id { get; set; }
        /// <summary>
        /// depth
        /// </summary>
        public int Depth { get; set; }
        /// <summary>
        /// title
        /// </summary>
        public string Title { get; set; }
        /// <summary>
        /// extra data to be included for the jstree
        /// </summary>
        public dynamic Data { get; set; }
    }
}