var PRssItem = Class.create(PFeedItem, {
	author: '',
	initialize: function($super, entryItem) {
		$super(entryItem);
	},
	findID: function(feed) {
		// Over-ride the default findID inherited from PFeedItem
		this.setPropertyFromFeed(feed, 'id', 'guid');
	},
	findDescription: function(feed) {
		// Over-ride the default findDescription inherited from PFeedItem
		this.setPropertyFromFeed(feed, 'description', 'description');
	},
	findAuthor: function(feed) {
		this.setPropertyFromFeed(feed, 'author', 'author');
	}
});