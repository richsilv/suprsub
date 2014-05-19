var postBoxText = new suprsubDep(false),
    picker;

// *********************************

Template.homePage.helpers({
  filter: function() {
    return Subs.postingsChoice.get();
  },
  postingsUser: function() {
    return Subs.postingsUser.get();
  },
  postBoxText: function() {
    return postBoxText.get();
  }
});
Template.homePage.events({
  'click #allFilter': function() {
    Subs.postingsChoice.set('');
    Subs.postingsUser.set(false);
  },
  'click #userFilter': function() {
    Subs.postingsChoice.set(Meteor.userId());
    Subs.postingsUser.set(false);
  },
  'click #userPostings': function() {
    Subs.postingsChoice.set(Meteor.userId());
    Subs.postingsUser.set(true);
  },  
  'click #postBoxTextChoice .item': function(event) {
    if (event.target.attributes.activate.value === "1")
      postBoxText.set(true);
    else
      postBoxText.set(false);
  }
})

Template.postBox.helpers({
  'teamRegistered': function() {
    var thisUser = Meteor.user();
    return (thisUser && thisUser.profile && thisUser.profile.team._ids.length);   
  }
});
Template.postBox.events({
  'submit #postingForm, click #postingButton': function() {
    Meteor.call('analysePosting', $('#postingArea').val(), function(err, res) {
      if (err) console.log(err);
      else if (!Meteor.user().profile.team._ids.length) console.log("This user has no team");
      else {
        var requestData = {
          players: null,
          dateTime: null,
          location: null,
          onlyRingers: false,
          gender: 0,
          price: 0
        };
        requestData = _.extend(requestData, res, {team: Meteor.user().profile.team._ids[0]});
        appVars.newPosting.set(requestData);
        console.log(requestData);
        UI.insert(UI.render(Template.postingModalWrapper), document.body);
        $('#postingModal').modal('setting', {
          onHide: function() {
            Meteor.setTimeout(function() {
              $('.ui.dimmer.page').remove();
            }, 200);
          }
        });
        Meteor.setTimeout(function() {$('#postingModal').modal('show');}, 200);
      }
    });
  }
});
Template.postBox.rendered = function() {
  var thisUser = Meteor.user();
/*  if (!(thisUser && thisUser.profile && thisUser.profile.team)) 
    $('#postingButton').popup({
      position: 'top center',
      inline: true,
      content: 'You need to enter your team details on the <strong>Team</strong> tab before you can make a posting.',
      debug: false,
      performance: false,
      verbose: false
    });
  $('#postingGuidelines').popup({
    position: 'top center',
    inline: true,
    content: 'Guidelines on how to make your posting.',
    debug: false,
    performance: false,
    verbose: false
  });  */
};

// ****************************

Template.fullPostingForm.helpers({
  'verified': function() {
    return verifyForm();
  },
  'teamRegistered': function() {
    var thisUser = Meteor.user();
    return (thisUser && thisUser.profile && thisUser.profile.team._ids.length);;   
  }
})

Template.fullPostingForm.events({
  'keyup #homeGroundSearch': function(event, template) {
    if (event.keyCode === 27) {
      $('#matchesFloat').hide();
      return false;      
    }
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      if (Pitches.findOne({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"})) {
        var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
        var pitchElement = '<div class="ui segment content"><div class="field"><div class="ui link list">';
        pitchCursor.forEach(function(pitch) {pitchElement += '<a class="pitchEntry item" id="' + pitch._id + '">' + prettyLocation(pitch) + '</a>';});
        $('#matchesFloat').html(pitchElement + '</div></div></div>');
        $('#matchesFloat').show();
      }
    }
  },
  'change #timePickerMinute': function(event) {
    if (parseInt(event.target.value, 10) < 10)
      event.target.value = '0' + event.target.value;
  },
  'click .pitchEntry.item': function(event) {
    $('#homeGroundSearch').val(event.target.innerText);
    $('#homeGroundSearch').attr('data-value', event.target.id);
    $('#matchesFloat').hide();
  },
  'click #fullPostingFormSubmit': function(event) {
      var thisUser = Meteor.user(),
        requestData = {
          players: null,
          dateTime: null,
          location: null,
          onlyRingers: false,
          gender: 0,
          price: 0
        };
      if (!thisUser.profile.team._ids.length)
        return "Player has no team";
      else
        requestData.team = thisUser.profile.team._ids[0];
      if (!verifyForm()) return false;
      requestData.players = parseInt($('#numberPlayers').dropdown('get value'), 10);
      requestData.dateTime = picker.getDate();
      requestData.dateTime = new Date(requestData.dateTime.setHours($('#timePickerHour').val()) + ($('#timePickerMinute').val() * 60000));
      requestData.location = $('#homeGroundSearch').attr('data-value');
      requestData.gameType = $('#friendlyCompetitive input')[0].checked ? 1 : 0;
      var teamSize = parseInt($('#gameFormat').dropdown('get value'), 10);
      if (teamSize)
        requestData.teamSize = teamSize;
      if (parseInt($('#costInput').val(), 10))
        requestData.price = parseInt($('#costInput').val(), 10);
      if ($('#onlySuprsubs input')[0].checked)
        requestData.onlyRingers = true;
      requestData.gender = Meteor.user().profile.gender;
      appVars.newPosting.set(requestData);
      console.log(document.body);
      UI.insert(UI.render(Template.postingModalWrapper), document.body);
      $('#postingModal').modal('setting', {
        onHide: function() {
          Meteor.setTimeout(function() {
            $('.ui.dimmer.page').remove();
          }, 200);
        }
      });
      Meteor.setTimeout(function() {$('#postingModal').modal('show');}, 200);
    }
});

Template.fullPostingForm.rendered = function() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (picker) picker.destroy();
  picker = new Pikaday({
    field: $('#datepicker')[0],
    format: 'ddd, D MMM YYYY',
    defaultDate: tomorrow,
    setDefaultDate: false
  });
  // $('#datepicker').val(moment(tomorrow).format('Do MMMM YYYY'));
  $('#fullPostingForm .dropdown').dropdown({verbose: false, debug: false, performance: false});;
  $('.ui.neutral.checkbox').checkbox({verbose: false, debug: false, performance: false});
  clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
  setFormDefaults();
};

// ****************************

Template.postingModal.helpers({
  posting: function(){
    postingData = appVars.newPosting.get();
    if (!postingData) return {};
    output = {
      players: postingData.players + ' player',
      dateTime: prettyDateTime(postingData.dateTime),
      location: prettyLocation(postingData.location),
      gender: postingData.gender ? "Female" : "Male",
      price: postingData.price,
      onlyRingers: postingData.onlyRingers
    };
    if (postingData.players > 1) output.players += 's';
    if ('gameType' in postingData) output.gameType = ['Friendly', 'Competitive'][postingData.gameType];
    if ('teamSize' in postingData) output.teamSize = postingData.teamSize + '-a-side';   
    return output;
  }
});
Template.postingModal.events({
  'click #makePosting': function() {
    Meteor.call('makePosting', appVars.newPosting.get(), {source: 'web'}, function(err, res) {
      if (err) alert("Could not make posting!");
      console.log(err);
      $('#postingModal').modal('hide');
    });
  },
  'click #cancelPosting': function() {
    appVars.newPosting.set(null);
    $('#postingModal').modal('hide');
  }  
});

Template.activityFeed.helpers({
  eventList: function() {
    return Events.find({cancelled: {$exists: false}}, {limit: 10, sort: {createdAt: -1}});
  },
  eventIcon: function() {
    if (this.players === 0) return "darkgreen suprsub";
    else if (this.source === 'web') return "red browser";
    else return "teal twitter";
  },
  teamName: function() {
    var team = Teams.findOne(this.team);
    if (team) return team.name;
    else return 'Unknown Team';
  },
  message: function() {
    if (this.players > 0) return this.sentence;
    var subNum = this.matched ? this.matched.length : 0,
        suprsubNames = _.map(this.matched, function(x) {return Meteor.users.findOne(x) ? Meteor.users.findOne(x).profile.name : "Unknown Player";}),
        nameString = suprsubNames[0];
    if (subNum > 2) for (i = 1, l = subNum - 1; i < l; i++) nameString += ', ' + suprsubNames[i];
    if (subNum > 1) nameString += " and " + suprsubNames[subNum - 1] + " are ";
    else nameString += " is ";
    nameString += "going to be ";
    if (subNum > 1) return nameString + "SuprSubs!";
    else return nameString + "a SuprSub!";
  },
  timeAgo: function() {
    TimeKeeper._dep.depend();
    return moment(this.createdAt).fromNow();
  },
  available: function() {
    return (this.players > 0);
  }
});
Template.activityFeed.events({
  'click .extra.text.available': function(event) {
    var thisEvent = Events.findOne({_id: event.target.id});
    thisEvent.pitch = null;
    UI.insert(UI.renderWithData(Template.signupModalHolder, {postingData: thisEvent}), document.body);
    $('#signupModal').modal('setting', {
      onHidden: function() {
        $('.ui.dimmer.page').remove();
      }
    });
    Meteor.setTimeout(function() {$('#signupModal').modal('show');}, 200);
  }
});
Template.activityFeed.rendered = function() {
/*  var eventDivs = this.findAll('.event'), lastEvent = eventDivs[eventDivs.length - 1];
  if (eventDivs.length) {
    var frag = Template.fadeBox({
      height: lastEvent.offsetHeight,
      width: lastEvent.offsetWidth,
      left: lastEvent.offsetLeft,
      top: lastEvent.offsetTop,
    });
   $('#activityFeed').append(frag);
  }*/
};
Template.activityFeed.created = function() {
  this.rerender = Meteor.setInterval(function() {
    TimeKeeper._dep.changed();
  }, 15000);
};
Template.activityFeed.destroyed = function() {
  Meteor.clearInterval(this.rerender);
};

// *********************************

Template.signupModal.helpers({
  posting: function(){
    var postingData = this.postingData;
    if (!postingData) return {};
    output = {
      players: postingData.players + ' player',
      dateTime: prettyDateTime(postingData.dateTime),
      location: prettyLocation(postingData.location),
      gender: postingData.gender ? "Female" : "Male",
      price: postingData.price,
      onlyRingers: postingData.onlyRingers
    };
    if (postingData.players > 1) output.players += 's';
    if ('gameType' in postingData) output.gameType = ['Friendly', 'Competitive'][postingData.gameType];
    if ('teamSize' in postingData) output.teamSize = postingData.teamSize + '-a-side';   
    return output;
  },
  myPosting: function() {
    return (Meteor.user().profile.team._ids.indexOf(this.postingData.team) > -1);
  }
});

Template.signupModal.events({
  'click #cancelSignup': function() {
    $('#signupModal').modal('hide');
  },
  'click #takePosting': function() {
    self = this;
    $('#signupModal').modal({
      onHidden: function() {
        $('.ui.dimmer.page').remove();
        Meteor.call('signupPlayer', Meteor.user(), self.postingData, function(err, res) {     
          if (err)
            console.log(err);
          else {
            confirmModal({
              message: "<h2>SUCCESS!</h2><p>You've just become a SuprSub!  The team captain's contact details have been sent to you.</p>",
              callback: null,
              noButtons: true
            }, function() { Meteor.setTimeout(function() {$('#generalConfirmModal').modal('show'); }, 250);}
            );
          }
        });
      }
    });
    $('#signupModal').modal('hide');
  },
  'click #removePosting': function() {
    self = this;
    $('#signupModal').modal({
      onHidden: function() {
        Meteor.call('removePosting', self.postingData, function(err, res) {
          if (err)
           console.log(err);
           else {
             confirmModal({
               message: "<h2>SUCCESS!</h2><p>Your posting has been removed.</p>",
               callback: null,
               noButtons: true
             }, function() { Meteor.setTimeout(function() {$('#generalConfirmModal').modal('show'); }, 250);}
            );
          }      
        });
      }
    });
    $('#signupModal').modal('hide');
  }
})

// *********************************

function verifyForm() {
  if (!parseInt($('#numberPlayers').dropdown('get value'), 10))
    return false;
  if (!$('#homeGroundSearch').attr('data-value'))
    return false;
  var dateEntered = picker.getDate(),
      dateNow = (new Date()).getTime();
  dateEntered = dateEntered.setHours($('#timePickerHour').val()) + ($('#timePickerMinute').val() + 30) * 60000;
  if (dateEntered < dateNow || dateEntered > dateNow + 5184000000)
    return false;
  return true;
}

setFormDefaults = function() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var teamList = Meteor.user().profile.team._ids;
  if (!teamList.length)
    return false;
  var teamProfile = Teams.findOne({_id: teamList[0]});
  if (!teamProfile)
    return false;
  if (teamProfile.format)
    $('#gameFormat').dropdown('set selected', teamProfile.format);
  if (teamProfile.homeGround) {
    var homeGround = Pitches.findOne({_id: teamProfile.homeGround});
    if (homeGround) {
      $('#homeGroundSearch').val(prettyLocation(homeGround));
      $('#homeGroundSearch').attr('data-value', homeGround._id);
    }
  }
  if (teamProfile.type)
    $('#friendlyCompetitive').checkbox('enable');
  else
    $('#friendlyCompetitive').checkbox('disable');
  picker.setDate(tomorrow);
  if (teamProfile.regular) {
    var date = nextMatchingWeekDay(teamProfile.day);
    if (date)
      picker.setDate(date);
    if (teamProfile.sameTime) {
      $('#timePickerHour').val(teamProfile.time.getHours());
      $('#timePickerMinute').val(teamProfile.time.getMinutes());
    }
  }
}

nextMatchingWeekDay = function(day) {
  var nowDate = new Date(),
      today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()),
      thisDay = today.getDay();
  if (isNaN(day)) return null;
  today.setDate(today.getDate() + ((7 + day - thisDay) % 7));
  return today;
}