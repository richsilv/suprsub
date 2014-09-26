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
    formData.currentTeam.setKey('name', event.currentTarget.value)
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
    }

    else {
      var newId = Teams.insert(_.omit(formData.currentTeam.get(), 'invalid'));
      Meteor.users.update(Meteor.userId(), {$push: {'profile.team._ids': newId}});
    }
  },

  'click #setDefault': function() {

  },

  'click #addNewTeam': function() {

  },

  'click #leaveTeam': function() {

  },

  'click #deleteTeam': function() {

    SemanticModal.confirmModal({
      header: 'Are you sure?',
      message: 'Deleting a team is permanent, and will remove it for <strong>all</strong> team members, not just you.',
      callback: function() {
        Teams.remove({_id: formData.currentTeam.getKey('_id')});
      }
    });

  }

});

Template.teamTopLevel.helpers({

  teamDropdown: function() {
    return !formData.teamInput.get();
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
        sort: {prettyLocation: 1}
      }).fetch());
    }
    return false;
  },

  'click #mapSearchButton, submit': function(event, template) {
    var params = {
      q: template.$('#homeGroundSearch').val(),
      format: 'json',
      countrycode: 'gb',
      limit:1
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
      pan: {duration: 2}
    });
  }

});

Template.pitchMapSmall.helpers({
  pitchSync: function() {
    _this = Template.instance();
    return Pitches.find().count() > 100 && !_this.mapDetails.getKey('isLoading');
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
      currentTeam.setKey('competitive', parseInt(val, 10));
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

};

Template.Team.destroyed = function () {

  this.$('.ui.flipbox').flipbox('destroy');
  this.$('.ui.dropdown').dropdown('destroy');  

};

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
    map.panTo(data.latlng);
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

      var teams = Teams.myTeams();
      formData.teamsArray.set(teams);
      if (!formData.teamIndex.get() || formData.teamIndex.get() >  teams.length -1) formData.teamIndex.set(0);
      if (teams.length) formData.currentTeam.set(teams[formData.teamIndex.get()]);
      else formData.currentTeam.set(defaultTeam());
      if (teams.length < 2) formData.teamInput.set(true);

    }

    // SYNCHRONISE CURRENT TEAM

    Tracker.autorun(function(c) {
      var currentTeam = formData.currentTeam.get();

      if (currentTeam.id) {
        Teams.update(currentTeam._id, {$set: _.omit(currentTeam, 'invalid')});
      }
    });

    // UPDATE HOME GROUND

    Tracker.autorun(function(c) {
      homeGround = Pitches.findOne(formData.currentTeam.getKey('homeGround'));
      formData.homeGround.set(homeGround);
      setHomeGround(homeGround);
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
  if (typeof pitch === 'string') pitch = Pitches.findOne({_id: pitch});
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
      map.homeGroundMarker.openPopup();
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
  // map.tileLayer.on('loading', appearFunc.bind(this, $('#mapCover')));
  // map.tileLayer.on('load', disappearFunc.bind(this, $('#mapCover')));

  // ATTACH CALLBACKS

  map.on('moveend', function(e) {
    mapDetails.setKey('mapCenter', map.getCenter());
  });
  map.on('zoomend', function(e) {
    mapDetails.setKey('mapZoom', map.getZoom());
  });
  map.markers = new L.MarkerClusterGroup({
    maxClusterRadius: 40,
    showCoverageOnHover: false
  });

  map.updateMarkers = function() {
    map.markerArray = _.map(Pitches.find({location: {$exists: true}}).fetch(), function(pitch) {
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
    if (Pitches && Pitches.ready()) {
      if (App.pitchSync.removed.length + App.pitchSync.inserted > 0) map.updateMarkers();
      comp.stop();
    }
  });

};

getFormData = function() {
  return formData;
}