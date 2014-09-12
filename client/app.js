/*****************************************************************************/
/* Client App Namespace  */
/*****************************************************************************/
_.extend(App, {
	tabChoices: new suprsubDep({playerTab: 'availability'})
});

App.helpers = {
	option: function(option) {
	  	return Router && Router.current(true).path === option;
	},
	tabChoice: function(key, value) {
  		if (this.tabChoices) return this.tabChoices.get()[key] === value;
  		else return false;  
	}
};

_.each(App.helpers, function (helper, key) {
  Handlebars.registerHelper(key, helper);
});
