Template.logging.helpers({
	printLog: function() {
		return JSON.stringify(this.log, undefined, 2);
	},
	dateTime: function() {
		return moment(this.dateTime).format('HH:mm:ss.SS , D MMM');
	}
});