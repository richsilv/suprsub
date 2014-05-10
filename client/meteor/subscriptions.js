Subs = {
	postingsChoice : new suprsubDep(''),
    postingsUser : new suprsubDep(false)
};

Deps.autorun(function() {
  if (Meteor.user()) {
    Subs.teams = Meteor.subscribe('teams');
    Subs.pitches = Meteor.subscribe('allPitches');
    Subs.userData = Meteor.subscribe('userData');
    Subs.events = Meteor.subscribe('events', Subs.postingsChoice.get(), Subs.postingsUser.get());
    Subs.liveTeams = Meteor.subscribe('liveTeams');
    Subs.liveUsers = Meteor.subscribe('liveUsers');
    Subs.reactiveFeed = Meteor.subscribeReactive('feed', 20);
    Subs.logging = Meteor.subscribe('logging');
  }
});