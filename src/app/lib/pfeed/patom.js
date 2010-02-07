var PAtom = Class.create(PFeedItem, {
    version: '1.0',
    language: '',
    items: [],
    initialize: function($super, atomFeed) {
        $super(atomFeed);
        this._parse(atomFeed);
    },
    _parse: function(atomFeed) {
        this.findLanguage(atomFeed);
        var channel = atomFeed.entry;
        
        $A(channel).each( function(value, index) {        
            var item = new PAtomItem(value);            
            this.items.push(item);
        }, this);
    },
    findLanguage: function(feed) {
        this.setPropertyFromFeed(feed, 'language', '@xml:lang');
    },
    findID: function(feed) {
        // Over-ride the default findID inherited from PFeedItem
        this.setPropertyFromFeed(feed, 'id', 'id');
    }
});

