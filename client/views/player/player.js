Template.pitchData.helpers({
  getVenues: function() {
    if (appVars.venues && appVars.venues.get()) {
      return appVars.venues.get();
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

Template.playerDetails.helpers({
  "tabChoice": function(key, value) {
    if ('tabChoices' in appVars) return appVars.tabChoices.getKey(key) === value;
    else return false; 
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

Template.playerDetails.events({
  'click #tabSpace div a': function(event, target) {
    appVars.tabChoices.setKey('playerTab', event.target.name);
  }
});

// **************************

Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    appVars.tabChoices.setKey('playerTab', 'pitchData');
    Deps.flush();
    appVars.circleChanged.set(true);
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    appVars.circleSize.value = parseInt($('#distanceWrite').val(), 10) * 100;
    var self = this;
    this.circleTimeout = Meteor.setTimeout(function() {
          appVars.circleChanged.set(true);
          appVars.circleSize.dep.changed();
          appVars.venues.dep.changed();
          if (appVars.circleSize.value > 20000 && pitchMap.getZoom() > 9) pitchMap.setZoom(9);
          if (appVars.circleSize.value > 10000 && appVars.circleSize.value < 20000 && pitchMap.getZoom() !== 10) pitchMap.setZoom(10);
          else if (appVars.circleSize.value < 10000 && pitchMap.getZoom() < 11) pitchMap.setZoom(11);
          Meteor.clearTimeout(self.circleTimeout);
          self.circleTimeout = null;
          }, 500);
    clientFunctions.updateCircle();
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

Template.playerAreaButtons.events({
  'click #saveBoundsButton': function(event) {
    appVars.circleChanged.set(false);
    Meteor.users.update({_id: Meteor.userId()},
      {$set: {'profile.player': {
        center: {lat: appVars.mapCenter.get().lat(), lng: appVars.mapCenter.get().lng()},
        size: appVars.circleSize.get(),
        venues: appVars.venues.get().map(function(v) {return v._id;})
      }}},
      function(err) {
        if (!err) {
          var icon = $(event.target);
          if (icon.prop("tagName") != "I") icon = icon.children('i');
          icon.removeClass("save").addClass("checkmark fontGlow");
          icon.parents('#saveButton').addClass('boxGlow');
          Meteor.setTimeout(function() {
            icon.addClass("save").removeClass("checkmark fontGlow")
            icon.parents('#saveButton').removeClass('boxGlow');
          }, 1000);
        }
      });
    appVars.liveCircle.setOptions({ strokeColor: '#78db1c', fillColor: '#78db1c' });
  },
  'click #revertBoundsButton': function() {
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
  }
});

// **************************

Template.playerForm.helpers({
  first_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.first_name : null;
  },
  last_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.last_name : null;
  }
});

Template.playerForm.events({
  'click #saveButton': function(event) {
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
  },
  'click #emailButton': function() {
    var frag = Meteor.render(function() {
      return Template.linkModal();
    });
    document.getElementById('linkModalHolder').appendChild(frag);
    $('#linkModal').modal('show');
  },
  'click #facebookButton': function() {
    if (!('facebook' in Meteor.user().services)) {
      Meteor.loginWithFacebook({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
          console.log(err);
      });
    }
  },
  'click #twitterButton': function() {
    if (!('twitter' in Meteor.user().services)) {
      Meteor.loginWithTwitter({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
          console.log(err);
      });
    }
  }
  // 'click .dropdown .menu .item': function(event) {
  //   var clickedChoice = parseInt(event.target.attributes['data-value'].nodeValue, 10),
  //       thisUser = Meteor.user();
  //   if (thisUser.profile.contact.indexOf(clickedChoice) === -1)
  //     Meteor.users.update(thisUser._id, {$push: {'profile.contact': clickedChoice}});
  //   else if (thisUser.profile.contact.length > 1) 
  //     Meteor.users.update(thisUser._id, {$pull: {'profile.contact': clickedChoice}});
  //   $('.dropdown').dropdown('set text', clientFunctions.contactString()).dropdown('hide');
  // }
});

Template.playerForm.rendered = function() {
  var thisUser = Meteor.user();
  $(this.findAll('.ui.checkbox')).checkbox({verbose: false, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: false, debug: false, performance: false});
};

// **************************

Template.availability.helpers({
  days: function() {
    return appVars.days;
  },
  periods: function() {
    return appVars.periods;
  },
  extendedData: function() {
    return {periodCode: this.periodCode, days: appVars.days};
  }
});

Template.availability.rendered = function() {
  var thisUser = Meteor.user();
  if (thisUser && thisUser.profile && thisUser.profile.player && thisUser.profile.player.availability) {
    for (var i in thisUser.profile.player.availability) {
      if (thisUser.profile.player.availability[i]) document.getElementById(i).checked = true;
    }
  }
};

// **********************************************

Template.playerMainButtons.helpers({
  disableSave: function() {
    if ('disableSave' in this) return this.disableSave.get();
    return true;
  }
});

Template.playerMainButtons.events({
  'click #resetButton': function() {
    var teamNameHolder = document.querySelector('#teamNameHolder');
    Spark.getDataContext(teamNameHolder).nameEntryOverride.set(false);
  },
  'click #saveButton': savePlayerData
});

Template.playerMainButtons.created = function() {
  this.data.disableSave = new suprsubDep(true);
};

// ***************** DEPS *************************

Deps.autorun(function() {
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

// ***************** DEPS *************************

function savePlayerData() {
  return false;
}