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
	parse: function(elementItem) {
		this.id = document.evaluate("./Atom:id/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = document.evaluate("./Atom:title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.published = new Date(document.evaluate("./Atom:published/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue);
		this.author = document.evaluate("./Atom:author/Atom:name/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		//this.link = document.evaluate("string(./Atom:link[@href])", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

		// Regenerate the key
		this.generateKey();
	},
	nsResolver: function(prefix) {
		prefix = prefix.toLowerCase();
		var ns = {
			"atom": "http://www.w3.org/2005/Atom"
		}
		return ns[prefix] || null;
	}
});
