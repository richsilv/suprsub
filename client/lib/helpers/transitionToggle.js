$.fn.toggleTransition = function(attr, optA, optB) {
	var transObj = {};
	if (this[0].style[attr] === optA)
		transObj[attr] = optB;
	else
		transObj[attr] = optA;
	this.transition(transObj);
} 