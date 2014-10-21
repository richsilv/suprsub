SecureData = new Meteor.Collection('securedata');

/*
 * Add query methods like this:
 *  SecureData.findPublic = function () {
 *    return SecureData.find({is_public: true});
 *  }
 */

SecureData.allow({
  insert: function (userId, doc) {
    return true;
  },

  update: function (userId, doc, fieldNames, modifier) {
    return true;
  },

  remove: function (userId, doc) {
    return true;
  }
});

SecureData.deny({
  insert: function (userId, doc) {
    return false;
  },

  update: function (userId, doc, fieldNames, modifier) {
    return false;
  },

  remove: function (userId, doc) {
    return false;
  }
});
