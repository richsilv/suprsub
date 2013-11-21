SecureData = new Meteor.Collection("securedata");

var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;

Accounts.loginServiceConfiguration.remove({
    service: "facebook"
});
if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
	Accounts.config({sendVerificationEmail: false, forbidClientAccountCreation: false});
	Accounts.loginServiceConfiguration.insert(facebookprod);
}
else {
	Accounts.loginServiceConfiguration.insert(facebooklocal);	
}
