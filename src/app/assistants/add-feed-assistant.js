function AddFeedAssistant(sceneAssistant) {
	this.sceneAssistant = sceneAssistant;
}

AddFeedAssistant.prototype.setup = function(widget) {
	this.widget = widget;
	this.okButton = this.sceneAssistant.controller.get('ok-button'); // Same as $('ok-button')
	this.errorDialog = this.sceneAssistant.controller.get('error-dialog');
	this.errorMessage = this.sceneAssistant.controller.get('error-message');
	this.title = this.sceneAssistant.controller.get('palm-dialog-title');
	this.textField = this.sceneAssistant.controller.get('new-feed-url');
	// set title
	this.title.update($L("Add New Podcast"));
	// Remove the error message from the screen
	this.cleanError();
	// Setup text field for the new podcast URL
	this.sceneAssistant.controller.setupWidget("new-feed-url",
		this.urlAttributes = {
			property: "value",
			hintText: $L("http://"),
			focus: false,
			changeOnKeyPress: true,
			limitResize: true,
			textReplacement: false,
			enterSubmits: false
		},
		this.urlModel = {value : ""}
	);
	// Setup button and event handler
	this.okButtonModel = {
		buttonLabel: $L('Add Feed'),
		disabled: false
	};
	this.sceneAssistant.controller.setupWidget("ok-button",
		{ type: Mojo.Widget.activityButton },
		this.okButtonModel
	);
	Mojo.Event.listen(this.okButton, Mojo.Event.tap, this.validateAndAdd.bindAsEventListener(this));
	Mojo.Event.listen(this.textField, Mojo.Event.propertyChange, this.prependHttp.bindAsEventListener(this));
};

AddFeedAssistant.prototype.prependHttp = function(event) {
	//{model:model, property:property, value:value, oldValue: oldValue, originalEvent: originalEvent}
	if(event.oldValue.blank()) {
		this.urlModel.value = "http://" + event.value;
		this.sceneAssistant.controller.modelChanged(this.urlModel);
		event.target.mojo.setCursorPosition(8,8);
	}
}

/**
 * This method should check to see if what was typed in was a valid URL. If
 * it is then tries to add it to the database.
 */
AddFeedAssistant.prototype.validateAndAdd = function() {
	// Check that the value typed in is a valid url
	if(this.urlModel.value.isUrl()) {
		// Now try creating a new podcast from the URL
		var added = AppAssistant.db.addNewPodcast(this.urlModel.value, "", true, 0);
		// If no hash is returned then the podcast was already in the database.
		if(!added) {
			this.showError($L("Podcast already in database."));
			this.okButton.mojo.deactivate();
		}
	} else {
		this.showError($L("Invalid URL."));
		this.okButton.mojo.deactivate();
	}
};

/**
 * Clears any error from the screen.
 */
AddFeedAssistant.prototype.cleanError = function() {
	this.errorDialog.hide();
	this.errorMessage.update("");
};

/**
 * Displays an error message on the screen.
 * @param message {String} The error to be displayed.
 */
AddFeedAssistant.prototype.showError = function(message) {
	this.cleanError();
	if(message === undefined) { message = $L("Generic error."); }
	this.errorDialog.show();
	// Put message into the HTML
	this.errorMessage.update(message);
};

/**
 * Listen for the events from the sub-system regarding the podcasts updating.
 */
AddFeedAssistant.prototype.handleCommand = function(command) {
	switch(command.type) {
		case Podcast.PodcastUpdateFailure:
			this.showError($L("URL did not contain a feed. ") + command.message);
			this.okButton.mojo.deactivate();
			AppAssistant.db.deletePodcast(command.podcast.key);
			break;
		case Podcast.PodcastUpdateSuccess:
			this.okButton.mojo.deactivate();
			this.cleanError();
			this.widget.mojo.close();
			break;
	}
}

AddFeedAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.okButton, Mojo.Event.tap, this.validateAndAdd.bindAsEventListener(this));
	Mojo.Event.stopListening(this.textField, Mojo.Event.propertyChange, this.prependHttp.bindAsEventListener(this));
}
