/*
 * Add query methods like this:
 *  Pitches.findPublic = function () {
 *    return Pitches.find({is_public: true});
 *  }
 */

Schemas.Pitches = new SimpleSchema({
	'address': {
		type: String,
		defaultValue: ''
	},
    'location.city': {
    	type: String,
    	defaultValue: '',
    	optional: true
    },
    'location.lat': {
    	type: Number,
    	optional: false,
    	decimal: true,
    	defaultValue: 0
    },
    'location.lng': {
    	type: Number,
    	optional: false,
    	decimal: true,
    	defaultValue: 0
    },
    prettyLocation: {
    	type: String,
    	defaultValue: 'Unknown Location'
    }
});

Pitches.attachSchema(Schemas.Pitches);