/*****************************************************************************/
/* MasterLayout: Event Handlers and Helpers */
/*****************************************************************************/
Template.MasterLayout.events({
  /*
   * Example:
   *  'click .selector': function (e, tmpl) {
   *
   *  }
   */
});

Template.MasterLayout.helpers({
  /*
   * Example:
   *  items: function () {
   *    return Items.find();
   *  }
   */
});

/*****************************************************************************/
/* MasterLayout: Lifecycle Hooks */
/*****************************************************************************/
Template.MasterLayout.created = function() {};

Template.MasterLayout.rendered = function() {};

Template.MasterLayout.destroyed = function() {};

Template.topbar.helpers({
  ready: function() {
    return Pitches && Pitches.ready() && Pitches.find().count();
  },
  synced: function() {
    return Pitches && Pitches.synced();
  }
});

Template.topbar.events({

  'click [data-action="log-in"], submit': function(event, template) {

    Meteor.loginWithPassword(template.email.get(), template.password.get(), function(err) {
      console.log(err);
      return false;
    });

  },

  'keyup [data-field="email"], keyup [data-field="password"]': function(event, template) {

    template.email.set(template.$('[data-field="email"]').val());
    template.password.set(template.$('[data-field="password"]').val());

  },

  'click [data-action="log-out"]': function() {

    Meteor.logout();

  }

});

Template.topbar.created = function() {

  this.email = new ReactiveVar();
  this.password = new ReactiveVar();

}