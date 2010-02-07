function StageAssistant() {
	this.db = new PodcastStorage(this.podcastListFilled.bind(this));
}

StageAssistant.prototype.setup = function() {
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype] %s", version_error.message);
	}
};

StageAssistant.prototype.podcastListFilled = function() {
	Mojo.Log.info("[StageAssistant] Podcast list updated.");
	this.controller.pushScene({name: "main", disableSceneScroller: true}, this.db);
	this.controller.setWindowOrientation("free");
};