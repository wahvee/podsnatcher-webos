/**
 * @extends PRssItem
 * @constructor
 * @name PMediaItem
 * @description
 * This class was created to address feeds that do not conform to the standard
 * RSS specification and use enclosure tags.
 * @see http://video.search.yahoo.com/mrss
 * @see http://projects.wahvee.com/issues/54
 */
var PMediaRssItem = Class.create(PRssItem, {
	initialize: function($super, elementItem) {
		this.thumbnail = '';
		this.thumbnailWidth = 0;
		this.thumbnailHeight = 0;
		// Initialize PRssItem
		$super(elementItem);
	},
	/**
	 * @function
	 * @name PMediaRssItem#parse
	 * @param elementItem {Element} The document element item to be parsed by XPath
	 */
	parse: function($super, elementItem) {
		try {
			this.id = document.evaluate("./guid/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.title = document.evaluate("./media:content/media:title/text() | ./title/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.description = document.evaluate("./media:content/media:description/text()  | ./description/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.published = new Date(document.evaluate("./pubDate/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue);
			this.author = document.evaluate("./author/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.link = document.evaluate("./link/text()", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.source = document.evaluate("string(./source/@url)", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

			// PODCAST ENCLOSURES
			this.enclosure = document.evaluate("./media:content/@url | ./enclosure/@url", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.enclosureLength = document.evaluate("./media:content/@duration | ./enclosure/@length", elementItem, this.nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
			this.enclosureType = document.evaluate("./media:content/@type | ./enclosure/@type", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

			// Get album art for this specific Podcast
			this.thumbnail = document.evaluate("./media:content/media:thumbnail/@url", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.thumbnailWidth = document.evaluate("./media:content/media:thumbnail/@width", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
			this.thumbnailHeight = document.evaluate("./media:content/media:thumbnail/@height", elementItem, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;

			// Try and infer a MIME based on extenstion
			this.inferMIME();

			// Regenerate the key
			this.generateKey();

			// Do not actually call this anymore
			//$super(elementItem);
		} catch (error) {
			Mojo.Log.error("[PMediaRssItem.parse] %s", error.message);
		}
	}
});
