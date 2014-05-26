Pitches = new Meteor.Collection("pitches");
Events = new Meteor.Collection("events");
NewVenues = new Meteor.Collection("newvenues");
// DISABLE THIS FOR CLIENT
Tweets = new Meteor.Collection("tweets");
Teams = new Meteor.Collection("teams");
Logging = new Meteor.Collection("logging");

Tweets.after.insert(function(userId, tweet) {
	serverFunctions.consumeTweet(tweet);
	Tweets.update(tweet, {$set: {consumed: true}});
});

Events.after.insert(function(userId, thisEvent) {
	appConfig.sendToLogger.log("Running `after` Hook");		
	Events.update(thisEvent, {$set: {period: serverFunctions.getPeriodCode(thisEvent.dateTime)}});
	var players = serverFunctions.matchingPlayers(thisEvent._id);
	appConfig.sendToLogger.log("Distributing to:", players);
	if (players.length)	serverFunctions.distributeEvent(players, thisEvent._id);
	Events.update(thisEvent, {$set: {posted: true}});
});

Meteor.users.allow({
	update: function(userId, doc, fieldName, modifier) {
		console.log("UserId", userId);
		if (userId !== doc._id)
			return false;
		console.log(fieldName);
		return true;
	}
});

Teams.allow({
	update: function() {
		return true;
	},
	insert: function() {
		return true;
	},
	remove: function(userId, doc) {
		return (Meteor.user() && Meteor.user().profile.team._ids.indexOf(doc._id) > -1);
	}
});

Pitches.allow({
	insert: function() {
		// if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	},
	remove: function() {
		// if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	},
	update: function() {
		// if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	}
});

Logging.allow({
	insert: function() {
		return true;
	}
})

NewVenues.allow({
	insert: function(userId, doc) {
		return !!(doc.name && doc.address);
	}
})

Reactive = {
  feed: {
    cursor: function(x) { return Events.find({}, { limit: x, sort: { createdAt: -1 }}); },
    relations: [{
      collection: function() { return Meteor.users; },
      parentKey: 'userId'
    }, {
      collection: function() { return Teams; },
      parentKey: 'team'
    }]
  }
};
