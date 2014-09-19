RemotePitches = new Meteor.Collection('pitches', App.remote);

App.remote.subscribe('allPitches');

RemotePitches.find().observe({
  added: function(doc) {
    if (!Pitches.findOne(doc._id)) Pitches.insert(doc);
  },
  changed: function(newDoc, oldDoc) {
    Pitches.update(oldDoc._id, {$set: newDoc});
  },
  removed: function(doc) {
    Pitches.remove(doc._id);
  }
})

/*
 * Add query methods like this:
 *  RemotePitches.findPublic = function () {
 *    return RemotePitches.find({is_public: true});
 *  }
 */

RemotePitches.allow({
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

RemotePitches.deny({
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
