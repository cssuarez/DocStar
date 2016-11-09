using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.IO;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.UI.ServiceInterop;
using Astria.Framework.Utility;
using System.Web.Script.Serialization;
using Astria.Framework.OperationContracts.V2Services;
using Astria.UI.Web.Utility;
using Newtonsoft.Json;

namespace Astria.UI.Web.Models
{
    /// <summary>
    /// Acquire model
    /// </summary>
    public class AcquireModel : ModelBase
    {
        private IBulkData _bulkData;
        private IFileTransfer _fileClient = null;
        private IDocument _docClient = null;
        private Framework.OperationContracts.V2Services.IContentType _ctClient;

        public string ContentTypeDefInboxes { get; set; }
        public string ContentTypeDefWorkflows { get; set; }
        /// <summary>
        /// Id of Model's View (represented as an iframe)
        /// </summary>
        public string IframeId { get; set; }
        /// <summary>
        /// Title
        /// </summary>
        public string Title { get; set; }
        /// <summary>
        /// Content type id
        /// </summary>
        public string ContentType { get; set; }
        /// <summary>
        /// content types
        /// </summary>
        public ContentType[] ContentTypes { get; set; }
        /// <summary>
        /// inbox id
        /// </summary>
        public string Inbox { get; set; }
        /// <summary>
        /// inboxes
        /// </summary>
        public SlimEntity[] Inboxes { get; set; }
        /// <summary>
        /// workflow id
        /// </summary>
        public string Workflow { get; set; }
        /// <summary>
        /// Workflows
        /// </summary>
        public SlimEntity[] Workflows { get; set; }
        /// <summary>
        /// Keywords
        /// </summary>
        public string Keywords { get; set; }
        /// <summary>
        /// SecurityClass
        /// </summary>
        public string SecurityClass { get; set; }
        /// <summary>
        /// SecurityClasses
        /// </summary>
        public SlimEntity[] SecurityClasses { get; set; }
        /// <summary>
        /// Folders
        /// </summary>
        public string Folders { get; set; }
        /// <summary>
        /// Create As Draft or Published
        /// </summary>
        public string IsDraft { get; set; }
        /// <summary>
        /// Message
        /// </summary>
        public new string Message { get; set; }
        /// <summary>
        /// Client Service Installation location
        /// </summary>
        public string ClientServiceUri { get; set; }
        /// <summary>
        /// Navigator Plugin Installation location
        /// </summary>
        public string NavigatorPlugin { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string DocumentId { get; set; }
        /// <summary>
        /// 
        /// </summary>
        public string VersionComment { get; set; }
        /// <summary>
        /// 
        /// </summary>
        public string RemainAsDraft { get; set; }
        /// <summary>
        /// 
        /// </summary>
        public string RestartWorkflow { get; set; }
        /// <summary>
        /// For checking in files 
        /// </summary>
        public string NewDraftOwnerId { get; set; }


        public AcquireModel()
        {
        }

        public AcquireModel(ServiceBuilder sb)
        {
            _sb = sb;
        }
        /// <summary>
        /// initialize the model
        /// </summary>
        public void InitModel()
        {
            LoadServices();
            LoadData();
        }
        private void LoadData()
        {
            var importData = _bulkData.GetImportData();
            if (!ErrorHandler(businessException: importData.Error))
            {
                Message = Constants.i18n("noContentTypesAvailable");
                return;
            }

            ClientServiceUri = importData.Result.ClientServiceURI;
            NavigatorPlugin = importData.Result.NavigatorPluginURI;
            ContentTypes = importData.Result.ContentTypes;

            if (ContentTypes == null)
                ContentTypes = new ContentType[0];

            if (ContentTypes.Length == 0)
                Message = Constants.i18n("noContentTypesAvailable");

            var ctibx = ContentTypes.Where(r => r.DefaultInboxId.HasValue).ToDictionary(k => k.Id.ToString(), v => v.DefaultInboxId.Value.ToString());
            var ctwf = ContentTypes.Where(r => r.DefaultWorkflowId.HasValue).ToDictionary(k => k.Id.ToString(), v => v.DefaultWorkflowId.Value.ToString());
            ContentTypeDefInboxes = JsonConvert.SerializeObject(ctibx);
            ContentTypeDefWorkflows = JsonConvert.SerializeObject(ctwf);

            SecurityClasses = importData.Result.SecurityClasses;

            var length = importData.Result.Inboxes.Length + 1;
            Inboxes = new SlimEntity[length];
            for (int i = 1; i < length; i++)
            {
                Inboxes[i] = importData.Result.Inboxes[i - 1];
            }
            Inboxes[0] = new SlimEntity(Guid.Empty, " ", PermissionType.Full);
 
            length = importData.Result.Workflows.Length + 1;
            Workflows = new SlimEntity[length];
            for (int i = 1; i < length; i++)
            {
                Workflows[i] = importData.Result.Workflows[i - 1];
            }
            Workflows[0] = new SlimEntity(Guid.Empty, " ", PermissionType.Full);
        }
        /// <summary>
        /// upload files
        /// </summary>
        /// <param name="files"></param>
        public void UploadFiles(IEnumerable<HttpPostedFileBase> files)
        {
            try
            {
                if (files == null || files.Count() == 0)
                    throw new Exception(Constants.i18n("noFiles"));
                if (String.IsNullOrWhiteSpace(ContentType))
                    throw new Exception(Constants.i18n("contentTypeRequired"));

                foreach (var file in files)
                {
                    if (file.ContentLength > 0)
                    {
                        var fileName = UploadFile(file);
                        CreateDocument(fileName, !String.IsNullOrWhiteSpace(Title)? Title: Path.GetFileName(file.FileName));
                    }
                }
                Message = Constants.i18n("success");
            }
            catch (Exception ex) { ErrorHandler(ex); Message = ex.Message; }

        }
        private void LoadServices()
        {
            _sb.Options = ServiceRequestOptions.NotifyVerbosely;
            _fileClient = _sb.FileTransferV2();
            _bulkData = _sb.BulkDataV2();
            _docClient = _sb.DocumentV2();
            _ctClient = _sb.ContentTypeV2();
        }
        private string UploadFile(HttpPostedFileBase file)
        {
            string fileName = String.Format("{0}{1}", Guid.NewGuid(), Path.GetExtension(file.FileName));

            byte[] fs = new byte[file.InputStream.Length];
            file.InputStream.Read(fs, 0, fs.Length);

            Astria.Framework.OperationContracts.RemoteFileHandler.UploadFile(fileName, fs, _fileClient);

            return fileName;
        }
        private void CreateDocument(string uploadId, string title)
        {
            var uid = AstriaCookie.GetUserId();
            var docId = Functions.NewSeq();
            var createPkg = new DocumentCreatePackage
            {
                Document = new Document { ContentTypeId = new Guid(ContentType), CreatedOn = DateTime.Now, Id = docId },
                ContentItems = new ContentItem[] { new ContentItem { CreatedBy = uid, CreatedOn = DateTime.Now, FileName = uploadId, Id = Functions.NewSeq(), ModifiedBy = uid, PageOrder = 0 } },
                Version = new DocumentVersion { CreatedBy = uid, CreatedOn = DateTime.Now, DocumentId = docId, Id = Functions.NewSeq(), Title = title, Keywords = Keywords, CurrentState = DocumentStatus.Published }
            };
            if (!String.IsNullOrWhiteSpace(IsDraft))
                createPkg.IsDraft = Convert.ToBoolean(IsDraft);

            createPkg.SaveOptions.AddToDistributedQueue = true;
            createPkg.SaveOptions.DQPriorityOffset = 1;

            createPkg.Document.SecurityClassId = String.IsNullOrWhiteSpace(SecurityClass) ? null : new Guid?(new Guid(SecurityClass));

            if (!String.IsNullOrWhiteSpace(Inbox))
            {
                createPkg.InboxId = new Guid(Inbox);
            }
            if (!String.IsNullOrWhiteSpace(Folders))
            {
                var folders = Folders.Split(',');
                createPkg.FolderIds = folders.Select(r => new Guid(r)).ToArray();
            }
            if (!String.IsNullOrWhiteSpace(Workflow))
            {
                createPkg.WorkflowId = new Guid(Workflow);
            }

            var sr = _docClient.Create(createPkg);

            if (sr.Error != null)
                throw new Exception(sr.Error.Message);
        }
    }
}