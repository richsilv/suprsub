Meteor.methods({
	pitchesWithin: function(center, distance) {
		var ratio = 6.283184 / 360;
		var lng = center.lng * ratio;
		var lat = center.lat * ratio;
		var width = Math.acos(Math.pow(Math.cos(lat), 2) * Math.cos(ratio) + Math.pow(Math.sin(lat), 2)) * 6371 / 111;
		var d2 = Math.pow(distance/111000, 2);
		return Pitches.find().fetch().filter(function(p) {return (Math.pow(p.location.lat - center.lat, 2) + Math.pow((p.location.lng - center.lng) * width, 2) < d2);});
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
		return (null, serverFunctions.parseRequest(tokens));
	},
	analyseText: function(string) {
		var tokens = _.map(appConfig.Tokenizer.tokenize(string), function(token) {return token.toLowerCase();});
		return (null, serverFunctions.parseTokens(tokens));
	},
	categoriseToken: function(token) {
		return serverFunctions.categoriseToken(token);
	},
	makePosting: function(posting, data, user) {
		if (!user) user = Meteor.userId();
		var sentence = serverFunctions.describePosting(posting);
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
		return fut.wait();
	},
	twitterSendMessage: function(string) {
		var user = Meteor.user().services.twitter, fut = new Future();
		if (!user) return new Meteor.Error(500, "User has not linked their Twitter account.");
		var Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
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
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		Twit.post('statuses/update', { status: string }, function(err, res) {
			console.log("probably sent: " + string);
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterReplyTweet: function(tweetId, string) {
		console.log("sending reply: " + string + " to tweetId " + tweetId);
		var fut = new Future(), Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         appConfig.twitterToken.token,
			access_token_secret:  appConfig.twitterToken.secret
		});
		Twit.post('statuses/update', { status: string, in_reply_to_status_id: tweetId }, function(err, res) {
			fut.return({err: err, res: res});
		});
		fut.wait();
	},
	twitterBefriendSuprSub: function(user) {
		var fut = new Future();
		if (!user) user = Meteor.user().services.twitter;
		if (!user) return new Meteor.Error(500, "User has not linked their Twitter account.");
		var Twit = new TwitMaker({
			consumer_key:         appConfig.twitterconfig.consumerKey,
			consumer_secret:      appConfig.twitterconfig.secret,
			access_token:         user.accessToken,
			access_token_secret:  user.accessTokenSecret
		});
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
	sendRingerCode: function(code, name) {
		var contacts = Meteor.user().profile.contact,
			team = Teams.findOne(code),
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
	}
});