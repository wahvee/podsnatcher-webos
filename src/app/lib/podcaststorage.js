var PodcastStorage = Class.create({
	db: {},
	testVar: "You can see the Test Variable.",
	onRead: {},
	initialize: function(name, onReadCallback) {
		var dbName = (name && Object.isString(name)) ? "ext:" + name : "ext:podSnatcherDb";
		this.onRead = (Object.isFunction(name)) ? name : onReadCallback;
		
		var onSuccess = function() {
			Mojo.Log.info("[PodCastStorage] Connection to database success.");
			this.getPodcasts();
		};
		
		// Create the database storage
		this.db = new Mojo.Depot({
			name: dbName,
			version: "1",
			displayName: "PodSnatcher Database",
			estimatedSize: 25000
		}, onSuccess.bind(this), this.onFailure);
	},
	getPodcasts: function() {
		var onSuccess = function(response) {
			var recordSize = (Object.isArray(response)) ? response.size() : Object.values(response).size();
			Mojo.Log.info("[PodcastStorage.getPodcasts] %i podcast(s) loaded.", recordSize);
			if(recordSize == 0) {// Database has nothing in it.
				this.populateInitialDB();
			} else {
				this.onRead();
			}
		};
		
		try {
			this.db.get("podcastList", onSuccess.bind(this), this.onFailure);
		} catch(error) {
			Mojo.Log.error("[PodcastStorage.getPodcasts] error! %s", error.message);
		}
	},
	getPodcast: function(md5Hash) {
		
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
		Mojo.Log.error("[PodSnatcher Database] Failed to open the database on disk. %s", error.message);
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
			{
				name: "The WDW Radio Show - Your Walt Disney World Information Station",
				key: hex_md5("http://www.wdwradio.com/xml/wdwradio.xml"),
				url: "http://www.wdwradio.com/xml/wdwradio.xml"
			},
			{
				name: "Diggnation (Large MP4)",
				key: hex_md5("http://revision3.com/diggnation/feed/MP4-Large"),
				url: "http://revision3.com/diggnation/feed/MP4-Large"
			},
			{
				name: "ESPN: PTI",
				key: hex_md5("http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595"),
				url: "http://sports.espn.go.com/espnradio/podcast/feeds/itunes/podCast?id=2406595"
			},
			{
				name: "Buzz Report (SD)",
				key: hex_md5("http://buzzreportpodcast.cnettv.com"),
				url: "http://buzzreportpodcast.cnettv.com"
			},
			{
				name: "Mailbag (SD)",
				key: hex_md5("http://mailbagpodcast.cnettv.com"),
				url: "http://mailbagpodcast.cnettv.com"
			}
		];
		
		// Perform the addition of the list in the initial app
		this.db.add("podcastList", initialList, onSuccess.bind(this), this.onFailure);
	}
});