var PodcastStorage = Class.create({
	db: {},
	initialize: function(name) {
		var dbName = (name) ? "ext:" + name : "ext:podSnatcherDb";
		
		var onSuccess = function() {
			
		};
		
		var onFailure = function(code) {
			Mojo.Log.error("[PodSnatcher Database] Failed to open the database on disk.");
		};
		
		// Create the database storage
		this.db = new new Mojo.Depot({
			name: dbName,
			version: "1",
			displayName: "PodSnatcher Database",
			estimatedSize: 25000
		}, onSuccess, onFailure);
		if(!this.db) {
		} else {
			
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
	}
});