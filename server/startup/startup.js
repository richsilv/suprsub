Meteor.startup(function() {

	// COLLECTION OBSERVERS
	Tweets.find({consumed: {$exists: false}}).observe({
		added: function(tweet) {
			serverFunctions.consumeTweet(tweet);
			Tweets.update(tweet, {$set: {consumed: true}});
		}
	});
	Events.find({posted: {$exists: false}}).observe({
		added: function(event) {
			var players = serverFunctions.matchingPlayers(event._id);
			if (players.length)	serverFunctions.distributeEvent(players, event);
			Events.update(event, {$set: {consumed: true}});
		}
	});

	// STARTUP PROCESSES
	Pitches._ensureIndex({ location : "2d" });
	serverFunctions.streamTwitter();

	// ACCOUNTS INJECTION ON SERVER STARTUP
	Accounts.loginServiceConfiguration.remove({
	    service: "facebook"
	});
	Accounts.loginServiceConfiguration.remove({
	    service: "twitter"
	});
	if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
	//	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
		Accounts.loginServiceConfiguration.insert(appConfig.facebookprod);
		Accounts.loginServiceConfiguration.insert(appConfig.twitterconfig);
	}
	else {
		Accounts.loginServiceConfiguration.insert(appConfig.facebooklocal);
		Accounts.loginServiceConfiguration.insert(appConfig.twitterconfig);	
	}

});