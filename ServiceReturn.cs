using Astria.Framework.DataContracts;

namespace Astria.UI.Web
{
    /// <summary>
    /// wrapper for return propertie
    /// </summary>
    public class ServiceReturn
    {
        /// <summary>
        /// dynamic type Result (can be any serializable object)
        /// </summary>
        public dynamic Result { get; set; }
        /// <summary>
        /// exceptions part of the return object
        /// </summary>
        public ExceptionsML BizEx { get; set; }
    }
}