var PAtom = Class.create({
    initialize: function(xml) {
        this._parse(xml);
    },
    _parse: function(xml) {    
        var channel = xml;
        this.version = '1.0';
    
        this.title = (channel.down('title') === undefined) ? "" : channel.down('title').textContent;
        this.link = (channel.down('link') === undefined) ? "" : channel.down('link').nextSibling.textContent;   // Hack for Prototype 1.6
        this.description = (channel.down('subtitle') === undefined) ? "" : channel.down('subtitle').textContent;
        this.language = channel.readAttribute('xml:lang');
        this.updated = (channel.down('updated') === undefined) ? "" : channel.down('updated').textContent;
    
        this.items = [];
        
        var feed = this;
        
        xml.select('entry').each( function(value) {
        
            var item = new PFeedItem();
            
            item.title = (value.down('title') === undefined) ? "" : value.down('title').textContent;
            item.link = (value.down('link') === undefined) ? "" : value.down('link').textContent;
            item.description = (value.down('content') === undefined) ? "" : value.down('content').textContent;
            item.updated = (value.down('updated') === undefined) ? "" : value.down('updated').textContent;
            item.id = (value.down('id') === undefined) ? "" : value.down('id').textContent;
            
            feed.items.push(item);
        });
    }
});

