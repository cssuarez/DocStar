using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Controller serving IP Masking for the current company instance.
    /// </summary>
    public class IPMaskController : ControllerBase
    {
        /// <summary>
        /// Gets all IP masks for the current company
        /// </summary>
        [HttpGet]
        public JsonResult GetIPMasks()
        {
            ExceptionsML bizEx;
            var client = SvcBldr.Company();
            var ipMasks = client.GetIPMasks(out bizEx);
            return Result(ipMasks, bizEx, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets an IP Mask
        /// </summary>
        public JsonResult IPMask(CompanyIPMaskDTO ipmask)
        {
            ExceptionsML bizEx;
            var client = SvcBldr.Company();
            IPList l = new IPList();

            if (!String.IsNullOrEmpty(ipmask.IPAddress))
            {
                ipmask.IPMask = BitConverter.GetBytes(l.ParseIP(ipmask.IPAddress));
            }
            if (!String.IsNullOrEmpty(ipmask.SubnetAddress))
            {
                ipmask.SubnetMask = BitConverter.GetBytes(l.ParseIP(ipmask.SubnetAddress));
            }

            ipmask = client.SetIPMask(ipmask, out bizEx);
            return Result(ipmask, bizEx);
        }
        /// <summary>
        /// Deletes an IP Mask
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult DeleteIPMask(Guid id)
        {
            var client = SvcBldr.Company();
            ExceptionsML bizEx;
            client.DeleteIPMask(id, out bizEx);
            return Result(null, bizEx);
        }
        /// <summary>
        /// Adds Ip masks based on one or more criteria.
        /// </summary>
        /// <param name="Single_IP">Adds a single IP as a restriction</param>
        /// <param name="Cidr_IP">Adds a range of IPs as a restriction based on CIDR notation</param>
        /// <param name="Sub_IP">Adds a range of IPs as a restriction based on Sub_SubNet</param>
        /// <param name="Sub_Subnet">Adds a range of IPs as a restriction based on Sub_IP</param>
        /// <param name="Start_IP">Adds a range of IPs as a restriction using End_IP as the Upper bound</param>
        /// <param name="End_IP">Adds a range of IPs as a restriction using Start_IP as the Lower bound</param>
        /// <param name="IP_Allowed">Bool indicating adds are Allow IPs or Denied IPs</param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult AddIPMasks(string Single_IP, string Cidr_IP, string Sub_IP, string Sub_Subnet, string Start_IP, string End_IP, bool IP_Allowed)
        {
            ExceptionsML bizEx;
            var client = SvcBldr.Company();

            IPList l = new IPList();
            if (!String.IsNullOrEmpty(Single_IP))
                l.Add(Single_IP);
            if (!String.IsNullOrEmpty(Cidr_IP))
            {
                var parts = Cidr_IP.Split(new char[] { '/' });
                l.Add(parts[0], int.Parse(parts[1]));
            }
            if (!String.IsNullOrEmpty(Sub_IP) && !String.IsNullOrEmpty(Sub_Subnet))
                l.Add(Sub_IP, Sub_Subnet);
            if (!String.IsNullOrEmpty(Start_IP) && !String.IsNullOrEmpty(End_IP))
                l.AddRange(Start_IP, End_IP);

            foreach (var item in l.GetRanges())
            {
                var mask = new CompanyIPMaskDTO() { IPMask = item.Key, SubnetMask = item.Value, Allowed = IP_Allowed };
                client.SetIPMask(mask, out bizEx);
                if (bizEx != null)
                {
                    return Result(null, bizEx);
                }
            }
            return GetIPMasks();

        }
        /// <summary>
        /// Gets a list of IPs that are used in the allowance of a connection comparison.
        /// </summary>
        [HttpPost]
        public JsonResult TestIP(string ipAddress)
        {
            ExceptionsML bizEx;
            var client = SvcBldr.Company();
            var ipMasks = client.GetIPMasks(out bizEx);
            var result = new { message = Constants.i18n("testIPSuccess"), restricted = false };
            if (bizEx != null)
            {
                return Result(null, bizEx);
            }
            if (IPRestricted(ipAddress, ipMasks))
            {
                result = new { message = Constants.i18n("testIPFailure"), restricted = true };
            }
            return Result(result, null);
        }

        private bool IPRestricted(string ipAddress, List<CompanyIPMaskDTO> restrictions)
        {
            //Rules: 
            //Has Allowed List Only:        Only Allowed if on list.
            //Has Denied List Only:         Only Allowed if not on List.
            //Has Both Lists:               Only Allowed if on Allowed list and not in denied list.
            bool isAllowed = true;
            bool hasAllowed = false;
            bool hasDenied = false;
            if (restrictions.Count() > 0)
            {
                IPList allowed = new IPList();
                foreach (var item in restrictions.Where(r => r.Allowed))
                {
                    hasAllowed = true;
                    allowed.Add(BitConverter.ToUInt32(item.IPMask, 0), BitConverter.ToUInt32(item.SubnetMask, 0));
                }
                IPList denied = new IPList();
                foreach (var item in restrictions.Where(r => !r.Allowed))
                {
                    hasDenied = true;
                    denied.Add(BitConverter.ToUInt32(item.IPMask, 0), BitConverter.ToUInt32(item.SubnetMask, 0));
                }
                if (hasDenied)
                {
                    isAllowed = !denied.CheckNumber(ipAddress);
                }
                if (hasAllowed && isAllowed)
                {
                    isAllowed = allowed.CheckNumber(ipAddress);
                }
            }
            return !isAllowed;
        }

    }
}
