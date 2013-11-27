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
	async.each(elems, getAddress, function(err) {
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

function getAddress(element) {

    var powerleagueCentreHandler = new htmlparser.DefaultHandler(function(error, dom) {
	if (error)
	    console.log('Cannot parse html.');
	else {
	    var addressElem = select(dom, '.address p');
	    var addressString = '';
	    for (var i = 0; i < addressElem[0].children.length; i++) {
		if (addressElem[0].children[i].data) addressString += addressElem[0].children[i].data + ', ';
	    }
	    console.log(element.children[0].data, addressString.slice(0, addressString.length-2));
	}
    });

    var powerleagueCentreParser = new htmlparser.Parser(powerleagueCentreHandler);

    console.log('Crawling url: http://www.powerleague.co.uk' + element.attribs.href);
    request({url: 'http://www.powerleague.co.uk' + element.attribs.href}, function(err, resp, body) {
	if (!err) {
	    powerleagueCentreParser.parseComplete(body);
	}
    });
}
