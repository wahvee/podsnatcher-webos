/*
 * JavaScript DOM to BadgerFish JSON Encoder
 *
 * Copyright (c) Gary Court 2006 (garycourt.com)
 * 
 * This code is free for use by all provided recognition to the original
 * author (Gary Court) is given.
 * 
 * Original Download: http://garycourt.com/wp-content/files/BadgerFish.js
 */

function append(baseObject, properties){
	var templateObject = {};
	for(var x in properties){
		if(typeof templateObject[x] == "undefined" || templateObject[x] != properties[x]) {
			if (baseObject[x]) {
				if (!Object.isArray(baseObject[x]))
					baseObject[x] = [ baseObject[x] ];
				baseObject[x].push(properties[x]);
			} else {
				baseObject[x] = properties[x];
			}
		}
	}
	return baseObject;
}

function encode(domNode) {
	var result;
	
	switch (domNode.nodeType) {
		case Node.ELEMENT_NODE:
			result = {};
			var parent = result[domNode.nodeName] = {};
			for (var x = 0; x < domNode.attributes.length; x++) {
				var attribute = domNode.attributes[x];
				parent['@'+attribute.name] = attribute.value;
			}
			for (var x = 0; x < domNode.childNodes.length; x++) {
				var child = encode(domNode.childNodes[x]);
				append(parent, child);
			}
			break;
		
		case Node.ATTRIBUTE_NODE:
			result = {};
			result['@'+domNode.name] = domNode.value;
			break;
		
		case Node.TEXT_NODE:
		case Node.CDATA_SECTION_NODE:
			result = {};
			result['$'] = domNode.nodeValue;
			break;
		
		case Node.COMMENT_NODE:
			//ignore
			break;
		
		case Node.DOCUMENT_NODE:
		case Node.DOCUMENT_FRAGMENT_NODE:
			result = encode(domNode.firstChild);
			break;
		
		default:  //FIXME: Debugging purposes only
			throw new Error('Unknown node type: '+domNode);
			break;
	}   
	return result;
}
