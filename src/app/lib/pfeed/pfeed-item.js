var PFeedItem = Class.create({
	initialize: function(itemElement) {
		this.id = '';
		this.key = '';
		this.link = '';
		this.enclosure = '';
		this.enclosurePath = '';
		this.enclosureTicket = 0;
		this.enclosureType = '';
		this.enclosureLength = '';
		this.listened = false;
		this.currentTime = 0;

		if(Object.isElement(itemElement)) {
			// DO SOMETHING IF NEEDED
		}
		// Make sure key is set
		this.generateKey();
		// Make the events
		this.cacheProgress = Mojo.Event.make(
			PFeedItem.CacheProgress,
				{
					key: this.key,
					item: this,
					amountReceived: 0,
					amountTotal: 0,
					percentage: 0
				},
			Mojo.Controller.stageController.document
		);
		this.cacheError = Mojo.Event.make(PFeedItem.CacheError, {key: this.key, item: this}, Mojo.Controller.stageController.document);
		this.cacheComplete = Mojo.Event.make(PFeedItem.EnclosureCached, {key: this.key, item: this}, Mojo.Controller.stageController.document);
		this.cacheDeleted = Mojo.Event.make(PFeedItem.EnclosureDeleted, {key: this.key, item: this}, Mojo.Controller.stageController.document);
		this.cacheCanceled = Mojo.Event.make(PFeedItem.CacheCanceled, {key: this.key, item: this}, Mojo.Controller.stageController.document);
		this.updatedEvent = Mojo.Event.make(PFeedItem.PodcastItemUpdated, {key: this.key, item: this}, Mojo.Controller.stageController.document);
	},
	generateKey: function() {
		if(this.key.blank()) { this.key = (!this.enclosure.blank()) ? hex_md5(this.enclosure) : ''; }
		if(this.key.blank()) { this.key = (!this.id.blank()) ? hex_md5(this.id) : ''; }
		if(this.key.blank()) { this.key = (!this.link.blank()) ? hex_md5(this.link) : ''; }
	},
	savePosition: function(newPosition) {
		var changed = this.currentTime !== newPosition;
		this.currentTime = newPosition;
		this.updatedEvent.key = this.key;
		if(changed) {
			Mojo.Controller.stageController.sendEventToCommanders(this.updatedEvent);
		}
	},
	markAsOld: function() {
		var changed = this.listened !== true;
		this.listened = true;
		this.updatedEvent.key = this.key;
		if(changed) {
			Mojo.Controller.stageController.sendEventToCommanders(this.updatedEvent);
		}
	},
	markAsNew: function() {
		var changed = this.listened !== false;
		this.listened = false;
		this.updatedEvent.key = this.key;
		if(changed) {
			Mojo.Controller.stageController.sendEventToCommanders(this.updatedEvent);
		}
	},
	/**
	 * Check to see if the current podcast is already in progress
	 * to be downloading.
	 * @returns {boolean} True if downloading, false if not.
	 */
	isCaching: function() {
		return this.enclosureTicket !== 0 && !this.isEnclosureCached();
	},
	/**
	 * Checks if the enclosure is stored locally.
	 * @returns {boolean} True if already stored locally, false otherwise.
	 */
	isEnclosureCached: function() {
		// Returns true if enclosure is stored locally
		return (this.enclosurePath !== undefined && !this.enclosurePath.blank());
	},
	getEnclosure: function() {
		return ((this.isEnclosureCached()) ? this.enclosurePath : this.enclosure);
	},
	/**
	 * @param sendEvent {Boolean} Opitional parameter. Should events be triggered? Default to true.
	 */
	removeCache: function(sendEvent) {
		if(Object.isUndefined(sendEvent) || isNull(sendEvent)) {
			sendEvent = true;
		}
		var mojoController = Mojo.Controller.stageController.activeScene();
		if(this.enclosureTicket !== 0) {
			mojoController.serviceRequest('palm://com.palm.downloadmanager', {
				method: 'deleteDownloadedFile',
				parameters: {
					ticket: this.enclosureTicket
				},
				onSuccess: function(response) {
					if(response.returnValue) {
						this.enclosurePath = '';
						this.enclosureTicket = 0;
					}
					this.cacheDeleted.key = this.key;
					if(sendEvent) {
						Mojo.Controller.stageController.sendEventToCommanders(this.cacheDeleted);
					}
				}.bind(this),
				onFailure: function(response) {
					this.enclosurePath = '';
					this.enclosureTicket = 0;
					Mojo.Log.error("[PFeedItem.removeCache] (%i) Failed to delete ticket. %s", response.ticket, this.enclosurePath);
				}.bind(this)
			});
		}
	},
	cacheEnclosure: function() {
		//Mojo.Log.error("[PFeedItem.cacheEnclosure] %s", this.key);
		var mojoController = Mojo.Controller.stageController.activeScene();
		if(this.enclosure !== undefined && !this.enclosure.blank()) {
			mojoController.serviceRequest('palm://com.palm.downloadmanager', {
				method: 'download',
				parameters: {
					target: this.enclosure,
					mime: (this.enclosureType !== undefined && !this.enclosureType.blank()) ? this.enclosureType : '',
					targetDir: '/media/internal/PodSnatcher/downloads',
					keepFilenameOnRedirect: true,
					subscribe: true
				},
				onSuccess: this.cacheUpdate.bind(this),
				onFailure: function(error) {
					Mojo.Log.logProperties(error);
					Mojo.Log.error("[PFeedItem.cacheEnclosure] Failed downloading enclosure.");
					this.cacheError.key = this.key;
					Mojo.Controller.stageController.sendEventToCommanders(this.cacheError);
				}.bind(this)
			});
		} else {
			Mojo.Log.error("[PFeedItem.cacheEnclosure] There is no enclosure path. What am I supposed to do?");
			Mojo.Controller.stageController.sendEventToCommanders(this.cacheError);
		}
	},
	cancelCache: function() {
		//Mojo.Log.error("[PFeedItem.cancelCache] %s", this.key);
		var mojoController = Mojo.Controller.stageController.activeScene();
		mojoController.serviceRequest('palm://com.palm.downloadmanager/', {
			method: 'cancelDownload',
			parameters: {
				"ticket" : this.enclosureTicket
			},
			onSuccess : function (response) {
				Mojo.Log.info("[PFeedItem.cancelCache] %i canceled.", this.enclosureTicket);
				if(response.returnValue) {
					this.enclosureTicket = 0;
					this.cacheCanceled.key = this.key;
					Mojo.Controller.stageController.sendEventToCommanders(this.cacheCanceled);
				}
			}.bind(this),
			onFailure : function (error){
				this.enclosureTicket = 0;
				Mojo.Log.error("[PFeedItem.cancelCache] %s", error.message);
			}.bind(this)
		});
	},
	cacheUpdate: function(response) {
		// If completed is false or undefined...still in the middle
		if(response.completed === undefined || !response.completed) {
				//Mojo.Log.info("[PFeedItem.cacheUpdate] %s, %s", response.amountReceived, response.amountTotal);
				// Used to tell if in progress
				this.enclosureTicket = response.ticket;
				// Calculate the event parameters
				var percent = (response.amountReceived / response.amountTotal) * 100;
				this.cacheProgress.key = this.key;
				this.cacheProgress.amountReceived = response.amountReceived;
				this.cacheProgress.amountTotal = response.amountTotal;
				this.cacheProgress.percentage = (isNaN(percent)) ? 0 : percent;
				// Send the progress event
				Mojo.Controller.stageController.sendEventToCommanders(this.cacheProgress);

		// Otherwise, we are completed and everything is ok.
		} else if(response.completed && response.completionStatusCode == 200) {
			this.cacheComplete.key = this.key;
			this.cacheProgress.key = this.key;
			this.cacheProgress.amountReceived = 0;
			this.cacheProgress.amountTotal = 0;
			this.cacheProgress.percentage = 0;
			this.enclosurePath = response.target;
			this.enclosureTicket = response.ticket;
			Mojo.Controller.stageController.sendEventToCommanders(this.cacheComplete);
		} else {
			Mojo.Log.error("[PFeedItem.cacheUpdate] Something un-expected happened.");
			Object.extend(this.cacheError, response);
			Mojo.Controller.stageController.sendEventToCommanders(this.cacheError);
		}
	}
});

PFeedItem.CacheCanceled = 'onEnclosureCacheCanceled';
PFeedItem.CacheProgress = 'onEnclosureCacheProgress';
PFeedItem.CacheError = 'onEnclosureCacheError';
PFeedItem.EnclosureCached = 'onEnclosureCached';
PFeedItem.EnclosureDeleted = 'onEnclosureDeleted';
PFeedItem.PodcastItemUpdated = 'onPodcastChange';


PFeedItem.Status = {};
PFeedItem.Status.New = 'new';
PFeedItem.Status.NewCaching = 'newCaching';
PFeedItem.Status.NewCached = 'newCached';
PFeedItem.Status.InProgress = 'inProgress';
PFeedItem.Status.InProgressCaching = 'inProgressCaching';
PFeedItem.Status.InProgressCached = 'inProgressCached';
PFeedItem.Status.Listened = 'listened';
PFeedItem.Status.ListenedCaching = 'listenedCaching';
PFeedItem.Status.ListenedCached = 'listenedCached';

/**
 * Calculates what the current status of the item is.
 * The function will return a status from PFeedItem.Status.
 * @returns A string that is a status from PFeedItem.Status.
 */
PFeedItem.prototype.getStatusIndicator = function() {
	if(this.listened === false && this.currentTime === 0 && !this.isEnclosureCached()) {
		if(this.isCaching()) {
			return PFeedItem.Status.NewCaching;
		} else {
			return PFeedItem.Status.New;
		}
	} else if(this.listened === false && this.currentTime === 0  && this.isEnclosureCached()) {
		return PFeedItem.Status.NewCached;
	} else if(this.listened === false && this.currentTime !== 0 && !this.isEnclosureCached()) {
		if(this.isCaching()) {
			return PFeedItem.Status.InProgressCaching;
		} else {
			return PFeedItem.Status.InProgress;
		}
	} else if(this.listened === false && this.currentTime !== 0 && this.isEnclosureCached()) {
		return PFeedItem.Status.InProgressCached;
	} else if(this.listened && this.isEnclosureCached()) {
		return PFeedItem.Status.ListenedCached;
	} else {
		if(this.isCaching()) {
			return PFeedItem.Status.ListenedCaching;
		} else {
			return PFeedItem.Status.Listened;
		}
	}
};

PFeedItem.simpleObject = function(instance) {
	if(instance instanceof PFeedItem) {
		var copy = Object.clone(instance);
		var arrKeys = Object.keys(copy);
		arrKeys.each(function(key) {
			if(!(Object.isString(copy[key]) || Object.isNumber(copy[key]) || Object.isBoolean(copy[key])) ||
					(Object.isString(copy[key]) && copy[key].blank())) {
				delete copy[key];
			}
		});
		return copy;
	}
	return undefined;
};

/**
 * Extend this instance of PFeedItem with the object
 * being passed in. Only, properties that exist in
 * the PFeedItem and reference object will be added.
 * @param objToExtendFrom {Object | PFeedItem} The object that will have it's properties copied.
 */
PFeedItem.prototype.copy = function(objToExtendFrom) {
	// Get all the properties from this
	var arrKeys = Object.keys(this);
	// Go through all of the keys of this instance
	arrKeys.each(function(key) {
		// Check to make sure:
		//    it is not undefined and is not null
		//    and it is a String and not blank
		//    or it is a Number
		//    or it is Boolean
		if(!Object.isUndefined(objToExtendFrom[key])
			&& !isNull(objToExtendFrom[key])
			&& ((Object.isString(objToExtendFrom[key]) && !objToExtendFrom[key].blank())
				|| Object.isNumber(objToExtendFrom[key])
				|| Object.isBoolean(objToExtendFrom[key]))
		) {
			if(Object.isBoolean(this[key])) {
				this[key] = (objToExtendFrom[key] === 'true') ? true : false;
			} else if(this[key] instanceof Date) {
				this[key] = new Date(objToExtendFrom[key]);
			} else {
				this[key] = objToExtendFrom[key];
			}
		}
	}, this);
};
