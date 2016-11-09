var Timer = {
    times: [],
    getTimerObj: function(label) {
        return { l:label, s: new Date().getTime() };
    },
    startTime: function (label) {
        Timer.times = [];
        Timer.times.push(Timer.getTimerObj(label));
    },
    endTime: function (label) {
        Timer.times.push(Timer.getTimerObj(label));
        Timer.printTimes();
    },
    markTime: function (label) {
        Timer.times.push(Timer.getTimerObj(label));
    },
    printTimes: function () {
        var l = Timer.times.length;
        var i = 0;
        var str = '';
        var previous = 0;
        for (i = 0; i < l; i++) {
            var obj = Timer.times[i];
            var ms = previous;
            if (previous !== 0) {
                ms = obj.s - previous;
            }
            previous = obj.s;
            str = str + obj.l + ' ' + ms.toString() + 'ms\n';
        }
        Utility.OutputToConsole(str);
    }
};

var Timer2 = {
    times: {},
    getTimerObj: function (label) {
        return { l: label, s: new Date().getTime() };
    },
    endTime: function (groupId, label) {
        Timer2.times[groupId].push(Timer.getTimerObj(label));
        Timer2.printTimes(groupId);
    },
    markTime: function (groupId, label) {
        if (!Timer2.times[groupId]) {
            Timer2.times[groupId] = [];
        }
        Timer2.times[groupId].push(Timer.getTimerObj(label));
    },
    printTimes: function (groupId) {
        var times = Timer2.times[groupId];
        if (!times) {
            return;
        }
        var l = times.length;
        var i = 0;
        var str = '';
        var previous = 0;
        for (i = 0; i < l; i++) {
            var obj = times[i];
            var ms = previous;
            if (previous !== 0) {
                ms = obj.s - previous;
            }
            previous = obj.s;
            str = str + obj.l + ' ' + ms.toString() + 'ms\n';
        }
        Utility.OutputToConsole(str);
    }
};