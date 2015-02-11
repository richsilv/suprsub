/*****************************************************************************/
/* MasterLayout: Event Handlers and Helpers */
/*****************************************************************************/

Template.MasterLayout.helpers({
  smallScreen: function() {
    return App.smallScreen.get();
  }
});

Template.miniTopbar.events({
  'click [data-action="show-sidebar"]': function () {
    $('#sidebar').sidebar('show');
  },
  'click [data-action="show-login"]': function () {
    SemanticModal.generalModal('loginModal');
  },
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

Template.loginModal.events({
  'click [data-action="login"], submit': function (evt, tp) {
    var email = tp.$('[data-field="email"]').val(),
        password = tp.$('[data-field="password"]').val();

    Meteor.loginWithPassword(email, password, function(err, res) {
      if (err) App.accountError.set('Cannot recognise email / password'); 
    });
  }
});

/*****************************************************************************/
/* MasterLayout: Lifecycle Hooks */
/*****************************************************************************/
Template.MasterLayout.created = function() {
  App.smallScreen = new ReactiveVar($(window).width() < 500);
  App.mediumScreen = new ReactiveVar($(window).width() < 1000);  
  $(window).on('resize', function() {
    App.smallScreen = new ReactiveVar($(window).width() < 500);
    App.mediumScreen = new ReactiveVar($(window).width() < 1000);
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