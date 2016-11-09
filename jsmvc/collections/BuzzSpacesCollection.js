// Collection for BuzzSpace model
// defines the model to use, and the URL of the API method to fill the collection with said models
var BuzzSpacesCollection = Backbone.Collection.extend({

    model: BuzzSpaces,
    errorMsg: null,

    url: Constants.Url_Base + "AdminApiBuzz/GetEditableBuzzSpaces"

});