if (Meteor.isClient) {
  var teamCode = new suprsubDep(null),
      routerDeps = {},
      mapReady = null,
      pitchesAvailable = clientFunctions.pitchesAvailable();
}

var LOGGED_OUT = ['/', 'login'];//, reRouteHandle;

function reRouter(that) {
  var thisUser = Meteor.user();
  if (!that || that.params.resetCode) {
  }
  else if (!thisUser && LOGGED_OUT.indexOf(that.path) > -1) {
  }
  else if (!thisUser) {
    that.redirect('/login');
  }
  else if (teamCode.get()) {
    that.redirect('/team')
  }
  else if (thisUser.profile && thisUser.profile.confirmGender && that.path !== '/gender') {
    that.redirect('/gender');
  }
  else if (thisUser.profile && !thisUser.profile.confirmGender && thisUser.profile.firstLogin && that.path !== '/home') {
    that.redirect('/home');
  }
  else if (thisUser && LOGGED_OUT.indexOf(that.path) > -1){
    that.redirect('/home');
  }  
}

suprsubController = FastRender.RouteController.extend({
});

Router.configure({
  layout: 'mainTemplate',
  loadingTemplate: 'loading'
});

if (Meteor.isClient) {
  Router.onBeforeAction(function(pause) {
    var thisUser = Meteor.user(),
        that = this;
    appVars.showErrors.set(false);
    if (that.params.joinCode) teamCode.value = that.params.joinCode;
    if (Router.Tour.getTour() && Router.Tour.currentPage() !== this.route.name) {
      console.log("Stopping tour", Router.Tour.currentPage(), this.route.name);
      Router.Tour.loadTour();
      Router.Tour.nextStep();
    }
    console.log("Checking route");
    reRouter(Router.current());
    // if (window.reRouteHandle && reRouteHandle.stop) reRouteHandle.stop();

    // var oldStop = reRouteHandle.stop;
    // reRouteHandle.stop = function() {
    //   console.log("stopping", Deps.currentComputation);
    //   console.trace();
    //   oldStop && oldStop.apply(this, arguments);
    // };
    mapReady = clientFunctions.loadGMaps();
  });

  Router.onRun(function() {

  })
}

Router.map(function() {

  var subs;

  this.route('splash', {
    path: '/',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'splash': {to: 'mainSection'}
    }
  });

  this.route('login', {
    path: '/login',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'loginScreen': {to: 'mainSection'}
    },
    waitOn: function() {
      return [clientFunctions.accountsReadyHandle()];
    }/*,
    onBeforeAction: function() {
      var that = this;
      routerDeps.login = Deps.autorun(function(c) {
        if (Meteor.user()) {
          c.stop();
          delete routerDeps.login;
          that.redirect('/home');
        }
      });
    },
    onStop: function() {
      if (routerDeps.login) {
        routerDeps.login.stop();
        delete routerDeps.login;
      }
    }*/
  });

  this.route('reset', {
    path: '/reset/:resetCode?',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'resetBox': {to: 'mainSection'}
    },
    onBeforeAction: function() {
      appVars.resetCode = this.params.resetCode;
      if (!appVars.resetCode) {
        this.redirect('/login');
      }
    },
    onStop: function() {
      delete appVars.resetCode;
    }
  });

  this.route('playerDetails', {
    path: '/player',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'playerDetails': {to: 'mainSection'}
    },
    waitOn: function() {
      return [mapReady];
    },
    onBeforeAction: function() {
      appVars.circleSize.set(8000);
      if (Meteor.user() && Meteor.user().profile) appVars.availabilitySession.set(Meteor.user().profile.player.availability);
      Template.pitchMapLarge.rendered = function() {
        Deps.autorun(function(c) {
          if (mapReady.ready() && pitchesAvailable.ready()) {
            clientFunctions.initialize(true);
            c.stop();
          }
        });
      };
    },
    onAfterAction: function() {
    },
    onStop: function () {
      appVars.liveCircle = null;
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
      return [appVars.Subs.teams];
    },
    onBeforeAction: function() {
      Template.pitchMapSmall.rendered = function() {
        Deps.autorun(function(c) {
          if (mapReady.ready() && pitchesAvailable.ready()) {
            clientFunctions.initialize();
            c.stop();
          }
        });
      }
    },
    onAfterAction: function() {
      if (teamCode.value) {
        console.log("processing", teamCode.value);
        Router.current().route.codeEntered = clientFunctions.joinTeam(teamCode.value);
        teamCode.set(null);
        // this.redirect('/team');
      }
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
      return [appVars.Subs.teams, appVars.Subs.events];
    },
    onAfterAction: function() {
      var that = this, thisUser = Meteor.user();
      if (thisUser && thisUser.profile && thisUser.profile.firstLogin) {
            routerDeps.home = Deps.autorun(function(c) {
              if (that.ready()) {
                Meteor.users.update({_id: thisUser._id}, {$unset: {'profile.firstLogin': true}});
                Router.Tour.loadTour(appVars.tour);
                Meteor.setTimeout(function() {
                  Router.Tour.nextStep();
                }, 250);
                delete routerDeps.home;
                c.stop();
              }
        });    
      }
    },
    onStop: function() {
      if (routerDeps.home) {
        routerDeps.home.stop();
        delete routerDeps.home;
      }
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
        appVars.Subs.pitches,
        appVars.Subs.teams,
        appVars.Subs.events
        ];
    },
    onAfterAction: function() {
      var thisEvent = Events.findOne({_id: this.params.eventCode});
      if (thisEvent) thisEvent.pitch = null;
      if (thisEvent && thisEvent.players > 0) {
        UI.insert(UI.renderWithData(Template.signupModalHolder, {postingData: thisEvent}), document.body);
        $('#signupModal').modal('setting', {
          onHidden: function() {
            $('.ui.dimmer.page').remove();
          }
        });
        Meteor.setTimeout(function() {$('#signupModal').modal('show');}, 200);
      }
      else if (thisEvent && thisEvent.players <= 0) {
        this.redirect('/home');
      }
      else {
        var eventWait = Events.find({_id: this.params.eventCode}).observe({
          added: function(doc) {
            if (doc.players > 0) {
              eventWait.stop();
              eventWait = null;
              UI.insert(UI.renderWithData(Template.signupModalHolder, {postingData: doc}), document.body);
              $('#signupModal').modal('setting', {
                onHidden: function() {
                  $('.ui.dimmer.page').remove();
                }
              });
              Meteor.setTimeout(function() {$('#signupModal').modal('show');}, 200);         
            }
            else this.redirect('/home');
          }
        });
      }  
    },
    onStop: function() {
      if (eventWait) eventWait.stop();
      eventWait = null;
    }
  });

  this.route('confirmGender', {
    path: '/gender',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'twitterGenderModalHolder': {to: 'mainSection'}
    },
    onAfterAction: function() {
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
        appVars.Subs.pitches,
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
    onBeforeAction: function() {
      Meteor.call('printLine');
    }
  });

  this.route('addPitches', {
    path: '/addPitches',
    controller: suprsubController,
    template: 'pitchesTemplate',
    waitOn: function() {
      return [
        appVars.Subs.pitches
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
        appVars.Subs.logging
      ];
    },
    data: function() {
      return {
        logs: Logging.find({}, {sort: {dateTime: -1}})
      }
    }
  }); 
});

getRouterDeps = function() {
  return routerDeps;
}

getTeamCode = function() {
  return teamCode.get();
}