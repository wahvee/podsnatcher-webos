function StageAssistant() {
	this.db = new PodcastStorage(this.podcastListFilled.bind(this));
}

StageAssistant.prototype.setup = function() {
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype] %s", version_error.message);
	}
	
	//this.controller.pushScene({name: "main", disableSceneScroller: true});
	//this.controller.setWindowOrientation("free");
};

StageAssistant.prototype.podcastListFilled = function() {
	Mojo.Log.info("[StageAssistant] Podcast list updated.");
};