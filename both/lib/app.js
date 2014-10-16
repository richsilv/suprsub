App = {};

_.extend(App, {

	remote: DDP.connect('http://suprsub-20880.onmodulus.net'),

	countKeys: function(object) {
		return Object.keys(object).length;
	}


});

/*Accounts.connection = Client.remote;

Meteor.users = new Meteor.Collection("users", {
  _preventAutopublish: true,
  connection: Meteor.isClient ? Accounts.connection : Meteor.connection
});

Accounts.connection.subscribe(null);*/