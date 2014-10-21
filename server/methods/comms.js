/*****************************************************************************/
/* Twitter Methods */
/*****************************************************************************/

Meteor.methods({

	'comms/sendVerificationEmail': function() {
		Accounts.sendVerificationEmail(Meteor.userId());
	},

	'comms/sendTeamCode': function(code) {

		var rootURL = Meteor.absoluteUrl('', {
				replaceLocalHost: true
			}),
			link = rootURL + '/team/player/' + code,
			details = {
				from: 'info@suprsub.com',
				subject: 'Here\'s the code to send to your teammates',
				header: 'Here\'s the code to send to your teammates',
				twitterMessage: 'The code you need to send your teammates to have them sign up for your team is ' + code,
				message: '<p>The code your teammates need to enter at <a href="' +
					rootURL + '/team">www.suprsub.com</a> is <strong>' +
					code + '</strong>.</p>' +
					'<p>Alternatively, they can just click on this link:</p>' +
					'<p><a href="' + link + '">' + link + '</a>'
			};

		return distributeMessage(this.userId, details);

	},

	'comms/sendRingerCode': function(code) {

		var rootURL = Meteor.absoluteUrl('', {
				replaceLocalHost: true
			}),
			link = rootURL + '/team/ringer/' + code,
			details = {
				from: 'info@suprsub.com',
				subject: 'Here\'s the code to send to your Suprsubs',
				header: 'Here\'s the code to send to your Suprsubs',
				twitterMessage: 'The code you need to send your preferred Suprsubs to have them sign up for your team is ' + code,
				message: '<p>The code your Suprsubs need to enter at <a href="' +
					rootURL + '/team">www.suprsub.com</a> is <strong>' +
					code + '</strong>.</p>' +
					'<p>Alternatively, they can just click on this link:</p>' +
					'<p><a href="' + link + '">' + link + '</a>'
			};

		return distributeMessage(this.userId, details);

	}

});

// GENERAL METHODS

function distributeMessage(userId, details) {

	var media = {},
		user = Meteor.users.findOne(userId);

	if (!user) {
		console.warn('Trying to message non-existent user', userId);
		return false;
	}
	if (user.profile.contact.indexOf(0) > -1) {
		media.twitter = user.services.twitter.id;
	}
	if (user.profile.contact.indexOf(2) > -1) {
		media.email = user.emails.length && user.emails[0].address;
	} else if (user.profile.contact.indexOf(1) > -1) {
		media.email = user.services.facebook && user.services.facebook.email;
	}

	if (media.twitter) {
		var twitterMessage = details.twitterMessage || details.message;
		App.twitter.sendMessage(twitterMessage.slice(0, 140), media.twitter);
	}

	if (media.email) {
		Meteor.defer(function() {
			Email.send({
				from: details.from,
				to: media.email,
				subject: details.subject,
				html: Handlebars.templates['generic'](details)
			})
		});
	}

	return _.map(media, function(value, key) {if (value) return key;});

}

// TWITTER METHODS

var twitterCredentials = Meteor.settings.production ? "twitterconfig" : "twitterlocal";

var twitterConfig = SecureData.findOne({
		Name: twitterCredentials
	}),
	TwitMaker = Meteor.npmRequire('twit'),
	Future = Meteor.npmRequire('fibers/future');

function connectTwitter() {

	var twit = new TwitMaker({
		consumer_key: twitterConfig.Value.consumerKey,
		consumer_secret: twitterConfig.Value.secret,
		access_token: twitterConfig.Token.token,
		access_token_secret: twitterConfig.Token.secret
	});

	twit.sendMessage = function(string, twitterId) {
		var fut = new Future(),
			posting = {
				text: string
			};
		if (!(twitterId)) throw new Meteor.Error(500, "I need a twitter id to send a message.");
		if (/^[0-9]+$/.exec(twitterId)) {
			posting.user_id = twitterId;
		} else {
			posting.screen_name = twitterId;
		}
		twit.post('direct_messages/new', posting, function(err, res) {
			fut.return({
				err: err,
				res: res
			});
		});
		return fut.wait();
	};

	twit.sendTweet = function(string) {
		var fut = new Future();
		twit.post('statuses/update', {
			status: string
		}, function(err, res) {
			console.log("Attempted to send: " + string);
			fut.return({
				err: err,
				res: res
			});
		});
		fut.wait();
	};

	twit.replyTweet = function(tweetId, string) {
		var fut = new Future();
		twit.post('statuses/update', {
			status: string,
			in_reply_to_status_id: tweetId
		}, function(err, res) {
			fut.return({
				err: err,
				res: res
			});
		});
		fut.wait();
	},

	twit.getDetails = function(userString) {
		var fut = new Future(),
			params = {
				include_entities: false
			};
		if (typeof userString === "number") {
			params.user_id = userString;
		} else {
			params.screen_name = userString;
		}
		twit.get('users/show', params, function(err, res) {
			if (err) {
				fut.throw(err);
			} else {
				fut.return(res);
			}
		});
		return fut.wait();
	},

	twit.befriend = function(user) {
		var fut = new Future();
		if (!user) user = Meteor.user().services.twitter;
		if (!user) throw new Meteor.Error(500, "User has not linked their Twitter account.");
		var reverseTwit = new TwitMaker({
			consumer_key: twitterConfig.Value.consumerKey,
			consumer_secret: twitterConfig.Value.secret,
			access_token: user.accessToken,
			access_token_secret: user.accessTokenSecret
		});
		reverseTwit.post('friendships/create', {
			user_id: twitterCredentials.AccountId,
			follow: true
		}, function(errOne, resOne) {
			twit.post('friendships/create', {
				user_id: user.id,
				follow: true
			}, function(errTwo, resTwo) {
				fut.return({
					err: [errOne, errTwo],
					res: [resOne, resTwo]
				});
			});
		});
		return fut.wait();
	};

	return twit;

}

function streamTwitter(twitter) {

	var stream = twitter.stream('user', {
		with: 'user'
	});
	stream.connected = false;
	stream.on('tweet', Meteor.bindEnvironment(
		processTweet,
		function(e) {
			console.log("Bind Error!");
			console.trace();
			console.log(e);
		}));
	stream.on('connected', function(request) {
		if (!this.connected) {
			console.log("Connected to Twitter.");
			stream.connected = true;
		}
	});
	stream.on('disconnect', function(disconnectMessage) {
		console.log("Disconnected from Twitter:", disconnectMessage);
		stream.connected = false;
	});
	stream.on('reconnect', function(request, response, connectInterval) {
		console.log("Attempting to reconnect to Twitter.");
	});
	stream.on('warning', function(warning) {
		console.log("Warning from Twitter:", warning);
	});
	stream.isStreaming = function() {
		return stream.connected;
	};
	return stream;

}

function processTweet(tweet) {

	console.log("I should be processing this tweet:", tweet);

}

Meteor.startup(function() {

	var twitter = connectTwitter(),
		twitterStream = streamTwitter(twitter);

	_.extend(App, {

		twitter: twitter,
		twitterStream: twitterStream

	});

});