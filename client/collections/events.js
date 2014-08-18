Events = new Meteor.Collection('events', Client.remote);

Deps.autorun(function() {
    Client.subs.events = Client.remote.subscribe('events', Client.subs.postingsChoice.get(), Client.subs.postingsUser.get());
});

/*
 * Add query methods like this:
 *  Events.findPublic = function () {
 *    return Events.find({is_public: true});
 *  }
 */
