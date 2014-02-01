clientFunctions = (function() {

	var contactString = function() {
	    var cString = '', contactArray = Meteor.user().profile.contact;
	    if (!contactArray || !contactArray.length) return "None";
	    else {
	      for (var i = 0; i < contactArray.length; i++) cString += appVars.contactNames[contactArray[i]] + ", ";
	    }
	  return cString.substr(0, cString.length - 2);
	}

	var reIndexDatabase = function(collection) {
	  oldIndexes = collection.find({}, {fields: {_id: true}}).fetch();
	  for (var i = 0, l = oldIndexes.length; i < l; i++) {
	    var thisItem = collection.findOne({_id: oldIndexes[i]._id});
	    delete thisItem._id;
	    delete thisItem.__v;
	    collection.insert(thisItem);
	    collection.remove({_id: oldIndexes[i]._id});
	  }
	};

	var attachMarkerEvent = function(marker, callback) {
	  var simpleCallBack = function() {callback(marker);};
	  google.maps.event.addListener(marker, 'click', simpleCallBack);
	}

	var loadGoogleMaps = function(circle) {
	  var script = document.createElement('script');
	  script.type = 'text/javascript';
	  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&' +
	      'callback=clientFunctions.initialize';
	  if (circle) script.src += 'Circle';
	  if (window.google && window.google.maps) {
	    initialize(circle);
	  }
	  else document.body.appendChild(script);
	}

	var initialize = function(circle) {
	  defaultLocation = new google.maps.LatLng(51, 0);
	  var mapOptions = {
	    zoom: 11,
	    center: defaultLocation
	  };
	  pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
	     mapOptions);
	  appVars.circleChanged.set(false);
	  if (!appVars.gc) appVars.gc = new google.maps.Geocoder();
	  if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.player && Meteor.user().profile.player.center) {
	    defaultLocation = new google.maps.LatLng(Meteor.user().profile.player.center.lat, Meteor.user().profile.player.center.lng);
	    appVars.mapCenter.set(defaultLocation);
	    if (circle) {
	      appVars.circleSize.set(Meteor.user().profile.player.size);
	      $('#distanceWrite').val(appVars.circleSize.get()/100);
	      $('#distanceRead').html(appVars.circleSize.get()/1000+'km');
	      updateCircle();
	    }
	  }
	  else {
	    navigator.geolocation.getCurrentPosition(function(res) {
	      var defaultLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
	      if (circle) {
	        appVars.mapCenter.set(defaultLocation);
	        pitchMap.setCenter(defaultLocation);
	        updateCircle();
	        Meteor.call('pitchesWithin', {"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
	          if (err || !appVars.venues) console.log(err);
	          else appVars.venues.set(res);
	        });
	      }
	    }, function() {
	      window.alert("Your browser does not support geolocation, so you'll have to use the address bar to find your location.");
	    });
	    appVars.circleChanged.set(true);
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
	        location.href = "#homeGround";
	        window.scrollTo(window.scrollX, Math.max(window.scrollY - 100, 0));
	      });
	    }
	  }
	  document.getElementById("pitchMap").style.display = "block";
	  google.maps.event.trigger(pitchMap, 'resize');
	  pitchMap.setCenter(defaultLocation);
	  if (appVars.circleSize) Meteor.call('pitchesWithin', {"lat": parseFloat(appVars.mapCenter.get().lat(), 10), "lng": parseFloat(appVars.mapCenter.get().lng(), 10)}, appVars.circleSize.get(), function(err, res) {
	      if (err) console.log(err);
	      else if (appVars.venues) {
	        appVars.venues.set(res);
	      }
	  });
	};

	updateCircle = function() {
	  if (appVars.liveCircle) appVars.liveCircle.setMap(null);
	  appVars.liveCircle = null;
	  var populationOptions = {
	    strokeColor: '#78db1c',
	    strokeOpacity: 0.8,
	    strokeWeight: 2,
	    fillColor: '#78db1c',
	    fillOpacity: 0.35,
	    map: pitchMap,
	    draggable: true,
	    center: appVars.mapCenter.get(),
	    radius: appVars.circleSize.get()
	  };
	  if (appVars.circleChanged.get()) {
	    populationOptions.strokeColor = '#db781c';
	    populationOptions.fillColor = '#db781c';
	  }
	  if (window.google) {
	    appVars.liveCircle = new google.maps.Circle(populationOptions);
	    google.maps.event.addListener(appVars.liveCircle, 'center_changed', function() {
	      var self = this;
	      if (!this.circleTimeout) {
	      	this.circleTimeout = Meteor.setTimeout(function() {
      	      appVars.circleChanged.set(true);
		      appVars.mapCenter.dep.changed();
		      appVars.venues.dep.changed();	
		      Meteor.clearTimeout(self.circleTimeout);
		      self.circleTimeout = null;
	      	}, 500);
	      }
	      appVars.mapCenter.value = appVars.liveCircle.getCenter();
	      appVars.liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
	    });
	  }
	}

	var logTemplateEvents = function() {
	  _.each(Template, function(template, name) {
	    var oldCreated = template.created,
	        oldDestroyed = template.destroyed;
	        oldRendered = template.rendered;
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

	var initializeCircle = function() {
	  initialize(true);
	};

	var suprsubPlugins = function(plugin, element) {
		var thisElem = $(element);
		function addToggle(target, toggle) {
			return function() {$(target).checkbox(toggle);};
		}
		switch (plugin) {
			case 'checkboxLabel':
				thisElem.each(function(ind, elem) {
					var listener = function() {return false};
					if ($(elem.nextElementSibling).hasClass("checkbox"))
						listener = addToggle(elem.nextElementSibling, 'disable');
					else if ($(elem.previousElementSibling).hasClass("checkbox"))
						listener = addToggle(elem.previousElementSibling, 'enable');					
					elem.addEventListener('click', listener);
				});
				console.log('checkboxLabel initialised');
				break;
			default:
		}
	}

	return {
		contactString: contactString,
		reIndexDatabase: reIndexDatabase,
		attachMarkerEvent: attachMarkerEvent,
		loadGoogleMaps: loadGoogleMaps,
		initialize: initialize,
		initializeCircle: initializeCircle,
		updateCircle: updateCircle,
		logTemplateEvents: logTemplateEvents,
		suprsubPlugins: suprsubPlugins
	}

})();