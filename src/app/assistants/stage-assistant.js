function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype] %s", version_error.message);
	}
	
	this.controller.pushScene({name: "stage", disableSceneScroller: true});
	//this.controller.setWindowOrientation("free");
	//'http://www.wdwradio.com/xml/wdwradio.xml'
	//'http://revision3.com/diggnation/feed/MP3'
};