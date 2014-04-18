Template.generalConfirmModal.events({
	'click #generalConfirmCancel': function() {
		$('#generalConfirmModal').modal('hide');
	},
	'click #generalConfirmOkay': function() {
		$('#generalConfirmModal').modal('hide');
		this.callback.apply(this, this.arguments);
	}
});

Template.mainTemplate.helpers({
	'smallScreen': function() {
		return screen.width < 640.1;
	}
})

Template.sidebar.rendered = function() {
	$('.overlay.sidebar')
  		.sidebar({
    		overlay: true
  		})
  		.sidebar('toggle');
}