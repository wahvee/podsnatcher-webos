/**
 * @extends PFeedItem
 * @constructor
 * @name PRssItem
 * @description
 * This class was created to address feeds that conform to the RSS specification.
 */
var PRssItem = Class.create(PFeedItem, {
	initialize: function($super, elementItem) {
		this.id = '';
		this.title = '';
		this.description = '';
		this.published = new Date();
		this.author = '';
		this.link = '';
		this.source = '';
		// Initialize PFeedItem
		$super(elementItem);
		if(Object.isElement(elementItem)) {
			this.parse(elementItem);
		} else {
			this.copy(elementItem);
		}
	},
	/**
	 * @function
	 * @name PMediaRssItem#parse
	 * @param elementItem {Element} The document element item to be parsed by XPath
	 */
	parse: function(elementItem) {
		this.id = document.evaluate("./guid/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = document.evaluate("./title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.description = document.evaluate("./description/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.published = new Date(document.evaluate("./pubDate/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue);
		this.author = document.evaluate("./author/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.link = document.evaluate("./link/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.source = document.evaluate("string(./source/@url)", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		// PODCAST ENCLOSURES
		this.enclosure = document.evaluate("./enclosure/@url", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.enclosureLength = document.evaluate("./enclosure/@length", elementItem, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		this.enclosureType = document.evaluate("./enclosure/@type", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		// Try and infer a MIME based on extenstion
		this.inferMIME();

		// Regenerate the key
		this.generateKey();
	}
});
