Pitches = new Meteor.Collection("pitches");
Events = new Meteor.Collection("events");
NewVenues = new Meteor.Collection("newvenues");
// DISABLE THIS FOR CLIENT
Tweets = new Meteor.Collection("tweets");
Teams = new Meteor.Collection("teams");

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
		if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	},
	remove: function() {
		if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;
	},
	update: function() {
		if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.admin)
			return true;		
	}
});

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