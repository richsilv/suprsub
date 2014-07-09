var fs = Npm.require('fs');

Router.map(function() {

  	this.route('uploadPitches', {
	    where: 'server',
	    path: '/uploadPitches',
	    action: function () {
	    	var _this = this,
	      		pitchesFile = _this.request.files.file,
	      		results,
	      		data;

			var readFile = Meteor._wrapAsync(fs.readFile.bind(fs));

			data = readFile(pitchesFile.path, 'utf8');

		  	if (data && pitchesFile.headers['content-type'] === 'text/csv') {
			  	results = Meteor.call('parsePitches', data);
		  	}

	     	this.response.writeHead(200, {'Content-Type': 'application/json'});
	      	this.response.end(JSON.stringify(results));			
		}
	});

});