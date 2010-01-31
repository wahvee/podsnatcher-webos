var PFeedItem = Class.create({
	title: '',
	link: '',
	description: '',
	updated: '',
	id: '',
	initialize: function(feed) {
		this.findTitle(feed);
		this.findLink(feed);
		this.findDescription(feed);
		this.findUpdated(feed);
		this.findID(feed);
	},
	setPropertyFromFeed: function(feed, propToSet, sourceProp, txtProp) {
		// Check to see if a specific property has been specified.
		var textProperty = (txtProp === undefined) ? "#text" : txtProp;		
		// Check to see if the feed has this object
		var answer = (feed.hasOwnProperty(sourceProp)) ? feed[sourceProp] : "";
		// If it does have it, check to see if there is an array of them.
		answer = (Object.isArray(answer)) ? answer[0] : answer;
		// Check to see if the value is stored within an attribute (textProperty)
		answer = (answer.hasOwnProperty(textProperty)) ? answer[textProperty] : answer;
		// Set the value
		this[propToSet] = answer;
	},
	findTitle: function(feed) {
		this.setPropertyFromFeed(feed, 'title', 'title');
	},
	findLink: function(feed) {
		this.setPropertyFromFeed(feed, 'link', 'link', '@href');
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

