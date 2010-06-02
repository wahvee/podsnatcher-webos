function AddFeedAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.isSearch = true;
	this.searchOrUrlChangeListener = this.handleSearchOrUrlChange.bindAsEventListener(this);
	this.searchSelectionListener = this.handleSearchSelection.bindAsEventListener(this);
	this.btnPressListener = this.handleBtnPress.bindAsEventListener(this);

	this.search = new Search();
}

AddFeedAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	this.errorDialog = this.controller.get('error-dialog');
	this.errorMessage = this.controller.get('error-message');

	// Hide the error message area
	this.cleanError();

	this.searchResultsList = this.controller.get("search-results-list");
	this.searchResultsListModel = {items: []};

	this.textSearch = this.controller.get("search-or-url");
	this.textSearchModel = {
		value: "",
		disabled: false
	};

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */

	/* setup widgets here */
	this.controller.setupWidget("search-or-url",
		{
			multiline: false,
			autoReplace: false,
			textCase: Mojo.Widget.steModeLowerCase,
			enterSubmits: true,
			changeOnKeyPress: true,
			focus: false
		},
		this.textSearchModel
	);

	this.searchBtn = this.controller.get("search-btn");
	this.controller.setupWidget("search-btn",
		{type: Mojo.Widget.activityButton},
		this.searchBtnModel = {
			label : $L("Search"),
			disabled: false
		}
	);

	this.controller.setupWidget ("search-results-list",
		{
			itemTemplate: "add-feed/searchResultsListItemTemplate",
			listTemplate: "add-feed/searchResultsListTemplate",
			swipeToDelete: false,
			renderLimit: 40,
			reorderable: false
		},
		this.searchResultsListModel
	);

	/* add event handlers to listen to events from widgets */
};

AddFeedAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	Mojo.Event.listen(this.textSearch, Mojo.Event.propertyChange, this.searchOrUrlChangeListener);
	Mojo.Event.listen(this.searchResultsList, Mojo.Event.listTap, this.searchSelectionListener);
	this.controller.document.addEventListener("keyup", this.btnPressListener, true);
	Mojo.Event.listen(this.searchBtn, Mojo.Event.tap, this.btnPressListener);
};

AddFeedAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	//Mojo.Event.listen(this.textSearch, Mojo.Event.propertyChange, this.searchOrUrlChangeListener);
	//Mojo.Event.listen(this.searchResultsList, Mojo.Event.listTap, this.searchSelectionListener);
	//this.controller.document.addEventListener("keyup", this.btnPressListener, true);
	//Mojo.Event.listen(this.searchBtn, Mojo.Event.tap, this.btnPressListener);
};

AddFeedAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
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
 * Used to clear the search results list.
 */
AddFeedAssistant.prototype.clearList = function() {
	this.searchResultsListModel.items.clear();
	this.controller.modelChanged(this.searchResultsListModel);
};

/**
 * Handles the Mojo.Event.propertyChange event sent by the search-or-url
 * TextField inside this scene.
 */
AddFeedAssistant.prototype.handleSearchOrUrlChange = function(event) {
	//event.value;
	//event.oldValue;
	// Test to see
	var url = event.value;
	if(!url.isUrl()) {
		url = "http://" + url;
	}
	if(url.isUrl() && !this.searchBtnModel.disabled) {
		this.isSearch = false;
		this.searchBtnModel.label = $L("Add Feed");
		this.controller.modelChanged(this.searchBtnModel);
	} else if(!url.isUrl() && !this.isSearch) {
		this.isSearch = true;
		this.searchBtnModel.label = $L("Search");
		this.controller.modelChanged(this.searchBtnModel);
	}
};

/**
 * Handles the Mojo.Event.keyup event sent by the document when the
 * enter button is pressed while in the search TextField.
 */
AddFeedAssistant.prototype.handleBtnPress = function(event) {
	// Check if it was the enter key
	if(Mojo.Char.isEnterKey(event.keyCode) || event.type === Mojo.Event.tap) {
		this.cleanError();
		this.clearList();
		this.searchBtn.mojo.activate();
		// Check if we need to search, or do something else
		if(this.isSearch) {
			this.search.search(this.textSearchModel.value);
		} else {
			var url = this.textSearchModel.value;
			if(!url.isUrl()) {
				url = "http://" + url;
			}
			var response = AppAssistant.db.addNewPodcast(url);
			// Check to see if the podcast will be added
			if(!response) {
				this.handleCommand({type: Podcast.PodcastUpdateFailure});
			}
		}
	}
};

/**
 * Handles the Mojo.Event.listTap event sent by the List when the
 * user makes the selection of which podcast to add.
 */
AddFeedAssistant.prototype.handleSearchSelection = function(event) {
	Mojo.Log.info("[AddFeedAssistant.handleSearchSelection] The title selected is: %s", event.item.title);
	this.cleanError();
	AppAssistant.db.addNewPodcast(event.item.url);
};

/**
 * Handles commands sent using the Mojo SDK command stack.
 */
AddFeedAssistant.prototype.handleCommand = function(command) {
	switch(command.type) {
		case Podcast.PodcastUpdateFailure:
			this.searchBtn.mojo.deactivate();
			this.showError($L("URL did not contain a feed. "));
			break;
		case Podcast.PodcastXMLDownloadComplete:
			this.controller.stageController.popScene();
			break;
		case Search.SearchCompleted:
			this.searchBtn.mojo.deactivate();
			this.searchResultsListModel.items = command.results;
			this.controller.modelChanged(this.searchResultsListModel);
			break;
		case Search.SearchError:
			this.searchBtn.mojo.deactivate();
			this.showError(command.error.message);
			this.clearList();
			break;
	}
};
