Pitches = new Meteor.Collection("pitches");

pitchMap = window.pitchMap;
gc = null;
myLocation = null;

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
}

function loadScript() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  document.body.appendChild(script);
}

Template.pitchMap.created = function() {
  loadScript();
}

Template.signUpBox.created = function() {
	$('html').css('background', 'url(footypitch.png) no-repeat center center fixed')
	.css('background-size','cover')
	.css('-o-background-size','cover')
	.css('-moz-background-size','cover')
	.css('-webkit-background-size','cover');
};

Deps.autorun(function() {
	if (Meteor.userId()) $('html').css('background', '');
});
Deps.autorun(function() {

});

