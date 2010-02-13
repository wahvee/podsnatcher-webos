function MainAssistant(db) {
}

MainAssistant.prototype = {
	setup: function() {
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}
};