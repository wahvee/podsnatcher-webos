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
	language: 'en-us',
	copyright: '',
	image: undefined,
	items: [],
	initialize: function() {
	},
	parse: function(xmlObj) {
		// Determine if this is RSS or Atom
		// see if the top element is an rss element
		var topNode = xmlObj.evaluate("name(/*)", xmlObj, null, XPathResult.STRING_TYPE, null);
		this.type = topNode.stringValue.toLowerCase();
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
		}
	},
	parseRSS: function(xmlObj) {
		var version = xmlObj.evaluate("string(rss/@version)", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue;
		this.title = xmlObj.evaluate("string(rss/channel/title/text())", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue;
		this.description = xmlObj.evaluate("string(rss/channel/description/text())", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue;
		this.language = xmlObj.evaluate("string(rss/channel/language/text())", xmlObj, null, XPathResult.STRING_TYPE, null).stringValue;
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
			"atom": "http://www.w3.org/2005/Atom"
		}
		return ns[prefix] || null;
	},
	getXPathForElement: function (el, xml) {  
		var xpath = '';
		var pos, tempitem2;
		while(el !== xml.documentElement) {
			pos = 0;
			tempitem2 = el;
			while(tempitem2) {
				if (tempitem2.nodeType === 1 && tempitem2.nodeName === el.nodeName) { // If it is ELEMENT_NODE of the same name
					pos += 1;
				}
				tempitem2 = tempitem2.previousSibling;
			}
			xpath = "*[name()='"+el.nodeName+"' and namespace-uri()='"+(el.namespaceURI===null?'':el.namespaceURI)+"']["+pos+']'+'/'+xpath;
			el = el.parentNode;
		}
		xpath = '/*'+"[name()='"+xml.documentElement.nodeName+"' and namespace-uri()='"+(el.namespaceURI===null?'':el.namespaceURI)+"']"+'/'+xpath;
		xpath = xpath.replace(/\/$/, '');
		return xpath;
	}
});