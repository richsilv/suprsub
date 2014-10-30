PlayerController = RouteController.extend({
  waitOn: function () {
  },

  data: function () {
  	return Meteor.user() && Meteor.user().profile;
  },

  action: function () {
    this.render();
  }
});
