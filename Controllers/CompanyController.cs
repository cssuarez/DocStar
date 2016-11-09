using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.UI.Web.Models;
using Astria.Framework.Utility;
using Astria.UI.Web.Utility;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts.V2;
using System.Net;
using System.Text;
using Newtonsoft.Json;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// controller to make new instances of companies
    /// </summary>
    public class CompanyController : ControllerBase
    {
        public System.Web.Mvc.ActionResult Index()
        {
            var companySvc = SvcBldr.Company();
            ExceptionsML bizEx = null;
            var companies = companySvc.GetCompanies(out bizEx);
            return View(companies);
        }

        /// <summary>
        /// fetch current company
        /// </summary>
        /// <returns></returns>
        [HttpGet()]
        public JsonResult CurrentCompany()
        {
            var companyClient = SvcBldr.Company();
            ExceptionsML bizEx = null;

            var company = companyClient.GetCurrentCompany(out bizEx);
            return Result(company, bizEx, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// fetch company by id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet()]
        public JsonResult Company(string id)
        {
            var companyClient = SvcBldr.Company();
            ExceptionsML bizEx = null;

            var company = companyClient.GetCompany(id, out bizEx);

            return Result(company, bizEx, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// Get all companies
        /// </summary>
        /// <returns></returns>
        [HttpGet()]
        public JsonResult Companies()
        {
            ExceptionsML bizEx = null;
            var companyClient = SvcBldr.Company();
            var companyClientV2 = SvcBldr.CompanyV2();
            var company = new Company() { Id = Guid.Empty, Name = Constants.i18n("newTitle"), Prefix = "AAAA" };

            var companiesSR = companyClientV2.GetCompanies();
            if (companiesSR.Error != null)
                bizEx = companiesSR.Error;

            var companies = companiesSR.Result != null? companiesSR.Result.ToList():null;
            if (companies != null)
            {
               companies.Insert(0,company);
            }
            return Result(companies, bizEx, JsonRequestBehavior.AllowGet);  
        }

        /// <summary>
        /// save a company
        /// </summary>
        /// <param name="company"></param>
        /// <param name="licenses"></param>
        /// <returns></returns>
        [HttpPost()]
        public JsonResult Company(CompanyDTO company)
        {
            ExceptionsML bizEx = null;
            var companyClient = SvcBldr.Company();
            CompanyDTO updateCompany = null;
            if (company.Id != Guid.Empty)
            {
                updateCompany = companyClient.GetCompany(company.Id.ToString(), out bizEx);
                if (bizEx != null)
                {
                    return Result(null, bizEx);
                }
                updateCompany.Name = company.Name;
            }
            else
            {
                updateCompany = company;
            }
            var result = companyClient.UpdateCompany(updateCompany, out bizEx);

            UpdateProxy();

            return Result(result, bizEx);
        }

        /// <summary>
        /// Get all instances the user can access.
        /// </summary>
        /// <returns></returns>
        [HttpGet()]
        public JsonResult GetCompanyInstances()
        {
            ExceptionsML bizEx = null;            
            var result = base.GetCompanyInstances(out bizEx);            
            return Result(result, bizEx, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets an instance as the current users default.
        /// If the user is not a member of the target instance the user is added.
        /// </summary>
        /// <param name="instanceId"></param>
        /// <returns></returns>
        public JsonResult SetDefaultInstance(string instanceId)
        {
            ExceptionsML bizEx = null;
            var hosting = SvcBldr.Hosting();
            hosting.SetDefaultContext(instanceId, out bizEx);
            return Result(null, bizEx);
        }
        /// <summary>
        /// Get defaul instance
        /// </summary>
        /// <returns></returns>
        [HttpGet()]
        public JsonResult GetDefaultCompanyInstance()
        {
            ExceptionsML bizEx = null;
            var hosting = SvcBldr.CompanyV2();//Hosting();
            var instance = hosting.GetDefaultCompanyInstance();
            return Result(instance, bizEx);
        }
    }
}
