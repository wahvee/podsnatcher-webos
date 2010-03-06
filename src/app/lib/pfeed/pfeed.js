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
	category: '',
	language: 'en-us',
	copyright: '',
	imgURL: '',
	items: [],
	initialize: function() {
	},
	parse: function(xmlObj) {
		// Determine if this is RSS or Atom
		// see if the top element is an rss element
		this.type = xmlObj.evaluate("name(/*)", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue.toLowerCase();
		switch(this.type) {
			case 'rss':
				Mojo.Log.info("[PFeed.parse] RSS");
				this.parseRSS(xmlObj);
				break;
			case 'feed':
				Mojo.Log.info("[PFeed.parse] Atom");
				this.type = 'atom';
				this.parseAtom(xmlObj);
				break;
			default:
				Mojo.Log.error("[PFeed.parse] Uknown type: %s", this.type);
				break;
		}
	},
	parseRSS: function(xmlObj) {
		this.version = xmlObj.evaluate("string(rss/@version)", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = xmlObj.evaluate("rss/channel/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.description = xmlObj.evaluate("rss/channel/description/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.language = xmlObj.evaluate("rss/channel/language/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.author = xmlObj.evaluate("rss/channel/itunes:author/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.category = xmlObj.evaluate("rss/channel/category/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.copyright = xmlObj.evaluate("rss/channel/copyright/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.imgURL = xmlObj.evaluate("rss/channel/image/url/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.imgTitle = xmlObj.evaluate("rss/channel/image/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.imgWidth = xmlObj.evaluate("rss/channel/image/width/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.imgHeight = xmlObj.evaluate("rss/channel/image/height/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		var numElements = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		Mojo.Log.info("[PFeed.parseRSS] %s has %i item(s).", this.title, numElements);
		// Get the list of nodes
		var elementIterator = xmlObj.evaluate("rss/channel//item", xmlObj, this.nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		// Get first node
		var thisNode = elementIterator.iterateNext();
		// Loop over all nodes.
		while(thisNode) {
			this.items.push(new PRssItem(thisNode));
			thisNode = elementIterator.iterateNext();
		}
	},
	parseAtom: function(xmlObj) {
		this.version = '1.0';
		//TODO Fix language detection
		//this.language = xmlObj.evaluate("string(Atom:feed/@lang)", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null);
		this.id = xmlObj.evaluate("/Atom:feed/Atom:id/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = xmlObj.evaluate("/Atom:feed/Atom:title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.description  = xmlObj.evaluate("/Atom:feed/Atom:subtitle/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.author = xmlObj.evaluate("/Atom:feed/Atom:author/Atom:name/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		// Start reading all of the different items
		// First get a count
		var numElements = xmlObj.evaluate("count(//Atom:entry)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		Mojo.Log.info("[PFeed.parseAtom] %s has %i item(s).", this.title, numElements);
		// Get the list of nodes
		var elementIterator = xmlObj.evaluate("//Atom:entry", xmlObj, this.nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		// Get first node
		var thisNode = elementIterator.iterateNext();
		// Loop over all nodes.
		while(thisNode) {
			this.items.push(new PAtomItem(thisNode));
			thisNode = elementIterator.iterateNext();
		}
	},
	nsResolver: function(prefix) {
		prefix = prefix.toLowerCase();
		var ns = {
			"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
			"atom": "http://www.w3.org/2005/Atom",
			"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"
		}
		return ns[prefix] || null;
	}
});
