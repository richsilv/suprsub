var tour = {
	id: "welcome",
	steps: [
		{
			title: "Welcome",
			content: "Here’s where you look for a player.  It will populate with your default game when you save it in Team.",
			target: "#fullPostingForm",
			targetTemplate: "homePage",
			placement: "right",
			mobilePlacement: "bottom",
			page: 'home'
		},

		{
			title: "Activity Feed",
			content: "This is our feed containing all postings, which you can filter",
			target: "#activityHeader",
			targetTemplate: "activityFeed",
			placement: "bottom",
			mobilePlacement: "top",
			page: 'home'
		},

		{
			title: "Player Tab",
			content: "If you want to play more footy, here’s where you enter your availability and neighbourhood (where you live and how far you are willing to travel).",
			target: "#playerForm",
			targetTemplate: "playerForm",
			placement: "right",
			mobilePlacement: "bottom",
			page: 'playerDetails'		
		},

		{
			title: "Team Tab",
			content: "Save your regular games here. Any info left off a player post or tweet will be populated by your default game.",
			target: "#gameFormat",
			targetTemplate: "teamSettings",
			placement: "right",
			mobilePlacement: "bottom",
			page: 'teamDetails'
		},

		{
			title: "Invite Teammates",
			content: "Invite your team mates and regular ringers so that you can contact them with one click.",
			target: "#toggleTeammates",
			targetTemplate: "playerButtons",
			placement: "left",
			mobilePlacement: "top",
			page: 'teamDetails'
		},

		{
			title: "Settings",
			content: "Manage your contact preferences here.",
			target: "#selectedContact",
			targetTemplate: "settingsBox",
			placement: "right",
			mobilePlacement: "bottom",
			page: 'settings',
			buttonText: 'Done'
		},

		{
			page: 'playerDetails'
		}

	]
};

appVars = (function() {

	TimeKeeper = {};
	TimeKeeper._dep = new Deps.Dependency();

	return {
		gc: null,
		venues: new suprsubDep([]),
		mapCenter: new suprsubDep({b: 51.5080391, d: -0.12806929999999284, lat: function() {return this.b;}, lng: function() {return this.d;}}),
		tabChoices: new suprsubDep({playerTab: 'availability'}),
		circleChanged: new suprsubDep(false),
		circleSize: new suprsubDep(8000),
		availabilitySession: new suprsubDep([], 'routerAvailability'),
		newPosting: new suprsubDep(null),
		mainOption: '/',
		TimeKeeper: TimeKeeper,
		contactNames: ['Twitter', 'Facebook', 'Email'],
		days: [
		{name: "Sunday", dayCode: 0}, 
		{name: "Monday", dayCode: 1}, 
		{name: "Tuesday", dayCode: 2}, 
		{name: "Wednesday", dayCode: 3}, 
		{name: "Thursday", dayCode: 4}, 
		{name: "Friday", dayCode: 5}, 
		{name: "Saturday", dayCode: 6}
		],
		periods: [
		{name: "Morning", periodCode: 0}, 
		{name: "Afternoon", periodCode: 1}, 
		{name: "Evening", periodCode: 2}
		],
		_libs: {},
		showErrors: new suprsubDep(false),
	    saveCalc: new Deps.Dependency(),
	    maxInvalidate: 100,
	    maxPitches: screen.width > 1000 ? 60 : screen.width > 600 ? 40 : 25,
	    tour: tour
	};
}
)();