var PodcastStorage = Class.create({
	initialize: function(name) {
		this.dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
		this.requiresUpdate = false;
		
		// Event listener arrays
		this.callback = {};
		this.callback[PodcastStorage.ConnectionToDatabase] = [];
		this.callback[PodcastStorage.FailedConnectionToDatabase] = [];
		this.callback[PodcastStorage.PodcastStartUpdate] = [];
		this.callback[PodcastStorage.PodcastUpdateSuccess] = [];
		this.callback[PodcastStorage.PodcastUpdateFailure] = [];
		this.callback[PodcastStorage.PodcastListStartUpdate] = [];
		this.callback[PodcastStorage.PodcastListFinishUpdate] = [];		
		this.callback[PodcastStorage.SavingDatabaseSuccess] = [];
		this.callback[PodcastStorage.SavingDatabaseFailure] = [];
		this.callback[PodcastStorage.LoadingDatabaseSuccess] = [];
		this.callback[PodcastStorage.LoadingDatabaseFailure] = [];
	},
	connectToDatabase: function() {
		// Wait for successful creation/connection from the db
		var onSuccess = function() {
			Mojo.Log.info("[PodcastStorage] Connection to database success.");
			// Perform the event PodcastStorage.ConnectionToDatabase
			this.doEvent(PodcastStorage.ConnectionToDatabase);
		};
		
		// Wait for failure creation/connection from the db
		var onFailure = function(code) {
			var error = interpretCode(code);
			Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
			this.doEvent(PodcastStorage.FailedConnectionToDatabase, error);
		};
		
		try {
			// Connect/Create statement for the db
			this.db = new Mojo.Depot({
				//replace: true,
				name: this.dbName,
				version: "1",
				displayName: "PodSnatcher Database",
				estimatedSize: 25000
			}, onSuccess.bind(this), onFailure.bind(this));
		} catch(error) {
			this.doEvent(PodcastStorage.LoadingDatabaseFailure, error);
			Mojo.Log.error("[PodcastStorage.connectToDatabase] %s", error.message);
		}
	},
	loadDatabase: function() {
		// When the Mojo.Depot.get() method completes successfully
		var onSuccess = function(response) {
			// Return number of records found
			var recordSize = (Object.isArray(response)) ? response.size() : Object.values(response).size();
			Mojo.Log.info("[PodcastStorage.getPodcasts] %i podcast(s) loaded.", recordSize);
			if(recordSize == 0) { // Database has nothing in it.
				this.populateInitialDB();
			} else {
				response.each(function(podcastItem, index) {
					var item = new Podcast(podcastItem);
					if(item.isOutOfDate()) {
						this.requiresUpdate = true;
					}
					this.listOfPodcasts.push(item);
				}, this);
				// Perform the event PodcastStorage.LoadingDatabaseSuccess
				this.doEvent(PodcastStorage.LoadingDatabaseSuccess);
			}
		};
		
		// Wait for failure creation/connection from the db
		var onFailure = function(code) {
			var error = interpretCode(code);
			Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
			this.doEvent(PodcastStorage.LoadingDatabaseFailure, error);
		};
		
		try {
			this.db.get("podcastList", onSuccess.bind(this), onFailure.bind(this));
		} catch(error) {
			this.doEvent(PodcastStorage.LoadingDatabaseFailure, error);
			Mojo.Log.error("[PodcastStorage.loadDatabase] error! %s", error.message);
		}
	},
	getPodcastList: function() {
		var temp = new Array();
		this.listOfPodcasts.each(function(podcast, index) {
			temp.push(podcast.toListItem());
		});
		
		return temp.clone();
	},
	interpretCode: function(code) {
		var result = {
			code: code,
			message: ""
		};
		
		switch(code) {
			case 0:
				result.message = "The transaction failed for reasons unrelated to the database itself and not covered by any other error code.";
				break;
			case 1:
				result.message = "The statement failed for database reasons not covered by any other error code.";
				break;
			case 2:
				result.message = "The statement failed because the expected version of the database didn't match the actual database version.";
				break;
			case 3:
				result.message = "The statement failed because the data returned from the database was too large. The SQL \"LIMIT\" modifier might be useful to reduce the size of the result set.";
				break;
			case 4:
				result.message = "The statement failed because there was not enough remaining storage space, or the storage quota was reached and the user declined to give more space to the database.";
				break;
			case 5:
				result.message = "The statement failed because the transaction's first statement was a read-only statement, and a subsequent statement in the same transaction tried to modify the database, but the transaction failed to obtain a write lock before another transaction obtained a write lock and changed a part of the database that the former transaction was depending upon.";
				break;
			case 6:
				result.message = "An INSERT, UPDATE, or REPLACE statement failed due to a constraint failure. For example, because a row was being inserted and the value given for the primary key column duplicated the value of an existing row.";
				break;
			default:
				result.message = "Un-recognized error code. See: http://developer.palm.com/index.php?option=com_content&view=article&id=1857&Itemid=246";
				break;
		}
		
		return result;
	},
	doEvent: function(event, param1, param2) {
		try {
			Mojo.Log.info("[PodcastStorage.doEvent] %s", event);
			this.callback[event].each(function(item) {
				item(param1, param2);
			});
		} catch(error) {
			Mojo.Log.error("[PodcastStorage.doEvent] Called event %s. %s", event, error.message);
		}
	},
	onFailure: function(code) {
		var error = interpretCode(code);
		Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
	},
	populateInitialDB: function() {
		//http://www.wdwradio.com/xml/wdwradio.xml
		//http://revision3.com/diggnation/feed/MP4-Large
		//http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595
		//http://buzzreportpodcast.cnettv.com
		//http://mailbagpodcast.cnettv.com
		
		var onSuccess = function() {
			this.loadPodcasts();
		};
		
		var initialList = [
			new Podcast('http://www.wdwradio.com/xml/wdwradio.xml'),
			new Podcast('http://revision3.com/diggnation/feed/MP4-Large'),
			new Podcast('http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595'),
			new Podcast('http://feeds.feedburner.com/cnet/buzzreport?format=xml'),
			new Podcast('http://feeds.feedburner.com/cnet/mailbag?format=xml')
		];
		
		// Perform the addition of the list in the initial app
		this.db.add("podcastList", initialList, onSuccess.bind(this), this.onFailure);
	},
	savePodcasts: function() {
		var onSuccess = function() {
			Mojo.Log.info("[PodcastStorage.savePodcasts] Success.");
			// Event to let it be known that the database was saved
			this.doEvent(PodcastStorage.SavingDatabaseSuccess);
		};
		
		var onFailure = function(code) {
			Mojo.Log.info("[PodcastStorage.savePodcasts] Failed.");
			this.doEvent(PodcastStorage.SavingDatabaseFailures, this.interpretCode(code));
		};
		
		this.db.add("podcastList", this.listOfPodcasts, onSuccess.bind(this), this.onFailure);
	}
});

// Properites of each instance of PodcastStorage
PodcastStorage.prototype._currentPodcast = 0;
PodcastStorage.prototype.indexUpdating = 0;
PodcastStorage.prototype.db = {};
PodcastStorage.prototype.listOfPodcasts = [];
PodcastStorage.prototype.callback = {};

PodcastStorage.prototype.currentPodcast = function() {
	return Object.clone(this.listOfPodcasts[this._currentPodcast]);
}

PodcastStorage.prototype.nextPodcast = function() {
	this._currentPodcast++;
	if(this._currentPodcast >= this.listOfPodcasts.size()) {
		this._currentPodcast = 0;
	}
	return this.currentPodcast();
}

PodcastStorage.prototype.previousPodcast = function() {
	this._currentPodcast--;
	if(this._currentPodcast < 0) {
		this._currentPodcast = this.listOfPodcasts.size() - 1;
	}
	return this.currentPodcast();
}

PodcastStorage.prototype.findPodcast = function(feedKey) {
	var podcastToUpdate = this.listOfPodcasts.detect(function(podcast) {
		return podcast.key = feedKey;
	});
	return podcastToUpdate;
};

PodcastStorage.prototype.updateCurrent = function() {
	// Let listeners know that update for the given podcast is starting
	this.doEvent(PodcastStorage.PodcastStartUpdate, this.listOfPodcasts[this._currentPodcast].key);
	this.listOfPodcasts[this._currentPodcast].updateFeed(function(feedKey) {
		this.doEvent(PodcastStorage.PodcastUpdateSuccess, feedKey);
	}.bind(this));
}

PodcastStorage.prototype.updatePodcasts = function() {
	try {
		// Reset the index that is currently updating
		this.indexUpdating = 0;
		// Let listeners know that the podcast list has begun updating
		this.doEvent(PodcastStorage.PodcastListStartUpdate);
		// Update the first podcast in the list
		this.listOfPodcasts[this.indexUpdating].updateFeed(this.onFeedUpdate.bind(this));
		// Let listeners know that update for the given podcast is starting
		this.doEvent(PodcastStorage.PodcastStartUpdate, this.listOfPodcasts[this.indexUpdating].key);
	} catch (error) {
		Mojo.Log.error("[PodcastStorage.updatePodcasts] %s", error.message);
	}
};

PodcastStorage.prototype.onFeedUpdate = function(feedKey) {
	// Increment the podcast number that is currently updating
	this.indexUpdating++;
	// Do event to notify that the podcast has updated
	this.doEvent(PodcastStorage.PodcastUpdateSuccess, feedKey);
	// Check to see if more podcasts need to be updated
	if(this.indexUpdating == this.listOfPodcasts.size()) {
		// If the are equal everything is done updating
		this.doEvent(PodcastStorage.PodcastListFinishUpdate);
	} else {
		// Otherwise more podcasts need to be processesed
		// Update the next podcast in the list
		this.listOfPodcasts[this.indexUpdating].updateFeed(this.onFeedUpdate.bind(this));
		// Let listeners know that update for the given podcast is starting
		this.doEvent(PodcastStorage.PodcastStartUpdate, podcast.key);
	}
};

PodcastStorage.prototype.addEventListener = function(event, listener) {
	try {
		this.callback[event].push(listener);
		// Remove duplicate callbacks
		this.callback[event] = this.callback[event].uniq(true);
		Mojo.Log.info("[PodcastStorage.addEventListener] %s has %i listener(s)", event, this.callback[event].size());
	} catch(error) {
		Mojo.Log.error("[PodcastStorage.addEventListener] %s", error.message);
	}
};

PodcastStorage.prototype.removeEventListener = function(event, listener) {
	this.callback[event].pop(listener);
	// Remove duplicate callbacks
	this.callback[event] = this.callback[event].uniq(true);
	Mojo.Log.info("[PodcastStorage.removeEventListener] %s has %i listener(s)", event, this.callback[event].size());
};

// Static properties of the PodcastStorage class
PodcastStorage.PodcastStartUpdate = 'onStartPodcastUpdate';
PodcastStorage.PodcastUpdateSuccess = 'onPodcastSuccess';
PodcastStorage.PodcastUpdateFailure = 'onPodcastFailure';

PodcastStorage.PodcastListStartUpdate = 'onStartPodcastListUpdate';
PodcastStorage.PodcastListFinishUpdate = 'onFinishPodcastListUpdate';

PodcastStorage.ConnectionToDatabase = 'onConnectionToDB';
PodcastStorage.FailedConnectionToDatabase = 'onFailedConnectionToDB';

PodcastStorage.SavingDatabaseSuccess = 'onDBSaveSuccess';
PodcastStorage.SavingDatabaseFailure = 'onDBSaveFailure';

PodcastStorage.LoadingDatabaseSuccess = 'onDBLoadSuccess';
PodcastStorage.LoadingDatabaseFailure = 'onDBLoadFailure';