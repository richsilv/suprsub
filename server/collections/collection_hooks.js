/*// KEEP CLOSE LINKS BETWEEN PLAYERS/RINGERS LIST IN TEAM DOCS AND THOSE IN USER DOCS

Teams.hookOptions.after.update = {fetchPrevious: false};
Meteor.users.hookOptions.after.update = {fetchPrevious: false};

Teams.after.update(function(userId, doc, fieldNames, modifier) {

	var teamId = doc._id

	for (op in modifier) {

		var mod = modifier[op];

		switch (op) {

			case '$pull':

				if (!doc.ringers.length) {

					Teams.remove(doc);

				}

			case '$push':

				for (typeArray in mod) {

					var id = mod[typeArray],
						updater = {},
						query = {_id: id};

					if (id instanceof Array) throw new Meteor.Error(500, "Team updated with multiple user ids!", {teamId: teamId, ids: id});

					switch (typeArray) {

						case 'players':
							updater[op] = {
								'profile.team._ids': teamId
							};
							query['profile.team._ids'] = (op === '$push') ? {$ne: teamId} : teamId;
							break;

						case 'ringers':
							updater[op] = {
								'profile.team._ids_ringer': teamId
							};
							query['profile.team._ids_ringer'] = (op === '$push') ? {$ne: teamId} : teamId;
							break;

						default:
					}

					if (Object.getOwnPropertyNames(updater).length && Meteor.users.findOne(query)) Meteor.users.update(query, updater);

				}

			break;

			default:
		}

	}

});

Teams.after.remove(function (userId, doc) {

	Meteor.users.update({'profile.team._ids': doc._id}, {$pull: {'profile.team._ids': doc._id}});
	Meteor.users.update({'profile.team._ids_ringer': doc._id}, {$pull: {'profile.team._ids_ringer': doc._id}});	

});

Meteor.users.before.update(function(userId, doc, fieldNames, modifier) {

	var playerId = doc._id;

	for (op in modifier) {

		var mod = modifier[op];

		switch (op) {

			case '$push':
			case '$pull':

				for (typeArray in mod) {

					var id = mod[typeArray],
						updater = {},
						query = {_id: id};

					if (id instanceof Array) throw new Meteor.Error(500, "User updated with multiple team ids!", {userId: playerId, ids: id});

					switch (typeArray) {

						case 'profile.team._ids':
							updater[op] = {
								'players': playerId
							};
							query.players = (op === '$push') ? {$ne: playerId} : playerId;
							break;

						case 'profile.team._ids_ringer':
							updater[op] = {
								'ringers': playerId
							};
							query.ringers = (op === '$push') ? {$ne: playerId} : playerId;
							break;

						default:
					}

					if (Object.getOwnPropertyNames(updater).length) Teams.update(query, updater);

				}

			break;

			default:
		}

	}

});

Meteor.users.after.update(function(userId, doc, fieldNames, modifier) {

	if (doc.profile.team.default && doc.profile.team._ids.indexOf(doc.profile.team.default) === -1) {

		Meteor.users.update(doc._id, {$set: { 'profile.team.default': null }});

	}

});*/