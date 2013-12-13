Pitches = new Meteor.Collection("pitches");

pitchMap = window.pitchMap;
var gc = null;
var myLocation = null;
var liveCircle = null;

myDep = function(initial) {
  this.value = initial;
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
    }
    return this.value;
  }
};

mapCenter = new myDep([51.5080391, -0.12806929999999284]);
mainOption = '/home';

initializeCircle = function() {
  initialize(true);
}

initialize = function(circle) {
  var defaultLocation = new google.maps.LatLng(51, 0);
  var mapOptions = {
    zoom: 11,
    center: defaultLocation
  };
  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
      mapOptions);
  if (!gc) gc = new google.maps.Geocoder();
  if (Meteor.user() && Meteor.user().profile.player) {
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
        if (liveCircle) liveCircle.setCenter(defaultLocation);
        Meteor.call('pitchesWithin', {"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
          if (err) console.log(err);
          else venues.set(res);
        });
      }
    }, function() {
      window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.")
    });
  }
  var pitches = Pitches.find().fetch();
  for (var i=0; i < pitches.length; i++) {
    var marker = new google.maps.Marker({
      position: pitches[i].location,
      map: pitchMap,
      title:pitches[i].owner + " " + pitches[i].name,
      icon: 'images/soccerv2.png'
    });
  }
  google.maps.event.addListener(pitchMap, 'center_changed', function() {
  });
  document.getElementById("pitchMap").style.display = "block";
  google.maps.event.trigger(pitchMap, 'resize');
  pitchMap.setCenter(defaultLocation);
}

function loadScript(circle) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  if (circle) script.src += 'Circle'
  if (window.google && window.google.maps) {
    console.log(document.getElementById('pitchMap'), pitchMap);
    initialize(circle);
  }
  else document.body.appendChild(script);
}

Handlebars.registerHelper("option", function(option) {
    if (mainOption) return Router.current(true).path === option;
    else return false;
});

Template.pitchData.helpers({
  venues: function() {
    return venues.get(); 
  }
});

Template.pitchMapLarge.created = function() {
  window.circleSize = new myDep(8000);
  window.venues = new myDep([]);
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

Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
    updateCircle();
  },
  'click #cancelOrSave .green.button': function() {
    Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.player': {center: mapCenter.get(), size: circleSize.get(), venues: venues.get().map(function(v) {return v._id;})}}});
  }
});
Template.defineBounds.rendered = function() {
  $('#distanceWrite').val(circleSize.get()/100);
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10)/10 + 'km');
};

Template.otherInfo.events({
  'keyup #homeGround': function(event, template) {
    console.log(event.target.value.length);
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
      var pitchElement = "<ul>";
      pitchCursor.forEach(function(pitch) {pitchElement += '<li class="pitchEntry" id="' + pitch._id + '">' + pitch.owner + ' - ' + pitch.name + '</li>'});
      $('#matches').html(pitchElement);
   }
  },
  'click #homeGround': function(event, template) {
  },
  'click .pitchEntry': function(event) {
    console.log(event);
    var pitch = Pitches.findOne({'_id._str': event.target.id});
    if (pitch) pitchMap.setCenter(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
  }
});

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
        });
      }
    }
  }
});
Deps.autorun(function() {
  if (mapCenter.get().nb && mapCenter.get().ob && circleSize && circleSize.get()) {
    Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else if (venues) venues.set(res);
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
  if (window.google) {
    liveCircle = new google.maps.Circle(populationOptions);
    google.maps.event.addListener(liveCircle, 'center_changed', function() {
      mapCenter.set(liveCircle.getCenter());
    });
  }
}