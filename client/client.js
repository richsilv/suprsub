Pitches = new Meteor.Collection("pitches");
Events = new Meteor.Collection("events");

pitchMap = window.pitchMap;
gc = null;
var myLocation, liveCircle, defaultLocation;

App = {subs: null};

myDep = function(initial) {
  this.value = initial;
  this.count = 0;
};

myDep.prototype = {
  dep: new Deps.Dependency(),
  get: function () {
    this.dep.depend();
    return this.value;
  },
  set: function (newValue){
    if (this.value !== newValue) {
      this.value = newValue;
      this.dep.changed();
      this.count++;
    }
    return this.value;
  },
  getKey: function(key) {
    this.dep.depend();
    if (key in this.value) return this.value[key];
    else return undefined;
  },
  setKey: function(key, newValue) {
    if (key in this.value && this.value[key] !== newValue) {
      this.value[key] = newValue;
      this.dep.changed();
      this.count++;
    }
    return this.value[key];
  }
};

function logTemplateEvents() {
  _.each(Template, function(template, name) {
    var oldCreated = template.created,
        oldDestroyed = template.destroyed;
        oldRendered = template.rendered,
        template.renders = 0;
    template.created = function() {
      console.log("Created: ", this); //_.filter(_.map(this.firstNode, function(a, b) { return b; }), function(a) { return typeof a === 'string' && a.slice(0, 7) === '_spark_'; }));
      oldCreated && oldCreated.apply(this, arguments);
    };
    template.rendered = function() {
      console.log("Rendering ", name, template.renders++);
      oldRendered && oldRendered.apply(this, arguments);
    };
    template.destroyed = function() {
      console.log("Destroyed: ", this);
      oldDestroyed && oldDestroyed.apply(this, arguments);
    };    
  });
}


venues = new myDep([]);
mapCenter = new myDep([51.5080391, -0.12806929999999284]);
tabChoices = new myDep({playerTab: 'pitchData'});
circleChanged = new myDep(false);
newPosting = new myDep(null);
mainOption = '/';
var contactNames = ['Twitter', 'Facebook', 'Email'],
    days = [{name: "Sunday", dayCode: 0}, {name: "Monday", dayCode: 1}, {name: "Tuesday", dayCode: 2}, {name: "Wednesday", dayCode: 3}, {name: "Thursday", dayCode: 4}, {name: "Friday", dayCode: 5}, {name: "Saturday", dayCode: 6}];
    periods = [{name: "Morning", periodCode: 0}, {name: "Afternoon", periodCode: 1}, {name: "Evening", periodCode: 2}];
    

App.subs = {pitches: Meteor.subscribe('allpitches', {onReady: function() {}})};

initializeCircle = function() {
  initialize(true);
}

initialize = function(circle) {
  defaultLocation = new google.maps.LatLng(51, 0);
  var mapOptions = {
    zoom: 11,
    center: defaultLocation
  };
  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
      mapOptions);
  circleChanged.set(false);
  if (!gc) gc = new google.maps.Geocoder();
  if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.player && Meteor.user().profile.player.center) {
    defaultLocation = new google.maps.LatLng(Meteor.user().profile.player.center.nb, Meteor.user().profile.player.center.ob);
    mapCenter.set(defaultLocation);
    if (circle) {
      circleSize.set(Meteor.user().profile.player.size);
      $('#distanceWrite').val(circleSize.get()/100);
      $('#distanceRead').html(circleSize.get()/1000+'km');
      updateCircle();
    }
  }
  else {
    navigator.geolocation.getCurrentPosition(function(res) {
      var defaultLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
      if (circle) {
        mapCenter.set(defaultLocation);
        pitchMap.setCenter(defaultLocation);
        updateCircle();
        Meteor.call('pitchesWithin', {"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
          if (err || !venues) console.log(err);
          else venues.set(res);
        });
      }
    }, function() {
      window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.")
    });
    circleChanged.set(true);
  }
  var pitches = Pitches.find().fetch();
  for (var i=0; i < pitches.length; i++) {
    var marker = new google.maps.Marker({
      position: pitches[i].location,
      map: pitchMap,
      title:pitches[i].owner + " " + pitches[i].name,
      icon: 'images/soccerv2.png',
      pitch_ID: pitches[i]._id
    });
    if (!circle) {
      attachMarkerEvent(marker, function(m) {
        $('#homeGround input').val(m.title);
        $('#homeGround input').attr('id', m.pitch_ID);
      });
    }
  }
  document.getElementById("pitchMap").style.display = "block";
  google.maps.event.trigger(pitchMap, 'resize');
  pitchMap.setCenter(defaultLocation);
  if (circleSize) Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else if (venues) {
        venues.set(res);
      }
  });
}

function attachMarkerEvent(marker, callback) {
  var simpleCallBack = function() {callback(marker);};
  google.maps.event.addListener(marker, 'click', simpleCallBack);
}

function loadScript(circle) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
      'callback=initialize';
  if (circle) script.src += 'Circle'
  if (window.google && window.google.maps) {
    initialize(circle);
  }
  else document.body.appendChild(script);
}

Handlebars.registerHelper("option", function(option) {
  if (mainOption) return Router.current(true).path === option;
  else return false;
});

Handlebars.registerHelper("tabChoice", function(key, value) {
  if (tabChoices) return tabChoices.get()[key] === value;
  else return false;  
});

Handlebars.registerHelper("service", function(network) {
  return Meteor.user() && 'services' in Meteor.user() ? network in Meteor.user().services : false;
});

Handlebars.registerHelper("email", function(level) {
  switch (level) {
    case 'verified':
      return Meteor.user().emails ? Meteor.user().emails[0].verified : false;
      break;
    case 'unverified':
      return Meteor.user().emails ? !Meteor.user().emails[0].verified : false;
      break;
    default:
      return Meteor.user().emails ? Meteor.user().emails[0].address : false;
  }
});

Template.postBox.helpers({
  teamRegistered: function() {
    var thisUser = Meteor.user();
    return (thisUser && thisUser.profile && thisUser.profile.team);
  }
})
Template.postBox.events({
  'submit #postingForm, click #postingButton': function() {
    Meteor.call('analysePosting', $('#postingArea').val(), function(err, res) {
      if (err) console.log(err);
      else {
        newPosting.set(res);
        Meteor.setTimeout(function() {$('.ui.modal').modal('show');}, 200);
      }
    })
  }
});
Template.postBox.rendered = function() {
}

Template.postingModal.helpers({
  posting: function(){
    postingData = newPosting.get();
    if (!postingData) return {};
    output = {
      players: postingData.players + ' player',
      dateTime: prettyDateTime(postingData.dateTime),
      location: prettyLocation(postingData.location)
    };
    if (postingData.players > 1) output.players += 's';
    return output;
  }
});
Template.postingModal.events({
  'click #makePosting': function() {
    Meteor.call('makePosting', newPosting.get(), {source: 'web'}, function(err, res) {
      if (err) alert("Could not make posting!");
      $('.dimmer').dimmer('hide');
    });
  },
  'click #cancelPosting': function() {
    newPosting.set(null);
    $('.dimmer').dimmer('hide');
  }  
})

Template.activityFeed.helpers({
  events: function() {
    return Events.find({}, {limit: 10, sort: {createdAt: -1}});
  },
  eventIcon: function() {
    if (this.source === 'web') return "red browser";
    else return "question";
  },
  teamName: function() {
    var user = Meteor.users.findOne({_id: this.userId});
    if (user && user.profile && user.profile.team) return user.profile.team.name;
    else return 'Unknown Team';
  },
  message: function() {
    var mess = "Looking for " + this.players + " player";
    if (this.players > 1) mess += "s";
    mess += ", " + colloquialDateTime(this.dateTime) + " at " + prettyLocation(this.location) + ".";
    return mess;
  },
  timeAgo: function() {
    return moment(this.createdAt).fromNow();
  }
})

Template.pitchData.helpers({
  getVenues: function() {
    if (venues && venues.get()) return venues.get();
    else return []; 
  }
});

Template.playerDetails.events({
  'click #tabSpace div a': function(event, target) {
    tabChoices.setKey('playerTab', event.target.name);
  }
});

Template.pitchMapLarge.created = function() {
  window.venues = new myDep([]);
  window.circleSize = new myDep(8000);
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      loadScript(true);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

Template.pitchMapSmall.created = function() {
  window.circleSize = null;
  window.venues = null;
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      loadScript(false);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

Template.defineBounds.helpers({
  unmoved: function() {
    return !circleChanged.get();
  }
});
Template.defineBounds.events({
  'change #distanceWrite': function(event) {
    circleChanged.set(true);
    $('#distanceRead').html(parseInt(event.target.value, 10) / 10 + 'km');
    circleSize.set(parseInt($('#distanceWrite').val(), 10) * 100);
    updateCircle();
  },
  'click #saveBoundsButton': function() {
    circleChanged.set(false);
    Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.player': {center: mapCenter.get(), size: circleSize.get(), venues: venues.get().map(function(v) {return v._id;})}}});
    liveCircle.setOptions({ strokeColor: '#78db1c', fillColor: '#78db1c' });
  },
  'click #revertBoundsButton': function() {
    circleChanged.set(false);
    var thisUser = Meteor.user();
    if (thisUser && thisUser.profile && thisUser.profile.player) {
      circleSize.set(thisUser.profile.player.size);
      mapCenter.set(new google.maps.LatLng(Meteor.user().profile.player.center.nb, Meteor.user().profile.player.center.ob));
    }
    else {
      circleSize.set(8000);
      mapCenter.set(defaultLocation);            
    }
    updateCircle();
  }
});
Template.defineBounds.rendered = function() {
  $('#distanceWrite').val(circleSize.get()/100);
  $('#distanceRead').html(parseInt($('#distanceWrite').val(), 10)/10 + 'km');
  var newWidth = parseInt($('#areaDetails').css('width'), 10) * 0.7;
  $('#pitchMap').css('width', newWidth);
  $('#pitchMap').css('margin-left', -newWidth/2);
};

Template.otherInfo.events({
  'keyup #homeGroundSearch': function(event, template) {
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      if (Pitches.findOne({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"})) {
        var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
        var pitchElement = '<div class="ui segment content"><div class="field"><div class="ui link list">';
        pitchCursor.forEach(function(pitch) {pitchElement += '<a class="pitchEntry item" id="' + pitch._id + '">' + pitch.owner + ' - ' + pitch.name + '</a>'});
        $('#matches').html(pitchElement + '</div></div></div>');
      }
   }
  },
  'click #teamSearchButton, submit form': function(event, template) {
    gc.geocode({
      address: $('#homeGroundSearch').val(),
      region: 'uk'
      },
      function(res) {
        if (res.length) pitchMap.panTo(res[0].geometry.location);
      }
    )
    return false;
  },
  'click .pitchEntry': function(event) {
    var pitch = Pitches.findOne({'_id': event.target.id});
    if (pitch) {
      pitchMap.panTo(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
      $('#homeGround input').val(pitch.owner + ' - ' + pitch.name);
      $('#homeGround input').attr('id', pitch._id);      
    }
  }
});

Template.teamDetails.helpers({
  days: function() {
    return days;
  }
});
Template.teamDetails.events({
  'click #homeGround': function() {
    location.href = "#";
    location.href = "#otherInfo";
  },
  'click #weeklyCheckBox .checkbox': function(event) {
    if ($('#timeSection').is(":visible")) {
      $('#timeCheckBox .checkbox').click();
    }
    $('#daySection, #timeCheckBox').toggle({easing: 'swing', direction: 'right', duration: 500});
  },
  'click #timeCheckBox .checkbox': function(event) {
    $('#timeSection').toggle({easing: 'swing', direction: 'right', duration: 500});
  },
  'keydown #timeSection input[type="number"]': function(event) {
    if (event.keyCode > 57) return false;
  },
  'click #saveButton': function() {
    var homeGroundId = $('#homeGround>input').attr('id'), teamProfile;
    if (!homeGroundId) return false;
    teamProfile = {
        name: $('#teamName').val(),
        homeGround: homeGroundId,
        regular: document.getElementById('weekly').checked
    };
    if (teamProfile.regular) {
      teamProfile.day = parseInt(document.getElementById('day').value, 10);
      teamProfile.sameTime = document.getElementById('sameTime').checked;
      if (teamProfile.sameTime) teamProfile.time = new Date(0, 0, 0, parseInt(document.getElementById('timePickerHour').value, 10), parseInt(document.getElementById('timePickerMinute').value, 10));
    }
    Meteor.users.update(Meteor.userId(), {$set: 
      {'profile.team': teamProfile}
    })
  },
  'click #resetButton': function() {
    setTeamData();
  }
});
Template.teamDetails.rendered = function() {
  $(this.findAll('.ui.checkbox')).checkbox({verbose: true, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: true, debug: false, performance: false});
  setTeamData();
};

Template.playerForm.helpers({
  first_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.first_name : null;
  },
  last_name: function() {
    return (Meteor.user() && Meteor.user().profile) ? Meteor.user().profile.last_name : null;
  },
  contactString: function() {
    var cString = '', contactArray = Meteor.user().profile.contact;
    if (!contactArray.length) return "None";
    else {
      for (var i = 0; i < contactArray.length; i++) cString += contactNames[contactArray[i]] + ", ";
    }
  return cString.substr(0, cString.length - 2);
  },
  contactActive: function(num) {
    return (Meteor.user().profile.contact.indexOf(num) > -1);
  }
})
Template.playerForm.events({
  'click #saveButton': function() {
    var availability = {},
        tableElements = $('#availabilityTable input');
    for (var i = 0, l = tableElements.length; i < l; i++) {
      if (tableElements[i].checked) availability[tableElements[i].id] = true;
    }
    Meteor.users.update(Meteor.userId(), {$set: {'profile.first_name': $('#firstname input').val(), 
                                                 'profile.last_name': $('#surname input').val(),
                                                 'profile.player.availability': availability
    }});
  },
  'click #emailButton': function() {
    var frag = Meteor.render(function() {
      return Template.linkModal();
    });
    document.getElementById('linkModalHolder').appendChild(frag);
    $('#linkModal').modal('show');
  },
  'click #facebookButton': function() {
    if (!('facebook' in Meteor.user().services)) {
      Meteor.loginWithFacebook({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
      });
    }
  },
  'click #twitterButton': function() {
    if (!('twitter' in Meteor.user().services)) {
      Meteor.loginWithTwitter({}, function (err) {
        if (err)
          Session.set('errorMessage', err.reason || 'Unknown error');
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
    $('.dropdown').dropdown('set text', contactString()).dropdown('hide');
  }
});
Template.playerForm.rendered = function() {
  var thisUser = Meteor.user();
  $(this.findAll('.ui.checkbox')).checkbox({verbose: true, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: true, debug: false, performance: false, action: 'nothing'});
  $(this.findAll('.ui.dropdown')).dropdown('set text', contactString());
  $(this.findAll('.ui.dropdown')).find('.item').each(function(i, elem) {
    if (thisUser.profile.contact.indexOf(parseInt(elem.attributes['data-value'].nodeValue, 10)) > -1)
      $(elem).addClass('active');
    else
      $(elem).removeClass('active');
  });
};

Template.availability.helpers({
  days: function() {
    return days;
  },
  periods: function() {
    return periods;
  },
  extendedData: function() {
    return {periodCode: this.periodCode, days: days};
  }
});
Template.availability.rendered = function() {
  var thisUser = Meteor.user();
  if (thisUser && thisUser.profile && thisUser.profile.player && thisUser.profile.player.availability) {
    for (var i in thisUser.profile.player.availability) {
      if (thisUser.profile.player.availability[i]) document.getElementById(i).checked = true;
    }
  }
};

Template.linkModal.events({
  'click #emailCancel': function() {
    $('.modal').filter(':visible').modal('hide');
/*    var linkModal = $('#linkModal')[0]
    Spark.finalize(linkModal);
    $(linkModal).empty();
    Deps.flush();
    venues.dep.changed();*/
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
          var linkModal = $('#linkModal')[0]
          Spark.finalize(linkModal);
          $(linkModal).empty();
          Deps.flush();
          venues.dep.changed();
        }
      });
    },
    onHide: function() {
      var linkModal = $('#linkModal')[0] 
      Spark.finalize(linkModal);
      $(linkModal).empty();
      Deps.flush();
      venues.dep.changed();
    },
    debug: false,
    performance: false,
    verbose: false
  });
};

//logTemplateEvents();

Deps.autorun(function(c) {
  if (mainOption === '/player') {
    if (liveCircle) {
      mapCenter.set(liveCircle.getCenter());
    }
    else {
      var populationOptions = {
        strokeColor: '#78db1c',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#78db1c',
        fillOpacity: 0.35,
        map: pitchMap,
        draggable: true,
        center: mapCenter.get(),
        radius: circleSize.get()
      };
      if (window.google) {
        liveCircle = new google.maps.Circle(populationOptions);
        google.maps.event.addListener(liveCircle, 'center_changed', function() {
          mapCenter.set(liveCircle.getCenter());
          liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
          circleChanged.set(true);
        });
      }
    }
  }
});
Deps.autorun(function() {
  if (mapCenter.get().nb && mapCenter.get().ob && circleSize && circleSize.get() && App.subs.pitches.ready()) {
    if (!this.count) this.count = 1;
    else this.count++;
    Meteor.call('pitchesWithin', {"lat": parseFloat(mapCenter.get().nb, 10), "lng": parseFloat(mapCenter.get().ob, 10)}, circleSize.get(), function(err, res) {
      if (err) console.log(err);
      else if (venues) {
        venues.value = res;
      }
    });
  }
});
Deps.autorun(function() {
  if (Router && Router.current(true)) mainOption = Router.current(true).path;
})

function updateCircle() {
  if (liveCircle) liveCircle.setMap(null);
  liveCircle = null;
  var populationOptions = {
    strokeColor: '#78db1c',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#78db1c',
    fillOpacity: 0.35,
    map: pitchMap,
    draggable: true,
    center: mapCenter.get(),
    radius: circleSize.get()
  };
  if (circleChanged.get()) {
    populationOptions.strokeColor = '#db781c';
    populationOptions.fillColor = '#db781c';
  }
  if (window.google) {
    liveCircle = new google.maps.Circle(populationOptions);
    google.maps.event.addListener(liveCircle, 'center_changed', function() {
      mapCenter.set(liveCircle.getCenter());
      liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
      circleChanged.set(true);
    });
  }
}

function contactString() {
    var cString = '', contactArray = Meteor.user().profile.contact;
    if (!contactArray.length) return "None";
    else {
      for (var i = 0; i < contactArray.length; i++) cString += contactNames[contactArray[i]] + ", ";
    }
  return cString.substr(0, cString.length - 2);
}

function setTeamData() {
  thisUser = Meteor.user();
  if (!thisUser) return false;
  if (thisUser.profile && thisUser.profile.team) {
    var teamData = thisUser.profile.team;
    $('#teamName').val(teamData.name);
    $('#homeGround>input').attr('id', teamData.homeGround);
    var ground = Pitches.findOne({'_id': teamData.homeGround});
    if (ground) {
      $('#homeGround>input').val(ground.owner + ' ' + ground.name);
      var googleCallback = Meteor.setInterval(function() {
        if (google) {
          pitchMap.panTo(new google.maps.LatLng(ground.location.lat, ground.location.lng));
          Meteor.clearInterval(googleCallback);
        }
      }, 200);
      Meteor.setTimeout(function(){
        Meteor.clearInterval(googleCallback);
      }, 5000);
    }
    document.getElementById('weekly').checked = teamData.regular ? true : false;
    if (teamData.regular) {
      document.getElementById('day').nextElementSibling.textContent = days[teamData.day].name;
      $('#daySection .item').each(function(ind, item) {
        if (parseInt(item.attributes['data-value'].value, 10) === teamData.day) $(item).addClass("active");
        else $(item).removeClass("active");
      });
      document.getElementById('sameTime').checked = teamData.sameTime ? true : false;
      $('#daySection, #timeCheckBox').show({easing: 'swing', direction: 'right', duration: 500});
      if (teamData.sameTime) {
        document.getElementById('timePickerHour').value = teamData.time.getHours();
        document.getElementById('timePickerMinute').value = teamData.time.getMinutes();
        $('#timeSection').show({easing: 'swing', direction: 'right', duration: 500});
      }
      else $('#timeSection').hide({easing: 'swing', direction: 'right', duration: 500});
    }
    else $('#daySection, #timeCheckBox').hide({easing: 'swing', direction: 'right', duration: 500});
    return true;
  }
  return false
}

reIndexDatabase = function(collection) {
  oldIndexes = collection.find({}, {fields: {_id: true}}).fetch();
  for (var i = 0, l = oldIndexes.length; i < l; i++) {
    var thisItem = collection.findOne({_id: oldIndexes[i]._id});
    delete thisItem._id;
    delete thisItem.__v;
    collection.insert(thisItem);
    collection.remove({_id: oldIndexes[i]._id});
  }
}
