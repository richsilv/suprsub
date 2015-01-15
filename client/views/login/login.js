/*****************************************************************************/
/* Login: Event Handlers and Helpers */
/*****************************************************************************/
var accountError = new ReactiveVar(null);

Template.topbar.events({

  'click [data-action="log-in"], submit form': function(event, template) {

    Meteor.loginWithPassword(template.email.get(), template.password.get(), loginCallback.bind(this, 'that username/password'));

  }

})

Template.Login.events({

  'click [data-action="facebook"]': function() {
    Meteor.loginWithFacebook({
      requestPermissions: ['email']
    },
      loginCallback.bind(this, 'Facebook')
    );
  },

  'click [data-action="twitter"]': function() {
    Meteor.loginWithTwitter({}, loginCallback.bind(this, 'Twitter'));
  },

  'click [data-action="sign-up"], submit': function(event, template) {
    var password = template.$('[data-field="password"]').val(),
        passwordConfirm = template.$('[data-field="password-confirm"]').val(),
        email = template.$('[data-field="email"]').val(),
        firstName = template.$('[data-field="first-name"]').val(),
        lastName = template.$('[data-field="last-name"]').val(),
        name = [firstName, lastName].join(' ');

    if (!(
        Match.test(lastName, String) &&
        Match.test(firstName, String) &&
        Match.test(email, String) &&
        Match.test(password, String) &&
        password === passwordConfirm
      )) {
      accountsError.set('Please check details');
      return false;
    }

    Accounts.createUser({
        email: email, 
        password: password, 
        profile: {
            first_name: firstName, 
            last_name: lastName,
            name: name,
            gender: template.$('[data-field="gender"]')[0].checked | 0

        }
    }, function(err) {
        if (err) {
            console.log(err);
            accountError.set(err.reason);
        }
    });      
    return false;
  },

  'click [data-action="reset-password"]': function(event, template) {
    var email = template.$('[data-field="email"]').val();
    Accounts.forgotPassword({
      email: email
    }, function(err) {
      if (err) {
        console.log(err);
        accountError.set("Cannot send reminder email");
      } else {
        SemanticModal.confirmModal({
          message: "<h2>Password Reset Sent</h2><p>A password reminder has been sent to <em>" + email + "</em>.  Please check your email, including your spam folder.</p>",
          callback: null,
          noButtons: true
        });
      }
    });
  }

});

Template.Login.helpers({
  accountError: function() {
    return accountError.get();
  }
});

/*****************************************************************************/
/* Login: Lifecycle Hooks */
/*****************************************************************************/
Template.Login.created = function() {};

Template.Login.rendered = function() {
  $('.ui.checkbox').checkbox();
  $('.checkboxLabel').checkboxLabel();
};

Template.Login.destroyed = function() {
  $('.ui.checkbox').checkbox('destroy');
  $('.checkboxLabel').checkboxLabel('destroy');
};

function loginCallback(serviceName, error) {
  if (error) {
    console.log(error);
    accountError.set('Cannot login with ' + serviceName + ': ' + error.reason);
  } else {
    App.subs.user = Meteor.subscribe('user');
  }
}