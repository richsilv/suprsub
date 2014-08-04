Template.generalConfirmModal.events({
	'click #generalConfirmCancel': function() {
		$('#generalConfirmModal').modal('hide');
	},
	'click #generalConfirmOkay': function() {
		$('#generalConfirmModal').modal('hide');
		this.callback.apply(this, this.arguments);
	}
});

// ******************************

Template.mainTemplate.helpers({
	'smallScreen': function() {
		return screen.width < 640.1;
	}
});

// ******************************

Template.sidebar.events({
	'click .item': function() {
		$('#sidebar').sidebar('hide');
		Meteor.setTimeout(function() {
			$('#miniTopbar .item').removeClass('offScreen');
		}, 500);	
	},
    'click #logout-button' : function() {
        Meteor.logout();
        Router.go('/login');
    }
});

Template.sidebar.rendered = function() {
	$('#sidebar')
  		.sidebar({
    		overlay: true
  		})
};

// ******************************

Template.miniTopbar.events({
	'click #miniTopbar .suprsub.icon, click #miniTopbar .reorder.icon': function() {
		$('#miniTopbar .item').addClass('offScreen');
		Meteor.setTimeout(function() {
			$('#sidebar').sidebar('show');
		}, 500);
	},
    'click #login-button' : function() {
    	if (Router.current().path === "/") {
    		Router.go('/login');
    		return;
    	}
        Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
          if (err) accountError.set(err.reason);
        });
    },
    'keyup #login-email, keyup #login-password': function(events) {
        if (event.keyCode === 13)    
            Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
                if (err) accountError.set(err.reason);
            });      
    }
})