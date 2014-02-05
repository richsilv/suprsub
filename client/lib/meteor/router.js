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
    else {
      this.subscribe('userData').wait();
    }
  },
  after: function() {
    if (Meteor.user().profile && Meteor.user().profile.confirmGender && this.path !== '/gender') {
      this.redirect('/gender');
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
      var thisUser = Meteor.user(),
          subs = [Meteor.subscribe('allpitches'), clientFunctions.loadGMaps()];
      if (thisUser && thisUser.profile && thisUser.profile.team) {
        subs.push(Meteor.subscribe('teams', thisUser.profile.team._ids));
        Router.current().route.teamIds = thisUser.profile.team._ids;
        if (!Router.current().route.currentTeamId || thisUser.profile.team._ids.indexOf(Router.current().route.currentTeamId) === -1) {
          Router.current().route.currentTeamId = thisUser.profile.team._ids ? thisUser.profile.team._ids[0] : null;
        }
      }
      else {
        Router.current().route.teamIds = [];
        Router.current().route.currentTeamId = null;
      }
      return subs;
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
    },
    action: function() {
      this.redirect('/home');
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
    },
    waitOn: function() {
      return [Meteor.subscribe('allpitches')];
    },
    before: function() {
      if (!('postingsChoice' in Router.routes['home']))
        Router.routes['home'].postingsChoice = new suprsubDep('');
      this.subscribe('postings', Router.routes['home'].postingsChoice.get());
    }
  });
});

Router.map(function() {
  this.route('confirmGender', {
    path: '/gender',
    template: 'mainTemplate',
    yieldTemplates: {
      'twitterGenderModal': {to: 'mainSection'}
    },
    after: function() {
      var oldRendered = Template.twitterGenderModal.rendered;
      Template.twitterGenderModal.rendered = function() {
        $('#twitterGenderModal').modal('setting', {
          closable  : false,
          onHide    : function(){
            Template.twitterGenderModal.rendered = oldRendered;
            oldRendered && oldRendered.apply(this, arguments);
          }
        }).modal('show');
        clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
      };
    }    
  })
})