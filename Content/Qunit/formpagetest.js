var FomrPageTests = {
	init: function() {
		module('FormPage Tests');
		/*test('Form Tab exists', function() {
			ok(Base.h.$('a[href="#Home"]').text() === 'Home', 'home exists');
		});*/
		test('Form Tab is visible', function() {
		    ok(Base.h.$('#forms_tab').is(':visible'), 'testing if this panel is showing');
		});
		Base.h.$('.ptitle').mouseover();
		Base.sleep(4);
		test('Form tests', function() {
		    ok(Base.h.$('.editTabOrder'). text() === "Email Support", 'Email Support exists');
			ok(Base.h.$('#requestHelp').click(), 'Submit input opens');
			Base.h.$('#helpDialogMessage').val('Qunit eclipse email support test');
			Base.sleep(4);
			ok(Base.h.$('.ui-button:contains("OK"):visible').click());
			Base.sleep(4);
		    ok(Base.h.$('#submitIdea').text() === "Betterizer", 'Betterizer exists');
			ok(Base.h.$('#submitIdea').click(), 'Submit input opens');
			Base.h.$('#ideaDialogMessage').val('Qunit eclipse email Betterizer test');
			Base.sleep(4);
			ok(Base.h.$('.ui-button:contains("OK"):visible').click());
			Base.sleep(4);
			ok(Base.h.$('#version').text().length > 0 && Base.h.$('#version').text() != null, 'Version Exists');
		});
		Base.h.$('.ptitle').mouseleave();
		if ($('#runValidatorTests').is(':checked') === true) {
			validatorTests.init();
			//Base.sleep(4);
		}
	}
};
