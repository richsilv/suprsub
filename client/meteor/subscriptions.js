Subs = {
	postingsChoice : new suprsubDep(''),
    postingsUser : new suprsubDep(false)
};

var pitches = amplify.store('pitchData'), existingPitchIds = _.pluck(pitches, '_id');
Subs.pitches = Meteor.call('getPitches', existingPitchIds,function(err, res) {
    if (err) {
        console.log("Cannot get pitches", err);
    }
    else {
        console.log("Returned " + res.length + " pitches");
        console.log("Collecting " + pitches.length + " pitches");
        pitches = pitches ? pitches.concat(res) : res;
        console.log("Inserting Pitches");
        pitches.forEach(function(p) {
            Pitches.insert(p);
        });
        console.log("Pitches Inserted");
        appVars.pitchesReady.set(true);
        console.log("Getting redundant pitches");
        Meteor.call('oldPitches', existingPitchIds, function(err, res) {
            if (err) {
                console.log("Cannot get old pitches", err);
            }
            else {
                console.log("Removing " + res.length + " redundant pitches");
                Pitches.remove({_ids: {$in: res}}, function(err) {
                    amplify.store('pitchData', Pitches.find().fetch());
                });
            }
        });
    }
});

Deps.autorun(function() {
  if (Meteor.user()) {
    // if (Subs.reactiveFeed) Subs.reactiveFeed[0].stop();
    Subs.teams = Meteor.subscribe('teams');
    // Subs.pitches = Meteor.subscribe('allPitches');

    Subs.userData = Meteor.subscribe('userData');
    Subs.events = Meteor.subscribe('events', Subs.postingsChoice.get(), Subs.postingsUser.get());
    // Subs.liveTeams = Meteor.subscribe('liveTeams');
    // Subs.liveUsers = Meteor.subscribe('liveUsers');
    // Subs.reactiveFeed = Meteor.subscribeReactive('feed', 20, Subs.postingsChoice.get(), Subs.postingsUser.get());
    Subs.logging = Meteor.subscribe('logging');
  }
});