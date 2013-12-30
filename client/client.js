Pitches = new Meteor.Collection("pitches");

pitchMap = window.pitchMap;
gc = null;
var myLocation, liveCircle, defaultLocation;

App = {subs: null};

myDep = function(initial) {
  this.value = initial;
  this.count = 0;
};

myDep.prototype = {
  dep: new Deps.Dependency(),
  get: function () {
    this.dep.depend();
    return this.value;
  },
  set: function (newValue){
    if (this.value !== newValue) {
      this.value = newValue;
      this.dep.changed();
      this.count++;
    }
    return this.value;
  },
  getKey: function(key) {
    this.dep.depend();
    if (key in this.value) return this.value[key];
    else return undefined;
  },
  setKey: function(key, newValue) {
    if (key in this.value && this.value[key] !== newValue) {
      this.value[key] = newValue;
      this.dep.changed();
      this.count++;
    }
    return this.value[key];
  }
};

function logTemplateEvents() {
  _.each(Template, function(template, name) {
    var oldCreated = template.created,
        oldDestroyed = template.destroyed;
        oldRendered = template.rendered;
    template.created = function() {
      console.log("Created: ", this); //_.filter(_.map(this.firstNode, function(a, b) { return b; }), function(a) { return typeof a === 'string' && a.slice(0, 7) === '_spark_'; }));
      oldCreated && oldCreated.apply(this, arguments);
    };
    template.rendered = function() {
      // console.log("Rendered: ", _.filter(_.map(this.firstNode, function(a, b) { return b; }), function(a) { return typeof a === 'string' && a.slice(0, 7) === '_spark_'; }));
      console.log("Rendering: ", Deps.active);
      oldRendered && oldRendered.apply(this, arguments);
    };
    template.destroyed = function() {
      console.log("Destroyed: ", this);
      oldDestroyed && oldDestroyed.apply(this, arguments);
    };    
  });
}


venues = new myDep([]);
mapCenter = new myDep([51.5080391, -0.12806929999999284]);
tabChoices = new myDep({playerTab: 'pitchData'});
circleChanged = new myDep(false);
mainOption = '/';
var days = [{name: "Sunday", code: 0}, {name: "Monday", code: 1}, {name: "Tuesday", code: 2}, {name: "Wednesday", code: 3}, {name: "Thursday", code: 4}, {name: "Friday", code: 5}, {name: "Saturday", code: 6}];

App.subs = {pitches: Meteor.subscribe('allpitches', {onReady: function() {}})};

initializeCircle = function() {
  initialize(true);
}

initialize = function(circle) {
  defaultLocation = new google.maps.LatLng(51, 0);
  var mapOptions = {
    zoom: 11,
    center: defaultLocation
  };
  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
      mapOptions);
  circleChanged.set(false);
  if (!gc) gc = new google.maps.Geocoder();
  if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.player) {
    defaultLocation = new google.maps.LatLng(Meteor.user().profile.player.center.nb, Meteor.user().profile.player.center.ob);
    mapCenter.set(defaultLocation);
    if (circle) {
      circleSize.set(Meteor.user().profile.player.size);
      $('#distanceWrite').val(circleSize.get()/100);
      $('#distanceRead').html(circleSize.get()/1000+'km');
      updateCircle();
    }
  }
  else {
    navigator.geolocation.getCurrentPosition(function(res) {
      var defaultLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
      if (circle) {
        mapCenter.set(defaultLocation);
        pitchMap.setCenter(defaultLocation);
        updateCircle();
        Meteor.call('pitchesWithin', {"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
          if (err || !venues) console.log(err);
          else venues.set(res);
        });
      }
    }, function() {
      window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.")
    });
    circleChanged.set(true);
  }
  var pitches = Pitches.find().fetch();
  for (var i=0; i < pitches.length; i++) {
    var marker = new google.maps.Marker({
      position: pitches[i].location,
      map: pitchMap,
      title:pitches[i].owner + " " + pitches[i].name,
      icon: 'images/soccerv2.png',
      pitch_ID: pitches[i]._id._str
    });
    if (!circle) {
      attachMarkerEvent(marker, function(m) {
        $('#homePitch input').val(m.title);
        $('#homePitch input').attr('id', m.pitch_ID);
      });
    }
  }
  document.getElementById("pitchMap").style.display = "block";
  google.maps.event.trigger(pitchMap, 'resize');
  pitchMap.setCenter(defaultLocation);
  if (circleSize) Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else if (venues) {
        venues.set(res);
      }
  });
}

function attachMarkerEvent(marker, callback) {
  var simpleCallBack = function() {callback(marker);};
  google.maps.event.addListener(marker, 'click', simpleCallBack);
}

function loadScript(circle) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  if (circle) script.src += 'Circle'
  if (window.google && window.google.maps) {
    initialize(circle);
  }
  else document.body.appendChild(script);
}

Handlebars.registerHelper("option", function(option) {
  if (mainOption) return Router.current(true).path === option;
  else return false;
});

Handlebars.registerHelper("tabChoice", function(key, value) {
  if (tabChoices) return tabChoices.get()[key] === value;
  else return false;  
});

Handlebars.registerHelper("service", function(network) {
  return Meteor.user() && 'services' in Meteor.user() ? network in Meteor.user().services : false;
});

Handlebars.registerHelper("email", function(level) {
  switch (level) {
    case 'verified':
      return Meteor.user().emails ? Meteor.user().emails[0].verified : false;
      break;
    case 'unverified':
      return Meteor.user().emails ? !Meteor.user().emails[0].verified : false;
      break;
    default:
      return Meteor.user().emails ? Meteor.user().emails[0].address : false;
  }
});

Template.pitchData.helpers({
  getVenues: function() {
    if (venues && venues.get()) return venues.get();
    else return []; 
  }
});

Template.playerDetails.events({
  'click #tabSpace div a': function(event, target) {
    tabChoices.setKey('playerTab', event.target.name);
  }
});

Template.pitchMapLarge.created = function() {
  window.circleSize = new myDep(8000);
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      loadScript(true);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

Template.pitchMapSmall.created = function() {
  window.circleSize = null;
  window.venues = null;
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      loadScript(false);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

Template.defineBounds.helpers({
  unmoved: function() {
    return !circleChanged.get();
  }
});
Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    circleChanged.set(true);
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
    updateCircle();
  },
  'click #saveBoundsButton': function() {
    circleChanged.set(false);
    Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.player': {center: mapCenter.get(), size: circleSize.get(), venues: venues.get().map(function(v) {return v._id;})}}});
    liveCircle.setOptions({ strokeColor: '#78db1c', fillColor: '#78db1c' });
  },
  'click #revertBoundsButton': function() {
    circleChanged.set(false);
    var thisUser = Meteor.user();
    if (thisUser && thisUser.profile && thisUser.profile.player) {
      circleSize.set(thisUser.profile.player.size);
      mapCenter.set(new google.maps.LatLng(Meteor.user().profile.player.center.nb, Meteor.user().profile.player.center.ob));
    }
    else {
      circleSize.set(8000);
      mapCenter.set(defaultLocation);            
    }
    updateCircle();
  }
});
Template.defineBounds.rendered = function() {
  $('#distanceWrite').val(circleSize.get()/100);
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10)/10 + 'km');
  var newWidth = parseInt($('#areaDetails').css('width'), 10) * 0.7;
  $('#pitchMap').css('width', newWidth);
  $('#pitchMap').css('margin-left', -newWidth/2);
};

Template.otherInfo.events({
  'keyup #homeGround': function(event, template) {
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      if (Pitches.findOne({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"})) {
        var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
        var pitchElement = '<div class="ui segment content"><div class="field"><div class="ui link list">';
        pitchCursor.forEach(function(pitch) {pitchElement += '<a class="pitchEntry item" id="' + pitch._id + '">' + pitch.owner + ' - ' + pitch.name + '</a>'});
        $('#matches').html(pitchElement + '</div></div></div>');
      }
   }
  },
  'click #homeGround': function(event, template) {
  },
  'click #teamSearchButton': function(event, template) {
    gc.geocode({
      address: $('#homeGround').val(),
      region: 'uk'
      },
      function(res) {
        if (res.length) pitchMap.panTo(res[0].geometry.location);
      }
    )
  },
  'click .pitchEntry': function(event) {
    var pitch = Pitches.findOne({'_id._str': event.target.id});
    if (pitch) {
      pitchMap.panTo(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
      $('#homePitch input').val(pitch.owner + ' - ' + pitch.name);
      $('#homePitch input').attr('id', pitch._id._str);      
    }
  }
});

Template.teamDetails.helpers({
  days: function() {
    return days;
  }
});
Template.teamDetails.events({
  'click #homePitch': function() {
    location.href = "#";
    location.href = "#otherInfo";
  },
  'click #weeklyCheckBox .checkbox': function(event) {
    if ($('#timeSection').is(":visible")) {
      $('#timeCheckBox .checkbox').click();
    }
    $('#daySection, #timeCheckBox').toggle({easing: 'swing', direction: 'right', duration: 500});
  },
  'click #timeCheckBox .checkbox': function(event) {
    $('#timeSection').toggle({easing: 'swing', direction: 'right', duration: 500});
  },
  'keydown #timeSection input[type="number"]': function(event) {
    if (event.keyCode > 57) return false;
  }
});
Template.teamDetails.rendered = function() {
  $(this.findAll('.ui.checkbox')).checkbox({verbose: true, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: true, debug: false, performance: false});
};

Template.playerForm.helpers({
  first_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.first_name : null;
  },
  last_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.last_name : null;
  }
})
Template.playerForm.events({
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
      });
    }
  },
  'click #twitterButton': function() {
    if (!('twitter' in Meteor.user().services)) {
      Meteor.loginWithTwitter({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
      });
    }
  }
});
Template.playerForm.created = function() {
}

Template.linkModal.events({
  'click #emailCancel': function() {
    $('.modal').filter(':visible').modal('hide');
/*    var linkModal = $('#linkModal')[0]
    Spark.finalize(linkModal);
    $(linkModal).empty();
    Deps.flush();
    venues.dep.changed();*/
  },
  'click #emailSubmit': function() {
    Meteor.call('emailExists', $('#emailEntry').val(), function(err, res) {
      if (res) {
        var duplicateEmail = $('#emailEntry').val();
        $('#linkModal').html(Template.duplicateEmail({email: duplicateEmail}));
      }
      else {
        Meteor.call('addEmailCredentials', {
          email: $('#emailEntry').val(), 
          srp: Package.srp.SRP.generateVerifier($('#passwordEntry').val())
        }, function(err, res) {
          if (!err) Meteor.call('sendVerificationEmail');
        });
        $('.modal').filter(':visible').modal('hide');
      }
    });
  }
});
Template.linkModal.rendered = function() {
  $('#linkModal').modal({
    onShow: function() {
      $('body').dimmer({
        debug: false,
        performance: false,
        verbose: false,
        onHide: function() {
          var linkModal = $('#linkModal')[0]
          Spark.finalize(linkModal);
          $(linkModal).empty();
          Deps.flush();
          venues.dep.changed();
        }
      });
    },
    onHide: function() {
      var linkModal = $('#linkModal')[0] 
      Spark.finalize(linkModal);
      $(linkModal).empty();
      Deps.flush();
      venues.dep.changed();
    },
    debug: false,
    performance: false,
    verbose: false
  });
};

//logTemplateEvents();

Deps.autorun(function(c) {
  if (mainOption === '/player') {
    if (liveCircle) {
      mapCenter.set(liveCircle.getCenter());
    }
    else {
      var populationOptions = {
        strokeColor: '#78db1c',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#78db1c',
        fillOpacity: 0.35,
        map: pitchMap,
        draggable: true,
        center: mapCenter.get(),
        radius: circleSize.get()
      };
      if (window.google) {
        liveCircle = new google.maps.Circle(populationOptions);
        google.maps.event.addListener(liveCircle, 'center_changed', function() {
          mapCenter.set(liveCircle.getCenter());
          liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
          circleChanged.set(true);
        });
      }
    }
  }
});
Deps.autorun(function() {
  if (mapCenter.get().nb && mapCenter.get().ob && circleSize && circleSize.get() && App.subs.pitches.ready()) {
    if (!this.count) this.count = 1;
    else this.count++;
    Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else if (venues) {
        venues.value = res;
      }
    });
  }
});
Deps.autorun(function() {
  if (Router && Router.current(true)) mainOption = Router.current(true).path;
})

function updateCircle() {
  if (liveCircle) liveCircle.setMap(null);
  liveCircle = null;
  var populationOptions = {
    strokeColor: '#78db1c',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#78db1c',
    fillOpacity: 0.35,
    map: pitchMap,
    draggable: true,
    center: mapCenter.get(),
    radius: circleSize.get()
  };
  if (circleChanged.get()) {
    populationOptions.strokeColor = '#db781c';
    populationOptions.fillColor = '#db781c';
  }
  if (window.google) {
    liveCircle = new google.maps.Circle(populationOptions);
    google.maps.event.addListener(liveCircle, 'center_changed', function() {
      mapCenter.set(liveCircle.getCenter());
      liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
      circleChanged.set(true);
    });
  }
}

getData = function() {
  console.log(circleChanged.get());
}