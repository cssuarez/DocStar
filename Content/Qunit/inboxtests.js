var InboxTests = {
	init: function() {
		module('Inbox Tests');
		Base.waitForAjaxLoad();
		test('Inbox Tree exists', function() {
			ok(Base.h.$('#inbox_list').length === 1, 'Inbox Tree Exists');
		});
		test('Default Inbox is visible', function() {
			ok(Base.h.$('#inbox_list').is(":contains(Default)"), 'Default Inbox Exists'); 
		});
		// Inboxes tree test   71001
		var anchor = Base.h.$('.root_list').children().children().children().children();
		Base.h.$("#inbox_list").jstree("close_node","#Root");
		Base.waitForAjaxLoad();
		test('Inbox tree has closed', function() {
			ok(Base.h.$(anchor[0]).attr('title') === "Inboxes", 'Inbox found'); 
			ok(Base.h.$(anchor[0]).attr('class') === "jstree-last jstree-closed", 'Inbox closed'); 
		});
		Base.h.$("#inbox_list").jstree("open_node","#Root");
		Base.waitForAjaxLoad();
		test('Inbox tree has opened', function() {
			ok(Base.h.$(anchor[0]).attr('title') === "Inboxes", 'Inbox found'); 
			ok(Base.h.$(anchor[0]).attr('class') === "jstree-last jstree-open", 'Inbox opened'); 
		});
		Base.h.$("#folder_list").jstree("close_node","#Root");
		Base.waitForAjaxLoad();
		test('Folder tree has closed', function() {
			ok(Base.h.$(anchor[1]).attr('title') === "Folders", 'Folders found'); 
			ok(Base.h.$(anchor[1]).attr('class') === "jstree-last jstree-closed", 'Folders closed'); 
		});
		Base.h.$("#folder_list").jstree("open_node","#Root");
		Base.waitForAjaxLoad();
		test('Folder tree has opened', function() {
			ok(Base.h.$(anchor[1]).attr('title') === "Folders", 'Folders found'); 
			ok(Base.h.$(anchor[1]).attr('class') === "jstree-last jstree-open", 'Folders opened'); 
		});
	}
};