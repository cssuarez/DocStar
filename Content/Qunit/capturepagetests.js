var CapturePageTests = {
	init: function() {
		module('CapturePage Tests');
		test('Capture Tab exists', function() {
			ok(Base.h.$('a[href="#Capture"]').text() === 'Capture', 'capture exists');
		});
		
		test('Capture Tab is visible', function() {
			ok(Base.h.$('#capture_tab').is(':visible'), 'testing if this panel is showing');
		});
		// $('#sl').text()
		if ($('#runValidatorTests').is(':checked') === true) {
			validatorTests.init();
			Base.sleep(9);
		}
	}
};
