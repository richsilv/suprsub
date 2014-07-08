Meteor.startup(function() {

//	clientFunctions.logTemplateEvents();

	Deps.autorun(function() {
		if (appVars.mapCenter.get() && typeof(appVars.circleSize) !== 'undefined' && appVars.circleSize !== null && appVars.circleSize.get() && Subs.pitches.ready()) {
			console.log("updating pitch list");
			Meteor.call('pitchesWithin', {"lat": appVars.mapCenter.get().lat(), "lng": appVars.mapCenter.get().lng()}, appVars.circleSize.get(), function(err, res) {
				if (err) console.log(err);
				else if ('venues' in appVars) {
					appVars.venues.set(res);
					Meteor.setTimeout(function() {
						console.log("pitch list updated");
					}, 250);
				}
			});
			console.log("this runs after call");
		}
	});
	
	Deps.autorun(function() {
		if (Router && Router.current(true)) mainOption = Router.current(true).path;
	});

});