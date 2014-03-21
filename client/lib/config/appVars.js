appVars = (function() {

	TimeKeeper = {};
	TimeKeeper._dep = new Deps.Dependency();

	return {
		gc: null,
		venues: new suprsubDep([]),
		mapCenter: new suprsubDep({b: 51.5080391, d: -0.12806929999999284, lat: function() {return this.b;}, lng: function() {return this.d;}}),
		tabChoices: new suprsubDep({playerTab: 'availability'}),
		circleChanged: new suprsubDep(false),
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
	    saveCalc: new Deps.Dependency(),
	    maxInvalidate: 100,
	    maxPitches: 40
	};
}
)();