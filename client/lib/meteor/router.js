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
        return Meteor.subscribe('allpitches');
      },
      after: function() {
        appVars.circleSize = new suprsubDep(8000);
        clientFunctions.loadGoogleMaps(true);
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