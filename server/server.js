SecureData = new Meteor.Collection("securedata");
Pitches = new Meteor.Collection("pitches");

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;

Meteor.startup(function() {
	Pitches._ensureIndex({ location : "2d" });
});

Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Accounts.loginServiceConfiguration.remove({
    service: "facebook"
});
if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
	Accounts.loginServiceConfiguration.insert(facebookprod);
}
else {
	Accounts.loginServiceConfiguration.insert(facebooklocal);	
}

Meteor.methods({
	pitchesWithin: function(center, distance) {
		var ratio = 6.283184 / 360;
		var lon = center.lon * ratio;
		var lat = center.lat * ratio;
		var width = Math.acos(Math.pow(Math.cos(lat), 2) * Math.cos(ratio) + Math.pow(Math.sin(lat), 2)) * 6371 / 111;
		var d2 = Math.pow(distance/111000, 2);
		return Pitches.find().fetch().filter(function(p) {return (Math.pow(p.location.lat - center.lat, 2) + Math.pow((p.location.lng - center.lng) * width, 2) < d2);});
/*		return Pitches.find({'location': {'$near': [center.lat, center.lon], '$maxDistance': distance/111000}}).fetch();*/
/*		return Pitches.find({'location': {'$within' : 
		    {'$center' : [[center.lat, center.lon], distance/111000] }}}, {
		    limit: 100
	  	}).fetch();*/
	}
});