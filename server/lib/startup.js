Meteor.startup(function() {

	ServiceConfiguration.configurations.remove({service: "facebook"});

	var fbConfig = SecureData.findOne({service: "facebook", host: Meteor.absoluteUrl()});

	if (fbConfig) {
		ServiceConfiguration.configurations.insert(fbConfig);
	} else {
		console.warn("Cannot connect to Facebook - no valid configuration for host " + Meteor.absoluteUrl());
	}

});