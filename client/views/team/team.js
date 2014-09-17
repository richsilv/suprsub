/*****************************************************************************/
/* Team: Event Handlers and Helpers */
/*****************************************************************************/
Template.teamName.events({

  'keyup #teamName': function(event) {
    formData.currentTeam.setKey('name', event.currentTarget.value)
  }

});

Template.teamName.helpers({

  teamDropdown: function() {
    return !formData.teamInput.get();
  },

  teamName: function() {
    return formData.currentTeam.get().name;
  },

  teams: function() {
    return formData.teamsArray.get();
  }

});

Template.teamSettings.events({
  /*
   * Example: 
   *  'click .selector': function (e, tmpl) {
   *
   *  }
   */

  'change #timePickerHour': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setHours(event.currentTarget.valueAsNumber);
    formData.currentTeam.setKey('time', newTime);
  },

  'change #timePickerMinute': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setMinutes(event.currentTarget.valueAsNumber);
    formData.currentTeam.setKey('time', newTime);
  }

});

Template.teamSettings.helpers({
  /*
   * Example: 
   *  items: function () {
   *    return Items.find();
   *  }
   */

   hour: function() {

      var team = formData.currentTeam.get();  
      return team && App.padZeros(team.time.getHours(), 2);

   },

   minute: function() {

      var team = formData.currentTeam.get();
      return team && App.padZeros(team.time.getMinutes(), 2);

   }

});

Template.teamButtons.helpers({

  newTeam: function() {
    return formData.currentTeam.get().newTeam;
  }

});

/*****************************************************************************/
/* Team: Lifecycle Hooks */
/*****************************************************************************/

Template.Team.created = function () {
};

Template.Team.rendered = function () {

  var _this = this,
      currentTeam = formData.currentTeam;

  // SET UP FLIPBOX AND DROPDOWNS  
  this.$('.ui.flipbox').flipbox();
  this.$('.ui.dropdown').dropdown();

  this.$('#friendlyCompetitive').flipbox({
    onChange: function(val) {
      currentTeam.setKey('competitive', val);
    }
  });

  this.$('#gameFormat').dropdown({
    onChange: function(val) {
      currentTeam.setKey('format', val);
    }
  });

  this.$('#dayChoiceSection>.ui.dropdown').dropdown({
    onChange: function(val) {
      var newTime = currentTeam.getKey('time');
      newTime.setDate(val + 1);
      currentTeam.setKey('time', newTime);
    }
  });

  // UPDATE FIELDS ON CHANGE OF DATA
  this.autorun(function(c) {
    _this.$('#friendlyCompetitive').flipbox('set choice', currentTeam.getKey('competitive'));
  });

  this.autorun(function(c) {
    var format = currentTeam.getKey('format');

    if (format) {
      _this.$('#gameFormat').dropdown('set value', format);
      _this.$('#gameFormat').dropdown('set selected', format);
    }
  });

  this.autorun(function(c) {
    var time = currentTeam.getKey('time');

    if (time) {
      _this.$('#dayChoiceSection>.ui.dropdown').dropdown('set value', time.getDay() - 1);
      _this.$('#dayChoiceSection>.ui.dropdown').dropdown('set selected', time.getDay() - 1);
    }
  });

};

Template.Team.destroyed = function () {

  this.$('.ui.flipbox').flipbox('destroy');
  this.$('.ui.dropdown').dropdown('destroy');  

};

/*****************************************************************************/
/* Team: Data Binding */
/*****************************************************************************/

Meteor.startup(function() {
  /*var*/ formData = {
    teamsArray: new SuprSubDep(),
    currentTeam: defaultTeam(),
    teamIndex: new SuprSubDep(),
    teamInput: new SuprSubDep()
  }

  Tracker.autorun(function(c) {
    var user = Meteor.user();

    if (user) {

      var teams = Teams.myTeams();
      formData.teamsArray.set(teams);
      if (!formData.teamIndex.get() || formData.teamIndex.get() >  teams.length -1) formData.teamIndex.set(0);
      if (teams.length) formData.currentTeam.set(teams[formData.teamIndex.get()]);
      if (teams.length < 2) formData.teamInput.set(true);

    }
  });

});

function defaultTeam() {
  return new SuprSubDep({
    time: new Date(0, 0, 1, 19, 0, 0),
    name: '',
    homeGround: '',
    format: '5',
    ringerCode: Random.id(),
    competitive: '0',
    newTeam: true
  });
}