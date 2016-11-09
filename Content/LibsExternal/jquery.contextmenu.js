/* 
    jquery WDCONTEXTMENU CONTEXT MENU PLUGIN
    http://www.web-delicious.com/jquery-plugins-demo/wdContextMenu/sample.htm
*/
(function ($) {
    function returnfalse() { return false; };

    $.fn.contextmenu = function (option) {
        // To pass the span id to show menu ...? any other way? check
        $('body').data('span', option.id);
        var eventNamespace = option.namespace ? '.' + option.namespace : '';
        var menuAlias = option.alias || "cmroot";
        option = $.extend({ alias: menuAlias, width: 150 }, option);
        var ctTargets = option.targets || '';   //scain - 11/16/15 - targets to be delegated to (same as the 'selector' parameter to jquery's .on())
        var ruleName = null, target = null,
		groups = {}, mitems = {}, actions = {}, showGroups = [],
        // Removed image tag to allow a context menu to have no icons
        // To Add icons add image paths to the icon value in ContextMenu.js, add <img src='$[icon]' align='absmiddle'/> to below line between div and span
		itemTpl = "<div class='b-m-$[type]' unselectable=on><nobr unselectable=on><span unselectable=on>$[text]</span></nobr></div>";
        //itemTpl = "<div class='b-m-$[type]' unselectable=on><nobr unselectable=on><img src='$[icon]' align='absmiddle'/><span unselectable=on>$[text]</span></nobr></div>";
        var gTemplet = $("<div/>").addClass("b-m-mpanel").attr("unselectable", "on").css("display", "none");
        var iTemplet = $("<div/>").addClass("b-m-item").attr("unselectable", "on");
        var sTemplet = $("<div/>").addClass("b-m-split");
        //build group item, which has sub items
        var buildGroup = function (obj) {
            groups[obj.alias] = this;
            this.gidx = obj.alias;
            this.id = obj.alias;
            if (obj.disable) {
                this.disable = obj.disable;
                this.className = "b-m-idisable";
            }
            $(this).width(obj.width).on('click' + eventNamespace + ' mousedown' + eventNamespace, returnfalse).appendTo($("body"));
            obj = null;
            return this;
        };
        var buildItem = function (obj) {
            var T = this;
            T.title = obj.text;
            T.idx = obj.alias;
            T.gidx = obj.gidx;
            T.data = obj;
            T.innerHTML = itemTpl.replace(/\$\[([^\]]+)\]/g, function () {
                return obj[arguments[1]];
            });
            if (obj.disable) {
                T.disable = obj.disable;
                T.className = "b-m-idisable";
            }
            obj.items && (T.group = true);
            obj.action && (actions[obj.alias] = obj.action);
            mitems[obj.alias] = T;
            T = obj = null;
            return this;
        };
        //add new items
        var addItems = function (gidx, items) {
            var tmp = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type == "splitLine") {
                    //split line
                    tmp = sTemplet.clone()[0];
                } else {
                    items[i].gidx = gidx;
                    if (items[i].type == "group") {
                        //group 
                        buildGroup.apply(gTemplet.clone()[0], [items[i]]);
                        arguments.callee(items[i].alias, items[i].items);
                        items[i].type = "arrow";
                        tmp = buildItem.apply(iTemplet.clone()[0], [items[i]]);
                    } else {
                        //normal item
                        items[i].type = "ibody";
                        tmp = buildItem.apply(iTemplet.clone()[0], [items[i]]);
                        $(tmp).on('click' + eventNamespace, function (e) {
                            if (!this.disable) {
                                if (typeof actions[this.idx] === 'function') {
                                    actions[this.idx].call(this, target);
                                }
                                hideMenuPane();
                            }
                            return false;
                        });

                    } //end if
                    $(tmp).on('contextmenu' + eventNamespace, returnfalse).on('mouseenter' + eventNamespace, overItem).on('mouseleave' + eventNamespace, outItem);
                }
                groups[gidx].appendChild(tmp);
                tmp = items[i] = items[i].items = null;
            } //end for
            gidx = items = null;
        };
        var overItem = function (e) {
            //menu item is disabled          
            if (this.disable)
                return false;
            hideMenuPane.call(groups[this.gidx]);
            //has sub items
            if (this.group) {
                var pos = $(this).offset();
                var width = $(this).outerWidth();
                showMenuGroup.apply(groups[this.idx], [pos, width]);
            }
            this.className = "b-m-ifocus";
            return false;
        };
        //menu loses focus
        var outItem = function (e) {
            //disabled item
            if (this.disable)
                return false;
            if (!this.group) {
                //normal item
                this.className = "b-m-item";
            } //Endif
            return false;
        };
        //show menu group at specified position
        var showMenuGroup = function (pos, width) {
            var bwidth = $("body").width();
            var bheight = document.documentElement.clientHeight;
            var mwidth = $(this).outerWidth();
            var mheight = $(this).outerHeight();
            pos.left = (pos.left + width + mwidth > bwidth) ? (pos.left - mwidth < 0 ? 0 : pos.left - mwidth) : pos.left + width;
            pos.top = (pos.top + mheight > bheight) ? (pos.top - mheight + (width > 0 ? 25 : 0) < 0 ? 0 : pos.top - mheight + (width > 0 ? 25 : 0)) : pos.top;
            $(this).css(pos).show();
            showGroups.push(this.gidx);
        };
        //to hide menu
        var hideMenuPane = function () {
            var alias = null;
            for (var i = showGroups.length - 1; i >= 0; i--) {
                if (showGroups[i] == this.gidx)
                    break;
                alias = showGroups.pop();
                groups[alias].style.display = "none";
                mitems[alias] && (mitems[alias].className = "b-m-item");
                //Added by Rafi on 11-10-2015 to support a call back to be called when the context menu is closed.
                if (option.onHide && typeof option.onHide === 'function') {
                    option.onHide.call(this, root);
                }
            }//Endfor
            //CollectGarbage();
        };
        function applyRule(rule) {
            if (ruleName && ruleName == rule.name)
                return false;
            for (var i in mitems)
                disable(i, !rule.disable);
            for (var i = 0; i < rule.items.length; i++)
                disable(rule.items[i], rule.disable);
            ruleName = rule.name;
        };
        function disable(alias, disabled) {
            var item = mitems[alias];
            item.className = (item.disable = item.lastChild.disabled = disabled) ? "b-m-idisable" : "b-m-item";
        };

        /* to show menu  */
        function showMenu(e, menutarget) {
            var span_in = $('body').data('span');
            target = menutarget;
            showMenuGroup.call(groups[this.id], { left: e.pageX, top: e.pageY }, 0);
            $(document).one('mousedown' + eventNamespace, hideMenuPane);
        }
        var $root = $("#" + option.alias);
        var root = null;
        if ($root.length == 0) {
            root = buildGroup.apply(gTemplet.clone()[0], [option]);
            root.applyrule = applyRule;
            root.showMenu = showMenu;
            addItems(option.alias, option.items);
        }
        else {
            root = $root[0];
        }
        var me = $(this);
        //scain - 11/16/15 -  use .on to delegate events rather than performing a .bind against every element
        me.on('contextmenu' + eventNamespace, ctTargets, function (e) {
                var bShowContext = (option.onContextMenu && typeof option.onContextMenu === 'function') ? option.onContextMenu.call(this, e) : true;
            if (bShowContext) {
                    if (option.onShow && typeof option.onShow === 'function') {
                    option.onShow.call(this, root);
                }
                root.showMenu(e, this);
            }
            return false;
        });
        //to apply rule
        if (option.rule) {
            applyRule(option.rule);
        }
        gTemplet = iTemplet = sTemplet = itemTpl = buildGroup = buildItem = null;
        addItems = overItem = outItem = null;
        //CollectGarbage();
        return {
            item: me,
            ctxRoot: root,
            options: option
        };
    }
})(jQuery);