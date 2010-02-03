var Podcast = Class.create({
	url: undefined,
	key: undefined,				// Used for retrieval from the Mojo.Depot
	isOutOfDate: false,
	feedItems: [],
	initialize: function(feedURL) {
		this.url = feedURL;		// Store path to feed URL
		this.key = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
	},
	updateFeed: function() {
		try {
			Ajax.getFeed({
				url: this.url,
				success: this.onFeedUpdate.bind(this)
			});
		} catch(error) {
			Mojo.Log.error("[Podcast.updateFeed] %s", error.message);
		}
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