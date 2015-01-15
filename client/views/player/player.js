var MARKER_DELAY = 1000;

var formData = {
    homeGround: new SuprSubDep(),
    pitches: new SuprSubDep([])
  },


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
    if (target.val()) Meteor.users.update(Meteor.userId(), update);
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

Template.pitchMapLarge.destroyed = function() {

  map.remove();

};

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