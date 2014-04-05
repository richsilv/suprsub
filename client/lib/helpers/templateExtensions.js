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

templateAttach = function(template, callback, data) {
	console.log(callback);
	console.log(data);
	if (typeof template === "string") template = Template[template];
	if (!template) return false;
	if (data)
		UI.insert(UI.renderWithData(template, data), document.body);
	else
		UI.insert(UI.render(template), document.body);
	callback && callback.apply(this, arguments);
};

confirmModal = function(message, callback) {
	templateAttach(Template.generalConfirmModalWrapper, null, {
		message: message,
		callback: callback
	});
};