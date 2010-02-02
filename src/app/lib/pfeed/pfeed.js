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
            console.log("[PFeed Constructor] %s", error);
        }
    },
    parse: function(jsonObj) {
        var feedClass = undefined;
        if(jsonObj[Object.keys(jsonObj)[0]].hasOwnProperty('channel'))  {
            this.type = 'rss';
            feedClass = new PRss(jsonObj[Object.keys(jsonObj)[0]]);
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
    
    options = Object.extend({    
        url: null,
        data: null,
        success: null
    }, options);

    if(options.url) {
        var temp = new Ajax.Request(options.url, {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    // Turn the XML response into a JSON Object
                    var json = xml2json(transport.responseXML, "").evalJSON(true);
                    var feed = new PFeed(json);
                    if(Object.isFunction(options.success)) {
                        options.success(feed);
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