App = {};

_.extend(App, {

	countKeys: function(object) {
		return Object.keys(object).length;
	},

	playerFields: [
      {
        label: "Age",
        field: "age",
        data: [
          {code: 0, label: '16-18'},
          {code: 1, label: '18-25'},
          {code: 2, label: '25-35'},
          {code: 3, label: '35-45'},
          {code: 4, label: '45+'}
        ],
      },
      {
        label: "Prefered Position",
        field: "position",
        data: [
          {code: 0, label: 'Goalkeeper'},
          {code: 1, label: 'Defender'},
          {code: 2, label: 'Midfield'},
          {code: 3, label: 'Forward'},
          {code: 4, label: 'Any Outfield'},
          {code: 5, label: 'Any'},        
        ]
      },
      {
        label: "Footedness",
        field: "footed",
        data: [
          {code: 0, label: 'Right'},
          {code: 1, label: 'Left'},
          {code: 2, label: 'Both'},
        ] 
      },
      {
        label: "Ability",
        field: "ability",
        data: [
          {code: 0, label: 'Beginner'},
          {code: 1, label: 'OK'},
          {code: 2, label: 'Good'},
          {code: 3, label: 'Very Good'},
          {code: 4, label: 'Excellent'},
        ]
      }
    ]


});

/*Accounts.connection = Client.remote;

Meteor.users = new Meteor.Collection("users", {
  _preventAutopublish: true,
  connection: Meteor.isClient ? Accounts.connection : Meteor.connection
});

Accounts.connection.subscribe(null);*/