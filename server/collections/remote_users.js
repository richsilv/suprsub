RemoteUsers = new Meteor.Collection('users', App.remote);

// App.remote.subscribe('');

RemoteUsers.find().observe({
  added: function(doc) {
    if (!Meteor.users.findOne(doc._id)) Meteor.users.insert(doc);
  },
  changed: function(newDoc, oldDoc) {
    Meteor.users.update(oldDoc._id, {$set: newDoc});
  },
  removed: function(doc) {
    Meteor.users.remove(doc._id);
  }
});

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
