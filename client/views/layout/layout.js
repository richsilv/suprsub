Template.generalConfirmModal.events({
	'click #generalConfirmCancel': function() {
		$('#generalConfirmModal').modal('hide');
	},
	'click #generalConfirmOkay': function() {
		$('#generalConfirmModal').modal('hide');
		this.callback.apply(this, this.arguments);
	}
});

Template.generalConfirmModal.rendered = function() {
  $('#generalConfirmModal').modal({
    onHide: function() {
      $('.ui.dimmer.page').remove();
    },
    closable: false
  }).modal('show');
};