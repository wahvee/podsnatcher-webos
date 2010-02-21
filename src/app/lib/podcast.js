var Podcast = Class.create(PFeed, {
	initialize: function($super, feedURL) {
		$super();				// Call the initialize method of it's extended object
		if(Object.isString(feedURL)) {
			this.url = feedURL;		// Store path to feed URL
			this.key = hex_md5(this.url);	// MD5 Hash of feed URL (unique cookie ID)
		} else {
			Object.extend(this, feedURL);
		}
		try {
			this.podcastStartUpdate = Mojo.Event.make(Podcast.PodcastStartUpdate, {podcast: this}, Mojo.Controller.stageController.document);
			this.podcastUpdateSuccess = Mojo.Event.make(Podcast.PodcastUpdateSuccess, {podcast: this}, Mojo.Controller.stageController.document);
			this.podcastUpdateFailure = Mojo.Event.make(Podcast.PodcastUpdateFailure, {podcast: this}, Mojo.Controller.stageController.document);
			this.imageCached = Mojo.Event.make(Podcast.ImageCached, {}, Mojo.Controller.stageController.document);
		} catch(error) {
			Mojo.Log.error("[Podcast] %s", error.message);
		}
	},
	isOutOfDate: function() {
		// Check to see if the title has been set,
		// title is not blank (empty),
		// that the items db has been defined,
		// that the items db is an array
		return (this.title === undefined || this.title.blank() || this.items === undefined || !Object.isArray(this.items));
	},
	getImage: function() {
		if(this.isImageCached()) {
			return this.imgPath;
		} else {
			this.cacheImage();
			return this.imgUrl;
		}
	},
	cacheImage: function() {
		try {
			 if(this.imgUrl !== undefined && !this.imgUrl.blank()) {
			var mojoController = Mojo.Controller.stageController.activeScene();
			mojoController.serviceRequest('palm://com.palm.downloadmanager', {
				method: 'download',
				parameters: {
					target: this.imgUrl,
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
					Mojo.Log.error("[Podcast.cacheImage] Failed downloading album-art. %s")
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
Podcast.EnclosureCached = 'onEnclosureCached';
Podcast.EnclosureDeleted = 'onEnclosureDeleted';

Podcast.prototype.url = undefined;
Podcast.prototype.key = undefined;
Podcast.prototype.imgPath = undefined;
Podcast.prototype.imgTicket = undefined;
Podcast.prototype.enclosurePath = undefined;
Podcast.prototype.enclosureTicket = undefined;

/**
 * Converts the Podcast to a simple Object for
 * saving or whatever the reason. Basically, strips
 * everything but the storage.
 */
Podcast.prototype.simpleObj = function() {
	   
	   var temp = $(this);
	   
	   // Each item should be an PRssItem or PAtomItem
	   this.items.each(function(podcastItem, index) {
			 
	   });
}

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
					// Turn the XML response into a JSON Object
					var json = XMLObjectifier.xmlToJSON(transport.responseXML);
					this.parse(json);
					// Do something now that the JSON object has been parsed
					Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateSuccess);
				} catch (error) {
					Mojo.Log.error("[Podcast.getFeed try catch error] %s", error.message);
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