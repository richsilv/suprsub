var objectTypes = [Pitches, Events, Tweets, Teams, Meteor.users],
	activePane = '#eventsData';

Template.adminTemplate.events({
	'click #tweetSubmit, submit *': function() {
		Meteor.call('analysePosting', $('#tweetText').val(), function(err, res) {
			if (err)
				console.log(err);
			else 
				objectFill(res, '#tweetData');
		});
		return false;
	},
	'click .objId': function(event) {
		var thisObj = getObject(event.target.innerText);
		if (thisObj) {
			activePane = event.target.parentElement;
			objectFill(thisObj, activePane, event.target.innerText);
		}
		var objectHistory = Router.current().objectHistory;
		if (!objectHistory.length || objectHistory[objectHistory.length - 1] !== event.target.innerText)
			objectHistory.push(event.target.innerText)
	},
	'click .object': function(event) {
		var thisObj = getObject(event.target.attributes.parent.value);
		if (thisObj) {
			activePane = event.target.parentElement;
			if (event.button === 0) {
				objectFill(
					objPath(thisObj, event.target.attributes.path.value), 
					activePane, 
					event.target.attributes.parent.value, 
					event.target.attributes.path.value
				);
			}
			else {
				var previous = prevPath(prevPath(event.target.attributes.path.value));
				objectFill(
					previous ? objPath(thisObj, previous) : thisObj, 
					activePane, 
					event.target.attributes.parent.value, 
					previous
				);					
			}
		}
	},
	'click .backLink': function(event) {
		var thisObj = getObject(event.target.attributes.parent.value);
		if (thisObj && event.button !== 0) {
			var previous = prevPath(prevPath(event.target.attributes.path.value));
			activePane = event.target.parentElement;
			objectFill(
				previous ? objPath(thisObj, previous) : thisObj, 
				activePane, 
				event.target.attributes.parent.value, 
				previous
			);				
		}		
	},
	'click .backButton': function(event) {
		var objectHistory = Router.current().objectHistory;
		if (objectHistory.length > 1) {
			objectHistory.pop();
			thisObj = getObject(objectHistory[objectHistory.length - 1]);
			if (thisObj)
				objectFill(thisObj, activePane, thisObj);
		}
	},
	'click .twitterId': function(event) {
		window.open('https://twitter.com/account/redirect_by_id/' + event.target.innerText, '_blank');
	},
	'click #deletePitch': function() {
		Pitches.remove($('#pitchData .objId')[0].innerText);
		$('#pitchData').html('');
	}
});

Template.eventsBox.events({
	'click li': function(event) {
		updateAndFill(this, '#eventData');
	}
});

Template.tweetsBox.events({
	'click li': function(event) {
		updateAndFill(this, '#tweetData');
	}
});

Template.teamsBox.events({
	'click li': function(event) {
		updateAndFill(this, '#teamData');
	}
});

Template.usersBox.events({
	'click li': function(event) {
		updateAndFill(this, '#userData');
	}
});

Template.pitchesBox.events({
	'click li': function(event) {
		updateAndFill(this, '#pitchData');
	}
});

Template.tweetInjector.events({
	'click #injectTweet': function() {
		var tweetText = $('#tweetInput').val(),
			tweetSender = $('#tweetSender').val(),
			replyTo = $('#replyTo').val();
		if (tweetText && tweetSender) {
			Meteor.call('twitterGetDetails', tweetSender, function(err, res) {
				if (err) {
					console.log(err);
					return err;
				}
				else if (res) {
					var tweet = {
						id_str: Meteor.uuid(),
						user: {
							id: res.id,
							screen_name: res.screen_name
						},
						created_at: new Date(),
						source: "admin",
						text: tweetText,
						in_reply_to_status_id_str: replyTo
					}
					console.log("Tweeting:", tweet);
					Meteor.call('processTweet', tweet);
				}
			})
		}
	}
});

Template.pitchesBox.rendered = function() {
}

function getIndex(obj,i) {
	return obj[i];
}
	
function objPath(obj, path) {
	return path.split('.').reduce(getIndex, obj) || '';
}

function updateAndFill(ctx, pane) {
	var objectHistory = Router.current().objectHistory;
	if (!objectHistory.length || objectHistory[objectHistory.length - 1] !== ctx._id)
		objectHistory.push(ctx._id);
	activePane = pane;
	objectFill(ctx, activePane, ctx._id);	
};

function objectFill(obj, elem, parent, path, previous) {
	var keys = (!obj || obj instanceof Array) ? [] : Object.getOwnPropertyNames(obj);
	if (keys.length) {
		var	propertyString = keys.reduce(function(s, r) {
			var t = s + HTML.SPAN({cls: 'keyName'}, [r + ': ']).toHTML();
			if (objPath(obj, r) instanceof Array) {
				return capString(objPath(obj, r).reduce(function(u, v) {
					return u + HTML.SPAN({cls: "objId"}, [ v.toString() ]).toHTML() + ', ';
				}, t));
			}
			else if (isId(objPath(obj, r))) {
				return t + HTML.SPAN({cls: "objId"}, [ objPath(obj, r).toString() ]).toHTML() + HTML.BR().toHTML();
			}
			else if (isTwitterId(objPath(obj, r))) {
				return t + HTML.SPAN({cls: "twitterId"}, [ objPath(obj, r).toString() ]).toHTML() + HTML.BR().toHTML();
			}
			else if (objPath(obj, r) instanceof Date) {
				return  t + objPath(obj, r).toString() + HTML.BR().toHTML();
			}
			else if (objPath(obj, r) instanceof Object) {
				var params = {
					cls: 'object backLink',
					path: (path ? path + '.' : '') + r,
					parent: parent
				};
				return t + HTML.SPAN(params, ['Object']).toHTML() + HTML.BR().toHTML();
			}
			else if (parent) {
				var params = {
					cls: 'backLink',
					path: (path ? path + '.' : '') + r,
					parent: parent
				};
				return t + HTML.SPAN(params, [ objPath(obj, r).toString() ]).toHTML() + HTML.BR().toHTML();
			}
			else
				return  t + objPath(obj, r) + HTML.BR().toHTML();
		}, '');
		$(elem).html(propertyString);
	}
	else if (obj instanceof Array) {
		var	propertyString = obj.reduce(function(s, r) {
			var t = s;
			if (isId(r)) {
				return t + HTML.SPAN({cls: "objId"}, [ r.toString() ]).toHTML() + HTML.BR().toHTML();
			}
			else if (r instanceof Object) {
				var params = {
					cls: 'object backLink',
					path: (path ? path + '.' : '') + r,
					parent: parent
				};
				return t + HTML.SPAN(params, ['Object']).toHTML() + HTML.BR().toHTML();
			}
			else if (parent) {
				var params = {
					cls: 'backLink',
					path: (path ? path + '.' : '') + r,
					parent: parent
				};
				return t + HTML.SPAN(params, [ r.toString() ]).toHTML() + HTML.BR().toHTML();
			}
			else
				return  t + r + HTML.BR().toHTML();
		}, '');
		$(elem).html(propertyString);		
	}
	else
		$(elem).html('<span class="object" path="' + path + '" parent="' + parent + '">' + obj.toString() + '</span><br>');
}

function isId(data) {
	var regEx = /^(?=.*[A-Za-z])[0-9A-Za-z]{17}$/.exec(data);
	return ( regEx && regEx.length === 1 );
}

function isTwitterId(data) {
	var regEx = /^[0-9]{6,11}$/.exec(data);
	return ( regEx && regEx.length === 1 );
}

function getObject(id) {
	var retObj = null;
	objectTypes.forEach(function(t) {
		var res = t.findOne({_id: id});
		retObj = res ? res : retObj;
	});
	return retObj;
}

function prevPath(path) {
	var ind = path.lastIndexOf('.');
	if (ind > 0)
		return path.substr(0, ind);
	else
		return undefined
}

function capString(s) {
	return s.substr(0, s.length-2) + '<br>';
}