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
