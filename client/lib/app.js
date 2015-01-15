/*****************************************************************************/
/* Client App Namespace  */
/*****************************************************************************/
_.extend(App, {

	tabChoices: new SuprSubDep({
		playerTab: 'availability',
		playersRingers: 'players',
		aboutTab: null
	}),

	padZeros: function(string, len) {
		if (typeof string !== 'string') string = string.toString();
		while (string.length < len) string = '0' + string;
		return string;
	},

	subs: {
		postingsChoice: new SuprSubDep(''),
		postingsUser: new SuprSubDep(false)
	},

	mapSearchURI: 'http://nominatim.openstreetmap.org/search?',

	impersonate: function(password, userId) {
		Meteor.call('utility/impersonate', userId, password, function(err, res) {
			if (err) {
				throw new Meteor.Error(err);
			}
			else {
				Meteor.connection.setUserId(res);
			}
		})
	}

});

App.helpers = {
	option: function(option) {
		return Router && Router.current(true).path === option;
	},
	tabChoice: function(key, value) {
		if (App.tabChoices) return App.tabChoices.getKey(key) === value;
		else return false;
	},
	days: function() {
		return _.map(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], function(d, i) {
			return {
				dayCode: i,
				name: d
			};
		});
	},
	toKm: function(m) {
		return Math.round(m / 100) / 10;
	},
	stringify: function(object) {
		return JSON.stringify(object);
	},
	profile: function() {
		return Meteor.user() && Meteor.user().profile;
	}
};

_.each(App.helpers, function(helper, key) {
	Handlebars.registerHelper(key, helper);
});

String.prototype.capitalize = function() {
	return this.split(' ').map(function(subString) {
		return subString.slice(0, 1).toUpperCase() + subString.slice(1);
	}).join(' ');
}