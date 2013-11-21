var accountError = {
    code: null,
    dep: new Deps.Dependency(),
    get: function () {
        this.dep.depend();
        return this.code;
    },
    set: function (newValue){
        if (this.code !== newValue) {
            this.code = newValue;
            this.dep.changed();
        }
        return this.code;
    }
};

Template.topbar.events({
    'click #login-button' : function() {
        Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
          if (err) accountError.set(err.reason);
        });
    },
    'click #logout-button' : function() {
        Meteor.logout();
    }
});

Template.signUpBox.helpers({
    accountError: function() {
        return accountError.get();
    }
})
Template.signUpBox.events({
    'click #signup-button' : function() {
        if ($('#signup-password').val() !== $('#signup-confirm').val()) {
            accountError.set("Passwords do not match");
            $('#signup-password').val('');
            $('#signup-confirm').val('');
            $('#signup-password').focus();
        }
        Accounts.createUser({
            email: $('#signup-email').val(), 
            password: $('#signup-password').val(), 
            profile: {
                FirstName: $('#firstname').val(), 
                LastName: $('#lastname').val()
            }
        }, function(err) {
            if (err) {
                console.log(err);
                accountError.set(err.reason);
            }
        });
    },
    'click #facebook-login': function(event) {
        Meteor.loginWithFacebook({ requestPermissions: ['email']},
            function (error) {
                if (error) {
                    accountError.set('Cannot login with Facebook');                    
                }
            });
    }
});

Deps.autorun(function() {
    if (Accounts._resetPasswordToken) {
        Session.set('resetPassword', Accounts._resetPasswordToken);
        Session.set('action', 'reset');
    }
    if (Accounts._verifyEmailToken) {
        Accounts.verifyEmail(Accounts._verifyEmailToken, function(err) {
            if (err) {
                accountError.set(err.reason);
            };
        })
    }
});
Deps.autorun(function() {
    if (accountError.get()) $('#errorBox').show(); 
    else $('#errorBox').hide();
});