serverFunctions = (function() {

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
			function (tweet) {
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
		for (i = 0, l = appConfig.regexDict.length; i < l; i++)
			if (appConfig.regexDict[i].regex.exec(token)) return {code: appConfig.regexDict[i].code, data: appConfig.regexDict[i].transform(token)};
		var currentMatch = fuzzyMatch(token, appConfig.dictionary);
		output = currentMatch;
		if (output.code >= 0) {
			if (output.code === 3) return {code: 3, data: (ouput.term === "pm" ? 1 : 0)};
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
		currentMatch = fuzzyMatch(token, appConfig.pitchSurnames);
		if (currentMatch.code !== -1) return {code: 10};
		var pitchData = Pitches.find({}, {fields: {name: true, owner: true}}).fetch();
		var currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		var match = fuzzyMatch(token, currentLookup, 0.75);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.name.toLowerCase() + ' ' + pitch.owner.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.75);
		if (match.code !== -1) return {code: 9, data: match.code};
		currentLookup = _.reduce(pitchData, function(dict, pitch) {dict[pitch.owner.toLowerCase() + ' ' + pitch.name.toLowerCase()] = pitch._id; return dict;}, {});
		match = fuzzyMatch(token, currentLookup, 0.75);
		if (match.code !== -1) return {code: 9, data: match.code};
		return {code: -1};
	}

	function fuzzyMatch(token, dict, threshold) {
		var bestMatch = 99, match = {code: -1};
		var maxScore = threshold ? token.length * (1.0 - threshold) : (token.length * 0.2);
	//	console.log("max score is " + maxScore);
		for (var currentKey in dict) {
			var thisDistance = appConfig.Natural.LevenshteinDistance(token, currentKey, {insertion_cost: 0.66, deletion_cost: 0.66, substitution_cost: 1});
	//		console.log(token + " => " + currentKey + " : " + thisDistance);
			if (thisDistance <= maxScore && thisDistance < bestMatch) {
				match = {code: dict[currentKey], term: currentKey};
	//			console.log(currentKey, thisDistance, match);
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
				richTokens[i] = {code: -1, data: tokens[i]};
			}
			else {
				richTokens[i] = {code: k.code, data: k.data};
				i += n - 1;
			}
		}
		richTokens = stripUseless(richTokens);
		return richTokens;	
	}

	function parseRequest(tokens) {
		var richTokens = [],
			requestData = {
				players: null,
				dateTime: null,
				location: null,
				gender: 0
			},
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
			if (k.code < 0) return new Meteor.Error(500, "Cannot understand '" + thisToken + "'.");
			else {
				richTokens[i] = {code: k.code, data: k.data};
				i += n - 1;
			}
		}
		richTokens = stripUseless(richTokens);
		if (_.some(richTokens, function(token) {return token.code === 11;})) return {cancel: true};
		else if (_.some(richTokens, function(token) {return token.code === 13;})) return {suprsub: true};
		if (richTokens[0].code !== 6) return new Meteor.Error(500, "Number of players must come first.");
		requestData.players = richTokens[0].data;
		richTokens.shift();
		var ampmTokens = _.filter(richTokens, function(k) {return k.code === 3;});
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
		var genderTokens = _.filter(richTokens, function(k) {return k.code === 14;});
		if (genderTokens.length) requestData.gender = genderTokens[0].data;
		var gameTypeTokens = _.filter(richTokens, function(k) {return k.code === 15;});
		if (gameTypeTokens.length) requestData.gameType = gameTypeTokens[0].data;
		var teamSizeTokens = _.filter(richTokens, function(k) {return k.code === 18;});
		if (teamSizeTokens.length) requestData.teamSize = teamSizeTokens[0].data;
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
			sentence += moment(posting.dateTime).format('HH:mm on ddd, Mo MMM');
		}
		else {
			sentence += colloquialDateTime(posting.dateTime);
			if (Math.random() > 0.66) sentence += ', ';
			else if (Math.random() > 0.5) sentence += ' at ';
			else sentence += ' ';
			sentence += moment(posting.dateTime).format('HH:mm on ddd, Mo MMM');
		}
		sentence += ". " + ['Male', 'Female'][posting.gender];
		if (posting.teamSize) sentence += ", " + posting.teamSize + "-a-side";
		if (posting.gameType) sentence += ", " + ["friendly", "competitive"][posting.gameType];
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
		if (typeof event === "string") event = Events.findOne({_id: event});
		if (!event || !event.dateTime || !event.location) return [];
		var periodCode = Math.floor((event.dateTime.getHours() - 6) / 6)+ '/' + event.dateTime.getDay(),
			query = {'profile.player.venues': event.location};
		query['profile.player.availability.' + periodCode] = {$exists: true};
		query._id = {$ne: event.userId};
		return Meteor.users.find(query, {fields: {_id: true}}).fetch();
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
				venues = Meteor.call('pitchesWithin', {"lat": center.lat(), "lng": center.lng()}, size);
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
			mainText = removeHandles(tweet.text);
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
		posting = parseRequest(tokens);
		if ('error' in posting) {
			Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " there was a problem with your request: " + posting.reason);
			return false;
		}
		else if ('cancel' in posting) {
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
		else if ('suprsub' in posting) {
			replyPosting = Tweets.findOne({twitterId: tweet.replyTo});
			console.log("replyPosting:", replyPosting);
			if (!replyPosting) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I don't understand.  Please reply to the posting I sent you, or connect with it online.");
				return false;
			}
			var thisEvent = Events.findOne({'tweetedTo.twitterId': replyPosting.twitterId});
			console.log("thisEvent:", thisEvent);
			if (!thisEvent) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, I can't find this posting any more - maybe it's been cancelled.");
				return false;
			}
			if (thisEvent.players === 0) {
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, that posting has already been filled. Thanks for responding though!");
				return false;
			}
			else {
				var teamCaptain = Meteor.users.findOne(thisEvent.userId);
				console.log("teamCaptain:", teamCaptain);
				if (!teamCaptain) {
					Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " sorry, the user that made that posting appears to have left Suprsub!");
					return false;
				}
				thisEvent = Events.update(thisEvent, {$push: {matched: thisUser._id}, $inc: {players: -1}});
				if (thisEvent.players > 0) Events.update(thisEvent._id, {$set: {sentence: describePosting(thisEvent)}});
				var playerContactDeets, teamCaptContactDeets;
				if (thisUser.profile.contact.indexOf(0) > -1) playerContactDeets = '@' + thisUser.services.twitter.screenName;
				else if (thisUser.profile.contact.indexOf(1) > -1) playerContactDeets = thisUser.services.facebook.link;
				else playerContactDeets = thisUser.services.emails[0].address;
				if (teamCaptain.profile.contact.indexOf(0) > -1) {
					teamCaptContactDeets = '@' + teamCaptain.services.twitter.screenName;
					Meteor.call('twitterReplyTweet', tweet.twitterId, teamCaptContactDeets + " your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets);		
				}
				else if (teamCaptain.profile.contact.indexOf(1) > -1) {
					teamCaptContactDeets = teamCaptain.services.facebook.link;
					// INSERT FACEBOOK CONTACT UPDATE //
				}
				else {
					teamCaptContactDeets = teamCaptain.services.emails[0].address;
					var fullUpText = (thisEvent.players === 0) ? ' Your posting is now filled.' : '';
					Email.send({from: 'SuprSub Postings <postings@suprsub.com>', to: teamCaptContactDeets, subject: "Your have a SuprSub!" + fullupText, html: "Your posting has been filled by Suprsub " + thisUser.profile.name + ", who can be reached at " + playerContactDeets + ' .' + fullUpText});
				}
				Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + " thanks, you are now a Suprsub! Your team captain can be reached at " + teamCaptContactDeets);
			}
		}
		var newPosting = Meteor.call('makePosting', posting, {source: 'twitter', twitterId: tweet.twitterId}, thisUser._id);
		Meteor.call('twitterReplyTweet', tweet.twitterId, '@' + tweet.userName + ' you just posted: "' + newPosting.sentence + '" Thanks!');
		return false;
	}

	function distributeEvent(players, event) {
		var team = Meteor.users.findOne({_id: event.userId});
		for (var i = 0, l = players.length; i < l; i++) {
			var thisPlayer = Meteor.users.findOne({_id: players[i]._id});
			for (var j = 0, m = thisPlayer.profile.contact.length; j < m; j++) {
				switch (thisPlayer.profile.contact[j]) {
					case 0:
						var tweetText = "@" + thisPlayer.services.twitter.screenName + ' ' + team.profile.team.name + ": " + event.sentence + ' _id' + event._id;
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
		location = Pitches.findOne({_id: locationId});
		if (!location) return '';
		else return location.owner + ' - ' + location.name;
	}

	function padNum(number, digits) {
		var n = number.toString();
		for (var i = n.length; i < digits; i++) n = '0' + n;
			return n;
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
		distributeEvent: distributeEvent,
		removeHandles: removeHandles,
		prettyDateTime: prettyDateTime,
		colloquialDateTime: colloquialDateTime,
		prettyLocation: prettyLocation,
		padNum: padNum
	}

})();