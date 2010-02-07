/* pFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 */

// Returns true if property exists, false otherwise.
if(typeof Object.hasOwnProperty !== 'function') {
	console.log("[Object.hasOwnProperty] is not defined.");
	Object.prototype.hasOwnProperty = function(property) {
	    return typeof(this[property]) !== 'undefined';
	};
} else {
	console.log("[Object.hasOwnProperty] is defined.");
}

var PFeed = Class.create({
    type: '',
    initialize: function(jsonObj) {
        try{
            if(jsonObj) {
                this.parse(jsonObj);
            }
        } catch(error) {
            Mojo.Log.error("[PFeed Constructor] %s", error.message);
        }
    },
    parse: function(jsonObj) {
        var feedClass = undefined;
        if(jsonObj.hasOwnProperty('channel'))  {
            this.type = 'rss';
            feedClass = new PRss(jsonObj);
        } else if(jsonObj.feed !== undefined) {        
            this.type = 'atom';
            feedClass = new PAtom(jsonObj.feed);
        }        
        if(feedClass) {
            Object.extend(this, feedClass);
        }
    }
});

Ajax.getFeed = function(options) {
		var feed = {};
    if(options.url) {
        var temp = new Ajax.Request(options.url, {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    // Turn the XML response into a JSON Object
                    var json = XMLObjectifier.xmlToJSON(transport.responseXML);
                    feed = new PFeed(json);
                    if(Object.isFunction(options.success)) {
                        options.success(feed);
                    }
                } catch (error) {
                    Mojo.Log.error("[Ajax.getFeed try catch error] %s", error.message);
                }
            },
            onFailure: function(transport) {
                Mojo.Log.error("[Ajax.getFeed Error] %j", transport);
            }
        });
    } else {
    	console.log("[Ajax.getFeed] URL is empty. Not perfroming request.");
    }
};