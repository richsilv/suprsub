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
  }
});