var Podcast = Class.create({
	url: undefined,
	key: undefined,				// Used for retrieval from the Mojo.Depot
	imgUrl: undefined,
	imgPath: undefined,
	outOfDate: true,
	initialize: function(feedURL) {
		if(Object.isString(feedURL)) {
			this.url = feedURL;		// Store path to feed URL
			this.key = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
		} else {
			this.copyFromObj(feedURL);
		}
		if(this.outOfDate) {
			this.updateFeed();
		}
	},
	copyFromObj: function(sourceObj) {
		try {
			// Try an extend Podcast with the object values from sourceObj
			var newObj = (Object.isArray(sourceObj)) ? [] : {};
			for (i in sourceObj) {
				if (Object.isFunction(sourceObj[i])) continue;	// Skip functions
				if (Object.isArray(sourceObj[i])) {
					newObj[i] = sourceObj[i].clone();
				} else if (Object.isString(sourceObj[i]) || Object.isNumber(sourceObj[i])) {
					newObj[i] = sourceObj[i];
				} else {
					newObj[i] = Object.extend(newObj[i], sourceObj[i]);
				}
			}
			Object.extend(this, newObj);
		} catch(error) {
			Mojo.Log.error("[Podcast.copyFromObj] %s", error.message);
		}
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
		this.copyFromObj(feed);
		this.outOfDate = false;
		Mojo.Log.info("[Podcast.onFeedUpdate] \"%s\" has updated, %i new item(s).", this.title, this.items.length);
	},
	toListItem: function() {
}
});