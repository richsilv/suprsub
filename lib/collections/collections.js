Pitches = new Meteor.Collection("pitches");
Events = new Meteor.Collection("events");
NewVenues = new Meteor.Collection("newvenues");
// DISABLE THIS FOR CLIENT
Tweets = new Meteor.Collection("tweets");
Teams = new Meteor.Collection("teams");

Meteor.users.allow({
	update: function(userId, doc, fieldName, modifier) {
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
	}
});

Pitches.allow({
	insert: function() {
		if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	},
	remove: function() {
		if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	}
})