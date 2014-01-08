prettyDateTime = function(dateTime) {
	return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
};

colloquialDateTime = function(dateTime) {
	var today = new Date();
	if (today.getFullYear() === dateTime.getFullYear() && today.getMonth() === dateTime.getMonth()) {
		if (today.getDate() === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' today';
		else if (today.getDate() + 1 === dateTime.getDate()) return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' tomorrow';
	}
	return padNum(dateTime.getHours(), 2) + ':' + padNum(dateTime.getMinutes(), 2) + ' on ' + dateTime.toDateString();
};

prettyLocation = function(locationId) {
	var location;
	location = Pitches.findOne({_id: locationId});
	if (!location) return '';
	else return location.owner + ' - ' + location.name;
};

padNum = function(number, digits) {
	var n = number.toString();
	for (var i = n.length; i < digits; i++) n = '0' + n;
		return n;
};