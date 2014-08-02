appVars.Subs.postingsChoice = new suprsubDep('');
appVars.Subs.postingsUser = new suprsubDep(false);

var pitches = (Meteor.settings && Meteor.settings.public && Meteor.settings.public.overWritePitches) ? [] : amplify.store('pitchData')
    existingPitchIds = _.pluck(pitches, '_id');
$(window).load(function() {
    appVars.Subs.pitches = Meteor.call('getPitches', existingPitchIds,function(err, res) {
        if (err) {
            console.log("Cannot get pitches", err);
        }
        else {
            console.log("Returned " + res.length + " pitches");
            console.log("Collecting " + (pitches ? pitches.length : 0) + " pitches");
            pitches = pitches ? pitches.concat(res) : res;
            pitches.forEach(function(p) {
                Pitches.insert(p);
            });
            appVars.pitchesReady.set(true);
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
});

Deps.autorun(function() {
    if (Meteor.userId()) {
        appVars.Subs.teams = clientFunctions.safeSubscribe('teams');
        appVars.Subs.userData = clientFunctions.safeSubscribe('userData');
        appVars.Subs.events = clientFunctions.safeSubscribe('events', appVars.Subs.postingsChoice.get(), appVars.Subs.postingsUser.get());
        appVars.Subs.logging = clientFunctions.safeSubscribe('logging');
    }
});