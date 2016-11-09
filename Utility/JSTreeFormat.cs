using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.LDAP;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Utility
{
    public class JSTreeFormat
    {
       /// <summary>
        /// convert to format special for jstree
        /// </summary>
        /// <param name="folderTree"></param>
        /// <returns></returns>
        public static List<JSTreeData> ConvertToJSTreeFormat(List<ContainerInfo> folderTree)
        {
            var result = new List<JSTreeData>();
            if (folderTree != null)
            {
                foreach (var item in folderTree.OrderBy(r => r.Name))
                {
                    result.Add(ConvertToJSTreeFormat(item));
                }
            }
            return result;
        }
        /// <summary>
        /// convert given structure to jstree format
        /// </summary>
        /// <param name="folderTree"></param>
        /// <returns></returns>
        public static JSTreeData ConvertToJSTreeFormat(ContainerInfo folderTree)
        {
            var length = folderTree.Children.Count;
            var result = new JSTreeData(folderTree, length);
            if (folderTree != null && folderTree.Children != null)
            {
                for (int i = 0; i < length; i++)
                {
                    result.children[i] = ConvertToJSTreeFormat(folderTree.Children[i]);
                }
            }
            return result;
        }
        /// <summary>
        /// convert given object to jstree format
        /// </summary>
        /// <param name="inboxTree"></param>
        /// <returns></returns>
        public static JSTreeData[] ConvertToJSTreeFormat(SlimEntity[] inboxTree)
        {
            var length = inboxTree == null ? 0 : inboxTree.Length;
            var result = new JSTreeData[length];
            if (inboxTree != null)
            {
                for (int i = 0; i < length; i++)
                {
                    result[i] = ConvertToJSTreeFormat(inboxTree[i]);
                }
            }
            return result;
        }
        /// <summary>
        /// convert given object to jstree format
        /// </summary>
        /// <param name="inbox"></param>
        /// <returns></returns>
        public static JSTreeData ConvertToJSTreeFormat(SlimEntity inbox)
        {
            var result = new JSTreeData(inbox);
            return result;
        }

        public static List<JSTreeData> ConvertToJSTreeFormat(List<LDAPContainer> ldapContainers)
        {
            var result = new List<JSTreeData>();
            if (ldapContainers != null)
            {
                foreach (var item in ldapContainers)
                {
                    result.Add(ConvertToJSTreeFormat(item));
                }
            }
            return result;
        }
        public static JSTreeData ConvertToJSTreeFormat(LDAPContainer ldapContainer)
        {
            var result = new JSTreeData(ldapContainer);
            return result;
        }

        public static JSTreeData[] ConvertToJSTreeFormat(Container[] containers)
        {
            var length = containers.Length;
            var results = new JSTreeData[length];
            for (int i = 0; i < length; i++)
            {
                results[i] = ConvertToJSTreeFormat(containers[i]);
            }
            return results;
        }

        public static JSTreeData ConvertToJSTreeFormat(Container container)
        {
            var result = new JSTreeData(container);
            return result;
        }
    }
}
