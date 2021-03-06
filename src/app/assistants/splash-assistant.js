function SplashAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

SplashAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	// Give a status on the screen
	this.status = this.controller.get('status-text');
	this.status.update($L("Connecting to Database"));

	/* setup widgets here */

	/* add event handlers to listen to events from widgets */
};

SplashAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

	// Connect to database, asyncronous call
	AppAssistant.db.connectToDatabase();
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
		case Migrator.Migration:
			Mojo.Log.info("[SplashAssistant.Migration] Migrating to DB version: %s", event.version);
			break;
		case Migrator.FinishMigration:
			this.status.update($L("Loading the Database."));
			AppAssistant.db.loadDatabase();
			break;
		case Migrator.MigrationError:
			this.status.update($L("Connection to the database failed. ") + event.error.message);
			break;
		case PodcastStorage.LoadingDatabaseSuccess:
			this.status.update($L("Database was successfully loaded."));
			break;
		case PodcastStorage.LoadingDatabaseFailure:
			this.status.update($L("There was a problem loading information from the database. ") + event.error.message);
			break;
	}
};
