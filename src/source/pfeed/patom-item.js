/**
 * @extends PFeedItem
 * @constructor
 * @name PAtomItem
 * @description This class is used to extract the pertanent information from an
 * Atom formatted feed. Specifically the part of the feed this is supposted to
 * read is each entry node within the feed.
 * @param {Element} The XML DOM element that represents an entry node.
 */
var PAtomItem = Class.create(PFeedItem, {
	initialize: function($super, elementItem) {
		this.id = '';
		this.title = '';
		this.published = new Date();
		this.author = '';
		this.link = '';
		// Initiate PFeedItem
		$super(elementItem);
		if(Object.isElement(elementItem)) {
			this.parse(elementItem);
		} else {
			this.copy(elementItem);
		}
	},
	/**
	 * @function
	 * @name PAtomItem#parse
	 * @description Extracts the PFeedItem parameter values from the XML DOM.
	 * @param elementItem {Element} The XML DOM node to extract information from.
	 */
	parse: function(elementItem) {
		this.id = document.evaluate("./Atom:id/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = document.evaluate("./Atom:title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.published = new Date(document.evaluate("./Atom:published/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue);
		this.author = document.evaluate("./Atom:author/Atom:name/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		//this.link = document.evaluate("string(./Atom:link[@href])", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		// Regenerate the key
		this.generateKey();
	}
});
