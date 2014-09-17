/*****************************************************************************/
/* Client App Namespace  */
/*****************************************************************************/
_.extend(App, {
	tabChoices: new SuprSubDep({playerTab: 'availability'}),
	padZeros: function(string, len) {
		if (typeof string !== 'string') string = string.toString();
		while (string.length < len) string  = '0' + string;
		return string;
	}
});

App.helpers = {
	option: function(option) {
	  	return Router && Router.current(true).path === option;
	},
	tabChoice: function(key, value) {
  		if (this.tabChoices) return this.tabChoices.get()[key] === value;
  		else return false;  
	},
	days: function() {
	    return _.map(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], function(d, i) {
	      	return {
	        	dayCode: i,
	        	name: d
	      	};
	    });
	}
};

_.each(App.helpers, function (helper, key) {
  	Handlebars.registerHelper(key, helper);
});
