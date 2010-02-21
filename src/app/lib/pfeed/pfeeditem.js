var PFeedItem = Class.create({
	title: '',
	link: '',
	description: '',
	updated: '',
	id: '',
	key: '',
	enclosure: '',
	enclosureType: '',
	enclosureLength: '',
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
	simpleObject: function() {
		var clone = Object.clone(this);
		var arrKeys = Object.keys(this);
		arrKeys.each(function(key) {
			if(Object.isFunction(clone[key]) || clone[key] instanceof Event) {
				delete clone[key];
			}
		});
		
		return clone;
	}
});

