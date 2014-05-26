Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Meteor.publish('allPitches', function() {
	return Pitches.find();
});

Meteor.publish('events', function(id, userPostings) {
	if (id) {
		var thisUser = Meteor.users.findOne(id);
		if (!thisUser)
			return Events.find({}, {sort: {createdAt: -1}, limit: 20});
		else if (userPostings)
			return Events.find({team: {$in: thisUser.profile.team._ids}}, {sort: {createdAt: -1}, limit: 20});
		else
			return thisUser.profile.player.availability ? Events.find({periodCode: {$in: Object.keys(thisUser.profile.player.availability)}}, {sort: {createdAt: -1}, limit: 20}) : null;
	}
	else {
		return Events.find({}, {sort: {createdAt: -1}, limit: 20});
	}
});

Meteor.publish('allEvents', function(x) {
	return Events.find({}, {limit: x, sort: {dateTime: -1}});
});

Meteor.publish('teams', function(ids) {
	if (ids) return Teams.find({_id: {$in: ids}});
	else {
		var thisUser = Meteor.users.findOne(this.userId);
		if (thisUser && thisUser.profile && thisUser.profile.team && thisUser.profile.team._ids &&thisUser.profile.team._ids.length) {
			return Teams.find({_id: {$in: thisUser.profile.team._ids}});
		}
		else
			return [];
	}
})

Meteor.publish('allTeams', function(x) {
	return Teams.find({}, {limit: x});
});

Meteor.publish("userData", function () {
	return Meteor.users.find({_id: this.userId},
		{fields: {'services': 1}});
});

Meteor.publish("allUsers", function(x) {
	return Meteor.users.find({}, {limit: x});
});

Meteor.publish("tweets", function(userId) {
	var thisUser = Meteor.users.findOne(userId);
	if (thisUser && thisUser.admin)
		return Tweets.find({}, {sort: {createdAt: -1}, limit: 20});
	else
		return [];
});

Meteor.publish("allTweets", function(x) {
	return Tweets.find({}, {limit: x, sort: {twitterCreated: -1}});
});

Meteor.publish("logging", function() {
	return Logging.find({dateTime: {$gte: new Date(new Date().getTime() - 6000000)}});
});

Meteor.publishReactive('feed');