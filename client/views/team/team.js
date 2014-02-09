var tabChoices = new suprsubDep({
      newVenue: false,
      venueSearch: false
    });

// **************************

Handlebars.registerHelper("tabChoices", function(key) {
  return tabChoices.getKey(key);
});

Handlebars.registerHelper("teamId", function() {
  return Router.current().route.currentTeamId.get();
});

// **************************

Template.teamName.helpers({
  dropdownTeams: function() {
    return (Router.current().route.teamIds.length > 1 &&
     !!Router.current().route.currentTeamId.get() &&
     !this.nameEntryOverride.get());
  },
  teams: function() {
    return Teams.find();
  }
});

Template.teamName.events({
  'click #teamChoice .text': function() {
    if ($('#teamChoice').dropdown('is visible') === true) {
      this.nameEntryOverride.set(true);
      var myFunc = function() {
        var teamData = Teams.findOne(Router.current().route.currentTeamId.get());
        $('#teamName').val(teamData.name);
        $('#teamName').focus();
      }
//      renderOnce('teamName', myFunc);  
    }
  },
  'keyup input, click div': function() {
    appVars.saveCalc.changed();
  }
});

Template.teamName.rendered = function() {
    if (!this.renderedOnce) {
      teamNameDropdownInit();
      this.renderedOnce = true;
    }
};

Template.teamName.created = function() {
  this.data.nameEntryOverride = new suprsubDep(false);
};

// **************************

Template.teamButtons.events({
  'click #addNewTeam': function() {
    if (Router.current().route.currentTeamId.get())
      Router.current().route.currentTeamId.set(null);
      Spark.getDataContext(document.querySelector('#teamNameHolder')).nameEntryOverride.dep.changed();
    setTeamData();
  },
  'click #deleteTeam': function() {
    if (Router.current().route.currentTeamId.get()) {
      Meteor.call('deleteTeam', Router.current().route.currentTeamId.get(), function(err, res) {
        if (!err) Router.current().route.teamIds = Meteor.user().profile.team._ids;
      });
      Router.current().route.currentTeamId.set(null);
      setTeamData();
    }
  }
});

// **************************

Template.playerTable.helpers({
  tableHeader: function() {
    if (tabChoices.getKey('membersRingers'))
      return "Team Members";
    else
      return "Preferred Suprsubs";
  },
  tableInfo: function() {
    Meteor.call('getTeamMembers', Router.current().route.currentTeamId.get(), function(err, res) {
      if (err)
        console.log(err);
      else
        return res;
    });
  }
});

// **************************

Template.teamSettings.helpers({
  days: function() {
    return appVars.days;
  }
});

Template.teamSettings.events({
  'click #homeGround': function() {
    window.scrollTo(window.scrollX, window.scrollY + 275);
    $('#otherInfo').show({
      duration: 500, 
      complete: function() {
        tabChoices.setKey('venueSearch', true);
        pitchMap.setCenter(appVars.mapCenter.get());
      }
    });
    google.maps.event.trigger(pitchMap, 'resize');
  },
  'click .checkbox, click .dropdown': function(event) {
    appVars.saveCalc.changed();
  },
  'keydown #timeSection input[type="number"]': function(event) {
    if (event.keyCode > 57) return false;
  },
  'submit #teamForm': saveTeamData
});

Template.teamSettings.rendered = function() {
  if (!this.renderedOnce) {
    $(this.findAll('.ui.neutral.checkbox')).checkbox({verbose: false, debug: false, performance: false});
    $(this.find('#regDayCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularDayCheckboxEnable, onDisable: regularDayCheckboxDisable});
    $(this.find('#timeCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularTimeCheckboxEnable, onDisable: regularTimeCheckboxDisable});
    this.renderedOnce = true;
  }
  $(this.findAll('.ui.dropdown:not(#teamChoice)')).dropdown({verbose: false, debug: false, performance: false});
  clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
  setTeamData();
  teamNameDropdownInit();
  if (Router.current().route.currentTeamId.get()) {
    $('#teamChoice').dropdown('set selected', Router.current().route.currentTeamId.get());
    var teamData = Teams.findOne(Router.current().route.currentTeamId.get());
    $('#teamName').val(teamData.name);
    $('#teamName').focus();
  }
};

// **************************

Template.mainButtons.helpers({
  disableSave: function() {
    if ('disableSave' in this) return this.disableSave.get();
    return true;
  }
});

Template.mainButtons.events({
  'click #resetButton': function() {
    var teamNameHolder = document.querySelector('#teamNameHolder');
    Spark.getDataContext(teamNameHolder).nameEntryOverride.set(false);
  },
  'click #saveButton': saveTeamData
});

Template.mainButtons.created = function() {
  this.data.disableSave = new suprsubDep(true);
};

// **************************

Template.otherInfo.events({
  'keyup #homeGroundSearch': function(event, template) {
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      if (Pitches.findOne({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"})) {
        var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
        var pitchElement = '<div class="ui segment content"><div class="field"><div class="ui link list">';
        pitchCursor.forEach(function(pitch) {pitchElement += '<a class="pitchEntry item" id="' + pitch._id + '">' + pitch.owner + ' - ' + pitch.name + '</a>';});
        $('#matches').html(pitchElement + '</div></div></div>');
      }
   }
  },
  'click #mapSearchButton, submit form': function(event, template) {
    appVars.gc.geocode({
      address: $('#homeGroundSearch').val(),
      region: 'uk'
      },
      function(res) {
        if (res.length) pitchMap.panTo(res[0].geometry.location);
      }
    );
    return false;
  },
  'click .pitchEntry': function(event) {
    var pitch = Pitches.findOne({'_id': event.target.id});
    if (pitch) {
      pitchMap.panTo(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
      $('#homeGround input').val(pitch.owner + ' - ' + pitch.name);
      $('#homeGround input').attr('id', pitch._id);
      location.href = "#homeGround";
      window.scrollTo(window.scrollX, Math.max(window.scrollY - 100, 0));
      appVars.saveCalc.changed();
    }
  },
  'click #addVenue': function() {
    tabChoices.setKey('newVenue', true);
  }
});
Template.otherInfo.rendered = function() {
  if (window.innerWidth > 640  && !tabChoices.getKey('venueSearch')) $('#otherInfo').hide();
};

// **************************

Template.playerButtons.events({
  'click #toggleTeammates': function() {
    tabChoices.setKey('membersRingers', true);
  },
  'click #toggleRingers': function() {
    tabChoices.setKey('membersRingers', false);
  },
  'click #joinTeam': function() {
    templateAttach('joinTeamModal', function() {
      $('#joinTeamModal').modal('setting', {
          onHide: function() {
            $('#joinTeamModal').remove();
          },
        });
    });
  },
  'click #sendInvitation': function() {
    if (Router.current().route.currentTeamId.get()) {
      Meteor.call('sendSecureCode', Router.current().route.currentTeamId.get(), function(err) {
        if (!err)
          templateAttach('invitationModal', function() {
            $('#invitationModal').modal('setting', {
              onHide: function() {
                $('#invitationModal').remove();
              },
            });
          });
      });
    }
  }
});

// **************************

Template.pitchMapSmall.created = function() {
  window.circleSize = null;
  window.venues = null;
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      clientFunctions.loadGoogleMaps(false);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

// **************************

Template.newVenueBox.events({
  'click #cancelVenue': function() {
    tabChoices.setKey('newVenue', false);
  },
  'click #submitVenue': function() {
    var locationName = $('#locationName').val(),
        locationAddress = $('#locationAddress').val();
    if (locationName && locationAddress && !NewVenues.findOne({name: locationName, address: locationAddress})) {
      NewVenues.insert({name: locationName, address: locationAddress});
      var newdiv = DIV({cls: "ui purple label"}, ["Your location has been added to the approval queue!"]);
      $('#newVenueBox .ui.grid .column')[0].appendChild(newdiv);
      Meteor.setTimeout(function() {tabChoices.setKey('newVenue', false);}, 2000);
    }
  }
});

// **************************

Template.invitationModal.rendered = function() {
  $('#invitationModal').modal('show'); 
};

// **************************

Template.joinTeamModal.rendered = function() {
  $('#joinTeamModal').modal('show'); 
};

// ***************** DEPS *************************

Deps.autorun(function() {
  appVars.saveCalc.depend();
  var homeGroundId = $('#homeGround>input').attr('id'),
      teamName = $('#teamName') ? $('#teamName').val() : $('#teamChoice').dropdown('get text'),
      node = document.querySelector('#cancelOrSave');
  if (node) {
    if (!(homeGroundId && teamName)) Spark.getDataContext(node).disableSave.set(true);
    else {
      Spark.getDataContext(node).disableSave.set(false);
    }
  }
});

// ***************** HELPER FUNCTIONS **********************


function regularDayCheckboxEnable() {
  if ($('#regDayCheckbox').css('opacity') === '1')
    $('#dayChoiceSection, #timeCheckbox').css({ opacity: 1 });
  else
    $('#regDayCheckbox').checkbox('disable');
};
function regularDayCheckboxDisable() {
  $('#dayChoiceSection, #timeCheckbox, #timeSection').css({ opacity: 0.1 });
  $('#timeCheckbox').checkbox('disable');
};

function regularTimeCheckboxEnable() {
  if ($('#timeCheckbox').css('opacity') === '1')
    $('#timeSection').css({ opacity: 1 });
  else $('#timeCheckbox').checkbox('disable');
};
function regularTimeCheckboxDisable() {
  if ($('#timeCheckbox').css('opacity') === '1')  
    $('#timeSection').css({ opacity: 0.1 });
};

function teamNameDropdownInit() {
  $('#teamChoice').dropdown({
    verbose: false, debug: false, performance: false,
    onChange: function(value, text) {
      Router.current().route.currentTeamId.set(value);
      setTeamData();
      Spark.getDataContext(document.querySelector('#cancelOrSave')).disableSave.set(true);
    }
  });
  $('#teamChoice').dropdown('set selected', Router.current().route.currentTeamId.get());
}

function setTeamData() {
  if (Router.current().route.currentTeamId.get()) {
    var teamData = Teams.findOne(Router.current().route.currentTeamId.get());
    $('#teamName').val(teamData.name);
    $('#homeGround>input').attr('id', teamData.homeGround);
    var ground = Pitches.findOne({'_id': teamData.homeGround});
    if (ground) {
      $('#homeGround>input').val(ground.owner + ' ' + ground.name);
      var googleCallback = Meteor.setInterval(function() {
        if (typeof google !== 'undefined' && pitchMap && 'panTo' in pitchMap) {
          pitchMap.panTo(new google.maps.LatLng(ground.location.lat, ground.location.lng));
          Meteor.clearInterval(googleCallback);
        }
      }, 200);
      Meteor.setTimeout(function(){
        Meteor.clearInterval(googleCallback);
      }, 5000);
    }
    if (teamData.regular) {
      $('#regDayCheckbox').checkbox('enable');
      $('#dayChoiceSection>.ui.dropdown').dropdown('set selected', teamData.day ? teamData.day : 0);
      $('#dayChoiceSection, #timeCheckbox').css({opacity: 1});
      if (teamData.sameTime) {
        $('#timeCheckbox').checkbox('enable');
        $('#timePickerHour').val(teamData.time.getHours());
        $('#timePickerMinute').val(teamData.time.getMinutes());
        $('#timeSection').css({opacity: 1});
      }
      else {
        $('#timeCheckbox').checkbox('disable');
        $('#timeSection').css({opacity: 0.1});
      }
    }
    else $('#dayChoiceSection, #timeCheckbox, #timeSection').css({opacity: 0.1});
    return true;
  }
  else {
    $('#teamName').val('');
    $('#homeGround>input').attr('id', '');
    $('#homeGround>input').val('');
    $('#dayChoiceSection>.ui.dropdown').dropdown('set selected', 0);
    $('timePickerHour').val(19);
    $('timePickerMinute').val(0);
    $('#dayChoiceSection, #timeCheckbox, #timeSection').css({opacity: 0.1});
    $('#regDayCheckbox').checkbox('disable');
    $('#timeCheckbox').checkbox('disable');
  }
  return false;
};

function glowCallback(event, err) {
  if (!err) {
    var icon = $(event.target);
    if (icon.prop("tagName") != "I") icon = icon.children('i');
    icon.removeClass("save").addClass("checkmark fontGlow");
    Meteor.setTimeout(function() {
      icon.addClass("save").removeClass("checkmark fontGlow");
    }, 1000);
  }
  else console.log(err);
};

function saveTeamData(event) {
  var homeGroundId = $('#homeGround>input').attr('id'),
      teamProfile,
      thisGlowCallback = glowCallback.bind(undefined, event);
  if (!homeGroundId) return false;
  teamProfile = {
      name: $('#teamName').val(),
      homeGround: homeGroundId,
      regular: document.getElementById('weekly').checked
  };
  if (teamProfile.regular) {
    teamProfile.day = parseInt($('#dayChoiceSection .ui.dropdown').dropdown('get value'), 10);
    teamProfile.sameTime = document.getElementById('sameTime').checked;
    if (teamProfile.sameTime) teamProfile.time = new Date(0, 0, 0, parseInt(document.getElementById('timePickerHour').value, 10), parseInt(document.getElementById('timePickerMinute').value, 10));
  }
  var teamId, currentTeamId = Router.current().route.currentTeamId.get();
  if (currentTeamId)
    Teams.update(currentTeamId, {$set: teamProfile}, thisGlowCallback);
  else {
    var newTeamId = Teams.insert(teamProfile);
    Meteor.users.update(Meteor.userId(), {$push: {'profile.team._ids': newTeamId}}, thisGlowCallback); 
  }
  var teamNameHolder = document.querySelector('#teamNameHolder');
  Spark.getDataContext(teamNameHolder).nameEntryOverride.set(false);
  return false;
};