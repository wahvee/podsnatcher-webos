function StageAssistant() {
	this.db = new PodcastStorage();
	this.db.addEventListener(PodcastStorage.LoadingDatabaseSuccess, this.podcastListFilled.bind(this));
	this.db.addEventListener(PodcastStorage.LoadingDatabaseFailure, this.podcastListFilled.bind(this));
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
	this.controller.pushScene({name: "main"}, this.db);
	// Make screen rotatable
	this.controller.setWindowOrientation("free");
};

StageAssistant.prototype.podcastListFailed = function(error) {
	Mojo.Log.info("[StageAssistant] Podcast list not loaded.");
	// The stage no longer needs to listen for updates to the database
	this.db.removeEventListener(PodcastStorage.LoadingDatabaseSuccess, this.podcastListFilled.bind(this));
	Mojo.Controller.errorDialog("[" + error.code + "] " + error.message);
};