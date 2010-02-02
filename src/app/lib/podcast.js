var Podcast = Class.create({
	url: undefined,
	podcastGuid: undefined,
	isOutOfDate: false,
	feedItems: {},
	initialize: function(feedURL) {
		this.url = feedURL;		// Store path to feed URL
		this.feed = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
		this.restoreFromDB();		// Restore the data from the database
	},
	updateFeed: function() {
		try {
			Ajax.getFeed({
				url: this.url,
				success: this.onFeedUpdate
			});
		} catch(error) {
			Mojo.Log.error("[Podcast.updateFeed] %s", error.message);
		}
	},
	restoreFromDB: function() {
		
	},
	onFeedUpdate: function(feed) {
		Mojo.Log.info("[Podcast] \"%s\" has updated, %i new item(s).", feed.title, feed.items.length);
	},
	toListItem: function() {
		// Return this podcast as a list item
		var result = new Object();
		
		result = Object.extend({
			title: feed.title,
			img: feed.img,
			num_new_items: items.length
		}, result);
		
		return result;
	}
});