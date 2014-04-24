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
		gapSize: 5,
		width: 300
	}

	function setConfig(configObject) {
		config = _.extend(config, configObject);
	}

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
					parent = /*target ? target.parentNode :*/ document.body,
					direction = screen.width > 640 ? thisStep.placement : thisStep.mobilePlacement || thisStep.placement,
					context = _.extend(config, {direction: direction, tourWidth: config.width}, thisStep);
				UI.insert(UI.renderWithData(Template.tourStep, context), /*parent*/ document.body);
				var tourMain = $('.tourMain'),
					dimensions = {
						width: tourMain[0].scrollWidth,
						height: tourMain[0].scrollHeight
					},
					offsets = getOffsets(target ? target : document.body, tourMain[0], direction );
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

	function getOffsets(target, node, boxPosition) {
		var targetWidth = target.scrollWidth,
			targetHeight = target.scrollHeight,
			nodeWidth = node.scrollWidth,
			nodeHeight = node.scrollHeight,
			offsets = $(target).offset();

		switch (boxPosition) {

			case 'top':
				offsets.top += - nodeHeight - config.triangleSize - config.gapSize;
				offsets.left += (targetWidth - nodeWidth) / 2;
				break;

			case 'bottom':
				offsets.top += - nodeHeight + targetHeight + config.triangleSize + config.gapSize;
				offsets.left +=  (targetWidth - nodeWidth) / 2;
				break;

			case 'left':
				offsets.left += - nodeWidth - config.triangleSize - config.gapSize;
				offsets.top += (targetHeight / 2) - nodeHeight;
				break;

			case 'right':
				offsets.left += targetWidth + config.triangleSize + config.gapSize;
				offsets.top += (targetHeight / 2) - nodeHeight;
				break;

			default:
			break;
		}

		offsets.left = Math.min( Math.max(0, offsets.left), screen.width - config.width );

		console.log(target, boxPosition, offsets)

		return offsets;
	}

	return {
		setConfig: setConfig,
		loadTour: loadTour,
		getTour: getTour,
		nextStep: nextStep,
	}

}($));