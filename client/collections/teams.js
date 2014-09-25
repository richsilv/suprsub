Deps.autorun(function() {
    if (Meteor.userId()) {
        App.subs.teams = Meteor.subscribe('myteams');
    }
});

/*
 * Add query methods like this:
 *  Teams.findPublic = function () {
 *    return Teams.find({is_public: true});
 *  }
 */
