Meteor.startup(function() {

//	clientFunctions.logTemplateEvents();

	Deps.autorun(function() {
		if (appVars.mapCenter.get() && typeof(appVars.circleSize) !== 'undefined' && appVars.circleSize !== null && appVars.circleSize.get() && Subs.pitches.ready()) {
			Meteor.call('pitchesWithin', {"lat": appVars.mapCenter.get().lat(), "lng": appVars.mapCenter.get().lng()}, appVars.circleSize.get(), function(err, res) {
				if (err) console.log(err);
				else if ('venues' in appVars) {
					appVars.venues.set(res);
				}
			});
		}
	});
	
	Deps.autorun(function() {
		if (Router && Router.current(true)) mainOption = Router.current(true).path;
	});

});