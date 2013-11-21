Template.signUpBox.created = function() {
	$('html').css('background', 'url(footypitch.png) no-repeat center center fixed')
	.css('background-size','cover')
	.css('-o-background-size','cover')
	.css('-moz-background-size','cover')
	.css('-webkit-background-size','cover');
};

Template.pitchMap.created = function() {
	new GMaps({
		div: '#pitchMap',
		lat: -12.043333,
		lng: -77.028333
	});
};

Deps.autorun(function() {
	if (Meteor.userId()) $('html').css('background', '');
});