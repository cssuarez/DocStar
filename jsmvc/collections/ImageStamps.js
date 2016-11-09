//  Collection for Image Stamps model 
//   Only a container object, Does not fill currently. The StampsCC fills both this and TextStamps collections.
var ImageStamps = CustomGridItems.extend({
    model: ImageStamp,
    comparator: Backbone.Collection.prototype.defaultComparator
});