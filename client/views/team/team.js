Template.teamSettings.events({
  'keyup input, click div': function() {
    var homeGroundId = $('#homeGround>input').attr('id'),
        teamName = $('#teamName').val(),
        node = document.querySelector('#cancelOrSave');
    if (!(homeGroundId && teamName)) Spark.getDataContext(node).disableSave.set(true);
    else Spark.getDataContext(node).disableSave.set(false);
  }
})

Template.pitchMapSmall.created = function() {
  window.circleSize = null;
  window.venues = null;
  var intv = setInterval(function(){
    var $el = $("#pitchMap");
    if ( $el.length > 0 ) {
      clearInterval(intv);
      clientFunctions.loadGoogleMaps(false);
    }
  }, 200);
  setTimeout(function(){
    clearInterval(intv);
  }, 5000);
};

Template.otherInfo.events({
  'keyup #homeGroundSearch': function(event, template) {
    if ((!template.lastUpdate || (new Date().getTime() - template.lastUpdate > 1000)) && event.target.value.length > 2) {
      template.lastUpdate = new Date().getTime();
      if (Pitches.findOne({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"})) {
        var pitchCursor = Pitches.find({$where: "this.name.toLowerCase().indexOf(event.target.value.toLowerCase()) > -1"});
        var pitchElement = '<div class="ui segment content"><div class="field"><div class="ui link list">';
        pitchCursor.forEach(function(pitch) {pitchElement += '<a class="pitchEntry item" id="' + pitch._id + '">' + pitch.owner + ' - ' + pitch.name + '</a>';});
        $('#matches').html(pitchElement + '</div></div></div>');
      }
   }
  },
  'click #teamSearchButton, submit form': function(event, template) {
    appVars.gc.geocode({
      address: $('#homeGroundSearch').val(),
      region: 'uk'
      },
      function(res) {
        if (res.length) pitchMap.panTo(res[0].geometry.location);
      }
    );
    return false;
  },
  'click .pitchEntry': function(event) {
    var pitch = Pitches.findOne({'_id': event.target.id});
    if (pitch) {
      pitchMap.panTo(new google.maps.LatLng(pitch.location.lat, pitch.location.lng));
      $('#homeGround input').val(pitch.owner + ' - ' + pitch.name);
      $('#homeGround input').attr('id', pitch._id);
      location.href = "#homeGround";
      window.scrollTo(window.scrollX, Math.max(window.scrollY - 100, 0));
    }
  }
});
Template.otherInfo.rendered = function() {
  if (window.innerWidth > 640) $('#otherInfo').hide();
};

Template.teamDetails.helpers({
  days: function() {
    return appVars.days;
  },
  disableSave: function() {
    if ('disableSave' in this) return this.disableSave.get();
    return true;
  }
});
Template.teamDetails.events({
  'click #homeGround': function() {
    location.href = "#otherInfo";
    $('#otherInfo').show({duration: 500});
    google.maps.event.trigger(pitchMap, 'resize');
  },
  'click #weeklyCheckBox .checkbox': function(event) {
    if ($('#timeSection').is(":visible")) {
      $('#timeCheckBox .checkbox').click();
    }
    $('#dayChoiceSection').toggle();
    $('#timeCheckBox').slideToggle();
  },
  'click #timeCheckBox .checkbox': function(event) {
    $('#timeSection').toggle({easing: 'swing', direction: 'right', duration: 500});
  },
  'keydown #timeSection input[type="number"]': function(event) {
    if (event.keyCode > 57) return false;
  },
  'click #saveButton': function(event) {
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
    },
      function(err) {
        if (!err) {
          console.log("glow");
          var icon = $(event.target);
          if (icon.prop("tagName") != "I") icon = icon.children('i');
          icon.removeClass("save").addClass("checkmark fontGlow");
          icon.parents('#saveButton').addClass('boxGlow');
          Meteor.setTimeout(function() {
            icon.addClass("save").removeClass("checkmark fontGlow")
            icon.parents('#saveButton').removeClass('boxGlow');
          }, 1000);
        }
        else console.log(err);
      });
  },
  'click #resetButton': function() {
    setTeamData();
  }
});
Template.teamDetails.rendered = function() {
  $(this.findAll('.ui.checkbox')).checkbox({verbose: true, debug: false, performance: false});
  $(this.findAll('.ui.dropdown')).dropdown({verbose: true, debug: false, performance: false});
  clientFunctions.suprsubPlugins('checkboxLabel', '.checkboxLabel');
  setTeamData();
};
Template.teamDetails.created = function() {
  this.data.disableSave = new suprsubDep(true);
}