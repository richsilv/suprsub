Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Meteor.publish('allpitches', function() {
	return Pitches.find();
});

Meteor.publish('postings', function(id) {
	if (id) {
		var thisUser = Meteor.users.find(id);
		if (!thisUser)
			return Events.find({}, {sort: {createdAt: -1}, limit: 20});
		return Events.find({periodCode: {$in: Object.keys(thisUser.profile.player.availability)}}, {sort: {createdAt: -1}, limit: 20});
	}
	else {
		return Events.find({}, {sort: {createdAt: -1}, limit: 20});
	}
});