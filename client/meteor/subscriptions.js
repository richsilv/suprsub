Subs = {};

Deps.autorun(function() {
  if (Meteor.user()) {
    Subs.teams = Meteor.subscribe('teams');
    Subs.pitches = Meteor.subscribe('allPitches');
    Subs.userData = Meteor.subscribe('userData');
  }
});