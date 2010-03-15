/**
 * Manages getting data into and out of the HTML5 database.
 */
function PodcastStorage(name) {
	this._currentPodcast = 0;
	this.updatingAll = false;
	this.db = undefined;
	this.isFirstRun = false;

	this.listOfPodcasts = [];

	// SQL to store the podcast into podcast table
	this.sqlPodcast = "INSERT OR REPLACE INTO podcasts\
			   (key, type, version, title, author, description, category, language, copyright, url, imgURL, imgPath, imgTicket) \
			   values (?,?,?,?,?,?,?,?,?,?,?,?,?);";

	// SQL to store the podcast item into the podcast_item table
	this.sqlPodcastItem = "INSERT OR REPLACE INTO podcast_item\
				  (key, podcastKey, id, link, title, description, published, updated, author, enclosure, enclosurePath, enclosureTicket, enclosureType, enclosureLength, listened, currPosition) \
				  values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

	this.dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
	this.requiresUpdate = false;

	// When updating all podcasts, call these events at the begining and end
	this.podcastListStartUpdate = Mojo.Event.make(PodcastStorage.PodcastListStartUpdate, {}, Mojo.Controller.stageController.document);
	this.podcastListFinishUpdate = Mojo.Event.make(PodcastStorage.PodcastListFinishUpdate, {}, Mojo.Controller.stageController.document);

	// Called when trying to connect to the database
	this.connectToDatabaseEvent = Mojo.Event.make(PodcastStorage.ConnectionToDatabase, {}, Mojo.Controller.stageController.document);
	this.failedConnectionToDatabaseEvent = Mojo.Event.make(PodcastStorage.FailedConnectionToDatabase, {error: undefined}, Mojo.Controller.stageController.document);

	// Event called when program loaded for first time
	this.firstRunEvent = Mojo.Event.make(PodcastStorage.FirstRun, {}, Mojo.Controller.stageController.document);

	// Called when trying to load info from the database
	this.loadingDatabaseSuccess = Mojo.Event.make(PodcastStorage.LoadingDatabaseSuccess, {}, Mojo.Controller.stageController.document);
	this.loadingDatabaseFailure = Mojo.Event.make(PodcastStorage.LoadingDatabaseFailure, {error: undefined}, Mojo.Controller.stageController.document);

	// Events to be called when saving
	this.saveAllSuccess = Mojo.Event.make(PodcastStorage.SaveAllSuccess, {}, Mojo.Controller.stageController.document);
	this.savePodcastSuccess = Mojo.Event.make(PodcastStorage.SavePodcastSuccess, {podcast: undefined}, Mojo.Controller.stageController.document);
	this.savePodcastItemSuccess = Mojo.Event.make(PodcastStorage.SavePodcastItemSuccess, {item: undefined}, Mojo.Controller.stageController.document);
	this.saveFailure = Mojo.Event.make(PodcastStorage.SaveFailure, {error: undefined}, Mojo.Controller.stageController.document);
};

/**
 * Connects to the database. Returns nothing, meant to be called asynchronously.
 * Calls events based on results from db.
 * @see PodcastStorage#FirstRun
 * @see PodcastStorage#ConnectionToDatabase
 * @see PodcastStorage#FailedConnectionToDatabase
 */
PodcastStorage.prototype.connectToDatabase = function() {
	try {
		// Connect/Create statement for the db
		this.db = openDatabase(
			   this.dbName,
			   "1",
			   "PodSnatcher Database",
			   1048576
		);

		// Create the tables, if needed; event will trigger if first run
		this.db.transaction(this.createTables.bind(this));
	} catch(error) {
		if(error == 2) {
			error = {
				code: error,
				message: "Invalid database version"
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

PodcastStorage.prototype.loadDatabase = function() {
	// When the HTML5 podcast SELECT statement from
	// table podcast_item completes successfully
	var onPodcastItemLoad = function(lastOne, tx, response) {
		// If this podcast has items
		if(response.rows.length > 0) {
			// Items found this db is not out-of-date
			var podcastToUpdate = this.getPodcast(response.rows.item(0).podcastKey);
			Mojo.Log.info("[PodcastStorage.loadDatabase] %s has %i items.", podcastToUpdate.title, response.rows.length);
			// Put everything into the podcast object they belong to
			for(var i = 0; i < response.rows.length; i++) {
				podcastToUpdate.addItem(response.rows.item(i));
			}
		} else {
			// No items for this podcast, it needs to be updated
			this.requiresUpdate = true;
		}
		// Check to see if this is the last podcast updated
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
			this.loadingDatabaseFailure.error = {
				code: 99,
				message: "There are no podcasts in the database."
			}
			Mojo.Controller.stageController.sendEventToCommanders(this.loadingDatabaseFailure);
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
		Mojo.Controller.stageController.sendEventToCommanders(this.connectToDatabaseEvent);
	}.bind(this);

	var sqlArr = [
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
							item.updated.toUTCString(),
							item.author,
							item.enclosure,
							item.enclosurePath,
							item.enclosureTicket,
							item.enclosureType,
							item.enclosureLength,
							item.listened,
							item.currPosition
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
			// Delete that object from the array
			this.listOfPodcasts.splice(podcastIndex, 1);
			// Save the db
			// TODO: Implement delete from database
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
						item.updated.toUTCString(),
						item.author,
						item.enclosure,
						item.enclosurePath,
						item.enclosureTicket,
						item.enclosureType,
						item.enclosureLength,
						item.listened,
						item.currPosition
					],
					onSuccess,
					onFailure
				);
			}.bind(this)
		)
	}
};

/**
 * @private
 * Creates the SQL tables that will be used to store data.
 */
PodcastStorage.prototype.createTables = function(tx) {
	var errorHandler = function(tx, error) {
		// error.message is a human-readable string
		// error.code is a numeric error code
		Mojo.Log.error("[PodcastStorage.createTables] (%i) Oops. Error was %s", error.code, error.message);
	}.bind(this);

	var dataHandler = function(tx, results) {
		// Check to see if the DB is being created
		// for the first time.
		this.isFirstRun = (results.rowsAffected > 0);
		if(this.isFirstRun) {
			Mojo.Log.info("[PodcastStorage.createTables] Tables created.");
			// Send event that the database was created for the first time
			Mojo.Controller.stageController.sendEventToCommanders(this.firstRunEvent);
			// User didn't have data, cause we just made the tables
			this.populateInitialDB();
		} else {
			Mojo.Log.info("[PodcastStorage.createTables] Tables already existed.");
			// Since the tables already existed, it's assumed that the user had data
			// so the connection to the database is ready, it's now time to load
			// the user's data
			Mojo.Log.info("[PodcastStorage.createTables] Connection to database success.");
			Mojo.Controller.stageController.sendEventToCommanders(this.connectToDatabaseEvent);
		}
	}.bind(this);

	var podcastTable = "CREATE TABLE IF NOT EXISTS podcasts(\
		key VARCHAR(32) NOT NULL PRIMARY KEY,\
		type TEXT NOT NULL DEFAULT \"rss\",\
		version TEXT NOT NULL DEFAULT \"2.0\",\
		title TEXT NOT NULL,\
		author TEXT,\
		description TEXT,\
		category TEXT,\
		language TEXT NOT NULL DEFAULT \"en-us\",\
		copyright TEXT,\
		url TEXT NOT NULL,\
		imgURL TEXT,\
		imgPath TEXT,\
		imgTicket INTEGER NOT NULL DEFAULT 0\
	);"

	var podcastItems = "CREATE TABLE IF NOT EXISTS podcast_item(\
		key VARCHAR(32) NOT NULL PRIMARY KEY,\
		podcastKey VARCHAR(32) NOT NULL,\
		id TEXT,\
		link TEXT,\
		title TEXT,\
		description TEXT,\
		published TEXT,\
		updated TEXT,\
		author TEXT,\
		enclosure TEXT,\
		enclosurePath TEXT,\
		enclosureTicket INTEGER NOT NULL DEFAULT 0,\
		enclosureType TEXT,\
		enclosureLength INTEGER,\
		listened BOOLEAN NOT NULL DEFAULT false,\
		currPosition INTEGER NOT NULL DEFAULT 0\
	);"

	// Create the podcasts table
	tx.executeSql(podcastTable, [], null, errorHandler);
	// Create the podcast_item table
	tx.executeSql(podcastItems, [], dataHandler, errorHandler);
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
					this.saveAllPodcasts();
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
		case PFeedItem.EnclosureCached:
		case Podcast.PodcastItemDeleted:
		case PFeedItem.EnclosureDeleted:
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
PodcastStorage.FirstRun = 'onFirstRun';

PodcastStorage.PodcastListStartUpdate = 'onStartPodcastListUpdate';
PodcastStorage.PodcastListFinishUpdate = 'onFinishPodcastListUpdate';

PodcastStorage.ConnectionToDatabase = 'onConnectionToDB';
PodcastStorage.FailedConnectionToDatabase = 'onFailedConnectionToDB';

PodcastStorage.SaveAllSuccess = 'onDBSaveSuccess';
PodcastStorage.SavePodcastSuccess = 'onSavePodcastSuccess';
PodcastStorage.SavePodcastItemSuccess = 'onSavePodcastItemSuccess';
PodcastStorage.SavingDatabaseFailure = 'onDBSaveFailure';

PodcastStorage.LoadingDatabaseSuccess = 'onDBLoadSuccess';
PodcastStorage.LoadingDatabaseFailure = 'onDBLoadFailure';
