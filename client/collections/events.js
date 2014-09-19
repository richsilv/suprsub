Deps.autorun(function() {
    App.subs.events = App.remote.subscribe('events', App.subs.postingsChoice.get(), App.subs.postingsUser.get());
});

/*
 * Add query methods like this:
 *  Events.findPublic = function () {
 *    return Events.find({is_public: true});
 *  }
 */
