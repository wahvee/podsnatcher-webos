var PRss = Class.create(PFeedItem, {
    version: '1.0',
    language: '',
    imgUrl: '',
    initialize: function($super, rssFeed) {
        $super(rssFeed.channel[0]);
        this.items = [];
        this._parse(rssFeed);
    },
    _parse: function(rssFeed) {
        this.findVersion(rssFeed);
        this.findLanguage(rssFeed.channel);
        this.findImage(rssFeed.channel);
        
        // Different location for items
        var feedItems = (this.version == '1.0') ? rssFeed.item : rssFeed.channel[0].item;
        // Check to make sure feedItems is an array
        feedItems = (!Object.isArray(feedItems)) ? $A(feedItems) : feedItems;
        
        feedItems.each( function(value, index) {        
            var item = new PRssItem(value);            
            this.items.push(item);
        }, this);
    },
    findVersion: function(feed) {
        this.setPropertyFromFeed(feed, 'version', '@version');
        if(this.version === '') {
            this.version = '1.0';
        }
    },
    findLanguage: function(feed) {
        this.setPropertyFromFeed(feed, 'language', 'language');
    },
    findDescription: function(feed) {
        // Over-ride the default findDescription inherited from PFeedItem
        this.setPropertyFromFeed(feed, 'description', 'description');
    },
    findUpdated: function(feed) {
        // Over-ride the default findUpdated inherited from PFeedItem
        this.setPropertyFromFeed(feed, 'updated', 'lastBuildDate');
    },
    findImage: function(feed) {
        // Find an image tag if one exists
        // feed should be the channel tag...which is going to be an array
        // so select the first item in the array
        if(feed[0].hasOwnProperty('image')) {
        	feed[0].image.detect(function(imageNode) {
	        	this.setPropertyFromFeed(imageNode, 'imgUrl', 'url');
	        	return (this.imgUrl !== undefined && !this.imgUrl.blank());
	        }, this);   
        }
    }
});

