// Returns true if property exists, false otherwise.
if (typeof Object.hasOwnProperty !== 'function') {
	Mojo.Log.info("[Object.hasOwnProperty] is not defined.");
	Object.prototype.hasOwnProperty = function(property) {
		return typeof(this[property]) !== 'undefined';
	};
} else {
	Mojo.Log.info("[Object.hasOwnProperty] is defined.");
}

// Add method to Number to convert seconds {Number} to a
// string that represents HH:MM:SS
if (typeof Number.secondsToDuration !== 'function') {
	Mojo.Log.info("[Number.secondsToDuration] is not defined.");
	Number.prototype.secondsToDuration = function() {
		// divide your field by seconds per hour (60*60) => hrs
		var hour = (Math.floor(this / 3600) % 24).toPaddedString(2);
		// divide rest by seconds per minute (60) => mins
		var min = (Math.floor(this / 60) % 60).toPaddedString(2);
		// divide rest by seconds per second (1) => secs
		var sec = Math.floor(this % 60).toPaddedString(2);

		return hour + ":" + min + ":" + sec;
	};
} else {
	Mojo.Log.info("[Number.secondsToDuration] is defined.");
}

if (typeof Number.roundNumber !== 'function') {
	Mojo.Log.info("[Number.roundNumber] is not defined.");
	Number.prototype.roundNumber = function(dec) {
		return Math.round(Math.round(this * Math.pow(10, dec + 1)) / Math.pow(10, 1)) / Math.pow(10, dec);
	};
} else {
	Mojo.Log.info("[Number.roundNumber] is defined.");
}

/**
 * Function extracts a file extension from a string. It will return an empty
 * string if no extenstion can be extracted.
 * @returns {String} The extension found.
 */
String.prototype.getExtension = function() {
	var ext = /^.+\.([^.]+)$/.exec(this);
	return ext == null ? "" : ext[1];
};

// Add method to String to test if it is a valid pathname
if (typeof String.isPath !== 'function') {
	Mojo.Log.info("[String.isPath] is not defined.");
	String.prototype.isPath = function() {
		var regEx = new RegExp("/[^/]+$", "i");
		return regEx.test(this);
	};
} else {
	Mojo.Log.info("[String.isPath] is defined.");
}

// Add method to String to test if it is a valid URL
if (typeof String.isUrl !== 'function') {
	Mojo.Log.info("[String.isUrl] is not defined.");
	String.prototype.isUrl = function() {
		var regexp = /http:\/\/[A-Za-z0-9\.-]{3,}\.[A-Za-z]{2,}/;
		return regexp.test(this);
	};
} else {
	Mojo.Log.info("[String.isUrl] is defined.");
}


// Add method to Object to check if instance is a boolean
if (typeof Object.isBoolean !== 'function') {
	Mojo.Log.info("[Object.isBoolean] is not defined.");
	Object.isBoolean = function(o) {
		return typeof o === 'boolean';
	};
} else {
	Mojo.Log.info("[Object.isBoolean] is defined.");
}

function isNull(val) {
	return (val === null);
}

function createUUID() {
	// http://www.ietf.org/rfc/rfc4122.txt
	var s = [];
	var hexDigits = "0123456789ABCDEF";
	for (var i = 0; i < 32; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}
	s[12] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
	s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
	var uuid = s.join("");
	return uuid;
}

/**
 * Checks to see if an instance has any kind of value associated with
 * it. Returns false if the object is Null, Undefined, Empty or Blank.
 * Returns true otherwise.
 */
if(typeof Object.hasValue !== 'function') {
	Mojo.Log.info("[Object.hasValue] is not defined.");
	Object.hasValue = function(o) {
		if(Object.isString(o)) {
			return !(o.blank() || o.empty());
		} else if(Object.isUndefined(o) || isNull(o)) {
			return false;
		} else {
			return true;
		}
	};
} else {
	Mojo.Log.info("[Object.hasValue] is defined.");
}
