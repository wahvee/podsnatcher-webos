function MainAssistant(db) {
	this.db = db;
	this.podcastList_ctrl = undefined;
}

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);
		
		// Add event listeners for the database
		this.db.addEventListener(PodcastStorage.PodcastStartUpdate, this.podcastUpdating.bind(this));
		this.db.addEventListener(PodcastStorage.PodcastUpdateSuccess, this.podcastUpdateSuccess.bind(this));
		this.db.addEventListener(PodcastStorage.PodcastUpdateFailure, this.podcastUpdateFailure.bind(this));
		
		// Get reference to the list on the screen
		this.podcastList_ctrl = this.controller.get('podcastList');
		
		// Populate the list with the podcasts
		this.podcastListModel.items = this.db.getPodcastList();
		this.controller.modelChanged(this.podcastListModel);
		
		this.db.updatePodcasts();
		
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}
};

// Event listener that is passed the key to the podcast that is
// about to update
MainAssistant.prototype.podcastUpdating = function(podcastKey) {
	
};

// Event listener that is passed the key to the podcast that
// has successfully updated
MainAssistant.prototype.podcastUpdateSuccess = function(podcastKey) {
	// Populate the list with the podcasts
	this.podcastListModel.items = this.db.getPodcastList();
	this.controller.modelChanged(this.podcastListModel);
};

// Event listener that is passed the key to the podcast that
// has not successfully updated
MainAssistant.prototype.podcastUpdateFailure = function(podcastKey) {
	
};