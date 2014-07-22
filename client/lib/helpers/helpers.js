UI.registerHelper("option", function(option) {
  if (appVars.mainOption) return Router.current(true).path === option;
  else return false;
});

UI.registerHelper("tabChoice", function(key, value) {
  if (appVars.tabChoices) return appVars.tabChoices.get()[key] === value;
  else return false;  
});

UI.registerHelper("service", function(network) {
  return Meteor.user() && 'services' in Meteor.user() ? network in Meteor.user().services : false;
});

UI.registerHelper("email", function(level) {
  if (!Meteor.userId()) return false;
  switch (level) {
    case 'verified':
      return Meteor.user().emails ? Meteor.user().emails[0].verified : false;
    case 'unverified':
      return Meteor.user().emails ? !Meteor.user().emails[0].verified : false;
    default:
      return Meteor.user().emails ? Meteor.user().emails[0].address : false;
  }
});