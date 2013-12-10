Pitches = new Meteor.Collection("pitches");

pitchMap = window.pitchMap;
gc = null;
myLocation = null;
liveCircle = null;

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
circleSize = new myDep(1);
venues = [];

initialize = function() {

  myLocation = new google.maps.LatLng(51.5080391, -0.12806929999999284);
  var mapOptions = {
    zoom: 11,
    center: myLocation
  };
  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
      mapOptions);
  gc = new google.maps.Geocoder();
  navigator.geolocation.getCurrentPosition(function(res) {
    myLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
    pitchMap.setCenter(myLocation);
  }, function() {
    window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.")
  });
  var pitches = Pitches.find().fetch();
  for (var i=0; i < pitches.length; i++) {
    var marker = new google.maps.Marker({
      position: pitches[i].location,
      map: pitchMap,
      title:pitches[i].owner + " " + pitches[i].name
    });
  }
  google.maps.event.addListener(pitchMap, 'center_changed', function() {
    mapCenter.set(pitchMap.getCenter());
  });
}

function loadScript() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  document.body.appendChild(script);
}

Template.pitchData.helpers({
  center: function() {
    return [mapCenter.get(), mapCenter.get().ob, mapCenter.get().nb];
  },
  venues: function() {
    return venues; 
  }
});

Template.pitchMap.created = function() {
  loadScript();
};

Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10);
    circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
  }
});
Template.defineBounds.rendered= function() {
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10) / 10);
  circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
};


Deps.autorun(function() {
  var populationOptions = {
    strokeColor: '#0000FF',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#0000FF',
    fillOpacity: 0.35,
    map: pitchMap,
    center: mapCenter.get(),
    radius: circleSize.get()
  };
  if (liveCircle) {
    liveCircle.setMap(null);
  }
  if (window.google) liveCircle = new google.maps.Circle(populationOptions);
});
Deps.autorun(function() {
  if (mapCenter.get().nb && mapCenter.get().ob && circleSize.get()) {
    Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lon": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else venues = res;
    });
  }
});

function updateCircle() {
  var populationOptions = {
    strokeColor: '#0000FF',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#0000FF',
    fillOpacity: 0.35,
    map: pitchMap,
    center: pitchMap.getCenter(),
    radius: parseInt($('#distanceWrite').val(), 10)*100
  };
  if (liveCircle) {
    liveCircle.setMap(null);
  }
  liveCircle = new google.maps.Circle(populationOptions);
}
