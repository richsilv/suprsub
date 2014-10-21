$.fn.extend({

	checkboxLabel: function(method) {

		if (!method || method === 'init') {

			$(this).on('click', function() {
				var $this = $(this);
				if ($this.next().hasClass('toggle')) {
					$this.next('.toggle').checkbox('disable');
				} else if ($this.prev().hasClass('toggle')) {
					$this.prev('.toggle').checkbox('enable');
				}
			});

		} else if (method === 'destroy') {

		$(this).off('click');

		}

	}

});