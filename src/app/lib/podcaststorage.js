var PodcastStorage = Class.create({
	initialize: function(name) {
		this.dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
		this.requiresUpdate = false;
		
		this.podcastListStartUpdate = Mojo.Event.make(PodcastStorage.PodcastListStartUpdate, {}, Mojo.Controller.stageController.document);
		this.podcastListFinishUpdate = Mojo.Event.make(PodcastStorage.PodcastListFinishUpdate, {}, Mojo.Controller.stageController.document);
		
		this.connectToDatabaseEvent = Mojo.Event.make(PodcastStorage.ConnectionToDatabase, {message: this}, Mojo.Controller.stageController.document);
		this.failedConnectionToDatabaseEvent = Mojo.Event.make(PodcastStorage.FailedConnectionToDatabase, {error: undefined}, Mojo.Controller.stageController.document);
		
		this.savingDatabaseSuccess = Mojo.Event.make(PodcastStorage.SavingDatabaseSuccess, {}, Mojo.Controller.stageController.document);
		this.savingDatabaseFailure = Mojo.Event.make(PodcastStorage.SavingDatabaseFailure, {error: undefined}, Mojo.Controller.stageController.document);
		
		this.loadingDatabaseSuccess = Mojo.Event.make(PodcastStorage.LoadingDatabaseSuccess, {}, Mojo.Controller.stageController.document);
		this.loadingDatabaseFailure = Mojo.Event.make(PodcastStorage.LoadingDatabaseFailure, {error: undefined}, Mojo.Controller.stageController.document);
	},
	connectToDatabase: function() {
		// Wait for successful creation/connection from the db
		var onSuccess = function() {
			Mojo.Log.info("[PodcastStorage] Connection to database success.");
			// Perform the event PodcastStorage.ConnectionToDatabase
			Mojo.Controller.stageController.sendEventToCommanders(this.connectToDatabaseEvent);
		};
		
		// Wait for failure creation/connection from the db
		var onFailure = function(code) {
			var error = interpretCode(code);
			Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
			this.failedConnectionToDatabaseEvent.error = {};
			Object.extend(this.failedConnectionToDatabaseEvent.error, error);
			Mojo.Controller.stageController.sendEventToCommanders(this.failedConnectionToDatabaseEvent);
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
			this.loadingDatabaseFailure.error = {};
			Object.extend(this.loadingDatabaseFailure.error, error);
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
			Mojo.Log.error("[PodcastStorage.connectToDatabase] %s", error.message);
		}
	},
	loadDatabase: function() {
		// When the Mojo.Depot.get() method completes successfully
		var onSuccess = function(response) {
			// Return number of records found
			var recordSize = (Object.isArray(response)) ? response.size() : Object.values(response).size();
			Mojo.Log.info("[PodcastStorage.loadDatabase] %i podcast(s) loaded.", recordSize);
			if(recordSize === 0) { // Database has nothing in it.
				this.populateInitialDB();
			} else {
				response.each(function(podcastItem, index) {
					var item = new Podcast(podcastItem);
					if(item.isOutOfDate()) {
						this.requiresUpdate = true;
					} else {
						if(!item.isImageCached()) {
							item.cacheImage();
						}
					}
					this.listOfPodcasts.push(item);
				}, this);
				// Perform the event PodcastStorage.LoadingDatabaseSuccess
				Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseSuccess);
			}
		};
		
		// Wait for failure creation/connection from the db
		var onFailure = function(code) {
			var error = interpretCode(code);
			Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
			this.loadingDatabaseFailure.error = {};
			Object.extend(this.loadingDatabaseFailure.error, error);
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
		};
		
		try {
			this.db.get("podcastList", onSuccess.bind(this), onFailure.bind(this));
		} catch(error) {
			this.loadingDatabaseFailure.error = {};
			Object.extend(this.loadingDatabaseFailure.error, error);
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
			Mojo.Log.error("[PodcastStorage.loadDatabase] error! %s", error.message);
		}
	},
	getPodcastList: function() {
		var temp = [];
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
	onFailure: function(code) {
		var error = interpretCode(code);
		Mojo.Log.error("[PodcastStorage] Failed to open the database on disk. %s", error.message);
	},
	populateInitialDB: function() {
		//http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595
		//http://www.wdwradio.com/xml/wdwradio.xml
		//http://revision3.com/diggnation/feed/MP4-Large
		//http://buzzreportpodcast.cnettv.com
		
		var onSuccess = function() {
			this.loadDatabase();
		};
		
		var initialList = [
			new Podcast('http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595'),
			new Podcast('http://www.wdwradio.com/xml/wdwradio.xml'),
			new Podcast('http://revision3.com/diggnation/feed/MP4-Large'),
			new Podcast('http://feeds.feedburner.com/cnet/buzzreport?format=xml')
		];
		
		var tempArr = [];
		initialList.each(function(podcastItem, index) {
			if(podcastItem instanceof Podcast) {
				tempArr.push(podcastItem.simpleObject());
			}
		});
		
		// Perform the addition of the list in the initial app
		this.db.add("podcastList", tempArr, onSuccess.bind(this), this.onFailure);
	},
	save: function() {
		var onSuccess = function() {
			Mojo.Log.info("[PodcastStorage.savePodcasts] Success.");
			// Event to let it be known that the database was saved
			Mojo.Controller.stageController.sendEventToCommanders(this.savingDatabaseSuccess);
		};
		
		var onFailure = function(code) {
			Mojo.Log.info("[PodcastStorage.savePodcasts] Failed.");
			this.savingDatabaseFailure.error = {};
			Object.extend(this.savingDatabaseFailure.error, this.interpretCode(code));
			Mojo.Controller.stageController.sendEventToCommanders(this.savingDatabaseFailure);
		};
		
		var tempArr = [];
		this.listOfPodcasts.each(function(podcastItem, index) {
			if(podcastItem instanceof Podcast) {
				tempArr.push(podcastItem.simpleObject());
			}
		});
		this.db.add("podcastList", tempArr, onSuccess.bind(this), this.onFailure.bind(this));
	}
});

// Properites of each instance of PodcastStorage
PodcastStorage.prototype._currentPodcast = 0;
PodcastStorage.prototype.indexUpdating = 0;
PodcastStorage.prototype.updatingAll = false;
PodcastStorage.prototype.db = {};
PodcastStorage.prototype.listOfPodcasts = [];
PodcastStorage.prototype.callback = {};
PodcastStorage.prototype.stageController = undefined;

PodcastStorage.prototype.currentPodcast = function() {
	return this.listOfPodcasts[this._currentPodcast];
};

PodcastStorage.prototype.nextPodcast = function() {
	this._currentPodcast++;
	if(this._currentPodcast >= this.listOfPodcasts.size()) {
		this._currentPodcast = 0;
	}
	return this.currentPodcast();
};

PodcastStorage.prototype.previousPodcast = function() {
	this._currentPodcast--;
	if(this._currentPodcast < 0) {
		this._currentPodcast = this.listOfPodcasts.size() - 1;
	}
	return this.currentPodcast();
};

/**
 * Tells the Podcast at the array index of _currentPodcast
 * that it needs to update it's feed.
 */
PodcastStorage.prototype.updateCurrent = function() {
	this.listOfPodcasts[this._currentPodcast].updateFeed();
};

PodcastStorage.prototype.updatePodcasts = function() {
	try {
		// Reset the index that is currently updating
		this.indexUpdating = 0;
		// Set that we are updating all the podcasts
		this.updatingAll = true;
		// Let listeners know that the podcast list has begun updating
		Mojo.Controller.stageController.sendEventToCommanders(this.podcastListStartUpdate);
		// Update the first podcast in the list
		this.listOfPodcasts[this.indexUpdating].updateFeed();
	} catch (error) {
		Mojo.Log.error("[PodcastStorage.updatePodcasts] %s", error.message);
	}
};

PodcastStorage.prototype.handleCommand = function(command) {
	var podcastKey = undefined;
	if(command.podcast) {
		podcastKey = command.podcast.key;
	}
	switch(command.type) {
		case Podcast.PodcastStartUpdate:
			Mojo.Log.info("[PodcastStorage.podcastUpdating] %s starting update.", podcastKey);
			break;
		case Podcast.PodcastUpdateFailure:
		case Podcast.PodcastUpdateSuccess:
			Mojo.Log.info("[PodcastStorage.%s] %s finished updating.", command.type, command.podcast.title);
			// Check to see if this is just one podcast updating or one in a series
			if(this.updatingAll) {
				// Increment the podcast number that is currently updating
				this.indexUpdating++;
				// Check to see if more podcasts need to be updated
				if(this.indexUpdating == this.listOfPodcasts.size()) {
					// Not updating all anymore
					this.updatingAll = false;
					// Save the database since updates are done
					this.save();
					// If they are equal everything is done updating
					Mojo.Controller.stageController.sendEventToCommanders(this.podcastListFinishUpdate);
				} else {
					// Otherwise more podcasts need to be processesed
					// Update the next podcast in the list
					this.listOfPodcasts[this.indexUpdating].updateFeed();
				}
			} else {
				this.save();
			}
			break;
		case Podcast.ImageCached:
			if(!this.updatingAll) {
				Mojo.Log.info("[PodcastStorage.ImageCached] Saving.");
				this.save();
			}
			break;
		case PFeedItem.EnclosureCached:
			Mojo.Log.info("[PodcastStorage.EnclosureCached] Saving.");
			this.save();
			break;
		case PFeedItem.EnclosureDeleted:
			Mojo.Log.info("[PodcastStorage.EnclosureDeleted] Saving.");
			this.save();
			break;
		default:
			Mojo.Log.info("[PodcastStorage.handleCommand] Not handling %s", command.type);
			break;
	}
};

PodcastStorage.PodcastListStartUpdate = 'onStartPodcastListUpdate';
PodcastStorage.PodcastListFinishUpdate = 'onFinishPodcastListUpdate';

PodcastStorage.ConnectionToDatabase = 'onConnectionToDB';
PodcastStorage.FailedConnectionToDatabase = 'onFailedConnectionToDB';

PodcastStorage.SavingDatabaseSuccess = 'onDBSaveSuccess';
PodcastStorage.SavingDatabaseFailure = 'onDBSaveFailure';

PodcastStorage.LoadingDatabaseSuccess = 'onDBLoadSuccess';
PodcastStorage.LoadingDatabaseFailure = 'onDBLoadFailure';