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
Events = new Meteor.Collection("events");

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;
var twitterconfig = SecureData.findOne({Name: 'twitterconfig'}).Value;
var twitterAccountId = SecureData.findOne({Name: 'twitterconfig'}).AccountId;
var twitterToken = SecureData.findOne({Name: 'twitterconfig'}).Token;
var dictionary = JSON.parse(Assets.getText("dictionary.json"));
var dayDictionary = JSON.parse(Assets.getText("daydictionary.json"));
var numberDictionary = JSON.parse(Assets.getText("numberdictionary.json"));
var pitchSurnames = JSON.parse(Assets.getText("pitchsurnames.json"));
var stateMap = JSON.parse(Assets.getText("statemap.json"));
var uselessTokens = JSON.parse(Assets.getText("uselesstokens.json"));
var timeRegex = /^([0-9]{1,2})(?:[:.]([0-5][0-9]))?([ap]m)?$/;

Meteor.startup(function() {
	Pitches._ensureIndex({ location : "2d" });
	Future = Npm.require('fibers/future'),
	Natural = Npm.require('natural'),
	Tokenizer = new Natural.RegexpTokenizer({pattern: /[\,\.]?[\s(?:\r\n)]*(?:\s|(?:\r\n)|$)/});
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
//	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
	Accounts.loginServiceConfiguration.insert(facebookprod);
	Accounts.loginServiceConfiguration.insert(twitterconfig);	
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
		return (null, parseRequest(tokens));
	},
	categoriseToken: function(token) {
		return categoriseToken(token);
	},
	makePosting: function(posting, data) {
		_.extend(posting, data, {createdAt: new Date(), userId: Meteor.userId()});
		Events.insert(posting);
	},
	fbSendRequest: function(string) {
		var user = Meteor.user().services.facebook, fut = new Future();
		if (!user) return new Meteor.Error(500, "User has not linked their Facebook account.");
		HTTP.call('POST', 'https://graph.facebook.com/' + user.id + '/apprequests', {params: 
			{
				access_token: user.accessToken,
				message: string,
				data: 'string_data',
				method: 'post'
			}
		}, function(err, res) {fut.return({err: err, res: res});});
		return fut.wait()
	},
	twitterSendMessage: function(string) {
		var user = Meteor.user().services.twitter, fut = new Future();
		if (!user) return new Meteor.Error(500, "User has not linked their Twitter account.");
		Twit = new TwitMaker({
		    consumer_key:         twitterconfig.consumerKey,
	    	consumer_secret:      twitterconfig.secret,
	    	access_token:         twitterToken.token,
	    	access_token_secret:  twitterToken.secret
		});
		Twit.post('direct_messages/new', 
			{
				user_id: user.id,
				text: string
			}, function(err, res) {fut.return({err: err, res: res});});
		return fut.wait();
	},
	twitterBefriendSuprSub: function() {
		var user = Meteor.user().services.twitter, fut = new Future();
		if (!user) return new Meteor.Error(500, "User has not linked their Twitter account.");
		Twit = new TwitMaker({
		    consumer_key:         twitterconfig.consumerKey,
	    	consumer_secret:      twitterconfig.secret,
	    	access_token:         user.accessToken,
	    	access_token_secret:  user.accessTokenSecret
		});
		Twit.post('friendships/create', {user_id: twitterAccountId, follow: true}, function(errOne, resOne) {
			Twit = new TwitMaker({
			    consumer_key:         twitterconfig.consumerKey,
		    	consumer_secret:      twitterconfig.secret,
		    	access_token:         twitterToken.token,
		    	access_token_secret:  twitterToken.secret
			});
			Twit.post('friendships/create', {user_id: user.id, follow: true}, function(errTwo, resTwo) {
				fut.return({err: [errOne, errTwo], res: [resOne, resTwo]});
			});
		});
		return fut.wait()
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
	if (/^[0-9]+$/.exec(token)) return {code: 6, data: parseInt(token, 10)};
	var currentMatch = fuzzyMatch(token, dictionary);
	output.code = currentMatch;
	if (output.code >= 0) {
		if (output.code === 3) return {code: 3, data: (token === "pm" ? 1 : 0)}
		else if (output.code < 5) return output;
		switch (output.code) {
			case 5:
			output.data = fuzzyMatch(token, dayDictionary);
			if (output.data === 7) output.data = new Date().getDay();
			else if (output.data === 8) output.data = (new Date().getDay() + 1) % 7;
			return output;
			break;
			default:
			output.data = fuzzyMatch(token, numberDictionary);
			return output;
		}
	}
	var time = timeRegex.exec(token);
	if (time) {
		var hours = parseInt(time[1]), mins = time[2] ? parseInt(time[2], 10) : 0;
		if (hours > 23 || mins > 59) return {code: -1};
		if (time[3] === "pm" && time[1] < 12) hours += 12;
		else if (time[3] === "am" && time[1] > 12) return {code: -1};
		else if (time[3] === "am" && time[1] === 12) hours = 0;
		output.data = {hours: hours, mins: mins};
		output.code = 7;
		return output;
	}
	var currentMatch = fuzzyMatch(token, pitchSurnames);
	if (currentMatch !== -1) return {code: 10};
	var pitchData = Pitches.find({}, {fields: {name: true, owner: true}}).fetch();
	var currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase()] = pitch._id._str; return dict;}, {});
	var match = fuzzyMatch(token, currentLookup, 0.75);
	if (match !== -1) return {code: 9, data: match};
	currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase() + ' ' + pitch.owner.toLowerCase()] = pitch._id._str; return dict;}, {});
	match = fuzzyMatch(token, currentLookup, 0.75);
	if (match !== -1) return {code: 9, data: match};
	currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.owner.toLowerCase() + ' ' + pitch.name.toLowerCase()] = pitch._id._str; return dict;}, {});
	match = fuzzyMatch(token, currentLookup, 0.75);
	if (match !== -1) return {code: 9, data: match};
	return {code: -1};
}

function fuzzyMatch(token, dict, threshold) {
	var bestMatch = 99, match = -1;
	var maxScore = threshold ? token.length * (1.0 - threshold) : (token.length * 0.2);
//	console.log("max score is " + maxScore);
	for (var currentKey in dict) {
		var thisDistance = Natural.LevenshteinDistance(token, currentKey, {insertion_cost: 0.66, deletion_cost: 0.66, substitution_cost: 1});
//		console.log(token + " => " + currentKey + " : " + thisDistance);
		if (thisDistance <= maxScore && thisDistance < bestMatch) {
			match = dict[currentKey];
			console.log(currentKey, thisDistance, match);
			bestMatch = thisDistance;
		}
	}
	return match;	
}

function stripUseless(tokens) {
	return _.filter(tokens, function(token) {return token && !uselessTokens[token.code]});
}

function parseRequest(tokens) {
	var richTokens = [],
		requestData = {
			players: null,
			dateTime: null,
			location: null
		},
		state = 0;
	for (var i = 0, l = tokens.length; i < l; i++) {
		var k = {code: -1}, n = 0, thisToken;
		while (k.code < 0 && i + n < l) {
			thisToken = tokens[i];
			for (var j = 1; j <= n; j++) thisToken += " " + tokens[i + j];
			var k = categoriseToken(thisToken);
			if (i + n + 1 < l && categoriseToken(tokens[i + n + 1], pitchSurnames) === 10) k.code === -1; // Force reassesment if there's still a word left in the location description.
			n++;
		}
		if (k.code < 0) return new Meteor.Error(500, "Cannot understand '" + thisToken + "'.");
		else {
			richTokens[i] = {code: k.code, data: k.data};
			i += n - 1;
		}
	}
/*	for (var i = 0, l = richTokens.codes.length; i < l; i++) {
		if (richTokens[i].code in stateMap[state]) state = stateMap[state][richTokens[i].codes];
		else return "cannot move from state " + state + " with token code " + richTokens[i].code;
	};
	if (!'-1' in stateMap[state]) return "cannot end in state " + state;*/
	richTokens = stripUseless(richTokens);
	if (richTokens[0].code !== 6) return new Meteor.Error(500, "Number of players must come first.");
	requestData.players = richTokens[0].data;
	richTokens.shift();
	var ampmTokens = _.filter(richTokens, function(k) {return k.code === 3;})
	if (ampmTokens.length > 1) return new Meteor.Error(500, "Only specify am/pm once.");
	var dayTokens = _.filter(richTokens, function(k) {return k.code === 5;});
	var today = new Date();
	if (dayTokens.length > 1) return new Meteor.Error(500, "Only specify day once.");
	else if (dayTokens.length === 1) {
		requestData.dateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		requestData.dateTime.setDate(requestData.dateTime.getDate() + ((dayTokens[0].data - today.getDay()) % 7));
	}
	else {
		requestData.dateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	}
	var numberTokens = _.filter(richTokens, function(k) {return k.code === 6;});
	var timeTokens = _.filter(richTokens, function(k) {return k.code === 7;});
	if (timeTokens.length > 1 || numberTokens.length + timeTokens.length > 2) return new Meteor.Error(500, "Cannot understand time.");
	if (timeTokens.length) {
		requestData.dateTime.setHours(timeTokens[0].data.hours);
		requestData.dateTime.setMinutes(timeTokens[0].data.mins);
	}
	else if (numberTokens.length) {
		requestData.dateTime.setHours(numberTokens[0].data);
		if (numberTokens.length > 1) requestData.dateTime.setMinutes(numberTokens[1].data);
	}
	if (ampmTokens.length) {
		if (ampmTokens[0].data === 1 && requestData.dateTime.getHours() < 12) requestData.dateTime.setHours(requestData.dateTime.getHours() + 12);
		else if (ampmTokens[0].data === 1 && requestData.dateTime.getHours() === 12) requestData.dateTime.setHours(0);
	}
	var placeTokens = _.filter(richTokens, function(k) {return k.code === 9;});
	if (placeTokens.length > 1) return new Meteor.Error(500, "Only specify one location.");
	if (placeTokens.length) requestData.location = placeTokens[0].data;
	return requestData;
}