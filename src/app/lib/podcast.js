/**
 * Self-contained object used to manipulate and parse podcast feeds from XML.
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
			// Create some properties that will exist for this
			// instance of the Podcast object
			this.usrTitle = '';
			// Now actually populate the Podcast instance
			if (Object.isString(feedURL)) {
				// Store path to feed URL
				this.url = feedURL;
				// MD5 Hash of feed URL (unique cookie ID)
				this.key = hex_md5(this.url);
			} else {
				// Add the properties of feedURL
				// to this instance of Podcast
				this.copy(feedURL);
			}
			// Event for this podcast begining it's update
			this.podcastStartUpdate = Mojo.Event.make(Podcast.PodcastStartUpdate, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
			// Event for this podcast download progress
			this.podcastDownloadProgress = Mojo.Event.make(Podcast.PodcastXMLDownloadProgress, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
			// Event for this podcast XML download complete
			this.podcastXMLDownloadComplete = Mojo.Event.make(Podcast.PodcastXMLDownloadComplete, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
			// Event for this podcast parsing progress
			this.podcastParseProgress = Mojo.Event.make(Podcast.PodcastParseProgress, {
				podcast: this,
				item: 0,
				numItems: 1
			},
			Mojo.Controller.stageController.document);
			// Event for when the download and parsing finish
			this.podcastUpdateSuccess = Mojo.Event.make(Podcast.PodcastUpdateSuccess, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
			// Event for when and item from this podcast is deleted
			this.podcastItemDeleted = Mojo.Event.make(Podcast.PodcastItemDeleted, {
				key: '',
				item: undefined
			},
			Mojo.Controller.stageController.document);
			// Event for when the podcast fails to update
			this.podcastUpdateFailure = Mojo.Event.make(Podcast.PodcastUpdateFailure, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
			// Event for when the podcasts album art is finished caching
			this.imageCached = Mojo.Event.make(Podcast.ImageCached, {
				podcast: this
			},
			Mojo.Controller.stageController.document);
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
		// that the items db is a hash
		// that the items db has items
		return (this.title === undefined || this.title.blank() || this.items === undefined || !Object.isHash(this.items) || this.items.size() === 0);
	},
	/**
	 * Returns the title that should be displayed to the user. Checks to see if
	 * the usrTitle property is not filled out. If it does not exist or is
	 * empty then it returns the feed title found in the XML.
	 * @see usrTitle
	 * @see title
	 */
	getTitle: function() {
		if (!Object.isUndefined(this.usrTitle) && !isNull(this.usrTitle) && !this.usrTitle.blank() && !this.usrTitle.empty()) {
			return this.usrTitle;
		} else {
			return this.title;
		}
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
		if (this.isImageCached()) {
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
		if (itemToCache) {
			itemToCache.cacheEnclosure();
		} else {
			Mojo.Log.error("[Podcast.cacheEnclosure] Cannot find key: %s", key);
		}
	},
	cancelCache: function(key) {
		var itemToCache = this.getItem(key);
		if (itemToCache) {
			itemToCache.cancelCache();
		} else {
			Mojo.Log.error("[Podcast.cancelCache] Cannot find key: %s", key);
		}
	},
	/**
	 * Deletes the cached image.
	 */
	clearCachedImage: function() {
		try {
			if (this.isImageCached()) {
				var mojoController = Mojo.Controller.stageController.activeScene();
				mojoController.serviceRequest('palm://com.palm.downloadmanager', {
					method: 'deleteDownloadedFile',
					parameters: {
						ticket: this.imgTicket
					},
					onSuccess: function(response) {
						this.imgPath = undefined;
						this.imgTicket = undefined;
					}.bind(this),
					onFailure: function(response) {
						this.imgPath = undefined;
						this.imgTicket = undefined;
					}.bind(this)
				});
			}
		} catch(error) {
			Mojo.Log.error("[Podcast.clearCachedImage] Failed deleting album-art. %s", error.message);
		}
	},
	cacheImage: function() {
		try {
			if (this.imgURL !== undefined && !this.imgURL.blank()) {
				var mojoController = Mojo.Controller.stageController.activeScene();
				mojoController.serviceRequest('palm://com.palm.downloadmanager', {
					method: 'download',
					parameters: {
						subscribe: true,
						target: this.imgURL,
						targetDir: "/media/internal/PodSnatcher/.cache",
						keepFilenameOnRedirect: true
					},
					onSuccess: function(response) {
						// Check if the download of the album art is finished
						if (response.completed) {
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
		return (!Object.isUndefined(this.imgPath) && !isNull(this.imgPath) && this.imgPath.isPath());
	}
});

// Static properties of the Podcast class
Podcast.PodcastStartUpdate = 'onStartPodcastUpdate';
Podcast.PodcastItemDeleted = 'onPodcastItemDelete';
Podcast.PodcastXMLDownloadProgress = 'onPodcastXMLDownloadProgress';
Podcast.PodcastXMLDownloadComplete = 'onPodcastXMLDownloadCompleted';
Podcast.PodcastParseProgress = 'onPodcastParseProgress';
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
};

/**
 * Gets an array of the items in the database, that
 * are not marked as listened.
 * @param {Boolean} Whether to sort array by date ascending (true) or descending (false). Default false.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getNewItems = function(sortAscending) {
	if (Object.isUndefined(sortAscending) || !Object.isBoolean(sortAscending)) {
		sortAscending = false;
	}

	var sortByDateAscending = function(a, b) {
		return a.date - b.date;
	};

	var sortByDateDescending = function(a, b) {
		return b.date - a.date;
	};

	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.values().each(function(item, index) {
		if (!item.listened) {
			arr.push({
				key: item.key,
				date: item.published,
				title: item.getTitle(),
				currentTime: item.currentTime.secondsToDuration()
			});
		}
	});
	// Sort by date...
	arr.sort((sortAscending) ? sortByDateAscending : sortByDateDescending);
	return arr;
};

/**
 * Gets an array of the items in the database that
 * that have been dowloaded.
 * @param {Boolean} Whether to sort array by date ascending (true) or descending (false). Default false.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getDownloadedItems = function(sortAscending) {
	if (Object.isUndefined(sortAscending) || !Object.isBoolean(sortAscending)) {
		sortAscending = false;
	}

	var sortByDateAscending = function(a, b) {
		return a.date - b.date;
	};

	var sortByDateDescending = function(a, b) {
		return b.date - a.date;
	};

	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.values().each(function(item, index) {
		if (item.isEnclosureCached()) {
			arr.push({
				key: item.key,
				date: item.published,
				title: item.getTitle(),
				currentTime: item.currentTime.secondsToDuration()
			});
		}
	});
	// Sort by date...
	arr.sort((sortAscending) ? sortByDateAscending : sortByDateDescending);
	return arr;
};

/**
 * Gets an array of the items in the database
 * that are marked as listened.
 * @param {Boolean} Whether to sort array by date ascending (true) or descending (false). Default false.
 * @returns {Array} An array that is either empty [] or filled.
 */
Podcast.prototype.getListenedItems = function(sortAscending) {
	if (Object.isUndefined(sortAscending) || !Object.isBoolean(sortAscending)) {
		sortAscending = false;
	}

	var sortByDateAscending = function(a, b) {
		return a.date - b.date;
	};

	var sortByDateDescending = function(a, b) {
		return b.date - a.date;
	};

	// Temp array that will be returned
	var arr = [];
	// Loop all of the items
	this.items.values().each(function(item, index) {
		if (item.listened) {
			arr.push({
				key: item.key,
				date: item.published,
				title: item.getTitle(),
				currentTime: item.currentTime.secondsToDuration()
			});
		}
	});
	// Sort by date...
	arr.sort((sortAscending) ? sortByDateAscending : sortByDateDescending);
	return arr;
};

/**
 * Clears all cached info for this podcast, includes
 * album-art and any downloaded podcast enclosures.
 */
Podcast.prototype.clearAllCached = function() {
	// Loop all of the items
	this.items.each(function(item, index) {
		// Delete the downloaded things from each podcast
		this.deleteItem(item.value.key, false);
	},
	this);
	// Delete the image/album-art
	this.clearCachedImage();
};

/**
 * Takes a simple object and creates a new PFeedItem from it, and adds
 * it to the list of items for this object. Expected type that comes from the HTML5 db.
 * @param objToAdd {Object} Object to create PFeedItem from.
 */
Podcast.prototype.addItem = function(objToAdd) {
	var item;
	if (this.type === 'rss') {
		item = new PRssItem(objToAdd);
	} else if (this.type === 'atom') {
		item = new PAtomItem(objToAdd);
	} else {
		Mojo.Log.error("[Podcast.addItem] Uknown type: %s", this.type);
	}

	// If this object has been created, add it to the Hash.
	if (!Object.isUndefined(item)) {
		this.items.set(item.key, item);
	}
};

/**
 * Deletes a podcast item. This includes removing any cached info for the
 * given podcast item, and marking it as listened.
 * @param key {string} The key that represents a specific item.
 * @param sendEvent {Boolean} Opitional parameter. Should events be triggered? Default to true.
 */
Podcast.prototype.deleteItem = function(key, sendEvent) {
	if (Object.isUndefined(sendEvent) || isNull(sendEvent)) {
		sendEvent = true;
	}
	var itemToDelete = this.getItem(key);

	if (itemToDelete !== undefined) {
		Mojo.Log.info("[Podcast.deleteItem] Deleting %s", itemToDelete.getTitle());
		if (itemToDelete instanceof PFeedItem) {
			itemToDelete.markAsOld();
			itemToDelete.removeCache(sendEvent);
		}
		// See if event should be sent
		if (sendEvent) {
			// Send event that the podcast is being deleted
			this.podcastItemDeleted.key = itemToDelete.key;
			this.podcastItemDeleted.item = itemToDelete;
			Mojo.Controller.stageController.sendEventToCommanders(this.podcastItemDeleted);
		}
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
		if (! (Object.isString(clone[key]) || Object.isNumber(clone[key]) || Object.isHash(clone[key])) || (Object.isString(clone[key]) && clone[key].blank())) {
			delete clone[key];
		}
	});

	// Items should be a Hash
	if (clone.items instanceof Hash) {
		var arr = [];
		// Make an array of the items
		clone.items.each(function(item, index) {
			arr.push(PFeedItem.simpleObject(item.value));
		});
		// Delete the Hash
		delete clone.items;
		// Replaced as an array
		Object.extend(clone, {
			items: arr
		});
	}
	return clone;
};

/**
 * Extend this instance of Podcast with the object
 * being passed in. Only, properties that exist in
 * the Podcast and reference object will be added.
 * @param objToExtendFrom {Object | Podcast} The object that will have it's properties copied.
 */
Podcast.prototype.copy = function(objToExtendFrom) {
	// Get all the properties from this
	var arrKeys = Object.keys(this);
	// Go through all of the keys of this instance
	arrKeys.each(function(key) {
		// Check to make sure:
		//    it is not undefined and is not null
		//    and it is a String and not blank
		//    or it is a Number
		if (!Object.isUndefined(objToExtendFrom[key]) && !isNull(objToExtendFrom[key]) && ((Object.isString(objToExtendFrom[key]) && !objToExtendFrom[key].blank()) || Object.isNumber(objToExtendFrom[key]))) {
			this[key] = objToExtendFrom[key];
		}
	},
	this);
};

/**
 * Actually, performs the updating of the XML feed.
 */
Podcast.prototype.updateFeed = function(newUrl) {
	// Set to path to feed if specified
	if (Object.isString(newUrl) && !newUrl.blank()) {
		this.url = newUrl; // Store path to feed URL
	}
	// Make sure the URL is not blank, and is set
	if (Object.isString(this.url) && !this.url.blank()) {
		// Error messages to be displayed
		var err1Template = new Template($L("(#{status}) Bad response from server."));
		var err2Template = new Template($L("Unknown content-type: #{contentType}"));
		// Actual Ajax call
		var temp = new Ajax.Request(this.url, {
			asynchronous: true,
			method: 'get',
			evalJS: false,
			evalJSON: false,
			sanitizeJSON: false,
			onSuccess: function(transport) {
				try {
					// Check if we should be redirecting
					// FIX FOR REDIRECTION ISSUE!
					var redirect = transport.getHeader("Location");
					var contentType = transport.getHeader("content-type");
					if(!isNull(redirect)) {
						Mojo.Log.info("[Podcast.updateFeed] Need to redirect %s", redirect);
						this.updateFeed(redirect);
					} else if (transport.status >= 200 && transport.status < 300) {
						var xml = undefined;
						// If XML is already parsed then do this
						if(!Object.isUndefined(transport.responseXML) && !isNull(transport.responseXML)) {
							xml = transport.responseXML;
						} else if(!Object.isUndefined(transport.responseText) && !isNull(transport.responseText)) {
							var parser = new DOMParser();
							xml = parser.parseFromString(transport.responseText, 'text/xml');
						}
						// PFeed method
						if(this.parse(xml)) {
							// Let everyone know that the XML has finished downloading
							Mojo.Controller.stageController.sendEventToCommanders(this.podcastXMLDownloadComplete);
						} else {
							Object.extend(this.podcastUpdateFailure, {
								message: err2Template.evaluate({contentType: contentType})
							});
							Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
						}
					} else {
						Object.extend(this.podcastUpdateFailure, {
							message: err1Template.evaluate({status: transport.status})
						});
						Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
					}
				} catch(error) {
					Mojo.Log.error("[Podcast.getFeed try catch error] %s", error.message);
					Object.extend(this.podcastUpdateFailure, error);
					Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
				}
			}.bind(this),
			onException: function(transport) {
				Mojo.Log.error("[Podcast.getFeed Exception]");
				Object.extend(this.podcastUpdateFailure, {
					message: err1Template.evaluate({status: transport.status})
				});
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
			},
			onFailure: function(transport) {
				Mojo.Log.error("[Podcast.getFeed Error]");
				Object.extend(this.podcastUpdateFailure, {
					message: err1Template.evaluate({status: transport.status})
				});
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
			}.bind(this),
			onLoading: function() {
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastStartUpdate);
			}.bind(this),
			onInteractive: function() {
				// Send the event that the update is progressed
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastDownloadProgress);
			}.bind(this),
			onUninitialized: function() {
				Mojo.Log.error("[Podcast.getFeed Uninitialized]");
				Object.extend(this.podcastUpdateFailure, {
					message: $L("Uninitialized")
				});
				Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateFailure);
			}
		});
	} else {
		Mojo.Log.error("[Podcast.getFeed] URL is empty. Not perfroming request.");
	}
};
