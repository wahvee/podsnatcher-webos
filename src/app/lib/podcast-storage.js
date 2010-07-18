/**
 * Manages getting data into and out of the HTML5 database.
 */
function PodcastStorage(name) {
	this._currentPodcast = 0;
	this.updatingAll = false;
	this.db = undefined;
	this.updateAlbumArt = false;
	this.addingNewPodcast = false;

	this.listOfPodcasts = [];

	// SQL to store the podcast into podcast table
	this.sqlPodcast = "INSERT OR REPLACE INTO podcasts\
			   (key, type, version, title, usrTitle, author, description, category, language, copyright, url, imgURL, imgPath, imgTicket) \
			   values (?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

	// SQL to store the podcast item into the podcast_item table
	this.sqlPodcastItem = "INSERT OR REPLACE INTO podcast_item\
				  (key, podcastKey, id, link, title, description, published, author, enclosure, enclosurePath, enclosureTicket, enclosureType, enclosureLength, listened, currentTime) \
				  values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

	// SQL to delete the podcast from podcast table
	this.sqlDeletePodcast = "DELETE FROM podcasts WHERE key = ?;";

	// SQL to delete the podcast from the podcast_item table
	this.sqlDeletePodcastItem = "DELETE FROM podcast_item WHERE podcastKey = ?;";

	this.dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
	this.requiresUpdate = false;

	// When updating all podcasts, call these events at the begining and end
	this.podcastListStartUpdate = Mojo.Event.make(PodcastStorage.PodcastListStartUpdate, {});
	this.podcastListFinishUpdate = Mojo.Event.make(PodcastStorage.PodcastListFinishUpdate, {});

	// Called when trying to load info from the database
	this.loadingDatabaseSuccess = Mojo.Event.make(PodcastStorage.LoadingDatabaseSuccess, {});
	this.loadingDatabaseFailure = Mojo.Event.make(PodcastStorage.LoadingDatabaseFailure, {error: {}});

	// Events to be called when saving
	this.saveAllSuccess = Mojo.Event.make(PodcastStorage.SaveAllSuccess, {});
	this.savePodcastSuccess = Mojo.Event.make(PodcastStorage.SavePodcastSuccess, {podcast: undefined});
	this.savePodcastItemSuccess = Mojo.Event.make(PodcastStorage.SavePodcastItemSuccess, {item: undefined});
	this.saveFailure = Mojo.Event.make(PodcastStorage.SavingDatabaseFailure, {error: {}});

	// Events to be called when deleting
	this.deletePodcastSuccess = Mojo.Event.make(PodcastStorage.DeletePodcastSuccess, {podcast: undefined});
	this.deletePodcastFailure = Mojo.Event.make(PodcastStorage.DeletePodcastFailure, {error: {}});
};

/**
 * Connects to the database. Returns nothing, meant to be called asynchronously.
 * Calls events based on results from db.
 * @see Migrator.StartMigration
 * @see Migrator.Migration
 * @see Migrator.MigrationError
 * @see Migrator.FinishMigration
 */
PodcastStorage.prototype.connectToDatabase = function() {
	try {
		// Connect/Create statement for the db
		this.db = openDatabase(
			   this.dbName,
			   "",
			   "PodSnatcher Database",
			   1048576
		);

		Mojo.Log.info("Loaded database version: %s", this.db.version || 0);
		// Create an instance of Migrator, this is used to update
		// the database versions, and keep track of schema changes
		var M = new Migrator(this.db);
		// Setup the schemas for database migration
		M.migration(1, Schema.schema1);
		M.migration(2, Schema.schema2);
		// Actually, perform the database migrations
		M.doIt();
	} catch(error) {
		if(error == 2) {
			error = {
				code: error,
				message: $L("Invalid database version")
			};
		}
		// Get the error message into the event
		this.failedConnectionToDatabaseEvent.error = {};
		Object.extend(this.failedConnectionToDatabaseEvent.error, error);
		// Send the events
		Mojo.Controller.stageController.sendEventToCommanders(this.failedConnectionToDatabaseEvent);
		Mojo.Log.error("[PodcastStorage.connectToDatabase] %s", error.message);
	}
}

/**
 * Loads the information from the database into memory for the user to interact
 * with. This is when the Podcast object starts to be populated.
 */
PodcastStorage.prototype.loadDatabase = function() {
	// When the HTML5 podcast SELECT statement from
	// table podcast_item completes successfully
	var onPodcastItemLoad = function(lastOne, tx, response) {
		// If this podcast has items
		if(response.rows.length > 0) {
			// Items found this db is not out-of-date
			var podcastToUpdate = this.getPodcast(response.rows.item(0).podcastKey);
			Mojo.Log.info("[PodcastStorage.loadDatabase] %s has %i items.", podcastToUpdate.getTitle(), response.rows.length);
			// Put everything into the podcast object they belong to
			for(var i = 0; i < response.rows.length; i++) {
				podcastToUpdate.addItem(response.rows.item(i));
			}
		} else {
			// No items for this podcast, it needs to be
			this.requiresUpdate = true;
		}
		// Check to see if this is the last podcast
		if(lastOne) {
			// Perform the event PodcastStorage.LoadingDatabaseSuccess
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseSuccess);
		}
	};

	// When the HTML5 podcast SELECT statement completes successfully
	var onPodcastLoad = function(tx, response) {
		// Return number of records found
		Mojo.Log.info("[PodcastStorage.loadDatabase] %i podcast(s) loaded.", response.rows.length);
		// Loop through all of the rows returned
		for(var i = 0; i < response.rows.length; i++) {
			// Create a podcast item in memory from db object
			var item = new Podcast(response.rows.item(i));
			// Add item to the array of podcasts
			this.listOfPodcasts.push(item);
			// Now we need to load the items for this from the database
			tx.executeSql("SELECT * FROM podcast_item WHERE podcast_item.podcastKey = ?",
				[item.key],
				onPodcastItemLoad.bind(this, i === (response.rows.length - 1)),
				onFailure
			);
		}

		// If no podcasts were created,
		if(response.rows.length === 0) {
			// Perform the event PodcastStorage.LoadingDatabaseSuccess
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseSuccess);
		}
	}.bind(this);

	// Wait for failure creation/connection from the db
	var onFailure = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage.loadDatabase] Oops. (%i) %s", error.code, error.message);
		this.loadingDatabaseFailure.error = {};
		Object.extend(this.loadingDatabaseFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
	}.bind(this);

	try {
		// Load the podcasts from the database
		this.db.transaction(
			function(tx) {
				// Get all the podcasts from the database
				tx.executeSql("SELECT * FROM podcasts;", [], onPodcastLoad, onFailure);
			}
		);
	} catch(error) {
		this.loadingDatabaseFailure.error = {};
		Object.extend(this.loadingDatabaseFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
		Mojo.Log.error("[PodcastStorage.loadDatabase] error! %s", error.message);
	}
};

/**
 * Populates the database with all of the initial podcasts.
 */
PodcastStorage.prototype.populateInitialDB = function() {
	//http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595
	//http://www.wdwradio.com/xml/wdwradio.xml
	//http://revision3.com/diggnation/feed/MP4-Large
	//http://buzzreportpodcast.cnettv.com
	var onFailure = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage.populateInitialDB] (%i) Oops. Error was %s", error.code, error.message);
		Object.extend(this.saveFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.saveFailure);
	}.bind(this);

	var updateFinished = function(tx, response) {
		Mojo.Log.info("[PodcastStorage.populateInitialDB] Database has been populated.");
	}.bind(this);

	var sqlArr = [
		[
			hex_md5("http://feeds.feedburner.com/WORPodcasts/"),
			"http://feeds.feedburner.com/WORPodcasts/",
			"webOSRadio"
		],
		[
			hex_md5("http://www.wdwradio.com/xml/wdwradio.xml"),
			"http://www.wdwradio.com/xml/wdwradio.xml",
			"WDW Radio Show"
		],
		[
			hex_md5("http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595"),
			"http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595",
			"ESPN: PTI"
		],
		[
			hex_md5("http://revision3.com/diggnation/feed/MP4-Large"),
			"http://revision3.com/diggnation/feed/MP4-Large",
			"Diggnation"
		],
		[
			hex_md5("http://buzzreportpodcast.cnettv.com"),
			"http://buzzreportpodcast.cnettv.com",
			"Buzz Report"
		]
	];

	// Perform the addition of the list in the initial app
	this.db.transaction(
		function(tx) {
			sqlArr.each(function(params, index) {
				tx.executeSql("INSERT INTO podcasts (key, url, title) VALUES (?, ?, ?);", params, (sqlArr.size() - 1 === index) ? updateFinished : null, onFailure);
			});
		}
	)
};

/**
 * Returns the podcast currently being displayed on the screen.
 * Handles, looping around to the next podcast in the database.
 * @returns {Podcast} Instance of Podcast currently on the screen.
 */
PodcastStorage.prototype.currentPodcast = function() {
	return this.listOfPodcasts[this._currentPodcast];
};

/**
 * Moves to the next podcast in the db to be displayed on the screen.
 * Returns the instance of the new podcast on the screen.
 * @returns {Podcast} Instance of Podcast to be displayed next.
 */
PodcastStorage.prototype.nextPodcast = function() {
	this._currentPodcast++;
	if(this._currentPodcast >= this.listOfPodcasts.size()) {
		this._currentPodcast = 0;
	}
	return this.currentPodcast();
};

/**
 * Moves to the previous podcast in the db. Handles, looping
 * around to the next podcast in the database.
 * Returns the instance of the new podcast on the screen.
 * @returns {Podcast} Instance of the new podcast on the screen.
 */
PodcastStorage.prototype.previousPodcast = function() {
	this._currentPodcast--;
	if(this._currentPodcast < 0) {
		this._currentPodcast = this.listOfPodcasts.size() - 1;
	}
	return this.currentPodcast();
};

/**
 * Detects if a Podcast is already in the database.
 */
PodcastStorage.prototype.podcastExists = function(key) {
	return !Object.isUndefined(this.getPodcast(key));
};

/**
 * @private
 * Find a podcast by it's unique id (key). Returns
 * the instance of the podcast. Undefined if not found.
 * @returns {Podcast | Undefined} Instance of Podcast that matches key.
 */
PodcastStorage.prototype.getPodcast = function(key) {
	return this.listOfPodcasts.detect(function(podcast, index) {
		return podcast.key === key;
	});
};

/**
 * Gets an array of all the podcasts loaded in memory. This list will
 * not be instances of of the Podcast object. They will just be shallow
 * copies that contain "descriptive" data such as: title, description,
 * image and key.
 * @returns An shallow copy array of the podcasts.
 */
PodcastStorage.prototype.getPodcasts = function() {
	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.listOfPodcasts.each(function(item, index) {
		var image = item.getImage();
		arr.push({
			key: item.key,
			title: item.getTitle(),
			description: item.description,
			image: (!image.blank()) ? image : './images/default-album-art-42-42.png'
		});
	});
	return arr;
}

/**
 *@private
 * Deletes an entire podcast from the database. This will permenantly erase
 * all data and will not be recoverable.
 * @param key {string} The key of the podcast to be deleted.
 */
PodcastStorage.prototype._deletePodcast = function(key) {
	// Get the podcast instance to be deleted
	var podcast = this.getPodcast(key);

	var onSuccess = function(tx, response) {
		// Event to let it be known that the podcast was deleted
		this.deletePodcastSuccess.podcast = podcast;
		Mojo.Controller.stageController.sendEventToCommanders(this.deletePodcastSuccess);
	}.bind(this);

	var onFailure = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage._deletePodcast] (%i) Oops. Error was %s", error.code, error.message);
		Object.extend(this.deletePodcastFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.deletePodcastFailure);
	}.bind(this);

	// Actually perform the deletion from the database
	this.db.transaction(
		function(tx) {
			tx.executeSql(
				this.sqlDeletePodcast,
				[
					podcast.key
				],
				null,
				onFailure
			);

			tx.executeSql(
				this.sqlDeletePodcastItem,
				[
					podcast.key
				],
				onSuccess,
				onFailure
			);
		}.bind(this)
	);
};

/**
 * Saves all the podcasts to the database.
 */
PodcastStorage.prototype.saveAllPodcasts = function() {
	this.listOfPodcasts.each(function(podcast, index) {
		// Tell the function to trigger the PodcastStorage.SaveAllSuccess event
		this.savePodcast(podcast.key, this.listOfPodcasts.size() - 1 === index);
	}, this);
};

/**
 * Save entire podcast to the database. Overwrites, any data that existed
 * in the database, if not new data is added to the database automatically.
 * @param key {String} The key of the podcast to be stored in the database.
 */
PodcastStorage.prototype.savePodcast = function(key, triggerSaveAll, saveOnlyPodcast) {
	if(Object.isUndefined(saveOnlyPodcast) || !Object.isBoolean(saveOnlyPodcast)) {
		saveOnlyPodcast = false;
	}

	// If triggerSaveAll is undefined or not a boolean
	if(Object.isUndefined(triggerSaveAll) || !Object.isBoolean(triggerSaveAll)) {
		triggerSaveAll = false;
	}

	// Get the podcast instance to be saved
	var podcast = this.getPodcast(key);

	var onSuccess = function(tx, response) {
		// Event to let it be known that the database was saved
		this.savePodcastSuccess.podcast = podcast;
		Mojo.Controller.stageController.sendEventToCommanders(this.savePodcastSuccess);

		// If true, send event of PodcastStorage.SaveAllSuccess
		if(triggerSaveAll) {
			Mojo.Controller.stageController.sendEventToCommanders(this.saveAllSuccess);
		}
	}.bind(this);

	var onFailure = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage.savePodcast] (%i) Oops. Error was %s", error.code, error.message);
		Object.extend(this.saveFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.saveFailure);
	}.bind(this);

	this.db.transaction(
		function(tx) {
			tx.executeSql(
				this.sqlPodcast,
				[
					podcast.key,
					podcast.type,
					podcast.version,
					podcast.title,
					podcast.usrTitle,
					podcast.author,
					podcast.description,
					podcast.category,
					podcast.language,
					podcast.copyright,
					podcast.url,
					podcast.imgURL,
					podcast.imgPath,
					podcast.imgTicket
				],
				(saveOnlyPodcast) ? onSuccess : null,
				onFailure
			);
			// Perform an update for each item in the podcast
			if(!saveOnlyPodcast) {
				var values = podcast.items.values();
				values.each(function(item, index) {
					tx.executeSql(
						this.sqlPodcastItem,
						[
							item.key,
							podcast.key,
							item.id,
							item.link,
							item.title,
							item.description,
							item.published.toUTCString(),
							item.author,
							item.enclosure,
							item.enclosurePath,
							item.enclosureTicket,
							item.enclosureType,
							item.enclosureLength,
							item.listened,
							item.currentTime
						],
						(this.listOfPodcasts.size() - 1 == index) ? onSuccess : null,
						onFailure
					);
				}, this);
			}
		}.bind(this)
	);
};

/**
 * Function takes in a URL and then tries to add it to the user's database.
 * Checks to make sure the URL does not already exist in the database, and that the url
 * parameter is indeed a URL. Additionally, only one podcast at a time may be updated,
 * so if it is currently adding a new podcast it will do nothing and return undefined.
 * @param url {string} The URL to the podcast feed.
 * @param title {stirng} Optional value that will over-ride whatever the title is from the feed.
 * @param autoDelete {boolean} Delete the cached object once completed playing.
 * @param numToKeepCached {Number} The number of cached items to keep on hand.
 * @returns The Hash of the Podcast to be added, undefined if nothing will be added.
 */
PodcastStorage.prototype.addNewPodcast = function(url, title, autoDelete, numToKeepCached) {
	var hash = hex_md5(url);

	if(!this.podcastExists(hash) && url.isUrl() && !this.addingNewPodcast) {
		// Since we are adding a new podcast set the state
		this.addingNewPodcast = true;
		// Create a new Podcast object
		var newLength = this.listOfPodcasts.push(new Podcast(url, title));
		// Set the newly created podcast as the currently selected podcast
		this._currentPodcast = newLength - 1;
		// Update this podcast
		this.updateCurrent();
		//Return the key of the newly created item
		return hash;
	} else {
		return undefined;
	}

};

/**
 * Deletes a podcast from the db. Clears all cached information
 * as well.
 */
PodcastStorage.prototype.deletePodcast = function(key) {
	try {
		// Get the podcast to be deleted
		var podcastToDelete = this.getPodcast(key);
		// Check if podcast found
		if(podcastToDelete) {
			// Get the index of the podcast to be deleted
			var podcastIndex = this.listOfPodcasts.indexOf(podcastToDelete);
			// Tell it to delete all of it's cached information
			podcastToDelete.clearAllCached();
			// Save the db
			this._deletePodcast(key);
			// Delete that object from the array
			this.listOfPodcasts.splice(podcastIndex, 1);
		}
	} catch(error) {
		Mojo.Log.error("[PodcastStorage.deletePodcast] %s", error.message);
	}
}

/**
 * Tells the Podcast at the array index of _currentPodcast
 * that it needs to update it's feed.
 */
PodcastStorage.prototype.updateCurrent = function() {
	this.listOfPodcasts[this._currentPodcast].updateFeed();
};

/**
 * Update all the podcasts in the database.
 */
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

PodcastStorage.prototype.flagAlbumArt = function() {
	this.updateAlbumArt = true;
}

/**
 * Gets the podcast that has the item that matches the referenced key.
 * If the item is found, it returns the instance of the podcast.
 * @param key {string} Unique key of the podcast item to find.
 * @returns {PFeedItem} Instance of Podcast that has an item matching the key.
 */
PodcastStorage.prototype.podcastContainingItem = function(key) {
	return this.listOfPodcasts.detect(function(podcast, index) {
		return podcast.getItem(key) !== undefined;
	});
};

/**
 * Gets a podcast item by key. Looks in all Podcasts
 * for that item, returns it if found. Undefined if not
 * found.
 * @param key {string} Unique key of the podcast item to find.
 * @returns {PFeedItem} Instance of PFeedItem that matches key.
 */
PodcastStorage.prototype.getItem = function(key) {
	var pfeeditem;
	this.listOfPodcasts.detect(function(podcast, index) {
		pfeeditem = podcast.getItem(key);
		return pfeeditem !== undefined;
	});
	return pfeeditem;
};

/**
 * Saves a specific podcast item to the database.
 * @param key {string} Unique key of the podcast item to save.
 */
PodcastStorage.prototype.savePodcastItem = function(key) {
	// Get the item to be saved
	var item = this.getItem(key);

	/**
	 * Callback when the item was not updated in the database.
	 */
	var onFailure = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage.savePodcastItem] (%i) Oops. Error was %s", error.code, error.message);
		Object.extend(this.saveFailure.error, error);
		Mojo.Controller.stageController.sendEventToCommanders(this.saveFailure);
	}.bind(this);

	/**
	 * Callback when the item has been updated in the database.
	 */
	var onSuccess = function(tx, response) {
		this.savePodcastItemSuccess.item = item;
		Mojo.Controller.stageController.sendEventToCommanders(this.savePodcastItemSuccess);
	}.bind(this);

	// See if the item actually exists
	if(item) {
		// Get the podcast that owns the item to be saved
		var podcast = this.podcastContainingItem(key);
		// Perform the database save
		this.db.transaction(
			function(tx) {
				tx.executeSql(
					this.sqlPodcastItem,
					[
						item.key,
						podcast.key,
						item.id,
						item.link,
						item.title,
						item.description,
						item.published.toUTCString(),
						item.author,
						item.enclosure,
						item.enclosurePath,
						item.enclosureTicket,
						item.enclosureType,
						item.enclosureLength,
						item.listened,
						item.currentTime
					],
					onSuccess,
					onFailure
				);
			}.bind(this)
		)
	}
};

/**
 * Event listener for all events.
 * @private
 */
PodcastStorage.prototype.handleCommand = function(command) {
	var podcastKey = undefined;
	if(command.podcast) {
		podcastKey = command.podcast.key;
	} else if(command.key) {
		podcastKey = command.key;
	}
	switch(command.type) {
		case Migrator.Migration:
			// Check if the database is being created for the first time
			if(command.version === 1) {
				Mojo.Log.info("[PodcastStorage.Migration] I'm going to populate the initial values.");
				// If it is, then lets populate the initial values
				this.populateInitialDB();
			}
			break;
		case Podcast.PodcastStartUpdate:
			Mojo.Log.info("[PodcastStorage.podcastUpdating] %s starting update.", podcastKey);
			break;
		case Podcast.PodcastUpdateFailure:
			if(this.addingNewPodcast) {
				this.addingNewPodcast = false;
				this.deletePodcast(podcastKey);
			}
			break;
		case Podcast.PodcastUpdateSuccess:
			Mojo.Log.info("[PodcastStorage.%s] %s finished updating.", command.type, command.podcast.getTitle());
			// We finished updating the podcast we just added
			this.addingNewPodcast = false;
			// Check to see if this is just one podcast updating or one in a series
			if(this.updateAlbumArt) {
				this.listOfPodcasts[this.indexUpdating].clearCachedImage();
				this.listOfPodcasts[this.indexUpdating].cacheImage();
			}
			if(this.updatingAll) {
				// Increment the podcast number that is currently updating
				this.indexUpdating++;
				// Check to see if more podcasts need to be updated
				if(this.indexUpdating == this.listOfPodcasts.size()) {
					// Not updating all anymore
					this.updatingAll = false;
					// Requires update is now false
					this.requiresUpdate = false;
					// Save the database since updates are done
					this.saveAllPodcasts();
					// Clear flagged album art
					this.updateAlbumArt = false;
					// If they are equal everything is done updating
					Mojo.Controller.stageController.sendEventToCommanders(this.podcastListFinishUpdate);
				} else {
					// Otherwise more podcasts need to be processesed
					// Update the next podcast in the list
					this.listOfPodcasts[this.indexUpdating].updateFeed();
				}
			} else {
				// This is a single update, so it's done save it to the databse
				this.savePodcast(podcastKey);
			}
			break;
		case Podcast.ImageCached:
			// Save the podcast to the database
			this.savePodcast(podcastKey);
			break;
		case PFeedItem.PodcastItemUpdated:
		case PFeedItem.EnclosureCached:
		case PFeedItem.EnclosureDeleted:
		case Podcast.PodcastItemDeleted:
			this.savePodcastItem(podcastKey);
			break;
		default:
			Mojo.Log.info("[PodcastStorage.handleCommand] Not handling %s", command.type);
			break;
	}
};

/**
 * This event should be called, if the db is being created
 * for the first time.
 */
PodcastStorage.PodcastListStartUpdate = 'onStartPodcastListUpdate';
PodcastStorage.PodcastListFinishUpdate = 'onFinishPodcastListUpdate';

PodcastStorage.SaveAllSuccess = 'onDBSaveSuccess';
PodcastStorage.SavePodcastSuccess = 'onSavePodcastSuccess';
PodcastStorage.SavePodcastItemSuccess = 'onSavePodcastItemSuccess';
PodcastStorage.SavingDatabaseFailure = 'onDBSaveFailure';

PodcastStorage.DeletePodcastSuccess = 'onDBDeletePodcastSuccess';
PodcastStorage.DeletePodcastFailure = 'onDBDeletePodcastFailure';

PodcastStorage.LoadingDatabaseSuccess = 'onDBLoadSuccess';
PodcastStorage.LoadingDatabaseFailure = 'onDBLoadFailure';
