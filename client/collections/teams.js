Deps.autorun(function() {
    if (Meteor.userId()) {
        App.subs.teams = App.remote.subscribe('teams');
    }
});

/*
 * Add query methods like this:
 *  Teams.findPublic = function () {
 *    return Teams.find({is_public: true});
 *  }
 */
