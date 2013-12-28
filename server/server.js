/*
Login system amendment to allow addition of extra services to a given account.
*/
var crypto = Npm.require('crypto');
var hashLoginToken = function (loginToken) {
  var hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

orig_updateOrCreateUserFromExternalService = Accounts.updateOrCreateUserFromExternalService;
Accounts.updateOrCreateUserFromExternalService = function(serviceName, serviceData, options) {
  var loggedInUser = Meteor.user();
  if (serviceName === "facebook" && loggedInUser) {
  	var existingFBUser = Meteor.users.findOne({"services.facebook.id": serviceData.id});
  	if (existingFBUser && existingFBUser._id !== loggedInUser._id) {
  		var stampedToken = Accounts._generateStampedLoginToken();
	    var setAttrs = {};
	    _.each(existingFBUser.services.facebook, function(value, key) {
	      	setAttrs["services.facebook." + key] = value;
	    });
  		Meteor.users.remove(existingFBUser._id);
	    Meteor.users.update(
	      	loggedInUser._id, {
	      		$set: setAttrs,
	       		$push: {
	       			'services.resume.loginTokens': stampedToken
//	       	_.extend(_.omit(stampedToken, 'token'), {hashedToken: hashLoginToken(stampedToken.token)})
	        	},
	       		$push: {
	       			'services.resume.loginTokens': existingFBUser.services.resume.loginTokens
	   			}
	   		}
	   	);
	    return {
	      token: stampedToken.token,
	      id: loggedInUser._id,
	      tokenExpires: Accounts._tokenExpiration(stampedToken.when)
	    };
  	}
  }
  if (serviceName === "twitter" && loggedInUser) {
  	var existingTwitterUser = Meteor.users.findOne({"services.twitter.id": serviceData.id});
  	if (existingTwitterUser && existingTwitterUser._id !== loggedInUser._id) {
  		var stampedToken = Accounts._generateStampedLoginToken();
	    var setAttrs = {};
	    _.each(existingTwitterUser.services.twitter, function(value, key) {
	      	setAttrs["services.twitter." + key] = value;
	    });
  		Meteor.users.remove(existingTwitterUser._id);
	    Meteor.users.update(
	      	loggedInUser._id, {
	      		$set: setAttrs,
	       		$push: {
	       			'services.resume.loginTokens': stampedToken
//	       	_.extend(_.omit(stampedToken, 'token'), {hashedToken: hashLoginToken(stampedToken.token)})
	        	},
	       		$push: {
	       			'services.resume.loginTokens': existingTwitterUser.services.resume.loginTokens
	   			}
	   		}
	   	);
	    return {
	      token: stampedToken.token,
	      id: loggedInUser._id,
	      tokenExpires: Accounts._tokenExpiration(stampedToken.when)
	    };
  	}
  }
  if (loggedInUser && typeof(loggedInUser.services[serviceName]) === "undefined") {
    var setAttr = {};
    setAttr["services." + serviceName] = serviceData;
    Meteor.users.update(loggedInUser._id, {$set: setAttr});
  }
  return orig_updateOrCreateUserFromExternalService.apply(this, arguments);
};
/* End of Accounts Section */


SecureData = new Meteor.Collection("securedata");
Pitches = new Meteor.Collection("pitches");

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;
var twitterconfig = SecureData.findOne({Name: 'twitterconfig'}).Value;

Meteor.startup(function() {
	Pitches._ensureIndex({ location : "2d" });
	Future = Npm.require('fibers/future');
});

Meteor.publish('pitches', function(loc, prox) {
	return Pitches.find({location: {$near: loc}});
});

Meteor.publish('allpitches', function() {
	return Pitches.find();
});

Accounts.loginServiceConfiguration.remove({
    service: "facebook"
});
Accounts.loginServiceConfiguration.remove({
    service: "twitter"
});
if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
	Accounts.loginServiceConfiguration.insert(facebookprod);
}
else {
	Accounts.loginServiceConfiguration.insert(facebooklocal);
	Accounts.loginServiceConfiguration.insert(twitterconfig);	
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
	},
	addEmailCredentials: function(details) {
		if (Meteor.users.findOne({'emails.address': details.email})) {
			return 'Email already exists in database';
		}
		var loggedInUser = Meteor.user(),
			passwordService = {srp: details.srp},
			fut = new Future();;
		Meteor.users.update(loggedInUser._id, {
			$set: {
				'emails': [{
					address: details.email,
					verified: false
				}],
				'services.password' : passwordService
			}
		}, function(err, num) {
			if (err) fut['return'](err);
			else fut['return']([null, num]);
		});
		return fut.wait();
	},
	emailExists: function(email) {
		return !!Meteor.users.findOne({'emails.address': email});
	},
	evaluate: function(string) {
		return eval(string);
	}
});