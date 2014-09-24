/*****************************************************************************/
/* Login: Event Handlers and Helpers */
/*****************************************************************************/
Template.Login.events({
  /*
   * Example: 
   *  'click .selector': function (e, tmpl) {
   *
   *  }
   */
});

Template.Login.helpers({
  /*
   * Example: 
   *  items: function () {
   *    return Items.find();
   *  }
   */
});

/*****************************************************************************/
/* Login: Lifecycle Hooks */
/*****************************************************************************/
Template.Login.created = function () {
};

Template.Login.rendered = function () {
};

Template.Login.destroyed = function () {
};

// SYNC PITCHES ON LOGIN
Meteor.startup(function() {
  Tracker.autorun(function(c) {
    if (!!Meteor.userId()) {
      Pitches.sync({
        syncCallback: function(results) {
          App.pitchSync = results;
          c.stop();
        }
      });
    }
  });
});