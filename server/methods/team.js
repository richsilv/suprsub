/*****************************************************************************/
/* Team Methods */
/*****************************************************************************/

Meteor.methods({

	'team/join': function(code) {

		var user = Meteor.users.findOne(this.userId),
			team;

		if (!user) {
			console.warn("Cannot join team without a current user!");
			throw new Metor.Error("no-user", "Cannot join a team without a logged-in user", "Sorry, there's no logged in user to join that team.");
		}

		team = Teams.findOne({
			_id: code
		});

		if (team) {
			Teams.update(team, {
				$push: {
					'players': user._id
				}
			});
			return {
				team: team.name,
				type: 'player'
			};
		}

		team = Teams.findOne({
			ringerCode: code
		});

		if (team) {
			Teams.update(team, {
				$push: {
					'ringers': user._id
				}
			});
			return {
				team: team.name,
				type: 'SuprSub'
			};
		}

		console.warn("User is trying to join an unknonw team.");
		throw new Meteor.Error("bad-code", "User is trying to join an unrecognised team.", "Sorry, but I don't recognise that code - please check and try again.");

	}

});