Router.configure({
  layout: 'mainTemplate',
  loadingTemplate: 'loading',
  before: function () {
    if (!Meteor.user()) {
      // render the login template but keep the url in the browser the same
      this.render();
      this.render('loginScreen', {to: 'mainSection'});
      // stop the rest of the before hooks and the action function 
      this.stop();
    }
  },
});

Router.map(function() {
  this.route('playerDetails', {
    path: '/player',
    template: 'mainTemplate',
    yieldTemplates: {
      'playerDetails': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    },
    waitOn: function() {
      return [Meteor.subscribe('allpitches'), clientFunctions.loadGMaps()];
    },
    action: function() {
      this.render();
      Template.pitchMapLarge.rendered = function() {
        clientFunctions.initialize(true);
        Template.pitchMapLarge.rendered = null;
      };
    },
    before: function() {
      appVars.circleSize = new suprsubDep(8000);
    }
  });
});

Router.map(function() {
  this.route('teamDetails', {
    path: '/team',
    template: 'mainTemplate',
    yieldTemplates: {
      'teamSettings': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    },
    waitOn: function() {
      return [Meteor.subscribe('allpitches'), clientFunctions.loadGMaps()];
    },
    action: function() {
      this.render();
      Template.pitchMapLarge.rendered = function() {
        clientFunctions.initialize();
        Template.pitchMapLarge.rendered = null;
      };
    }
  });
});

Router.map(function() {
  this.route('home', {
    path: '/',
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    }
  });
});

Router.map(function() {
  this.route('home', {
    path: '/home',
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    }
  });
});