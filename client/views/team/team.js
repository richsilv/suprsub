var MARKER_DELAY = 1000;

var formData = {
  teamsArray: new SuprSubDep(),
  currentTeam: defaultTeam(),
  teamIndex: new SuprSubDep(),
  teamInput: new SuprSubDep(),
  showErrors: new SuprSubDep(false)
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
  }

});

Template.teamTopLevel.helpers({

  teamDropdown: function() {
    return !formData.teamInput.get();
  },

  teamName: function() {
    return formData.currentTeam.get().name;
  },

  teams: function() {
    return formData.teamsArray.get();
  },

  hour: function() {
    var team = formData.currentTeam.get();  
    return team && App.padZeros(team.time.getHours(), 2);
  },

  minute: function() {
    var team = formData.currentTeam.get();
    return team && App.padZeros(team.time.getMinutes(), 2);
  },

  newTeam: function() {
    return !formData.currentTeam.get()._id;
  },

  formValid: function() {
    return !formData.currentTeam.getKey('invalid').length;
  },

  invalid: function(field) {
    return (formData.showErrors.get() && formData.currentTeam.get().invalid.indexOf(field) > -1) ? 'error' : ''; 
  }

});

Template.pitchMapSmall.helpers({
  pitchSync: function() {
    return Pitches && Pitches.find().count() > 100;
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

Template.pitchMapSmall.rendered = function() {

  var _this = this;

  // DATA-BINDING AND MARKER UPDATE
  this.autorun(function(c) {
    var newTimer = new Date().getTime(),
        mapDetails;

    if (c.firstRun) {
      _this.mapDetails = new SuprSubDep({
        mapCenter: L.latLng(51.5073509, -0.12775829999998223),
        mapZoom: 11
      });
    }

    mapDetails = _this.mapDetails.get();

    if (!_this.timer || _this.timer + MARKER_DELAY < newTimer) {
      _this.timer = newTimer;
      map && map.updateMarkers && map.updateMarkers();
    }
  });

  // PASS OBJECT RATHER THAN GET() SO THAT OBJECT REF CAN BE USED BY MAP CALLBACKS ATTACHED BY mapRender
  mapRender(this.mapDetails);

};

Template.pitchMapSmall.destroyed = function() {

  map.remove();

};

/*****************************************************************************/
/* Team: Data Binding */
/*****************************************************************************/

Meteor.startup(function() {

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

  Tracker.autorun(function(c) {

    var team = formData.currentTeam.get(),
        invalid = [],
        nameMatch = /[A-Za-z0-9;#\.\\\+\*\?\[\]\(\)\{\}\=\!\<\>\:\-]+/.exec(team.name);

    if (!(nameMatch && nameMatch[0] === team.name)) invalid.push('name');
    if (!team.format) invalid.push('format');
    if (!team.homeGround) invalid.push('homeGround');

    formData.currentTeam.value.invalid = invalid;

  })

});

function defaultTeam() {
  return new SuprSubDep({
    time: new Date(0, 0, 1, 19, 0, 0),
    name: '',
    homeGround: '',
    format: '',
    ringerCode: Random.id(),
    competitive: '0',
    invalid: ['name', 'homeGround', 'format']
  });
}

mapRender = function(mapDetails) {
  var query,

      OpenStreetMap_HOT = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">'
      }),

      mapCenter = mapDetails.value.mapCenter,

      mapZoom = mapDetails.value.mapZoom,

/*      pitchIcon = L.divIcon({
        className: 'marker-icon suprsub-green',
        html: '<i class="football"></i>',
        iconSize: 40
      });*/
      pitchIcon = L.AwesomeMarkers.icon({
        icon: 'football',
        markerColor: 'suprsub-green',
        prefix: 'icon'
      });

  L.Icon.Default.imagePath = 'packages/leaflet/images';
  window.map = L.map('map', {
      doubleClickZoom: false
  }).setView(mapCenter, mapZoom);
  OpenStreetMap_HOT.addTo(window.map);

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
    map.markers.clearLayers();
    map.markers.addLayers(_.map(Pitches.withinBounds(map.getBounds()), function(pitch) {
      return new L.Marker(pitch.location, {
        icon: pitchIcon,
        title: pitch.prettyLocation,
        riseOnHover: true
      });
    }));    
  };
  map.addLayer(map.markers);
  map.updateMarkers();

  // ADD MARKERS WHEN PITCHES ARE READY (CAN'T USE CALLBACK AS WE DON'T KNOW WHEN SYNC WAS CALLED)
  Tracker.autorun(function(comp) {
    if (Pitches && Pitches.ready()) {
      map.updateMarkers();
      comp.stop();
    }
  });

};