Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}}, {fields: {prettyLocation: 1, 'location.lat': 1, 'location.lng': 1}});
});

Meteor.publish('allPitches', function() {
	return Pitches.find({}, {fields: {prettyLocation: 1, 'location.lat': 1, 'location.lng': 1}});
});

Meteor.publish('events', function(id, userPostings) {
	var events, eventsList, teamList, userList,
		thisUser = Meteor.users.findOne(this.userId),
		gender = (thisUser && thisUser.profile.gender !== null) ? thisUser.profile.gender : 0;
	if (id) {
		var thisUser = Meteor.users.findOne(id);
		if (!thisUser)
			events = Events.find({gender: gender}, {sort: {createdAt: -1}, limit: 20});
		else if (userPostings)
			events = Events.find({gender: gender, team: {$in: thisUser.profile.team._ids}}, {sort: {createdAt: -1}, limit: 20});
		else
			events = thisUser.profile.player.availability ? Events.find({gender: gender, periodCode: {$in: _.reduce(thisUser.profile.player.availability, function(q, v, i) {if (v) q.push(i); return q;}, [])}}, {sort: {createdAt: -1}, limit: 20}) : null;
	}
	else {
		events = Events.find({gender: gender}, {sort: {createdAt: -1}, limit: 20});
	}
	if (events) {
		eventsList = events.fetch();
		userList = _.pluck(eventsList, 'userId');
		teamList = _.pluck(eventsList, 'team');
		events.rewind();
		return [
			events, 
			Meteor.users.find({_id: {$in: userList}}, {fields: {profile: true}}),
			Teams.find({_id: {$in: teamList}})
		];
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

// Meteor.publishReactive('feed');