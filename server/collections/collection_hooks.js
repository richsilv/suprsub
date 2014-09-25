// KEEP CLOSE LINKS BETWEEN PLAYERS/RINGERS LIST IN TEAM DOCS AND THOSE IN USER DOCS

Teams.before.update(function(userId, doc, fieldNames, modifier) {

});

Meteor.users.before.update(function(userId, doc, fieldNames, modifier) {

	for (op in modifier) {

		var mod = modifier[op];

		switch (op) {

			case '$push':
			case '$pull':

				for (typeArray in mod) {

					var id = mod[typeArray],
						updater = {};

					switch (typeArray) {

						case 'profile.team._ids':
							updater[op] = {
								'players': userId
							};
							break;

						case 'profile.team._ids_ringer':
							updater[op] = {
								'ringers': userId
							}
							break;

						default:
					}

					if (id instanceof Array) {
						Teams.update({_id: {$in: id}}, updater);
					}

					else {
						Teams.update({_id: id}, updater);
					} 

				}

			break;

			default:
		}
	}

});