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
	},

	contactString: function(profile) {
		var cString = '',
			contactArray = profile && profile.contact;
		if (!contactArray || !contactArray.length) return "None";
		else {
			for (var i = 0; i < contactArray.length; i++) cString += App.contactNames[contactArray[i]] + ", ";
		}
		return cString.substr(0, cString.length - 2);
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
	},
	email: function(arg) {
		var user = Meteor.user();
		if (!user) return false;
		else if (!arg && user.emails) return true;
		else if (arg === 'verified') return Meteor.user().emails[0].verified;
		else if (arg === 'unverified') return !Meteor.user().emails[0].verified;
	},
	service: function(serviceName) {
		return Meteor.user() && Meteor.user().services && _.has(Meteor.user().services, serviceName);
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