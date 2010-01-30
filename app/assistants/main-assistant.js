function MainAssistant(argFromPusher) {
	// Get the list on the screen
	this.podcastList_ctrl = this.controller.get('podcastList');
	this.podcast = new Podcast('http://www.wdwradio.com/xml/wdwradio.xml');
	Mojo.Log.logProperties(this.podcast);
};

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);
		this.LoadPodcasts();
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	}	
};

MainAssistant.prototype.LoadPodcasts = function() {
	
};