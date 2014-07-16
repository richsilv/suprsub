var dep;

suprsubController = FastRender.RouteController.extend({
/*  autoRender: false,*/
  layout: 'mainTemplate',
  loadingTemplate: 'loading',
  onBeforeAction: function (pause) {
    var that = this;
    appVars.showErrors.set(false);
    if (dep) dep.stop();
    if (Router.Tour.getTour() && Router.Tour.currentPage() !== this.route.name) {
      console.log("Stopping tour", Router.Tour.currentPage(), this.route.name);
      Router.Tour.loadTour();
      Router.Tour.nextStep();
    }
    Deps.autorun(function(c) {
      if (!Meteor.user()) {
        c.stop();
        that.redirect('/login');
      }
      else if (Meteor.user().profile && Meteor.user().profile.confirmGender && this.path !== '/gender') {
        c.stop();
        that.redirect('/gender');
      }
      else if (Meteor.user().profile && Meteor.user().profile.firstLogin && that.path !== '/home') {
        c.stop();
        that.redirect('/home');
      }
    });
  },
  onAfterAction: function() {
  },
});

Router.onBeforeAction('loading');

Router.map(function() {

  var subs;

  this.route('login', {
    path: '/login',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'loginScreen': {to: 'mainSection'}
    },
    onBeforeAction: function() {
      var that = this;
      Deps.autorun(function(c) {
        if (Meteor.userId()) {
          c.stop();
          that.redirect('/home');
        }
      });
    }
  })

  this.route('playerDetails', {
    path: '/player',
    controller: suprsubController,
    template: 'mainTemplate',
    yieldTemplates: {
      'playerDetails': {to: 'mainSection'}
    },
    waitOn: function() {
      return [clientFunctions.loadGMaps()];
    },
    onBeforeAction: function() {
      appVars.circleSize.set(8000);
      if (Meteor.user() && Meteor.user().profile) appVars.availabilitySession.set(Meteor.user().profile.player.availability);
    },
    action: function() {
      this.render();
      Template.pitchMapLarge.rendered = function() {
        Deps.autorun(function(c) {
          if (Pitches.find().count() > 1000) {
            clientFunctions.initialize(true);
            c.stop();
          }
        });
        Template.pitchMapLarge.rendered = null;
      };
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
      return [Subs.pitches, clientFunctions.reactiveSubHandle('teams'), clientFunctions.loadGMaps()];
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
        Subs.teams
        ];
    },
    onAfterAction: function() {
      var that = this, thisUser = Meteor.user();
      if (thisUser && thisUser.profile && thisUser.profile.firstLogin) {
            dep = Deps.autorun(function(c) {
              if (that._waitList.ready()) {
                Meteor.users.update({_id: thisUser}, {$unset: {'profile.firstLogin': true}});
                Router.Tour.loadTour(appVars.tour);
                Meteor.setTimeout(function() {
                  Router.Tour.nextStep();
                }, 250);
                c.stop();
              }
        });
            
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
        Subs.pitches,
        Subs.teams,
        clientFunctions.reactiveSubHandle('events')
        ];
    },
    after: function() {
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
    unload: function() {
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