Meteor.users.allow({
    insert: function (userId, doc) {
        return true;
    },
    update: function (userId, doc, fields, modifier) {
        return true;
    },
    remove: function (userId, doc) {
        return true;
    }
});

Schemas.LatLng = new SimpleSchema({
    lat: {
        type: Number,
        decimal: true,
        label: "Latitude"
    },
    lng: {
        type: Number,
        decimal: true,
        label: "Longitude"
    }
});

Schemas.PlayerProfile = new SimpleSchema({
    ability: {
        type: Number,
        label: "Ability",
        defaultValue: 0
    },
    age: {
        type: Number,
        label: "Age",
        defaultValue: 0
    },
    availability: {
        type: Object,
        label: "Availability Matrix",
        blackbox: true,
        defaultValue: {
            "0/0": false,
            "0/1": false,
            "0/2": false,
            "0/3": false,
            "0/4": false,
            "0/5": false,
            "0/6": false,
            "1/0": false,
            "1/1": false,
            "1/2": false,
            "1/3": false,
            "1/4": false,
            "1/5": false,
            "1/6": false,
            "2/0": false,
            "2/1": false,
            "2/2": false,
            "2/3": false,
            "2/4": false,
            "2/5": false,
            "2/6": false
        }
    },
    center: {
        type: Schemas.LatLng,
        label: "Availability Area Center",
        defaultValue: {
            lat: 51.5560210,
            lng: -0.2795190
        }
    },
    footed: {
        type: Number,
        label: "Footedness",
        defaultValue: 0
    },
    position: {
        type: Number,
        label: "Preferred Position",
        defaultValue: 0
    },
    radius: {
        type: Number,
        label: "Available Area Radius",
        defaultValue: 8000,
        decimal: true
    },
    pitches: {
        type: [String],
        label: "Venues within area",
        defaultValue: []
    }

});

Schemas.TeamProfile = new SimpleSchema({
    _ids: {
        type: [String],
        label: "Teams (full member)",
        defaultValue: []
    },
    _ids_ringers: {
        type: [String],
        label: "Teams (SuprSub)",
        defaultValue: []
    },
    default: {
        type: String,
        defaultValue: ''
    }
});

Schemas.UserProfile = new SimpleSchema({
    contact: {
        type: [Number],
        label: "Contact media",
        defaultValue: []
    },
    first_name: {
        type: String,
        regEx: /^[a-zA-Z- ]{1,25}$/,
        label: "First Name",
    },
    last_name: {
        type: String,
        regEx: /^[a-zA-Z- ]{1,25}$/,
        label: "Last Name"
    },
    name: {
        type: String,
        regEx: /^[a-zA-Z- ]{2,51}$/,
        label: "Full Name"
    },
    gender: {
        type: Number,
        label: "Gender",
        defaultValue: 0
    },
    postMe: {
        type: Boolean,
        label: "Post On Relevant Events",
        defaultValue: true
    },
    player: {
        type: Schemas.PlayerProfile
    },
    team: {
        type: Schemas.TeamProfile
    }
});

Schemas.User = new SimpleSchema({
    _id: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    emails: {
        type: [Object],
        optional: true
    },
    "emails.$.address": {
        type: String,
        regEx: SimpleSchema.RegEx.Email
    },
    "emails.$.verified": {
        type: Boolean
    },
    createdAt: {
        type: Date,
        autoValue: function() {
            if (this.isInsert) {
                return new Date;
            } else if (this.isUpsert) {
                return {
                    $setOnInsert: new Date
                };
            } else {
                this.unset();
            }
        }
    },
    profile: {
        type: Schemas.UserProfile,
        optional: true
    },
    services: {
        type: Object,
        optional: true,
        blackbox: true
    }
});

Meteor.users.attachSchema(Schemas.User);