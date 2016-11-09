var WorkflowPageTests = {
	init: function() {
		module('Workflow Page Tests');
		test('Workflow Tab exists', function() {
			ok(Base.h.$('a[href="#Workflow"]').text() === 'Workflow', 'Workflow exists');
		});
		test('Workflow Tab is visible', function() {
			ok(Base.h.$('#workflow_tab').is(':visible'), 'testing if this panel is showing');
		}); 
		// AP Workflow must be already imported and assigned to documents
		// Testing without system setting "Enable Approval Stamps" -disabled no approval stamps
		Base.h.$('#admin_tab').click();
		var anchor = Base.h.$('#admin_menu a');
		anchor[14].click();	
		Base.sleep(2);
		Base.h.$('select[name="Id"] option:contains("Enable Approval Stamps")').attr('selected',true);
		Base.h.$('select[name="Id"] option:selected').change();
		Base.sleep(2);
		if (Base.h.$('input[id="val_type"]').is(':checked') === true) {
			Base.h.$('input[id="val_type"]').click();
			Base.sleep(2);
			Base.h.$('input[name="save_ss"]').click();
			Base.sleep(2);
		}
		Base.sleep(2);
		Base.h.$('select[name="Id"] option:contains("Enable Approval Stamps")').attr('selected',true);
		Base.h.$('select[name="Id"] option:selected').change();
		Base.sleep(2);
		test('Admin Approval Stamps setting', function() {
		ok(Base.h.$('input[id="val_type"]').is(':checked') === false, "setting is disabled");
		});
		Base.sleep(2);
		Base.h.$('#workflow_tab').click();
		// Workflow results Limit must be set to 3
		Base.h.$('.maxResults').val(3);
		Base.sleep(3);
		Base.h.$('.maxResults').keyup();
		Base.h.$('.maxResults').change();
		Base.sleep(3);			
		// Must reload WF page for click ids to be correct
		Base.h.window.location.reload(); 
		Base.waitForWindowLoad();
		Base.sleep(3);
		Base.h.$('.accordion').show();
		Base.sleep(3);
		var wflist = Base.h.$(".selectAllItems");
		wflist[2].click();
		Base.sleep(3);
		var view = Base.h.$('.view_results');
		view[1].click();
		Base.sleep(3); // Ticket 13225
		test('Submit and move next document approvals no stamps', function(){
			ok(Base.h.$('.wfApprove').length == 2, 'Approve button exits document 1');
			if(Base.h.$('.wfApprove').length == 2) 
			{
			Base.h.$('.wfApprove').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #1 OK');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #1 OK', "Comment 1 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			}
			ok(Base.h.$('.wfDeny').length == 2, 'Deny button exits document 2');
			if(Base.h.$('.wfDeny').length == 2) 
			{
			Base.h.$('.wfDeny').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #2 No good');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #2 No good', "Comment 2 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			}
			ok(Base.h.$('.wfApprove').length == 2, 'Approve button exits document 3');
			if(Base.h.$('.wfApprove').length == 2) 
			{
			Base.h.$('.wfApprove').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #3 OK');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #3 OK', "Comment 3 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			}
		});
		// Testing with system setting "Enable Approval Stamps" -enabled using approval stamps here
		Base.h.$('#admin_tab').click();
		var anchor = Base.h.$('#admin_menu a');
		anchor[14].click();	
		Base.sleep(2);
		Base.h.$('select[name="Id"] option:contains("Enable Approval Stamps")').attr('selected',true);
		Base.h.$('select[name="Id"] option:selected').change();
		Base.sleep(2);
		if (Base.h.$('input[id="val_type"]').is(':checked') === false) {
			Base.h.$('input[id="val_type"]').click();
			Base.sleep(2);
			Base.h.$('input[name="save_ss"]').click();
			Base.sleep(2);
		}
		Base.sleep(2);
		Base.h.$('select[name="Id"] option:contains("Enable Approval Stamps")').attr('selected',true);
		Base.h.$('select[name="Id"] option:selected').change();
		Base.sleep(2);
		test('Admin Approval Stamps setting', function() {
		ok(Base.h.$('input[id="val_type"]').is(':checked') === true, "setting is enabled");
		});
		Base.sleep(2);
		Base.h.$('#workflow_tab').click();
		Base.h.window.location.reload(); 
		Base.waitForWindowLoad();
		Base.sleep(7);	
		var wflist = Base.h.$(".selectAllItems");
		wflist[2].click();	
		Base.sleep(7);
		var view = Base.h.$('.view_results');
		view[1].click();
		Base.sleep(3); // Ticket 13225
		test('Submit and move next document approvals with stamps', function(){
			ok(Base.h.$('.wfApprove').length == 2, 'Approve button exits document 1');
			if(Base.h.$('.wfApprove').length == 2) 
			{
			Base.h.$('.wfApprove').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #1 OK');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #1 OK', "Comment 1 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			ok(Base.h.$('.anno').length === 2, "Annotation stamp");
			Base.h.$('.wfUIPromptSubmit').click();
			}
			ok(Base.h.$('.wfDeny').length == 2, 'Deny button exits document 2');
			if(Base.h.$('.wfDeny').length == 2) 
			{
			Base.h.$('.wfDeny').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #2 No good');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #2 No good', "Comment 2 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			ok(Base.h.$('.anno').length === 2, "Annotation stamp");
			Base.h.$('.wfUIPromptSubmit').click();
			}
			ok(Base.h.$('.wfApprove').length == 2, 'Approve button exits document 3');
			if(Base.h.$('.wfApprove').length == 2) 
			{
			Base.h.$('.wfApprove').click();
			Base.sleep(3);
			Base.h.$('.approveDenyDialogContents').children($('testarea')).val('PO #3 OK');
			ok(Base.h.$('.approveDenyDialogContents').find('textarea').val() === 'PO #3 OK', "Comment 3 has been added");
			Base.sleep(3);
			var apcmt = Base.h.$('.ui-button');
			apcmt[15].click();
			Base.sleep(5);
			ok(Base.h.$('.anno').length === 2, "Annotation stamp");
			Base.h.$('.wfUIPromptSubmit').click();
			Base.sleep(5);
			}
		});
	}
};