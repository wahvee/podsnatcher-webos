function AppAssistant(appController, params) {
	AppAssistant.PodcastDownloadStage = "PodcastDownload";
	AppAssistant.PodcastDownloadFinishStage = "PodcastFinished";
	AppAssistant.showNowPlaying = false;
}

AppAssistant.prototype.setup = function(event) {
	// Test that MD5 is working properly.
	if (!md5_vm_test()) {
		Mojo.Log.error("[MD5] Failed");
	} else {
		Mojo.Log.info("[MD5] Passed");
	}
	try {
		Mojo.Log.info("[Prototype] %s", Prototype.Version);
	} catch(version_error) {
		Mojo.Log.error("[Prototype] %s", version_error.message);
	}
};

/**
 * Called when the App is being distroyed.
 */
AppAssistant.prototype.cleanup = function() {
	// Clean-up all of the event listeners for the HTML5 Audio object
	//this.controller.get("audio-element").stopObserving();
};

AppAssistant.prototype.handleLaunch = function(launchParams) {
	// Get stage controller
	var stageController = Mojo.Controller.stageController;

	// No parameters
	if (launchParams.blank()) {
		// Check if the user just clicked the icon again
		if (stageController) {
			stageController.activate();
		}
	}
};

AppAssistant.prototype.handleLaunchParams = function(launchParams) {
	Mojo.Log.info("[AppAssistant.handleLaunchParams] %s", (launchParams.blank()) ? "launchParams is blank" : launchParams);

};

// Add a menu items for the main screen
AppAssistant.appMenuAttr = {
	omitDefaultItems: true
};
AppAssistant.appMenuModel = {
	visible: true,
	items: [
		/*Mojo.Menu.editItem,*/
		{
		label: $L("Podcast Actions"),
		toggleCmd: 'podcast-actions',
		items: [
			{
			label: $L("Add/Remove Podcasts ..."),
			command: 'do-add-remove'
		},
			{
			label: $L("Update All Podcasts"),
			command: 'do-refresh-all'
		}/*,
			{
			label: $L("Refresh Album Art"),
			disabled: true,
			command: 'refresh-all-album-art'
		}*/
			]
	},
		{
		label: $L("Filter List"),
		toggleCmd: 'filter-list',
		items: [
			{
			label: $L("Unheard"),
			command: 'set-show-new'
		},
			{
			label: $L("Listened"),
			command: 'set-show-old'
		},
			{
			label: $L("Downloaded"),
			command: 'set-show-downloaded'
		}
			]
	},
		{
		label: $L("Quick Guide"),
		command: 'quick-guide'
	},
		/*Mojo.Menu.prefsItem,*/
		Mojo.Menu.helpItem
		]
};

AppAssistant.standardModel = {
	visible: true,
	items: [
		{
			label: $L("Quick Guide"),
			command: 'quick-guide'
		},
		Mojo.Menu.helpItem
		]
};
