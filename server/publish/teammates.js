/*****************************************************************************/
/* Teammates Publish Functions
/*****************************************************************************/

Meteor.publish('teammates', function(ids) {
	// you can remove this if you return a cursor
	return Meteor.users({
		$or: {
			'profile.team._ids': {
				$in: ids
			},
			'profile.team._ids_ringers': {
				$in: ids
			}
		}
	}, {
		fields: {
			'profile.team': 1,
			'profile.name': 1
		}
	});
});