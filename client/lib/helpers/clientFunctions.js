clientFunctions = (function() {

	var _libs = {},
		joinTeamDep,
		markersArray = [],
		venueDelay = screen.width > 600 ? 500 : 1000;

	var contactString = function() {
		var cString = '', contactArray = Meteor.user().profile.contact;
		if (!contactArray || !contactArray.length) return "None";
		else {
			for (var i = 0; i < contactArray.length; i++) cString += appVars.contactNames[contactArray[i]] + ", ";
		}
		return cString.substr(0, cString.length - 2);
	};

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
	};

	var markerClickEvent = function(m) {
		$('#homeGround input').val(m.title);
		$('#homeGround input').attr('id', m.pitch_ID);
		appVars.saveCalc.changed();
		appVars.showErrors.dep.changed();
		google.maps.event.trigger(pitchMap, 'bounds_changed');
		// window.scrollTo(window.scrollX, 0);
	};

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
	};

	var loadGMaps = function() {
		var handle, self = this;
		clientFunctions.gMapsCallback = function() {
			var lib = appVars._libs.googleMaps;
			lib.ready = true;
			return lib.readyDep.changed();			
		};
		if (!appVars._libs.googleMaps) {
			appVars._libs.googleMaps = {
				ready: false,
				readyDep: new Deps.Dependency()
			};
			$.getScript('https://maps.googleapis.com/maps/api/js?v=3&key=AIzaSyDmSBUaNyV0mQrcJj87Ga1OwzhxdxVrHjI&sensor=false&callback=clientFunctions.gMapsCallback', function( data, textStatus, jqxhr ) {
				if (jqxhr.status === 200) console.log( "Google Maps Initialised." );
				else console.log( "Google Maps load error." )
			});
		}
		handle = {
			ready: function() {
				var lib = appVars._libs.googleMaps;
				lib.readyDep.depend();
				return lib.ready;
			}
		};
		return handle;
	};

	var pitchesAvailable = function() {
		var handle = {
			ready: function() {
				return (Pitches.find().count() > 1000);
			}
		}
		return handle;
	}

	var initialize = function(circle) {
		appVars.defaultLocation = new google.maps.LatLng(51, 0);
		var mapOptions = {
				zoom: 11,
				center: appVars.defaultLocation,
				disableDoubleClickZoom: true
			},
			thisTeam = Teams.findOne(Router.current().route.currentTeamId);
		pitchMap = new google.maps.Map(document.getElementById('pitchMap'),
			mapOptions);
		appVars.circleChanged.set(false);
		if (!appVars.gc) appVars.gc = new google.maps.Geocoder();
		if (Router.current().route.name === "teamDetails") {
			if (thisTeam && thisTeam.homeGround) {
				var thisPitch = Pitches.findOne(thisTeam.homeGround);
				appVars.defaultLocation = new google.maps.LatLng(thisPitch.location.lat, thisPitch.location.lng);
				appVars.mapCenter.set(appVars.defaultLocation);
				pitchMap.setCenter(appVars.defaultLocation);
			}
			else {
				navigator.geolocation.getCurrentPosition(function(res) {
					appVars.defaultLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
					appVars.mapCenter.set(appVars.defaultLocation);
					pitchMap.setCenter(appVars.defaultLocation);
				}, function() {
					window.alert("Your browser does not support geolocation, so you'll have to use the address box to find your location.");	
					appVars.mapCenter.set(appVars.defaultLocation);
					pitchMap.setCenter(appVars.defaultLocation);
					});
			}
		}
		else if (Router.current().route.name === "playerDetails") {
			if (Meteor.user() && Meteor.user().profile && Meteor.user().profile.player && Meteor.user().profile.player.center) {
				appVars.defaultLocation = new google.maps.LatLng(Meteor.user().profile.player.center.lat, Meteor.user().profile.player.center.lng);
				appVars.mapCenter.set(appVars.defaultLocation);
				appVars.circleSize.set(Meteor.user().profile.player.size);
				$('#distanceWrite').val(appVars.circleSize.get()/100);
				$('#distanceRead').html(appVars.circleSize.get()/1000+'km');
				updateCircle();
				if (appVars.circleSize.get() > 10000) pitchMap.setZoom(10);
				if (appVars.circleSize.get() > 20000) pitchMap.setZoom(9);
			}
			else {
				navigator.geolocation.getCurrentPosition(function(res) {
					appVars.defaultLocation = new google.maps.LatLng(res.coords.latitude, res.coords.longitude);
					appVars.mapCenter.set(appVars.defaultLocation);
					pitchMap.setCenter(appVars.defaultLocation);
					updateCircle();
					clientFunctions.pitchesWithin({"lat": res.coords.latitude, "lng": res.coords.longitude}, 8000, function(err, res) {
						if (err || !appVars.venues) console.log(err);
						else appVars.venues.set(res);
					});
				}, function() {
					window.alert("Your browser does not support geolocation, so you'll have to use the address box to find your location.");
					appVars.mapCenter.set(appVars.defaultLocation);
					// pitchMap.setCenter(appVars.defaultLocation);
				});
				appVars.circleChanged.set(true);
			}
			pitchMap.setCenter(appVars.defaultLocation);
			google.maps.event.addListener(pitchMap, 'dblclick', function(event) {
				appVars.mapCenter.set(event.latLng);
				appVars.circleChanged.set(true);
				updateCircle();
				event.stop();
			});
		}
		console.log("GMaps Initialization");
		appVars.mapReady.set(true);
		google.maps.event.addListener(pitchMap, 'bounds_changed', function() {
			var _thisTimeout = this.thisTimeout;
			if (_thisTimeout) {
				Meteor.clearTimeout(_thisTimeout);
			}
			this.thisTimeout = Meteor.setTimeout(function() {
				removeMarkers();
				addMarkers(pitchMap.getBounds(), circle);
				_thisTimeout = null;
			}, venueDelay);
      	});
		// google.maps.event.addListenerOnce(pitchMap, 'idle', function(){
		// 	// document.getElementById("pitchMap").style.display = "block";
		// 	Deps.flush();
		// 	// google.maps.event.trigger(pitchMap, 'resize');
		// 	// pitchMap.setCenter(defaultLocation);
		// });
		if (appVars.circleSize) clientFunctions.pitchesWithin({"lat": parseFloat(appVars.mapCenter.get().lat(), 10), "lng": parseFloat(appVars.mapCenter.get().lng(), 10)}, appVars.circleSize.get(), function(err, res) {
			if (err) console.log(err);
			else if (appVars.venues) {
				appVars.venues.set(res);
			}
		});
	};

	var addMarkers = function(bounds, circle, maxPitches) {
		var neLat = bounds.getNorthEast().lat(),
			neLng = bounds.getNorthEast().lng(),
			swLat = bounds.getSouthWest().lat(),
			swLng = bounds.getSouthWest().lng(),
			currentPitch = $('#homeGround input').attr('id'); // Router.current().route.currentTeamId ? Teams.findOne(Router.current().route.currentTeamId.value).homeGround : null,
			pitches = Pitches.find({
				'location.lat': {$gte: swLat, $lte: neLat},
				'location.lng': {$gte: swLng, $lte: neLng},
				_id: {$ne: currentPitch}
		}, {
			limit: maxPitches ? maxPitches : appVars.maxPitches,
			sort: {priority: -1}
		}).fetch();
		if (currentPitch && Pitches.findOne(currentPitch)) pitches.unshift(Pitches.findOne(currentPitch));
		for (var i=0; i < pitches.length; i++) {
			var marker = new google.maps.Marker({
				position: pitches[i].location,
				map: pitchMap,
				options: {title: pitches[i].prettyLocation},
				icon: (pitches[i]._id === currentPitch) ? 'images/soccerv3.png' : 'images/soccerv2.png',
				pitch_ID: pitches[i]._id
			});
			if (pitches[i]._id === currentPitch) marker.setZIndex(1000);
			markersArray.push(marker);
			if (!circle) {
				attachMarkerEvent(marker, markerClickEvent);
			}
		}	
	};

	var removeMarkers = function() {
	  	for (var i = 0; i < markersArray.length; i++ )
	    	markersArray[i].setMap(null);
	  	markersArray.length = 0;		
	};

	var updateCircle = function() {
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
					    appVars.tabChoices.setKey('playerTab', 'pitchData');
					}, venueDelay);
				}
				appVars.mapCenter.value = appVars.liveCircle.getCenter();
				appVars.liveCircle.setOptions({ strokeColor: '#db781c', fillColor: '#db781c' });
			});
		}
	};

	var logTemplateEvents = function() {
		_.each(Template, function(template, name) {
			var oldCreated = template.created,
				oldDestroyed = template.destroyed,
				oldRendered = template.rendered;
			template.renders = 0;
			template.created = function() {
				console.log("Created: ", name, this); //_.filter(_.map(this.firstNode, function(a, b) { return b; }), function(a) { return typeof a === 'string' && a.slice(0, 7) === '_spark_'; }));
				oldCreated && oldCreated.apply(this, arguments);
			};
			template.rendered = function() {
				console.log("Rendering ", name, template.renders++);
				oldRendered && oldRendered.apply(this, arguments);
			};
			template.destroyed = function() {
				console.log("Destroyed: ", name, this);
				oldDestroyed && oldDestroyed.apply(this, arguments);
			};    
		});
	};

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
				var listener = function() {return false;};
				if ($(elem.nextElementSibling).hasClass("checkbox"))
					listener = addToggle(elem.nextElementSibling, 'disable');
				else if ($(elem.previousElementSibling).hasClass("checkbox"))
					listener = addToggle(elem.previousElementSibling, 'enable');					
				elem.addEventListener('click', listener);
			});
			break;
			default:
		}
	};

	var reactiveSubHandle = function(subName, collection, minDocs) {
		var handle = {
			ready: function() {
				var sub = subLookup(subName);
				Router.current()._waitList._dep.depend();
				if (sub) sub.readyDeps.depend();
				console.log("RSH RUN FOR", subName, (sub && sub.ready && ( collection ? (collection.find({}).count() >= minDocs) : true )) ? true: false);
				return (sub && sub.ready && ( collection ? (collection.find({}).count() >= minDocs) : true )) ? true : false;
			}
		};
		return handle;
	}

	var accountsReadyHandle = function() {
		var handle = {
			ready: function() {
				return Accounts.loginServicesConfigured && Accounts.loginServicesConfigured();
			}
		}
		return handle;
	}

	var joinTeam = function(code, callback) {
		var handle, self;
		if (!joinTeamDep) {
			joinTeamDep = {
				ready: false,
				readyDep: new Deps.Dependency()
			};
		}
		Meteor.call('joinTeam', code, function(err, res) {
			joinTeamDep.ready = true;
			joinTeamDep.readyDep.changed();
			if (!err) {
				joinTeamDep.info = res;
			}
		});
		handle = {
			ready: function() {
				joinTeamDep.readyDep.depend();
				return joinTeamDep.ready;
			},
			info: function() {
				joinTeamDep.readyDep.depend();
				return joinTeamDep.info;				
			}
		};
		if (callback) {
			callback(null, handle);
		}
		else {
			return handle;
		}
	};

	var pitchesWithin = function(center, distance, callback) {
		var ratio = 6.283184 / 360,
			lng = center.lng * ratio,
			lat = center.lat * ratio,
			width = Math.acos(Math.pow(Math.cos(lat), 2) * Math.cos(ratio) + Math.pow(Math.sin(lat), 2)) * 6371 / 111,
			d2 = Math.pow(distance/111000, 2),
			results = _.sortBy(_.filter(Pitches.find({}).fetch(), function(p) {
				return (Math.pow(p.location.lat - center.lat, 2) + Math.pow((p.location.lng - center.lng) * width, 2) < d2);
			}), function(p) {
				return p.prettyLocation;
			});
		if (callback) {
			callback(null, results);
		}
		else {
			return results;
		}
	};

	var padToTwo = function(number) {
	  if (number<=99) { number = ("0"+number).slice(-2); }
	  return number;
	};

	var clearPitches = function() {
		amplify.store['pitchData', []];
	};

	var subLookup = function(subName) {
		return _.filter(Meteor.connection._subscriptions, function(s) {return s.name === subName;})[0]
	};

	return {
		_libs: _libs,
		contactString: contactString,
		reIndexDatabase: reIndexDatabase,
		attachMarkerEvent: attachMarkerEvent,
		addMarkers: addMarkers,
		removeMarkers: removeMarkers,
		loadGoogleMaps: loadGoogleMaps,
		loadGMaps: loadGMaps,
		pitchesAvailable: pitchesAvailable,
		initialize: initialize,
		initializeCircle: initializeCircle,
		updateCircle: updateCircle,
		logTemplateEvents: logTemplateEvents,
		suprsubPlugins: suprsubPlugins,
		reactiveSubHandle: reactiveSubHandle,
		accountsReadyHandle: accountsReadyHandle,
		joinTeam: joinTeam,
		pitchesWithin: pitchesWithin,
		padToTwo: padToTwo,
		clearPitches: clearPitches
	};

})();