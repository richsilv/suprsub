Meteor.startup(function() {

	Deps.autorun(function(c) {
		if (appVars.mainOption === '/player') {
			if (appVars.liveCircle) {
				appVars.mapCenter.set(appVars.liveCircle.getCenter());
			}
			else {
				var populationOptions = {
					strokeColor: '#78db1c',
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: '#78db1c',
					fillOpacity: 0.35,
					map: appVars.pitchMap,
					draggable: true,
					center: appVars.mapCenter.get(),
					radius: appVars.circleSize.get()
				};
				if (window.google) {
					appVars.liveCircle = new google.maps.Circle(populationOptions);
					google.maps.event.addListener(appVars.liveCircle, 'center_changed', function() {
						appVars.mapCenter.set(appVars.liveCircle.getCenter());
						appVars.liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
						appVars.circleChanged.set(true);
					});
				}
			}
		}
	});
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