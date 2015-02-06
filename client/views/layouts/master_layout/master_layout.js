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
  smallScreen: function() {
    return Template.instance().smallScreen.get();
  }
});

Template.miniTopbar.events({
  'click [data-action="show-sidebar"]': function () {
    $('#sidebar').sidebar('show');
  }
});

Template.sidebar.events({
  'click .item': function() {
    $('#sidebar').sidebar('hide');
  },
    'click #logout-button' : function() {
        Meteor.logout();
        Router.go('/login');
    }
});

/*****************************************************************************/
/* MasterLayout: Lifecycle Hooks */
/*****************************************************************************/
Template.MasterLayout.created = function() {
  this.smallScreen = new ReactiveVar($(window).width() < 500);
  $(window).on('resize', function() {
    this.smallScreen = new ReactiveVar($(window).width() < 500);
  });
};

Template.MasterLayout.rendered = function() {};

Template.MasterLayout.destroyed = function() {
  $(window).off('resize');
};

Template.topbar.helpers({
  ready: function() {
    return Pitches && Pitches.ready() && Pitches.find().count();
  },
  synced: function() {
    return Pitches && Pitches.synced();
  }
});

Template.topbar.events({

  'keyup [data-field="email"], keyup [data-field="password"]': function(event, template) {

    template.email.set(template.$('[data-field="email"]').val());
    template.password.set(template.$('[data-field="password"]').val());

  },

  'click [data-action="log-out"]': function() {

    Router.go('login');
    Meteor.logout();

  }

});

Template.topbar.created = function() {

  this.email = new ReactiveVar();
  this.password = new ReactiveVar();

};


Template.sidebar.rendered = function() {
  $('#sidebar')
      .sidebar({
        transition: 'overlay'
      })
};