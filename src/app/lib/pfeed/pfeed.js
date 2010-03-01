/* PFeed : Prototype feed parser plugin
 * Copyright (C) 2010 Ryan Lovelett - http://www.wahvee.com/
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 * @base
 */
var PFeed = Class.create({
    type: '',
    evaluator: new XPathEvaluator(),
    initialize: function(xmlObj) {
        try{
            if(xmlObj) {
                this.parse(xmlObj);
            }
        } catch(error) {
            Mojo.Log.error("[PFeed Constructor] %s", error.message);
        }
    },
    parse: function(xmlObj) {
        // Determine if this is RSS or Atom
        var result = this.evaluator.evaluate('//feed', xmlObj, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        
        Mojo.Log.logProperties(result);
    }
});