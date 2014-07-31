var dataChange = new suprsubDep(false),
    disableSave = new suprsubDep(true);
/*    appVars.availabilitySession = new suprsubDep({
      "0/0": false, "0/1": false, "0/2": false, "0/3": false, "0/4": false, "0/5": false, "0/6": false,
      "1/0": false, "1/1": false, "1/2": false, "1/3": false, "1/4": false, "1/5": false, "1/6": false, 
      "2/0": false, "2/1": false, "2/2": false, "2/3": false, "2/4": false, "2/5": false, "2/6": false, 
      });*/

Template.pitchData.helpers({
  getVenues: function() {
    if (appVars.venues && appVars.venues.get()) {
      return _.map(appVars.venues.get(), function(p) {
        return _.pick(p, '_id', 'prettyLocation');
      });
    }
    else return [];
  }
});

Template.pitchData.rendered = function() {
  var widths = $('#pitchTable > thead > tr:first-child') .children().map(function(i, e) {return e.offsetWidth;});
  $('#pitchTable > tbody > tr').each(function(j, f) {
    $(f).children().each(function(i, e) {e.setAttribute("style","width:" + widths[i] + "px !important;");});
  });
};

// **************************

Template.availabilityVenues.helpers({
  "tabChoice": function(key, value) {
    if ('tabChoices' in appVars) return appVars.tabChoices.getKey(key) === value;
    else return false; 
  }
});

Template.availabilityVenues.events({
  'click #tabSpace div a': function(event, target) {
    appVars.tabChoices.setKey('playerTab', event.target.name);
  }
});

// **************************

Template.availabilityDays.events({
  'click input': function(event) {
    appVars.availabilitySession.setKey(event.currentTarget.id, event.currentTarget.checked);
    dataChange.set(true);
    dataChange.dep.changed();
  }
});

// **************************

Template.defineBounds.events({
  'input #distanceWrite': function(event) {
    appVars.circleChanged.set(true);
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    appVars.circleSize.value = parseInt($('#distanceWrite').val(), 10) * 100;
    var self = this;
    this.circleTimeout = Meteor.setTimeout(function() {
          if (appVars.circleSize.value > 20000 && appVars.pitchMap.getZoom() > 9) appVars.pitchMap.setZoom(9);
          if (appVars.circleSize.value > 10000 && appVars.circleSize.value < 20000 && appVars.pitchMap.getZoom() !== 10) appVars.pitchMap.setZoom(10);
          else if (appVars.circleSize.value < 10000 && appVars.pitchMap.getZoom() < 11) appVars.pitchMap.setZoom(11);
          appVars.circleChanged.set(true);
          appVars.circleSize.dep.changed();
          appVars.venues.dep.changed();
          Meteor.clearTimeout(self.circleTimeout);
          self.circleTimeout = null;
          }, 500);
    clientFunctions.updateCircle();
    appVars.tabChoices.setKey('playerTab', 'pitchData');
    // Deps.flush();
  }
});

Template.defineBounds.rendered = function() {
  $('#distanceWrite').val(appVars.circleSize.get()/100);
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10)/10 + 'km');
  var newWidth = (window.innerWidth < 641) ? window.innerWidth : parseInt($('#areaDetails').css('width'), 10) * 0.7;
  $('#pitchMap').css('width', newWidth);
  $('#pitchMap').css('margin-left', -newWidth/2);
};

// **************************

Template.playerAreaButtons.helpers({
  unmoved: function() {
    return !appVars.circleChanged.get();
  }
});

// **************************

Template.playerForm.helpers({
  first_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.first_name : null;
  },
  last_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.last_name : null;
  },
  "dropdowns": function() {
    return {
      ageBands: [
        {code: 0, label: '16-18'},
        {code: 1, label: '18-25'},
        {code: 2, label: '25-35'},
        {code: 3, label: '35-45'},
        {code: 4, label: '45+'}
      ],
      positions: [
        {code: 0, label: 'Goalkeeper'},
        {code: 1, label: 'Defender'},
        {code: 2, label: 'Midfield'},
        {code: 3, label: 'Forward'},
        {code: 4, label: 'Any Outfield'},
        {code: 5, label: 'Any'},        
      ],
      footedness: [
        {code: 0, label: 'Right'},
        {code: 1, label: 'Left'},
        {code: 2, label: 'Both'},
      ],
      ability: [
        {code: 0, label: 'Beginner'},
        {code: 1, label: 'OK'},
        {code: 2, label: 'Good'},
        {code: 3, label: 'Very Good'},
        {code: 4, label: 'Excellent'},
      ]
    }
  }
});

Template.playerForm.events({
/*  'click #saveButton': function(event) {
    var availability = {},
        tableElements = $('#availabilityTable input');
    for (var i = 0, l = tableElements.length; i < l; i++) {
      if (tableElements[i].checked) availability[tableElements[i].id] = true;
    }
    var update = {'profile.first_name': $('#firstname input').val(), 
                  'profile.last_name': $('#surname input').val()};
    if (appVars.tabChoices.value.playerTab === 'availability') update['profile.player.availability'] = availability;
    Meteor.users.update(Meteor.userId(), {$set: update}, function(err) {
      if (!err) {
        var icon = $(event.target);
        if (icon.prop("tagName") != "I") icon = icon.children('i');
        icon.removeClass("save").addClass("checkmark fontGlow");
        icon.parents('#saveButton').addClass('boxGlow');
        Meteor.setTimeout(function() {
          icon.addClass("save").removeClass("checkmark fontGlow")
          icon.parents('#saveButton').removeClass('boxGlow');
        }, 1000)
      }
    });
  },*/
  'keyup #firstname input, keyup #surname input': function() {
    dataChange.set(true);
    dataChange.dep.changed();
  }
});

// ******************************

Template.playerDropdowns.helpers({
  'fieldCheck': function(id) {
    if (!appVars.showErrors.get()) return;
    var dropdown = $('#' + id);
    if (!dropdown || dropdown.dropdown('get value')) return;
    return "error";
  }
});

Template.playerDropdowns.events({
  'click': function() {
    appVars.showErrors.dep.changed();
  }
})

Template.playerDropdowns.rendered = function() {
  var thisUser = Meteor.user();
  $(this.findAll('.ui.checkbox')).checkbox({verbose: false, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: false, debug: false, performance: false, onChange: function() {
    dataChange.set(true);
    dataChange.dep.changed();
  }});
  if (thisUser && thisUser.profile && thisUser.profile.player) {
    if ('age' in thisUser.profile.player) {
      $('#ageDropdown').dropdown('set selected', thisUser.profile.player.age).dropdown('set value', thisUser.profile.player.age);
      $('#ageDropdown').dropdown('set value', thisUser.profile.player.age).dropdown('set value', thisUser.profile.player.age);
    }
    else if (typeof $('#ageDropdown').dropdown('get value') !== 'string')
      $('#ageDropdown').dropdown('restore default text');
    if ('footed' in thisUser.profile.player) {
      $('#footednessDropdown').dropdown('set selected', thisUser.profile.player.footed).dropdown('set value', thisUser.profile.player.footed);
      $('#footednessDropdown').dropdown('set value', thisUser.profile.player.footed).dropdown('set value', thisUser.profile.player.footed);
    }
    else if (typeof $('#footednessDropdown').dropdown('get value') !== 'string')
      $('#footednessDropdown').dropdown('restore default text');
    if ('position' in thisUser.profile.player) {
      $('#positionDropdown').dropdown('set selected', thisUser.profile.player.position).dropdown('set value', thisUser.profile.player.position);
      $('#positionDropdown').dropdown('set value', thisUser.profile.player.position).dropdown('set value', thisUser.profile.player.position);
    }
    else if (typeof $('#positionDropdown').dropdown('get value') !== 'string')
      $('#positionDropdown').dropdown('restore default text');
    if ('ability' in thisUser.profile.player) {
      $('#abilityDropdown').dropdown('set selected', thisUser.profile.player.ability).dropdown('set value', thisUser.profile.player.ability);
      $('#abilityDropdown').dropdown('set value', thisUser.profile.player.ability).dropdown('set value', thisUser.profile.player.ability);
    }
    else if (typeof $('#abilityDropdown').dropdown('get value') !== 'string')
      $('#abilityDropdown').dropdown('restore default text');
  }
};

// **************************

Template.availability.helpers({
  days: function() {
    return appVars.days;
  },
  periods: function() {
    return appVars.periods;
  },
  extendedData: function(periodCode) {
    var avail = appVars.availabilitySession.get(), days = [];
    _.each(avail, function(value, key) {
      if (key.slice(0,1) === periodCode.toString()) days.push({period: key, value: value});
    });
    return {
      days: days
    };
  }
});

// **********************************************

Template.playerMainButtons.helpers({
  disableSave: function() {
    return disableSave.get();
  }
});

Template.playerMainButtons.events({
  'click #resetButton': function() {
    appVars.tabChoices.setKey('playerTab', 'pitchData');
    Deps.flush();
    appVars.circleChanged.set(false);
    var thisUser = Meteor.user();
    if (thisUser && thisUser.profile && thisUser.profile.player) {
      appVars.circleSize.set(thisUser.profile.player.size);
      appVars.mapCenter.set(new google.maps.LatLng(Meteor.user().profile.player.center.lat, Meteor.user().profile.player.center.lng));
    }
    else {
      appVars.circleSize.set(8000);
      appVars.mapCenter.set(defaultLocation);            
    }
    clientFunctions.updateCircle();
  },
  'click #saveButton': function(event) {
    appVars.showErrors.set(true);
    if (!$(event.target).hasClass('disabled') && !$(event.target).parents('#saveButton').hasClass('disabled'))
      savePlayerData.call(this, event);
  }
});

Template.playerMainButtons.created = function() {
};

// ***************************

Template.pitchMapLarge.helpers({
  mapReady: function() {
    return appVars.mapReady.get();
  }
});

Template.pitchMapLarge.created = function() {
  this.autorun(function(c) {
    if (appVars.mapReady.get()) {
      google.maps.event.trigger(appVars.pitchMap, 'resize');
      appVars.pitchMap.setCenter(appVars.defaultLocation); 
      c.stop();
      delete this.mapReadyDep;   
    }
  });

  this.autorun(function() {
      if (appVars.liveCircle) {
        appVars.mapCenter.set(appVars.liveCircle.getCenter());
      }
      else if (appVars.circleSize) {
        var populationOptions = {
          strokeColor: '#78db1c',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#78db1c',
          fillOpacity: 0.35,
          map: appVars.pitchMap,
          draggable: true,
          center: appVars.mapCenter.get(),
          radius: appVars.circleSize.get()
        };
        if (window.google) {
          appVars.liveCircle = new google.maps.Circle(populationOptions);
          google.maps.event.addListener(appVars.liveCircle, 'center_changed', function() {
            appVars.mapCenter.set(appVars.liveCircle.getCenter());
            appVars.liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
            appVars.circleChanged.set(true);
          });
        }
      }
  });

}

// ***************** DEPS *************************


Deps.autorun(function() {
  dataChange.dep.depend();
  appVars.circleChanged.dep.depend();
  if ($('#cancelOrSave').length) {
    disableSave.set(true);
    if (appVars.circleChanged && appVars.circleChanged.get())
      disableSave.set(false);
    if (dataChange && dataChange.get()) {
      disableSave.set(false);
      dataChange.value = false;
    }
    if (!dataOkay())
      disableSave.set(true);
  }
});

// ***************** UTILITY *************************

function savePlayerData(event) {
  var availability = appVars.availabilitySession.get(),
      tableElements = $('#availabilityTable input');
/*  for (var i = 0, l = tableElements.length; i < l; i++) {
    if (tableElements[i].checked) availability[tableElements[i].id] = true;
  }*/
  var thisUser = Meteor.user();
    pageData = {
    age: parseInt($('#ageDropdown').dropdown('get value'), 10),
    position: parseInt($('#positionDropdown').dropdown('get value'), 10),
    footed: parseInt($('#footednessDropdown').dropdown('get value'), 10),
    ability: parseInt($('#abilityDropdown').dropdown('get value'), 10)
  }, update = {
    profile: _.extend(thisUser.profile, {
      first_name: $('#firstname input').val(), 
      last_name: $('#surname input').val(),
      player: _.extend(thisUser.profile.player, {
        center: {lat: appVars.mapCenter.get().lat(), lng: appVars.mapCenter.get().lng()},
        size: appVars.circleSize.get(),
        venues: appVars.venues.get().map(function(v) {return v._id;}),
        age: pageData.age ? pageData.age : 0,
        position: pageData.position ? pageData.position : 0,
        footed: pageData.footed ? pageData.footed : 0,
        ability: pageData.ability ? pageData.ability : 0
      })
    })
  };
  update.profile.player.availability = (appVars.tabChoices.value.playerTab === 'availability') ? availability : appVars.availabilitySession.value;
  Meteor.users.update({_id: Meteor.userId()}, {$set: update}, function(err) {
    if (!err) {
      if (event) {
        var icon = $(event.target);
        if (icon.prop("tagName") != "I") icon = icon.children('i');
        icon.removeClass("save").addClass("checkmark fontGlow");
        icon.parents('#saveButton').addClass('boxGlow');
        Meteor.setTimeout(function() {
          icon.addClass("save").removeClass("checkmark fontGlow")
          icon.parents('#saveButton').removeClass('boxGlow');
        }, 1000);
      }
      resetData.apply(this);
    }
    else console.log(err);
  });
  appVars.circleChanged.set(false);
  appVars.liveCircle.setOptions({ strokeColor: '#78db1c', fillColor: '#78db1c' });
}

dataOkay = function() {
  var dropdownData = $('.dropdown.selection').dropdown('get value');
  if (dropdownData.indexOf("") > -1)
    return false;
  if (!$('#firstname input').val() || !$('#surname input').val())
    return false;
  return true;
}

function resetData() {
  var thisUser = Meteor.user();
  if (thisUser && thisUser.profile && thisUser.profile.player) {
    var player = thisUser.profile.player;
    $('#ageDropdown').dropdown('set selected', player.age).dropdown('set value', player.age);
    $('#positionDropdown').dropdown('set selected', player.position).dropdown('set value', player.position);
    $('#footednessDropdown').dropdown('set selected', player.footed).dropdown('set value', player.footed);
    $('#abilityDropdown').dropdown('set selected', player.ability).dropdown('set value', player.ability);
  }
}