var MARKER_DELAY = 1000;

var formData = {
    homeGround: new SuprSubDep(),
    userData: new SuprSubDep(),
    mapCircle: new SuprSubDep(),
    venues: new SuprSubDep([]),
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
/* Player: Event Handlers and Helpers */
/*****************************************************************************/
Template.Player.events({
  /*
   * Example:
   *  'click .selector': function (e, tmpl) {
   *
   *  }
   */
});

Template.Player.helpers({
  /*
   * Example:
   *  items: function () {
   *    return Items.find();
   *  }
   */
});

Template.playerForm.events({
  'keyup [data-field]': function(event, template) {
    var target = $(event.currentTarget),
      update = {
        $set: {}
      };
    update['$set']['profile.' + target.data('field')] = target.val();
    Meteor.users.update(Meteor.userId(), update);
  }
});

Template.playerDropdowns.helpers({
  dropdowns: function() {
    return App.playerFields;
  }
});

/*****************************************************************************/
/* Player: Lifecycle Hooks */
/*****************************************************************************/
Template.Player.created = function() {};

Template.Player.rendered = function() {

  var _this = this;

  this.autorun(function(c) {
    var user = Meteor.user();
    formData.homeGround.set(Pitches.findOne(user && user.profile.team.default));
  });

  this.$('.ui.dropdown').dropdown().each(function() {

    var el = this,
        $el = _this.$(el),
        user = Meteor.user(),
        field = $(this).data('field');

    _this.autorun(function(c) {
      $el.dropdown('set value', user.profile.player[field]).dropdown('set selected', user.profile.player[field]);
    });

    $el.dropdown({
      onChange: function(value, text) {
        var update = {
            $set: {}
          },
          field = $el.data('field');
        update['$set']['profile.player.' + field] = value;
        console.log(field, value);
        console.log(update);
        Meteor.users.update(Meteor.userId(), update);
      }
    });
  });

};

Template.Player.destroyed = function() {

  this.$('.ui.dropdown').dropdown('destroy');

};

Template.pitchMapLarge.created = function() {

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

}

Template.pitchMapLarge.rendered = function() {

  // PASS OBJECT RATHER THAN GET() SO THAT OBJECT REF CAN BE USED BY MAP CALLBACKS ATTACHED BY mapRender
  mapRender(this.mapDetails);
  map.locate();
  map.on('locationfound', function(data) {
    App.currentLocation = data.latlng;
    zoomPitch(App.currentLocation);
    map.off('locationfound');
  });

  this.autorun(function() {
    var user = Meteor.user();
    if (!user || !map.circle) return false;
    var center = map.circle.getLatLng(),
        size = map.circle.getRadius();
    if (user.profile.player.center.lat !== center.lat || user.profile.player.center.lng !== center.lng) {
      map.circle.setLatLng(user.profile.player.center);
    }
    if (user.profile.player.size !== size) {
      map.circle.setRadius(user.profile.player.size);
    }
  });

};

Template.pitchMapSmall.destroyed = function() {

  map.remove();

};

function homeGroundWrapper(event) {
  setHomeGround(event.target.options.pitchId);
}

mapRender = function(mapDetails) {
  var mapCenter = mapDetails.value.mapCenter,
    mapZoom = mapDetails.value.mapZoom,
    markersAdded = new ReactiveVar(false),
    user = Meteor.user();

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
    var pitches = Pitches.find({
          location: {
            $exists: true
          }
        }).fetch(),
        pitchCount = pitches.length;
    map.markerArray = [];

    addMarker = function(i) {
      if (i < pitchCount) {
        var pitch = pitches[i];
        Meteor.defer(function() {
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
          map.markerArray.push(newMarker);
          addMarker(i + 1);
        });
      } else {
        markersAdded.set(true);
      }
    }

    markersAdded.set(false);
    addMarker(0);

    map.markers.clearLayers();
    Tracker.autorun(function(c) {
      if (markersAdded.get()) {
        map.markers.addLayers(map.markerArray);
      }
    });
  };
  map.addLayer(map.markers);
  map.updateMarkers();

  // NEED TO "SET" HOME GROUND AGAIN TO ATTACH IT TO MAP
  var homeGround = formData.homeGround.get();
  homeGround && setHomeGround(homeGround);

  // ADD CIRCLE
  if (user) map.circle = L.circle(user.profile.player.center, user.profile.player.size);
  else map.circle = L.circle(L.latLng(51.5073509, -0.12775829999998223), 8000);
  map.addLayer(map.circle);

  // ADD MARKERS WHEN PITCHES ARE READY (CAN'T USE CALLBACK AS WE DON'T KNOW WHEN SYNC WAS CALLED)
  Tracker.autorun(function(comp) {
    if (Pitches && Pitches.synced() && App.pitchSync) {
      if (App.pitchSync.removed.length + App.pitchSync.inserted.length > 0) {
        map.updateMarkers();
        zoomPitch(App.currentLocation);
      }
      comp.stop();
    }
  });

};

function zoomPitch(defaultLocation) {

  var location = defaultLocation ? defaultLocation : formData.homeGround.getKey('_id'),
    pitch = Pitches.findOne({
      _id: location
    });
  if (!pitch) return false;
  map.panTo(pitch.location);
  map.homeGroundMarker && map.markers.zoomToShowLayer(map.homeGroundMarker, function() {
    map.homeGroundMarker.openPopup()
  });

}

function setHomeGround(pitch) {
  if (!window.map || map instanceof HTMLElement) return false;

  if (typeof pitch === 'string') pitch = Pitches.findOne({
    _id: pitch
  });
  var thisPitchId = pitch && pitch._id;
  if (!pitch || (formData.homeGround.value._id === thisPitchId && map.homeGroundMarker)) return false;

  var readyDep = new SuprSubDep({
    move: false,
    tiles: false
  });

  map.homeGroundMarker && map.homeGroundMarker.closePopup();
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIcon));
  map.homeGroundMarker = _.find(map.markerArray, function(marker) {
    return marker.options.pitchId === thisPitchId;
  });
  map.homeGroundMarker && (map.homeGroundMarker.setIcon(pitchIconSpinning));
  if (!_.isEmpty(pitch)) map.panTo(pitch.location);

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
      zoomPitch();
      comp.stop();
    }
  });
}
