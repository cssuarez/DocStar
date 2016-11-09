/// <reference path="../LibsInternal/Utility.js" />
var DynamicDates = function () {
    var dds = {
        now: {
            sortKey: 1,
            key: Constants.t('now'),
            value: "GETDATE()"
        },

        last_Day_Start: {
            sortKey: 2,
            key: Constants.t('last_Day_Start'),
            value: "DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), -1)"
        },
        last_Day_End: {
            sortKey: 3,
            key: Constants.t('last_Day_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 0))"
        },
        current_Day_Start: {
            sortKey: 4,
            key: Constants.t('current_Day_Start'),
            value: "DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 0)"
        },
        current_Day_End: {
            sortKey: 5,
            key: Constants.t('current_Day_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 1))"
        },
        next_Day_Start: {
            sortKey: 6,
            key: Constants.t('next_Day_Start'),
            value: "DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 1)"
        },
        next_Day_End: {
            sortKey: 7,
            key: Constants.t('next_Day_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(DAY, DATEDIFF(DAY, 0, GETDATE()), 2))"
        },


        last_Week_Start: {
            sortKey: 8,
            key: Constants.t('last_Week_Start'),
            value: "DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()) - 1, -1)"
        },
        last_Week_End: {
            sortKey: 9,
            key: Constants.t('last_Week_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()), -1))"
        },
        current_Week_Start: {
            sortKey: 10,
            key: Constants.t('current_Week_Start'),
            value: "DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()), -1)"
        },
        current_Week_End: {
            sortKey: 11,
            key: Constants.t('current_Week_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()) + 1, -1))"
        },
        next_Week_Start: {
            sortKey: 12,
            key: Constants.t('next_Week_Start'),
            value: "DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()) + 1, -1)"
        },
        next_Week_End: {
            sortKey: 13,
            key: Constants.t('next_Week_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(WEEK, DATEDIFF(WEEK, 1, GETDATE()) + 2, -1))"
        },

        last_Month_Start: {
            sortKey: 14,
            key: Constants.t('last_Month_Start'),
            value: "DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH, -1, GETDATE())), 0)"
        },
        last_Month_End: {
            sortKey: 15,
            key: Constants.t('last_Month_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH, -1, GETDATE())) + 1, 0))"
        },
        current_Month_Start: {
            sortKey: 16,
            key: Constants.t('current_Month_Start'),
            value: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)"
        },
        current_Month_End: {
            sortKey: 17,
            key: Constants.t('current_Month_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) + 1, 0))"
        },
        next_Month_Start: {
            sortKey: 18,
            key: Constants.t('next_Month_Start'),
            value: "DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH,1,GETDATE())), 0)"
        },
        next_Month_End: {
            sortKey: 19,
            key: Constants.t('next_Month_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH, 1, GETDATE())) + 1, 0))"
        },

        last_Quarter_Start: {
            sortKey: 20,
            key: Constants.t('last_Quarter_Start'),
            value: "DATEADD(qq, DATEDIFF(qq, 0, GETDATE()) - 1, 0)"
        },
        last_Quarter_End: {
            sortKey: 21,
            key: Constants.t('last_Quarter_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(qq, DATEDIFF(qq, 0, GETDATE()), 0))"
        },
        current_Quarter_Start: {
            sortKey: 22,
            key: Constants.t('current_Quarter_Start'),
            value: "DATEADD(q, DATEDIFF(q, 0, GETDATE()), 0)"
        },
        current_Quarter_End: {
            sortKey: 23,
            key: Constants.t('current_Quarter_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(q, DATEDIFF(q, 0, GETDATE()) + 1, 0))"
        },
        next_Quarter_Start: {
            sortKey: 24,
            key: Constants.t('next_Quarter_Start'),
            value: "DATEADD(qq, DATEDIFF(qq, 0, GETDATE()) + 1, 0)"
        },
        next_Quarter_End: {
            sortKey: 25,
            key: Constants.t('next_Quarter_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(qq, DATEDIFF(qq, 0, GETDATE()) + 2, 0))"
        },

        last_Year_Start: {
            sortKey: 26,
            key: Constants.t('last_Year_Start'),
            value: "DATEADD(YEAR, DATEDIFF(YEAR, 0, DATEADD(YEAR, -1, GETDATE())), 0)"
        },
        last_Year_End: {
            sortKey: 27,
            key: Constants.t('last_Year_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(YEAR, DATEDIFF(YEAR, 0, DATEADD(YEAR, -1, GETDATE())) + 1, 0))"
        },
        current_Year_Start: {
            sortKey: 28,
            key: Constants.t('current_Year_Start'),
            value: "DATEADD(YEAR, DATEDIFF(YEAR, 0, GETDATE()), 0)"
        },
        current_Year_End: {
            sortKey: 29,
            key: Constants.t('current_Year_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(YEAR, DATEDIFF(YEAR, 0, GETDATE()) + 1, 0))"
        },
        next_Year_Start: {
            sortKey: 30,
            key: Constants.t('next_Year_Start'),
            value: "DATEADD(YEAR, DATEDIFF(YEAR, 0, DATEADD(YEAR,1,GETDATE())), 0)"
        },
        next_Year_End: {
            sortKey: 31,
            key: Constants.t('next_Year_End'),
            value: "DATEADD(MILLISECOND, -3, DATEADD(YEAR, DATEDIFF(YEAR, 0, DATEADD(YEAR, 1, GETDATE())) + 1, 0))"
        }
    };
    function sortDynamicDates() {
        var arr = [];
        var dd;
        for (dd in dds) {
            if (dds.hasOwnProperty(dd)) {
                arr.push(dds[dd]);
            }
        }
        var sortedArr = arr.sort(Utility.sortByProperty('sortKey'));
        return sortedArr;
    }
    return {
        getDynamicDates: function () {
            return dds;
        },
        getSortedDynamicDates: function () {
            return sortDynamicDates();
        }
    };
};