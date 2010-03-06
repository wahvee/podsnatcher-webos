/**
 * Self-contained object used to manipulate and parse podcast
 * feeds from XML.
 * @extends PFeed
 */
var Podcast = Class.create(PFeed, {
	/**
	 * @private
	 * @constructor
	 * Extends the initialize method of PFeed.
	 * Basically looks to see if a feed url was given (String)
	 * or if a Object was sent. If a string is sent then set the url
	 * and key (MD5 Hash of url). Podcast will be out-of-date.
	 * Otherwise extend this instance with the variables from the object
	 * passed in.
	 * @param {string, object} Either a string, that is a path to a URL; or an object with podcast data.
	 */
	initialize: function($super, feedURL) {
		try {
			// Call the initialize method of it's extended object
			$super();
			if(Object.isString(feedURL)) {
				// Store path to feed URL
				this.url = feedURL;
				// MD5 Hash of feed URL (unique cookie ID)
				this.key = hex_md5(this.url);
			} else {
				Object.extend(this, feedURL);
				delete this.items;
				this.items = new Hash();
				if(feedURL.items) {
					feedURL.items.each(function(item) {
						var temp = new PFeedItem();
						Object.extend(temp, item);
						// Make sure key is up-to-date
						temp.generateKey();
						this.items.set(temp.key, temp);
					}, this);
				}
			}

			this.podcastStartUpdate = Mojo.Event.make(Podcast.PodcastStartUpdate, {podcast: this}, Mojo.Controller.stageController.document);
			this.podcastUpdateSuccess = Mojo.Event.make(Podcast.PodcastUpdateSuccess, {podcast: this}, Mojo.Controller.stageController.document);
			this.podcastUpdateFailure = Mojo.Event.make(Podcast.PodcastUpdateFailure, {podcast: this}, Mojo.Controller.stageController.document);
			this.imageCached = Mojo.Event.make(Podcast.ImageCached, {}, Mojo.Controller.stageController.document);
		} catch(error) {
			Mojo.Log.error("[Podcast] %s", error.message);
		}
	},
	/**
	 * Checks to make see if the current podcast is out-of-date.
	 * The basic check is to see if title is not blank, that the
	 * items db has been defined, and that there are items db
	 * is an array. If any one of them fail it marks the podcast
	 * out-of-date.
	 * @returns {boolean} True represents out-of-date, false is up-to-date.
	 */
	isOutOfDate: function() {
		// Check to see if the title has been set,
		// title is not blank (empty),
		// that the items db has been defined,
		// that the items db is an array
		return (this.title === undefined || this.title.blank() || this.items === undefined || !Object.isHash(this.items));
	},
	/**
	 * Call this method to get the podcasts album-art or image. The method,
	 * prefers the img stored locally over remote images. Therefore, if the
	 * image has been cached it is returned. If it has not been cached, it
	 * requests that the img be cached and returns the remote path in the mean
	 * time.
	 * @returns {string} A path to the album-art image. Either local or remote.
	 */
	getImage: function() {
		if(this.isImageCached()) {
			return this.imgPath;
		} else {
			this.cacheImage();
			return this.imgURL;
		}
	},
	/**
	 * Call this method to start downloading an item from the podcast. Feedback
	 * is handled by Events.
	 * @see PFeedItem#CacheProgress
	 * @see PFeedItem#CacheError
	 * @see PFeedItem#EnclosureCached
	 * @see PFeedItem#EnclosureDeleted
	 * @param key {string} The key to a podcast item that should be downloaded.
	 */
	cacheEnclosure: function(key) {
	   var itemToCache = this.getItem(key);
	   if(itemToCache) {
			 itemToCache.cacheEnclosure();
	   } else {
			 Mojo.Log.error("[Podcast.cacheEnclosure] Cannot find key: %s", key);
	   }
	},
	cancelCache: function(key) {
		var itemToCache = this.getItem(key);
		if(itemToCache) {
			itemToCache.cancelCache();
		} else {
			Mojo.Log.error("[Podcast.cancelCache] Cannot find key: %s", key);
		}
	},
	cacheImage: function() {
		try {
			 if(this.imgURL !== undefined && !this.imgURL.blank()) {
			var mojoController = Mojo.Controller.stageController.activeScene();
			mojoController.serviceRequest('palm://com.palm.downloadmanager', {
				method: 'download',
				parameters: {
					target: this.imgURL,
					targetDir: "/media/internal/PodSnatcher/cache",
					keepFilenameOnRedirect: true
				},
				onSuccess: function(response) {
					if(response.returnValue) {
						Mojo.Log.info("[Podcast.cacheImage] (%s) %s", response.ticket, response.target);
						this.imgPath = response.target;
						this.imgTicket = response.ticket;
						Mojo.Controller.stageController.sendEventToCommanders(this.imageCached);
					}
				}.bind(this),
				onFailure: function(e) {
					Mojo.Log.error("[Podcast.cacheImage] Failed downloading album-art. %s");
				}
			});
			 }
		} catch(error) {
			Mojo.Log.error("[Podcast.cacheImage] Failed downloading album-art. %s", error.message);
		}
	},
	isImageCached: function() {
		// Returns true if image is stored locally
		return (this.imgPath !== undefined && !this.imgPath.blank());
	}
});

// Static properties of the Podcast class
Podcast.PodcastStartUpdate = 'onStartPodcastUpdate';
Podcast.PodcastUpdateSuccess = 'onPodcastSuccess';
Podcast.PodcastUpdateFailure = 'onPodcastFailure';
Podcast.ImageCached = 'onImageCached';
Podcast.ImageDeleted = 'onImageDeleted';

Podcast.prototype.url = undefined;
Podcast.prototype.key = undefined;
Podcast.prototype.imgPath = undefined;
Podcast.prototype.imgTicket = undefined;

/**
 * Check if there are items in the db.
 * @returns {Boolean} True if there are items, false otherwise.
 */
Podcast.prototype.hasItems = function() {
	return this.items.size() > 0;
}

/**
 * Gets an array of the items in the database, that
 * are not marked as listened.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getNewItems = function () {
	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.each(function(item, index) {
		if(!item.value.listened) { arr.push( {key: item.value.key, title: item.value.title, currentTime: item.value.currentTime } ); }
	});
	return arr;
}

/**
 * Gets an array of the items in the database that
 * that have been dowloaded.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getDownloadedItems = function () {
	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.each(function(item, index) {
		var temp = PFeedItem.simpleObject(item.value)
		if(item.value.isEnclosureCached()) { arr.push( {key: item.value.key, title: item.value.title, currentTime: item.value.currentTime } ); }
	});
	return arr;
}

/**
 * Gets an array of the items in the database
 * that are marked as listened.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getListenedItems = function () {
	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.each(function(item, index) {
		var temp = PFeedItem.simpleObject(item.value)
		if(item.value.listened) { arr.push( {key: item.value.key, title: item.value.title, currentTime: item.value.currentTime } ); }
	});
	return arr;
}

/**
* Deletes a podcast item. This includes removing any cached info for the
* given podcast item, and marking it as listened.
* @param {string} The key that represents a specific item.
*/
Podcast.prototype.deleteItem = function(key) {
	var itemToDelete = this.getItem(key);

	if(itemToDelete !== undefined) {
		Mojo.Log.info("[Podcast.deleteItem] Deleting %s", itemToDelete.title);
		if(itemToDelete instanceof PFeedItem) {
			itemToDelete.markAsOld();
			itemToDelete.removeCache();
		}
		// Send event that the podcast is being deleted
		Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateSuccess);
	}
};

/**
 * Converts the Podcast to a simple Object for
 * saving or whatever the reason. Basically, strips
 * everything but the storage.
 */
Podcast.prototype.simpleObject = function() {
	var clone = Object.clone(this);
	var arrKeys = Object.keys(this);
	arrKeys.each(function(key) {
		if(!(Object.isString(clone[key]) || Object.isNumber(clone[key]) || Object.isHash(clone[key])) ||
					(Object.isString(clone[key]) && clone[key].blank())) {
				delete clone[key];
			}
	});

	// Items should be a Hash
	if(clone.items instanceof Hash) {
		var arr = [];
		// Make an array of the items
		clone.items.each(function(item, index) {
			arr.push(PFeedItem.simpleObject(item.value));
		});
		// Delete the Hash
		delete clone.items;
		// Replaced as an array
		Object.extend(clone, {items: arr});
	}
	return clone;
};

/**
 * Actually, performs the updating of the XML feed.
 */
Podcast.prototype.updateFeed = function(newUrl) {
	// Set to path to feed if specified
	if(Object.isString(newUrl) && !newUrl.blank()) {
		this.url = newUrl;		// Store path to feed URL
		this.key = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
	}
	// Make sure the URL is not blank, and is set
	if(Object.isString(this.url) && !this.url.blank()) {
		var temp = new Ajax.Request(this.url, {
			method: 'get',
			onSuccess: function(transport) {
				try {
					if(!Object.isUndefined(transport.responseXML) && !isNull(transport.responseXML) && transport.status === 200) {
						// Turn the XML response into a JSON Object
						// PFeed method
						this.parse(transport.responseXML);
						// Do something now that the JSON object has been parsed
						Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateSuccess);
					} else {
						// Check if we should be redirecting
						// FIX FOR REDIRECTION ISSUE!
						var redirect = transport.getHeader("Location");
						if(!isNull(redirect)) {
							Mojo.Log.info("[Podcast.updateFeed] Need to redirect %s", redirect);
							this.updateFeed(redirect);
						} else {
							Object.extend(this.podcastUpdateFailure, {message: "(" + transport.status + ") XML was empty!"});
							Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
						}
					}
				} catch (error) {
					Mojo.Log.error("[Podcast.getFeed try catch error] %s", error.message);
					Object.extend(this.podcastUpdateFailure, error);
					Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
				}
			}.bind(this),
			onFailure: function(transport) {
				Mojo.Log.error("[Podcast.getFeed Error] %j", transport);
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
			}.bind(this),
			onLoading: function() {
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastStartUpdate);
			}.bind(this),
			onInteractive: function() {
				Mojo.Log.info("[Podcast.getFeed] onInteractive");
			}.bind(this)
		});
	} else {
		Mojo.Log.error("[Podcast.getFeed] URL is empty. Not perfroming request.");
	}
};
