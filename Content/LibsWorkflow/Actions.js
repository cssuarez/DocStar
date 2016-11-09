var Actions = {
    hex: 0,
    actions: {},
    panels: {},
    init: function (actions, panels, hex) {
        Actions.hex = parseInt(hex, 16);
        Actions.actions = actions;
        Actions.panels = panels;
    },
    getActionValue: function (name) {
        //return 0,1,2,3 (00,01,10,11);
        return (Actions.hex >> Actions.panels[name]) & 3;
    },
    setActionValue: function (name, value) {
        var bits = value << Actions.panels[name];
        var mask = 3 << Actions.panels[name];
        Actions.hex = (Actions.hex & ~mask) | bits;
    },
    drawActions: function (el) {
        $(el).html('');
        var header = $('<div></div>');
        var name = $('<span></span>');
        $(header).append($(name).text(' ').addClass('pheader_panel'));
        $.map(Actions.actions, function (value, key) {
            var tmp = $('<span></span>');
            $(header).append($(tmp).text(key).addClass('pheader_action'));
        });
        $(el).append(header);
        var panels = $('<div></div>');
        $.map(Actions.panels, function (value, key) {
            var tmp_top = $('<div></div>').addClass('row');
            $(tmp_top).append($('<span></span>').text(key.replace('_', ' ')).addClass('plabel'));
            value = Actions.getActionValue(key);
            $.map(Actions.actions, function (v, k) {
                var input = $('<input/>').attr('type', 'radio').attr('name', key).val(v).addClass('ignore');
                if (v === value) {
                    $(input).attr('checked', 'checked');
                }
                $(tmp_top).append(input);
            });
            $(panels).append($('<div></div>').append(tmp_top));
        });
        $(el).append(panels);
        //set each input

        $(el).delegate('input', 'click', function (ev, r, t) {
            $.map(Actions.panels, function (value, key) {
                var val = $('#actions_section input[name="' + key + '"]:checked').val();
                Actions.setActionValue(key, val);
            });
            $('input[name="ActionsHex"]').val('0x' + Actions.decimalToHexString(Actions.hex));
        });

    },
    decimalToHexString: function (number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }
        return number.toString(16).toUpperCase();
    },

    calculateActionsHex: function () {
        return Actions.hex;
    },
    getOne: function () {
        return Actions.hex & 1;
    },
    setOne: function (value) {
        var mask = ~1;
        Actions.hex = (Actions.hex & mask) | value;
        $('input[name="ActionsHex"]').val('0x' + Actions.decimalToHexString(Actions.hex));
    },
    getTwo: function () {
        return Actions.hex & 2;
    },
    setTwo: function (value) {
        var mask = ~2;
        Actions.hex = (Actions.hex & mask) | value;
        $('input[name="ActionsHex"]').val('0x' + Actions.decimalToHexString(Actions.hex));
    },
    getOnlyOnce: function () {
        return Actions.hex & 0x10;

    },
    setOnlyOnce: function (value) {
        var mask = ~0x10;
        Actions.hex = (Actions.hex & mask) | value;
        $('input[name="ActionsHex"]').val('0x' + Actions.decimalToHexString(Actions.hex));
    }
};