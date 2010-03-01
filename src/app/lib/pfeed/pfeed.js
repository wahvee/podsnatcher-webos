/* PFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 * @base
 */
var PFeed = Class.create({
	id: '',
	key: '',
	type: '',
	version: '1.0',
	title: '',
	author: '',
	description: '',
	subtitle: '',
	summary: '',
	category: '',
	language: '',
	copyright: '',
	image: undefined,	
	initialize: function() {
	},
	parse: function(xmlObj) {
		// Determine if this is RSS or Atom
		// see if the top element is an rss element
		var feed;
		var isRSS = xmlObj.evaluate("count(/rss)", xmlObj, null, XPathResult.NUMBER_TYPE, null);
		var isAtom = xmlObj.evaluate("count(/feed)", xmlObj, null, XPathResult.NUMBER_TYPE, null);
		if(isRSS.numberValue === 1) {
			Mojo.Log.info("[PFeed.parse] Found RSS feed.");
			this.type = 'rss';
			this.parseRSS(xmlObj);
		} else if(isAtom.numberValue === 1) {
			Mojo.Log.info("[PFeed.parse] Found Atom feed.");
			this.type = 'atom';
			this.parseAtom(xmlObj);
		} else {
			//TODO Throw an error...no clue what type of feed this is
		}
	},
	parseRSS: function(xmlObj) {
		var version = xmlObj.evaluate("string(rss/@version)", xmlObj, null, XPathResult.STRING_TYPE, null);
		if(Object.isUndefined(version)) {
			this.version = version.stringValue;
		}
	},
	parseAtom: function(xmlObj) {
	
	}
});