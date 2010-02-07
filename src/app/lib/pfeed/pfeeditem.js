var PFeedItem = Class.create({
	title: '',
	link: '',
	description: '',
	updated: '',
	id: '',
	initialize: function(feed) {
		if(feed) {
			this.findTitle(feed);
			this.findLink(feed);
			this.findDescription(feed);
			this.findUpdated(feed);
			this.findID(feed);
		}
	},
	setPropertyFromFeed: function(feed, propToSet, sourceProp) {
		// Create an array of properties were data maybe stored
		// @href
		// #text
		// #cdata
		var textProperty = ["@href", "#text", "#cdata"];
		// Check to see if the feed has this object
		var answer = (feed.hasOwnProperty(sourceProp)) ? feed[sourceProp] : "";
		// If it does have it, check to see if there is an array of them.
		answer = (Object.isArray(answer)) ? answer[0] : answer;
		// Find property that exists
		var propertyPresent = textProperty.detect(function(prop) {
			return answer.hasOwnProperty(prop);
		});
		// Get the value from the property that is present, if it exists
		answer = (propertyPresent !== undefined) ? answer[propertyPresent] : answer;
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
	findID: function(feed) {
		this.setPropertyFromFeed(feed, 'id', 'guid');
	}
});

