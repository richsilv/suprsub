window.suprsubPlugins = function(plugin, element) {

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
