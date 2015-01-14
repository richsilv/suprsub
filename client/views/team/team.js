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

  'keyup [data-field="team-name"]': function(event) {
    formData.currentTeam.setKey('name', event.currentTarget.value);
  },

  'submit': function(event) {
    formData.teamInput.set(null);
    event.preventDefault();

  },

  'change [data-field="hour"]': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setHours(event.currentTarget.valueAsNumber);
    event.currentTarget.value = App.padZeros(event.currentTarget.value, 2);
    formData.currentTeam.setKey('time', newTime);
  },

  'change [data-field="minute"]': function(event) {
    var newTime = formData.currentTeam.getKey('time');
    newTime.setMinutes(event.currentTarget.valueAsNumber);
    event.currentTarget.value = App.padZeros(event.currentTarget.value, 2);
    formData.currentTeam.setKey('time', newTime);
  },

  'click [data-action="save-team"]': function(event, template) {
    if (formData.currentTeam.get().invalid.length) {
      formData.showErrors.set(true);
      Meteor.setTimeout(function() {
        formData.showErrors.set(false);
      }, 1000);
    } else {
      var fields = template.$('.field');
      fields.addClass('accepted');
      var newId = Teams.insert(_.omit(formData.currentTeam.get(), 'invalid'), function() {
        Meteor.setTimeout(function() {
          fields.removeClass('accepted');
        }, 500);
      });
      Meteor.users.update(Meteor.userId(), {
          $push: {
            'profile.team._ids': newId
          },
          $set: {
            'profile.team.default': newId
          }
        },
        function() {
          if (App.countKeys(formData.teamsArray)) formData.teamInput.set(false);
        });
    }
  },

  'click [data-action="set-default"]': function() {

    Meteor.users.update(Meteor.userId(), {
      $set: {
        'profile.team.default': formData.currentTeam.getKey('_id')
      }
    });

  },

  'click [data-action="add-team"]': function() {

    if (formData.currentTeam.getKey('_id')) {
      SemanticModal.confirmModal({
        header: 'Create New Team',
        message: "This will create a new team with you as the sole player.  You'll need to hit the <strong>save</strong> button when you've enter the details, and then you'll be able to invite your teammates and preferred SuprSubs to join",
        callback: function() {
          formData.currentTeam.set(defaultTeam());
          formData.teamInput.set(true);
        }
      });
    }

  },

  'click [data-function="home-ground"]': function() {

    var currentTeam = formData.currentTeam.get();
    zoomPitch();

  },

  'click [data-action="leave-team"]': function() {

    var solePlayer = (formData.currentTeam.getKey('players').length < 2) && (formData.currentTeam.getKey('players').indexOf(Meteor.userId()));

    if (formData.currentTeam.getKey('_id')) {
      SemanticModal.confirmModal({
        header: 'Are you sure?',
        message: 'Are you sure you want to leave this team?' + (solePlayer ? '  <strong>The team will be deleted as you are the only registered player!</strong>' : ''),
        callback: function() {
          Meteor.users.update(Meteor.userId(), {
            $pull: {
              'profile.team._ids': formData.currentTeam.getKey('_id')
            }
          });
          Meteor.users.update(Meteor.userId(), {
            $pull: {
              'profile.team._ids_ringers': formData.currentTeam.getKey('_id')
            }
          });
        }
      });
    }

  },

  'click [data-action="delete-team"]': function() {

    if (formData.currentTeam.getKey('_id')) {
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

  }

});

Template.teamTopLevel.helpers({

  teamDropdown: function() {
    return !formData.teamInput.get() && App.countKeys(formData.teamsArray.get()) > 1;
  },

  teamName: function() {
    return formData.currentTeam.getKey('name');
  },

  teams: function() {
    return _.values(formData.teamsArray.get());
  },

  default: function() {
    return Meteor.user() && Meteor.user().profile.team.default === formData.currentTeam.getKey('_id');
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

Template.teamDropDown.events({

  'dblclick [data-field="team-choice"]': function() {
    formData.teamInput.set(true);
    Tracker.flush();
    $('#teamName').focus();
  },

  'blur [data-field="team-choice"], keydown [data-field="team-choice"]': function(event) {
    if (event.keyCode === 13 || event.type === 'blur') {
      formData.teamInput.set(false);
    }
    return false;
  }

});

Template.teamSecondLevel.helpers({
  teamId: function() {
    return formData.currentTeam.getKey('_id');
  }
});


Template.playerTable.helpers({
  tableHeader: function() {
    return App.tabChoices.getKey('playersRingers').capitalize();
  },

  tableInfo: function() {
    var users,
        selection = App.tabChoices.getKey('playersRingers');
    switch (selection) {
      case 'players':
        users = Meteor.users.find({
          'profile.team._ids': formData.currentTeam.getKey('_id')
        });
        break;
      case 'ringers':
        users = Meteor.users.find({
          'profile.team._ids_ringers': formData.currentTeam.getKey('_id')
        });
      default:
    }
    return users;
  }
});

Template.playerButtons.events({
  'click [data-tab="playersRingers"]': function(event, template) {
    var target = $(event.currentTarget);
    App.tabChoices.setKey(target.data('tab'), target.data('tab-selection'));
  },

  'click [data-action="send-code"]': function(event, template) {
    SemanticModal.generalModal('chooseCodeTypeModal');
  },

  'click [data-action="join-team"]': function(event, template) {
    SemanticModal.generalModal('joinTeamModal');
  }
});

Template.otherInfo.helpers({

  pitchMatches: function() {
    return formData.pitchMatches.get();
  }

});

Template.otherInfo.events({

  'keyup [data-field="home-ground-search"]': function(event) {
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

  'click [data-action="search"], submit': function(event, template) {
    if (!App.geocoder) return false;
    event.preventDefault();

    var params = {
      address: template.$('[data-field="home-ground-search"]').val(),
      componentRestrictions: {
        country: 'gb'
      }
    }
    App.geocoder.geocode(params, function(res, status) {
      if (res && res.length) {
        GoogleMaps.maps.pitchMap.instance.panTo(res[0].geometry.location);
        GoogleMaps.maps.pitchMap.instance.setZoom(15);
      }
    });
  },

  'click #pitchMatches .item': function(event) {
    setHomeGround(this);
    GoogleMaps.maps.pitchMap.instance.panTo(new google.maps.LatLng(this.location.lat, this.location.lng));
    GoogleMaps.maps.pitchMap.instance.setZoom(15);
  }

});

Template.pitchMap.helpers({
  mapOptions: function() {
    return {
      center: new google.maps.LatLng(51.508039, -0.128069),
      zoom: 10
    };
  }
});

Template.chooseCodeTypeModal.events({

  'click [data-action="invite-teammates"]': function () {
    var teamCode = formData.currentTeam.getKey('_id');
    $('.ui.modal').modal('hide');
    Meteor.call('comms/sendTeamCode', teamCode, function(err, res) {
      if (!err && res  && res.length) {
        SemanticModal.generalModal("teammateInvitationModal", {
          contacts: res.join(' and '),
          teamCode: teamCode
        });
      }
    });
  },

  'click [data-action="invite-suprsubs"]': function () { 
    var ringerCode = formData.currentTeam.getKey('ringerCode');
    $('.ui.modal').modal('hide');
    Meteor.call('comms/sendRingerCode', ringerCode, function(err, res) {
      if (!err && res  && res.length) {
        SemanticModal.generalModal("teammateInvitationModal", {
          contacts: res.join(' and '),
          teamCode: ringerCode
        });
      }
    });
  }

});

Template.joinTeamModal.events({
  'submit': function (event, template) {
    App.team.join(template.$('[data-field="team-code"]').val());
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
  this.$('[data-field="friendly-competitive"]').flipbox({
    onChange: function(value) {
      currentTeam.setKey('competitive', value);
    }
  });

  this.$('[data-field="game-format"]').dropdown({
    onChange: function(val) {
      currentTeam.setKey('format', val);
    }
  });

  this.$('[data-field="day-choice"]').dropdown({
    onChange: function(val) {
      var newTime = currentTeam.getKey('time');
      newTime.setDate(val + 1);
      currentTeam.setKey('time', newTime);
    }
  });

  // DATA BINDING (INSIDE TEMPLATE SO THAT IT'S TORN DOWN AUTOMATICALLY)
  // KEEP TEAM LIST UP TO DATE
  this.autorun(function(c) {
    var user = Meteor.user();
    formData.teamsArray.dep.depend();

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
      } else {
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
        nameMatch = /[ A-Za-z0-9;#\.\\\+\*\?\[\]\(\)\{\}\=\!\<\>\:\-\']+/.exec(team.name);

      if (!(nameMatch && nameMatch[0] === team.name)) invalid.push('name');
      if (!team.format) invalid.push('format');
      if ($.isEmptyObject(formData.homeGround.get())) invalid.push('homeGround');

      formData.currentTeam.setKey('invalid', invalid);

    });

  });

  // UPDATE FIELDS ON CHANGE OF DATA

  this.autorun(function(c) {
    _this.$('[data-field="friendly-competitive"]').flipbox('set choice', currentTeam.getKey('competitive'));
  });

  this.autorun(function(c) {
    var format = currentTeam.getKey('format');

    if (format) {
      _this.$('[data-field="game-format"]').dropdown('set value', format);
      _this.$('[data-field="game-format"]').dropdown('set selected', format);
    } else {
      _this.$('[data-field="game-format"]').dropdown('restore defaults');
    }
  });

  this.autorun(function(c) {
    var time = currentTeam.getKey('time');

    if (time) {
      _this.$('[data-field="day-choice"]').dropdown('set value', time.getDay() - 1);
      _this.$('[data-field="day-choice"]').dropdown('set selected', time.getDay() - 1);
    }
  });

  this.autorun(function(c) {
    var team = formData.currentTeam.get();
    if (team) {
      _this.$('[data-field="team-choice"]').dropdown('set value', team._id);
      _this.$('[data-field="team-choice"]').dropdown('set selected', team._id);
      _this.$('[data-field="team-choice"]').dropdown('hide');
    }
  });

  // RESUBSCRIBE TO PLAYER LIST

  this.autorun(function(c) {
    Meteor.subscribe('teammates', formData.teamsArray.get());
  });

};

Template.Team.destroyed = function() {

  this.$('.ui.flipbox').flipbox('destroy');
  this.$('.ui.dropdown').dropdown('destroy');

};

Template.teamDropDown.rendered = function() {

  var _this = this,
    currentTeam = formData.currentTeam;

  this.$('[data-field="team-choice"]').dropdown({
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
    _this.$('[data-field="team-choice"]').dropdown('set selected', currentTeam.getKey('_id'));
  });
}

Template.pitchMap.created = function() {

  var _this = this;

  if (!App.geocoder) App.geocoder = new google.maps.Geocoder();

  GoogleMaps.ready('pitchMap', function(map) {
    var waitForGeo = Tracker.autorun(function(c) {
          var location = Geolocation.latLng(),
              homeGround = formData.homeGround.get();
          if (!_.isEmpty(homeGround)) {
            map.instance.panTo(new google.maps.LatLng(homeGround.location.lat, homeGround.location.lng));
            map.instance.setZoom(15);
            c.stop();
          }
          else if (location) {
            map.instance.panTo(location);
            App.currentLocation = location;
          }
        });

    map.markers = {};
    map.iw = new google.maps.InfoWindow();

    var setAndShowInfoWindow = function(content) {
      map.iw.setContent('<div class="info-window">' + content + '</div>');
      map.iw.open(map.instance, this);
    }

    Meteor.setTimeout(waitForGeo.stop.bind(waitForGeo), 10000);

    var iconProto = {
          path: GoogleMaps.Marker.markerShapes['MAP_PIN'],
          fillColor: '#1bc01b',
          fillOpacity: 1,
          strokeColor: '#444',
          strokeWeight: 1,
          scale: 0.5
        }

    if (!App.markers || !App.markers.length) {
      App.markers = [];
      Pitches.find().forEach(function(pitch) {

        var thisMarker = new GoogleMaps.Marker({
          cursor: 'pointer',
          zIndex: 9,
          icon: iconProto,
          title: pitch.prettyLocation,
          position: pitch.location,
          label: '<i class="icon-football"></i>'
        });      
        google.maps.event.addListener(thisMarker, 'mouseover', setAndShowInfoWindow.bind(thisMarker, pitch.prettyLocation));
        google.maps.event.addListener(thisMarker, 'click', setHomeGround.bind(map, pitch));
        map.markers[pitch._id] = thisMarker;
        App.markers.push(thisMarker);
      });
    }
    map.markerClusterer = new GoogleMaps.MarkerClusterer(map.instance, App.markers, {maxZoom: 14});
  });

};

Template.pitchMap.rendered = function() {

  var _this = this;
  this.map = GoogleMaps.maps.pitchMap;

};

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
  if (typeof pitch === 'string') pitch = Pitches.findOne({
    _id: pitch
  });
  var thisPitchId = pitch && pitch._id;
  if (!pitch || (formData.currentTeam.value.homeGround === thisPitchId)) return false;
  formData.currentTeam.setKey('homeGround', pitch._id);
  formData.currentTeam.dep.changed();
}

function zoomPitch(pitch) {
  if (typeof pitch === 'string') pitch = Pitches.findOne(pitch);
  if (!pitch) pitch = formData.homeGround.get();
  if (!pitch) return false;

  var map = GoogleMaps.maps.pitchMap.instance;

  map.panTo(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
  map.setZoom(15);

}

// GLOBAL NAMESPACE

App.team = {
  join: function(code) {
    Meteor.call('team/join', code, function(err, res) {
      if (err) {
        SemanticModal.confirmModal({
          header: 'Could not join team',
          message: err.details,
          noButtons: true
        })
      }
      else {
        SemanticModal.confirmModal({
          header: 'Congratulations!',
          message: 'You have joined the team <strong>' + res.team + '</strong> as a ' + res.type + '.',
          noButtons: true
        })
      }
    });
  },
  getHomeGround: function() {
    return formData.homeGround.get();
  }
}