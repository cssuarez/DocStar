using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Astria.UI.Web.Utility
{
    public class JQGridData
    {
        /*  
            "total": "xxx", 
            "page": "yyy", 
            "records": "zzz",
            "rows" : [
            {"id" :"1", "cell" :["cell11", "cell12", "cell13"]},
            {"id" :"2", "cell":["cell21", "cell22", "cell23"]},
            ...
            ]
         */
        public int total { get; set; }
        public int page { get; set; }
        public int records { get; set; }
        public List<JQGridRow> rows { get; set; }
        public Guid ResultId { get; set; }
    }

    public class JQGridWFData
    {
        public int total { get; set; }
        public int page { get; set; }
        public int records { get; set; }
        public Guid ResultId { get; set; }
        public List<JQGridRelatedRow> rows { get; set; }
    }
}