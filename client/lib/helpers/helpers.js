Handlebars.registerHelper("option", function(option) {
  if (appVars.mainOption) return Router.current(true).path === option;
  else return false;
});

Handlebars.registerHelper("tabChoice", function(key, value) {
  if (appVars.tabChoices) return appVars.tabChoices.get()[key] === value;
  else return false;  
});

Handlebars.registerHelper("service", function(network) {
  return Meteor.user() && 'services' in Meteor.user() ? network in Meteor.user().services : false;
});

Handlebars.registerHelper("email", function(level) {
  switch (level) {
    case 'verified':
      return Meteor.user().emails ? Meteor.user().emails[0].verified : false;
    case 'unverified':
      return Meteor.user().emails ? !Meteor.user().emails[0].verified : false;
    default:
      return Meteor.user().emails ? Meteor.user().emails[0].address : false;
  }
});