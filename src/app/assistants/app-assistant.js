function AppAssistant() {
	Mojo.Log.info("Here!");
	AppAssistant.showNowPlaying = false;
};

AppAssistant.prototype.setup = function(event) {
	Mojo.Log.info("Now here!");
};

AppAssistant.prototype.handleLaunch = function(event) {
	Mojo.Log.info ("[AppAssistant.handleLaunch] %s", event);
};
