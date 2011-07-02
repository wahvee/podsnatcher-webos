/**
 *
 */
function SearchXmlError(xml) {
	var message = "";

	/**
	 * Reads the XML error message and then displays the error.
	 */
	var parse = function(xml) {
		message = xml.evaluate("Error/Message/text()", xml, this.nsResolver, XPathResult.STRING_TYPE, null).stringValue;
	}

	this.Message = function() {
		return message;
	}

	parse(xml);
};
