function ExampleApp () {

    var self = {},
        standardError = 'wrong input type or wrong number of arguments';

    self.add = function (a, b) {
        if (self.inputIsValid(arguments)) {
            return a + b;
        } else {
            self.reportError('add', standardError);
        }
    };

    self.subtract = function (a, b) {
        if (self.inputIsValid(arguments)) {
            return a - b;
        } else {
            self.reportError('subtract', standardError);
        }
    };

    self.divide = function (a, b) {
        if (self.inputIsValid(arguments)) {
            return a / b;
        } else {
            self.reportError('divide', standardError);
        }
    };

    self.multiply = function (a, b) {
        if (self.inputIsValid(arguments)) {
            return a * b;
        } else {
            self.reportError('multiply', standardError);
        }
    };

    self.sum = function (numbers) {
        if (typeof numbers === 'object' && numbers.length) {
            var x,
                total = 0,
                length = numbers.length;

            for (x = 0; x < length; x += 1) {
                if (typeof numbers[x] === 'number') {
                    total += numbers[x];
                } else {
                    self.reportError('sum', 'wrong input type format, disregarding', numbers[x]);
                }
            }

            return total;
        } else {
            self.reportError('sum', 'wrong argument type format, aborting', numbers);
            
        }
    };

    self.inputIsValid = function (args) {
        return args.length === 2 && typeof args[0] === 'number' && typeof args[1] === 'number' && args[1] === args[1] && args[2] === args[2];
    };

    self.reportError = function (fnName, message, arg) {
        console.log(['[', fnName, '] ', message].join(''), arg || '');
        return false;
    };

    return self;

};