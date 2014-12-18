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
  except: ['login', 'splash']
});

Router.onBeforeAction(function() {
  if (Meteor.userId()) {
    this.redirect('home');
  } else {
    this.next();
  }
}, {
  only: ['login', 'splash']
});

// SYNC PITCHES ON LOGIN
Router.onAfterAction(function() {
  if (!Pitches.synced()) {
    Pitches.sync({
      syncCallback: function(results) {
        App.pitchSync = results;
      },
      options: {
        fields: {
          'location.city': 1,
          'location.lat': 1,
          'location.lng': 1,
          'address': 1,
          'prettyLocation': 1
        }
      } 
    });
  }
})

Router.map(function() {
  /*
    Example:
      this.route('home', {path: '/'});
  */
  this.route('root', {
    path: '/',
    onBeforeAction: function() {
      this.redirect('home');
    }
  });
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
  this.route('splash', {
    path: '/splash',
    controller: 'SplashController'
  });
});