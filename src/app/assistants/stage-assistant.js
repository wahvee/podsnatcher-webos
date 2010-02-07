function StageAssistant() {
	this.db = new PodcastStorage();
	this.db.addEventListener(PodcastStorage.LoadingDatabaseSuccess, this.podcastListFilled.bind(this));
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
	// The stage no longer needs to listen for updates to the database
	this.db.removeEventListener(PodcastStorage.LoadingDatabaseSuccess, this.podcastListFilled.bind(this));
	
	// Start the scene
	this.controller.pushScene({name: "main", disableSceneScroller: true}, this.db);
	this.controller.setWindowOrientation("free");
};