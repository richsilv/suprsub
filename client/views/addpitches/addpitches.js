successSet = new suprsubDep([]),
    failureSet = new suprsubDep([]),
    waitingFlag = new suprsubDep(false);

Template.successFailurePITCHES.helpers({
  success: function() {
    var x = successSet.get();
    return successSet.get();
  },
  failure: function() {
    return failureSet.get();
  }
})

Template.pitchesTemplate.rendered = function ( ) { 
  
  var dropElem = $('#fileDrop');

  if (dropElem.length && !dropElem[0].dropzone)
    $('#fileDrop').dropzone({
      success: function(file, res) {
        if (res && res.success) {
          var added = [];
          failureSet.set(res.failure);
          waitingFlag.set(false);
          res.success.forEach(function(pitch) {
            var thisPitch = Pitches.findOne(pitch);
            if (!thisPitch) {
              Pitches.insert(pitch, function(err) {
                if (!err) {
                  added.push(pitch);
                  successSet.set(added);
                }
              });
            }
          });
        }
      },
      processing: function(file) {
        waitingFlag.set(true);
      },
      url: Meteor.absoluteUrl('uploadPitches', {replaceLocalhost: false})
    });

};

Template.waitingPITCHES.helpers({
  waiting: function() {
    return waitingFlag.get();
  }
});
