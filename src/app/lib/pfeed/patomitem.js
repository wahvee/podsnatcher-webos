var PAtomItem = Class.create(PFeedItem, {
	id: '',
	title: '',
	published: '',
	updated: '',
	author: '',
	link: '',
	initialize: function($super, elementItem) {
		// Initiate PFeedItem
		$super(elementItem);
		if(Object.isElement(elementItem)) {
			this.parse(elementItem);
		}
	},
	parse: function(elementItem) {
		this.id = document.evaluate("./Atom:id/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.title = document.evaluate("./Atom:title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.published = document.evaluate("./Atom:published/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.updated = document.evaluate("./Atom:updated/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		this.author = document.evaluate("./Atom:author/Atom:name/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
		//this.link = document.evaluate("string(./Atom:link[@href])", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	},
	nsResolver: function(prefix) {
		prefix = prefix.toLowerCase();
		var ns = {
			"atom": "http://www.w3.org/2005/Atom"
		}
		return ns[prefix] || null;
	}
});