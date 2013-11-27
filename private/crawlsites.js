/*jshint smarttabs:true */
var uu = require('underscore');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose');
var http = require('http');
var fs = require('fs');
var tc = require('trycatch');
var csv = require('csv');
var select = require('soupselect').select;
var htmlparser = require('htmlparser2');

var Schema = mongoose.Schema;
var pitchSchema = mongoose.Schema({
    owner:String,
    name:String,
    address:String,
    location:{}
});
var Pitch = mongoose.model('Pitch', pitchSchema);

function monconnect(dbase, portno) {
    if (typeof portno == 'undefined') {portno = 27017;}
    mongoose.connect('mongodb://localhost:' + portno + '/' + dbase);
}

function saveSet(set, schema, cb) {
    var saveItem = function(itemdeets, callback) {
	var item = new schema(itemdeets);
	item.save(callback);
    };
    async.map(set, saveItem, cb);
}

var powerleagueMainHandler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
	console.log('Cannot parse html.');
    else {
	var elems = select(dom, '.centre ul li a').filter(function(tag) {
	    return tag.attribs.href.slice(0, 10) === '/5-a-side/';
	});
	global.centres = elems;
	console.log('Parsed Main Page');
	async.each(elems, getPowerLeagueAddress, function(err) {
	    if (err) console.log('Error: ' + err);
	    else console.log('All done');
	});
    }
});

var powerleagueMainParser = new htmlparser.Parser(powerleagueMainHandler);

function powerleagueQuery() {
    request({url: 'http://www.powerleague.co.uk/'}, function(err, resp, body) {
	if (!err) {
	    powerleagueMainParser.parseComplete(body);
	}
    });
}

function getPowerLeagueAddress(element, callback) {

    var powerleagueCentreHandler = new htmlparser.DefaultHandler(function(error, dom) {
	if (error)
	    console.log('Cannot parse html.');
	else {
	    var addressElem = select(dom, '.address p');
	    var addressString = '';
	    for (var i = 0; i < addressElem[0].children.length; i++) {
		if (addressElem[0].children[i].data) addressString += addressElem[0].children[i].data + ', ';
	    }
	    var item = {owner: 'PowerLeague', name: element.children[0].data, address: addressString.slice(0, addressString.length-2)};
	    var newPitch = new Pitch(item);
	    Pitch.findOne({owner: item.owner, name: item.name}, function(err, res) {
		if (err) console.log('Cannot connect to DB');
		else {
		    if (res) console.log('Item', item.owner, item.name, 'already exists');
		    else {
			newPitch.save(function(err) {
			    if (err) console.log('Could not save', item.owner, item.name);
			    else console.log(item.owner, item.name, 'saved');
			});
		    }
		}
	    });
	}
    });

    var powerleagueCentreParser = new htmlparser.Parser(powerleagueCentreHandler);

    console.log('Crawling url: http://www.powerleague.co.uk' + element.attribs.href);
    request({url: 'http://www.powerleague.co.uk' + element.attribs.href}, function(err, resp, body) {
	if (!err) {
	    powerleagueCentreParser.parseComplete(body);
	    if (callback) callback();
	}
    });
}

var goalsMainHandler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
	console.log('Cannot parse html.');
    else {
	var elems = select(dom, '.LM_C a');
	global.centres = elems;
	console.log('Parsed Main Page');
	console.log(elems);
	async.each(elems, getGoalsAddress, function(err) {
	    if (err) console.log('Error: ' + err);
	    else console.log('All done');
	});
    }
});

var goalsMainParser = new htmlparser.Parser(goalsMainHandler);

function goalsQuery() {
    request({url: 'http://www.goalsfootball.co.uk/LocationMap.aspx'}, function(err, resp, body) {
	if (!err) {
	    goalsMainParser.parseComplete(body);
	}
    });
}

function getGoalsAddress(element, callback) {

    var goalsCentreHandler = new htmlparser.DefaultHandler(function(error, dom) {
	if (error)
	    console.log('Cannot parse html.');
	else {
	    var centreName = select(dom, '.centreHeaderName');
	    var addressElem = select(dom, '#ctl00_ctl00_MainContent_contentAreaText_PostCode');
	    var item = {owner: 'Goals', name: centreName[0].children[0].data, address: addressElem[0].children[0].data};
	    var newPitch = new Pitch(item);
	    Pitch.findOne({owner: item.owner, name: item.name}, function(err, res) {
		if (err) console.log('Cannot connect to DB');
		else {
		    if (res) console.log('Item', item.owner, item.name, 'already exists');
		    else {
			newPitch.save(function(err) {
			    if (err) console.log('Could not save', item.owner, item.name);
			    else console.log(item.owner, item.name, 'saved');
			});
		    }
		}
	    });
	}
    });

    var goalsCentreParser = new htmlparser.Parser(goalsCentreHandler);

    console.log('Crawling url: http://www.goalsfootball.co.uk' + element.attribs.href);
    request({url: 'http://www.goalsfootball.co.uk' + element.attribs.href}, function(err, resp, body) {
	if (!err) {
	    goalsCentreParser.parseComplete(body);
	    if (callback) callback();
	}
    });
}

function addLocations() {
    Pitch.find({'location': {$exists: false}}, function(err, res) {
	async.each(res, function(pitch, cb) {
	    var requestUrl = 'http://maps.googleapis.com/maps/api/geocode/json?address=' +
		pitch.address.replace(' ', '+') +
		'&sensor=false&bounds=GB';
	    request({url: requestUrl}, function(err, resp, body) {
		locObj = JSON.parse(body);
		if (err) console.log(err);
		else if (locObj.status !== 'OK') console.log(locObj.status, 'for', pitch. owner, pitch.name);
		else {
		    pitch.update({$set: {location: locObj.results[0].geometry.location}}, function(err) {
			if (err) console.log('Cannot update location for', pitch.owner, pitch.name);
			else console.log('Location added for ', pitch.owner, pitch.name);
		    });
		}
	    });
	}, function(err) {
	    if (err) console.log(err);
	    else console.log("All done");
	});
    });
}
