/**
 * A Static class containing all of the Schema addition methods.
 * Add new schema modifying methods here to change the database structure.
 */
var Schema = {
	/**
	 * This is used to create the version of the database used in versions 1.0.x of PodSnatcher.
	 */
	schema1: function(tx) {
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
			author TEXT,\
			enclosure TEXT,\
			enclosurePath TEXT,\
			enclosureTicket INTEGER NOT NULL DEFAULT 0,\
			enclosureType TEXT,\
			enclosureLength INTEGER,\
			listened BOOLEAN NOT NULL DEFAULT false,\
			currentTime INTEGER NOT NULL DEFAULT 0\
		);"

		// Create the podcasts table
		tx.executeSql(podcastTable, [], null, null);
		// Create the podcast_item table
		tx.executeSql(podcastItems, [], null, null);
	},

	/**
	 * This is used to create the version of the database used in versions 1.1.x of PodSnatcher.
	 */
	schema2: function(tx) {
		var addUsrTitle = "ALTER TABLE podcasts ADD usrTitle TEXT;";

		// Actually perform the modification
		tx.executeSql(addUsrTitle, [], null, null);
	}
}
