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
    },
    'click #delete-button' : function() {
        Meteor.call('removeCurrentUser');
    },
    'keyup #login-email, keyup #login-password': function(events) {
        if (event.keyCode === 13)    
            Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
                if (err) accountError.set(err.reason);
            });      
    }
});

Template.loginScreen.helpers({
    accountError: function() {
        return accountError.get();
    }
})
Template.loginScreen.events({
    'click #signup-button, keyup .form .input' : function(event) {
        if (event.keyCode && event.keyCode !== 13) return false;
        if ($('#signup-password').val() !== $('#confirm-password').val()) {
            accountError.set("Passwords do not match");
            $('#signup-password').val('');
            $('#confirm-password').val('');
            $('#signup-password').focus();
            return;
        }
        Accounts.createUser({
            email: $('#signup-email').val(), 
            password: $('#signup-password').val(), 
            profile: {
                first_name: $('#firstname').val(), 
                last_name: $('#lastname').val(),
                name: $('#firstname').val() + ' ' + $('#lastname').val(),
                gender: $('#mfBox .checkbox input')[0].checked ? 1 : 0

            }
        }, function(err) {
            if (err) {
                console.log(err);
                accountError.set(err.reason);
            }
            else {
                Router.current().redirect('/player');
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
    },
    'click #twitter-login': function(event) {
        Meteor.loginWithTwitter({}, function(error) {
            if (error) {
                console.log(error);
                accountError.set('Cannot login with Twitter');
            }
        });
    },
    'submit': function() {
        return false;
    }
});
Template.loginScreen.rendered = function() {
    $(this.findAll('.ui.neutral.checkbox')).checkbox({verbose: false, debug: false, performance: false});
    clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
};

Template.twitterGenderModal.events({
    'click #genderConfirmButton': function(event) {
        $('#twitterGenderModal').modal('hide');
        Meteor.setTimeout(function() {
            Meteor.users.update(Meteor.userId(), {$set: {'profile.gender': $('#mfSubBox .checkbox input')[0].checked ? 1 : 0}, $unset: {'profile.confirmGender': ''}});
            Router.current().redirect('/player');
            location.reload();
        }, 600);
    }
})

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