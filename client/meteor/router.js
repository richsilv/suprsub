suprsubController = FastRender.RouteController.extend({
/*  autoRender: false,*/
  layout: 'mainTemplate',
  loadingTemplate: 'loading',
  before: function (pause) {
    if (!Meteor.user()) {
      // render the login template but keep the url in the browser the same
      this.render();
      this.render('loginScreen', {to: 'mainSection'});
      // stop the rest of the before hooks and the action function 
      pause();
    }
  },
  after: function() {
    if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.confirmGender && this.path !== '/gender') {
      this.redirect('/gender');
    }
  },
});

Router.onBeforeAction('loading');

Router.map(function() {

  var subs;

  this.route('playerDetails', {
    path: '/player',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'playerDetails': {to: 'mainSection'}
    },
    waitOn: function() {
      return [Subs.pitches, clientFunctions.loadGMaps()];
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
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'teamInfo': {to: 'mainSection'}
    },
    waitOn: function() {
      var thisUser = Meteor.user();
      if (thisUser && thisUser.profile && thisUser.profile.team) {
        Router.current().route.teamIds = thisUser.profile.team._ids;
        if (!Router.current().route.currentTeamId) {
          console.log("Calc:", thisUser.profile.team._ids, thisUser.profile.team._ids.length ? thisUser.profile.team._ids[0] : null);
          Router.current().route.currentTeamId = new suprsubDep(thisUser.profile.team._ids.length ? thisUser.profile.team._ids[0] : null);
        }
        else if (thisUser.profile.team._ids.indexOf(Router.current().route.currentTeamId.value) === -1)
          Router.current().route.currentTeamId.set(thisUser.profile.team._ids.length ? thisUser.profile.team._ids[0] : null);
      }
      else {
        Router.current().route.teamIds = [];
        if (!Router.current().route.currentTeamId)
          Router.current().route.currentTeamId = new suprsubDep(null);
        else
          Router.current().route.currentTeamId.set(null);
      }
      return [Subs.pitches, Subs.teams, clientFunctions.loadGMaps()];
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
      }
    }
  });

  this.route('home', {
    path: '/',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'}
    },
    action: function() {
      this.redirect('/home');
    }
  });

  this.route('home', {
    path: '/home',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'}
    },
    waitOn: function() {
      return [
        Subs.pitches,
        Subs.teams,
        Subs.events
        ];
    }
  });

  this.route('eventSignUp', {
    path: '/home/:eventCode?',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'homePage': {to: 'mainSection'}
    },
    waitOn: function() {
      return [
        Subs.pitches,
        Subs.teams,
        Subs.events
        ];
    },
    after: function() {
      console.log(this.params.eventCode);
      var thisEvent = Events.findOne({_id: this.params.eventCode});
      if (thisEvent) thisEvent.pitch = null;
      if (thisEvent  && thisEvent.players > 0) {
        UI.insert(UI.renderWithData(Template.signupModalHolder, {postingData: thisEvent}), document.body);
        $('#signupModal').modal('setting', {
          onHidden: function() {
            $('.ui.dimmer.page').remove();
          }
        });
        Meteor.setTimeout(function() {$('#signupModal').modal('show');}, 200);
      }
      else {
        this.redirect('/home');
      }  
    }
  });

  this.route('confirmGender', {
    path: '/gender',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'twitterGenderModalHolder': {to: 'mainSection'}
    },
    after: function() {
      var oldRendered = Template.twitterGenderModal.rendered;
      Template.twitterGenderModal.rendered = function() {
        $('#twitterGenderModal').modal('setting', {
          closable  : false,
          onHide    : function() {
            Template.twitterGenderModal.rendered = oldRendered;
            oldRendered && oldRendered.apply(this, arguments);
          }
        }).modal('show');
        clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
      };
    }   
  });

  this.route('about', {
    path: '/about',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'about': {to: 'mainSection'}
    }
  });

  this.route('settings', {
    path: '/settings',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'settings': {to: 'mainSection'}
    }
  });

  this.route('myAdmin', {
    path: '/myadmin',
    controller: suprsubController,
    template: 'adminTemplate',
    waitOn: function() {
      this.objectHistory = [];
      return [
        Meteor.subscribe('allEvents', 20),
        Meteor.subscribe('allTeams', 20),
        Meteor.subscribe('allTweets', 20),
        Subs.pitches,
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

  this.route('uploadPitches', {
    path: '/uploadPitches',
    controller: suprsubController,
    template: 'blank',
    before: function() {
      Meteor.call('printLine');
      console.log(this.params);
    }
  });

  this.route('addPitches', {
    path: '/addPitches',
    controller: suprsubController,
    template: 'pitchesTemplate',
    waitOn: function() {
      return [
        Subs.pitches
      ];
    },
    data: function() {
      return {
        pitches: Pitches.find({}, {sort: {name: 1}})
      }
    }
  });

  this.route('logging', {
    path: '/logging',
    controller: suprsubController,
    template: 'logging',
    waitOn: function() {
      return [
        Subs.logging
      ];
    },
    data: function() {
      return {
        logs: Logging.find({}, {sort: {dateTime: -1}})
      }
    }
  }); 
});