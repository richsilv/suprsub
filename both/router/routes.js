/*****************************************************************************/
/* Client and Server Routes */
/*****************************************************************************/
Router.configure({
  layoutTemplate: 'MasterLayout',
  loadingTemplate: 'Loading',
  notFoundTemplate: 'NotFound',
  templateNameConverter: 'upperCamelCase',
  routeControllerNameConverter: 'upperCamelCase'
});

Router.onBeforeAction(function() {
  if (!Meteor.userId()) {
    this.redirect('login');
  } else {
    this.next();
  }
}, {
  except: ['login']
});

Router.onBeforeAction(function() {
  if (Meteor.userId()) {
    this.redirect('team');
  } else {
    this.next();
  }
}, {
  only: ['login']
});

Router.map(function() {
  /*
    Example:
      this.route('home', {path: '/'});
  */
  this.route('home', {
    path: '/home',
    controller: 'HomeController'
  });
  this.route('team', {
    path: '/team',
    controller: 'TeamController'
  });
  this.route('player', {
    path: '/player',
    controller: 'PlayerController'
  });
  this.route('login', {
    path: '/login',
    controller: 'LoginController'
  });
  this.route('about', {
    path: '/about',
    controller: 'AboutController'
  });
  this.route('settings', {
    path: '/settings',
    controller: 'SettingsController'
  });
});