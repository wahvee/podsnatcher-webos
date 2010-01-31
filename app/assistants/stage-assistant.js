function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
	//jQuery.noConflict();
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype or jQuery Error] %s", version_error.message);
	}
	
	this.controller.pushScene({name: "main", disableSceneScroller: true});
	this.controller.setWindowOrientation("free");
};