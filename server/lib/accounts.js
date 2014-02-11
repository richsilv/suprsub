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
	var loggedInUser = Meteor.user(), setAttrs = {}, stampedToken;
	if (serviceName === "facebook" && loggedInUser) {
		var existingFBUser = Meteor.users.findOne({"services.facebook.id": serviceData.id});
		if (existingFBUser && existingFBUser._id !== loggedInUser._id) {
			stampedToken = Accounts._generateStampedLoginToken();
			_.each(existingFBUser.services.facebook, function(value, key) {
				setAttrs["services.facebook." + key] = value;
			});
			Meteor.users.remove(existingFBUser._id);
			Meteor.users.update(
				loggedInUser._id, {
					$set: setAttrs,
					$push: {
						'services.resume.loginTokens': {
							$each: existingFBUser.services.resume.loginTokens.concat(stampedToken)
						}
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
			stampedToken = Accounts._generateStampedLoginToken();
			_.each(existingTwitterUser.services.twitter, function(value, key) {
				setAttrs["services.twitter." + key] = value;
			});
			Meteor.users.remove(existingTwitterUser._id);
			Meteor.users.update(
				loggedInUser._id, {
					$set: setAttrs,
					$push: {
						'services.resume.loginTokens': {
							$each: existingTwitterUser.services.resume.loginTokens.concat(stampedToken)
						}
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
/* End of Login Service Section */

Accounts.onCreateUser(function(options, user) {
	if ('facebook' in user.services) {
		if (options.profile) user.profile = _.extend(options.profile, {
			first_name: user.services.facebook.first_name,
			last_name : user.services.facebook.last_name,
			gender: user.services.facebook.gender === "male" ? 0 : 1, 
			contact: [1]
			});
		else user.profile = {
			first_name: user.services.facebook.first_name,
			last_name : user.services.facebook.last_name,
			gender: user.services.facebook.gender === "male" ? 0 : 1,
			contact: [1]
			};
	}
	else if ('twitter' in user.services) {
		if (options.profile && 'name' in options.profile) {
			names = serverFunctions.divideName(options.profile.name);
			user.profile = _.extend(options.profile, {
				first_name: names[0],
				last_name: names[1],
				contact: [0]
			});
		}
		else user.profile = {contact: [0]};
		user.profile = _.extend(user.profile, {confirmGender: true});
		Meteor.call('twitterBefriendSuprSub', user.services.twitter);
	}
	else {
		user.profile = _.extend(options.profile, {contact: [2], team: {_ids: []}});
	}
	return user;
});