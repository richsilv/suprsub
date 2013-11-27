geoComponent = function() {

  var geolocateCallbackFunction = null;
  var continuousReference = null;

  function isSupported() {
    if(window.navigator.geolocation) {
      return true;
    } else {
      return false;
    }
  }

  function geolocateSuccess(position) {
    geolocateCallbackFunction(position);
  }

  function geolocateError(error) {
    if (error.code === 1) {
      // User denied access to their location.
    }
    else if (error.code === 2) {
      // No position could be obtained.
    }
    else {
      // Request for location timed out.
    }
  }

  // Public properties.
  return {
    geolocate: function(callback, maxAge, highAccuracy, continuous) {
      geolocateCallbackFunction = callback;

      if (maxAge === undefined) {
        maxAge = 3600000;
      }

      if (highAccuracy === undefined) {
        highAccuracy = false;
      }

      if (isSupported()) {
        if ((continuous !== undefined) && continuous) {
          continuousReference = navigator.geolocation.watchPosition(
            geolocateSuccess, geolocateError, {maximumAge: maxAge, 
            enableHighAccuracy: highAccuracy});
        }
        else {
          navigator.geolocation.getCurrentPosition(geolocateSuccess,
            geolocateError, {maximumAge: maxAge, enableHighAccuracy: highAccuracy});
        }
      }
    },

    generateMap: function(htmlElementId, longitude, latitude, zoomLevel, mapType) {
      if (zoomLevel === undefined) {
        zoomLevel = 14;   
      }
        
      if (mapType === undefined) {
        mapType = 'roadmap';
      }

      var mapOptions = {
        center: new google.maps.LatLng(latitude, longitude),
        zoom: zoomLevel,
        mapTypeId: mapType
      };

      var map = new google.maps.Map(document.getElementById(htmlElementId),
        mapOptions);
      
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(latitude, longitude),
        map: map,
        title:"You are here!"
      });
      
      return map;
    }

  };

}();