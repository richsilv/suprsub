if (Meteor.isServer) {

	var collections = {};

	PolledCollection = function(name) {

		var newCollection = new Mongo.Collection(name);
		collections[name] = newCollection;
		return newCollection;

	}

	Meteor.methods({

		polledCollectionGetNew: function(existing, name, query) {

			return collections[name].find(_.extend(query || {}, {_id: {$nin: existing}})).fetch();

		},

		polledCollectionGetRemoved: function(existing, name, query) {

			var currentIds = _.pluck(collections[name].find(query || {}, {fields: {_id: true}}).fetch(), '_id');

			this.unblock();
			return _.reduce(existing, function(list, nextId) {
				if (_.indexOf(currentIds, nextId) === -1) list.push(nextId);
				return list;
			}, []);

		}

	});

}

else if (Meteor.isClient) {

	PolledCollection = function(name) {

		var _this = this,
			existingDocs = amplify.store('polledCollection_' + name) || [];

		this.name = name;
		this._collection = new Mongo.Collection(null);
		this._syncFlag = new ReactiveVar(false);
		
		for (prop in this._collection) {
			if (typeof _this._collection[prop] === 'function')
				_this[prop] = _this._collection[prop].bind(_this._collection);
			else
				_this[prop] = _this._collection[prop];
		}

		for (var i = existingDocs.length - 1; i >= 0; i--) {
			_this.insert(existingDocs[i]);
		}

		console.log("Polled Collection " + name + " seeded with " + existingDocs.length.toString() + " docs from local storage.");

	}

	PolledCollection.prototype.sync = function(options) {

		options = options || {};

		var _this = this,
			currentIds = _.pluck(this.find({}).fetch(), '_id'),
			jobsComplete = {
				remove: options.retain,
				insert: options.reject
			},
			completionDep = new Deps.Dependency(),
			results = {};

		_this._syncFlag.set(false);

		if (!options.retain) {
			Meteor.call('polledCollectionGetRemoved', currentIds, _this.name, options.query, function(err, res) {
				var removed = _this.find({_id: {$in: res}}).fetch();
				res.forEach(function(id) {_this.remove({_id: id}); });
				results.removed = removed;
				jobsComplete.remove = true;
				completionDep.changed();
				options.removalCallback && options.removalCallback.call(this, removed);
			});
		}

		if (!options.reject) {
			Meteor.call('polledCollectionGetNew', currentIds, _this.name, options.query, function(err, res) {
				res.forEach(function(doc) {_this.insert(doc)});
				results.inserted = res;
				jobsComplete.insert = true;
				completionDep.changed();
				options.insertionCallback && options.insertionCallback.call(this, res);
			});
		}

		Tracker.autorun(function(comp) {

			completionDep.depend();

			if (jobsComplete.remove && jobsComplete.insert) {

				comp.stop();
				_this._syncFlag.set(true);

				var syncedCollection = _this.find().fetch();
				amplify.store('polledCollection_' + _this.name, syncedCollection);
				console.log("Polled Collection " + _this.name + " now has " + syncedCollection.length + " documents stored locally.");
				options.syncCallback && options.syncCallback.call(this, results);
			}

		});

	} 

	PolledCollection.prototype.clear = function() {

		this.remove();
		amplify.store('polledCollection_' + this.name, []);

	}

	PolledCollection.prototype.ready = function() {

		return this._syncFlag.get();

	}

}
