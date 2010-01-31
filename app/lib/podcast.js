var Podcast = Class.create({
	initialize: function(feedURL) {
		this.url = feedURL;
		this.isOutOfDate = false;
	},
	updateFeed: function() {
		try {
			Ajax.getFeed({
				url: this.url,
				success: this.onFeedUpdate
			});
		} catch(error) {
			Mojo.Log.error("[Podcast] %s", error);
		}
	},
	onFeedUpdate: function(feed) {
		Mojo.Log.info("[Podcast] \"%s\" has updated.", feed.title);
	}
});