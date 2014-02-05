var tabChoices = new suprsubDep({
  newVenue: false,
  venueSearch: false
});

Handlebars.registerHelper("tabChoices", function(key) {
  return tabChoices.getKey(key);
});

Template.teamSettings.events({
  'keyup input, click div': function() {
    var homeGroundId = $('#homeGround>input').attr('id'),
        teamName = $('#teamName').val(),
        node = document.querySelector('#cancelOrSave');
    if (!(homeGroundId && teamName)) Spark.getDataContext(node).disableSave.set(true);
    else Spark.getDataContext(node).disableSave.set(false);
  }
})

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
  'click #teamSearchButton, submit form': function(event, template) {
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
    }
  },
  'click #addVenue': function() {
    tabChoices.setKey('newVenue', true);
  }
});
Template.otherInfo.rendered = function() {
  if (window.innerWidth > 640  && !tabChoices.getKey('venueSearch')) $('#otherInfo').hide();
};

Template.teamDetails.helpers({
  days: function() {
    return appVars.days;
  },
  disableSave: function() {
    if ('disableSave' in this) return this.disableSave.get();
    return true;
  }
});
Template.teamDetails.events({
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
  'click #weeklyCheckBox .checkbox': function(event) {
  },
  'click #timeCheckBox .checkbox': function(event) {
  },
  'keydown #timeSection input[type="number"]': function(event) {
    if (event.keyCode > 57) return false;
  },
  'click #saveButton': function(event) {
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
    var teamId, currentTeamId = Router.current().route.currentTeamId;
    if (currentTeamId)
      Teams.update(currentTeamId, {$set: teamProfile}, thisGlowCallback);
    else {
      var newTeamId = Teams.insert(teamProfile);
      Meteor.users.update(Meteor.userId(), {$push: {'profile.team._ids': newTeamId}}, thisGlowCallback); 
    }
  },
  'click #resetButton': function() {
    setTeamData();
  }
});
Template.teamDetails.rendered = function() {
  if (!this.renderedOnce) {
    console.log("rendered");
    $(this.findAll('.ui.neutral.checkbox')).checkbox({verbose: false, debug: false, performance: false});
    $(this.find('#regDayCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularDayCheckboxEnable, onDisable: regularDayCheckboxDisable});
    $(this.find('#timeCheckbox')).checkbox({verbose: false, debug: false, performance: false, onEnable: regularTimeCheckboxEnable, onDisable: regularTimeCheckboxDisable});
    $(this.findAll('.ui.dropdown')).dropdown({verbose: false, debug: false, performance: false});
    clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
    setTeamData();
    this.renderedOnce = true;
  }
};
Template.teamDetails.created = function() {
  this.data.disableSave = new suprsubDep(true);
};

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

var regularDayCheckboxEnable = function() {
  $('#dayChoiceSection').css({ opacity: 1 });
  $('#timeCheckbox').css({ opacity: 1 });
};
var regularDayCheckboxDisable = function() {
  $('#sameTime').checkbox('disable');
  $('#dayChoiceSection').css({ opacity: 0.1 });
  $('#timeCheckbox').css({ opacity: 0.1 });  
};


var regularTimeCheckboxEnable = function() {
  $('#timeSection').css({ opacity: 1 });
};
var regularTimeCheckboxDisable = function() {
  $('#timeSection').css({ opacity: 0.1 });
};

var setTeamData = function() {
  if (Router.current().route.currentTeamId) {
    var teamData = Teams.findOne(Router.current().route.currentTeamId);
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
    document.getElementById('weekly').checked = teamData.regular ? true : false;
    if (teamData.regular) {
      $('#dayChoiceSection>.ui.dropdown').dropdown('set value', teamData.day);
      $('#dayChoiceSection>.ui.dropdown').dropdown('set text', appVars.days[teamData.day].name);
      document.getElementById('sameTime').checked = teamData.sameTime ? true : false;
      $('#dayChoiceSection, #timeCheckbox').css({opacity: 1});
      if (teamData.sameTime) {
        document.getElementById('timePickerHour').value = teamData.time.getHours();
        document.getElementById('timePickerMinute').value = teamData.time.getMinutes();
        $('#timeSection').css({opacity: 1});
      }
      else {
        $('#timeSection').css({opacity: 0.1});
      }
    }
    else $('#dayChoiceSection, #timeCheckbox, #timeSection').css({opacity: 0.1});
    return true;
  }
  return false;
};

var glowCallback = function(event, err) {
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
