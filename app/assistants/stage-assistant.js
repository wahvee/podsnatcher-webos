function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
		Mojo.Log.info("[jQuery] %s", $().jquery);
	} catch(version_error) {
		Mojo.Log.error("[Prototype or jQuery Error] %s", version_error.message);
	}
	
	this.controller.pushScene({name: "main", disableSceneScroller: true});
	this.controller.setWindowOrientation("free");
};