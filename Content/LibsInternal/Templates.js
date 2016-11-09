var Templates = {
    html: 'html4',
    //cache requests
    cache: {},
    init: function () {
        try {
            var data = $('#commontemplates').val();
            var obj = JSON.parse(data);
            var x;
            for (x in obj) {
                if (obj.hasOwnProperty(x)) {
                    Templates.cache[x] = obj[x];
                }
            }
        } catch (e) {
            Templates.cache = {};
        }

    },
    get: function (filename) {
        filename = filename + '_' + Templates.html;
        if (Templates.cache[filename]) {
            return Templates.cache[filename];
        }
        var str = '';
        $.ajax({
            url: String.format('{0}Content/templates/' + filename + '.cshtml?{1}', Constants.Url_Base, Utility.getEclipseVersion()),
            async: false,
            success: function (resp) {
                str = resp;
                Templates.cache[filename] = resp;
            }
        });
        return str;
    },
    getCompiled: function (filename) {
        var cid = filename + 'compiled';
        if (!Templates.cache[cid]) {
            var t = Templates.get(filename);
            var ct = doT.template(t);
            Templates.cache[cid] = ct;
        }

        return Templates.cache[cid];
    }
};