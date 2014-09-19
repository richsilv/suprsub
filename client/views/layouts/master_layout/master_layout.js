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
Template.MasterLayout.created = function () {
};

Template.MasterLayout.rendered = function () {
};

Template.MasterLayout.destroyed = function () {
};

Template.topbar.events({

  'click #login-button, keyup #login-email, keyup #login-password': function(event) {

    _this = Template.instance();

    if (event.keyCode ===  13 || event.type === 'click') {

      Meteor.loginWithPassword(_this.email.get(), _this.password.get(), function(err) {
        console.log(err);
        return false;
      });

    }

    else {

      _this.email.set($('#login-email').val());
      _this.password.set($('#login-password').val());

    }

  }

});

Template.topbar.created = function() {

  this.email = new ReactiveVar();
  this.password = new ReactiveVar();

}

// SYNC PITCHES ON LOGIN
Meteor.startup(function() {
  Tracker.autorun(function(c) {
    if (!!Meteor.userId()) {
      Pitches.sync({
        syncCallback: function() {
          c.stop();
        }
      });
    }
  });
});