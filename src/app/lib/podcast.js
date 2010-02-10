var Podcast = Class.create({
	url: undefined,
	key: undefined,					// Used for retrieval from the Mojo.Depot
	imgUrl: undefined,
	imgPath: undefined,
	outOfDate: true,
	whoToCallOnFeedUpdate: undefined,
	initialize: function(feedURL) {
		if(Object.isString(feedURL)) {
			this.url = feedURL;		// Store path to feed URL
			this.key = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
		} else {
			this.copyFromObj(feedURL);
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
	updateFeed: function(whoToCall) {
		try {
			// Define who to call once updating is performed
			if(Object.isFunction(whoToCall)) {
				this.whoToCallOnFeedUpdate = whoToCall;
			}
			
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
		if(Object.isFunction(this.whoToCallOnFeedUpdate)) {
			this.whoToCallOnFeedUpdate(this.key);
		}
		Mojo.Log.info("[Podcast.onFeedUpdate] \"%s\" has updated, %i new item(s).", this.title, this.items.length);
	},
	toListItem: function() {
		var temp = new Object();
		temp.id = this.key;
		temp.key = this.key;
		temp.title = this.title;
		temp.description = this.description;
		temp.newItems = (Object.isArray(this.items)) ? this.items.size() : 0 ;
		temp.img = (this.imgPath !== undefined) ? this.imgPath : this.imgUrl;
		return temp;
	}
});