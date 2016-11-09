using System;
using System.Data.SqlTypes;
using System.Globalization;

namespace Astria.UI.Web.Utility
{
    public static class ScalarTypesExtensions
    {
        public static string ToE3DateFormat(this DateTime value)
        {
            if (value == DateTime.MinValue || value == SqlDateTime.MinValue.Value)
                return string.Empty;

            // no standard formats show a two digit year and
            // custom formats are not culturally sensitive.
            // The following modifies the culturally aware short date to produce a two digit year (if four digits were present)
            var dtf = CultureInfo.CurrentUICulture.DateTimeFormat;
            string fmt = string.Concat(dtf.ShortDatePattern, ' ', dtf.ShortTimePattern);
            fmt = fmt.Replace("yyyy", "yy");
            return value.ToString(fmt);
        }
    }
}
