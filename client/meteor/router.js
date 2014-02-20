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
      this.subscribe('userData');
    }
  },
  after: function() {
    if (Meteor.user().profile && Meteor.user().profile.confirmGender && this.path !== '/gender') {
      this.redirect('/gender');
    }
  },
});

Router.map(function() {

  var subs;

  this.route('playerDetails', {
    path: '/player',
    template: 'mainTemplate',
    yieldTemplates: {
      'playerDetails': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    },
    waitOn: function() {
      return [Meteor.subscribe('allPitches'), clientFunctions.loadGMaps()];
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

  this.route('teamDetails', {
    path: '/team/:joinCode?',
    template: 'mainTemplate',
    yieldTemplates: {
      'teamInfo': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    },
    waitOn: function() {
      var thisUser = Meteor.user();
      subs = [Meteor.subscribe('allPitches'), clientFunctions.loadGMaps()];
      if (thisUser && thisUser.profile && thisUser.profile.team) {
        subs.push(Meteor.subscribe('teams'));
        Router.current().route.teamIds = thisUser.profile.team._ids;
        if (!Router.current().route.currentTeamId || thisUser.profile.team._ids.indexOf(Router.current().route.currentTeamId) === -1) {
          Router.current().route.currentTeamId = new suprsubDep(thisUser.profile.team._ids ? thisUser.profile.team._ids[0] : null);
        }
      }
      else {
        Router.current().route.teamIds = [];
        Router.current().route.currentTeamId = new suprsubDep(null);
      }
      return subs;
    },
    action: function() {
      this.render();
      Template.pitchMapLarge.rendered = function() {
        clientFunctions.initialize();
        Template.pitchMapLarge.rendered = null;
      };
    },
    after: function() {
      if (this.params.joinCode) {
        Router.current().route.codeEntered = clientFunctions.joinTeam(this.params.joinCode);
        this.redirect('/team');
      };      
    }
  });

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

  this.route('home', {
    path: '/home',
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'},
      'socialBox': {to: 'socialBox'}
    },
    waitOn: function() {
      return [Meteor.subscribe('allPitches')];
    },
    before: function() {
      if (!('postingsChoice' in Router.routes['home']))
        Router.routes['home'].postingsChoice = new suprsubDep('');
      this.subscribe('events', Router.routes['home'].postingsChoice.get());
    }
  });

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
  });

  this.route('myAdmin', {
    path: '/myadmin',
    template: 'adminTemplate',
    waitOn: function() {
      this.objectHistory = [];
      return [
        Meteor.subscribe('allEvents', 20),
        Meteor.subscribe('allTeams', 20),
        Meteor.subscribe('allTweets', 20),
        Meteor.subscribe('allPitches'),
        Meteor.subscribe('allUsers', 20)
      ];
    },
    data: function() {
      return {
        events: Events.find({}, {sort: {createdAt: -1}}),
        teams: Teams.find({}, {sort: {name: 1}}),
        tweets: Tweets.find({}, {sort: {twitterCreated: -1}}),
        users: Meteor.users.find({}, {sort: {'profile.name': 1}}),
        pitches: Pitches.find({}, {sort: {name: 1}})
      }
    }
  });
});