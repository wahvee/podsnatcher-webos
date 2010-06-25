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

		// Check to see if the MIME type is recognized
		if(!this.validMIME()) {
			var ext = this.enclosure.getExtension();
			Mojo.Log.info("[PRssItem.parse] We have an invalid MIME type. Trying to infer one from the extension: %s", ext);
			// Check to see if we recognize the file extension
			switch(ext.toLowerCase()) {
				case 'mp3':
					this.enclosureType = 'audio/mpeg';
					break;
				case 'm4v':
					this.enclosureType = 'video/mp4';
					break;
				default:
					Mojo.Log.info("[PRssItem.parse] Unfortunately, cannot infer anything. Leaving as found.");
					break;
			}
		}

		// Regenerate the key
		this.generateKey();
	}
});
