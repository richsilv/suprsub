// KEEP CLOSE LINKS BETWEEN PLAYERS/RINGERS LIST IN TEAM DOCS AND THOSE IN USER DOCS

Teams.before.update(function(userId, doc, fieldNames, modifier) {

	console.log(doc, modifier);

});

Meteor.users.before.update(function(userId, doc, fieldNames, modifier) {

	console.log(doc, modifier);

});