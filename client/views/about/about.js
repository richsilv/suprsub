var sectionInfo;
App.tabChoices.value.aboutTab = 'aboutSuprSub';

Template.About.created = function() {
  if (!App.mediumScreen.get()) {
    window.onscroll = function(event) {
      $('#instructionsMenu').css('top', window.scrollY + 'px');
      sectionInfo.forEach(function(s) {
        if (s.y - 100 < window.scrollY)
          App.tabChoices.setKey('aboutTab', s.id);
      });
      if (window.scrollY > $(document).height() - window.innerHeight - 20) {
        App.tabChoices.setKey('aboutTab', sectionInfo[sectionInfo.length - 1].id);
      }
    }
  }
};

Template.About.destroyed = function() {
  window.onscroll = null;
};

Template.About.rendered = function() {
  if (!this.runOnce) {
    var sections = $('.menuItem');
    sectionInfo = _.reduce(sections, function(t, x) {t.push({id: x.id.substr(0, x.id.length - 7), y: x.offsetTop}); return t;}, []).sort(function(a, b) {return a.y - b.y;});
    this.runOnce = true;
  }
};

// *************************

Template.aboutMenu.events({
  'click .vertical.menu>.item>a': function(event) {
    App.tabChoices.setKey('aboutTab', event.target.parentNode.id);
    window.scrollTo(0, $(event.target.hash)[0].offsetTop);
  }
});