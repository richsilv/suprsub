Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Meteor.publish('allPitches', function() {
	return Pitches.find();
});

Meteor.publish('events', function(id) {
	if (id) {
		var thisUser = Meteor.users.findOne(id);
		if (!thisUser)
			return Events.find({}, {sort: {createdAt: -1}, limit: 20});
		return Events.find({periodCode: {$in: Object.keys(thisUser.profile.player.availability)}}, {sort: {createdAt: -1}, limit: 20});
	}
	else {
		return Events.find({}, {sort: {createdAt: -1}, limit: 20});
	}
});

Meteor.publish('allEvents', function(x) {
	return Events.find({}, {limit: x});
});

Meteor.publish('teams', function(ids) {
	if (ids) return Teams.find({_id: {$in: ids}});
	else {
		var thisUser = Meteor.users.findOne(this.userId);
		if (thisUser && thisUser.profile && thisUser.profile.team)
			return Teams.find({_id: {$in: thisUser.profile.team._ids}});
		else
			return Teams.find({_id: 'nullId'});
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
})

Meteor.publish("tweets", function(userId) {
	var thisUser = Meteor.users.findOne(userId);
	if (thisUser && thisUser.admin)
		return Tweets.find({}, {sort: {createdAt: -1}, limit: 20});
	else
		return [];
});

Meteor.publish("allTweets", function(x) {
	return Tweets.find({}, {limit: x});
})