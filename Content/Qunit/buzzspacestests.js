var BuzzSpacesTests = {
	init: function() {
			
		var anchor = Base.h.$('#admin_menu a:contains("BuzzSpace")');	
		anchor[0].click();	
		//alert(anchor);
	
		module('Buzz Spaces Tests');
		test('BuzzSpace link exists', function() {
		ok(Base.h.$('a[href="#AdminBuzzSpacesManager"]').text() === 'BuzzSpace', 'BuzzSpace link exists');
		});
		test('BuzzSpace is visible', function() {
		ok(Base.h.$('a[href="#AdminBuzzSpacesManager"]').is(':visible'), 'testing if the BuzzSpace panel is showing');
		});
		Base.sleep(5);
		// Buzz Spaces Manager page tests
		
	},
		// additional tests

	
	
};