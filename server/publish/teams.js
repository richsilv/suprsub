/*****************************************************************************/
/* Teams Publish Functions
/*****************************************************************************/

Meteor.publish('myteams', function () {
  // you can remove this if you return a cursor
  var user = this.user,
  teamset = user ? _.union(user.profile.team._ids || [], user.profile.team._ids_ringer || []) : [];

  return Teams.find({_id: {$in: teamset}});
});
