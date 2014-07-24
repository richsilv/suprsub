	serverFunctions = (function() {

	function processTweet(tweet) {
		var console = appConfig.sendToLogger;
		var thisString = "Received " + tweet.id_str;
		if (tweet.in_reply_to_status_id) thisString += ", reply to " + tweet.in_reply_to_status_id_str;
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
	}

	function twitterNameFromId(callback, id) {
		var thisUser = Meteor.user();
		if (!('twitter' in thisUser.services)) return null;
		if (!id) id = thisUser.services.twitter.id;
		var Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.thisUser.services.twitter.accessToken,
			access_token_secret:  appConfig.thisUser.services.twitter.accessTokenSecret
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
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		var stream = Twit.stream('user', {with: 'user'});
		stream.on('tweet', Meteor.bindEnvironment(
			processTweet,
			function (e) {
				console.log("Bind Error!");
				console.trace();
				console.log(e);
			})
		);
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
		appConfig.activeStream = stream;
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
		var output = {code: -1}, costVector = {insertion_cost: 0.33, deletion_cost: 0.95, substitution_cost: 1.25};
		for (i = 0, l = appConfig.regexDict.length; i < l; i++)
			if (appConfig.regexDict[i].regex.exec(token)) return {code: appConfig.regexDict[i].code, data: appConfig.regexDict[i].transform(token)};
		var currentMatch = fuzzyMatch(token, appConfig.dictionary);
		output = currentMatch;
		if (output.code >= 0) {
			if (output.code === 3) return {code: 3, data: (output.term === "pm" ? 1 : 0)};
			else if (output.code < 5) return output;
			switch (output.code) {
				case 5:
					output.data = fuzzyMatch(token, appConfig.dayDictionary).code;
					if (output.data === 7) output.data = new Date().getDay();
					else if (output.data === 8) output.data = (((new Date().getDay() + 1) % 7) + 7) % 7;
					return output;
				case 11:
				case 12:
				case 13:
					return output;
				case 14:
					return {code: 14, data: (output.term.substr(0, 1) === "m") ? 0 : 1};
				case 15:
					return {code: 15, data: (output.term.substr(0, 4) === "comp") ? 1 : 0};
				default:
					output.data = fuzzyMatch(token, appConfig.numberDictionary).code;
					return output;
			}
		}
		var time = appConfig.timeRegex.exec(token);
/*		if (time) {
			var hours = parseInt(time[1]), mins = time[2] ? parseInt(time[2], 10) : 0;
			if (hours > 23 || mins > 59) return {code: -1};
			if (time[3] === "pm" && time[1] < 12) hours += 12;
			else if (time[3] === "am" && time[1] > 12) return {code: -1};
			else if (time[3] === "am" && time[1] === 12) hours = 0;
			output.data = {hours: hours, mins: mins};
			output.code = 7;
			return output;
		}*/
		currentMatch = fuzzyMatch(token, appConfig.pitchSurnames);
		if (currentMatch.code !== -1) return {code: 10};
/*		var pitchData = Pitches.find({}).fetch();
		var currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		var match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {if (pitch.owner) dict[pitch.name.toLowerCase() + ' ' + pitch.owner.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {if (pitch.owner) dict[pitch.owner.toLowerCase() + ' ' + pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};*/
		return {code: -1};
	}

	function categorisePitch(token) {
		var pitchData = Pitches.find({}).fetch(), costVector = {insertion_cost: 0.25, deletion_cost: 0.95, substitution_cost: 1.25};;
		var currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		var match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {if (pitch.owner) dict[pitch.name.toLowerCase() + ' ' + pitch.owner.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {if (pitch.owner) dict[pitch.owner.toLowerCase() + ' ' + pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.7, costVector);
		if (match.code !== -1) return {code: 9, data: match.code};
		return {code: -1};		
	}

	function fuzzyMatch(token, dict, threshold, costVector) {
		var bestMatch = 99, match = {code: -1};
		var maxScore = threshold ? token.length * (1.0 - threshold) : (token.length * 0.3);
		costVector = costVector ? costVector : {insertion_cost: 0.66, deletion_cost: 0.66, substitution_cost: 1}
		// console.log("max score is " + maxScore);
		for (var currentKey in dict) {
			var thisDistance = appConfig.Natural.LevenshteinDistance(token, currentKey, costVector);
			// console.log(token + " => " + currentKey + " : " + thisDistance);
			if (thisDistance <= maxScore && thisDistance < bestMatch) {
				match = {code: dict[currentKey], term: currentKey, score: thisDistance / token.length};
				// console.log(currentKey, thisDistance, match);
				bestMatch = thisDistance;
			}
		}	
		return match;	
	}

	function stripUseless(tokens) {
		return _.filter(tokens, function(token) {return token && !appConfig.uselessTokens[token.code];});
	}

	function parseTokens(tokens) {
		var richTokens = [],
			state = 0;
		for (var i = 0, l = tokens.length; i < l; i++) {
			var k = {code: -1}, n = 0, thisToken;
			while (k.code < 0 && i + n < l) {
				thisToken = tokens[i];
				for (var j = 1; j <= n; j++) thisToken += " " + tokens[i + j];
				k = categoriseToken(thisToken);
				if (i + n + 1 < l && categoriseToken(tokens[i + n + 1], appConfig.pitchSurnames) === 10)
					k.code = -1; // Force reassesment if there's still a word left in the location description.
				n++;
			}
			if (k.code < 0) {
				k = categorisePitch(thisToken);
				if (k.code < 0)
					richTokens[i] = {code: -1, data: tokens[i]};
				else {
					richTokens[i] = {code: 9, data: k.data};
					i += n - 1;
				}
			}
			else {
				richTokens[i] = {code: k.code, data: k.data};
				i += n - 1;
			}
		}
		richTokens = stripUseless(richTokens);
		return richTokens;
	}

	function parseRequest(tokens, user) {
		// SETUP
		var richTokens = [],
			requestData = {
				players: null,
				dateTime: null,
				location: null,
				onlyRingers: false,
				gender: 0,
				price: 0
			},
			state = 0,
			thisUser = user ? user : Meteor.user();

		if (!thisUser || !thisUser.profile || !thisUser.profile.team || !thisUser.profile.team._ids || !thisUser.profile.team._ids.length)
			throw new Meteor.Error(500, "No user logged in or no team data for logged-in user");
		var defaultTokens = getDefaultTokens(thisUser.profile.team._ids[0]);

		// GET TOKEN COLLECTION
		for (var i = 0, l = tokens.length; i < l; i++) {
			var k = {code: -1}, n = 0, thisToken;
			while (k.code < 0 && i + n < l) {
				thisToken = tokens[i];
				for (var j = 1; j <= n; j++) thisToken += " " + tokens[i + j];
				k = categoriseToken(thisToken);
				if (i + n + 1 < l && categoriseToken(tokens[i + n + 1], appConfig.pitchSurnames) === 10)
					k.code = -1; // Force reassesment if there's still a word left in the location description.
				n++;
			}
			if (k.code < 0) {
				k = categorisePitch(thisToken);
				if (k.code < 0) {
					return new Meteor.Error(500, "Cannot understand '" + thisToken + "'.");
				}
				else
					richTokens[i] = {code: 9, data: k.data};
				i += n - 1;
			}
			else {
				richTokens[i] = {code: k.code, data: k.data};
				i += n - 1;
			}
		}
		richTokens = stripUseless(richTokens);

		// MERGE TOKENS
		richTokens = mergeTokens(richTokens, defaultTokens);

		//PROCEED WITH ANALYSIS
		if (_.some(richTokens, function(token) {return token.code === 11;})) return {cancel: true};
		else if (_.some(richTokens, function(token) {return token.code === 13;})) return {suprsub: true};
		if (richTokens[0].code !== 6) throw new Meteor.Error(500, "Number of players must come first.");
		requestData.players = richTokens[0].data;
		richTokens.shift();
		var priceTokens = _.filter(richTokens, function(k) {return k.code === 17;});
		if (priceTokens.length)
			requestData.price = priceTokens[0].data;
		if (_.filter(richTokens, function(k) {return k.code === 16;}).length)
			requestData.onlyRingers = true;	
		var ampmTokens = _.filter(richTokens, function(k) {return k.code === 3;});
		if (ampmTokens.length > 1) throw new Meteor.Error(500, "Only specify am/pm once.");
		var dayTokens = _.filter(richTokens, function(k) {return k.code === 5;});
		var today = new Date();
		if (dayTokens.length > 1) throw new Meteor.Error(500, "Only specify day once.");
		else if (dayTokens.length === 1) {
			requestData.dateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			requestData.dateTime.setDate(requestData.dateTime.getDate() + (((dayTokens[0].data - today.getDay()) % 7) + 7) % 7);
		}
		else {
			requestData.dateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		}
		var numberTokens = _.filter(richTokens, function(k) {return k.code === 6;});
		var timeTokens = _.filter(richTokens, function(k) {return k.code === 7;});
		if (timeTokens.length > 1 || numberTokens.length + timeTokens.length > 2) throw new Meteor.Error(500, "Cannot understand time.");
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
		// Push forward one week if requested time is more than 30 minutes ago (or one day ahead if no date specified)
		if (new Date().getTime() - 1800000 > requestData.dateTime.getTime()) requestData.dateTime.setDate(requestData.dateTime.getDate() + (dayTokens.length === 1 ? 7 : 1));
		// Convert to UK Time!!!
		requestData.dateTime = toMomentInTimezone(moment(requestData.dateTime), "Europe/London").toDate();
		var placeTokens = _.filter(richTokens, function(k) {return k.code === 9;});
		if (placeTokens.length > 1) throw new Meteor.Error(500, "Only specify one location.");
		if (placeTokens.length) requestData.location = placeTokens[0].data;
		var genderTokens = _.filter(richTokens, function(k) {return k.code === 14;});
		if (genderTokens.length) requestData.gender = genderTokens[0].data;
		var gameTypeTokens = _.filter(richTokens, function(k) {return k.code === 15;});
		if (gameTypeTokens.length)
			requestData.gameType = gameTypeTokens[0].data;
		else 
			requestData.gameType = 0;
		var teamSizeTokens = _.filter(richTokens, function(k) {return k.code === 18;});
		if (teamSizeTokens.length) requestData.teamSize = teamSizeTokens[0].data;
		return requestData;
	}

	function describePosting(posting) {
		var sentence = '', 
			startPhrases = ['Looking for', 'We need', 'I need', 'Need', "We're looking for", "I'm looking for"],
			pitch = Pitches.findOne({_id: posting.location});
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
			sentence += pitch ? pitch.prettyLocation : 'Unknown Location';
			if (Math.random() > 0.66) sentence += ', ';
			else if (Math.random() > 0.5) sentence += ' at ';
			else sentence += ' ';
			sentence += moment.tz(posting.dateTime, "Europe/London").format('HH:mm on ddd, D MMM');
		}
		else {
			sentence += moment.tz(posting.dateTime, "Europe/London").format('HH:mm on ddd, D MMM');
			if (Math.random() > 0.66) sentence += ', ';
			else if (Math.random() > 0.5) sentence += ' at ';
			else sentence += ' ';
			sentence += prettyLocation(posting.location);			
		}
		sentence += ". " + ['Male', 'Female'][posting.gender];
		if (posting.teamSize) sentence += ", " + posting.teamSize + "-a-side";
		if (posting.gameType) sentence += ", " + ["friendly", "competitive"][posting.gameType];
		if (posting.price) sentence += ", £" + posting.price;
		else sentence += ", free";
		return sentence;
	}

	function matchingEvents(userId) {
		var user = userId ? Meteor.users.findOne({_id: userId}) : Meteor.user(),
			query = {dateTime: {$gt: new Date()}},
			results = [];
		if (!user || !user.profile || user.profile.player) return [];
		query.location = {$in: Meteor.user().profile.player.venues};
		for (var periodCode in user.profile.player.availability) {
			var bounds = timeBounds(periodCode),
				fullquery = _.extend(query, {dateTime: {$gte: bounds.start, $lt: bounds.end}});
			results.append(Events.find(fullquery, {fields: {_id: true}}).fetch());
		}
		return results;
	}

	function matchingPlayers(event) {
		var results;
		if (typeof event === "string") event = Events.findOne({_id: event});
		if (!event || !event.dateTime || !event.location) return [];
		if (event.onlyRingers) {
			var thisTeam = Teams.findOne({});
			if (!thisTeam) {
				results = [];
			}
			else {
				results = Meteor.users.find({_id: {$in: thisTeam.ringers}}, {fields: {_id: true}}).fetch();
			}
		}
		else {
			var periodCode = getPeriodCode(event.dateTime),
				query = {
					'profile.player.venues': event.location,
					'profile.postMe': true
				};
			appConfig.sendToLogger.log("Looking for players available at " + event.location + " at time code " + periodCode);
			query['profile.player.availability.' + periodCode] = true;
			query._id = {$ne: event.userId};
			results = Meteor.users.find(query, {fields: {_id: true}}).fetch();
		}
		return results;
	}

	function allMatches() {
		var events = Events.find(), output = {};
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
		var getIds = function(v) {return v._id;};
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
			var venues = [], availability = {}, center = {}, size = null;
			for (var i = 0; i < 3; i++) for (var j = 0; j < 7; j++) if (Math.random() > 0.66) {availability[i + '/' + j] = true;}
			while (venues.length === 0) {	
				center = {
					nb : 51 + (Math.random() * 5),
					ob : -4.5 + (Math.random() * 4.75)
				};
				size = 5000 + Math.floor(Math.random() * 20000);
				venues = Meteor.call('pitchesWithin', {"lat": center.nb, "lng": center.ob}, size);
			}
			newUser.profile.player = {
				availability: availability,
				center: center,
				size: size,
				venues: _.map(venues, getIds)
			};
			var teamName = randomword();
			while (Math.random() < 0.4) teamName += ' ' + randomword();
			newUser.profile.team = {name: teamName};
			Meteor.users.insert(newUser);
		}
	}

	function addRandomEvent(n) {
		var userNum = Meteor.users.find().count(), pitchNum = Pitches.find().count(), now = new Date(), 
			baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
		var someTime = function() {
			var output = new Date(0, 0, 0, 0);
			while (output.getHours() < 6) {
				output = new Date(baseTime + Math.floor(Math.random() * 2016) * 300000);
			}
			return output;
		};
		if (!n) n = 1;
		for (; n; n--) {
			var newEvent = {
				userId: Meteor.users.findOne({}, {skip: Math.floor(Math.random() * userNum), fields: {_id: true}})._id,
				location: Pitches.findOne({}, {skip: Math.floor(Math.random() * pitchNum), fields: {_id: true}})._id,
				createdAt: new Date(now.getTime() - (Math.random() * 86400000)),
				dateTime: someTime(),
				players: 1 + Math.floor(Math.random() * 3),
				tweetedTo: [],
				source: 'web'
			};
			newEvent.sentence = describePosting(newEvent);
			Events.insert(newEvent);
		}
	}

	function hasCode(keyCode, richTokens) {
		return _.any(richTokens, function(token) {return token.code === keyCode;});
	}

	function consumeTweet(tweet) {
		var thisUser, posting, results, replyPosting,
			mainText = removeHandles(tweet.text),
			console = appConfig.sendToLogger;
		console.log("Consuming tweet: " + mainText);
		if (tweet.userTwitterId === appConfig.twitterToken.id) {
			console.log("Tweet sent by SuprSub");
			var outGoing = parseTokens(appConfig.Tokenizer.tokenize(tweet.text)),
				idToken = _.find(outGoing, function(token) {return token.code === 19;});
			console.log("Sent tweet:", tweet, "about event", idToken);
			if (idToken) Events.update(idToken.data, {$push: {tweetedTo: {refUser: tweet.refUser, twitterId: tweet.twitterId}}});
			return false;
		}
		if (tweet.refUser !== appConfig.twitterToken.id) {
			console.log("Ignoring tweet as not directed TO SuprSub");
			return false;
		}
		thisUser = Meteor.users.findOne({'services.twitter.id': (tweet.userTwitterId).toString()});
		if (!thisUser) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, but you are not yet registered on SuprSub. If you'd like to play more football, visit suprsub.com today!");
			return false;
		}
		tokens = _.map(appConfig.Tokenizer.tokenize(mainText), function(token) {return token.toLowerCase();});
		console.log(tokens);
		if (tokens.indexOf('error') > -1) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " there was a problem with your request: " + posting.reason);
			return false;
		}
		else if (tokens.indexOf('cancel') > -1) {
			replyPosting = Tweets.findOne({twitterId: tweet.replyTo});
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
		else if (tokens.indexOf('suprsub') > -1) {
			replyPosting = Tweets.findOne({twitterId: tweet.replyTo});
			console.log("replyPosting:", replyPosting);
			if (!replyPosting) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I don't understand.  Please reply to the posting I sent you, or connect with it online.");
				return false;
			}
			var thisEvent = Events.findOne({'tweetedTo.twitterId': replyPosting.twitterId});
			console.log("thisEvent:", thisEvent, "replyPosting: ", replyPosting);
			if (!thisEvent) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I can't find this posting any more - maybe it's been cancelled.");
				return false;
			}
			if (thisEvent.players === 0) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " Sorry, that posting has already been filled. Thanks for responding though!");
				return false;
			}
			else {
				var teamCaptain = Meteor.users.findOne(thisEvent.userId);
				console.log("teamCaptain:", teamCaptain);
				if (!teamCaptain) {
					Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, the user that made that posting appears to have left Suprsub!");
					return false;
				}
				Events.update(thisEvent, {$push: {matched: thisUser._id}, $inc: {players: -1}});
				thisEvent = Events.findOne({_id: thisEvent._id});
				if (thisEvent.players > 0) Events.update(thisEvent._id, {$set: {sentence: describePosting(thisEvent)}});
				var playerContactDeets, teamCaptContactDeets;
				if (thisUser.profile.contact.indexOf(0) > -1) playerContactDeets = '@' + thisUser.services.twitter.screenName;
				else if (thisUser.profile.contact.indexOf(1) > -1) playerContactDeets = thisUser.services.facebook.link;
				else playerContactDeets = thisUser.emails && thisUser.emails.length && thisUser.emails[0].address;
				console.log("Notifying:", teamCaptain.profile.contact);
				if (teamCaptain.profile.contact.indexOf(0) > -1) {
					teamCaptContactDeets = '@' + teamCaptain.services.twitter.screenName;
					Meteor.call('twitterSendMessage', "Your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets, teamCaptain.services.twitter.id);		
				}
				if (teamCaptain.profile.contact.indexOf(1) > -1) {
					teamCaptContactDeets = teamCaptain.services.facebook.link;
					// INSERT FACEBOOK CONTACT UPDATE //
				}
				if (teamCaptain.profile.contact.indexOf(2) > -1) {
					teamCaptContactDeets = teamCaptain.emails && teamCaptain.emails.length && teamCaptain.emails[0].address;
					var fullUpText = (thisEvent.players === 0) ? ' Your posting is now filled.' : '';
					Email.send({from: 'SuprSub Postings <postings@suprsub.com>', to: teamCaptContactDeets, subject: "You have a SuprSub!" + fullUpText, html: "Your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets + ' .' + fullUpText});
				}
				Meteor.call('twitterSendMessage', "Thanks, you are now a Suprsub! Your team captain can be reached at " + teamCaptContactDeets, tweet.userTwitterId);
				return false;
			}
		}
		else if (!thisUser.profile.team._ids.length) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, but you don't have a team set up on SuprSub.com! Please log on to add one and you can then make postings.");
		}
		posting = parseRequest(tokens, thisUser);
		posting = _.extend(posting, {team: thisUser.profile.team._ids[0]});
		console.log(posting);
		if (!posting.error) {
			var newPosting = Meteor.call('makePosting', posting, {source: 'twitter', twitterId: tweet.twitterId}, thisUser._id);
			Meteor.call('twitterReplyTweet', tweet.twitterId, ('@' + tweet.userName + '  posted: "' + newPosting.sentence + '" Tks!').slice(0,140));
			return false;
		}
		else {
			Meteor.call('twitterReplyTweet', tweet.twitterId, ('@' + tweet.userName + ' ' + posting.reason).slice(0,140));

		}
		return false;
	}

	function signupPlayer(thisUser, thisEvent) {
		var thisEvent = (typeof thisEvent === "string" ? Events.find(thisEvent) : thisEvent),
			teamCaptain = Meteor.users.findOne(thisEvent.userId),
			teamCaptContactDeets, playerContactDeets,
			console = appConfig.sendToLogger;
		if (!thisEvent || !teamCaptain || thisEvent.players <= 0)
			throw new Meteor.Error(500, "Posting cannot be matched or is already filled", "EventID: " + (thisEvent ? thisEvent._id : "undefined") + ", Team Captain: " + (teamCaptain ? teamCaptain._id : "undefined"));
		Events.update(thisEvent, {$push: {matched: thisUser._id}, $inc: {players: -1}}, function() {
			Events.update({_id: thisEvent._id}, {$set: {sentence: describePosting(Events.findOne({_id: thisEvent._id}))}});
		});
		var playerContactDeets, teamCaptContactDeets;
		if (thisUser.profile.contact.indexOf(0) > -1) playerContactDeets = '@' + thisUser.services.twitter.screenName;
		else if (thisUser.profile.contact.indexOf(1) > -1) playerContactDeets = thisUser.services.facebook.link;
		else playerContactDeets = thisUser.emails[0].address;
		if (teamCaptain.profile.contact.indexOf(0) > -1) {
			teamCaptContactDeets = '@' + teamCaptain.services.twitter.screenName;
			Meteor.call('twitterSendMessage', "Your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets, teamCaptain.services.twitter.id);		
		}
		if (teamCaptain.profile.contact.indexOf(1) > -1) {
			teamCaptContactDeets = teamCaptain.services.facebook.link;
			// INSERT FACEBOOK CONTACT UPDATE //
		}
		if (teamCaptain.profile.contact.indexOf(2) > -1) {
			teamCaptContactDeets = teamCaptain.emails && teamCaptain.emails.length && teamCaptain.emails[0].address;
			var fullUpText = (thisEvent.players === 0) ? ' Your posting is now filled.' : '';
			Email.send({from: 'SuprSub Postings <postings@suprsub.com>', to: teamCaptContactDeets, subject: "You have a SuprSub!" + fullUpText, html: "Your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets + ' .' + fullUpText});
		}
		if (thisUser.profile.contact.indexOf(0) > -1) {
			Meteor.call('twitterSendMessage', "Thanks, you are now a Suprsub! Your team captain can be reached at " + teamCaptContactDeets, thisUser.services.twitter.id);		
		}
		if (thisUser.profile.contact.indexOf(1) > -1) {
			teamCaptContactDeets = teamCaptain.services.facebook.link;
			// INSERT FACEBOOK CONTACT UPDATE //
		}
		if (thisUser.profile.contact.indexOf(2) > -1) {
			Email.send({from: 'SuprSub Postings <postings@suprsub.com>', to: playerContactDeets, subject: "You are now a SuprSub!", html: "Thanks, you are now a Suprsub!  Your team captain can be reached at  " + teamCaptContactDeets});
		}
		return true;
	}

	function distributeEvent(players, event) {
		if (typeof event === "string") event = Events.findOne({_id: event});
		var team = Teams.findOne({_id: event.team}),
			console = appConfig.sendToLogger,
			email;
		for (var i = 0, l = players.length; i < l; i++) {
			var thisPlayer = Meteor.users.findOne({_id: players[i]._id});
			console.log("Sending to ", thisPlayer.profile.first_name + ' ' + thisPlayer.profile.last_name);
			for (var j = 0, m = thisPlayer.profile.contact.length; j < m; j++) {
				console.log("distribution number ", j, thisPlayer.profile.contact[j]);
				switch (thisPlayer.profile.contact[j]) {
					case 0:
						if (thisPlayer.services.twitter) {
							var tweetText = "@" + thisPlayer.services.twitter.screenName + ' ' + event.sentence + ' _id' + event._id;
							if (tweetText.length > 140) tweetText = tweetText.slice(0,137) + '...';
							console.log("Tweeting: " + tweetText);
							Meteor.call('twitterSendTweet', tweetText);
						}
						break;

					case 2:
						email = thisPlayer.emails && thisPlayer.emails.length && thisPlayer.emails[0].address;
					case 1: 
						if (!email)
							email = thisPlayer.services.facebook && thisPlayer.services.facebook.email;
						console.log("sending Email", email);
						if (email) {
							Email.send({
								from: 'SuprSub Postings <postings@suprsub.com>', 
								to: email, 
								subject: event.sentence, 
								html: "<h2>New Posting in Your Neighbourhood</h2><p>" + event.sentence + "</p>" + 
									  '<p><a href="' + Meteor.absoluteUrl() + 'home/' + event._id +'">Click here to sign up</a></p>'
							});
						}
						break;
				}
			}
		}
		Events.update(event, {$set: {posted: true}});
	}

	function removeHandles(text) {
		return text.split(/@[0-9A-Za-x]+/).join('');
	}

	function prettyDateTime(dateTime) {
		return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
	}

	function colloquialDateTime(dateTime) {
		var today = new Date();
		if (today.getFullYear() === dateTime.getFullYear() && today.getMonth() === dateTime.getMonth()) {
			if (today.getDate() === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' today';
			else if (today.getDate() + 1 === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' tomorrow';
		}
		return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
	}

	function prettyLocation(locationId) {
		var location;
		location = (typeof locationId === 'string') ? Pitches.findOne({_id: locationId}) : locationId;
		if (!location || !location.name) return '';
		else return location.owner ? location.owner + ' - ' + location.name : location.name;
	}

	function padNum(number, digits) {
		var n = number.toString();
		for (var i = n.length; i < digits; i++) n = '0' + n;
			return n;
	}

	function getPeriodCode(dateTime) {
		return dateTime ? Math.floor((dateTime.getHours() - 6) / 6)+ '/' + dateTime.getDay() : null;
	}

	function getDefaultTokens(teamId) {
		var thisTeam = Teams.findOne(teamId),
			tokens = [];
		console.log(thisTeam);
		if (thisTeam) {
			for (prop in thisTeam) {
				switch(prop) {
					case 'homeGround':
						tokens.push({code: 9, data: thisTeam.homeGround});
						break;

					case 'day':
						tokens.push({code: 5, data: thisTeam.day});
						break;

					case 'time':
						tokens.push({code: 7, data: {hours: thisTeam.time.getHours(), mins: thisTeam.time.getMinutes()}})
						break;

					case 'format':
						tokens.push({code: 18, data: thisTeam.format});
				}
			}
			return tokens;
		}
		return [];
	}

	function mergeTokens(spec, defaults) {
		for (var i = 0, l = defaults.length; i < l; i += 1) {
			if (!_.find(spec, function(token) {return token.code === defaults[i].code;}))
				spec.push(defaults[i]);
		}
		return spec;
	}

	function toMomentInTimezone(sourceMoment, timezone) {
		var result = moment.tz(timezone);
		result.year(sourceMoment.year());
		result.month(sourceMoment.month());
		result.date(sourceMoment.date());
		result.hour(sourceMoment.hour());
		result.minute(sourceMoment.minute());
		result.second(sourceMoment.second());
		result.millisecond(sourceMoment.millisecond());
		return result;
	}

	return {
		twitterNameFromId: twitterNameFromId,
		streamTwitter: streamTwitter,
		divideName: divideName,
		updateNames: updateNames,
		categoriseToken: categoriseToken,
		fuzzyMatch: fuzzyMatch,
		stripUseless: stripUseless,
		parseTokens: parseTokens,
		parseRequest: parseRequest,
		describePosting: describePosting,
		matchingEvents: matchingEvents,
		matchingPlayers: matchingPlayers,
		timeBounds: timeBounds,
		randomword: randomword,
		addRandomPlayer: addRandomPlayer,
		addRandomEvent: addRandomEvent,
		hasCode: hasCode,
		consumeTweet: consumeTweet,
		signupPlayer: signupPlayer,
		distributeEvent: distributeEvent,
		removeHandles: removeHandles,
		prettyDateTime: prettyDateTime,
		colloquialDateTime: colloquialDateTime,
		prettyLocation: prettyLocation,
		padNum: padNum,
		getPeriodCode: getPeriodCode,
		processTweet: processTweet
	};

})();