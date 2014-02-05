Pitches = new Meteor.SmartCollection("pitches");
Events = new Meteor.SmartCollection("events");
NewVenues = new Meteor.SmartCollection("newvenues");
// DISABLE THIS FOR CLIENT
Tweets = new Meteor.SmartCollection("tweets");
Teams = new Meteor.SmartCollection("teams");

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
})