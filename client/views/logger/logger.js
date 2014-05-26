Template.logging.helpers({
	printLog: function() {
		return JSON.stringify(this.log, undefined, 2);
	},
	dateTime: function() {
		return moment(this.dateTime).format('HH:mm:ss.SS , D MMM');
	}
});

Template.logging.events({
	'click .logTime': function(event) {
		$(event.currentTarget).html('<pre>' + JSON.stringify(this.stack, undefined, 2) + '</pre>')
			.addClass('logTrace')
			.removeClass('logTime');
	},
	'click .logTrace': function(event) {
		$(event.currentTarget).html(moment(this.dateTime).format('HH:mm:ss.SS , D MMM'))
			.addClass('logTime')
			.removeClass('logTrace');
	}	
})