using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Script.Serialization;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.LDAP;
using Astria.UI.Web.Controllers;
using Astria.Framework.DataContracts.V2;
using Newtonsoft.Json;

namespace Astria.UI.Web.Utility
{

    /// <summary>
    /// Class to represent JSTree JSON_DATA format.
    /// </summary>
    public class JSTreeData
    {
        /*JSTree Data Structure:
        
        "data" : "node_title", 
        "attr" : { "id" : "node_identificator", "some-other-attribute" : "attribute_value" }, 
        "state" : "closed", // or "open" or "leaf", defaults to "closed"
        "children" : [ an array of child nodes objects ] 
         */
        /// <summary>
        /// state enum for jstree
        /// </summary>
        public enum State
        {
            /// <summary>
            /// Node is closed
            /// </summary>
            closed,
            /// <summary>
            /// Node is opened
            /// </summary>
            open,
            /// <summary>
            /// Node is a leaf with no children
            /// </summary>
            leaf
        }
        /// <summary>
        /// data
        /// </summary>
        public string data { get; set; }
        /// <summary>
        /// attr
        /// </summary>
        public JSTreeAttr attr { get; set; }
        /// <summary>
        /// metadata (added as a data property on DOM elements)
        /// </summary>
        public dynamic metadata { get; set; }
        /// <summary>
        /// state
        /// </summary>
        public string state { get; set; }
        /// <summary>
        /// children
        /// </summary>
        public JSTreeData[] children { get; set; }
        /// <summary>
        /// jstreedata
        /// </summary>
        /// <param name="NodeName"></param>
        /// <param name="initalState"></param>
        public JSTreeData(String NodeName, State initalState = State.open)
        {
            data = NodeName;
            attr = new JSTreeAttr() { Id = ContainerController.ROOTNODE, Depth = 1, Title = NodeName };
            state = initalState.ToString();
            children = new JSTreeData[0];
        }
        /// <summary>
        /// jstreedata
        /// </summary>
        /// <param name="folder"></param>
        /// <param name="initalState"></param>
        public JSTreeData(ContainerInfo folder, Int32 childrenLength, State initalState = State.closed)
        {
            data = folder.Name;
            attr = new JSTreeAttr() { Id = "jstree-" + folder.Id.ToString(), Depth = 1, Title = folder.Name };
            state = initalState.ToString();
            metadata = new
            {
                EffectivePermissions = folder.EffectivePermissions
            };
            children = new JSTreeData[childrenLength];
        }
        /// <summary>
        /// jstreedata
        /// </summary>
        /// <param name="inbox"></param>
        /// <param name="initalState"></param>
        public JSTreeData(SlimEntity inbox, State initalState = State.leaf)
        {
            data = inbox.Name;
            attr = new JSTreeAttr() { Id = "jstree-" + inbox.Id.ToString(), Title = inbox.Name };
            state = initalState.ToString();
            metadata = new
            {
                EffectivePermissions = inbox.EffectivePermissions,
            };
            children = new JSTreeData[0];
        }
        /// <summary>
        /// jstreedata ldap containers
        /// </summary>
        /// <param name="ldapContainer"></param>
        /// <param name="initialState"></param>
        public JSTreeData(LDAPContainer ldapContainer, State initialState = State.closed)
        {
            data = ldapContainer.AccountName;
            attr = new JSTreeAttr() { Id = ldapContainer.DistinguishedName, Data = JsonConvert.SerializeObject(ldapContainer), Title = ldapContainer.AccountName };
            state = initialState.ToString();
            children = new JSTreeData[0];
        }

        public JSTreeData(Container container, State initialState = State.closed)
        {
            data = container.Name;
            attr = new JSTreeAttr() { Id = "jstree-" + container.Id.ToString(), Depth = 1, Title = container.Name };
            metadata = new
            {
                EffectivePermissions = container.EffectivePermissions,
            };
            state = initialState.ToString();
            children = new JSTreeData[0];
        }
    }
}