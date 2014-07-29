var imageLinksReady = new suprsubDep(false),
	slideData = [
	{ header: "PLAY MORE FOOTBALL", caption: "The best way to play more football" },
	{ header: "PLAY MORE FOOTBALL", caption: "Find a SuprSub in seconds if your team is short" },
	{ header: "PLAY MORE FOOTBALL", caption: "Be a SuprSub wherever and whenever suits you" },
	{ header: "PLAY MORE FOOTBALL", caption: 'Launching soon - <a href="https://twitter.com/intent/follow?screen_name=suprsub">follow us on Twitter</a> for the latest updates' }
	];

// if (!$.support.transition) $.fn.transition = $.fn.animate;

function changedCallback(event) {
	if (this && this.info) $(".carousel-holder .img>div").transition({opacity: 0, duration: 100});
	Meteor.setTimeout(function() {
	  $(".carousel-holder .img>div").transition({opacity: 1, duration: 500});
	}, 500);
}

Meteor.startup(function() {
	Meteor.call('getSplashImages', slideData.length, function(err, res) {
		console.log(err, res);
		for (var i = 0, l = slideData.length; i < l; i++) {
			slideData[i].image = res[i];
		}
		imageLinksReady.set(true);
	});
	$(document).ready(function() {
		Deps.autorun(function(c) {
			if(imageLinksReady.get()) {
				$('.owl-carousel').owlCarousel({
			    	items: 1,
			    	autoplay: true,
			    	lazyLoad: true,
			    	loop: true,
			    	onChanged: changedCallback,
			    	autoplaySpeed: 500
			  	});
			  	c.stop();
			}
		});
	});
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "//connect.facebook.net/en_GB/all.js#xfbml=1&appId=553800328023729";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
});

Template.topbar.events({
    'click #login-button' : function() {
    	Router.go('/login');
        Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
          if (err) ;
          else Router.current().redirect('/home');
        });
    },
    'keyup #login-email, keyup #login-password': function(events) {
        if (event.keyCode === 13) {
        	Router.go('/login');
            Meteor.loginWithPassword($('#login-email').val(), $('#login-password').val(), function(err) {
                if (err) ;
	            else Router.current().redirect('/home');
            });
        }
    }
});

Template.owlCarousel.helpers({
	carouselItems: function() {
		imageLinksReady.dep.depend();
		return slideData;
	}
});

Template.owlCarousel.destroyed = function() {
	$('.owl-carousel').trigger('destroy.owl.carousel');
};

Template.owlCarousel.events({
	'click .signup': function() {
		Router.go('/login');
	}
});

Template.parallaxBox.rendered = function() {
	var docHeight = $(document).height(), windowHeight = $(window).height();
	console.log(docHeight, windowHeight);
	if (docHeight > windowHeight + 100) {
	  $('.leafImage').attr('data-stellar-background-ratio', 1 + ( 200 / ( docHeight - windowHeight ) ) );
	}
	else
	  $('.leafImage').attr('data-stellar-background-ratio', 0.3);
	$.stellar();
};