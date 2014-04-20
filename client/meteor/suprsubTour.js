Template.tourStep.events({
	'click .tourButton': function() {
		Router.Tour.nextStep();
	}
});

var renderOnce = function(template, oneTimeFunc, afterwards) {
	var oldRender;
	if (typeof template === "string") template = Template[template];
	if (!template) return false;
	oldRender = template.rendered;
	template.rendered = function() {
		if (afterwards) {
			oldRender && oldRender.apply(this, arguments);
			oneTimeFunc.apply(this, arguments);
		}
		else {
			oneTimeFunc.apply(this, arguments);
			oldRender && oldRender.apply(this, arguments);			
		}
		template.rendered = oldRender;
	}
	return true;
};

Router.Tour = (function($) {

	var config = {
		mainClass: 'ui segment whitetranslucent',
		internalClass: 'ui',
		titleClass: 'ui header',
		contentClass: '',
		buttonClass: 'ui button',
		buttonText: 'Next',
		triangleSize: 20,
		gapSize: 5
	};

	function loadTour(tour) {
		tourDetails = tour;
		_index = 0;
		_tourLength = tour ? tour.steps.length : 0;
		return true;
	}

	function getTour() {
		return this.tourDetails
	}

	function nextStep() {
		try {
			$('.tourMain').remove();
			if (tourDetails) {
				renderStep();
				_index += 1;
				if (_index >= _tourLength) {
					loadTour(null);
				}
			}
		} catch(e) {console.log(e.stack);}
	}

	function renderStep() {
		var thisPage = Router.current().route.name,
			thisStep = tourDetails.steps[_index],
			renderFunc = function() {
				var target = $(thisStep.target)[0],
					parent = target ? target.parentNode : document.body,
					context = _.extend(config, thisStep);
/*				UI.materialize(
					HTML.DIV({class: "tourMain " + config.mainClass, style: "opacity: 0; position: absolute;"},
						HTML.DIV({class: "tourInternal " + config.internalClass}, 
							HTML.H3({class: "tourTitle " + config.titleClass}, thisStep.title), 
							HTML.P({class: "tourContent " + config.contentClass}, thisStep.content),
							HTML.DIV({class: "tourButton " + config.buttonClass}, thisStep.buttonText ? thisStep.buttonText : config.buttonText)
							)
						),
					parent);*/
				UI.insert(UI.renderWithData(Template.tourStep, context), parent);
				var tourMain = $('.tourMain'),
					dimensions = {
						width: tourMain[0].scrollWidth,
						height: tourMain[0].scrollHeight
					},
					offsets = getOffsets(target ? target : document.body, tourMain[0], thisStep.placement);
				tourMain
					.css('top', offsets.top)
					.css('left', offsets.left);
				Meteor.setTimeout(function() {
					$('html, body').animate({
						scrollTop: ($('.tourMain').first().offset().top - (window.innerHeight/2))
					},500);
					tourMain.css('opacity', 1);
				}, thisStep.delay ? thisStep.delay : 0);
			};
		if (!(thisStep.content || thisStep.title)) {
			if (thisPage !== thisStep.page)
				Router.go(thisStep.page);
		}
		else if (thisPage !== thisStep.page) {
			renderOnce(thisStep.targetTemplate, renderFunc, true);
			Router.go(thisStep.page);
		}
		else
			renderFunc.apply(this, arguments);
	}

	function getOffsets(parent, node, position) {
		var width = node.scrollWidth,
			height = node.scrollHeight,
			offsets = {top: 0, left: 0};

		switch (position) {

			case 'top':
				offsets.top = - config.triangleSize - config.gapSize;
				offsets.left = (parent.offsetWidth - width) / 2;
				break;

			case 'bottom':
				offsets.top = parent.offsetHeight + config.triangleSize + config.gapSize;
				offsets.left = (parent.offsetWidth - width) / 2;
				break;

			case 'left':
				offsets.left = - config.triangleSize - config.gapSize;
				offsets.top = (parent.offsetHeight - height) / 2;
				break;

			case 'right':
				offsets.left = parent.offsetWidth + config.triangleSize + config.gapSize;
				offsets.top = (parent.offsetHeight - height) / 2;
				break;

			default:
			break;
		}

		return offsets;
	}

	return {
		loadTour: loadTour,
		getTour: getTour,
		nextStep: nextStep,
	}

}($));