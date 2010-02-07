function MainAssistant(db) {
	this.db = db;
	this.podcastList_ctrl = undefined;
}

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);
		
		// Get reference to the list on the screen
		this.podcastList_ctrl = this.controller.get('podcastList');
		
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}
};