function MainAssistant(db) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.screenWidth = Mojo.Environment.DeviceInfo.screenWidth;
	this.screenHeight = Mojo.Environment.DeviceInfo.screenHeight;
	
	Mojo.Log.info("[MainAssistant] Screen size is: %sx%s", this.screenWidth, this.screenHeight);
	
	this.episodeListAttributes = {
		listTemplate: "main/episodeListTemplate",
		itemTemplate: "main/episodeListItemTemplate",
		swipeToDelete: false,
		renderLimit: 15,
		reorderable: false
	};
	
	this.episodeListModel = {
		items: [
			{title: "Episode 1 is really cool live it! Yeah@@ like it so much you should try", length: "01:13:01:01:13:01:01:13:01"},
			{title: "Episode 2", length: "01:13:01"},
			{title: "Episode 3", length: "01:13:01"},
			{title: "Episode 4", length: "01:13:01"},
			{title: "Episode 5", length: "01:13:01"},
			{title: "Episode 6", length: "13:01"},
			{title: "Episode 7", length: "13:01"},
			{title: "Episode 8", length: "13:01"},
			{title: "Episode 9", length: "13:01"},
			{title: "Episode 10", length: "13:01"},
			{title: "Episode 11", length: "13:01"},
			{title: "Episode 12", length: "13:01"}
		]
	};
}

MainAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	   
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	try {
		this.controller.setupWidget("episodeList", this.episodeListAttributes, this.episodeListModel);
	} catch (func_error) {
		Mojo.Log.info("[Create Widgets] %s", func_error.message);
	}
	
	/* add event handlers to listen to events from widgets */
	// Wait for screen changes
	this.controller.listen(document, 'orientationchange', this.handleOrientation.bindAsEventListener(this));
}

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

/**
 *	Make sure the screen size is always correct for whatever orientation
 *	the user has the phone in.
 */
MainAssistant.prototype.handleOrientation = function(event) {
	
}
