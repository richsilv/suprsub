/*****************************************************************************/
/* Teams Publish Functions
/*****************************************************************************/

Meteor.publish('myteams', function () {
	
  var user = Meteor.users.findOne(this.userId),
  teamset = user ? _.union(user.profile.team._ids || [], user.profile.team._ids_ringer || []) : [];

  return Teams.find({_id: {$in: teamset}});
});
