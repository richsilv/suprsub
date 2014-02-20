Subs = {
	pitches: Meteor.subscribe('allpitches', {onReady: function() {}}),
	events: Meteor.subscribe('events')
};