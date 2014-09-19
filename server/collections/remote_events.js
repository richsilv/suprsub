RemoteEvents = new Meteor.Collection('remote_events');

/*
 * Add query methods like this:
 *  RemoteEvents.findPublic = function () {
 *    return RemoteEvents.find({is_public: true});
 *  }
 */

RemoteEvents.allow({
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

RemoteEvents.deny({
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
