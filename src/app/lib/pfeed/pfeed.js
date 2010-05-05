/* PFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 * @base
 */
var PFeed = Class.create({
	initialize: function() {
		this.id = '';
		this.key = '';
		this.type = '';
		this.version = '1.0';
		this.title = '';
		this.author = '';
		this.description = '';
		this.category = '';
		this.language = '';
		this.copyright = '';
		this.imgURL = '';
		this.items = new Hash();
		// Required for defer to propertly execute
		this.deferableParse = this.parse.bind(this);
		this.deferableParseRss = this.parseRSS.bind(this);
		this.deferableRssNode = this.rssNode.bind(this);
	},
     /**
      * Parse the XML DOM to find out what type of Feed this is.
      * Supported feeds: Atom, RSS 2.0, RSS 0.92, and RSS 0.91.
      * RSS 1.0 uses an RDF namespace, which I am not supporting
      * at this time.
      * @param xmlObj {Document} Requeres the XML document returned in responseXML.
      */
	parse: function(xmlObj) {
		// Determine if this is RSS or Atom
		// see if the top element is an rss element
		var returnVal = false;
		this.type = xmlObj.evaluate("name(/*)", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue.toLowerCase();
		switch(this.type) {
			case 'rss':
				Mojo.Log.info("[PFeed.parse] RSS");
				returnVal = true;
				this.parseRSS(xmlObj);
				break;
			case 'feed':
				Mojo.Log.info("[PFeed.parse] Atom");
				this.type = 'atom';
				returnVal = true;
				this.parseAtom.defer(xmlObj);
				break;
			default:
				Mojo.Log.error("[PFeed.parse] Uknown type: %s", this.type);
				break;
		}
		// To return false if the feed type is not recognized
		return returnVal;
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

		this.podcastParseProgress.numItems = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		// Reset the event by telling it the total number of elements
		this.podcastParseProgress.item = 0;
		// Print some info to the command-line
		Mojo.Log.info("[PFeed.parseRSS] %s has %i item(s).", this.title, this.podcastParseProgress.numItems);
		// Get the list of nodes
		var elementIterator = xmlObj.evaluate("rss/channel//item", xmlObj, this.nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		// Get first node
		this.deferableRssNode.defer(elementIterator);
	},
	/**
	 * Recursive function to load all the XML nodes. Specific
	 * processing to be done from RSS feeds.
	 */
	rssNode: function(elementIterator) {
		// Get the node to be processed
		var thisNode = elementIterator.iterateNext();
		// Check that a node was received
		if(thisNode) {
			// Increase the item number that we are currently operating on
			this.podcastParseProgress.item++;
			// Create a PRssItem from the feed
			var loadedPRssItem = new PRssItem(thisNode);
			// Check to see if it is already in the db
			// Only add it to the db if it has not been set
			if(!this.hasItem(loadedPRssItem.key)) {
				this.items.set(loadedPRssItem.key, loadedPRssItem);
			}
			// Trigger the event that this item has now been processed
			Mojo.Controller.stageController.sendEventToCommanders(this.podcastParseProgress);
			// Goto the next node
			this.deferableRssNode.defer(elementIterator);
		} else {
			// Do something now that the JSON object has been parsed
			Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateSuccess);
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
	atomNode: function() {

	},
	/**
	 * Uses Enumerable#detect method to determine if the Hash contains
	 * a reference to the feed item.
	 * @param key {String} Hash key of the podcast item to be found.
	 * @returns {Boolean} True if has the key, false otherwise.
	 */
	hasItem: function(key) {
		var result = this.items.any(function(item) {
			return item.key == key;
		});
		return result;
	},
     /**
      * @deprecated
	 * Given an item key (unique id) it returns the item. Undefined if not found.
	 * This method is just a wrapper for the Hash#get() method. Use the Hash#get
	 * method from now on.
	 * @param key {string} The MD5 hash of the item to be found.
	 * @returns {PFeedItem} Instance of PFeedItem that matches the passed in key, undefined if not found.
	 */
	getItem: function(key) {
	   try {
			 return this.items.get(key);
	   } catch(error) {
			 Mojo.Log.error("[PFeed.getItem] %s", error.message);
			 return undefined;
	   }
	},
	nsResolver: function(prefix) {
		prefix = prefix.toLowerCase();
		var ns = {
			"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
			"atom": "http://www.w3.org/2005/Atom",
			"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"
		};
		return ns[prefix] || null;
	}
});
