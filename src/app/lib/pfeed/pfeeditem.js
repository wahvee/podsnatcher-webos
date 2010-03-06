var PFeedItem = Class.create({
	id: '',
	key: '',
	link: '',
	enclosure: '',
	enclosurePath: '',
	enclosureTicket: 0,
	enclosureType: '',
	enclosureLength: '',
	listened: false,
	currPosition: 0,
	initialize: function(itemElement) {
		if(Object.isElement(itemElement)) {
			// DO SOMETHING IF NEEDED
		}
		// Make sure key is set
		if(this.key.blank()) {
			if(this.key.blank()) { this.key = (!this.enclosure.blank()) ? hex_md5(this.enclosure) : ''; }
			if(this.key.blank()) { this.key = (!this.id.blank()) ? hex_md5(this.id) : ''; }
			if(this.key.blank()) { this.key = (!this.link.blank()) ? hex_md5(this.link) : ''; }
			if(this.key.blank()) { this.key = hex_md5(createUUID()); }
		}
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
	},
	savePosition: function(newPosition) {
		this.currPosition = newPosition;
	},
	markAsOld: function() {
		this.listened = true;
	},
	markAsNew: function() {
		this.listened = false;
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
	removeCache: function() {
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
					Mojo.Controller.stageController.sendEventToCommanders(this.cacheDeleted);
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
}
