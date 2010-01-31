/* pFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 */

String.prototype.cleanXML = function() {
    //return this.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," ");
    return this.replace("s/>.*?</></gs", "").replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," ");
};

var PFeed = Class.create({
    type: '',
    version: '',
    title: '',
    link: '',
    description: '',
    initialize: function(xml) {
        try{
            if(xml) {
                this.parse(xml);
            }
        } catch(error) {
            console.log("[PFeed Constructor] %s", error);
        }
    },
    parse: function(xml) {
        var feedClass = undefined;
        if(xml.select('channel').length == 1)  {
            this.type = 'rss';
            feedClass = new PRss(xml);
        } else if(xml.tagName.toLowerCase() == 'feed') {        
            this.type = 'atom';
            feedClass = new PAtom(xml);
        }        
        if(feedClass) {
            Object.extend(this, feedClass);
        }
    }
});

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
                        var trimmed = transport.responseText.cleanXML();
                        var xml = new Element("result").insert(transport.responseText.cleanXML()).cleanWhitespace().firstDescendant();
                        var feed = new PFeed(xml);
                        if(Object.isFunction(options.success)) {
                            options.success(feed);
                        }
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