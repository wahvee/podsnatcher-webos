/* pFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 */
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