var MARKER_DELAY = 1000;

var formData = {
    homeGround: new SuprSubDep(),
    pitches: new SuprSubDep([])
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

  periods = ['06:00-12:00', '12:00-18:00', '18:00-00:00'],
  days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

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

Template.availabilityVenues.events({
  'click [data-tab]': function(event, template) {
    App.tabChoices.setKey('playerTab', template.$(event.currentTarget).data('tab'));
  }
});

Template.availability.helpers({
  days: function(periodInd) {
    var userDays = Meteor.user() ? Meteor.user().profile.player.availability : {};
    return _.map(days, function(day, ind) {
      var code = periodInd + '/' + ind.toString();
      return {
        name: day,
        code: code,
        value: userDays[code]
      };
    });
  },
  periods: function() {
    return _.map(periods, function(period, ind) {
      return {
        name: period,
        ind: ind
      };
    });
  }
});

Template.availability.events({
  'click [data-period]': function(event, template) {
    var checkbox = template.$(event.currentTarget),
        checked = checkbox.data('checked'),
        period = checkbox.data('period'),
        set = {}
    set['profile.player.availability.' + period.toString()] = !checked;
    console.log(period, checked, set);
    Meteor.users.update({
      _id: Meteor.userId()
    }, {
      $set: set
    });
  }
});

Template.pitchData.helpers({
  'getPitches': function() {
    return formData.pitches.get();
  }
})

Template.defineBounds.events({
  'slide .slider': function(event, template) {
    Meteor.users.update(Meteor.userId(), {
      $set: {
        'profile.player.radius': template.$(event.currentTarget).val()
      }
    }, console.log.bind(console));
  }
});

Template.pitchMapLarge.events({
  'drag .pitchCircle': function(event, template, extra) {
    var currentLatLng = map.circle.getLatLng(),
        lat = currentLatLng.lat + extra.lat,
        lng = currentLatLng.lng + extra.lng;
      newLatLng = {
        lat: lat,
        lng: lng
      };
    map.circle.setLatLng(newLatLng);
    Meteor.users.update(Meteor.userId(), {
      $set: {
        'profile.player.center': newLatLng
      }
    });
    event.stopPropagation();
  },
  'mouseover .pitchCircle': function() {
    map.dragging.disable();
  },
  'mouseout .pitchCircle': function() {
    map.dragging.enable();
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
      $el.dropdown('set value', user && user.profile.player[field]).dropdown('set selected', user && user.profile.player[field]);
    });

    $el.dropdown({
      onChange: function(value, text) {
        var update = {
            $set: {}
          },
          field = $el.data('field');
        update['$set']['profile.player.' + field] = value;
        Meteor.users.update(Meteor.userId(), update);
      }
    });
  });

};

Template.Player.destroyed = function() {

  this.$('.ui.dropdown').dropdown('destroy');

};

Template.defineBounds.rendered = function() {
  $('.slider').noUiSlider({
    start: [8000],
    range: {
      'min': [1000],
      'max': [15000]
    },
    orientation: 'vertical',
    direction: 'rtl'
  });
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

  // REDRAW CIRCLE WHEN BOUNDS ARE CHANGED
  this.autorun(function() {
    var user = Meteor.user();
    if (!user || !map.circle) return false;
    var center = map.circle.getLatLng(),
      radius = map.circle.getRadius();
    if (user.profile.player.center.lat !== center.lat || user.profile.player.center.lng !== center.lng) {
      map.circle.setLatLng(new L.latLng(user.profile.player.center));
    }
    if (user.profile.player.radius !== radius) {
      map.circle.setRadius(user.profile.player.radius);
    }
  });

  // PERIODICALLY UPDATE PITCHES LIST
  this.autorun(function() {
    var user = Meteor.user();
    if (this.timeOut) {
      Meteor.clearTimeout(this.timeOut);
      delete this.timeOut;
    }
    this.timeOut = Meteor.setTimeout(function(t) {
      Tracker.nonreactive(function() {
        var pitches = pitchesWithin(user.profile);
        Meteor.users.update(user._id, {
            $set: {
              'profile.player.pitches': _.pluck(pitches, '_id')
            }
          },
          function() {
            formData.pitches.set(pitches);
          });
      });
    }, 1000);
  });

};

Template.pitchMapSmall.destroyed = function() {

  map.remove();

};

function homeGroundWrapper(event) {
  setHomeGround(event.target.options.pitchId);
}

function mapRender(mapDetails) {
  var mapCenter = mapDetails.value.mapCenter,
    mapZoom = mapDetails.value.mapZoom,
    markersAdded = new ReactiveVar(false),
    user = Meteor.user();

  L.Icon.Default.imagePath = 'packages/leaflet/images';

  window.map = L.map('map', {
    doubleClickZoom: false,
    touchZoom: false
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
  map.on('mousedown', function(e) {
    map.dragElem = e.originalEvent.target;
    map.dragRoot = e.latlng;
  });
  map.on('mousemove', function(e) {
    if (map.dragElem && e.latlng) {
      var latlng = e.latlng;
      $(map.dragElem).trigger('drag', {
        lat: latlng.lat - map.dragRoot.lat,
        lng: latlng.lng - map.dragRoot.lng
      });
      map.dragRoot = latlng;
    }
  });
  map.on('mouseup', function(e) {
    delete map.dragElem;
    delete map.dragRoot;
  });



  map.markers = new L.MarkerClusterGroup({
    maxClusterRadius: 60,
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
    map.markerArray = [],
    homeGroundId = formData.homeGround.getKey('_id'),
    baseMarker = new L.Marker(new L.LatLng(0, 0), {
            icon: pitchIcon,
//            title: pitch.prettyLocation,
            riseOnHover: true,
//            pitchId: pitch._id
          }).on('click', homeGroundWrapper);//.bindPopup(pitch.prettyLocation);

    var addMarker = function(i) {
      if (i < pitchCount) {
        // if (i % 500 === 0) map.markers.addLayers(map.markerArray);
        var pitch = pitches[i];
        Meteor.defer(function() {
          var newMarker = _.clone(baseMarker);
          newMarker._latLng = new L.LatLng(pitch.location.lat, pitch.location.lng);
          newMarker.options.pitchId = pitch._id;
          newMarker.options.title = pitch.prettyLocation;
          if (pitch._id === homeGroundId) {
            newMarker.options.icon = pitchIconSpinning;
            map.homeGroundMarker = newMarker;
          }
          map.markerArray.push(newMarker);
          Meteor.defer(addMarker.bind(null, i + 1));
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

  // ADD MARKERS WHEN PITCHES ARE READY (CAN'T USE CALLBACK AS WE DON'T KNOW WHEN SYNC WAS CALLED)
  Tracker.autorun(function(comp) {
    if (Pitches && Pitches.synced() && App.pitchSync) {
      if (App.pitchSync.removed.length + App.pitchSync.inserted.length > 0) {
        map.updateMarkers();
      }
      // ADD CIRCLE
      var center = user ? L.latLng(user.profile.player.center) : L.latLng(51.5073509, -0.12775829999998223),
          size = user ? user.profile.player.radius : 8000;
      map.circle = L.circle(center, size, {
        color: '#6D1AC0',
        fillColor: '#6D1AC0',
        fillOpacity: 0.4,
        className: 'pitchCircle'
      }).addTo(map);
      zoomPitch(App.currentLocation);
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

getFormData = function() {
  return formData;
}

function pitchesWithin(profile) {
  var pitches = [],
    lngFactor = 1 / 71470,
    latFactor = 1 / 111200,
    center = profile.player.center,
    radius = profile.player.radius;
  allPitches = Pitches.withinBounds(new L.latLngBounds(
    new L.latLng(center.lat - (radius * latFactor), center.lng - (radius * lngFactor)),
    new L.latLng(center.lat + (radius * latFactor), center.lng + (radius * lngFactor))
  ));
  allPitches.forEach(function(pitch) {
    if (new L.latLng(center).distanceTo(new L.latLng(pitch.location.lat, pitch.location.lng))) {
      pitches.push(pitch);
    }
  });
  return pitches;
}