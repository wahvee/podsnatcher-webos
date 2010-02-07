var PRss = Class.create(PFeedItem, {
    version: '1.0',
    language: '',
    items: [],
    initialize: function($super, rssFeed) {
        $super(rssFeed.channel);
        this._parse(rssFeed);
    },
    _parse: function(rssFeed) {
        this.findVersion(rssFeed);
        this.findLanguage(rssFeed.channel);
        
        // Different location for items
        var feedItems = (this.version == '1.0') ? rssFeed.item : rssFeed.channel.item;
        
        $A(feedItems).each( function(value, index) {        
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
    }
});
