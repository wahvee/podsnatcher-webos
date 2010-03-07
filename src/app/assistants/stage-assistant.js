function StageAssistant() {
	this.db = new PodcastStorage("podSnatcherDb");
}

StageAssistant.prototype.setup = function() {
	// Test that MD5 is working properly.
	if(!md5_vm_test()) {
		Mojo.Log.error("[MD5] Failed");
	} else {
		Mojo.Log.info("[MD5] Passed");
	}
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype] %s", version_error.message);
	}

	// Add a menu item for user to logout
	appMenuAttr = {omitDefaultItems: true};
	appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: $L("Podcast Actions"), toggleCmd: 'podcast-actions', items: [
				{label: $L("Add/Remove Podcasts ..."), command: 'do-add-remove'},
				{label: $L("Update All Podcasts"), command: 'do-refresh-all'},
				{label: $L("Refresh Album Art"), disabled: true, command: 'refresh-all-album-art'}
			]},
			{label: $L("Filter List"), toggleCmd: 'filter-list', items: [
				{label: $L("Unheard"), command: 'set-show-new'},
				{label: $L("Listened"), command: 'set-show-old'},
				{label: $L("Downloaded"), command: 'set-show-downloaded'},
			]},
			Mojo.Menu.prefsItem,
			Mojo.Menu.helpItem
		]
	};

	addRemoveMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			Mojo.Menu.helpItem
		]
	};

	this.controller.pushCommander(this.db);
	this.db.connectToDatabase();
};

// handleCommand - Setup handlers for menus:
StageAssistant.prototype.handleCommand = function(event) {
	var currentScene = this.controller.activeScene();
	switch(event.type) {
		case Mojo.Event.commandEnable:
			if(event.command === 'palm-help-cmd') {
				event.stopPropagation();
			}
			break;
		case Mojo.Event.command:
			switch(event.command) {
				case 'palm-prefs-cmd':
					this.controller.popScene(undefined, {
						name: 'main',
						transition: Mojo.Transition.zoomFade
					});
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
					this.controller.swapScene({
						name: "add-remove",
						transition: Mojo.Transition.zoomFade
					}, this.db);
					break;
				default:
					Mojo.Log.error("There was an un-recognized app menu command. %s", event.command);
					break;
			}
			break;
		case PodcastStorage.ConnectionToDatabase:
			Mojo.Log.info("[StageAssistant] Connection to DB.");
			// Start the scene
			this.controller.pushScene({
				name: "main",
				transition: Mojo.Transition.zoomFade
			}, this.db);
			// Make screen rotatable
			this.controller.setWindowOrientation("free");
			break;
		case PodcastStorage.FailedConnectionToDatabase:
			Mojo.Log.error("[StageAssistant] Connection to DB not made.");
			//Mojo.Controller.errorDialog("[" + error.code + "] " + error.message);
			$('stageError').innerHTML = "[" + error.code + "] " + error.message;
			break;
		default:
			Mojo.Log.info("[StageAssistant.handleCommand] Not handling %s", event.type);
			break;
	}
};
