Future = Npm.require('fibers/future');

appConfig = (function() {

	Natural = Meteor.require('natural');

	return {
		facebooklocal: SecureData.findOne({Name: 'facebooklocal'}).Value,
		facebookprod: SecureData.findOne({Name: 'facebookprod'}).Value,
		twitterconfig: SecureData.findOne({Name: 'twitterconfig'}).Value,
		twitterlocal: SecureData.findOne({Name: 'twitterlocal'}).Value,
		//twitterAccountId: SecureData.findOne({Name: 'twitterconfig'}).AccountId,
		//twitterToken: SecureData.findOne({Name: 'twitterconfig'}).Token;
		// DELETE THIS TO POST AS SUPRSUB
		twitterAccountId: SecureData.findOne({Name: 'twitterlocal'}).AccountId,
		twitterToken: SecureData.findOne({Name: 'Claudio'}).Value.service.twitter,
		// ==============================
		dictionary: JSON.parse(Assets.getText("dictionary.json")),
		dayDictionary: JSON.parse(Assets.getText("daydictionary.json")),
		numberDictionary: JSON.parse(Assets.getText("numberdictionary.json")),
		pitchSurnames: JSON.parse(Assets.getText("pitchsurnames.json")),
		stateMap: JSON.parse(Assets.getText("statemap.json")),
		uselessTokens: JSON.parse(Assets.getText("uselesstokens.json")),
		timeRegex: /^([0-9]{1,2})(?:[:.]([0-5][0-9]))?([ap]m)?$/,
		regexDict: [
			{name: 'number', regex: /^[0-9]+$/, code: 6, transform: function(token) {return parseInt(token, 10);}},
			{name: 'twitterHandle', regex: /^@[A-Za-z0-9_]+$/, code: 20, transform: function(token) {return token;}},
			{name: 'eventId', regex: /^_id[A-Za-z0-9]+$/, code: 19, transform: function(token) {return token.substr(3);}},
			{name: 'teamSize', regex: /^(\d+)(?:as|-a-side)$/, code: 18, transform: function(token) {return parseInt(/^(\d+)(?:as|-a-side)$/.exec(token)[1], 10);}},
			{name: 'price', regex: /^(?:£)([0-9]+\.?[0-9]{0,2})$/, code: 17, transform: function(token) {return parseFloat(/^(?:£)([0-9]+\.?[0-9]{0,2})$/.exec(token)[1], 10);}}
					],
		Natural: Natural,
		Tokenizer: new Natural.RegexpTokenizer( { pattern: /[\,\.]?[\s(?:\r\n)]*(?:\s|(?:\r\n)|$)/ } )

	};

})();