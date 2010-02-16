function StageAssistant() {
	this.db = new PodcastStorage();
	this.db.addEventListener(PodcastStorage.ConnectionToDatabase, this.connectionToDatabase.bind(this));
	this.db.addEventListener(PodcastStorage.FailedConnectionToDatabase, this.connectionToDatabaseFailed.bind(this));
	this.standardMenuAttr = undefined;
	this.standardMenuModel = undefined;
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
	standardMenuAttr = {omitDefaultItems: true};
	standardMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			Mojo.Menu.prefsItem,
			{label: "Refresh All", command: 'do-refresh-all'},
			Mojo.Menu.helpItem
		]
	};
	
	this.db.connectToDatabase();
};

StageAssistant.prototype.connectionToDatabase = function() {
	Mojo.Log.info("[StageAssistant] Connection to DB.");
	// The stage no longer needs to listen for updates to the database
	this.db.removeEventListener(PodcastStorage.ConnectionToDatabase, this.connectionToDatabase.bind(this));
	this.db.removeEventListener(PodcastStorage.FailedConnectionToDatabase, this.connectionToDatabaseFailed.bind(this));
	// Start the scene
	this.controller.pushScene({name: "main"}, this.db);
	// Make screen rotatable
	this.controller.setWindowOrientation("free");
};

StageAssistant.prototype.connectionToDatabaseFailed = function(error) {
	Mojo.Log.error("[StageAssistant] Connection to DB not made.");
	// The stage no longer needs to listen for updates to the database
	this.db.removeEventListener(PodcastStorage.ConnectionToDatabase, this.connectionToDatabase.bind(this));
	this.db.removeEventListener(PodcastStorage.FailedConnectionToDatabase, this.connectionToDatabaseFailed.bind(this));
	//Mojo.Controller.errorDialog("[" + error.code + "] " + error.message);
	$('stageError').innerHTML = "[" + error.code + "] " + error.message;
};

// handleCommand - Setup handlers for menus:
StageAssistant.prototype.handleCommand = function(event) {
	var currentScene = this.controller.activeScene();
	if(event.type == Mojo.Event.command) {
		switch(event.command) {
			case 'do-refresh-all':
				// Unload all scenes and then load the login scene
				this.controller.popScenesTo(undefined, undefined, undefined);
			break;
			case 'do-other-command':
				Mojo.Log.error("Don't know how this is working!");	
			break;
			default:
				Mojo.Log.error("There was an un-recognized app menu command.");
			break;
		}
	}
};