// Returns true if property exists, false otherwise.
if(typeof Object.hasOwnProperty !== 'function') {
	console.log("[Object.hasOwnProperty] is not defined.");
	Object.prototype.hasOwnProperty = function(property) {
	    return typeof(this[property]) !== 'undefined';
	};
} else {
	console.log("[Object.hasOwnProperty] is defined.");
}