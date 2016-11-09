var AdminPageTests = {
	init: function() {
		module('AdminPage Tests');
		var urlVar = Base.h.window.location.href;
		$.ajax({
			type: "POST",
			url: urlVar,
			async: false,
			success: function(data, textStatus, jqXHR) {
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		}); 
		// test admin page
		test('Admin Tab exists', function() {
			ok(Base.h.$('a[href="#Admin"]').text() === 'Admin', 'admin exists');
		});
		test('Admin Tab is visible', function() {
			ok(Base.h.$('#admin_tab').is(':visible'), 'testing if this panel is showing'); //600001
		});
		if ($('#runValidatorTests').is(':checked') === true) {
			validatorTests.init();
			Base.sleep(9);
		}
		// click event array created for admin page
		var anchor = Base.h.$('#admin_menu a');
		anchor[0].click();
		AdminPageTests.waitload();
		AdminPageTests.verifyChangePswd();
		anchor[1].click();	
		AdminPageTests.verifyPswdMgmt();
		anchor[2].click();
		AdminPageTests.verifyNewU();
		AdminPageTests.createUser();
		AdminPageTests.selectUser();
		AdminPageTests.deleteUser();
		anchor[3].click();
		AdminPageTests.verifyViewLic();
		anchor[4].click();	
		AdminPageTests.verifyNewG();
		anchor[5].click();	
		AdminPageTests.verifySecClas();
		anchor[6].click();	
		AdminPageTests.verifyBuzzSpace();
		anchor[7].click();
		AdminPageTests.verifyStampMgr();
		anchor[8].click();	
		AdminPageTests.verifyIndex();
		AdminPageTests.verifyContentT();
		anchor[9].click();
		AdminPageTests.verifyCustomF();
		anchor[10].click();
		AdminPageTests.verifyLists();
		anchor[11].click();
		AdminPageTests.verifyDataLink();
		anchor[12].click();
		AdminPageTests.verifyIntegrations();
		anchor[13].click();		
		AdminPageTests.verifyIPRestrict();
		anchor[14].click();	
		AdminPageTests.verifySysSettings();
		anchor[15].click();	
		AdminPageTests.verifyImportExport();
		anchor[16].click();
		AdminPageTests.verifyDatabaseSync();
		anchor[17].click();	
		AdminPageTests.verifySystemNote();
		anchor[18].click();				
		AdminPageTests.verifyWFDesigner();
		Base.sleep(5);
		anchor[20].click();			
		AdminPageTests.verifyRecordCag();
		anchor[21].click();	
		AdminPageTests.verifyRecordFrz();
		anchor[22].click();
		AdminPageTests.editCompany();
		anchor[23].click();
		AdminPageTests.verifyViewAudit();
		anchor[24].click();
		AdminPageTests.verifyRecycle();
		anchor[25].click();
		AdminPageTests.verifyLicensing();
		anchor[26].click();
		AdminPageTests.verifyDistribQ();
		anchor[27].click();
		AdminPageTests.verifyLDAP();
		anchor[28].click();
		AdminPageTests.verifyImportJobs();
		anchor[29].click();
		AdminPageTests.verifyDataUsageReport();
	},
	verifyChangePswd: function() {  // only available for non-admins
		Base.sleep(3);
		module('AdminPage Tests');
		test(' Change Password ', function() {
		ok(Base.h.$('a[href="#AdminChangePassword"]').text() === 'Change password', 'Change password exists');
		});
	},
	verifyPswdMgmt: function() {  // only available for non-admins
		Base.sleep(3);
		module('AdminPage Tests');
		test(' Password Management ', function() {
		ok(Base.h.$('a[href="#AdminPasswordManagement"]').text() === 'Password Management', 'Password Management exists');
		});
	},
	verifyNewU: function() {
		// Verify default selected user is New 60001
		Base.sleep(6);
		test(' Verify default New user text exists ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --", " New user exists " );
		});
	},
	createUser: function() {
		//create new user
		var usrnm = "jd@ds.com";
		var psswd = "Doc-5tar";
		var eml = "jd@ds.com";
		var fname = "Jane"
		var lname = "Doe"
		Base.h.$('[name=Username]').val(usrnm);
		Base.h.$('[name=Password]').val(psswd);
		Base.h.$('[name=password_reenter]').val(psswd);
		Base.h.$('[name=Email]').val(eml);
		Base.h.$('[name=FirstName]').val(fname);
		Base.h.$('[name=LastName]').val(lname);
		Base.h.$('input[name="Create_Edit_Users"]').click();
		Base.h.$('input[name="Create_Inboxes"]').click();
		Base.sleep(3);
		Base.h.$('input[name="save_user"]').click()
		Base.sleep(4);
		test(' Created user successfully ', function() {
		ok(Base.h.$('select[name="Id"] option:contains("jd@ds.com")').text() === "jd@ds.com", "Verfied user exists");
		});
	},
	selectUser: function() {
		// Select and verify users 60003
		Base.sleep(3);
		test(' Verified user information ', function() {
		Base.h.$('select[name="Id"] option:contains("-- New --")').attr('selected',true);
		//var txt = $('select[name="Id"]').text();
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --", " Selected -- New -- from list" );
		Base.h.$('select[name="Id"]').change();
		Base.sleep(3);
		ok(Base.h.$('input[name="Username"]').val() === "-- New --", " Username field contains correct name ");
		Base.h.$('select[name="Id"] option:contains("jd@ds.com")').attr('selected',true);
		ok(Base.h.$('select[name="Id"] option:selected').text() === "jd@ds.com", " Selected new user from list" );
		Base.h.$('select[name="Id"]').change(); //," event change ");
		ok(Base.h.$('input[name="Username"]').val() === "jd@ds.com", " Username field contains correct name ");
		});
		Base.sleep(5);
	},
	deleteUser: function() {
		// Delete user 
		test(' delete user and verify ', function() {
		ok(Base.h.$('input[name="delete_user"]').click(), " deleted user ");
		Base.sleep(2);
		ok(Base.h.$('.ui-button:contains("OK"):visible').click(), " Select Replacement ");
		ok(Base.h.$('select[name="Id"] option:selected').text() !== "jd@ds.com", " user does not exist ");
		});
		Base.sleep(5);
	},
	verifyViewLic: function() {
		Base.sleep(1);
		//<input type="button" value="Create View User" id="create_guest_user" name="create_guest_user">
		test(' View Licenses ', function() {
		ok(Base.h.$('.ui-button:contains("create_guest_user"):visible').click(), " Select Replacement ");
		});
	},
	verifyNewG: function() {
		// Verify default selected user is New 60001
		Base.sleep(6);
		test(' New text exists ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === Base.h.Constants.c.newTitle, " New exists " );
		});
	},
	verifySecClas: function() {
		// Verify default selected user is New 60001
		Base.sleep(6);
		test(' default New group text exists ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --", " New exists " );
		});
	},
	verifyBuzzSpace: function() {
		Base.sleep(3);
		test('BuzzSpace link exists', function() {
		ok(Base.h.$('a[href="#AdminBuzzSpacesManager"]').text() === 'BuzzSpace', 'BuzzSpace link exists');
		});
		test('BuzzSpace is visible', function() {
		ok(Base.h.$('a[href="#AdminBuzzSpacesManager"]').is(':visible'), 'testing if the BuzzSpace panel is showing');
		});
		Base.sleep(3);
	},
	verifyStampMgr: function() {
		Base.sleep(3);
		test('BuzzSpace is visible', function() {
		ok(Base.h.$('a[href="#AdminStampManager"]').is(':visible'), 'testing if the Stamp Manager panel is showing');
		});
		Base.sleep(3);
	},
	verifyIndex: function() {
		// Verify default selected user is New 60001
		Base.sleep(3);
		test(' ReIndex button ', function() {
		ok(Base.h.$('input[value="ReIndex"]').val() === "ReIndex", " ReIndex button exists ");
		});
	},
	verifyContentT: function() {
		Base.sleep(2);
		Base.h.$('.contentTypeBuilder').find('span.fleft').eq(0).click();
		Base.sleep(3);
		test(' Check a tab in Content type builder ', function() {
		ok(Base.h.$('#contentTypeBuilderAdvancedTab').text() == "Advanced", " Verify Advanced tab ");
		});
		Base.h.$('.ui-button.ui-widget.ui-state-default.ui-corner-all.ui-button-icon-only.ui-dialog-titlebar-close').click();
	},
	verifyCustomF: function() {
		Base.sleep(3);
		test(' default New CustomField text exists ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --", " New exists " );
		});
	},
	verifyLists: function() {
		Base.sleep(3);
		test(' default New List text exists ', function() {
		ok(Base.h.$('input[name="listName"]').val() === "-- New --", " New exists " );
		});
	},
	verifyDataLink: function() {
		Base.sleep(5);
		test(' DataLink ', function() {
		ok(Base.h.$('select[id="allConnections"] option:selected').text() === "-- New --", " New exists " );
		});
	},
	verifyIntegrations: function() {
		Base.sleep(5);
		test(' Integrations ', function() {
		ok(Base.h.$('input[name="Prefix"]').length, " Prefix input exists " );
		});
	},
	verifyIPRestrict: function() {
		Base.sleep(3);
		test(' IP Restrictions ', function() {
		ok(Base.h.$('input[id="testIPAddress"]').length === 1, " Test IP Address field exist");
		});
	},
	verifySysSettings: function() {
		Base.sleep(3);
		test(' System Settings ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --", " New exits ");
		});
	},
	verifyImportExport: function() {
		Base.sleep(3);
		test(' Import and Export ', function() {
		ok(Base.h.$('input[id="beginExport"]').val() === "Export", "Export button exits");
		});
	},
	verifyDatabaseSync: function() {
		Base.sleep(1);
		test(' Database Sync Layout ', function() {
		ok(Base.h.$('#dbSync_layout').length === 1, "dbSync_layout exits");
		});
	},
	verifySystemNote: function() {
		Base.sleep(3);
		test(' System Notifications ', function() {
		ok(Base.h.$('a[href="#AdminSystemNotifications"]').text() === "System Notifications", "System Notifications exits");
		});
	},
	verifyWFDesigner: function() {
		Base.sleep(3);
		test(' Workflow Designer ', function() {
		ok(Base.h.$('#header').length, "Workflow Designer exits");
		});
	},
	verifyActions: function() {
		Base.sleep(3);
		test(' Actions ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --");
		});
	},
	verifyRecordCag: function() {
		Base.sleep(3);
		test(' Record Categories ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --");
		});
	},
	verifyRecordFrz: function() {
		Base.sleep(3);
		test(' Record Freezes ', function() {
		ok(Base.h.$('select[name="Id"] option:selected').text() === "-- New --");
		});
	},
	editCompany: function() {
		Base.sleep(4);
		test(' Company Properties ', function() {
		ok(Base.h.$(".metainput").length === 2, " Both fields are present " );
		});
	},
	// createCompany: function() { 		//module('Company Tests');
		// var anchor = Base.h.$('#admin_menu a');
		// AdminPageTests.waitload();
		// anchor[18].click();
		// Base.sleep(6);
		// test(' Company Properties ', function() {
		// ok(Base.h.$(".metainput").length === 2, " Both fields are present " );
		// });
		// var e = 0;
		// var array = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
		// for (e=0;e<5;e++)
		// {
		// var i=0;
		// for(i=0;i<999;i++)
		// {
		// var co = (array[e] + i + array[e] + array[e]);
		// var pco = co.slice(0,4);
		// Base.h.$('input[name="Name"]').val(pco);
		// var prefix = (array[e] + i + array[e] + array[e]);
		// var pre = prefix.slice(0,4);
		// Base.h.$('input[name="Prefix"]').val(pre);
		// Base.h.$('#save_company').click()
		// Base.sleep(4);
		// }
		// }
	// },
	verifyViewAudit: function() {
		Base.sleep(3);
		test(' View Audit ', function() {
		ok(Base.h.$('input[name="User"]').length === 1, " Title field exist");
		ok(Base.h.$('input[name="Title"]').length === 2, " Title field exist");
		});
	},
	verifyRecycle: function() {
		Base.sleep(3);
		// select all deleted items
		Base.h.$(".cbox").each(function () {
		Base.h.$(this).attr("checked", true)
		})
		Base.sleep(3);
		test(' Recycle Bin ', function() {
		ok(Base.h.$('input[value="Delete"]').length === 1, " Delete button exist");
		});
		Base.sleep(3);
		Base.h.$(".cbox").each(function () {
		Base.h.$(this).attr("checked", false)
		})
		Base.sleep(3);
	},
	verifyLicensing: function() {
		Base.sleep(3);
		test(' Licensing ', function() {
		ok(Base.h.$('a[href="#AdminLicensing"]').text() === 'Licensing', 'Licensing page exists');
		});
	},
	verifyDistribQ: function() {
		Base.sleep(4);
		test(' Distributed Queue ', function() {
		ok(Base.h.$('#dq_delete').text() === "Delete", " Delete link exist");
		});
	},
	verifyLDAP: function() {
		Base.sleep(4);
		test(' LDAP Connections ', function() {
		ok(Base.h.$('input[name="Domain"]').length === 1, " Domain field exist");
		});
	},
	verifyImportJobs: function() {
		Base.sleep(1);
		test(' Import Jobs ', function() {
		ok(Base.h.$('input[name="Test_mail"]').click(), " Mail sent successfully ");
		});
	},
	verifyDataUsageReport: function() {
		Base.sleep(1);
		test(' Data Usage Report ', function() {
		ok(Base.h.$('#dataUsageContainer').length, " Database Size ");
		});
	},
	waitload: function() {
		var urlVar = Base.h.window.location.href;
		$.ajax({
			type: "POST",
			url: urlVar,
			async: false,
			success: function(data, textStatus, jqXHR) {
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		});
	}
};