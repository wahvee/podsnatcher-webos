function AddRemoveAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */

	this.podcastListAttributes = {
		itemTemplate: "add-remove/podcastListItemTemplate",
		swipeToDelete: true,
		hasNoWidgets: true,
		addItemLabel: $L("Add New Podcast")
	};

	this.podcastListModel = {
		items: AppAssistant.db.listOfPodcasts
	};
}

AddRemoveAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */

	/* setup widgets here */
	try {
		Mojo.Controller.stageController.setWindowOrientation("up");
		this.controller.setupWidget("podcastList", this.podcastListAttributes, this.podcastListModel);
		this.controller.setupWidget(Mojo.Menu.appMenu, appMenuAttr, addRemoveMenuModel);
	} catch(func_error) {
		Mojo.Log.error("[Create Widgets] %s", func_error.message);
	}

	/* add event handlers to listen to events from widgets */
	try {
		this.controller.listen("podcastList", Mojo.Event.listTap, this.handleListTap.bindAsEventListener(this));
		this.controller.listen("podcastList", Mojo.Event.listAdd, this.handleListAdd.bindAsEventListener(this));
		//this.controller.listen("podcastList", Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));
	} catch(func_error) {
		Mojo.Log.error("[Listening Setup] %s", func_error.message);
	}
};

AddRemoveAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

AddRemoveAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

AddRemoveAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
};

/**
 * Does nothing.
 */
AddRemoveAssistant.prototype.handleListTap = function(event) {
	event.stop();
	//Mojo.Log.info("[AddRemoveAssistant.handleListTap]");
};

/**
 * Pop-up and ask for podcast location. Then create the podcast
 */
AddRemoveAssistant.prototype.handleListAdd = function(event) {
	event.stop();
	Mojo.Log.info("[AddRemoveAssistant.handleListTap]");

	// Change the model
	this.controller.modelChanged(this.podcastListModel);
};

/**
 * Remove the items from the db. Update display to reflect changes.
 */
AddRemoveAssistant.prototype.handleListDelete = function(event) {
	event.stop();
	AppAssistant.db.deletePodcast(event.item.key);

	// Notify that index was removed
	// Updates the display
	this.controller.get("podcastList").mojo.noticeRemovedItems(event.index, 0);
};