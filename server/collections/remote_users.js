RemoteUsers = new Meteor.Collection('remote_users');

/*
 * Add query methods like this:
 *  RemoteUsers.findPublic = function () {
 *    return RemoteUsers.find({is_public: true});
 *  }
 */

RemoteUsers.allow({
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

RemoteUsers.deny({
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
