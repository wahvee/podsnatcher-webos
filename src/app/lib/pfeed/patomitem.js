var PAtomItem = Class.create(PFeedItem, {
	author: '',
	initialize: function($super, entryItem) {
		$super(entryItem);
	},
	findID: function(feed) {
		// Over-ride the default findID inherited from PFeedItem
		this.setPropertyFromFeed(feed, 'id', 'id');
	},
	findAuthor: function(feed) {
		this.setPropertyFromFeed(feed, 'author', 'author');
	}
});