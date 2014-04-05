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
  'click #emailButton': function() {
    UI.insert(UI.render(Template.linkModal), document.getElementById('linkModalHolder'));
    // var frag = Meteor.render(function() {
    //   return Template.linkModal();
    // });
    // document.getElementById('linkModalHolder').appendChild(frag);
    $('#linkModal').modal('show');
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

Template.linkModal.events({
  'click #emailCancel': function() {
    $('.modal').filter(':visible').modal('hide');
  },
  'click #emailSubmit': function() {
    Meteor.call('emailExists', $('#emailEntry').val(), function(err, res) {
      if (res) {
        var duplicateEmail = $('#emailEntry').val();
        $('#linkModal').html(Template.duplicateEmail({email: duplicateEmail}));
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

Template.linkModal.rendered = function() {
  $('#linkModal').modal({
    onShow: function() {
      $('body').dimmer({
        debug: false,
        performance: false,
        verbose: false,
        onHide: function() {
          var linkModal = $('#linkModal')[0];
          Spark.finalize(linkModal);
          $(linkModal).empty();
          Deps.flush();
          appVars.venues.dep.changed();
        }
      });
    },
    onHide: function() {
      var linkModal = $('#linkModal')[0];
      Spark.finalize(linkModal);
      $(linkModal).empty();
      Deps.flush();
      appVars.venues.dep.changed();
    },
    debug: false,
    performance: false,
    verbose: false
  });
};

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