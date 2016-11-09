var RetrievePageTests = {
	init: function() {
		module('RetrievePage Tests');
		var urlVar = Base.h.window.location.href;
		$.ajax({
			type: "POST",
			url: urlVar,
			async: false,
			success: function(data){
				Base.h.$('.accordion').show() = data;
			},
			// error: function() {
			// }
		}); 
		test('Retrieve Tab exists', function() {
			ok(Base.h.$('a[href="#Retrieve"]').text() === 'Retrieve', 'retrieve exists');
		});
		test('Retrieve Tab is visible', function() {
			ok(Base.h.$('#retrieve_tab').is(':visible'), 'testing if this panel is showing');
		});	
		if ($('#runValidatorTests').is(':checked') === true) {
			validatorTests.init();
			Base.sleep(9);
		}
		//Search tests
		//Base.h.$('.accordion').show();
		RetrievePageTests.folders();
		RetrievePageTests.addField();
		RetrievePageTests.checkboxes();
		RetrievePageTests.textSearch();
	},

	folders: function() {
		test('Testing inboxes and folders', function() {
		ok(Base.h.$('.search_icon').click(), "Opened Look in container");
		Base.sleep(3);
		var buttons = Base.h.$('.ui-button');
		buttons[14].click()
		notOk(Base.h.$('#ui-id-9').is(':visible'), 'Closed Select an Inbox or Folder window');
		Base.sleep(1);
		});
	},
		addField: function() {
		test('Field testing', function() {
		ok(Base.h.$('.add_field_btn').click(), "Add field");
		Base.sleep(2);
		var list = Base.h.$('.ui-button-icon-primary');
		list[3].click();
		//Base.h.$('#ui-id-139').click();
		var test = Base.h.$('.ui-menu-item');
		test[0].click();
		});
	},
	checkboxes: function() {
		test('Checkbox testing', function() {
		var anchor = Base.h.$('input[type="checkbox"]');
		ok(anchor[0].checked, "Folders checkbox test ");
		anchor[0].click(); // uncheck Folders
		Base.sleep(1);
		ok(anchor[1].checked, "Inboxes checkbox test ");
		anchor[1].click(); // uncheck Inboxes
		Base.sleep(1);
		});
	},
	textSearch: function() {
		test('Search testing', function() {
		ok(Base.h.$('.maxResults').val(8), "Set document limit");
		ok(Base.h.$('.search_btn').click(), "Search test");
		Base.sleep(3);
		var docs = Base.h.$('input[type="checkbox"]');
		docs[5].click();
		docs[8].click();
		docs[9].click();
		ok(Base.h.$('.list_action').find('span.dropdown_arrow').eq(0).click(), "Open dropdown menu");
		Base.sleep(2);
		Base.h.$('.merge_results').click();
		Base.sleep(4);
		ok(Base.h.$('.ui-dialog-buttonpane button:contains("OK"):visible').click(), "Merge test");
		Base.sleep(9);
		ok(Base.h.$('.results_actions').setSelection, Base.h.$('.view_results').get([0]).click(), "Full page view");
		Base.sleep(4);
		ok(Base.h.$('.thumbs_menu_item').find('span.thumb_left_check').click(), "Thumbnails on left");
		Base.sleep(4);
		// $('div[title="Burst Content Item"]').click(); //burst should be followed by an imported mulitpage document
		// Base.sleep(4);
		// ok($('.ui-button-disabled').text(), "The Burst button is disabled"); // disabled button check
		ok(Base.h.$('.thumbs_menu_item').find('span.thumb_off_check').click(), "Thumbnails off");
		Base.sleep(4);
		});
	},
};