RemoteTeams = new Meteor.Collection('remote_teams');

/*
 * Add query methods like this:
 *  RemoteTeams.findPublic = function () {
 *    return RemoteTeams.find({is_public: true});
 *  }
 */

RemoteTeams.allow({
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

RemoteTeams.deny({
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
