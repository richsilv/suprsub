renderOnce = function(template, oneTimeFunc, afterwards) {
	var oldRender;
	if (typeof template === "string") template = Template[template];
	if (!template) return false;
	oldRender = template.rendered;
	template.rendered = function() {
		if (afterwards) {
			oldRender && oldRender.apply(this, arguments);
			console.log("between");
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

templateAttach = function(template, callback) {
	if (typeof template === "string") template = Template[template];
	if (!template) return false;
	document.body.appendChild(Spark.render(template));
	callback && callback.apply(this, arguments);
};

confirmModal = function(message, callback) {
	templateAttach(function() {
		return Template.generalConfirmModal({
			message: message,
			callback: callback
		});
	});
}