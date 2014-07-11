var duplicateEmail, duplicate = new suprsubDep(false);

Template.settingsBox.helpers({
  contactString: function() {
    var cString = '', contactArray = Meteor.user().profile.contact;
    if (!contactArray.length) return "None";
    else {
      for (var i = 0; i < contactArray.length; i++) cString += appVars.contactNames[contactArray[i]] + ", ";
    }
  return cString.substr(0, cString.length - 2);
  },
  contactActive: function(num) {
    if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.contact) 
      return (Meteor.user().profile.contact.indexOf(num) > -1);
    else return false;
  }
});

Template.settingsBox.events({
  'click #saveButton': function(event) {
    /*Meteor.users.update(Meteor.userId(), {$set: update}, function(err) {
      if (!err) {
        var icon = $(event.target);
        if (icon.prop("tagName") != "I") icon = icon.children('i');
        icon.removeClass("save").addClass("checkmark fontGlow");
        icon.parents('#saveButton').addClass('boxGlow');
        Meteor.setTimeout(function() {
          icon.addClass("save").removeClass("checkmark fontGlow")
          icon.parents('#saveButton').removeClass('boxGlow');
        }, 1000)
      }
    });*/
  },
  'click #linkButton': function() {
    templateAttach(Template.linkModalWrapper, function() {
      $('#linkModal').modal({
        onHide: function() {
          $('.ui.dimmer.page').remove();
          $('#linkModal').remove();
          duplicateEmail = null;
          duplicate.set(false);
        },
        closable: true
      });
      $('#linkModal').modal('show');
    });
    // UI.insert(UI.render(Template.linkModal), document.getElementById('linkModalHolder'));
  },
  'click #waitingButton': function() {
    confirmModal({
      message: "<h3>Send Confirmation Email?</h3><p>Would you like another confirmation e-mail to be sent to <em>" +
      (Meteor.user().emails ? Meteor.user().emails[0].address : 'false') + "</em>?",
      callback: function() {
        Meteor.call('sendVerificationEmail');
        confirmModal({
          message: "<h3>Confirmation Email Has Been Sent</h3><p>Check your inbox, and if you can't find the mail, check your spam folder!</p>",
          noButtons: true
        },
        function() { Meteor.setTimeout(function() {$('#generalConfirmModal').modal('show'); }, 250);}
        )
      }},
      function() { Meteor.setTimeout(function() {$('#generalConfirmModal').modal('show'); }, 250);}
    );
  },
  'click #facebookButton': function() {
    if (!('facebook' in Meteor.user().services)) {
      Meteor.loginWithFacebook({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
          console.log(err);
      });
    }
  },
  'click #twitterButton': function() {
    if (!('twitter' in Meteor.user().services)) {
      Meteor.loginWithTwitter({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
          console.log(err);
      });
    }
  },
  'click .dropdown .menu .item': function(event) {
    var clickedChoice = parseInt(event.target.attributes['data-value'].nodeValue, 10),
        thisUser = Meteor.user();
    if (thisUser.profile.contact.indexOf(clickedChoice) === -1)
      Meteor.users.update(thisUser._id, {$push: {'profile.contact': clickedChoice}});
    else if (thisUser.profile.contact.length > 1) 
      Meteor.users.update(thisUser._id, {$pull: {'profile.contact': clickedChoice}});
    $('.dropdown').dropdown('set text', clientFunctions.contactString()).dropdown('hide');
  }
});

Template.settingsBox.rendered = function() {
  var thisUser = Meteor.user();
  $(this.findAll('.ui.checkbox')).checkbox({verbose: false, debug: false, performance: false});
  clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
  $(this.findAll('.ui.dropdown')).dropdown({verbose: false, debug: false, performance: false, action: 'nothing'});
  $(this.findAll('.ui.dropdown')).dropdown('set text', clientFunctions.contactString());
  $(this.findAll('.ui.dropdown')).find('.item').each(function(i, elem) {
    if (thisUser.profile.contact && thisUser.profile.contact.indexOf(parseInt(elem.attributes['data-value'].nodeValue, 10)) > -1)
      $(elem).addClass('active');
    else
      $(elem).removeClass('active');
  });
  if (thisUser.profile.postMe) $('#postUser').checkbox('enable');
};

// **************************

Template.otherSettingsBox.events({
  'click #deleteAccount': function() {
    confirmModal({
      message: '<h3 class="ui dividing header">Delete Account</h3><p>Are you sure you want to delete this account?  All your player information will be deleted, and any team for which you are the only registered player will also be deleted.</p>',
      callback: function() {
        // DELETE ACCOUNT
        Meteor.call('removeCurrentUser');
        console.log("account deleted");
      }
    }, function() {
      Meteor.setTimeout(function() {
        $('#generalConfirmModal').modal('show');
      }, 250);
    });
  }
});

// **************************

Template.settingsMainButtons.events({
  'click #resetButton': function() {
    var thisUser = Meteor.user();
    if (thisUser && thisUser.profile && thisUser.profile.player) {
    }
    else {
    }
  },
  'click #saveButton': function(event) {
    if (!$(event.target).hasClass('disabled') && !$(event.target).parents('#saveButton').hasClass('disabled'))
      saveSettingsData.call(this, event);
  }
});

// **************************

Template.linkModal.helpers({
  duplicate: function() {
    return duplicate.get();
  }
});

// **************************

Template.attachEmail.events({
  'click #emailCancel': function() {
    $('.modal').filter(':visible').modal('hide');
  },
  'click #emailSubmit': function() {
    Meteor.call('emailExists', $('#emailEntry').val(), function(err, res) {
      if (res) {
        duplicateEmail = $('#emailEntry').val();
        duplicate.set(true);
      }
      else {
        Meteor.call('addEmailCredentials', {
          email: $('#emailEntry').val(), 
          srp: Package.srp.SRP.generateVerifier($('#passwordEntry').val())
        }, function(err, res) {
          if (!err) Meteor.call('sendVerificationEmail');
        });
        $('.modal').filter(':visible').modal('hide');
      }
    });
  }
});

Template.duplicateEmail.helpers({
  email: function() {
    return duplicateEmail;
  }
});

/*Template.linkModal.rendered = function() {
  $('#linkModal').modal({
    onShow: function() {
      $('body').dimmer({
        debug: false,
        performance: false,
        verbose: false,
        onHide: function() {
          console.log("hidden");
          $(linkModal).remove();
          appVars.venues.dep.changed();
        }
      });
    },
    onHide: function() {
      $(linkModal).remove();
      appVars.venues.dep.changed();
    },
    debug: false,
    performance: false,
    verbose: false
  });
};*/

// ****************** UTILITY ************

function saveSettingsData(event) {
  var pageData = {
    postMe: $('#postUser input')[0].checked
  }, update = {
    'profile.postMe': pageData.postMe
  };
  Meteor.users.update({_id: Meteor.userId()}, {$set: update}, function(err) {
    if (!err) {
      if (event) {
        var icon = $(event.target);
        if (icon.prop("tagName") != "I") icon = icon.children('i');
        icon.removeClass("save").addClass("checkmark fontGlow");
        icon.parents('#saveButton').addClass('boxGlow');
        Meteor.setTimeout(function() {
          icon.addClass("save").removeClass("checkmark fontGlow")
          icon.parents('#saveButton').removeClass('boxGlow');
        }, 1000);
      }
    }
    else console.log(err);
  });
}