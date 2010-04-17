function AddFeedAssistant(sceneAssistant) {
	this.sceneAssistant = sceneAssistant;
}

AddFeedAssistant.prototype.setup = function(widget) {
	this.widget = widget;

	// Setup text field for the new feed's URL
	//
	this.sceneAssistant.controller.setupWidget("newFeedURL",
		this.urlAttributes = {
			property: "value",
			hintText: "RSS or ATOM feed",
			focus: true,
			limitResize: true,
			textReplacement: false,
			enterSubmits: false
		},
		this.urlModel = {value : ""}
	);

	// Setup button and event handler
	//
	this.sceneAssistant.controller.setupWidget("okButton",
		this.attributes = {},
		this.model = {
			buttonLabel: "Add Feed",
			buttonClass: "addFeedButton",
			disabled: false
		}
	);

	Mojo.Event.listen($('okButton'), Mojo.Event.tap, this.validateAndAdd.bindAsEventListener(this));
};

// ------------------------------------------------------------------------
// Add Feed Functions
//
// validateAndAdd - called when Add feed OK button is clicked
//
AddFeedAssistant.prototype.validateAndAdd = function() {
	Mojo.Log.info("I'm here!");
	var added = AppAssistant.db.addNewPodcast(this.urlModel.value, "", true, 0);
	if(added) {
		AppAssistant.db.updatePodcast();
	} else {
		
	}
};
