// easy access to variables in the browsers console.
var tempUser, who, tempCol, tempGrp, playGrp, userCollection, roleCollection, resultId, isInGroup, roleMemberships;

describe('User Model test, ', function () {
    // creates a custom equality test that checks if the first parameter (object)
    // is an instanceof the second parameter (constructor function)
    var isInstanceOf = function (obj, constructorFunction) {
        if (obj && constructorFunction) {
            return obj instanceof constructorFunction;
        }
    };

    

    // beforeEach function to inform Jasmine of myCustomeEquilityTester
    beforeEach(function () {
        jasmine.addCustomEqualityTester(isInstanceOf);

        // Top Secret
        var xxx;

        //Allow Async tests more time if needed
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it('should create a temp username', function () {
        // Creates a new User model locally.
        tempUser = new User({
            Active: true,
            DirectGatewayPermissions: 0,
            FirstName: "Test",
            Flags: 0,
            HasPassword: false,
            InstanceAdmin: true,
            IsMultiuser: false,
            LastName: "Doodstr",
            Named: false,
            PasswordExpired: false,
            ReadOnlyUser: false,
            RequireNewPassword: false,
            SiteUser: true,
            Username: 'test@d.com',
            Password: 'Pdubs88$',
        });
        // checks that tempUser is an instanceof User
        expect(tempUser).toEqual(User);
    });

    it('should get all User models an make a Collection of them', function (done) {
        // get all Users

        userCollection = new Users();
        userCollection.fetch({
            success: function (collection, response, options) {
                tempCol = collection;

                // test that the result is an instanceof Backbone.Collection and that result
                // is a collection of User models.
                expect(tempCol).toEqual(Users);
                expect(tempCol.at(0)).toEqual(Backbone.Model);
                done();
            }
        });
    });

    it('should test that the temp user does not exist', function (done) {
        // looks in the collection recieved earlier to make sure User DNE. Deletes it if it does
        who = tempCol.findWhere({ Username: tempUser.attributes.Username });
        if (who) {
            who.sync('delete', who, {
                success: function (result) {
                    isDestroyed = result;
                    expect(isDestroyed).toBeTruthy();
                },
                failure: function (result) {
                    isDestroyed = result;
                    expect(isDestroyed).toBeTruthy();
                },
                complete: function (result) {
                    done();
                },
                ReplacementUserId: "ea0c5acb-249c-41be-847b-efaef764e6de"
            });
        } else {
            expect(who).not.toBeDefined();
            done();
        }
    });

    it('should create a new user using the the previously created temp user', function (done) {
        // save's the user to the server then checks that it saved by fetching another user collection.
        tempUser.save({}, {
            "Password": 'Pdubs88$',
            "SetPassword": true,
            success: function (model) {
                userCollection = new Users();
                userCollection.fetch({
                    success: function (collection, response, options) {
                        tempCol = new Users(response);
                        who = tempCol.findWhere({ Username: model.attributes.Username });
                        expect(who).toBeDefined();
                        done();
                    }
                });
            },
            failure: function (model) {
                userCollection = new Users();
                userCollection.fetch({
                    success: function (collection, response, options) {
                        tempCol = new Users(response);
                        who = tempCol.findWhere({ Username: model.attributes.Username });
                        expect(who).toBeDefined();
                        done();
                    }
                });
            }
        });
        
    });

    it('should create a temporary group.', function () {
        tempGrp = new Role({ Name: 'TestGrpr', RoleMemberships: [] });

        // checks tempGrp is an instance of the Role Model.
        expect(tempGrp).toEqual(Role);

        //"ConnectionId":"1627aea5-8e0a-4371-9022-9b504344e724",
        //"CreatedBy":"1627aea5-8e0a-4371-9022-9b504344e724",
        //"CreatedOn":"\/Date(928164000000-0400)\/",
        //"DistinguishedName":"String content",
        //"GatewayPermissions":2147483647,
        //"Id":"1627aea5-8e0a-4371-9022-9b504344e724",
        //"Name":"String content",
        //"RoleMemberships":["1627aea5-8e0a-4371-9022-9b504344e724"]
    });

    it('should get all groups and verify the tempGrp does not exist.', function (done) {
        // fetches collection of roles
        roleCollection = new Roles();
        roleCollection.fetch({
            success: function (collection, response, options) {
                var isFound = false;
                var isGone;
                playGrp = { Name: tempGrp.attributes.Name };
                for (playGrp.Name in response) {
                    playGrp = new Role(response[playGrp.Name]);
                        //deletes it if found
                        playGrp.destroy({
                            success: function (result) {
                                isGone = true;
                                expect(isGone).toBeTruthy();
                            },
                            failure: function (result) {
                                isGone = true;
                                expect(isGone).toBeTruthy();
                            },
                            complete: function () {
                                done();
                            }
                        });
                        // marks that the role was found and breaks the loop.
                        isFound = true;
                        break;
                }
                // we know it does not exist
                if (!isFound) {
                    expect(isFound).toBeFalsy();
                    done();
                }
            },
            // will fail due to async timeout, the absence of a done function will ensure this fails if it calls the error callback.
            error: function (collection, response, options) {
                console.log(response);
            }
        });
    });

    it('should create the temporary group and check that it now exsists.', function (done) {
        // attempts to save group
        tempGrp.save(null, {
            success: function (model) {
                // fetch collection to verify the success of the save.
                roleCollection = new Roles();
                roleCollection.fetch({
                    wait: true,
                    parse: false,
                    success: function (collection, res, obj) {
                        window.roleCollection = new Roles(res);
                        expect(window.roleCollection.get(tempGrp)).toBeDefined();
                        done();
                    }
                });
            }
        });
    });

    it('should make sure the created user does not exist in the created group, before adding it to the group.', function (done) {
        userId = tempUser.id;
        updateGrp = roleCollection.get(tempGrp);
        // Checks to see if the user is already in the group. Fails test if it is.
        for (userId in updateGrp.attributes.RoleMemberships) {
            isInGroup = true;
            expect(isInGroup).not.toBeDefined();
            done();
        }
        if (!isInGroup) {
            updateGrp.attributes.RoleMemberships.push(userId);
            updateGrp.save(null, {
                wait: true,
                success: function (model) {
                    // Refresh tempGrp
                    tempGrp = model;
                    roleCollection = new Roles();
                    roleCollection.fetch({
                        success: function (collection, res, obj) {
                            // Make sure User was added to Group
                            for (userId in res) {
                                isInGroup = true;
                                break;
                            }
                            expect(isInGroup).toBeTruthy();
                            done();
                        }
                    });
                }
            });
        }
    });

    afterEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
});

//{
//    "Password":"String content",
//    "PasswordAnswer":"String content",
//    "PasswordQuestion":"String content",
//    "SetPassword":true,
//    "User":{
//        "Active":true,
//        "ConnectionId":"1627aea5-8e0a-4371-9022-9b504344e724",
//        "DirectGatewayPermissions":0,
//        "DistinguishedName":"String content",
//        "FirstName":"String content",
//        "Flags":0,
//        "HasPassword":true,
//        "Id":"1627aea5-8e0a-4371-9022-9b504344e724",
//        "InstanceAdmin":true,
//        "IsMultiuser":true,
//        "LastName":"String content",
//        "Named":true,
//        "PasswordExpired":true,
//        "ReadOnlyUser":true,
//        "RequireNewPassword":true,
//        "RoleMembership":["1627aea5-8e0a-4371-9022-9b504344e724"],
//        "SiteUser":true,
//        "UserPrincipalName":"String content",
//        "Username":"String content"
//    }
//}

//{
//    "Error":{
//        "Data":"String content",
//        "Message":"String content",
//        "Stack":"String content",
//        "Type":"String content"
//    },
//    "Result":{
//        "Active":true,
//        "ConnectionId":"1627aea5-8e0a-4371-9022-9b504344e724",
//        "DirectGatewayPermissions":0,
//        "DistinguishedName":"String content",
//        "FirstName":"String content",
//        "Flags":0,
//        "HasPassword":true,
//        "Id":"1627aea5-8e0a-4371-9022-9b504344e724",
//        "InstanceAdmin":true,
//        "IsMultiuser":true,
//        "LastName":"String content",
//        "Named":true,
//        "PasswordExpired":true,
//        "ReadOnlyUser":true,
//        "RequireNewPassword":true,
//        "RoleMembership":["1627aea5-8e0a-4371-9022-9b504344e724"],
//        "SiteUser":true,
//        "UserPrincipalName":"String content",
//        "Username":"String content"
//    }
//}