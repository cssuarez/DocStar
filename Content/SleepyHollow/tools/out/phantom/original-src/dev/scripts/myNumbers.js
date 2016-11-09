define(function () {
    'use strict';

    var self = {};

    self.add = function add() {
        var operands = Array.prototype.slice.call(arguments),
            total = 0;

        for (var i = 0; i < operands.length; i++) {
            if (typeof operands[i] === 'string') {
                operands[i] = parseInt(operands[i], 10) || 0;
            }
            total += operands[i];
        }

        return total;
    }

    return self;
});