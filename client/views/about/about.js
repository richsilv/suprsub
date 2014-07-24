var sectionInfo;
appVars.tabChoices.value.aboutTab = 'aboutSuprSub';

Template.about.created = function() {
	window.onscroll = function(event) {
		sectionInfo.forEach(function(s) {
			if (s.y - 100 < window.scrollY)
				appVars.tabChoices.setKey('aboutTab', s.id);
		});
		if (window.scrollY > $(document).height() - window.innerHeight - 20) {
			console.log(sectionInfo[sectionInfo.length - 1]);
			appVars.tabChoices.setKey('aboutTab', sectionInfo[sectionInfo.length - 1].id);
		}
	}
};

Template.about.destroyed = function() {
	window.onscroll = null;
};

Template.about.rendered = function() {
	if (!this.runOnce) {
		var sections = $('.menuItem');
		sectionInfo = _.reduce(sections, function(t, x) {t.push({id: x.id.substr(0, x.id.length - 7), y: x.offsetTop}); return t;}, []).sort(function(a, b) {return a.y - b.y;});
		console.log(sectionInfo);
		this.runOnce = true;
	}
};

// *************************

Template.aboutMenu.events({
	'click .vertical.menu>.item>a': function(event) {
		console.log($(event.target.hash)[0]);
		appVars.tabChoices.setKey('aboutTab', event.target.parentNode.id);
		window.scrollTo(0, $(event.target.hash)[0].offsetTop);
	}
});