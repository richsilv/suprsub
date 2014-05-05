Meteor.startup(function() {

    // LOG ALL QUERIES
/*    var wrappedFind = Meteor.Collection.prototype.find;

    console.log('[startup] wrapping Collection.find')
    
    Meteor.Collection.prototype.find = function () {
      console.log(this._name + '.find', JSON.stringify(arguments))
      return wrappedFind.apply(this, arguments);
    }*/

	// COLLECTION OBSERVERS

	var watchTweets, watchEvents;

	Meteor.setInterval(function() {
		if (watchTweets)
			watchTweets.stop();
		if (watchEvents)
			watchEvents.stop();

		watchTweets = Tweets.find({consumed: {$exists: false}}).observeChanges({
			added: function(tweetId) {
				var tweet = Tweets.findOne(tweetId);
				serverFunctions.consumeTweet(Tweets.findOne(tweetId));
				Tweets.update(tweet, {$set: {consumed: true}});
			}
		});
		watchEvents = Events.find({posted: {$exists: false}}).observeChanges({
			added: function(eventId) {
				var thisEvent = Events.findOne(eventId);
				Events.update(thisEvent, {$set: {period: serverFunctions.getPeriodCode(thisEvent.dateTime)}});
				var players = serverFunctions.matchingPlayers(eventId);
				if (players.length)	serverFunctions.distributeEvent(players, Events.findOne(eventId));
				Events.update(eventId, {$set: {posted: true}});
			}
		})
	}, 300000);;

	// STARTUP PROCESSES
	Pitches._ensureIndex({ location : "2d" });
	if (Meteor.settings && Meteor.settings.streamTwitter) {
		serverFunctions.streamTwitter();
		appConfig.streaming = true;
	}

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