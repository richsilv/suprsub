var tabChoices = new suprsubDep({
      newVenue: false,
      venueSearch: false,
      membersRingers: true
    });
    ringerList = new suprsubDep([]);
    memberList = new suprsubDep([]);
    memberRefresh = new Deps.Dependency();

// **************************

Handlebars.registerHelper("tabChoices", function(key) {
  return tabChoices.getKey(key);
});

Handlebars.registerHelper("teamId", function() {
  return Router.current().route.currentTeamId.get();
});

Handlebars.registerHelper("codeEntered", function() {
  if (Router.current().route.codeEntered && Router.current().route.codeEntered.ready()) {
    return Router.current().route.codeEntered.info().code || null;
  }
});

// **************************

Template.teamInfo.events({
   'submit form': function() {
    Deps.flush();
    if (!Spark.getDataContext(document.querySelector('#cancelOrSave')).disableSave.get()) {
      saveTeamData({target: '#saveButton'});
      renderOnce('teamName', function() {
        $('#teamChoice').dropdown('set selected', Router.current().route.currentTeamId.get());
      });
    }
    return false;
  } 
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
      };
      renderOnce('teamName', myFunc);  
    }
  },
  'keyup input, click div': function() {
    appVars.saveCalc.changed();
  }
});

Template.teamName.rendered = function() {
    // console.log("rerendering...");
    if (!this.data.renderedOnce || !this.data.renderedOnce.get()) {
      teamNameDropdownInit();
      if (!this.data.renderedOnce) {
        // this.data.renderedOnce = new suprsubDep(true);
      }
      else
        this.data.renderedOnce.set(true);
    }
};

Template.teamName.created = function() {
  this.data.nameEntryOverride = new suprsubDep(false);
};

// **************************

Template.teamButtons.helpers({
  'defaultTeam': function() {
    Router.current().route.currentTeamId.dep.depend();
    return Router.current().route.teamIds.indexOf(Router.current().route.currentTeamId.get()) === 0;  
  },
  'multiTeams': function() {
    return Router.current().route.teamIds.length > 1;
  }
});

function defaultTeamFunction() {
    if (Router.current().route.currentTeamId.get()) {
      var teamIds = Router.current().route.teamIds,
          currentTeamId = Router.current().route.currentTeamId.get(),
          i = teamIds.indexOf(currentTeamId);
      if (i < 1)
        return false;
      var newArray = [currentTeamId].concat(teamIds.slice(0, i)).concat(teamIds.slice(i + 1));
      Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.team._ids': newArray}});
      Router.current().route.teamIds = newArray;
      Router.current().route.currentTeamId.dep.changed();
    }
}
function addTeamFunction() {
    if (Router.current().route.currentTeamId.get())
      Router.current().route.currentTeamId.set(null);
      Spark.getDataContext(document.querySelector('#teamNameHolder')).nameEntryOverride.dep.changed();
    // setTeamData();
}
function leaveTeamFunction() {
    if (Router.current().route.currentTeamId.get()) {
      var newArray = _.without(Meteor.user().profile.team._ids, Router.current().route.currentTeamId.get()); 
      Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.team._ids': newArray}});
      Router.current().route.currentTeamId.set(newArray.length ? newArray[0] : null);
      Subs.teams.stop();
      Subs.teams = Meteor.subscribe('teams');
      // setTeamData();
    }
}
function deleteTeamFunction() {
    var deleteTeamId = Router.current().route.currentTeamId.get(),
        teamIds = Router.current().route.teamIds;
    if (deleteTeamId) {
      // console.log("deleting...");
      Teams.remove({_id: deleteTeamId});
      teamIds = _.without(teamIds, deleteTeamId);
      Meteor.users.update(Meteor.userId(), {$set: {'profile.team._ids': teamIds}});
      Meteor.call('deleteTeam', deleteTeamId);
      Router.current().route.currentTeamId.set(teamIds.length ? teamIds[0] : null);
      // setTeamData();
    }
}

Template.teamButtons.events({
  'click #setDefault': function(event) {
    // console.log(event);
    if (!($(event.target).hasClass('disabled')))
      confirmModal("<p>Are you sure you want to make this your <strong>default</strong> team?</p>" +
        "<p>All future postings will be made on behalf of this team.</p>", defaultTeamFunction);
  },
  'click #addNewTeam': function(event) {
    if (!($(event.target).hasClass('disabled')))
      confirmModal("<p>Do you want to <strong>create</strong> a new team?</p>", addTeamFunction);
  },
  'click #leaveTeam': function(event) {
    if (!($(event.target).hasClass('disabled')))
      confirmModal("<p>Do you want to <strong>leave</strong> this team?</p><p>Other members of the team will be unaffected, but " +
        "you will no longer be able to view or alter the team settings.", leaveTeamFunction);
  },  
  'click #deleteTeam': function(event) {
    if (!($(event.target).hasClass('disabled')))
      confirmModal("<p>Are you sure you want to delete this team? The team will be removed for <strong>all</strong> " +
        "team members.</p><p>Use the minus icon if you just want to leave the team.</p>", deleteTeamFunction);
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
    if (tabChoices.getKey('membersRingers')) {
      return memberList.get();
    }
    else {
      return ringerList.get();
    }
  }
});
Template.playerTable.rendered = function() {
  if (Router.current() && Router.current().route.currentTeamId && !this.membersRefreshed) {
    this.membersRefreshed = true;
    memberRefresh.changed();
  }
};

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
  'submit .teamForm': saveTeamData
});

Template.teamSettings.rendered = function() {
  // console.log(this.data.renderedOnce, this.data.renderedOnce ? this.data.renderedOnce.get() : null);
  if (!this.data.renderedOnce || !this.data.renderedOnce.get()) {
    $(this.findAll('.ui.neutral.checkbox')).checkbox({verbose: false, debug: false, performance: false});
    $(this.find('#regDayCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularDayCheckboxEnable, onDisable: regularDayCheckboxDisable});
    $(this.find('#timeCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularTimeCheckboxEnable, onDisable: regularTimeCheckboxDisable});
    if (!this.data.renderedOnce)
      this.data.renderedOnce = new suprsubDep(true);
    else
      this.data.renderedOnce.set(true);
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

Template.teamSettings.created = function() {
  this.autoRun = Deps.autorun(function() {
    Router.current().route.currentTeamId.dep.depend();
    setTeamData();
  });
};

Template.teamSettings.destroyed = function() {
  console.log("destroyed");
  this.autoRun.stop();
}

// **************************

Template.teamMainButtons.helpers({
  disableSave: function() {
    if ('disableSave' in this) return this.disableSave.get();
    return true;
  }
});

Template.teamMainButtons.events({
  'click #resetButton': function() {
    var teamNameHolder = document.querySelector('#teamNameHolder');
    Spark.getDataContext(teamNameHolder).nameEntryOverride.set(false);
  },
  'click #saveButton': saveTeamData
});

Template.teamMainButtons.created = function() {
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
            var joinCode = $('#teamCodeEntry').val();
            $('.ui.dimmer.page').remove();
            Router.current().route.codeEntered = clientFunctions.joinTeam(joinCode);            
          },
        });
    });
  },
  'click #sendInvitation': function() {
    if (Router.current().route.currentTeamId.get()) {
      templateAttach('chooseCodeTypeModal', function() {
        $('#chooseCodeTypeModal').modal('setting', {
          onHide: function() {
            $('.ui.dimmer.page').remove();
          },
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

Template.chooseCodeTypeModal.events({
  'click #inviteTeammates': function() {
    Meteor.setTimeout(function() {
      $('#chooseCodeTypeModal').modal('hide');
      Meteor.call('sendTeamCode', Router.current().route.currentTeamId.get(), function(err) {
        if (!err)
          templateAttach('teammateInvitationModal', function() {
            $('#teammateInvitationModal').modal('setting', {
              onHide: function() {
                $('.ui.dimmer.page').remove();
              },
            });
          });
      });
    }, 250);
  },
  'click #inviteSuprsubs': function() {
    Meteor.setTimeout(function() {
      var thisTeam = Teams.findOne(Router.current().route.currentTeamId.get());
      $('#chooseCodeTypeModal').modal('hide');
      Meteor.call('sendRingerCode', thisTeam.ringerCode, Meteor.user().name, function(err) {
        if (!err)
          templateAttach('suprsubInvitationModal', function() {
            $('#suprsubInvitationModal').modal('setting', {
              onHide: function() {
                $('.ui.dimmer.page').remove();
              },
            });
          });
      });
    }, 250);
  }  
});

Template.chooseCodeTypeModal.rendered = function() {
  $('#chooseCodeTypeModal').modal('show'); 
};

// **************************

Template.teammateInvitationModal.rendered = function() {
  $('#teammateInvitationModal').modal('show'); 
};

// **************************

Template.suprsubInvitationModal.rendered = function() {
  $('#suprsubInvitationModal').modal('show'); 
};

// **************************

Template.joinTeamModal.rendered = function() {
  $('#joinTeamModal').modal('show'); 
};

// **************************

Template.codeModal.helpers({
  header: function() {
    return ['', 'Suprsub Registered', 'Team Joined', 'Code not recognised'][Router.current().route.codeEntered.info().code];
  },
  content: function() {
    var contentBase = [
      '',
      "Congratulations, you're now registered as a preferred Suprsub for *****!",
      "Congratulations, you've just joined a new team - *****!  You should see them in the drop-down menu under <strong>Team Name</strong>.",
      "Sorry, but we don't recognise the code you've entered."
    ][Router.current().route.codeEntered.info().code];
    return contentBase.replace("*****", Router.current().route.codeEntered.info().teamName);
  }
});
Template.codeModal.rendered = function() {
  $('#codeModal').modal({
    onHide: function() {
      $('.ui.dimmer.page').remove();
      delete Router.current().route.codeEntered;
    }
  }).modal('show');
};

// ***************** DEPS *************************

Deps.autorun(function() {
  appVars.saveCalc.depend();
  var homeGroundId = $('#homeGround>input').attr('id'),
      teamName = $('#teamName').length ? $('#teamName').val() : $('#teamChoice').dropdown('get text'),
      node = document.querySelector('#cancelOrSave');
  if (node) {
    if (!(homeGroundId && teamName)) Spark.getDataContext(node).disableSave.set(true);
    else {
      Spark.getDataContext(node).disableSave.set(false);
    }
  }
});

Deps.autorun(function() {
  memberRefresh.depend();
  if (Router.current() && Router.current().route.currentTeamId) {
    Meteor.call('getTeamMembers', Router.current().route.currentTeamId.get(), function(err, res) {
      if (err)
        console.log(err);
      else
        memberList.set(res);
    });
    Meteor.call('getRingers', Router.current().route.currentTeamId.get(), function(err, res) {
      if (err)
        console.log(err);
      else
        ringerList.set(res);
    });
  }
});

// ***************** HELPER FUNCTIONS **********************


regularDayCheckboxEnable = function() {
  if ($('#regDayCheckbox').css('opacity') === '1')
    $('#dayChoiceSection, #timeCheckbox').css({ opacity: 1 });
  else
    $('#regDayCheckbox').checkbox('disable');
}
regularDayCheckboxDisable = function() {
  $('#dayChoiceSection, #timeCheckbox, #timeSection').css({ opacity: 0.1 });
  $('#timeCheckbox').checkbox('disable');
}

regularTimeCheckboxEnable = function() {
  if ($('#timeCheckbox').css('opacity') === '1')
    $('#timeSection').css({ opacity: 1 });
  else $('#timeCheckbox').checkbox('disable');
}
regularTimeCheckboxDisable = function() {
  if ($('#timeCheckbox').css('opacity') === '1')  
    $('#timeSection').css({ opacity: 0.1 });
}

function teamNameDropdownInit() {
  $('#teamChoice').dropdown({
    verbose: false, debug: false, performance: false,
    onChange: function(value, text) {
      Router.current().route.currentTeamId.set(value);
      // setTeamData();
      Spark.getDataContext(document.querySelector('#cancelOrSave')).disableSave.set(true);
    }
  });
  $('#teamChoice').dropdown('set selected', Router.current().route.currentTeamId.get());
}

function setTeamData(teamData) {
  if (teamData || (Router.current().route.currentTeamId.get() && Subs.teams.ready())) {
    // console.log(teamData, Router.current().route.currentTeamId.get(), Teams.findOne(Router.current().route.currentTeamId.get()), teamData ? true : false)
    teamData = teamData ? teamData : Teams.findOne(Router.current().route.currentTeamId.get());
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
    if (teamData.type)
      $('#friendlyCompetitive').checkbox('enable');
    else
      $('#friendlyCompetitive').checkbox('disable');
    $('#gameFormat').dropdown('set value', teamData.format);
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
    else {
      $('#dayChoiceSection, #timeCheckbox, #timeSection').css({opacity: 0.1});
      $('#regDayCheckbox').checkbox('disable');
    }
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
}

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
}

function saveTeamData(event) {
  var homeGroundId = $('#homeGround>input').attr('id'),
      teamProfile,
      thisGlowCallback = glowCallback.bind(undefined, event),
      format = $('#gameFormat').dropdown('get value');
  if (!homeGroundId) return false;
  teamProfile = {
      name: $('#teamName').val(),
      homeGround: homeGroundId,
      regular: $('#weekly')[0].checked,
      type: $('#friendlyCompetitive input')[0].checked,
      format: (typeof format === "string" ? format : "5"),
      ringerCode: Meteor.uuid()
  };
  if (teamProfile.regular) {
    teamProfile.day = parseInt($('#dayChoiceSection .ui.dropdown').dropdown('get value'), 10);
    teamProfile.day = teamProfile.day ? teamProfile.day : 0;
    teamProfile.sameTime = $('#sameTime')[0].checked;
    if (teamProfile.sameTime) teamProfile.time = new Date(0, 0, 0, parseInt(document.getElementById('timePickerHour').value, 10), parseInt(document.getElementById('timePickerMinute').value, 10));
  }
  var teamId, currentTeamId = Router.current().route.currentTeamId.get();
  if (currentTeamId)
    Teams.update(currentTeamId, {$set: teamProfile}, thisGlowCallback);
  else {
    // console.log(teamProfile);
    var newTeamId = Teams.insert(teamProfile);
    if (Meteor.user().profile.team._ids.indexOf(newTeamId) < 0) {
      Router.current().route.teamIds.push(newTeamId);
      Router.current().route.currentTeamId.set(newTeamId);
      Meteor.users.update(Meteor.userId(), {
        $push: {'profile.team._ids': newTeamId}
      }, function() {
        thisGlowCallback.apply(this);
        Subs.teams.stop();
        Subs.teams = Meteor.subscribe('teams');
        // Router._controllerDep.changed();
        setTeamData(teamProfile);
      });
    }
    else
      thisGlowCallback();
  }
  var teamNameHolder = document.querySelector('#teamNameHolder');
  Spark.getDataContext(teamNameHolder).nameEntryOverride.set(false);
  return false;
}