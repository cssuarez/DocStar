//  Collection for Text Stamps model 
//  Only a container object, Does not fill currently. The StampsCC fills both this and ImageStamps collections.
var TextStamps = CustomGridItems.extend({
    model: TextStamp,
    comparator: Backbone.Collection.prototype.defaultComparator
});