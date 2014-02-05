renderOnce = function(template, oneTimeFunc, afterwards) {
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