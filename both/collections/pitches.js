Pitches = new DumbCollection('pitches');

Pitches.withinBounds = function(bounds) {
	var southWest = bounds.getSouthWest(),
		northEast = bounds.getNorthEast();
	return Pitches.find({
		'location.lat': {
			$gte: southWest.lat(),
			$lte: northEast.lat()
		},
		'location.lng': {
			$gte: southWest.lng(),
			$lte: northEast.lng()
		}
	}).fetch();
}

Pitches.populated = function(n) {
	return Pitches.find().count() > (n || 100);
};

/*
 * Add query methods like this:
 *  Pitches.findPublic = function () {
 *    return Pitches.find({is_public: true});
 *  }
 */