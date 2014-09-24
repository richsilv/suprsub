var MARKER_DELAY = 1000;

var formData = {
  teamsArray: new SuprSubDep(),
  currentTeam: defaultTeam(),
  teamIndex: new SuprSubDep(),
  teamInput: new SuprSubDep(),
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
  });

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
    return !formData.currentTeam.getKey('invalid').length;
  },

  invalid: function(field) {
    return (formData.showErrors.get() && formData.currentTeam.getKey('invalid').indexOf(field) > -1) ? 'error' : ''; 
  },

  homeGroundName: function() {
    return formData.currentTeam.getKey('homeGround').prettyLocation;
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
})

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
      if (teams.length < 2) formData.teamInput.set(true);

    }
  });

  //SYNCHRONISE CURRENT TEAM

  Tracker.autorun(function(c) {
    var currentTeam = formData.currentTeam.get();

    if (currentTeam.id) {
      Teams.update(currentTeam._id, {$set: _.omit(currentTeam, 'invalid')});
    }
  })

  // VALIDATE FORM
  Tracker.autorun(function(c) {

    var team = formData.currentTeam.get(),
        invalid = [],
        nameMatch = /[ A-Za-z0-9;#\.\\\+\*\?\[\]\(\)\{\}\=\!\<\>\:\-]+/.exec(team.name);

    if (!(nameMatch && nameMatch[0] === team.name)) invalid.push('name');
    if (!team.format) invalid.push('format');
    if ($.isEmptyObject(team.homeGround)) invalid.push('homeGround');

    formData.currentTeam.value.invalid = invalid;

  });

});

function defaultTeam() {
  return new SuprSubDep({
    time: new Date(0, 0, 1, 19, 0, 0),
    name: '',
    homeGround: {},
    format: '',
    ringerCode: Random.id(),
    competitive: '0',
    players: [Meteor.userId()],
    ringers: [],
    invalid: ['name', 'homeGround', 'format']
  });
}

function setHomeGround(pitch) {
  if (typeof pitch === 'string') pitch = Pitches.findOne({_id: pitch});
  if (pitch) formData.currentTeam.setKey('homeGround', pitch);
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIcon));
  map.homeGroundMarker = _.find(map.markerArray, function(marker) {
    return marker.options.pitchId === pitch._id;
  });
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIconSpinning));
  map.on('moveend', function() {
    map.markers.zoomToShowLayer(map.homeGroundMarker, function() {
      map.homeGroundMarker.openPopup();      
    });
    map.off('moveend');
  });
}


function homeGroundWrapper(event) {
  setHomeGround(event.target.options.pitchId);
}

mapRender = function(mapDetails) {
  var tileLayer = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'
      }),

      mapCenter = mapDetails.value.mapCenter,

      mapZoom = mapDetails.value.mapZoom;

  L.Icon.Default.imagePath = 'packages/leaflet/images';

  window.map = L.map('map', {
      doubleClickZoom: false
  }).setView(mapCenter, mapZoom);

  tileLayer.addTo(map);
  tileLayer.on('loading', function(e) {
    $('#mapCover').velocity({
      opacity: 0.6,
      'z-index': 0
    });  
  });
  tileLayer.on('load', function(e) {
    $('#mapCover').velocity({
      opacity: 0,
      'z-index': -50
    })    
  })

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
    map.markerArray = _.map(Pitches.find().fetch(), function(pitch) {
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