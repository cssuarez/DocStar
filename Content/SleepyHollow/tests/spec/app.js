describe('TestApp', function() {
    
    var app = new ExampleApp();
    
    describe('The add method', function () {

        it('should accept exactly two arguments', function () { 
            expect(app.add(1, 1)).toBeTruthy();
            expect(app.add(1)).toBeFalsy();
            expect(app.add(1, 2, 3)).toBeFalsy();
        });

        it('should accept only numbers as arguments', function () {
            expect(app.add(1, 1)).toBeTruthy();
            expect(app.add(1, 'whoops')).toBeFalsy();
            expect(app.add('oh', 'no')).toBeFalsy();
        });

        it('should accept two numbers and return the sum of them', function () {
            expect(app.add(1, 1)).toEqual(2);
            expect(app.add(15, 5)).toEqual(20);
        });

    });

    describe('The subtract method', function () {

        it('should accept exactly two arguments', function () {
            expect(app.subtract(1)).toBeFalsy();
            expect(app.subtract(1, 2, 3)).toBeFalsy();
        });

        it('should accept only numbers as arguments', function () {
            expect(app.subtract(1, 'whoops')).toBeFalsy();
            expect(app.subtract('oh', 'no')).toBeFalsy();
        });

        it('should accept two numbers and return the difference between them', function () {
            expect(app.subtract(1, 1)).toEqual(0);
            expect(app.subtract(15, 5)).toEqual(10);
        });

    });

    describe('The divide method', function () {

        it('should accept exactly two arguments', function () {
            expect(app.divide(1, 1)).toBeTruthy();
            expect(app.divide(1)).toBeFalsy();
            expect(app.divide(1, 2, 3)).toBeFalsy();
        });

        it('should accept only numbers as arguments', function () {
            expect(app.divide(1, 1)).toBeTruthy();
            expect(app.divide(1, 'whoops')).toBeFalsy();
            expect(app.divide('oh', 'no')).toBeFalsy();
        });

        it('should accept two numbers and return the first divdided by the second', function () {
            expect(app.divide(1, 1)).toEqual(1);
            expect(app.divide(15, 5)).toEqual(3);
        });

    });

    describe('The multiply method', function () {

        it('should accept exactly two arguments', function () {
            expect(app.multiply(1, 1)).toBeTruthy();
            expect(app.multiply(1)).toBeFalsy();
            expect(app.multiply(1, 2, 3)).toBeFalsy();
        });

        it('should accept only numbers as arguments', function () {
            expect(app.multiply(1, 1)).toBeTruthy();
            expect(app.multiply(1, 'whoops')).toBeFalsy();
            expect(app.multiply('oh', 'no')).toBeFalsy();
        });

        it('should accept two numbers and return the first multiplied by the second', function () {
            expect(app.multiply(1, 1)).toEqual(1);
            expect(app.multiply(3, 5)).toEqual(15);
        });

    });

    describe('The sum method', function () {

        it('should accept an array as an argument', function () {
            expect(app.sum([1, 1])).toBeTruthy();
            expect(app.sum('whoops')).toBeFalsy();
            expect(app.sum({ first: 1, second: 1})).toBeFalsy();
        });

        it('should accept an array of numbers and return the sum of them, ignoring non-numeric items', function () {
            expect(app.sum([1, 1, 1])).toEqual(3);
            expect(app.sum([{}, 1, 1, 'whoops'])).toEqual(2);
            expect(app.sum([0, 10, 1, 0])).toEqual(11);
        });

    });

});