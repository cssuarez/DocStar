// Utility for sort functions
var Sort = {
    alphaNumeric: function (a, b) {
        if (!a) {
            a = '';
        }
        if (!b) {
            b = '';
        }
        // This could be the fastest sort option but it sorts numbers in alphabetical order (i.e. 1, 10, 105, 11, 2)
        //return a.localeCompare(b);

        // This is another fast option that allows to be customized as needed to fix the problem sorting numerical parts
        //for (var i = 0, n = Math.max(a.length, b.length) ; i < n && a.charAt(i) === b.charAt(i) ; ++i);
        //if (i === n) return 0;
        //return a.charAt(i) < b.charAt(i) ? -1 : 1;

        // The code below has a bug as numbers in the middle are stripped off on the comparision and the order is not correct (i.e. "Auction 2005", "Auction 2007", "Auction 2006 Volume1", "Auction 2006 Volume2")
        // sortAlphaNumeric is only called to sort ldapList (It is not called for foldes anymore)
        var reA = /[^a-zA-Z]/g;
        var reN = /[^0-9]/g;
        var reNWithDec = /[^(0-9.?)]/g;
        var aA = a.replace(reA, "");
        var bA = b.replace(reA, "");
        var startsWithNumRegEx = new RegExp(/^\d.*/);
        var startsWithNumA = startsWithNumRegEx.test(a);
        var startsWithNumB = startsWithNumRegEx.test(b);
        if (startsWithNumA && !startsWithNumB) {
            return -1;
        }
        if (!startsWithNumA && startsWithNumB) {
            return 1;
        }
        var aN;
        var bN;
        if ((startsWithNumA && startsWithNumB)) {
            var startNum = /\d*/;
            aN = parseFloat(a.match(startNum)[0]);
            bN = parseFloat(b.match(startNum)[0]);
            var aNoStartNum = a.replace(startNum, '');
            var bNoStartNum = b.replace(startNum, '');
            return aN === bN ? (aNoStartNum > bNoStartNum ? 1 : -1) : aN > bN ? 1 : -1;
        }
        if (aA === bA) {
            aN = parseFloat(a.replace(reNWithDec, ""));
            bN = parseFloat(b.replace(reNWithDec, ""));
            aN = isNaN(aN) ? parseFloat(a.replace(reN, "")) : aN;
            bN = isNaN(bN) ? parseFloat(b.replace(reN, "")) : bN;
            return aN === bN ? 0 : aN > bN ? 1 : -1;
        }
        return aA > bA ? 1 : -1;
    }
};