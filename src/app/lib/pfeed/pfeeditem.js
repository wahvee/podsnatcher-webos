var PFeedItem = Class.create({
	title: '',
	link: '',
	description: '',
	updated: '',
	id: '',
	key: '',
	enclosure: '',
	enclosurePath: '',
	enclosureTicket: 0,
	enclosureType: '',
	enclosureLength: '',
	listened: '',
	initialize: function(feed) {
		if(feed) {
			this.findTitle(feed);
			this.findLink(feed);
			this.findDescription(feed);
			this.findUpdated(feed);
			this.findEnclosure(feed);
			this.findID(feed);
			
			if(this.enclosure !== undefined) {
			 this.key = hex_md5(this.enclosure);
			} else {
			 this.key = hex_md5(this.id);
			}
		}
	   
	   // Make the events
	   this.cacheProgress = Mojo.Event.make(
			 PFeedItem.CacheProgress,
			 {
				    key: this.key,
				    amountReceived: 0,
				    amountTotal: 0,
				    percentage: 0
			 },
			 Mojo.Controller.stageController.document
	   );
	   this.cacheError = Mojo.Event.make(PFeedItem.CacheError, {key: this.key}, Mojo.Controller.stageController.document);
	   this.cacheComplete = Mojo.Event.make(PFeedItem.EnclosureCached, {key: this.key}, Mojo.Controller.stageController.document);
	},
	setPropertyFromFeed: function(feed, propToSet, sourceProp) {
		// Get the first item if it is an array, otherwise it's an object
		var answer = (Object.isArray(feed)) ? feed[0] : feed;
		// Check to see if the feed has this object
		answer = (answer.hasOwnProperty(sourceProp)) ? answer[sourceProp] : "";
		// If it does have it, check to see if there is an array of them.
		// If there is an array select the first item in the array
		answer = (Object.isArray(answer)) ? answer[0].Text : answer;
		// If answer is a string at this point we are done
		// Otherwise it is a object and we need it's Text value
		answer = (Object.isString(answer)) ? answer : answer.Text;
		// Set the value
		this[propToSet] = answer;
	},
	findTitle: function(feed) {
		this.setPropertyFromFeed(feed, 'title', 'title');
	},
	findLink: function(feed) {
		this.setPropertyFromFeed(feed, 'link', 'link');
	},
	findDescription: function(feed) {
		this.setPropertyFromFeed(feed, 'description', 'subtitle');
	},
	findUpdated: function(feed) {
		this.setPropertyFromFeed(feed, 'updated', 'updated');
	},
	findEnclosure: function(feed) {
	   var answer = (Object.isArray(feed)) ? feed[0] : feed;
	   if(answer.hasOwnProperty('enclosure')) {
			 answer = answer.enclosure[0];
			 this.enclosure = answer['@url'];
			 this.enclosureType = answer['@type'];
			 this.enclosureLength = answer['@length'];
	   }
	},
	findID: function(feed) {
		this.setPropertyFromFeed(feed, 'id', 'guid');
	},
	markAsOld: function() {
	   this.listened = true;
	},
	markAsNew: function() {
	   this.listened = false;
	},
	isEnclosureCached: function() {
	   // Returns true if enclosure is stored locally
	   return (this.enclosurePath !== undefined && !this.enclosurePath.blank());
	},
	getEnclosure: function() {
	   return ((this.isEnclosureCached()) ? this.enclosurePath : this.enclosure);
	},
	removeCache: function() {
	   
	},
	cacheEnclosure: function() {
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
						  Mojo.Controller.stageController.sendEventToCommanders(this.cacheError);
				    }						  
			 });
	   } else {
			 Mojo.Log.error("[PFeedItem.cacheEnclosure] There is no enclosure path. What am I supposed to do?");
			 Mojo.Controller.stageController.sendEventToCommanders(this.cacheError);
	   }
     },
	cacheUpdate: function(response) {
	   // If completed is false or undefined...still in the middle
	   if(response.completed === undefined || !response.completed) {
			 //Mojo.Log.info("[PFeedItem.cacheUpdate] %s, %s", response.amountReceived, response.amountTotal);
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

PFeedItem.CacheProgress = 'onEnclosureCacheProgress';
PFeedItem.CacheError = 'onEnclosureCacheError';
PFeedItem.EnclosureCached = 'onEnclosureCached';
PFeedItem.EnclosureDeleted = 'onEnclosureDeleted';

PFeedItem.simpleObject = function(instance) {
	if(instance instanceof PFeedItem) {
		Mojo.Log.info("[PFeedItem.simpleObject] Correct type.");
		var arrKeys = Object.keys(this);
		arrKeys.each(function(key) {
			if(Object.isFunction(instance[key]) || instance[key] instanceof Event) {
				delete instance[key];
			} else if(Object.isString(instance[key]) && (instance[key].blank() || instance[key] === undefined)) {
				delete instance[key];
			} else if(Object.isArray(instance[key])) {
				delete instance[key];
			}
		});
	}
}
