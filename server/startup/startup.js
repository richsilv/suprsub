Meteor.startup(function() {

    // LOG ALL QUERIES
/*    var wrappedFind = Meteor.Collection.prototype.find;

    console.log('[startup] wrapping Collection.find')
    
    Meteor.Collection.prototype.find = function () {
      console.log(this._name + '.find', JSON.stringify(arguments))
      return wrappedFind.apply(this, arguments);
    }*/

	// COLLECTION OBSERVERS

	// STARTUP PROCESSES
	// Pitches._ensureIndex({ location : "2d" });
	if (Meteor.settings && Meteor.settings.streamTwitter) {
		serverFunctions.streamTwitter();
		appConfig.streaming = true;
	}

	Pitches.remove({name: {$exists: false}});
	Pitches.find({prettyLocation: {$exists: false}}).forEach(function(p) {
		Pitches.update(p, {$set: {prettyLocation: serverFunctions.prettyLocation(p)}});
	})

	// ACCOUNTS INJECTION ON SERVER STARTUP
	Accounts.loginServiceConfiguration.remove({
		service: "facebook"
	});
	Accounts.loginServiceConfiguration.remove({
		service: "twitter"
	});
	if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
		//	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
		Accounts.loginServiceConfiguration.insert(appConfig.facebookprod);
		Accounts.loginServiceConfiguration.insert(appConfig.twitterconfig);
	}
	else {
		Accounts.loginServiceConfiguration.insert(appConfig.facebooklocal);
		Accounts.loginServiceConfiguration.insert(appConfig.twitterlocal);	
	}

});