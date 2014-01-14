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
Tweets = new Meteor.Collection("tweets");

Future = Npm.require('fibers/future'),
Natural = Meteor.require('natural'),
Tokenizer = new Natural.RegexpTokenizer({pattern: /[\,\.]?[\s(?:\r\n)]*(?:\s|(?:\r\n)|$)/});

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;
var twitterconfig = SecureData.findOne({Name: 'twitterconfig'}).Value;
var twitterAccountId = SecureData.findOne({Name: 'twitterconfig'}).AccountId;
var twitterToken = SecureData.findOne({Name: 'twitterconfig'}).Token;
// DELETE THIS TO POST AS SUPRSUB
var twitterToken = SecureData.findOne({Name: 'Claudio'}).Value.service.twitter;
var dictionary = JSON.parse(Assets.getText("dictionary.json"));
var dayDictionary = JSON.parse(Assets.getText("daydictionary.json"));
var numberDictionary = JSON.parse(Assets.getText("numberdictionary.json"));
var pitchSurnames = JSON.parse(Assets.getText("pitchsurnames.json"));
var stateMap = JSON.parse(Assets.getText("statemap.json"));
var uselessTokens = JSON.parse(Assets.getText("uselesstokens.json"));
var timeRegex = /^([0-9]{1,2})(?:[:.]([0-5][0-9]))?([ap]m)?$/;

Meteor.startup(function() {
	Pitches._ensureIndex({ location : "2d" });
	streamTwitter();
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
	makePosting: function(posting, data, user) {
		if (!user) user = Meteor.userId(); 
		var sentence = describePosting(posting);
		_.extend(posting, data, {createdAt: new Date(), userId: user, sentence: sentence});
		Events.insert(posting);
		return posting;
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
		var Twit = new TwitMaker({
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
	twitterSendTweet: function(string) {
		console.log("sending tweet: " + string);
		var fut = new Future(), Twit = new TwitMaker({
		    consumer_key:         twitterconfig.consumerKey,
	    	consumer_secret:      twitterconfig.secret,
	    	access_token:         twitterToken.token,
	    	access_token_secret:  twitterToken.secret
		});
		console.log(twitterToken);
		Twit.post('statuses/update', { status: string }, function(err, res) {
			console.log("probably sent: " + string)
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterReplyTweet: function(tweetId, string) {
		console.log("sending reply: " + string + " to tweetId " + tweetId);
		var fut = new Future(), Twit = new TwitMaker({
		    consumer_key:         twitterconfig.consumerKey,
	    	consumer_secret:      twitterconfig.secret,
	    	access_token:         twitterToken.token,
	    	access_token_secret:  twitterToken.secret
		});
		Twit.post('statuses/update', { status: string, in_reply_to_status_id: tweetId }, function(err, res) {
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterBefriendSuprSub: function() {
		var user = Meteor.user().services.twitter, fut = new Future();
		if (!user) return new Meteor.Error(500, "User has not linked their Twitter account.");
		var Twit = new TwitMaker({
		    consumer_key:         twitterconfig.consumerKey,
	    	consumer_secret:      twitterconfig.secret,
	    	access_token:         user.accessToken,
	    	access_token_secret:  user.accessTokenSecret
		});
		Twit.post('friendships/create', {user_id: twitterAccountId, follow: true}, function(errOne, resOne) {
			var Twit = new TwitMaker({
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
	addRandomPlayer: function(n) {
		addRandomPlayer(n);
	},
	addRandomEvent: function(n) {
		addRandomEvent(n);
	},
	matchingEvents: function(id) {
		return matchingEvents(id);
	},
	matchingPlayers: function(id) {
		return matchingPlayers(id);
	},
	allMatches: function() {
		return allMatches();
	},
	evaluate: function(string) {
		return eval(string);
	}
});

Tweets.find({consumed: {$exists: false}}).observe({
	added: function(tweet) {
		consumeTweet(tweet);
		Tweets.update(tweet, {$set: {consumed: true}});
	}
});
Events.find({posted: {$exists: false}}).observe({
	added: function(event) {
		var players = matchingPlayers(event._id);
		if (players.length)	distributeEvent(players, event);
		Events.update(event, {$set: {consumed: true}});
	}
})

function twitterNameFromId(callback, id) {
	var thisUser = Meteor.user();
	if (!'twitter' in thisUser.services) return null;
	if (!id) id = thisUser.services.twitter.id;
	var Twit = new TwitMaker({
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

function streamTwitter() {
	var Twit = new TwitMaker({
	    consumer_key:         twitterconfig.consumerKey,
	    consumer_secret:      twitterconfig.secret,
	    access_token:         twitterToken.token,
	    access_token_secret:  twitterToken.secret
	});
	var stream = Twit.stream('user', {with: 'user'});
	stream.on('tweet', Meteor.bindEnvironment(
		function (tweet) {
			var thisString = "Received " + tweet.id_str;
	  		if (tweet.in_reply_to_status_id) thisString += ", reply to " + tweet.in_reply_to_status_id_str
	  		console.log(thisString + ", sent by " + tweet.user.screen_name);
			Tweets.insert({
	  			twitterCreated: new Date(tweet.created_at),
	  			twitterId: tweet.id_str,
	  			source: tweet.source === '<a href=\"http://suprsub.meteor.com\" rel=\"nofollow\">SuprSub</a>' ? 'suprsub' : tweet.source,
	  			userTwitterId: tweet.user.id,
	  			userName: tweet.user.screen_name,
	  			text: tweet.text,
	  			replyTo: tweet.in_reply_to_status_id_str,
	  			refUser: tweet.in_reply_to_user_id
	  		});
	  	},
	  	function (e) {
	  		console.log("Bind Error!");
	  		console.trace();
	  		console.log(e);
	  	}
	));
	stream.on('connect', function(request) {
		console.log("Connected to Twitter.");
		console.log(request);
	});
	stream.on('disconnect', function(disconnectMessage) {
		console.log("Disconnected from Twitter.");
		console.log(disconnectMessage);
	});
	stream.on('reconnect', function(request, response, connectInterval) {
		console.log("Reconnecting to Twitter.");
		console.log(request, response, connectInterval);		
	});
	stream.on('warning', function(warning) {
		console.log("Warning from Twitter.");
		console.log(warning);		
	});
	return stream;
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
				else if (output.data === 8) output.data = (((new Date().getDay() + 1) % 7) + 7) % 7;
				return output;
				break;
			case 11:
				return output;
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
	var currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
	var match = fuzzyMatch(token, currentLookup, 0.75);
	if (match !== -1) return {code: 9, data: match};
	currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase() + ' ' + pitch.owner.toLowerCase()] = pitch._id; return dict;}, {});
	match = fuzzyMatch(token, currentLookup, 0.75);
	if (match !== -1) return {code: 9, data: match};
	currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.owner.toLowerCase() + ' ' + pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
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
//			console.log(currentKey, thisDistance, match);
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
	richTokens = stripUseless(richTokens);
	if (_.some(richTokens, function(token) {return token.code === 11;})) return {cancel: true};
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
		requestData.dateTime.setDate(requestData.dateTime.getDate() + (((dayTokens[0].data - today.getDay()) % 7) + 7) % 7);
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

function describePosting(posting) {
	var sentence = '', startPhrases = ['Looking for', 'We need', 'I need', 'Need', "We're looking for", "I'm looking for"];
	sentence += startPhrases[Math.floor(Math.random() * startPhrases.length)] + ' ';
	if (Math.random() > 0.5) sentence += posting.players;
	else sentence += ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][posting.players];
	if (Math.random() > 0.25) {
		sentence += ' player';
		if (posting.players > 1) sentence += 's';
	}
	if (Math.random() > 0.66) sentence += ', ';
	else if (Math.random() > 0.5) sentence += ' at ';
	else sentence += ' ';
	if (Math.random() > 0.5) {
		sentence += prettyLocation(posting.location);
		if (Math.random() > 0.66) sentence += ', ';
		else if (Math.random() > 0.5) sentence += ' at ';
		else sentence += ' ';
		sentence += colloquialDateTime(posting.dateTime);
	}
	else {
		sentence += colloquialDateTime(posting.dateTime);
		if (Math.random() > 0.66) sentence += ', ';
		else if (Math.random() > 0.5) sentence += ' at ';
		else sentence += ' ';
		sentence += prettyLocation(posting.location);				
	}
	return sentence;
}

function matchingEvents(userId) {
	var user = userId ? Meteor.users.findOne({_id: userId}) : Meteor.user(),
		query = {dateTime: {$gt: new Date()}},
		results = [];
	if (!user || !user.profile || user.profile.player) return [];
	query.location = {$in: Meteor.user().profile.player.venues};
	for (periodCode in user.profile.player.availability) {
		var bounds = timeBounds(periodCode),
			fullquery = _.extend(query, {dateTime: {$gte: bounds.start, $lt: bounds.end}});
		results.append(Events.find(fullquery, {fields: {_id: true}}).fetch());
	}
	return results;
}

function matchingPlayers(event) {
	if (typeof event === "string") event = Events.findOne({_id: event});
	if (!event || !event.dateTime || !event.location) return [];
	var periodCode = Math.floor((event.dateTime.getHours() - 6) / 6)+ '/' + event.dateTime.getDay(),
		query = {'profile.player.venues': event.location};
	query['profile.player.availability.' + periodCode] = {$exists: true};
	return Meteor.users.find(query, {fields: {_id: true}}).fetch();
}

function allMatches() {
	var events = Events.find(), output = {}
	events.forEach(function(e) {
		var matches = matchingPlayers(e);
		if (matches.length) output[e._id] = matches;
	});
	return output;
}

function timeBounds(periodCode) {
	var day = parseInt(periodCode.slice(2)),
		time = parseInt(periodCode.slice(0,1)),
		today = new Date();
	baseBounds = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((((day - today.getDay()) % 7) + 7) % 7));
	startTime = [21600000, 43200000, 64800000][time];
	return {start: new Date(baseBounds.getTime() + startTime), end: new Date(baseBounds.getTime() + startTime + 21600000)};
}

function randomword(n) {
	if (!n) n = 3 + Math.floor(Math.random() * 7);
	var vowels = ['a', 'e', 'i', 'o', 'u'];
	var consts =  ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'th', 'ch', 'sh'];
	var word = '';
	var vownext = false;
	for (var i = 0; i < n; i++) {
		arr = vownext ? vowels : consts;
		word += arr[Math.floor(Math.random()*(arr.length))];
		if (Math.random() > 0.15) vownext = !vownext;
	}
	return word.slice(0,1).toUpperCase() + word.slice(1);
}

function addRandomPlayer(n) {
	if (!n) n = 1;
	for (; n; n--) {
		var newUser = {
			profile: {
				"first_name" : randomword(),
				"last_name" : randomword()
			},
			services : {
				twitter : {
					twitterId : "2278917338",
					screenName : "linkrop",
					accessToken : "2278917338-bBZJpAOKpRaJdDmUSOUOHxMqlUIJ7hlaJkVXZYJ",
					accessTokenSecret : "uKL4ZRv9rjxbFOoFbOdewCORjBAbtvhnUBOAoYzuCtWYI",
					profile_image_url : "http://abs.twimg.com/sticky/default_profile_images/default_profile_5_normal.png",
					profile_image_url_https : "https://abs.twimg.com/sticky/default_profile_images/default_profile_5_normal.png",
					lang : "en"
				}
			}
		};
		newUser.profile.name = newUser.profile.first_name + ' ' + newUser.profile.last_name;
		var venues = [], availability = {}, center = {}, size = null;;
		for (var i = 0; i < 3; i++) for (var j = 0; j < 7; j++) if (Math.random() > 0.66) {availability[i + '/' + j] = true;}
		while (venues.length === 0) {	
			center = {
				nb : 51 + (Math.random() * 5),
				ob : -4.5 + (Math.random() * 4.75)
			};
			size = 5000 + Math.floor(Math.random() * 20000)
			venues = Meteor.call('pitchesWithin', {"lat": center.nb, "lng": center.ob}, size);
		}
		newUser.profile.player = {
			availability: availability,
			center: center,
			size: size,
			venues: _.map(venues, function(v) {return v._id;})
		}
		var teamName = randomword();
		while (Math.random() < 0.4) teamName += ' ' + randomword();
		newUser.profile.team = {name: teamName}
		Meteor.users.insert(newUser);
	}
}

function addRandomEvent(n) {
	var userNum = Meteor.users.find().count(), pitchNum = Pitches.find().count(), now = new Date(), 
		baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
	var someTime = function() {
		var output = new Date(0, 0, 0, 0);
		while (output.getHours() < 6) {
			output = new Date(baseTime + Math.floor(Math.random() * 2016) * 300000)
		}
		return output;
	}
	if (!n) n = 1;
	for (; n; n--) {
		var newEvent = {
			userId: Meteor.users.findOne({}, {skip: Math.floor(Math.random() * userNum), fields: {_id: true}})._id,
			location: Pitches.findOne({}, {skip: Math.floor(Math.random() * pitchNum), fields: {_id: true}})._id,
			createdAt: new Date(now.getTime() - (Math.random() * 86400000)),
			dateTime: someTime(),
			players: 1 + Math.floor(Math.random() * 3),
			source: 'web'
		}
		newEvent.sentence = describePosting(newEvent);
		Events.insert(newEvent);
	}
}

function consumeTweet(tweet) {
	var thisUser, posting, results,
		mainText = removeHandles(tweet.text);
	if (tweet.userTwitterId === twitterToken.id || tweet.refUser !== twitterToken.id) {
		console.log("Ignoring tweet as not directed TO SuprSub");
		return false;
	}
	thisUser = Meteor.users.findOne({'services.twitter.id': (tweet.userTwitterId).toString()});
	if (!thisUser) {
		Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, but you are not yet registered on SuprSub. If you'd like to play more football, visit suprsub.com today!");
		return false;
	}
	tokens = _.map(Tokenizer.tokenize(mainText), function(token) {return token.toLowerCase();});
	posting = parseRequest(tokens);
	if ('error' in posting) {
		Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " there was a problem with your request: " + posting.message);
		return false;
	}
	else if ('cancel' in posting) {
		var replyPosting = Tweets.findOne({twitterId: tweet.replyTo});
		if (!replyPosting) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I don't know what you're trying to cancel.  Please reply to the confirmation tweet I sent you.");
			return false;
		}
		var origPosting = Tweets.findOne({twitterId: replyPosting.replyTo});
		if (!origPosting) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I don't know what you're trying to cancel.  Please reply to the confirmation tweet I sent you.");
			return false;
		}
		Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " cancelling this tweet: " + removeHandles(origPosting.text));
		Events.update({twitterId: origPosting.twitterId}, {$set: {cancelled: true}});
		return false;
	}
	var newPosting = Meteor.call('makePosting', posting, {source: 'twitter', twitterId: tweet.twitterId}, thisUser._id);
	Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + ' you just posted: "' + newPosting.sentence + '" Thanks!');
}

function distributeEvent(players, event) {
	var team = Meteor.users.findOne({_id: event.userId});
	for (var i = 0, l = players.length; i < l; i++) {
		var thisPlayer = Meteor.users.findOne({_id: players[i]._id});
		for (var j = 0, m = thisPlayer.profile.contact.length; j < m; j++) {
			switch (thisPlayer.profile.contact[j]) {
				case 0:
					var tweetText = "@" + thisPlayer.services.twitter.screenName + " * " + team.profile.team.name + ": " + event.sentence;
					console.log("Tweeting: " + tweetText);
					Meteor.call('twitterSendTweet', tweetText);
					break;

				case 1:

					break;

				case 2: 

					break;
			}
		}
	}
}

function removeHandles(text) {
	return text.split(/@[0-9A-Za-x]+/).join('');
}

function prettyDateTime(dateTime) {
	return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
};

function colloquialDateTime(dateTime) {
	var today = new Date();
	if (today.getFullYear() === dateTime.getFullYear() && today.getMonth() === dateTime.getMonth()) {
		if (today.getDate() === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' today';
		else if (today.getDate() + 1 === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' tomorrow';
	}
	return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
};

function prettyLocation(locationId) {
	var location;
	location = Pitches.findOne({_id: locationId});
	if (!location) return '';
	else return location.owner + ' - ' + location.name;
};

function padNum(number, digits) {
	var n = number.toString();
	for (var i = n.length; i < digits; i++) n = '0' + n;
		return n;
};