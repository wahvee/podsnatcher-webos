function MainAssistant(argFromPusher) {
	this.podcastList_ctrl;
	this.podcast = new Podcast('http://www.wdwradio.com/xml/wdwradio.xml');
};

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);
		
		// Get the list on the screen
		this.podcastList_ctrl = this.controller.get('podcastList');
		this.podcast.updateFeed();
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}
};