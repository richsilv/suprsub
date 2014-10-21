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

Router.map(function () {
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
});
