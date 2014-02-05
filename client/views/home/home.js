Template.homePage.helpers({
  filter: function() {
    return Router.routes['home'].postingsChoice.get();
  }
});
Template.homePage.events({
  'click #allFilter': function() {
    Router.routes['home'].postingsChoice.set('');
  },
  'click #userFilter': function() {
    Router.routes['home'].postingsChoice.set(Meteor.userId());
  }
})

Template.postBox.helpers({
  teamRegistered: function() {
    var thisUser = Meteor.user();
    return (thisUser && thisUser.profile && thisUser.profile.team);
  }
});
Template.postBox.events({
  'submit #postingForm, click #postingButton': function() {
    Meteor.call('analysePosting', $('#postingArea').val(), function(err, res) {
      if (err) console.log(err);
      else {
        appVars.newPosting.set(res);
        Meteor.setTimeout(function() {$('.ui.modal').modal('show');}, 200);
      }
    });
  }
});
Template.postBox.rendered = function() {
  var thisUser = Meteor.user();
  if (!(thisUser && thisUser.profile && thisUser.profile.team)) 
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
  });  
};

Template.postingModal.helpers({
  posting: function(){
    postingData = appVars.newPosting.get();
    if (!postingData) return {};
    output = {
      players: postingData.players + ' player',
      dateTime: prettyDateTime(postingData.dateTime),
      location: prettyLocation(postingData.location),
      gender: postingData.gender ? "Female" : "Male"
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
      $('.dimmer').dimmer('hide');
    });
  },
  'click #cancelPosting': function() {
    appVars.newPosting.set(null);
    $('.dimmer').dimmer('hide');
  }  
});

Template.activityFeed.helpers({
  events: function() {
    return Events.find({cancelled: {$exists: false}}, {limit: 10, sort: {createdAt: -1}});
  },
  eventIcon: function() {
    if (this.players === 0) return "darkgreen suprsub";
    else if (this.source === 'web') return "red browser";
    else return "teal twitter";
  },
  teamName: function() {
    var user = Meteor.users.findOne({_id: this.userId});
    if (user && user.profile && user.profile.team) return user.profile.team.name;
    else return 'Unknown Team';
  },
  message: function() {
    if (this.players > 0) return this.sentence;
    var subNum = this.matched.length,
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
  }
});
Template.activityFeed.rendered = function() {
  var eventDivs = this.findAll('.event'), lastEvent = eventDivs[eventDivs.length - 1];
  if (eventDivs.length) {
    var frag = Template.fadeBox({
      height: lastEvent.offsetHeight,
      width: lastEvent.offsetWidth,
      left: lastEvent.offsetLeft,
      top: lastEvent.offsetTop,
    });
//    $('#activityFeed').append(frag);
  }
};
Template.activityFeed.created = function() {
  this.rerender = Meteor.setInterval(function() {
    TimeKeeper._dep.changed();
  }, 15000);
};
Template.activityFeed.destroyed = function() {
  Meteor.clearInterval(this.rerender);
};