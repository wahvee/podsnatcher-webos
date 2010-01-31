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
        Ajax.Request(options.url, {
            method: 'get',
            onSuccess: function(xml) {
                var feed = new PFeed(xml);
                if(Object.isFunction(options.success)) options.success(feed);
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
        if(xml) this.parse(xml);
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