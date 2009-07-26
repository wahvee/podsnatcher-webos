function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("About to start Splash Screen!");
	this.controller.pushScene("splash-screen");
}
