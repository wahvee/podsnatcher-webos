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
                    if(!Object.isUndefined(transport.responseXML)) {
                        // Turn the XML response into an Prototype Element
                        var xml = new Element("result").insert(transport.responseText).firstDescendant();
                        var feed = new PFeed(xml);
                        if(Object.isFunction(options.success)) options.success(feed);
                    }
                } catch (error) {
                    console.log("[Ajax.getFeed try catch error] %s", error);
                }
            },
            onFailure: function(transport) {
                console.log("[Ajax.getFeed Error] %s", transport);
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
            console.log("[PFeed Constructor] %s", error);
        }
    },
    parse: function(xml) {
        console.log("XML is: %s", xml.identify());
if(Object.isElement(xml)) console.log("XML is an element.");
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