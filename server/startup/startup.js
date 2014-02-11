Meteor.startup(function() {

	// COLLECTION OBSERVERS
	Tweets.find({consumed: {$exists: false}}).observeChanges({
		added: function(tweetId) {
			var tweet = Tweets.findOne(tweetId);
			serverFunctions.consumeTweet(Tweets.findOne(tweetId));
			Tweets.update(tweet, {$set: {consumed: true}});
		}
	});
	Events.find({posted: {$exists: false}}).observeChanges({
		added: function(eventId) {
			var thisEvent = Events.findOne(eventId);
			Events.update(thisEvent, {$set: {period: serverFunctions.getPeriodCode(thisEvent.dateTime)}});
			var players = serverFunctions.matchingPlayers(eventId);
			if (players.length)	serverFunctions.distributeEvent(players, Events.findOne(eventId));
			Events.update(eventId, {$set: {posted: true}});
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
		Accounts.loginServiceConfiguration.insert(appConfig.twitterlocal);	
	}

});