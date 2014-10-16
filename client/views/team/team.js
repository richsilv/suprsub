var MARKER_DELAY = 1000;

var formData = {
    teamsArray: new SuprSubDep([]),
    currentTeam: new SuprSubDep(defaultTeam()),
    teamIndex: new SuprSubDep(),
    teamInput: new SuprSubDep(),
    homeGround: new SuprSubDep({}),
    pitchMatches: new SuprSubDep([]),
    showErrors: new SuprSubDep(false)
  },

  pitchIcon = L.AwesomeMarkers.icon({
    icon: 'football',
    markerColor: 'suprsub-green',
    prefix: 'icon'
  }),

  pitchIconSpinning = L.AwesomeMarkers.icon({
    icon: 'football-spinning',
    markerColor: 'suprsub-green',
    prefix: 'icon'
  }),

  disappearFunc = function(elements) {
    elements.velocity({
      opacity: 0,
      'z-index': -50
    })
  },
  appearFunc = function(elements) {
    elements.velocity({
      opacity: 0.6,
      'z-index': 0
    });
  };

/*****************************************************************************/
/* Team: Event Handlers and Helpers */
/*****************************************************************************/
Template.teamTopLevel.events({

  'keyup #teamName': function(event) {
    formData.currentTeam.setKey('name', event.currentTarget.value);
  },

  'submit #teamForm': function(event) {
    return false;
  },

  'change #timePickerHour': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setHours(event.currentTarget.valueAsNumber);
    event.currentTarget.value = App.padZeros(event.currentTarget.value, 2);
    formData.currentTeam.setKey('time', newTime);
  },

  'change #timePickerMinute': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setMinutes(event.currentTarget.valueAsNumber);
    event.currentTarget.value = App.padZeros(event.currentTarget.value, 2);
    formData.currentTeam.setKey('time', newTime);
  },

  'click #saveTeam': function() {
    if (formData.currentTeam.get().invalid.length) {
      formData.showErrors.set(true);
      Meteor.setTimeout(function() {
        formData.showErrors.set(false);
      }, 1000);
    } else {
      var newId = Teams.insert(_.omit(formData.currentTeam.get(), 'invalid'));
      Meteor.users.update(Meteor.userId(), {
        $push: {
          'profile.team._ids': newId
        },
        $set: {
          'profile.team.default': newId
        }
      });
    }
  },

  'click #setDefault': function() {

  },

  'click #addNewTeam': function() {

    SemanticModal.confirmModal({
      header: 'Create New Team',
      message: "This will create a new team with you as the sole player.  You'll need to hit the <strong>save</strong> button when you've enter the details, and then you'll be able to invite your teammates and preferred SuprSubs to join",
      callback: function() {
        formData.currentTeam.set(defaultTeam());
        formData.teamInput.set(true);
      }
    });

  },

  'click #leaveTeam': function() {

    var solePlayer = (formData.currentTeam.getKey('players').length < 2) && (formData.currentTeam.getKey('players').indexOf(Meteor.userId()));
    SemanticModal.confirmModal({
      header: 'Are you sure?',
      message: 'Are you sure you want to leave this team?' + (solePlayer ? '  <strong>The team will be deleted as you are the only registered player!</strong>' : ''),
      callback: function() {
        Meteor.users.update(Meteor.userId(), {
          $pull: {
            'profile.teams._ids': formData.currentTeam.getKey('_id')
          }
        });
        Meteor.users.update(Meteor.userId(), {
          $pull: {
            'profile.teams._ids_ringers': formData.currentTeam.getKey('_id')
          }
        });
      }
    });

  },

  'click #deleteTeam': function() {

    SemanticModal.confirmModal({
      header: 'Are you sure?',
      message: 'Deleting a team is permanent, and will remove it for <strong>all</strong> team members, not just you.',
      callback: function() {
        Teams.remove({
          _id: formData.currentTeam.getKey('_id')
        });
      }
    });

  }

});

Template.teamTopLevel.helpers({

  teamDropdown: function() {
    return !formData.teamInput.get() && formData.teamsArray.get().length > 1;
  },

  teamName: function() {
    return formData.currentTeam.getKey('name');
  },

  teams: function() {
    return formData.teamsArray.get();
  },

  hour: function() {
    var time = formData.currentTeam.getKey('time');
    return time && App.padZeros(time.getHours(), 2);
  },

  minute: function() {
    var time = formData.currentTeam.getKey('time');
    return time && App.padZeros(time.getMinutes(), 2);
  },

  newTeam: function() {
    return !formData.currentTeam.getKey('_id');
  },

  formValid: function() {
    var invalid = formData.currentTeam.getKey('invalid');
    return !invalid.length;
  },

  invalid: function(field) {
    return (formData.showErrors.get() && formData.currentTeam.getKey('invalid').indexOf(field) > -1) ? 'error' : '';
  },

  homeGroundName: function() {
    return formData.homeGround.getKey('prettyLocation');
  },

  'submit': function() {
    return false;
  }

});

Template.teamDropDown.events({

  'dblclick #teamChoice': function() {
    formData.teamInput.set(true);
    Tracker.flush();
    $('#teamName').focus();
  },

  'blur #teamChoice, keydown #teamChoice': function(event) {
    if (event.keyCode === 13 || event.type === 'blur') {
      formData.teamInput.set(false);
    }
    return false;
  }

});

Template.otherInfo.helpers({

  pitchMatches: function() {
    return formData.pitchMatches.get();
  }

});

Template.otherInfo.events({

  'keyup #homeGroundSearch': function(event) {
    var searchString = event.currentTarget.value;
    if (searchString.length > 3) {
      formData.pitchMatches.set(Pitches.find({
        $where: 'this.prettyLocation && this.prettyLocation.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1'
      }, {
        sort: {
          prettyLocation: 1
        }
      }).fetch());
    }
    return false;
  },

  'click #mapSearchButton, submit': function(event, template) {
    var params = {
      q: template.$('#homeGroundSearch').val(),
      format: 'json',
      countrycode: 'gb',
      limit: 1
    }
    $.getJSON(App.mapSearchURI + $.param(params), function(data, res) {
      var location = data && data.length && data[0];
      if (res === 'success' && location) {
        map.panTo(L.latLng(location.lat, location.lon));
      }
    });
    return false;
  },

  'click #pitchMatches .item': function(event) {
    setHomeGround(this);
    map.setView(L.latLng(this.location), 14, {
      animate: true,
      pan: {
        duration: 2
      }
    });
  }

});

Template.pitchMapSmall.helpers({
  ifReady: function() {
    return Pitches.find().count() > 100 ? "hide" : "show";
  }
});

/*****************************************************************************/
/* Team: Lifecycle Hooks */
/*****************************************************************************/

Template.Team.created = function() {};

Template.Team.rendered = function() {

  var _this = this,
    currentTeam = formData.currentTeam;

  // SET UP FLIPBOX AND DROPDOWNS  
  this.$('#friendlyCompetitive').flipbox({
    onChange: function(value) {
      formData.currentTeam.setKey('competitive', value);
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
    } else {
      _this.$('#gameFormat').dropdown('restore defaults');
    }
  });

  this.autorun(function(c) {
    var time = currentTeam.getKey('time');

    if (time) {
      _this.$('#dayChoiceSection>.ui.dropdown').dropdown('set value', time.getDay() - 1);
      _this.$('#dayChoiceSection>.ui.dropdown').dropdown('set selected', time.getDay() - 1);
    }
  });

  this.autorun(function(c) {
    var team = formData.currentTeam.get();
    if (team) {
      _this.$('#teamChoice').dropdown('set value', team._id);
      _this.$('#teamChoice').dropdown('set selected', team._id);
      _this.$('#teamChoice').dropdown('hide');
    }
  });

};

Template.Team.destroyed = function() {

  this.$('.ui.flipbox').flipbox('destroy');
  this.$('.ui.dropdown').dropdown('destroy');

};

Template.teamDropDown.rendered = function() {

  var _this = this,
    currentTeam = formData.currentTeam;
  
  this.$('#teamChoice').dropdown({
    onChange: function(value, text) {
      var index;
      _.find(formData.teamsArray.get(), function(team, teamIndex) {
        if (team._id === value) {
          index = teamIndex;
          return true;
        };
      });
      formData.teamIndex.set(index);
    }
  });

  this.autorun(function(c) {
    _this.$('#teamChoice').dropdown('set selected', currentTeam.getKey('_id'));
  });
}

Template.pitchMapSmall.created = function() {

  var _this = this;

  // DATA-BINDING AND MARKER UPDATE
  this.autorun(function(c) {
    var newTimer = new Date().getTime(),
      mapDetails;

    if (c.firstRun) {
      _this.mapDetails = new SuprSubDep({
        mapCenter: L.latLng(51.5073509, -0.12775829999998223),
        mapZoom: 11,
        isLoading: true
      });
    }

    mapDetails = _this.mapDetails.get();

    if (!_this.timer || _this.timer + MARKER_DELAY < newTimer) {
      _this.timer = newTimer;
    }
  });

};

Template.pitchMapSmall.rendered = function() {

  // PASS OBJECT RATHER THAN GET() SO THAT OBJECT REF CAN BE USED BY MAP CALLBACKS ATTACHED BY mapRender
  mapRender(this.mapDetails);
  map.locate();
  map.on('locationfound', function(data) {
    App.currentLocation = data.latlng;
    zoomPitch(App.currentLocation);
    map.off('locationfound');
  });

};

Template.pitchMapSmall.destroyed = function() {

  map.remove();

};

/*****************************************************************************/
/* Team: Data Binding */
/*****************************************************************************/

Meteor.startup(function() {

  // KEEP TEAM LIST UP TO DATE
  Tracker.autorun(function(c) {
    var user = Meteor.user();

    if (user) {

      var teams = _.indexBy(Teams.myTeams(), '_id');
      formData.teamsArray.set(teams);

      // TEST IF TEAM INDEX IS UNSET, OR FAILS TO MATCH AN EXISTING TEAM
      if (!formData.teamIndex.get() || !teams[formData.teamIndex.get()]) {
        formData.teamIndex.set(user.profile.team.default);
      }
      // NOW SET CURRENT TEAM USING INDEX
      if (teams[formData.teamIndex.get()]) {
        formData.currentTeam.set(teams[formData.teamIndex.get()]);
      }
      else {
        formData.currentTeam.set(defaultTeam());
      }

    }

    // SYNCHRONISE CURRENT TEAM

    Tracker.autorun(function(c) {
      var currentTeam = formData.currentTeam.get();

      if (currentTeam._id) {
        Teams.update(currentTeam._id, {
          $set: _.omit(currentTeam, 'invalid')
        });
      }
    });

    // UPDATE HOME GROUND

    Tracker.autorun(function(c) {
      if (Pitches.populated()) {
        homeGround = Pitches.findOne(formData.currentTeam.getKey('homeGround'));
        formData.homeGround.set(homeGround);
        setHomeGround(homeGround);
      }
    });

    // VALIDATE FORM
    Tracker.autorun(function(c) {

      var team = formData.currentTeam.get(),
        invalid = [],
        nameMatch = /[ A-Za-z0-9;#\.\\\+\*\?\[\]\(\)\{\}\=\!\<\>\:\-]+/.exec(team.name);

      if (!(nameMatch && nameMatch[0] === team.name)) invalid.push('name');
      if (!team.format) invalid.push('format');
      if ($.isEmptyObject(formData.homeGround.get())) invalid.push('homeGround');

      formData.currentTeam.value.invalid = invalid;

    });

  });

});

function defaultTeam() {
  return {
    time: new Date(0, 0, 1, 19, 0, 0),
    name: '',
    homeGround: '',
    format: '',
    ringerCode: Random.id(),
    competitive: 0,
    players: [Meteor.userId()],
    ringers: [],
    invalid: ['name', 'homeGround', 'format']
  };
}

function setHomeGround(pitch) {
  if (!window.map) return false;

  var readyDep = new SuprSubDep({
      move: false,
      tiles: false
    }),
    thisPitchId = pitch && pitch._id;

  map.homeGroundMarker && map.homeGroundMarker.closePopup();
  if (typeof pitch === 'string') pitch = Pitches.findOne({
    _id: pitch
  });
  if (pitch) formData.currentTeam.setKey('homeGround', pitch._id);
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIcon));
  map.homeGroundMarker = _.find(map.markerArray, function(marker) {
    return marker.options.pitchId === thisPitchId;
  });
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIconSpinning));
  if (pitch) map.panTo(pitch.location);

  map.on('moveend', function() {
    readyDep.setKey('move', true);
    map.off('moveend');
  });
  map.tileLayer.on('load', function() {
    readyDep.setKey('tiles', true);
    map.tileLayer.off('load');
  });

  Tracker.autorun(function(comp) {
    if (readyDep.getKey('move') && readyDep.getKey('tiles')) {
      map.homeGroundMarker && map.homeGroundMarker.openPopup();
      comp.stop();
    }
  });
}


function homeGroundWrapper(event) {
  setHomeGround(event.target.options.pitchId);
}

mapRender = function(mapDetails) {
  var mapCenter = mapDetails.value.mapCenter,
    mapZoom = mapDetails.value.mapZoom;

  L.Icon.Default.imagePath = 'packages/leaflet/images';

  window.map = L.map('map', {
    doubleClickZoom: false
  }).setView(mapCenter, mapZoom);

  map.tileLayer = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
    attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'
  });
  map.tileLayer.addTo(map);

  // ATTACH CALLBACKS

  map.on('moveend', function(e) {
    mapDetails.setKey('mapCenter', map.getCenter());
  });
  map.on('zoomend', function(e) {
    mapDetails.setKey('mapZoom', map.getZoom());
  });
  map.markers = new L.MarkerClusterGroup({
    maxClusterRadius: 40,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 13
  });

  map.updateMarkers = function() {
    map.markerArray = _.map(Pitches.find({
      location: {
        $exists: true
      }
    }).fetch(), function(pitch) {
      var newMarker = new L.Marker(pitch.location, {
        icon: pitchIcon,
        title: pitch.prettyLocation,
        riseOnHover: true,
        pitchId: pitch._id
      }).on('click', homeGroundWrapper).bindPopup(pitch.prettyLocation);
      if (pitch._id === formData.currentTeam.getKey('_id')) {
        newMarker.options.icon = pitchIconSpinning;
        map.homeGroundMarker = newMarker;
      }
      return newMarker;
    });
    map.markers.clearLayers();
    map.markers.addLayers(map.markerArray);
  };
  map.addLayer(map.markers);
  map.updateMarkers();

  // ADD MARKERS WHEN PITCHES ARE READY (CAN'T USE CALLBACK AS WE DON'T KNOW WHEN SYNC WAS CALLED)
  Tracker.autorun(function(comp) {
    if (Pitches && Pitches.synced()) {
      if (App.pitchSync.removed.length + App.pitchSync.inserted.length > 0) {
        map.updateMarkers();
        zoomPitch(App.currentLocation);
      }
      comp.stop();
    }
  });

};

function zoomPitch(defaultLocation) {

  if (!formData.homeGround.getKey('_id')) {
    defaultLocation && map.panTo(defaultLocation);
  } else {
    map.panTo(formData.homeGround.getKey('location'))
    map.homeGroundMarker && map.markers.zoomToShowLayer(map.homeGroundMarker, function() {
      map.homeGroundMarker.openPopup()
    });
  }

}

getFormData = function() {
  return formData;
}