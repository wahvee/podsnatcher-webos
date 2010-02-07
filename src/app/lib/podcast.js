if(typeof Object.deepClone !== 'function') {
	console.log("[Object.deepClone] is not defined.");
	Object.prototype.deepClone = function() {
		try {
			var newObj = (this instanceof Array) ? [] : {};
			for (i in this) {
				if (Object.isFunction(this[i])) continue;	// Skip functions
				if (this[i] && typeof this[i] == "object") {
					newObj[i] = this[i].clone();
				} else {
					newObj[i] = this[i];
				}
			}
			return newObj;
		} catch(error) {
			console.log("[Object.deepClone] %s", error.message);
			return undefined;
		}
	};
} else {
	console.log("[Object.deepClone] is defined.");
}

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
			var clone = sourceObj.deepClone();
			Object.extend(this, clone);			
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