var PRss = Class.create({
    initialize: function(xml) {
        this._parse(xml);
    },
    _parse: function(xml) {
        this.version = (xml.tagName.toLowerCase() != 'rss') ? '1.0' : xml.readAttribute('version');

        var channel = xml.select('channel')[0];
    
        this.title = (channel.down('title') === undefined) ? "" : channel.down('title').textContent;
        this.link = (channel.down('link') === undefined) ? "" : channel.down('link').nextSibling.textContent;   // Hack for Prototype 1.6
        this.description = (channel.down('description') === undefined) ? "" : channel.down('description').textContent;
        this.language = (channel.down('language') === undefined) ? "" : channel.down('language').textContent;
        this.updated = (channel.down('lastBuildDate') === undefined) ? "" : channel.down('lastBuildDate').textContent;
    
        this.items = [];
        
        var feed = this;
        
        xml.select('item').each( function(value) {
        
            var item = new PFeedItem();
            
            item.title = (value.down('title') === undefined) ? "" : value.down('title').textContent;
            item.link = (value.down('link') === undefined) ? "" : value.down('link').textContent;
            item.description = (value.down('description') === undefined) ? "" : value.down('description').textContent;
            item.updated = (value.down('pubDate') === undefined) ? "" : value.down('pubDate').textContent;
            item.id = (value.down('guid') === undefined) ? "" : value.down('guid').textContent;
            
            feed.items.push(item);
        });
    }
});

