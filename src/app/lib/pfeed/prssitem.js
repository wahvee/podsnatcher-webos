var PRssItem = Class.create(PFeedItem, {
	id: '',
	title: '',
	description: '',
	published: '',
	updated: '',
	author: '',
	link: '',
	initialize: function($super, elementItem) {
		// Initialize PFeedItem
		$super(elementItem);
		if(Object.isElement(elementItem)) {
			this.parse(elementItem);
		}
	},
	parse: function(elementItem) {
		this.id = document.evaluate("./guid/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = document.evaluate("./title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.description = document.evaluate("./description/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.published = document.evaluate("./pubDate/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.updated = document.evaluate("./pubDate/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.author = document.evaluate("./author/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.link = document.evaluate("./link/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		
		// PODCAST ENCLOSURES
		this.enclosure = document.evaluate("./enclosure/@url", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.enclosureLength = document.evaluate("./enclosure/@length", elementItem, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
		this.enclosureType = document.evaluate("./enclosure/@type", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	}
});