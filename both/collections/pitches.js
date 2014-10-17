Pitches = new DumbCollection('pitches');

Pitches.withinBounds = function(bounds) {
	return Pitches.find({
		'location.lat': {$gte: bounds.getSouth()},
		'location.lat': {$lte: bounds.getNorth()},
		'location.lng': {$gte: bounds.getWest()},
		'location.lng': {$lte: bounds.getEast()}
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
