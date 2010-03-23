function StageAssistant() {
	AppAssistant.db = new PodcastStorage("podSnatcherDb");
}

StageAssistant.prototype.setup = function() {
	this.controller.pushCommander(AppAssistant.db);

	// Push the splash screen onto the stage
	this.controller.pushScene({
		name: "now-playing-audio",
		transition: Mojo.Transition.zoomFade
	});
	this.controller.setWindowOrientation("free");
};

// handleCommand - Setup handlers for menus:
StageAssistant.prototype.handleCommand = function(event) {
	var currentScene = this.controller.activeScene();
	switch(event.type) {
		case PodcastStorage.LoadingDatabaseSuccess:
			this.controller.swapScene({
				name: "main",
				transition: Mojo.Transition.zoomFade
			});
			break;
		case Mojo.Event.commandEnable:
			if(event.command === 'palm-help-cmd') {
				event.stopPropagation();
			}
			break;
		case Mojo.Event.command:
			switch(event.command) {
				case 'palm-prefs-cmd':
					break;
				case 'palm-help-cmd':
					this.controller.pushAppSupportInfoScene();
					break;
				case 'do-refresh-all':
					// Unload all scenes and then load the login scene
					//this.controller.popScenesTo(undefined, undefined, undefined);
					break;
				case 'do-add-remove':
					// Start the add remove buttons
					this.controller.pushScene({
						name: "add-remove",
						transition: Mojo.Transition.zoomFade
					});
					break;
				default:
					Mojo.Log.error("There was an un-recognized app menu command. %s", event.command);
					break;
			}
			break;
		default:
			Mojo.Log.info("[StageAssistant.handleCommand] Not handling %s", event.type);
			break;
	}
};
