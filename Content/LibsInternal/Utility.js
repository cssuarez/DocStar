// General Utility File
var Utility = {
    titleCounter: 0,
    cache: {},
    valueTags: { 'input': true, 'option': true/*,'textarea':true*/ },
    clearAllSelectedText: function () {
        if (window.getSelection) {
            var s = window.getSelection();
            if (s && s.removeAllRanges) {
                s.removeAllRanges();
            } else if (s && s.empty) {
                s.empty();
            }
        }
    },
    // Wrap elements children with an element
    wrapInner: function (toBeWrapped, wrapWith) {
        var children = toBeWrapped.children;
        var idx = 0;
        var length = children.length;
        for (idx = 0; idx < length; idx++) {
            wrapWith.appendChild(children[idx]);
            idx--;
            length--;
        }
        toBeWrapped.innerHTML = '';
        toBeWrapped.appendChild(wrapWith);
        return toBeWrapped;
    },
    // Obtain class of a dom element, without jquery
    hasClass: function (element, cls) {
        return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
    },
    //Use when you have a value to be displayed in html that has characters you want to be escaped (IG html tags, script tags, non-printable characters).
    setElementClass: function (node, nodeClass) {
        if (!node) {
            Utility.log('"node" does not exist for Utility.setElementClass'); // This should never occur in production. It is a development issue
            return; // don't attempt to set a class on a non existent node
        }
        var elClass = node.getAttribute('class') || '';
        if (elClass) {
            elClass += ' ' + nodeClass;
        }
        else {
            elClass = nodeClass;
        }
        node.setAttribute('class', elClass);
    },
    setElementStyle: function (node, cssProperty, cssValue) {
        if (!node) {
            Utility.log('"node" does not exist for Utility.setElementStyle'); // This should never occur in production. It is a development issue
            return; // don't attempt to set a class on a non existent node
        }
        var elCss = node.getAttribute('style') || '';
        elCss += cssProperty + ': ' + cssValue + ';';
        node.setAttribute('style', elCss);
    },
    ///<summary>
    /// Determine the width of the vertical scrollbar
    /// Taken from - http://benalman.com/projects/jquery-misc-plugins/#scrollbarwidth - and modified
    /// </summary>
    getScrollbarWidth: function () {
        if (Utility.scrollbarWidth === undefined) {
            var container = document.createElement('div');
            container.className = 'scrollbarWidthCalculation';
            var child = document.createElement('div');
            container.appendChild(child);
            $('body').append(container);
            Utility.scrollbarWidth = $(child).innerWidth() - $(child).height(99).innerWidth();
            container.parentNode.removeChild(container);
        }
        return Utility.scrollbarWidth;
    },
    ///<summary>
    /// Determine if the vertical scrollbar is present or not 
    ///</summary>
    hasVerticalScrollbar: function ($elem) {
        $elem = $($elem);   // just in case it isn't wrapped in jquery
        if (!$elem || $elem.length === 0) {
            return false;
        }
        var elem = $elem.get(0);
        return elem.scrollHeight > elem.clientHeight;
    },
    ///<summary>
    /// Determine if the horizontal scrollbar is present or not 
    ///</summary>
    hasHorizontalScrollbar: function ($elem) {
        $elem = $($elem);   // just in case it isn't wrapped in jquery
        if (!$elem || $elem.length === 0) {
            return false;
        }
        var elem = $elem.get(0);
        return elem.scrollWidth > $elem.width();
    },
    safeHtmlValue: function (value, options) {
        options = options || {};
        var container = document.createElement('div');
        if (!options.tag) {
            options.tag = "span";
        }
        var el = document.createElement(options.tag);
        if (options['class']) {
            Utility.setElementClass(el, options['class']);
        }
        if (options.attrs) {
            var attr;
            for (attr in options.attrs) {
                if (options.attrs.hasOwnProperty(attr) && options.attrs[attr] !== undefined) {
                    el.setAttribute(attr, options.attrs[attr]);
                }
            }
        }
        if (options.css) {
            var s;
            for (s in options.css) {
                if (options.css.hasOwnProperty(s) && options.css[s] !== undefined) {
                    Utility.setElementStyle(el, s, options.css[s]);
                }
            }
        }
        if (value === undefined || value === null) { // explicitly check for undefined / null because something like "value || ''" would convert 0 to empty string
            value = '';
        }
        if (Utility.valueTags[options.tag]) {
            el.setAttribute('value', value);//val sets the property value not the attribute value, we need the latter for this case.
        }
        else {
            el.textContent = value;
        }
        if (options.text) {
            el.textContent = options.text;
        }
        container.appendChild(el);
        return container.innerHTML;
    },
    safeHtmlString: function (value) {
        return _.escape(value);
    },
    // tryParseJSON: symmetrical with JSON.stringify() except for stringify(undefined), for which this method will return false rather than undefined.
    tryParseJSON: function (jsonString, testIfEmpty) { // returns false on an empty object if testIfEmpty is true; null counts as an empty object
        try {
            if (typeof (jsonString) === 'string') { // this type check rejects numbers, bools, undefined, null (and other objects); no additional check needed for any
                var o = JSON.parse(jsonString);
                if (testIfEmpty && typeof o === "object" && $.isEmptyObject(o)) {
                    return false;
                }
                return o;
            }
        }
        catch (e) {
            Utility.OutputToConsole(e);
        }

        return false;
    },
    hasFlag: function (flagToCheck, flaggedEnum) {
        flagToCheck = goog.math.Long.fromNumber(flagToCheck);
        flaggedEnum = goog.math.Long.fromNumber(flaggedEnum);
        return flaggedEnum.equals(flagToCheck.and(flaggedEnum));
    },
    longOr: function (flagToCheck, flaggedEnum, asLong) {
        flagToCheck = goog.math.Long.fromNumber(flagToCheck);
        flaggedEnum = goog.math.Long.fromNumber(flaggedEnum);
        var oredValue = flaggedEnum.or(flagToCheck);
        if (!asLong) {
            oredValue = oredValue.toNumber();
        }
        return oredValue;
    },
    longAnd: function (flagToCheck, flaggedEnum, asLong) {
        num = goog.math.Long.fromNumber(num);
        flaggedEnum = goog.math.Long.fromNumber(flaggedEnum);
        var andedValue = flaggedEnum.and(flagToCheck);
        if (!asLong) {
            andedValue = andedValue.toNumber();
        }
        return andedValue;
    },
    //TODO: replace checkSAT, checkGP, and checkSP with hasFlag
    checkSAT: function (num, permString) {
        return Utility.hasFlag(num, permString);
    },
    /*
        num: number to test
        permString: constant to test against
    */
    checkGP: function (num, permString) {
        return Utility.hasFlag(num, permString);
    },
    /*
        num: number to test
        permString: constant to test against
    */
    checkSP: function (num, permString) {
        return Utility.hasFlag(num, permString);
    },
    removeP: function (num, permString) {
        num = goog.math.Long.fromNumber(num);
        permString = goog.math.Long.fromNumber(permString);
        var nottedValue = num.and(permString.not());
        if (!asLong) {
            nottedValue = nottedValue.toNumber();
        }
        return nottedValue;
    },
    containsGuid: function (input) {
        var guidRx = /[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/;
        return guidRx.test(input);
    },
    isMT: function (name) {
        return $.trim($('input[name="' + name + '"]').val()) === '';
    },
    hasSeqRange: function (intArray, start, end) {
        // ensure that start and end are numbers
        start = Number(start);
        end = Number(end);
        var length = intArray.length;
        var startIdx, i = 0;
        for (i; i < length; i++) {
            //Until we have a start index position we don't care if the range is sequential
            if (!startIdx && intArray[i] === start) {
                startIdx = i;
            }
            if (startIdx !== undefined) {
                //Continue until we find a break in the sequence or we find the end value.
                if (intArray[i] !== (start + i - startIdx)) {
                    return false;
                }
                if (intArray[i] === end) {
                    return true;
                }
            }
        }
        return false;
    },
    /*
    ** reverse map an object
    ** very useful for quick translations
    **/
    reverseMapObject: function (obj, property) {
        // obj: object to be reversed
        // type: optional, property for specific reversal
        var revObject = {};
        var x = {};
        var y = {};
        for (x in obj) {
            if (obj.hasOwnProperty(x)) {
                var objX = obj[x];
                // Single layer reversal
                if ($.isEmptyObject(objX) || typeof objX !== 'object') {
                    revObject[objX] = x;
                } else if (property && objX[property] !== undefined) {
                    // Property specific reversal
                    revObject[objX[property]] = x;
                } else {
                    // Multilayer Reversal
                    for (y in objX) {
                        if (objX.hasOwnProperty(y)) {
                            revObject[objX[y]] = x;
                        }
                    }
                }
            }
        }
        return revObject;
    },
    sortObjectByValue: function (obj) {
        var sortedObj = {};
        var objVals = [];
        var revObj = Utility.reverseMapObject(obj);
        var length = 0;
        var id;
        var i;
        for (id in obj) {
            if (obj.hasOwnProperty(id)) {
                objVals.push(obj[id]);
            }
        }
        objVals.sort();
        length = objVals.length;
        for (i = 0; i < length; i++) {
            sortedObj[revObj[i]] = i;
        }
        return sortedObj;
    },
    /*
    * sort an array by a property of the elements in the array
    *   prop: string - property to sort by (the property should have a value of type string or number, not an object)
    *   caseSensitive: boolean - whether or not to make the sort case sensitive, false/undefined - not case sensitive
    *   type: Constants.ty - data type of the property value , default value is undefined
    */
    sortByProperty: function (prop, caseSensitive, order, type) {
        order = order || 'desc';
        return function (a, b) {
            var val1 = type === Constants.ty.DateTime ? Date.parse(a[prop]) : a[prop];
            var val2 = type === Constants.ty.DateTime ? Date.parse(b[prop]) : b[prop];
            if (typeof val1 === "number" && type !== Constants.ty.DateTime) {
                return (val1 - val2);
            }
            if (!caseSensitive && type !== Constants.ty.DateTime) {
                val1 = val1 ? val1.toString().toLowerCase() : val2;
                val2 = val2 ? val2.toString().toLowerCase() : val2;
            }
            if (order === 'desc') {
                return ((val1 < val2) ? -1 : ((val1 > val2) ? 1 : 0));
            }
            // order === 'asc'
            return ((val1 > val2) ? -1 : ((val1 < val2) ? 1 : 0));
        };
    },
    ///<summary>
    /// Remove specified value from the passed in array, returning a new array
    ///<param name="existingArray">Array to execute against, removing the specified value</param>
    ///<param name="removeValue">The value to remove from the existing array</param>
    ///</summary>
    cleanArrayOfValue: function (existingArray, removeValue) {
        var newArr = [];
        var idx = 0;
        var length = existingArray.length;
        for (idx; idx < length; idx++) {
            if (existingArray[idx] !== removeValue) {
                newArr.push(existingArray[idx]);
            }
        }
        return newArr;
    },
    /*
    ** transform an object with string identifiers into an ordered array
    */
    formatObjectIntoOrderedArray: function (obj) {
        var item;
        var items = [];
        for (item in obj) {
            if (obj.hasOwnProperty(item)) {
                items.push(item);
            }
        }
        return items.sort();
    },
    /*
    * builds an object from an array of key/value pairs. 
    * the properties of this object are the keys and the property values are the values
    */
    keyValuestoDictionaryObject: function (kvs, keyProperty, valueProperty) {
        var result = {};
        if (!keyProperty) {
            keyProperty = 'Key';
        }
        if (!valueProperty) {
            valueProperty = 'Value';
        }
        var i;
        var length = kvs.length;
        for (i = 0; i < length; i++) {
            var kv = kvs[i];
            result[kv[keyProperty]] = kv[valueProperty];
        }
        return result;
    },
    ///<summary>
    /// Transform a dictionary of key value pairs into an array
    keyValueObjectToArray: function (obj) {
        var arr = [];
        var item;
        for (item in obj) {
            if (obj.hasOwnProperty(item)) {
                arr.push({ Key: item, Value: obj[item] });
            }
        }
        return arr;
    },
    //#region Caching
    /*
        GetOrAddCachedItem - Obtain an item from cache if exists/hasn't expired
        @key - the storage locale of the data to obtain
        @expirationMilliseconds - the cache expires after this value
                                if not provided or set to a falsy value(false, null, 0...) the cache won't expire
        @getFunc - if GetCachedItem fails, obtain and cache the data using this function (synchronous)
        @params - parameters to be passed into @getFunc
    */
    GetOrAddCachedItem: function (key, expirationMilliseconds, getFunc, params) {
        var result = Utility.GetCachedItem(key);
        if (!result && getFunc) {
            result = getFunc(params);
            Utility.AddCacheItem(key, result, expirationMilliseconds);
        }
        return result;
    },
    /*
        GetCachedItem - Obtain a cached item, specified by @key
        @key - the storage locale of the data to obtain
        @defaultTypeReturned - string representing type to return (eg. 'array', 'object', 'number', 'string'...)
    */
    GetCachedItem: function (key, defaultTypeReturned) {
        var currentTime = new Date();
        var result;
        // Allow for falsy data to exist in cache (false, 0...)
        // Allow obtaining cache if it has no expiration
        if ((this.cache[key] || this.cache[key] === false || this.cache[key] === 0) &&
            (this.cache[key].expiration === 0 || this.cache[key].expiration > currentTime)) {
            result = this.cache[key].cachedObject;
        }
        if (!result) {
            if (defaultTypeReturned === 'array') {
                result = [];
            }
        }
        return result;
    },
    /*
        GetCachedItemKeyStartsWith - obtain each cache entry where its key starts with the passed in key
        @keyStartsWith - string, value the cache entry key starts with
    */
    GetCachedItemKeyStartsWith: function (keyStartsWith) {
        // No keyStartsWith return no results.
        var results = [];
        if (!keyStartsWith) {
            return results;
        }
        var cache = Utility.cache;
        var cacheItem;
        for (cacheItem in cache) {
            if (cache.hasOwnProperty(cacheItem)) {
                if (cacheItem.startsWith(keyStartsWith)) {
                    results.push(Utility.GetCachedItem(cacheItem));
                }
            }
        }
        return results;
    },
    /*
        AddCacheItem - add an @item to Utility.cache with the key of @key
        @key - where to store @item in cache
        @item - the data to cache
        @expirationMilliseconds - the cache expires after this value
                                if not provided or set to a falsy value(false, null, 0...) the cache won't expire
    */
    AddCacheItem: function (key, item, expirationMilliseconds) {
        var currentTime = new Date();
        if (key && item) {
            Utility.cache[key] = {};
            Utility.cache[key].cachedObject = item;
            // Allow cache that doesn't expire
            if (!expirationMilliseconds) {
                Utility.cache[key].expiration = 0;
            }
            else {
                Utility.cache[key].expiration = new Date(currentTime.getTime() + expirationMilliseconds);
            }
        }
    },
    /*
        BustCachedItem - remove a cache item from cache where its key is @key
        @key - the cache item to remove
    */
    BustCachedItem: function (key) {
        if (Utility.cache[key]) {
            delete Utility.cache[key];
        }
    },
    /*
        BustCachedItemKeyStartsWith - remove a cache item from cache where its key starts with @keyStartsWith
        @keyStartsWith - string, value the cache entry key starts with
    */
    BustCachedItemKeyStartsWith: function (keyStartsWith) {
        // No keyStartsWith do nothing.
        if (!keyStartsWith) {
            return;
        }
        var cache = Utility.cache;
        var cacheItem;
        for (cacheItem in cache) {
            if (cache.hasOwnProperty(cacheItem)) {
                if (cacheItem.startsWith(keyStartsWith)) {
                    Utility.BustCachedItem(cacheItem);
                }
            }
        }
    },
    //#endregion Caching

    getUsers: function (excludeFlagArray, userSource, siteUsersOnly, originalObject, userType) {
        var u = [];
        userSource = userSource || window.users;
        if (!userSource) {
            return u;
        }
        excludeFlagArray = excludeFlagArray || [Constants.uf.Proxy];
        var i = 0;
        var userSourceLen = userSource.length;
        for (i; i < userSourceLen; i++) {
            var user = userSource.at(i);
            if (!user.get('ReadOnlyUser')) {
                var flags = user.get('Flags');
                var add = true;
                if (siteUsersOnly) {
                    add = user.get('SiteUser');
                }
                if (add) {
                    //User Flag of 0 = Regular user.
                    if (flags !== 0) {
                        var j = 0;
                        var length = excludeFlagArray.length;
                        for (j; j < length; j++) {
                            if ((flags & excludeFlagArray[j]) === excludeFlagArray[j]) {
                                add = false;
                                break;
                            }
                        }
                    }
                }
                if (add) {
                    if (originalObject) {
                        if (userType && userType !== "All") {
                            var value = userType === "Active";
                            var active = user.get('Active');
                            if (active === value) {
                                u.push(user);
                            }
                        } else {
                            u.push(user);
                        }

                    } else {
                        u.push({ id: user.get('Id'), name: user.get('Username'), flags: flags });
                    }
                }
            }
        }
        return u;
    },
    getReadOnlyUsers: function (excludeFlagArray, userSource, siteUsersOnly, originalObject) {
        var u = [];
        userSource = userSource || window.users;
        if (!userSource) {
            return u;
        }
        excludeFlagArray = excludeFlagArray || [Constants.uf.Proxy];
        var i = 0;
        var userSourceLen = userSource.length;
        for (i; i < userSourceLen; i++) {
            var user = userSource.at(i);
            if (user.get('ReadOnlyUser')) {
                var flags = user.get('Flags');
                var add = true;
                if (siteUsersOnly) {
                    add = user.get('SiteUser');
                }
                if (add) {
                    //User Flag of 0 = Regular user.
                    if (flags !== 0) {
                        var j = 0;
                        var length = excludeFlagArray.length;
                        for (j; j < length; j++) {
                            if ((flags & excludeFlagArray[j]) === excludeFlagArray[j]) {
                                add = false;
                                break;
                            }
                        }
                    }
                }
                if (add) {
                    if (originalObject) {
                        u.push(user);
                    } else {
                        u.push({ id: user.get('Id'), name: user.get('Username'), flags: flags });
                    }
                }
            }
        }
        return u;
    },
    getUsersDictionary: function (excludeFlags, userSource, siteUsersOnly) {
        // Attempt to fetch the user dictionary from cache (as long as the parameters match the cache is viable)
        var userDictionary;
        var udd = Utility.GetCachedItem('userDictionaryData');
        var uddParamsChanged = (udd && (udd.excludeFlags !== excludeFlags || udd.userSource !== userSource || udd.siteUsersOnly !== siteUsersOnly));
        if (udd) {
            userDictionary = udd.dictionary;
        }
        // If the cache doesn't exist yet or its parameters have changed re-create the dictionary
        if (!udd || !userDictionary || uddParamsChanged) {
            // Obtain filtered users
            var usersArray = Utility.getUsers(excludeFlags, userSource, siteUsersOnly);
            var length = usersArray.length;
            userDictionary = {};
            var i = 0;
            // Add users to a dictionary {Key: Name}
            for (i = 0; i < length; i++) {
                userDictionary[usersArray[i].id] = usersArray[i].name;
            }
            // Add parameters and dictionary to cache.
            Utility.AddCacheItem('userDictionaryData', { excludeFlags: excludeFlags, userSource: userSource, siteUsersOnly: siteUsersOnly, dictionary: userDictionary });
        }
        // return the cached dictionary or the newly formed dictionary
        return userDictionary;
    },
    getUserRolesDictionary: function (excludeFlags, userSource, siteUsersOnly) {
        // Attempt to fetch the user and role dictionary from cache (as long as the parameters match the cache is viable)
        var urd;
        var urdd = Utility.GetCachedItem('userRoleDictionaryData');
        var urddParamsChanged = (urdd && (urdd.excludeFlags !== excludeFlags || urdd.userSource !== userSource || urdd.siteUsersOnly !== siteUsersOnly));
        if (urdd) {
            urd = urdd.dictionary;
        }
        // If the cache doesn't exist yet or its parameters have changed re-create the dictionary
        if (!urdd || !urd || urddParamsChanged) {
            // Obtain user dictionary
            urd = $.extend({}, Utility.getUsersDictionary(excludeFlags, userSource, siteUsersOnly));
            var i = 0;
            var length = window.slimRoles.length;
            // Add roles to dictionary
            for (i; i < length; i++) {
                var r = window.slimRoles.at(i);
                urd[r.get('Id')] = r.get('Name');
            }
            // Add parameters and dictionary to cache.
            Utility.AddCacheItem('userRoleDictionaryData', { excludeFlags: excludeFlags, userSource: userSource, siteUsersOnly: siteUsersOnly, dictionary: urd });
        }
        // return the cached dictionary or the newly formed dictionary
        return urd;
    },
    log: function () {
        Utility.OutputToConsole.apply(Utility, arguments);
    },
    OutputToConsole: function () {
        var consoleExists = typeof console;
        if (consoleExists !== 'undefined') {
            if (console.log && console.log.apply) {
                console.log.apply(console, arguments);
            }
            else {
                console.log(arguments);
            }
        }
    },
    // TODO 12912, 12933, et al? user preferences could benefit from a model-based implementation, where-in the model implements all gets, sets,
    // and resets, and the model implements all defaults.  Views would subscribe to the model.  Currently, default values are implemented
    // in each place preferences are read and are probably not consistent.
    GetUserPreference: function (key) {
        var ups = window.userPreferences;
        if (!ups) {
            return;
        }
        return ups.getUserPreferenceValue(key);
    },
    ///<summary>
    /// Set a single user preference removing any invalid values or existing values, so the preference isn't updated with them
    ///</summary>
    setSingleUserPreferenceWithCheck: function (name, value, callback) {
        var kvPairs = [];
        kvPairs.push({ Key: name, Value: value });
        Utility.setUserPreferenceWithCheck(kvPairs, callback);
    },
    SetSingleUserPreference: function (name, value, callback) {
        if (window.kioskMachineId && name === 'systrayConnection') { //We do not permanently store systrayConnection user preference when we are in a kiosk mode.
            Utility.SetUserPreferenceWithoutAjax(name, value);
            Utility.executeCallback(callback);
        }
        var kvPairs = [];
        kvPairs.push({ Key: name, Value: value });
        Utility.SetUserPreference(kvPairs, callback);
    },
    SetUserPreferenceWithoutAjax: function (key, value) {
        // Update window.userPreferences
        var ups = window.userPreferences;
        ups.add({ Key: key, Value: value }, { merge: true });
    },
    setUserPreferencesWithoutAjax: function (kvPairs) {
        // Reset the user preferences that were changed
        var ups = window.userPreferences;
        var userPrefs = ups.toJSON();
        if (userPrefs) {
            var length = kvPairs.length;
            var i = 0;
            for (i = 0; i < length; i++) {
                Utility.SetUserPreferenceWithoutAjax(kvPairs[i].Key, kvPairs[i].Value);
            }
        }
    },
    ///<summary>
    /// Check values to be set, before setting them
    /// If the the value is an empty string remove it from being set
    /// If the user preference is already set to the passed in value, remove it
    /// </summary>
    setUserPreferenceWithCheck: function (kvPairs, callback, override) {
        var idx = 0;
        var length = kvPairs.length;
        for (idx; idx < length; idx++) {
            var key = kvPairs[idx].Key;
            var val = kvPairs[idx].Value;
            var existingPref = Utility.GetUserPreference(key);
            if (val && existingPref && typeof val === 'number') {
                val.toString();
                existingPref.toString();
            }
            if (val === '' || existingPref === val) {
                kvPairs.splice(idx, 1);
                idx--;
                length--;
            }
        }
        if (kvPairs.length > 0) {
            Utility.SetUserPreference(kvPairs, callback, override);
        }
    },
    SetUserPreference: function (kvPairs, callback, override) {
        Utility.setUserPreferencesWithoutAjax(kvPairs);
        if (!window.isGuest) {
            window.userPreferences.sync('update', window.userPreferences, {
                kvps: kvPairs,
                success: function (result) {
                    Utility.executeCallback(callback, result);
                },
                failure: function (jqXHR, textStatus, errorThrown) {
                    if (override) {
                        ErrorHandler.popUpMessage(errorThrown);
                    }
                    else {
                        Utility.OutputToConsole(errorThrown.Message);
                    }
                },
                complete: function () {
                    Utility.executeCallback(callback);
                }
            });
        }
    },
    SetTextAreaHeightPreference: function (element) {
        var userPreftextareaHeights = Utility.GetUserPreference("textAreaHeights");
        var elemIdOrClass = "";
        if ($(element).data('resizeId')) {
            elemIdOrClass = $(element).data('resizeId');
        }
        else if (element.id !== '' && element.id !== undefined) {
            elemIdOrClass = element.id;
        }
        else {
            elemIdOrClass = $(element).attr("class").split(' ')[0];
        }
        var elemHeight = $(element).css("height");
        var obj = {};
        obj[elemIdOrClass] = elemHeight;
        var kvPairs = [];
        if (userPreftextareaHeights === "" || userPreftextareaHeights === undefined) {
            kvPairs.push({ Key: 'textAreaHeights', Value: JSON.stringify(obj) });
        }
        else {
            var alltextareaHeights = JSON.parse(userPreftextareaHeights);
            var boolfound = false;
            var varobj;
            for (varobj in alltextareaHeights) {
                if (alltextareaHeights.hasOwnProperty(varobj) && varobj === elemIdOrClass) {
                    alltextareaHeights[varobj] = elemHeight;
                    boolfound = true;
                }
            }
            if (!boolfound) {
                alltextareaHeights[elemIdOrClass] = elemHeight;
            }
            kvPairs.push({ Key: 'textAreaHeights', Value: JSON.stringify(alltextareaHeights) });
        }
        Utility.SetUserPreference(kvPairs);
    },
    SetTextAreaHeightFromUserPreference: function ($textAreas) {
        var userPreftextareaHeights = Utility.GetUserPreference("textAreaHeights");
        if (userPreftextareaHeights !== undefined && userPreftextareaHeights !== '') {
            var alltextareaHeights = JSON.parse(userPreftextareaHeights);
            var elemId;
            var i;
            var length = $textAreas.length;
            for (elemId in alltextareaHeights) {
                if (alltextareaHeights.hasOwnProperty(elemId)) {
                    for (i = 0; i < length; i++) {
                        if ($($textAreas[i]).data("resizeId") === elemId || $($textAreas[i]).attr("id") === elemId || $($textAreas[i]).attr("class") === elemId) {
                            $($textAreas[i]).css('height', alltextareaHeights[elemId]);
                        }
                    }
                }
            }
        }
    },
    GetSystemPreference: function (key) {
        var sp = $('#systemPreferences').val();
        var systemPrefs;
        var sysPref;
        if (sp) {
            systemPrefs = JSON.parse(sp);
        }
        for (sysPref in systemPrefs) {
            if (systemPrefs.hasOwnProperty(sysPref) && systemPrefs[sysPref].Name === key) {
                return systemPrefs[sysPref];
            }
        }
        return;
    },
    GetSystemPreferenceValue: function (key) {
        var systemPref = Utility.GetSystemPreference(key);
        if (systemPref) {
            return systemPref.Value;
        }
        return '';
    },
    ///<summary>
    /// Perform a click of a custom button
    ///<param name="selector">button to change appearance</param>
    ///<param name="clickFunc">the function that should be executed when the button is normally 'clicked' with the mouse by the user</param>
    ///</summary>
    customButtonClick: function (selector, clickFunc) {
        var $sel = $(selector);
        // Disables passed in custom button - performs passed in func - enables passed in custom button
        if (!$sel.hasClass('disabled')) {
            // Make the button appear active, as if it were being clicked by the mouse
            $sel.addClass('active');
            setTimeout(function () {
                $sel.removeClass('active');
                $sel.addClass('disabled');
                clickFunc();
                $sel.removeClass('disabled');
            }, 100);
        }
    },
    getSequentialGuids: function (numRequested) {
        var count = 20;
        numRequested = numRequested || count;
        var guids = Utility.GetCachedItem('SequentialGuids');
        if (!guids) {
            guids = [];
            Utility.AddCacheItem('SequentialGuids', guids);
        }
        var proxy = SystemMaintenanceServiceProxy({ sync: true });
        var error = false;
        var i = 0;
        var length = 0;
        var sf = function (result) {
            //NOTE: Do not use array.join here, we do not want a new array, we want to update by reference.
            i = 0;
            length = result.length;
            for (i; i < length; i++) {
                guids.push(result[i]);
            }
        };
        var ff = function (xhr, status, errorThrown) {
            error = true;
            ErrorHandler.popUpMessage(errorThrown);
        };
        while (!error && guids.length < numRequested) {
            proxy.getSequentialGuids(count, sf, ff);
        }
        if (!error) {
            return guids.splice(0, numRequested);
        }
    },
    intToGuid: function (i) {
        var g = ("000000000000" + i).slice(-12);
        return "00000000-0000-0000-0000-" + g;
    },
    getCacheBusterStr: function (prefix) {
        if (!prefix) {
            prefix = "?";
        }
        return prefix + 'z=' + Math.random() + 'zz' + Math.random();
    },
    changeButtonState: function (titles, state, selector) {
        // titles: array of button text
        // state: either 'disable' OR 'enable'
        // selector: optional selector to narrow button selection
        var title;
        while (titles && titles.length > 0) {
            title = titles.pop();
            var sel;
            if (selector) {
                sel = $(selector).find('.ui-dialog-buttonpane button:contains(' + title + ')');
            }
            else {
                sel = $('.ui-dialog-buttonpane button:contains(' + title + ')');
            }
            sel.button(state);
        }
    },
    verifyStyle: function (selector) {
        // Used to check to see if the css style exists
        if (Utility.cache[selector]) {
            return Utility.cache[selector];
        }
        var rules;
        var haveRule = false;
        var i = 0, j = 0, csslen = 0, rulelen = 0;
        var typeOfDSS = typeof document.styleSheets;
        if (typeOfDSS !== "undefined") { //is this supported
            var cssSheets = document.styleSheets;
            csslen = cssSheets.length;
            for (i = 0; i < csslen; i++) {
                //using IE or FireFox/Standards Compliant
                try {
                    var typeOfRules = typeof cssSheets[i].cssRules;
                    rules = (typeOfRules !== "undefined") ? cssSheets[i].cssRules : cssSheets[i].rules;
                    rulelen = rules.length;
                    for (j = 0; j < rulelen; j++) {
                        if (rules[j].selectorText === selector) {
                            haveRule = true;
                            break;
                        }
                    } //innerloop
                    if (haveRule) { // break outerloop                    
                        break;
                    }
                } //innerloop
                catch (e) {
                    Utility.OutputToConsole(e);
                }
                if (haveRule) { // break outerloop
                    break;
                }
            } //outer loop
        } //endif
        Utility.cache[selector] = haveRule;
        return haveRule;
    },
    ///<summary>
    /// Obtain the css width before it is calculated - % if it exists, otherwise px
    ///</summary>
    getCSSWidth: function ($elem) {
        // Determine css width (whether or not it is % or px based).
        // Jquery doesn't calculate the width of an element if it is contained in a hidden parent.
        // So, we are able to obtain the % based width of an element by cloning it, appending it to a hidden parent, then getting its width
        var $div = $(document.createElement('div'));
        $div.css({ display: 'none' });
        var $clone = $elem.clone();
        $('body').append($div.append($clone));
        var cssWidth = $clone.css('width');
        $div.remove();
        return cssWidth;
    },
    //#region TODOS
    //TODO: scain fix enableButtons and disableButton functionality so it doesn't use :contains but will match the contained text to the passed in text
    //TODO: scain fix it so only the buttons of a passed in dialog selector are either disabled or enabled
    //TODO: scan move toggleButton, toggleButtons, enableButton, disableButton, enableButtons, and disableButtons to DialogsUtil, since these are Dialog functions
    toggleButton: function (enable, btnLabel, hoverOverText) {
        var toggle,
            selector = $(".ui-dialog-buttonpane button:contains(" + btnLabel + ")");
        if (enable) {
            toggle = "enable";
        } else {
            toggle = "disable";
        }
        selector.button(toggle);
        if (hoverOverText) {
            selector.attr('title', hoverOverText);
        }
    },
    toggleButtons: function (enable, titles) {
        var i = 0;
        var length = 0;
        if (titles) {
            length = titles.length;
        }
        for (i = 0; i < length; i++) {
            this.toggleButton(enable, titles[i]);
        }
    },
    enableButton: function (btnLabel, hoverOverText) {
        this.toggleButton(true, btnLabel, hoverOverText);
    },
    disableButton: function (btnLabel, hoverOverText) {
        this.toggleButton(false, btnLabel, hoverOverText);
    },
    enableButtons: function (titles) {
        this.toggleButtons(true, titles);
    },
    disableButtons: function (titles, dialogSelector) {
        this.toggleButtons(false, titles);

        var func = function (dialogError) {
            Utility.enableButtons(titles);
            if (!dialogError && dialogSelector) {
                DialogsUtil.isDialogInstanceDestroyDialog($(dialogSelector));
            }
        };
        return func;
    },
    showHideButton: function (diagSel, show, btnLabel) {
        var selector = $(diagSel).parent().find(".ui-dialog-buttonpane button:contains(" + btnLabel + ")");
        if (show) {
            selector.show();
        }
        else {
            selector.hide();
        }
    },
    showHideButtons: function (diagSel, show, titles) {
        var i;
        var length = titles.length;
        for (i = 0; i < length; i++) {
            Utility.showHideButton(diagSel, show, titles[i]);
        }
    },
    hideButtons: function (diagSel, titles) {
        Utility.showHideButtons(diagSel, false, titles);
    },
    showButtons: function (diagSel, titles) {
        Utility.showHideButtons(diagSel, true, titles);
    },
    disablePastDate: function (targ, disableFlag) {
        if (disableFlag) {
            $(targ).datetimepicker("option", "minDate", new Date());
        }
        else {
            $(targ).datetimepicker("option", "minDate", null);
        }
    },
    //#endregion
    toggleInputButtons: function (selectors, enable) {
        // selectors: comma separated list of input button selectors (i.e. #save_buzz, #delete_buzz...)
        if (enable) {
            $(selectors).removeAttr('disabled');
        } else {
            $(selectors).attr('disabled', true);
        }
    },
    getIframeDocument: function (iframe) {
        return iframe.contentDocument || (iframe.contentWindow ? iframe.contentWindow.document : '');
    },
    detectMimeTypes: function (mimetype) {
        var exists = false;
        switch (mimetype) {
            // Types natively supported by each of the three major browsers (Firefox, IE, Chrome)                                     
            case 'image/jpeg':
            case 'image/png':
            case 'image/bmp':
            case 'image/gif':
            case 'text/plain':
                return true;
            default:
                exists = false;
        }
        try {
            if (window.navigator) {
                var mimeTypes = window.navigator.mimeTypes;
                exists = Utility.detectNativePlugins(mimeTypes, mimetype);
            }
            if (!exists) {
                switch (mimetype) {
                    case 'application/pdf':
                        // AcroPDF.PDF is used by version 7 and later
                        exists = Utility.detectIENativePlugins('AcroPDF.PDF');
                        // PDF.PdfCtrl is used by version 6 and earlier
                        if (!exists) {
                            exists = Utility.detectIENativePlugins('PDF.PdfCtrl');
                        }
                        break;
                    default:
                }
            }

        } catch (ex) {
            Utility.OutputToConsole(ex);
        }
        return exists;
    },
    detectNativePlugins: function (mimeTypes, p) {
        var exists = false;
        if (mimeTypes && mimeTypes[p] && mimeTypes[p].enabledPlugin) {
            exists = true;
        }
        return exists;
    },
    detectIENativePlugins: function (p) {
        var exists = false, control;
        control = new ActiveXObject(p);
        if (control) {
            exists = true;
        }
        return exists;
    },
    getModelById: function (collection, id) { // Used to get a model from a collection via a model's ID
        if (collection) {
            return collection.find(function (model) {
                return model.get("Id") === id;
            });
        }
    },
    isSuperAdmin: function () {
        return $('#isSuperAdmin').val() === 'True';
    },
    isInstanceAdmin: function () {
        return $('#isInstanceAdmin').val() === 'True';
    },
    isReadOnlyUser: function () {
        return $('#isReadOnlyUser').val() === 'True';
    },
    canProcess: function (isAssignee, isOwner) {
        return isAssignee || isOwner || Utility.isSuperAdmin() || Utility.isInstanceAdmin() || Utility.checkGP(window.gatewayPermissions, Constants.gp.WFAdmin);
    },
    getCurrentUser: function () {
        var currUser = $('#currentUser').val();
        if (currUser) {
            currUser = JSON.parse(currUser);
        }
        return currUser;
    },
    getEclipseVersion: function () {
        return $('#eclipseVersion').val() || '';
    },
    getJulian: function () {
        var timestamp = new Date().setFullYear(new Date().getFullYear(), 0, 1);
        var yearFirstDay = Math.floor(timestamp / 86400000);
        var today = Math.ceil((new Date().getTime()) / 86400000);
        var dayofyear = today - yearFirstDay;
        return dayofyear;
    },
    getAppStateCurr: function (data) {
        var uc = Constants.UtilityConstants;
        var currUser = Utility.getCurrentUser();
        if (!currUser) {
            return;
        }
        var i;
        var length;
        var isCurDenied = false;
        var isCurApproved = false;
        var userId = currUser.Id;
        var currApprovalUsers = data[uc.DF_APPROVAL_USERS];
        if (currApprovalUsers) {
            if (!(currApprovalUsers instanceof Array) && typeof currApprovalUsers === 'string') {
                currApprovalUsers = currApprovalUsers.split(',');
            }
            length = currApprovalUsers.length;
            for (i = 0; i < length; i++) {
                if (currApprovalUsers[i] === userId) {
                    isCurApproved = true;
                    break;
                }
            }
        }
        var currDenyUsers = data[uc.DF_DENY_USERS];
        if (currDenyUsers) {
            //currDenyUsers = currDenyUsers.split(',');
            if (!(currDenyUsers instanceof Array) && typeof currDenyUsers === 'string') {
                currDenyUsers = currDenyUsers.split(',');
            }
            length = currDenyUsers.length;
            for (i = 0; i < length; i++) {
                if (currDenyUsers[i] === userId) {
                    isCurDenied = true;
                }
            }
        }
        return isCurApproved ? 1 : (isCurDenied ? 2 : '');
    },
    navigate: function (hash, router, triggerRoute, replace) {
        // Set the url hash to the passed in hash via a backbone router and either do or do not trigger the hash 
        // hash: url hash to navigate to
        // router: jsmvc controller (which are backbone.js routers) to use for navigation (e.g. RetrieveRouter)
        // triggerRoute: boolean: true - call route function, false - just set the hash, no route function called
        // replace: boolean: true - create an entry in browser history, false - don't create an entry in the browsers history        
        if (window.location.hash.substr(1) !== hash) {
            router.navigate(hash, { trigger: triggerRoute, replace: replace });
        }
    },
    /*
        Trigger a bound custom event, returns result of completed event
        @customEvent: string - name of custom event
        @customEventElem: css selector - element to trigger the event
        @data: array of parameters to be passed into the customEvent
    */
    triggerCustomEvent: function (customEvent, customEventElem, data) {
        var event = new $.Event(customEvent);
        $(customEventElem).trigger(event, data);
        if (event.result) {
            return event.result;
        }
    },
    /*
        General function to add or remove a class from an element
        @selector: css - selector for the element to toggle the @cssClass
        @cssClass: css class to be added / removed from @selector
        @addClass: addClass - boolean, true - add @cssClass to @selector, false - remove @cssClass from @selector
    */
    toggleCssClass: function (selector, cssClass, addClass) {
        if (addClass) {
            $(selector).addClass(cssClass);
        } else {
            $(selector).removeClass(cssClass);
        }
    },
    /*
        Determine if any of @emailAddresses are invalid, if so display an error using errDispName or as a general dialog box
        Can be used for a single email address
        @emailAddresses: a ';' separated list of email addresses to test
        @errDispName: optional, html element name property (if not specified, general dialog is displayed)
        @errMsg: optional, message to be displayed (if not specified, Constants.c.invalidEmailAddress is used)
        @returnError: whether to display the error message immediately or return the error message for processing by callee
    */
    areValidEmailAddresses: function (emailAddresses, errDispName, errMsg, returnError) {
        var pattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
        var addresses = emailAddresses.split(';');
        var length = addresses.length;
        var i = 0;
        var isValid = false;
        // Ensure an error message exists to display to the user
        if (!errMsg) {
            errMsg = Constants.c.invalidEmailAddress;
        }
        for (i; i < length; i++) {
            var address = addresses[i];
            isValid = pattern.test(address);
            if (!isValid) {
                var errObj = {};
                // Allow address to be part of the error message
                var formattedErrorMessage = String.format(errMsg, address);
                errObj[errDispName] = formattedErrorMessage;
                if (!errDispName) {
                    errObj = formattedErrorMessage;
                }
                if (returnError) {
                    return formattedErrorMessage;
                }
                ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                break;
            }
        }
        return isValid;
    },
    getURLParams: function (url) {
        var paramURL = $.url(url); // Parse query string
        return JSON.stringify(paramURL.param()); // obtain parameters from parsed query string
    },

    //#region Inline Workflow Designer
    /*
        Create the iframe for the workflow designer for inline editing of Workflows/steps/actions/tasks
        @callback: an optional callback to perform on load of the iframe
    */
    setupWfDesigner: function (callback, displayOverlay) {
        var selector = $('#inlineWorkflowDesigner');
        selector.children().hide();
        if (displayOverlay !== false) {
            selector.find('.dialogOverlay, .modalThrobberCont').show();
            selector.show();
        }
        var $iframe = selector.find('iframe');
        var src = '//' + window.location.host + Constants.Url_Base + 'WorkflowDesigner/' + Utility.getCacheBusterStr();
        if ($iframe.length <= 0) {
            var iframe = document.createElement('iframe');
            Utility.inlineWorkflowDesignerIframeLoadedCallback = callback;
            $(iframe).hide();
            iframe.src = src;
            selector.append($(iframe));
        }
        else {
            Utility.executeCallback(callback);
        }
    },
    showWfDesigner: function (selector) {
        // Find the iframe that contains the Workflow Designer
        var wfSelector = selector.find('iframe');
        // Find the body inside the workflow designer
        var iframeBody = wfSelector.contents().find('body');
        // Hide the background of the Workflow Designer Background
        iframeBody.css('background', 'none');
        // Hide all elements that are not ui dialogs
        wfSelector.contents().find('body').children(':not(".ui-dialog")').hide();
        // Finally, show the iframe
        wfSelector.show();
    },
    /*
        The success function for after editing an Action Library Item
        @editView: optional, the backbone View that may need to be rendered on a success of the editing
    */
    actionLibraryItemSuccess: function (updateFunc, actionId, oldActionId) {
        var sf = function (result) {
            // Update Sync Action Library Items collection
            window.parent.syncActions = new SyncActions(result);
            // Call the update function if it has been provided
            Utility.executeCallback(updateFunc);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            // Display any error that may have been thrown
            ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        // Fetch Sync Action Library Items collection
        WorkflowServiceProxyV2().getSyncActionLibrary(sf, ff);
    },
    //#endregion

    setWindowTitle: function () {
        window.document.title = Constants.c.productTitle;
        if (Utility.titleCounter > 4) {
            var func = function () { Utility.titleCounter = 0; };
            setTimeout(func, 1500);//wait for others to finish in case multiple were called.
            return;
        }
        Utility.titleCounter = Utility.titleCounter + 1;
        setTimeout(function () {
            Utility.setWindowTitle();
        }, 1000);
    },

    // Convert a passed in val to a boolean value
    convertToBool: function (val) {
        if (val === undefined || val === null) {
            return false;
        }
        if (typeof val === 'boolean') { // just return the passed in value if its already a boolean type
            return val;
        }
        if (typeof val === 'string') {  // return a boolean representation of 'false' (false) and 'true' (true)
            return Utility.convertStrToBool(val);
        }
        if (typeof val === 'number') { // return a boolean representation of zero (false) and non-zero (true)
            return Utility.convertIntToBool(val);
        }
    },
    convertStrToBool: function (strVal) {
        // 'true' returns true
        // 'false' returns false
        if (strVal === undefined || strVal === null) {
            return false;
        }
        var boolVal;
        strVal = strVal.toLowerCase();
        var intVal = parseInt(strVal, 10);
        if (isNaN(intVal)) { // performs check to make sure the string is not a number
            boolVal = (strVal === 'true');
        }
        else {
            boolVal = Utility.convertIntToBool(strVal);
        }
        return boolVal;
    },
    convertIntToBool: function (intVal) {
        // zero returns false
        // non-zero returns true
        return (intVal === 0) ? false : true;
    },

    // Execute a passed in 'function' if it exists and if it is a function
    // @func : most likely a function, but it might not be defined as described below
    // @data : data to be passed into the callback
    // @defaultCallback : a callback to be executed if one isn't provided
    // Callbacks are not always defined, this allows us to check the validity of a callback and execute it
    executeCallback: function (func, data, defaultCallback) {
        if (func && typeof (func) === 'function') {
            func(data);
            return true;
        }
        if (defaultCallback && typeof (defaultCallback) === 'function') {
            defaultCallback();
            return true;
        }
        return false;
    },
    // Execute a passed in 'function' if it exists and if it is a function
    // @func : most likely a function, but it might not be defined as described below
    // @defaultReturn : a value to be returned if the specified function doesn't exist or doesn't return a value
    // @data : data to be passed into the callback
    // Callbacks are not always defined, this allows us to check the validity of a callback and execute it
    executeCallbackWithReturn: function (func, defaultReturn, data) {
        if (func && typeof (func) === 'function') {
            return func(data) || defaultReturn;
        }
        return defaultReturn;
    },
    /* 
    XML: element or document DOM node
    TAB: tab or indent string for pretty output formatting
    omit or use empty string "" to supress.
    returns JSON string */
    xml2json: function (xml, tab) {
        var X = {};
        X = {
            toObj: function (xml) {
                var o = {};
                if (xml.nodeType === 1) {   // element node ..
                    if (xml.attributes.length) {   // element with attributes  ..
                        var i;
                        for (i = 0; i < xml.attributes.length; i++) {
                            o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();
                        }
                    }
                    if (xml.firstChild) { // element has child nodes ..
                        var textChild = 0, cdataChild = 0, hasElementChild = false;
                        var n;
                        for (n = xml.firstChild; n; n = n.nextSibling) {
                            if (n.nodeType === 1) {
                                hasElementChild = true;
                            }
                            else if (n.nodeType === 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                                textChild++; // non-whitespace text
                            }
                            else if (n.nodeType === 4) {
                                cdataChild++; // cdata section node
                            }
                        }
                        if (hasElementChild) {
                            if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
                                X.removeWhite(xml);
                                for (n = xml.firstChild; n; n = n.nextSibling) {
                                    if (n.nodeType === 3) { // text node
                                        o["#text"] = X.escape(n.nodeValue);
                                    }
                                    else if (n.nodeType === 4) { // cdata node
                                        o["#cdata"] = X.escape(n.nodeValue);
                                    }
                                    else if (o[n.nodeName]) {  // multiple occurence of element ..
                                        if (o[n.nodeName] instanceof Array) {
                                            o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                                        }
                                        else {
                                            o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                                        }
                                    }
                                    else { // first occurence of element..
                                        o[n.nodeName] = X.toObj(n);
                                    }
                                }
                            }
                            else { // mixed content
                                if (!xml.attributes.length) {
                                    o = X.escape(X.innerXml(xml));
                                }
                                else {
                                    o["#text"] = X.escape(X.innerXml(xml));
                                }
                            }
                        }
                        else if (textChild) { // pure text
                            if (!xml.attributes.length) {
                                o = X.escape(X.innerXml(xml));
                            }
                            else {
                                o["#text"] = X.escape(X.innerXml(xml));
                            }
                        }
                        else if (cdataChild) { // cdata
                            if (cdataChild > 1) {
                                o = X.escape(X.innerXml(xml));
                            }
                            else {
                                for (n = xml.firstChild; n; n = n.nextSibling) {
                                    o["#cdata"] = X.escape(n.nodeValue);
                                }
                            }
                        }
                    }
                    if (!xml.attributes.length && !xml.firstChild) {
                        o = null;
                    }
                }
                else if (xml.nodeType === 9) { // document.node
                    o = X.toObj(xml.documentElement);
                }
                else {
                    alert("unhandled node type: " + xml.nodeType);
                }
                return o;
            },
            toJson: function (o, name, ind) {
                var json = name ? ("\"" + name + "\"") : "";
                if (o instanceof Array) {
                    var i;
                    for (i = 0, n = o.length; i < n; i++) {
                        o[i] = X.toJson(o[i], "", ind + "\t");
                    }
                    json += (name ? ":[" : "[") + (o.length > 1 ? ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) : o.join("")) + "]";
                }
                else if (o === null) {
                    json += (name && ":") + "null";
                }
                else if (typeof (o) === "object") {
                    var arr = [];
                    var m;
                    for (m in o) {
                        if (o.hasOwnProperty(m)) {
                            arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                        }
                    }
                    json += (name ? ":{" : "{") + (arr.length > 1 ? ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) : arr.join("")) + "}";
                }
                else if (typeof (o) === "string") {
                    json += (name && ":") + "\"" + o.toString() + "\"";
                }
                else {
                    json += (name && ":") + o.toString();
                }
                return json;
            },
            innerXml: function (node) {
                var s = "";
                if (node.hasOwnProperty("innerHTML")) {
                    s = node.innerHTML;
                }
                else {
                    var asXml = function () { };
                    asXml = function (n) {
                        var s = "";
                        if (n.nodeType === 1) {
                            s += "<" + n.nodeName;
                            var i;
                            for (i = 0; i < n.attributes.length; i++) {
                                s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                            }
                            if (n.firstChild) {
                                s += ">";
                                var c;
                                for (c = n.firstChild; c; c = c.nextSibling) {
                                    s += asXml(c);
                                }
                                s += "</" + n.nodeName + ">";
                            }
                            else {
                                s += "/>";
                            }
                        }
                        else if (n.nodeType === 3) {
                            s += n.nodeValue;
                        }
                        else if (n.nodeType === 4) {
                            s += "<![CDATA[" + n.nodeValue + "]]>";
                        }
                        return s;
                    };
                    var c;
                    for (c = node.firstChild; c; c = c.nextSibling) {
                        s += asXml(c);
                    }
                }
                return s;
            },
            escape: function (txt) {
                return txt.replace(/[\\]/g, "\\\\")
                          .replace(/[\"]/g, '\\"')
                          .replace(/[\n]/g, '\\n')
                          .replace(/[\r]/g, '\\r');
            },
            removeWhite: function (e) {
                e.normalize();
                var n;
                for (n = e.firstChild; n; n) {
                    if (n.nodeType === 3) {  // text node
                        if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
                            var nxt = n.nextSibling;
                            e.removeChild(n);
                            n = nxt;
                        }
                        else {
                            n = n.nextSibling;
                        }
                    }
                    else if (n.nodeType === 1) {  // element node
                        X.removeWhite(n);
                        n = n.nextSibling;
                    }
                    else {                      // any other node
                        n = n.nextSibling;
                    }
                }
                return e;
            }
        };
        if (xml.nodeType === 9) { // document node
            xml = xml.documentElement;
        }
        var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
        return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
    },

    //#region String extension methods
    /*
        Replace a character at a specific index with another character
        @str: string to modify
        @idx: the index of the character in @str to be replaced
        @repStr: string to us for replacement in @str at the index @idx
    */
    replaceAt: function (str, idx, repStr) {
        return str.substring(0, idx) + repStr + s.substring(idx + 1);
    },
    //#endregion

    //#region Progress Bars
    displayProgress: function (progressContSelector, data) {
        $(progressContSelector).show();
        var progressBarSel = $(progressContSelector).find('.progressBar');
        var progressSel = $(progressContSelector).find('.progress');
        var progressStatusSel = $(progressContSelector).find('.progressStatus');
        var progressIndeterminateSel = $(progressContSelector).find('.progressIndeterminate');
        if (data.progressIndeterminate) {
            progressBarSel.addClass('displayNone');
            progressIndeterminateSel.removeClass('displayNone').addClass('inlineblock');
        }
        else if (data.progressVisible) {
            progressIndeterminateSel.removeClass('inlineblock').addClass('displayNone');
            progressBarSel.removeClass('displayNone');
            progressSel.css('width', data.progressValue + '%');
            progressStatusSel.text(data.progressText);
        }
    },
    //#endregion

    /*
        @$selector: the <dl></dl> selector to hold the dropdown
        @collection: backbone.js collection to enter into the dropdown
        @ddLabelClass: class to apply to the selected item for display and selection
    */
    updateCustomDropdown: function ($selector, collection, ddLabelClass, defaultItem, ddOpts) {
        // Obtain values for currently selected
        var $selectedItemSelector = $selector.find('span.' + ddLabelClass);
        var selectedId = $selectedItemSelector.attr('value');
        var selectedName = $selectedItemSelector.text();
        $selector.empty();
        var menuTemplate = doT.template(Templates.get('dropdownlayout'));
        var item = collection.get(selectedId);
        var defaultItemId = '';
        var defaultItemName = '';
        if (defaultItem) {
            defaultItemId = defaultItem.Id || '';
            defaultItemName = defaultItem.Name || '';
        }
        selectedId = item !== undefined ? selectedId : defaultItemId;
        selectedName = item !== undefined ? selectedName : defaultItemName;
        var cts = {
            ddList: collection,
            ddLabelClass: ddLabelClass,
            selectedItemName: selectedName,
            selectedId: selectedId
        };
        cts = $.extend(cts, ddOpts);
        var htmlData = menuTemplate(cts);
        $selector.html(htmlData);
    },

    updateComboboxDropdownPosition: function () {
        var $activeElem = $(document.activeElement);
        var searchtext = $activeElem.val();
        if (searchtext === Constants.c.newTitle) {
            searchtext = "";
        }
        if ($activeElem.hasClass('isCombo') && $activeElem.autocomplete('widget').is(':visible')) {
            $activeElem.autocomplete('close').autocomplete('option', 'position',
                 {
                     my: 'left top',
                     at: 'left bottom',
                     of: $activeElem
                 }).autocomplete('search', searchtext);
        }
    },
    getTextWidth: function (text, fontStyle) {
        fontStyle = $.extend(true, {
            'font-size': '11px',
            'font-family': 'Verdana, Tahoma'
        }, fontStyle);
        var $pre = $('<pre></pre>').css(fontStyle).addClass('posAbs');
        $pre.css({
            visibility: 'hidden',
            height: 'auto',
            width: 'auto',
            top: 0,
            left: 0
        });
        $pre.text(text);
        $('body').append($pre);
        var width = $pre.width();
        $pre.remove();
        return width;
    },
    getAutoSelectFirstDocPreferences: function () {
        var autoSelectFirstDoc = Utility.GetUserPreference('autoSelectFirstDoc');
        var autoSelectFirstDocRetrive = true, autoSelectFirstDocWorkFlow = true;
        if (autoSelectFirstDoc) {
            autoSelectFirstDoc = JSON.parse(autoSelectFirstDoc);
            autoSelectFirstDocRetrive = autoSelectFirstDoc.autoSelectFirstDocRetrive;
            autoSelectFirstDocWorkFlow = autoSelectFirstDoc.autoSelectFirstDocWorkFlow;
        }
        autoSelectFirstDocRetrive = autoSelectFirstDocRetrive === undefined ? true : autoSelectFirstDocRetrive;
        autoSelectFirstDocWorkFlow = autoSelectFirstDocWorkFlow === undefined ? true : autoSelectFirstDocWorkFlow;
        return { autoSelectFirstDocRetrive: autoSelectFirstDocRetrive, autoSelectFirstDocWorkFlow: autoSelectFirstDocWorkFlow };
    },
    getObjectLength: function (obj) {
        var length = 0;
        var key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                length++;
            }
        }
        return length;
    },
    getTagTextFromHtmlString: function (text, tag) {
        // make sure the value is a string before attempting to convert it
        if (typeof (text) !== 'string') {
            return text;
        }
        if (!text) {
            return '';
        }
        tag = tag || 'span';
        var pattern = '<' + tag + '\\s*(\\w+\\s*=\\s*([\'"])[\\s\\S]*\\2\\s*)*>([\\s\\S]*)<\/' + tag + '>';
        var regEx = new RegExp(pattern);
        var result = text.match(regEx);
        if (result) {
            return result[result.length - 1];
        }

        return text;
    },
    fillBarcodeType: function ($select, result) {
        $select.append($('<option></option>').text(Constants.c.all).val(Constants.c.bty_All).attr('selected', 'selected'));
        if (result) {
            var length = result.length;
            var i = 0;
            for (i; i < length; i++) {
                $select.append($('<option></option>').text(result[i]).val(result[i]));
            }
        }
    },
    fillEnhancementOption: function ($select, result) {
        if (result) {
            var text = "";
            var length = result.length;
            var i = 0;
            for (i; i < length; i++) {
                text = Constants.c['eo_' + result[i]];
                if (text === Constants.c.eo_None) {
                    $select.append($('<option></option>').text(text).val(result[i]).attr('selected', 'selected'));
                }
                else {
                    $select.append($('<option></option>').text(text).val(result[i]));
                }
            }
        }
    },
    //Base64 Encoding:
    /**
    *
    *  Base64 encode / decode
    *  http://www.webtoolkit.info/
    *
    **/
    // private property
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode: function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Utility._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode: function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Utility._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode: function (string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        var n;
        for (n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode: function (utftext) {
        var string = "";
        var i = 0;
        var c = 0;
        var c2 = 0;

        while (i < utftext.length) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    },
    // translates replacement strings in %...% for AnnotationView and StampEditView
    replaceTextStampText: function (value) {
        var now = new Date();
        var mapObj = {
            '%user%': Utility.getCurrentUser().Name,
            '%y%': Utility.getJulian()
        };
        value = value.replace(/%user%|%y%/gi, function (match) {
            matched = true;
            return mapObj[match];
        });
        var matches = value.match(/%.*?%/gi);
        if (matches) {
            var i = 0;
            var length = matches.length;
            var matchreplace = "";
            for (i; i < length; i++) {
                matchreplace = matches[i].replace(/%/gi, "");
                if (matchreplace !== "") {
                    value = value.replace(matches[i], now.format(matchreplace));
                }
                else {
                    value = value.replace(matches[i], "%");
                }
            }
        }
        return value;
    },
    loadDataLinkTypeAhead: function ($input, queryId) {
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.popUpMessage(bizEx);
        };
        $input.autocomplete({
            select: function (event, ui) {
                $input.data('selectedItemData', ui.item);
            },
            source: function (request, response) {
                var sf = function (data) {
                    response(data.Columns[0].Value);
                };
                var dataLinkSvc = DataLinkServiceProxy();
                dataLinkSvc.executeQuery(queryId, null, [{ Key: "param1", Value: request.term }], sf, ff);

            },
            minLength: 1,
            delay: Constants.TypeAheadDelay
        });
    },
    addDatePicker: function (targ, options) {
        var pickerType = (options && options.type) || $(targ).attr('type'); // determines picker type from options or from input type; it must be date, datetime, or time
        var displayClearButton = (options && options.displayClearButton !== undefined) ? options.displayClearButton : $(targ).attr('displayClearButton');
        var disablePastDate = (options && options.disablePastDate !== undefined) ? options.disablePastDate : $(targ).attr('disablePastDate');
        var commonOnSelect = function (dateText) {
            $(targ).val(dateText);
            $(targ).blur();
            $(targ).trigger('change');
        };
        var opts = {
            changeMonth: true,
            changeYear: true,
            displayClearButton: displayClearButton,
            yearRange: 'c-15:c+15', // currently selected year +/- 15 will appear in drop-down; users can type a year outside this range into the input
            onClose: function () {
                $(targ).parents(".ui-dialog").focus();
            },
            beforeShow: function () {
                setTimeout(function () {
                    $('.ui-datepicker').css('z-index', 9999);
                }, 0);
            }
        };
        switch (pickerType) {
            case 'datetime':
                opts.onSelect = function (dateText) {
                    dateText = new Date(dateText).format('general');
                    commonOnSelect(dateText);
                };
                $(targ).datetimepicker(opts);
                if (disablePastDate) {
                    Utility.disablePastDate(targ, disablePastDate);
                }
                break;
            case 'time':
                opts.onSelect = function (dateText) {
                    dateText = new Date(dateText).format('shortTime');
                    commonOnSelect(dateText);
                };
                $(targ).timepicker(opts);
                break;
            default: // date
                opts.onSelect = function (dateText) {
                    dateText = new Date(dateText).format('generalDateOnly');
                    $(targ).datepicker('hide'); // hide date picker only, because one click is enough
                    commonOnSelect(dateText);
                };
                $(targ).datepicker(opts);
                Utility.disablePastDate(targ, disablePastDate);
                break;
        }
        $(targ).attr('type', 'datetime');
    },
    //#region JPicker 
    cleanupJPicker: function (viewId) {
        if ($.jPicker && $.jPicker.List) {
            var i = 0;
            var length = $.jPicker.List.length;
            try {
                for (i = length - 1; i >= 0; i--) {
                    var jpList = $.jPicker.List[i]; //List of dom elements .jPickers is called against
                    if (jpList && $(jpList).data('viewid') === viewId) {
                        var $jpick = $(jpList).siblings('.jPicker');
                        try {
                            jpList.destroy(); //Destroy releases events and null in memory pointers, does not remove added dom elements.
                        } catch (ee) {
                            Utility.OutputToConsole('jPicker destroy', ee);
                        }
                        try {
                            $jpick.remove(); //Remove added dom elements.
                        } catch (eee) {
                            Utility.OutputToConsole('jpick remove', eee);
                        }
                    }
                }
            } catch (eeee) {
                Utility.OutputToConsole('jpicker cleanup', eeee);
            }
        }
    },
    addJPickerTracking: function ($jPickerResult, viewId) {
        $jPickerResult.data('viewid', viewId);
    },
    getJPickerByViewId: function (viewId) {
        var jPickers = {};
        if ($.jPicker && $.jPicker.List) {
            var i = 0;
            var length = $.jPicker.List.length;
            for (i = 0; i < length; i++) {
                var jpList = $.jPicker.List[i]; //List of dom elements .jPickers is called against
                if (jpList && $(jpList).data('viewid') === viewId) {
                    var type = $(jpList).attr('class');
                    jPickers[type] = jpList;
                }
            }
        }
        return jPickers;
    },
    //#endregion JPIcker
    safeLength: function (a) {
        if (a && a.hasOwnProperty('length')) {
            return a.length;
        }
        return 0;
    },
    adjustResizeablePosition: function ($textArea) {
        if ($textArea.length > 0) {
            var elem = $textArea[0];
            var imgElem = $textArea.parent().find('.ui-resizable-handle');
            if (elem.clientHeight < elem.scrollHeight && elem.clientHeight > 32) {
                imgElem.css('margin', '0 18px 0 0');
                $textArea.css('overflow-y', 'scroll');
            }
            else {
                imgElem.css('margin', '0');
                $textArea.css('overflow-y', '');
            }
        }
    },
    pad: function (val, len, padStr) {
        val = String(val);
        len = len || 6;
        if (!padStr) {
            padStr = "0";
        }
        while (val.length < len) {
            val = "0" + val;
        }
        return val;
    },
    distance: function (x1, y1, x2, y2) {
        var x = x1 - x2;
        var y = y1 - y2;
        return Math.sqrt(x * x + y * y);
    }
};
Number.prototype.nth = function () {
    if (this > 3 && this < 21) {
        return this + Constants.c.th;
    }
    var suffix = this % 10;
    switch (suffix) {
        case 1: return this + Constants.c.st;
        case 2: return this + Constants.c.nd;
        case 3: return this + Constants.c.rd;
        default: return this + Constants.c.th;
    }
};
// Override jqgrid's defaults
if ($ && $.jgrid && $.jgrid.defaults) {
    $.extend($.jgrid.defaults, {
        autoencode: true
    });
}
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        var i, j;
        for (i = (start || 0), j = this.length; i < j; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}
if ($.datepicker && $.datepicker._updateDatepicker) {
    var old_fn = $.datepicker._updateDatepicker;
    $.datepicker._updateDatepicker = function (inst) {
        old_fn.call(this, inst);
        $(this).datepicker("widget").find(".ui-datepicker-buttonpane").find(".ui-datepicker-clean").remove();
        if (inst.settings.displayClearButton) {
            var buttonPane = $(this).datepicker("widget").find(".ui-datepicker-buttonpane");
            $("<button type='button'  class='.ui-datepicker-clean ui-state-default ui-priority-primary ui-corner-all'>" + Constants.c.clear + "</button>").appendTo(buttonPane).click(function (ev) {
                $(inst.input).val("").trigger('change').datepicker('hide');
                if (inst.settings.triggerDirty) {
                    $('body').trigger('isDirty');
                }
            });
        }
    };
}
if ($.fn && $.fn.jPicker && $.fn.jPicker.defaults && $.fn.jPicker.defaults.images) {    // Set the content path for jpicker images
    $.fn.jPicker.defaults.images.clientPath = 'Content/images/';/* Path to image files */
    $.fn.jPicker.defaults.images.picker = {
        file: "picker.png", // Note: scain - replaced picker.gif with picker.png
        width: 18,
        height: 18
    };
    var f = function (colorObj) {
        return new $.jPicker.Color(colorObj);
    };
    $.fn.jPicker.defaults.color.quickList = [
        new f({ h: 360, s: 33, v: 100 }), new f({ h: 360, s: 66, v: 100 }), new f({ h: 360, s: 100, v: 100 }), new f({ h: 360, s: 100, v: 75 }), new f({ h: 360, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 100 }),
        new f({ h: 30, s: 33, v: 100 }), new f({ h: 30, s: 66, v: 100 }), new f({ h: 30, s: 100, v: 100 }), new f({ h: 30, s: 100, v: 75 }), new f({ h: 30, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 90 }),
        new f({ h: 60, s: 33, v: 100 }), new f({ h: 60, s: 66, v: 100 }), new f({ h: 60, s: 100, v: 100 }), new f({ h: 60, s: 100, v: 75 }), new f({ h: 60, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 85 }),
        new f({ h: 90, s: 33, v: 100 }), new f({ h: 90, s: 66, v: 100 }), new f({ h: 90, s: 100, v: 100 }), new f({ h: 90, s: 100, v: 75 }), new f({ h: 90, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 75 }),
        new f({ h: 120, s: 33, v: 100 }), new f({ h: 120, s: 66, v: 100 }), new f({ h: 120, s: 100, v: 100 }), new f({ h: 120, s: 100, v: 75 }), new f({ h: 120, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 65 }),
        new f({ h: 150, s: 33, v: 100 }), new f({ h: 150, s: 66, v: 100 }), new f({ h: 150, s: 100, v: 100 }), new f({ h: 150, s: 100, v: 75 }), new f({ h: 150, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 55 }),
        new f({ h: 180, s: 33, v: 100 }), new f({ h: 180, s: 66, v: 100 }), new f({ h: 180, s: 100, v: 100 }), new f({ h: 180, s: 100, v: 75 }), new f({ h: 180, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 45 }),
        new f({ h: 210, s: 33, v: 100 }), new f({ h: 210, s: 66, v: 100 }), new f({ h: 210, s: 100, v: 100 }), new f({ h: 210, s: 100, v: 75 }), new f({ h: 210, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 35 }),
        new f({ h: 240, s: 33, v: 100 }), new f({ h: 240, s: 66, v: 100 }), new f({ h: 240, s: 100, v: 100 }), new f({ h: 240, s: 100, v: 75 }), new f({ h: 240, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 30 }),
        new f({ h: 270, s: 33, v: 100 }), new f({ h: 270, s: 66, v: 100 }), new f({ h: 270, s: 100, v: 100 }), new f({ h: 270, s: 100, v: 75 }), new f({ h: 270, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 25 }),
        new f({ h: 300, s: 33, v: 100 }), new f({ h: 300, s: 66, v: 100 }), new f({ h: 300, s: 100, v: 100 }), new f({ h: 300, s: 100, v: 75 }), new f({ h: 300, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 15 }),
        new f({ h: 330, s: 33, v: 100 }), new f({ h: 330, s: 66, v: 100 }), new f({ h: 330, s: 100, v: 100 }), new f({ h: 330, s: 100, v: 75 }), new f({ h: 330, s: 100, v: 50 }), new f({ h: 180, s: 0, v: 0 })
    ];
}
// work around a bug (#12888)
// Extend query stopPropagation event to handle Saved Search Combo Box which Remains open.
if ($.Event.prototype.stopPropagation) {
    var originalStopPropagation = $.Event.prototype.stopPropagation;
    $.Event.prototype.stopPropagation = function () {
        var event = this.originalEvent;
        if (event && !$(event.currentTarget).eq(0).hasClass('savedSearchSelection')) {
            $('body').trigger("click");
        }
        return originalStopPropagation.apply(this, arguments);
    };
}
(function () {
    jQuery.extend($.valHooks, {
        span: {
            get: function (elem) {
                var val = jQuery.find.attr(elem, "value");
                return val;
            },
            set: function (elem, value) {
                $(elem).attr('value', value);
            }
        }

    });
}());
(function () {
    var matched, browser;

    // Use of jQuery.browser is frowned upon.
    // More details: http://api.jquery.com/jQuery.browser
    // jQuery.uaMatch maintained for back-compat
    jQuery.uaMatch = function (ua) {
        ua = ua.toLowerCase();

        var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
            /(webkit)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) ||
            (ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua)) ||
            [];

        return {
            browser: match[1] || "",
            version: match[2] || "0"
        };
    };

    matched = jQuery.uaMatch(navigator.userAgent);
    browser = {};

    if (matched.browser) {
        browser[matched.browser] = true;
        browser.version = matched.version;
    }

    // Chrome is Webkit, but Webkit is also Safari.
    if (browser.chrome) {
        browser.webkit = true;
    } else if (browser.webkit) {
        browser.safari = true;
    }

    jQuery.browser = browser;
}());
//Extend jquery dialogs title set method
$.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, {
    _title: function (title) {
        if (!this.options.title) {
            title.html("&#160;");
        } else {
            title.html(this.options.title);
        }
    }
}));

// Adds alsoResizeReverse so you can collapse one panel while expanding the other
if ($.ui && $.ui.plugin) {
    $.ui.plugin.add("resizable", "alsoResizeReverse", {
        start: function (event, ui) {

            var self = $(this).data("resizable"), o = self.options;

            var _store = function (exp) {
                $(exp).each(function () {
                    $(this).data("resizable-alsoresize-reverse", {
                        width: parseInt($(this).width(), 10), height: parseInt($(this).height(), 10),
                        left: parseInt($(this).css('left'), 10), top: parseInt($(this).css('top'), 10)
                    });
                });
            };

            if (typeof (o.alsoResizeReverse) === 'object' && !o.alsoResizeReverse.parentNode) {
                if (o.alsoResizeReverse.length) { o.alsoResize = o.alsoResizeReverse[0]; _store(o.alsoResizeReverse); }
                else { $.each(o.alsoResizeReverse, function (exp, c) { _store(exp); }); }
            } else {
                _store(o.alsoResizeReverse);
            }
        },
        resize: function (event, ui) {
            var self = $(this).data("resizable"), o = self.options, os = self.originalSize, op = self.originalPosition;
            var delta = {
                height: (self.size.height - os.height) || 0, width: (self.size.width - os.width) || 0,
                top: (self.position.top - op.top) || 0, left: (self.position.left - op.left) || 0
            },
        _alsoResizeReverse = function (exp, c) {
            $(exp).each(function () {
                var el = $(this), start = $(this).data("resizable-alsoresize-reverse"), style = {}, css = c && c.length ? c : ['width', 'height', 'top', 'left'];

                $.each(css || ['width', 'height', 'top', 'left'], function (i, prop) {
                    var sum = (start[prop] || 0) - (delta[prop] || 0);
                    if (sum && sum >= 0) {
                        style[prop] = sum || null;
                    }
                });

                //Opera fixing relative position
                if (/relative/.test(el.css('position')) && $.browser.opera) {
                    self._revertToRelativePosition = true;
                    el.css({ position: 'absolute', top: 'auto', left: 'auto' });
                }

                el.css(style);
            });
        };

            if (typeof (o.alsoResizeReverse) === 'object' && !o.alsoResizeReverse.nodeType) {
                $.each(o.alsoResizeReverse, function (exp, c) { _alsoResizeReverse(exp, c); });
            } else {
                _alsoResizeReverse(o.alsoResizeReverse);
            }
        },
        stop: function (event, ui) {
            var self = $(this).data("resizable");
            //Opera fixing relative position
            if (self._revertToRelativePosition && $.browser.opera) {
                self._revertToRelativePosition = false;
                el.css({ position: 'relative' });
            }
            $(this).removeData("resizable-alsoresize-reverse");
        }
    });
}

// Implemented for - Bug 11532 - http://pedro.docstar.com/b/show_bug.cgi?id=11532
// THIS IS A FUGLY HACKISH type thing
// This is to make it so 'touchend' events (eg. double tap on an IOS device, iphone, ipad, ipod...) behave as doubleclick events
// this was taken and modified from - http://stackoverflow.com/a/24952171/923951
// I didn't like the use of userAgent to detect if it is an IOS device specifically - so I changed it to use the 'ontouchend' in this check
// however the 'ontouchend' detection works properly and was taken from - a check made in the library suggested in - http://stackoverflow.com/a/11024683/923951
$.event.special.dblclick = {
    setup: function (data, namespaces) {
        var $elem = $(this);
        if ('ontouchend' in this) {
            $elem.on('touchend.dblclick', $.event.special.dblclick.handler);
        } else {
            $elem.on('click.dblclick', $.event.special.dblclick.handler);
        }
    },
    teardown: function (namespaces) {
        var $elem = $(this);
        if ('ontouchend' in this) {
            $elem.off('touchend.dblclick');
        } else {
            $elem.off('click.dblclick', $.event.special.dblclick.handler);
        }
    },
    handler: function (event) {
        var $elem = $(event.target);
        var lastTouch = $elem.data('lastTouch') || 0;
        var now = new Date().getTime();
        var delta = now - lastTouch;
        if (delta > 20 && delta < 500) {
            $elem.data('lastTouch', 0);
            $elem.trigger('dblclick');
        } else {
            $elem.data('lastTouch', now);
        }
    }
};