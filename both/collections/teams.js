Teams = new Meteor.Collection('teams');

// SCHEMA

Schemas.Teams = new SimpleSchema({
	time: {
		type: Date,
		label: 'Regular Day/Time'
	},
	format: {
		type: Number,
		label: 'Game Format',
		allowedValues: [5, 6, 7, 8, 9, 10, 11]
	},
	homeGround: {
		type: String,
		label: 'Home Ground'
	},
	name: {
		type: String,
		label: 'Team Name',
		max: 50
	},
	ringerCode: {
		type: String,
		label: 'Ringer Code'
	},
	ringers: {
		type: [String],
		label: 'Ringers Pool',
		maxCount: 50
	},
	players: {
		type: [String],
		label: 'Players Pool',
		maxCount: 50
	},
	competitive: {
		type: Number,
		allowedValues: [0, 1],
		label: 'Friendly/Competitive'
	}
});

Teams.attachSchema(Schemas.Teams);

// ALLOW/DENY

Teams.allow({
  insert: function (userId, doc) {
  	if (doc._id) return false;
    else if (true) return true;
  },

  update: function (userId, doc, fieldNames, modifier) {
  	if (true)
    return true;
  },

  remove: function (userId, doc) {
    return true;
  }
});

Teams.deny({
  insert: function (userId, doc) {
    return false;
  },

  update: function (userId, doc, fieldNames, modifier) {
    return false;
  },

  remove: function (userId, doc) {
    return false;
  }
});

// HELPERS

Teams.myTeams = function() {

	var user = Meteor.user(),
		teams = [];

	Teams.find({_id: {$in: user.profile.team._ids || []}}).forEach(function(team) {
		teams.push(_.extend(team, {player: true}));
	});

	Teams.find({_id: {$in: user.profile.team._ids_ringer || []}}).forEach(function(team) {
		teams.push(_.extend(team, {player: false}));
	});

	return teams;

};