Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Meteor.publish('allpitches', function() {
	return Pitches.find();
});

Meteor.publish('postings', function(id) {
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

Meteor.publish("userData", function () {
	return Meteor.users.find({_id: this.userId},
		{fields: {'services': 1}});
});