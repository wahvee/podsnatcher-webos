var PodcastStorage = Class.create({
	db: {},
	listOfPodcasts: [],
	onRead: {},
	initialize: function(name) {
		var dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
		
		this.callback = {};
		this.callback[PodcastStorage.PodcastStartUpdate] = [];
		this.callback[PodcastStorage.PodcastUpdateSuccess] = [];
		this.callback[PodcastStorage.PodcastUpdateFailure] = [];
		this.callback[PodcastStorage.SavingDatabaseSuccess] = [];
		this.callback[PodcastStorage.SavingDatabaseFailure] = [];
		this.callback[PodcastStorage.LoadingDatabaseSuccess] = [];
		this.callback[PodcastStorage.LoadingDatabaseFailure] = [];
		
		// Wait for successful creation/connection from the db
		var onSuccess = function() {
			Mojo.Log.info("[PodCastStorage] Connection to database success.");
			this.getPodcasts();
		};
		
		// Connect/Create statement for the db
		this.db = new Mojo.Depot({
			//replace: true,
			name: dbName,
			version: "1",
			displayName: "PodSnatcher Database",
			estimatedSize: 25000
		}, onSuccess.bind(this), this.onFailure);
	},
	getPodcasts: function() {
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
					this.listOfPodcasts.push(item);
				}, this);
				this.doEvent(PodcastStorage.LoadingDatabaseSuccess);
			}
		};
		
		try {
			this.db.get("podcastList", onSuccess.bind(this), this.onFailure);
		} catch(error) {
			Mojo.Log.error("[PodcastStorage.getPodcasts] error! %s", error.message);
		}
	},
	updatePodcast: function() {
		
	},
	updatePodcasts: function() {
		this.listOfPodcasts.each(function(podcast, index) {
			// Update a given podcast
			this.updatePodcast(podcast.key);
		}, this);
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
	addEventListener: function(event, listener) {
		try {
			this.callback[event].push(listener);
			// Remove duplicate callbacks
			this.callback[event] = this.callback[event].uniq(true);
			Mojo.Log.info("[PodcastStorage.addEventListener] %s has %i listener(s)", event, this.callback[event].size());
		} catch(error) {
			Mojo.Log.error("[PodcastStorage.addEventListener] %s", error.message);
		}
	},
	removeEventListener: function(event, listener) {
		//TODO Implement this!
		this.callback[event].pop(listener);
		// Remove duplicate callbacks
		this.callback[event] = this.callback[event].uniq(true);
		Mojo.Log.info("[PodcastStorage.removeEventListener] %s has %i listener(s)", event, this.callback[event].size());
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
			this.getPodcasts();
		};
		
		var initialList = [
			new Podcast('http://www.wdwradio.com/xml/wdwradio.xml'),
			new Podcast('http://revision3.com/diggnation/feed/MP4-Large'),
			new Podcast('http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595'),
			new Podcast('http://buzzreportpodcast.cnettv.com'),
			new Podcast('http://mailbagpodcast.cnettv.com')
		];
		
		// Perform the addition of the list in the initial app
		this.db.add("podcastList", initialList, onSuccess.bind(this), this.onFailure);
	},
	savePodcasts: function() {
		var onSuccess = function() {
			Mojo.Log.info("[PodcastStorage.savePodcasts] Success.");	
		};
		
		this.db.add("podcastList", this.listOfPodcasts, onSuccess.bind(this), this.onFailure);
	}
});

PodcastStorage.PodcastStartUpdate = 'onStartPodcastUpdate';
PodcastStorage.PodcastUpdateSuccess = 'onPodcastSuccess';
PodcastStorage.PodcastUpdateFailure = 'onPodcastFailure';
PodcastStorage.SavingDatabaseSuccess = 'onDBSaveSuccess';
PodcastStorage.SavingDatabaseFailure = 'onDBSaveFailure';
PodcastStorage.LoadingDatabaseSuccess = 'onDBLoadSuccess';
PodcastStorage.LoadingDatabaseFailure = 'onDBLoadFailure';