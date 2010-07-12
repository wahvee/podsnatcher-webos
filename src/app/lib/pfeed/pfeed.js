/**
 * @constructor
 * @description Prototype feed parser. This class is used to handle all of low-level
 * feed parsing. This class interfaces with the feed from the url and converts it
 * into a parsed object in memory.
 * @param async {Boolean} This determines if the parsing should be performed
 * asyncronously or linearly. This parameter is optional and if not supplied
 * defaults to be true (which is asyncrounous).
 */
var PFeed = Class.create({
	initialize: function(async) {
		this.async = (!Object.isUndefined(async) && Object.isBoolean(async)) ? async : true;
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
		this.link = '';
		this.published = new Date();
		this.items = new Hash();
		// Required for defer to propertly execute
		this.deferableRssNode = this.rssNode.bind(this);
		this.deferableAtomNode = this.atomNode.bind(this);
		this.deferableMediaRssNode = this.mediaRssNode.bind(this);
	}
});

/**
 * Parse a passed in XML DOM to extract feed information to be stored within the
 * PFeed instance. Supported feeds: Atom, RSS 2.0, RSS 0.92, RSS 0.91, and Media
 * RSS. RSS 1.0 uses an RDF namespace, which I am not supporting at this time.
 * @param xmlObj {Document} Requeres the XML document returned in responseXML.
 */
PFeed.prototype.parse = function(xmlObj) {
	// Determine if this is RSS or Atom
	// see if the top element is an rss element
	var returnVal = false;
	this.type = this.parseType(xmlObj);
	switch(this.type) {
		case 'mediarss':
			Mojo.Log.info("[PFeed.parse] Media RSS");
			returnVal = true;
			this.parseMediaRSS(xmlObj);
			break;
		case 'rss':
			Mojo.Log.info("[PFeed.parse] RSS");
			returnVal = true;
			this.parseRSS(xmlObj);
			break;
		case 'atom':
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
};

/**
 * Peforms the parsing of a Media RSS feed.
 * @see http://video.search.yahoo.com/mrss
 * @see http://projects.wahvee.com/issues/54
 */
PFeed.prototype.parseMediaRSS = function(xmlObj) {
	this.version = '1.5';
	this.title = xmlObj.evaluate("rss/channel/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.description = xmlObj.evaluate("rss/channel/description/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.language = xmlObj.evaluate("rss/channel/language/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.author = xmlObj.evaluate("rss/channel/*[local-name()='author']/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.category = xmlObj.evaluate("rss/channel/category/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.copyright = xmlObj.evaluate("rss/channel/copyright/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgURL = xmlObj.evaluate("rss/channel/*[local-name()='image']/@href | rss/channel/image/url/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.link = xmlObj.evaluate("rss/channel/link/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.published = xmlObj.evaluate("rss/channel/pubDate/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.generator = xmlObj.evaluate("rss/channel/generator/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

	this.imgTitle = xmlObj.evaluate("rss/channel/image/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgWidth = xmlObj.evaluate("rss/channel/image/width/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgHeight = xmlObj.evaluate("rss/channel/image/height/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	// Get the list of nodes
	var elementIterator = xmlObj.evaluate("rss/channel//item", xmlObj, this.nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

	// Check to see if we are running the PFeed item async or not
	if (this.async) {
		this.podcastParseProgress.numItems = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		// Reset the event by telling it the total number of elements
		this.podcastParseProgress.item = 0;
		// Print some info to the command-line
		Mojo.Log.info("[PFeed.parseMediaRSS] %s has %i item(s).", this.title, this.podcastParseProgress.numItems);
		// Get first node
		this.deferableMediaRssNode.defer(elementIterator);
	} else {
		var numElements = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		Mojo.Log.info("[PFeed.parseMediaRSS] %s has %i item(s).", this.title, numElements);
		// Get first node
		var thisNode = elementIterator.iterateNext();
		// Loop over all nodes.
		while (thisNode) {
			// Create a PRssItem from the feed
			var loadedPRssItem = new PMediaRssItem(thisNode);
			// Check to see if it is already in the db
			// Only add it to the db if it has not been set
			if (!this.hasItem(loadedPRssItem.key)) {
				this.items.set(loadedPRssItem.key, loadedPRssItem);
			}
			// Go to the next node
			thisNode = elementIterator.iterateNext();
		}
	}

};

/**
 * @private
 * Performs the parsing of an RSS feed.
 */
PFeed.prototype.parseRSS = function(xmlObj) {
	this.version = xmlObj.evaluate("string(rss/@version)", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.title = xmlObj.evaluate("rss/channel/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.description = xmlObj.evaluate("rss/channel/description/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.language = xmlObj.evaluate("rss/channel/language/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.author = xmlObj.evaluate("rss/channel/*[local-name()='author']/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.category = xmlObj.evaluate("rss/channel/category/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.copyright = xmlObj.evaluate("rss/channel/copyright/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgURL = xmlObj.evaluate("rss/channel/*[local-name()='image']/@href | rss/channel/image/url/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.link = xmlObj.evaluate("rss/channel/link/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.published = xmlObj.evaluate("rss/channel/pubDate/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.generator = xmlObj.evaluate("rss/channel/generator/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

	this.imgTitle = xmlObj.evaluate("rss/channel/image/title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgWidth = xmlObj.evaluate("rss/channel/image/width/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.imgHeight = xmlObj.evaluate("rss/channel/image/height/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	// Get the list of nodes
	var elementIterator = xmlObj.evaluate("rss/channel//item", xmlObj, this.nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

	// Check to see if we are running the PFeed item async or not
	if (this.async) {
		this.podcastParseProgress.numItems = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		// Reset the event by telling it the total number of elements
		this.podcastParseProgress.item = 0;
		// Print some info to the command-line
		Mojo.Log.info("[PFeed.parseRSS] %s has %i item(s).", this.title, this.podcastParseProgress.numItems);
		// Get first node
		this.deferableRssNode.defer(elementIterator);
	} else {
		var numElements = xmlObj.evaluate("count(rss/channel//item)", xmlObj, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		Mojo.Log.info("[PFeed.parseRSS] %s has %i item(s).", this.title, numElements);
		// Get first node
		var thisNode = elementIterator.iterateNext();
		// Loop over all nodes.
		while (thisNode) {
			// Create a PRssItem from the feed
			var loadedPRssItem = new PRssItem(thisNode);
			// Check to see if it is already in the db
			// Only add it to the db if it has not been set
			if (!this.hasItem(loadedPRssItem.key)) {
				this.items.set(loadedPRssItem.key, loadedPRssItem);
			}
			// Go to the next node
			thisNode = elementIterator.iterateNext();
		}
	}
};

/**
 * @private
 */
PFeed.prototype.parseAtom = function(xmlObj) {
	this.version = '1.0';
	//TODO Fix language detection
	//this.language = xmlObj.evaluate("string(Atom:feed/@lang)", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null);
	this.id = xmlObj.evaluate("/Atom:feed/Atom:id/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.title = xmlObj.evaluate("/Atom:feed/Atom:title/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	this.description = xmlObj.evaluate("/Atom:feed/Atom:subtitle/text()", xmlObj, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
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
	while (thisNode) {
		this.items.push(new PAtomItem(thisNode));
		thisNode = elementIterator.iterateNext();
	}
};

/**
 * @private
 * Parse each <item> in XML document to be turned into PRssItem instance.
 * Recursive function to be used in conjunction with the Protototype framework's
 * defer method. This will allow for parsing of large XML documents withouth
 * causing the Mojo framework to hang.
 */
PFeed.prototype.rssNode = function(elementIterator) {
	// Get the node to be processed
	var thisNode = elementIterator.iterateNext();
	// Check that a node was received
	if (thisNode) {
		// Increase the item number that we are currently operating on
		this.podcastParseProgress.item++;
		// Create a PRssItem from the feed
		var loadedPRssItem = new PRssItem(thisNode);
		// Check to see if it is already in the db
		// Only add it to the db if it has not been set
		if (!this.hasItem(loadedPRssItem.key)) {
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
};

/**
 * @private
 * Parse each <item> in XML document to be turned into PRssItem instance.
 * Recursive function to be used in conjunction with the Protototype framework's
 * defer method. This will allow for parsing of large XML documents withouth
 * causing the Mojo framework to hang.
 */
PFeed.prototype.mediaRssNode = function(elementIterator) {
	// Get the node to be processed
	var thisNode = elementIterator.iterateNext();
	// Check that a node was received
	if (thisNode) {
		// Increase the item number that we are currently operating on
		this.podcastParseProgress.item++;
		// Create a PRssItem from the feed
		var loadedPRssItem = new PMediaRssItem(thisNode);
		// Check to see if it is already in the db
		// Only add it to the db if it has not been set
		if (!this.hasItem(loadedPRssItem.key)) {
			this.items.set(loadedPRssItem.key, loadedPRssItem);
		}
		// Trigger the event that this item has now been processed
		Mojo.Controller.stageController.sendEventToCommanders(this.podcastParseProgress);
		// Goto the next node
		this.deferableMediaRssNode.defer(elementIterator);
	} else {
		// Do something now that the JSON object has been parsed
		Mojo.Controller.stageController.sendEventToCommanders(this.podcastUpdateSuccess);
	}
};

/**
 * @private
 * Parse each ??? in XML document to be turned into PAtomItem instance.
 * Recursive function to be used in conjunction with the Protototype framework's
 * defer method. This will allow for parsing of large XML documents withouth
 * causing the Mojo framework to hang.
 */
PFeed.prototype.atomNode = function() { throw {name : "NotImplementedError", message : "too lazy to implement"}; };

/**
 * Get the feed type from an XML document. Returns the string name of the
 * type of feed.
 * @returns {String | Undefined} Returns 'rss' or 'atom'; undefined if unrecognized feed.
 */
PFeed.prototype.parseType = function(xmlObj) {
	try {
		var returnVal = undefined;
		var tempType = xmlObj.evaluate("name(/*)", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue.toLowerCase();
		switch(tempType) {
			case 'rss':
				// Check if the RSS is Media RSS
				var isMedia = xmlObj.evaluate("count(//media:*) > 0", xmlObj, this.nsResolver, XPathResult.BOOLEAN_TYPE, null).booleanValue;
				// If this is a Media RSS feed set the proper type
				returnVal = (isMedia) ? 'mediarss' : tempType;
				break;
			case 'feed':
				returnVal = 'atom';
				break;
			default:
				returnVal = undefined;
				break;
		}
		return returnVal;
	} catch(error) {
		Mojo.Log.error("[parseType] %s", error.message);
		return undefined;
	}
};

/**
 * Uses Enumerable#detect method to determine if the Hash contains a reference
 * to the feed item.
 * @param key {String} Hash key of the podcast item to be found.
 * @returns {Boolean} True if has the key, false otherwise.
 */
PFeed.prototype.hasItem = function(key) {
	var result = this.items.any(function(item) {
		return item.key == key;
	});
	return result;
};

/**
 * @deprecated
 * Use the Hash#get method from now on.
 * @description
 * Given an item key (unique id) it returns the item. Undefined if not found.
 * This method is just a wrapper for the Hash#get() method.
 * @param key {string} The MD5 hash of the item to be found.
 * @returns {PFeedItem} Instance of PFeedItem that matches the passed in key, undefined if not found.
 */
PFeed.prototype.getItem = function(key) {
	try {
		return this.items.get(key);
	} catch(error) {
		Mojo.Log.error("[PFeed.getItem] %s", error.message);
		return undefined;
	}
};

/**
 * @private
 * This is used to resolve Namespaces within XML documents.
 */
PFeed.prototype.nsResolver = function(prefix) {
	prefix = prefix.toLowerCase();
	var ns = {
		"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
		"atom": "http://www.w3.org/2005/Atom",
		"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
		"podcastSearch": "http://digitalpodcast.com/podcastsearchservice/output_specs.html",
		"media": "http://search.yahoo.com/mrss/"
	};
	return ns[prefix] || null;
};
