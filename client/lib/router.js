Router.configure({
  	layout: 'mainTemplate',
 	  before: function () {
      	if (!Meteor.user() && this.path !== '/home') {
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
      		'playerDetails': {to: 'mainSection'}
    	}
  	});
});

Router.map(function() {
  	this.route('teamDetails', {
    	path: '/team',
    	template: 'mainTemplate',
    	yieldTemplates: {
      		'teamDetails': {to: 'mainSection'}
    	}
  	});
});

Router.map(function() {
  	this.route('home', {
    	path: '/',
    	template: 'mainTemplate',
    	yieldTemplates: {
      		'homePage': {to: 'mainSection'}
    	}
  	});
});