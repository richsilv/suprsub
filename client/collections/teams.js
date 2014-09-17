Teams = new Meteor.Collection('teams', Client.remote);

Deps.autorun(function() {
    if (Meteor.userId()) {
        Client.subs.teams = Client.remote.subscribe('teams');
    }
});

/*
 * Add query methods like this:
 *  Teams.findPublic = function () {
 *    return Teams.find({is_public: true});
 *  }
 */

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

}