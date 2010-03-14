function SplashAssistant(db) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.db = db;
	// Give a status on the screen
	this.status = $('status-text');
	this.status.update("Connecting to Database");
}

SplashAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */

	/* setup widgets here */

	/* add event handlers to listen to events from widgets */
};

SplashAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

	// Connect to database, asyncronous call
	this.db.connectToDatabase();
};

SplashAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

SplashAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
	   Mojo.Log.info("[SplashAssistant.cleanup] Peace. I'm out!");
};


SplashAssistant.prototype.handleCommand = function(event) {
	switch(event.type) {
		case PodcastStorage.PodcastListStartUpdate:
			break;
		case PodcastStorage.PodcastListFinishUpdate:
			break;
		case PodcastStorage.FirstRun:
			Mojo.Log.info("[SplashAssistant.FirstRun]");
			break;
		case PodcastStorage.ConnectionToDatabase:
			Mojo.Log.info("[SplashAssistant.ConnectionToDatabase]");
			this.status.update("Loading the Database.");
			//// Start the scene
			//this.controller.pushScene({
			//	name: "main",
			//	transition: Mojo.Transition.zoomFade
			//}, this.db);
			//// Make screen rotatable
			//this.controller.setWindowOrientation("free");
			this.db.loadDatabase();
			break;
		case PodcastStorage.FailedConnectionToDatabase:
			this.status.update("Connection to the database failed. " + event.error.message);
			break;
		case PodcastStorage.LoadingDatabaseSuccess:
			this.status.update("Database was successfully loaded.");
			break;
		case PodcastStorage.LoadingDatabaseFailure:
			this.status.update("There was a problem loading information from the database. " + event.error.message);
			break;
	}
};
