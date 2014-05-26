var sendToLogger = {
	log: function(s) {
		console.log(s);
		Logging.insert({dateTime: new Date(), log: s['0'] || s});
	}
}, oldConsole = console;

Meteor.methods({
	pitchesWithin: function(center, distance) {
		var ratio = 6.283184 / 360;
		var lng = center.lng * ratio;
		var lat = center.lat * ratio;
		var width = Math.acos(Math.pow(Math.cos(lat), 2) * Math.cos(ratio) + Math.pow(Math.sin(lat), 2)) * 6371 / 111;
		var d2 = Math.pow(distance/111000, 2);
		return Pitches.find({}, {sort: {name: 1}}).fetch().filter(function(p) {return (Math.pow(p.location.lat - center.lat, 2) + Math.pow((p.location.lng - center.lng) * width, 2) < d2);});
	},
	deleteTeam: function(teamId) {
		Meteor.users.update({'profile.team._ids': teamId}, {$pull: {'profile.team._ids': teamId}}, {multi: true});
		Teams.remove(teamId);
	},
	addEmailCredentials: function(details) {
		if (Meteor.users.findOne({'emails.address': details.email})) {
			return 'Email already exists in database';
		}
		var loggedInUser = Meteor.user(),
			passwordService = {srp: details.srp},
			fut = new Future();
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
		return serverFunctions.twitterNameFromId(function(name) {
			return serverFunctions.divideName(serverFunctions.updateNames, name);
		});
	},
	analysePosting: function(string) {
		var tokens = _.map(appConfig.Tokenizer.tokenize(string), function(token) {return token.toLowerCase();});
		return serverFunctions.parseRequest(tokens);
	},
	analyseText: function(string) {
		var tokens = _.map(appConfig.Tokenizer.tokenize(string), function(token) {return token.toLowerCase();});
		return serverFunctions.parseTokens(tokens);
	},
	returnTokens: function(string) {
		var tokens = _.map(appConfig.Tokenizer.tokenize(string), function(token) {return token.toLowerCase();});
		return tokens;		
	},
	categoriseToken: function(token) {
		return serverFunctions.categoriseToken(token);
	},
	makePosting: function(posting, data, user) {
		if (!user) user = Meteor.userId();
		var sentence = serverFunctions.describePosting(posting);
		_.extend(posting, data, {createdAt: new Date(), userId: user, sentence: sentence, tweetedTo: []});
		Events.insert(posting);
		return posting;
	},
	fbSendRequest: function(string) {
		var user = Meteor.user().services.facebook, fut = new Future();
		if (!user) throw new Meteor.Error(500, "User has not linked their Facebook account.");
		HTTP.call('POST', 'https://graph.facebook.com/' + user.id + '/apprequests', {params: 
			{
				access_token: user.accessToken,
				message: string,
				data: 'string_data',
				method: 'post'
			}
		}, function(err, res) {fut.return({err: err, res: res});});
		return fut.wait();
	},
	twitterSendMessage: function(string, twitterId) {
		var user = Meteor.user().services.twitter, fut = new Future(),
			console = appConfig.sendToLogger;
		if (!(user || twitterId)) throw new Meteor.Error(500, "User has not linked their Twitter account.");
		var Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		if (!appConfig.streaming) {
			console.log("Sending Direct Message:", {To: twitterId, Message: string});
			return {err: null, res: null};
		}
		Twit.post('direct_messages/new', 
		{
			user_id: twitterId ? twitterId : user.id,
			text: string
		}, function(err, res) {fut.return({err: err, res: res});});
		return fut.wait();
	},
	twitterSendTweet: function(string) {
		var console = appConfig.sendToLogger;
		console.log("sending tweet: " + string);
		var fut = new Future(), Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		if (!appConfig.streaming) {
			var tweet = {
				id_str: Meteor.uuid(),
				user: {
					id: appConfig.twitterToken.id,
					screen_name: "notsuprsub"
				},
				created_at: new Date(),
				source: "admin",
				text: string,
				in_reply_to_status_id_str: null
			},
			target = /^@(\w+)( .*)?$/.exec(string);
			if (target) {
				Meteor.call('twitterGetDetails', target[1], function(err, res) {
					tweet.in_reply_to_user_id = res.id;
					console.log("Tweeting:", tweet);
					Meteor.call('processTweet', tweet);
				});
			}
			else {
				console.log("Tweeting:", tweet);
				Meteor.call('processTweet', tweet);				
			}			
			return {err: null, res: null};
		}
		Twit.post('statuses/update', { status: string }, function(err, res) {
			oldConsole.log("probably sent: " + string);
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterReplyTweet: function(tweetId, string) {
		var console = appConfig.sendToLogger;
		console.log("sending reply: " + string + " to tweetId " + tweetId);
		var fut = new Future(), Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		if (!appConfig.streaming) {
			var tweet = {
				id_str: Meteor.uuid(),
				user: {
					id: appConfig.twitterToken.id,
					screen_name: "notsuprsub"
				},
				created_at: new Date(),
				source: "admin",
				text: string,
				in_reply_to_status_id_str: tweetId
			},
			repliedTo = Tweets.findOne({twitterId: tweetId}),
			target = /^@(\w+)( .*)?$/.exec(string) || (repliedTo ? ['', repliedTo.userName] : null);
			if (target) {
				Meteor.call('twitterGetDetails', target[1], function(err, res) {
					tweet.in_reply_to_user_id = res.id;
					console.log("Tweeting:", tweet);
					Meteor.call('processTweet', tweet);
				});
			}
			else {
				console.log("Tweeting:", tweet);
				Meteor.call('processTweet', tweet);				
			}
			return {err: null, res: null};			
		}
		Twit.post('statuses/update', { status: string, in_reply_to_status_id: tweetId }, function(err, res) {
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterGetDetails: function(userString) {
		var console = appConfig.sendToLogger;
		console.log("getting details of " + userString);
		var fut = new Future(),
			Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
			}),
			params = {include_entities: false};
		if (typeof userString === "number") {
			params.user_id = userString;
		}
		else {
			params.screen_name = userString;
		}
		Twit.get('users/show', params, function(err, res) {
			if (err) {
				fut.throw(err);
			}
			else {
				fut.return(res);
			}
		});
		return fut.wait();
	},
	twitterBefriendSuprSub: function(user) {
		var fut = new Future();
		if (!user) user = Meteor.user().services.twitter;
		if (!user) throw new Meteor.Error(500, "User has not linked their Twitter account.");
		var Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         user.accessToken,
			access_token_secret:  user.accessTokenSecret
		});
		if (!appConfig.streaming) return {err: null, res: null};
		Twit.post('friendships/create', {user_id: appConfig.twitterAccountId, follow: true}, function(errOne, resOne) {
			var secondTwit = new TwitMaker({
				consumer_key:         appConfig.twitterconfig.consumerKey,
				consumer_secret:      appConfig.twitterconfig.secret,
				access_token:         appConfig.twitterToken.token,
				access_token_secret:  appConfig.twitterToken.secret
			});
			secondTwit.post('friendships/create', {user_id: user.id, follow: true}, function(errTwo, resTwo) {
				fut.return({err: [errOne, errTwo], res: [resOne, resTwo]});
			});
		});
		return fut.wait();
	},
	twitterStreaming: function() {
		return appConfig.streaming === true;
	},
	processTweet: function(tweet) {
		tweet.in_reply_to_user_id = appConfig.twitterToken.id;
		serverFunctions.processTweet(tweet);
	},
	addRandomPlayer: function(n) {
		serverFunctions.addRandomPlayer(n);
	},
	addRandomEvent: function(n) {
		serverFunctions.addRandomEvent(n);
	},
	matchingEvents: function(id) {
		return serverFunctions.matchingEvents(id);
	},
	matchingPlayers: function(id) {
		return serverFunctions.matchingPlayers(id);
	},
	allMatches: function() {
		return allMatches();
	},
	updateEventPeriods: function() {
		Events.find().forEach(function(e) {
			var period = serverFunctions.getPeriodCode(e.dateTime);
			Events.update(e, {$set: {periodCode: period}});
		});
		return "done";
	},
	sendTeamCode: function(code) {
		var console = appConfig.sendToLogger;
		var contacts = Meteor.user().profile.contact,
			team = Teams.findOne(code),
			suprsubRoot = Meteor.absoluteUrl();
		if (contacts.indexOf(0) > -1) {
			Meteor.call('twitterSendMessage', "Here's the link you need to send to your teammates - " + 
				suprsubRoot + "team/" + code);
		}
		if (contacts.indexOf(2) > -1) {
			Email.send({
				from: "info@suprsub.meteor.com",
				to: Meteor.user().emails[0].address,
				subject: "SuprSub team link and code",
				html: Handlebars.templates['sendcode']({
					teamName: team.name,
					suprsubRoot: suprsubRoot,
					code: code
				})
			});
		}
		else if (contacts.indexOf(1) > -1) {
			Email.send({
				from: "info@suprsub.meteor.com",
				to: Meteor.user().services.facebook.email,
				subject: "SuprSub team link and code",
				html: Handlebars.templates['sendcode']({
					teamName: team.name,
					suprsubRoot: suprsubRoot,
					code: code
				})
			});			
		}
	},
	sendRingerCode: function(teamId, name) {
		var console = appConfig.sendToLogger;
		var contacts = Meteor.user().profile.contact,
			team = Teams.findOne(teamId),
			code = team.ringerCode
			suprsubRoot = Meteor.absoluteUrl();
		if (contacts.indexOf(0) > -1) {
			Meteor.call('twitterSendMessage', "Here's the link you need to send to your potential Supsrubs - " + 
				suprsubRoot + "team/" + code);
		}
		if (contacts.indexOf(2) > -1) {
			Email.send({
				from: "info@suprsub.meteor.com",
				to: Meteor.user().emails[0].address,
				subject: "SuprSub team link and code",
				html: Handlebars.templates['sendcoderinger']({
					teamName: team.name,
					suprsubRoot: suprsubRoot,
					code: code,
					inviter: name
				})
			});
		}
		else if (contacts.indexOf(1) > -1) {
			Email.send({
				from: "info@suprsub.meteor.com",
				to: Meteor.user().services.facebook.email,
				subject: "SuprSub team link and code",
				html: Handlebars.templates['sendcoderinger']({
					teamName: team.name,
					suprsubRoot: suprsubRoot,
					code: code,
					inviter: name
				})
			});			
		}
	},	
	getTeamMembers: function(teamId) {
		return teamId ? Meteor.users.find({'profile.team._ids': teamId}, {fields: {'profile.name': true}}).fetch() : [];
	},
	getRingers: function(teamId) {
		var team = Teams.findOne(teamId);
		return (team && team.ringers) ? Meteor.users.find({_id: {$in: team.ringers}}, {fields: {'profile.name': true}}).fetch() : [];
	},
	joinTeam: function(teamCode) {
		var console = appConfig.sendToLogger;
		var ringerTeam = Teams.findOne({ringerCode: teamCode});
		if (ringerTeam) {
			Teams.update(ringerTeam, {$push: {ringers: Meteor.userId()}});
			return {code: 1, teamName: ringerTeam.name};
		}
		var memberTeam = Teams.findOne(teamCode);
		if (memberTeam) {
			Meteor.users.update(Meteor.userId(), {$push: {'profile.team._ids': teamCode}});
			return {code: 2, teamName: memberTeam.name};
		}
		return {code: 3};	
	},
	signupPlayer: function(thisUser, thisEvent) {
		return serverFunctions.signupPlayer(thisUser, thisEvent);
	},
	removePosting: function(thisEvent) {
		if (Meteor.user().profile.team._ids.indexOf(thisEvent.team) > -1) {
			Events.update(thisEvent, {$set: {cancelled: true}});
			return true;
		}
		else
			throw new Meteor.Error(500, "User is not a member of the team that made this posting");
	},
	parsePitches: function(pitches) {
		var pitchList, thisPitch, i, j, success = [], failure = [];
		pitchList = pitches.split('\n');
		for (i = pitchList.length; i; i--) {
			thisPitch = pitchList[i - 1].split(',');
			if (thisPitch.length === 3) {
				var res = HTTP.get('http://maps.googleapis.com/maps/api/geocode/json', {
					params: {
						address: thisPitch[2],
						sensor: false
					}
				});
				if (res && res.content) {
					var content = JSON.parse(res.content);
					if (content && content.results && content.results.length) 
						success.push({
							address: content.results[0].formatted_address,
							location: content.results[0].geometry.location,
							name: thisPitch[1],
							owner: thisPitch[0]
						});
					else
						failure.push({
							name: thisPitch[1],
							owner: thisPitch[0],
							address: thisPitch[2],
							reason: "cannot geocode"
						});
				}
				else
					failure.push({
						name: thisPitch[1],
						owner: thisPitch[0],
						address: thisPitch[2],
						reason: "cannot geocode"
					});					
			}
			else if (pitchList[i - 1].length)
				failure.push({
					details: pitchList[i - 1],
					reason: "cannot understand this line"
				});				
		}
		return {success: success, failure: failure};
	},
	evaluate: function(string) {
		return eval(string);
	},
	logThis: function(log) {
		var console = appConfig.sendToLogger;
		console.log(log);
	},
	runFunction: function(funcName, args) {
		var func = global, dotLoc = funcName.indexOf('.');
		while ((typeof func != undefined) && dotLoc > -1) {
			func = func[funcName.slice(0, dotLoc)];
			dotLoc = funcName.indexOf('.');
			funcName = funcName.slice(dotLoc + 1);
		}
		return (func && func.apply(this, args));
	}
});	