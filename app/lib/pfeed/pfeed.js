/* pFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 */

Ajax.getFeed = function(options) {
    
    options = Object.extend({    
        url: null,
        data: null,
        success: null
    }, options);

    try {
        if(options.url) {
            Mojo.Log.info("[Ajax.getFeed] Connecting to: %s", options.url);
            new Ajax.Request(options.url, {
                method: 'get',
                onSuccess: function(transport) {
                    try {
                        Mojo.Log.error("[Ajax.getFeed Success] %s ", Object.keys(transport));
                        var feed = new PFeed(transport.responseXML);
                        if(Object.isFunction(options.success)) options.success(feed);
                    } catch (error) {
                        Mojo.Log.error("[Ajax.getFeed try catch error] %s", error);
                    }
                },
                onFailure: function(transport) {
                    Mojo.Log.error("[Ajax.getFeed Error] %s", transport);
                }
            });
        }
    } catch(error) {
        Mojo.Log.error("[Ajax.getFeed] %s", error);
    }
};

var PFeed = Class.create({
    type: '',
    version: '',
    title: '',
    link: '',
    description: '',
    initialize: function(xml) {
        try{
            if(xml) this.parse(xml);
        } catch(error) {
            Mojo.Log.info("[PFeed Constructor] %s", error);
        }
    },
    parse: function() {
        if(xml.include('channel')) {
            this.type = 'rss';
            var feedClass = new PRss(xml);
        } else if(xml.include('feed')) {        
            this.type = 'atom';
            var feedClass = new PAtom(xml);
        }        
        if(feedClass) Object.extend(this, feedClass);
    }
});