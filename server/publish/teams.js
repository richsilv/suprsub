/*****************************************************************************/
/* Teams Publish Functions
/*****************************************************************************/

Meteor.publish('myteams', function () {
	
  return Teams.find({$or: [ {players: this.userId}, {ringers: this.userId} ]});

});