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

Accounts.config({
  sendVerificationEmail: true,
  forbidClientAccountCreation: false
});
/* End of Accounts Section */


SecureData = new Meteor.Collection("securedata");
Pitches = new Meteor.Collection("pitches");

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;
var twitterconfig = SecureData.findOne({Name: 'twitterconfig'}).Value;
var dictionary = JSON.parse(Assets.getText("dictionary.json"));
var stateMap = JSON.parse(Assets.getText("statemap.json"));
var uselessTokens = JSON.parse(Assets.getText("uselesstokens.json"));

Meteor.startup(function() {
	Pitches._ensureIndex({ location : "2d" });
	Future = Npm.require('fibers/future'),
	Natural = Npm.require('natural'),
	Tokenizer = new Natural.WordTokenizer();

});

Accounts.onCreateUser(function(options, user) {
//	console.log(user);
	if ('facebook' in user.services) {
		if (options.profile) user.profile = _.extend(options.profile, {
			first_name: user.services.facebook.first_name,
			last_name : user.services.facebook.last_name,
			contact: [1]
			});
		else user.profile = {
			first_name: user.services.facebook.first_name,
			last_name : user.services.facebook.last_name,
			contact: [1]
			};
	}
	else if ('twitter' in user.services) {
		if (options.profile && 'name' in options.profile) {
			names = divideName(options.profile.name);
			user.profile = _.extend(options.profile, {
				first_name: names[0],
				last_name: names[1],
				contact: [0]
			});
		}
		else user.profile = {contact: [0]};
	}
	else {
		user.profile = _.extend(options.profile, {contact: [2]});
	}
	return user;
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
	sendVerificationEmail: function() {
		Accounts.sendVerificationEmail(Meteor.userId());
	},
	removeCurrentUser: function() {
        Meteor.users.remove(Meteor.userId());
	},
	appendNameFromTwitter: function() {
		return twitterNameFromId(function(name) {
			return divideName(updateNames, name);
		});
	},
	analysePosting: function(string) {
		var tokens = _.map(Tokenizer.tokenize(string), function(token) {return token.toLowerCase();});
		return (null, tokens);
	},
	evaluate: function(string) {
		return eval(string);
	}
});

function twitterNameFromId(callback, id) {
	var thisUser = Meteor.user()
	if (!'twitter' in thisUser.services) return null;
	if (!id) id = thisUser.services.twitter.id;
	Twit = new TwitMaker({
	    consumer_key:         twitterconfig.consumerKey,
	    consumer_secret:      twitterconfig.secret,
	    access_token:         thisUser.services.twitter.accessToken,
	    access_token_secret:  thisUser.services.twitter.accessTokenSecret
	});
	Twit.get('users/show', { 'user_id': id }, function(err, res) {
		if (!err) {
			console.log("Splitting " + res.name);
			callback(res.name);
		}
		else return err;
	});
}

function divideName(name, callback) {
	if (callback) callback([name.substring(0, name.indexOf(' ')), name.substring(name.indexOf(' ')+1)]);
	else return [name.substring(0, name.indexOf(' ')), name.substring(name.indexOf(' ')+1)];
}

function updateNames(names) {
	var thisUser = Meteor.user();
	if (user.profile.first_name && user.profile.last_name) return false;
	Meteor.users.update(thisUser._id, {$set: {'profile.first_name': names[0], 'profile.last_name': names[1]}}, function(err, num) {
		console.log(err, num);
		if (err) return err;
		if (num) return true;
	});
}

function categoriseToken(token) {
	var output = {code: -1};
	var currentMatch = fuzzyMatch(token, dictionary);
	output.code = currentMatch ? currentMatch : -1;
	if (output.code > 0) {
		if (output.code < 5) return output;
		switch (output.code) {
			case 5:
			output.data = fuzzyMatch(token, dayDictionary);
			return output;
			break;
			default:
			output.data = fuzzyMatch(token, numberDictionary);
			return output;
		}
	}
}

function fuzzyMatch(token, dict) {
	var bestMatch = 0, match = null;
	for (var currentKey in dict) {
		var thisDistance = Natural.JaroWinklerDistance(token, currentKey);
		if (thisDistance >= 0.9 && thisDistance > bestMatch) match = dictionary[currentKey];
	}
	return match;	
}

function stripUseless(tokens) {
	return _.filter(tokens, function(token) {return !uselessTokens[token.code]});
}

function parseRequest(tokens) {
	var richToken = [],
		requestData = {
			players: null,
			date: null,
			time: null,
			location: null
		},
		state = 0;
	for (var i = 0, l = tokens.length; i < l; i++) {
		var k = categoriseToken(tokens[i]);
		if (k.code < 0) return "cannot parse token " + tokens[i];
		else {
			richTokens[i].code = k.code;
			richTokens[i].data = k.data;
		}
	}
	for (var i = 0, l = richTokens.codes.length; i < l; i++) {
		if (richTokens[i].code in stateMap[state]) state = stateMap[state][richTokens[i].codes];
		else return "cannot move from state " + state + " with token code " + richTokens[i].code;
	};
	if (!'-1' in stateMap[state]) return "cannot end in state " + state;
	richTokens = stripUseless(richTokens);
	switch(state) {
		case 1:

		break;
		case 2:

		break;
		case 4:

		break;
		case 5:

		break;
		case 6:

		break;
		case 7:

		break;
		case 8:

		break;
		case 9:

		break;
		case 10:

		break;
		case 11:

		break;
		case 12:

		break;
		case 13:

		break;
		case 14:

		break;
		default:
		break;
	}
}