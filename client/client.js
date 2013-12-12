Pitches = new Meteor.Collection("pitches");

pitchMap = window.pitchMap;
var gc = null;
var myLocation = null;
var liveCircle = null;
var mainOption = 'player';

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
circleSize = new myDep(8000);
venues = new myDep([]);

mapCenter.set = function(newValue){
  if (this.value !== newValue) {
    this.value = newValue;
    this.dep.changed();
//    console.log(this, printStackTrace())
  }
  return this.value;  
}

initialize = function() {

  var defaultLocation = new google.maps.LatLng(51, 0);
  var mapOptions = {
    zoom: 11,
    center: defaultLocation
  };
  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
      mapOptions);
  gc = new google.maps.Geocoder();
  if (Meteor.user().profile.player.center) {
    pitchMap.setCenter(new google.maps.LatLng(Meteor.user().profile.player.center.nb, Meteor.user().profile.player.center.ob));  
    mapCenter.set(pitchMap.getCenter());
    circleSize.set(Meteor.user().profile.player.size);
    $('#distanceWrite').val(circleSize.get()/100);
    $('#distanceRead').html(circleSize.get()/1000+'km'); 
  }
  else {
    navigator.geolocation.getCurrentPosition(function(res) {
      var myLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
      mapCenter.set(myLocation);
      if (liveCircle) liveCircle.setCenter(myLocation);
      pitchMap.setCenter(myLocation);
      Meteor.call('pitchesWithin', {"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
        if (err) console.log(err);
        else venues.set(res);
      });
    }, function() {
      window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.")
    });
  }
  var pitches = Pitches.find().fetch();
  for (var i=0; i < pitches.length; i++) {
    var marker = new google.maps.Marker({
      position: pitches[i].location,
      map: pitchMap,
      title:pitches[i].owner + " " + pitches[i].name
    });
  }
  mapCenter.set(pitchMap.getCenter());
  google.maps.event.addListener(pitchMap, 'center_changed', function() {
  });
}

function loadScript() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  document.body.appendChild(script);
  script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = "https://raw.github.com/stacktracejs/stacktrace.js/master/stacktrace.js";
  document.body.appendChild(script);
}

Template.topbar.helpers({
  mainOption: function(option) {
    return mainOption === option;
  }
})

Template.pitchData.helpers({
/*  center: function() {
    return [mapCenter.get(), mapCenter.get().ob, mapCenter.get().nb];
  },*/
  venues: function() {
    return venues.get(); 
  }
});

Template.pitchMap.created = function() {
  loadScript();
};

Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
    if (liveCircle) liveCircle.setMap(null);
    liveCircle = null;
    var populationOptions = {
      strokeColor: '#0000FF',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#0000FF',
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
  },
  'click #cancelOrSave .green.button': function() {
    Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.player': {center: mapCenter.get(), size: circleSize.get(), venues: venues.get().map(function(v) {return v._id;})}}});
  }
});
Template.defineBounds.rendered= function() {
  $('#distanceWrite').val(circleSize.get()/100);
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10)/10 + 'km');
};


Deps.autorun(function() {
  if (liveCircle) {
    mapCenter.set(liveCircle.getCenter());
  }
  else {
    var populationOptions = {
      strokeColor: '#0000FF',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#0000FF',
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
});
Deps.autorun(function() {
  if (mapCenter.get().nb && mapCenter.get().ob && circleSize.get()) {
    Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else venues.set(res);
    });
  }
});