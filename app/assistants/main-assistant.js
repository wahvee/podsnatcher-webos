function MainAssistant(argFromPusher) {
	this.podcastList_ctrl = undefined;
	//this.podcast = new Podcast('http://www.wdwradio.com/xml/wdwradio.xml');
	this.podcast = new Podcast('http://revision3.com/diggnation/feed/MP3');
}

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);
		
		// Get the list on the screen
		this.podcastList_ctrl = this.controller.get('podcastList');
		//this.podcast.updateFeed();
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}
};