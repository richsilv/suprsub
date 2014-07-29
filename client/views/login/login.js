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
        if (Router.current().path === '/') {
            Router.go('/login');
            return;
        }
        Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
          if (err) accountError.set(err.reason);
          else Router.current().redirect('/home');
        });
    },
    'click #logout-button' : function() {
        Meteor.logout();
        Router.current().redirect('/');
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
    },
    forgottenPassword: function() {
        return accountError.get() === "Incorrect password";
    }
})
Template.loginScreen.events({
    'click #signup-button, keyup #confirm-password' : function(event) {
        if ((event.keyCode && event.keyCode !== 13) || event.keyCode === 0) return false;
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
                Router.current().redirect('/home');
                // location.reload();
            }
        });
    },
    'click #reset-button': function() {
        var email = $('#login-email').val();
        Accounts.forgotPassword({email: email}, function(err) {
            if (err)
                console.log(err);
            else {
                confirmModal({
                    message: "<h2>PASSWORD RESET SENT</h2><p>A password reminder has been sent to <em>" + email + "</em>.  Please check your email, including your spam folder.</p>",
                    callback: null,
                    noButtons: true
                    },
                    function() { Meteor.setTimeout(function() {$('#generalConfirmModal').modal('show'); }, 100);}
                );
          }            
        });
    },
    'keyup .form .field input' : function(event) {
        if (event.keyCode === 13) {
            $(event.target).parents('.field').next().find('input').focus();
        }
    },
    'click #facebook-login': function(event) {
        Meteor.loginWithFacebook({requestPermissions: ['email']},
            function (error) {
                if (error) {
                    console.log(error);
                    accountError.set('Cannot login with Facebook');                    
                }
                else {
                    Router.current().redirect('/home');
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

Template.resetBox.helpers({
    accountError: function() {
        return accountError.get();
    }
});
Template.resetBox.events({
    'click #reset-button, keyup #confirm-password' : function(event) {
        if ((event.keyCode && event.keyCode !== 13) || event.keyCode === 0) return false;
        if ($('#signup-password').val() !== $('#confirm-password').val()) {
            accountError.set("Passwords do not match");
            $('#signup-password').val('');
            $('#confirm-password').val('');
            $('#signup-password').focus();
            return;
        }
        Accounts.resetPassword(
            appVars.resetCode,
            $('#signup-password').val(), 
            function(err) {
                if (err) {
                    console.log(err);
                    accountError.set(err.reason);
                }
                else {
                    Router.current().redirect('/home');
                    // location.reload();
                }
            }
        );
    }   
});

Template.twitterGenderModal.events({
    'click #genderConfirmButton': function(event) {
        $('#twitterGenderModal').modal('hide');
        Meteor.setTimeout(function() {
            Meteor.users.update(Meteor.userId(), {$set: {'profile.gender': $('#mfSubBox .checkbox input')[0].checked ? 1 : 0}, $unset: {'profile.confirmGender': ''}}, {}, function(err) {
                Subs.events.stop();
                Subs.events = Meteor.subscribe('events', Subs.postingsChoice.get(), Subs.postingsUser.get());
            });
            Router.current().redirect('/home');
        }, 50);
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