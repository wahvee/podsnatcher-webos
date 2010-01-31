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

    if(options.url) {
        new Ajax.Request(options.url, {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    var feed = new PFeed(transport.responseXML.documentElement);
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
            Mojo.Log.error("[PFeed Constructor] %s", error);
        }
    },
    parse: function(xml) {
if(Object.isElement(xml)) Mojo.Log.info("XML is an element.");
	        if(xml.match('channel')) {
	            this.type = 'rss';
	            var feedClass = new PRss(xml);
	        } else if(xml.match('feed')) {        
	            this.type = 'atom';
	            var feedClass = new PAtom(xml);
	        }        
	        if(feedClass) Object.extend(this, feedClass);
    }
});