function MainAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the
	 * additional parameters (after the scene name) that were passed to pushScene. The reference
	 * to the scene controller (this.controller) has not be established yet, so any initialization
	 * that needs the scene controller should be done in the setup function below. */
	// Set the display to show new podcasts only
	this.sceneUpdateTimer = undefined;
	this.mode = MainAssistant.ListMode.New;
	this.videoPlayer = {};
	this.screenWidth = Mojo.Environment.DeviceInfo.screenWidth;
	this.screenHeight = Mojo.Environment.DeviceInfo.screenHeight;
	this.animationFinish = 500;
	this.animationDuration = 0.25;
	this.animationType = 'ease-in';

	this.nowPlayingKey = '';
	this.nowPlayingNode = undefined;

	this.downloadingPercentage = new $H();

	this.spinnerAttributes = {
		spinnerSize: Mojo.Widget.spinnerLarge
	};

	this.spinnerModel = {
		spinning: false
	};

	this.episodeListAttributes = {
		itemTemplate: "main/episodeListItemTemplate",
		swipeToDelete: true,
		hasNoWidgets: true,
		onItemRendered: this.listItemRender.bind(this),
		onItemRemoved: this.listItemRemoved.bind(this)
	};

	this.episodeListModel = {
		items: []
	};

	// Setting up the event listener callbacks
	this.downloadFunction = this.handleItemDownload.bind(this);
	this.timerUpdateSceneHandler = this.updateSceneOnTimer.bindAsEventListener(this);
}

MainAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	this.podcastCount = this.controller.get('podcast-count');
	this.albumArtDiv = this.controller.get('album-art');
	this.headerDiv = this.controller.get('header');

	// Setup the container to do the drop positioning (keeps it within the bounds)
	Mojo.Drag.setupDropContainer(this.headerDiv, this);

	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */

	/* setup widgets here */
	try {
		//this.videoPlayer = this.controller.get('video-object');
		//this.videoPlayer = VideoTag.extendElement(this.videoPlayer, this.controller);
		this.audioPlayer = this.controller.get("audio-element");

		this.controller.setupWidget("updatingSpinner", this.spinnerAttributes, this.spinnerModel);
		this.controller.setupWidget("episodeList", this.episodeListAttributes, this.episodeListModel);
		this.controller.setupWidget(Mojo.Menu.appMenu, AppAssistant.appMenuAttr, AppAssistant.appMenuModel);
	} catch (func_error) {
		Mojo.Log.error("[Create Widgets] %s", func_error.message);
	}

	/* add event handlers to listen to events from widgets */
	try {
		// Listen for user to flick the album-art to change podcasts
		this.controller.listen(this.controller.get('album-art-area-right'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.listen(this.controller.get('album-art-area-left'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		//this.controller.listen(this.albumArtDiv, Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.listen(this.albumArtDiv, Mojo.Event.dragStart, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.listen(this.albumArtDiv, Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.listen(this.albumArtDiv, Mojo.Event.tap, this.handleAlbumArtTap.bindAsEventListener(this));
		this.controller.listen(this.controller.get('episodeList'), Mojo.Event.listTap, this.handleListClick.bindAsEventListener(this));
		this.controller.listen(this.controller.get('episodeList'), Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));
	} catch(eventErrors) {
		      Mojo.Log.error("[MainAssistant.setup] %s", eventErrors.message);
	}
};

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	try {
		Mojo.Controller.stageController.setWindowOrientation("free");
		// Wait for screen orientation changes
		this.controller.listen(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
		this.controller.listen(document, "shakeend", this.handleShaking.bindAsEventListener(this));
		// Start the time update if playing
		if(this.isPlaying()) {
			this.timerToggle('start');
		}
		// Update the display
		this.podcastDisplayUpdate();
		// Check if the DB needs to be forced to update
		if(AppAssistant.db.requiresUpdate) {
			AppAssistant.db.updatePodcasts();
		}
	} catch(eventErrors) {
		Mojo.Log.error("[MainAssistant.activate] %s", eventErrors.message);
	}
};


MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.audioPlayer.stopObserving(Media.Event.TIMEUPDATE, this.audioEventListener);
};

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	a result of being popped off the scene stack */

	try {
		this.controller.stopListening(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
		this.controller.stopListening(document, "shakeend", this.handleShaking.bindAsEventListener(this));

		this.controller.stopListening(this.controller.get('album-art-area-right'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.stopListening(this.controller.get('album-art-area-left'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		//this.controller.stopListening(this.albumArtDiv, Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.stopListening(this.albumArtDiv, Mojo.Event.dragStart, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.stopListening(this.albumArtDiv, Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.stopListening(this.controller.get('episodeList'), Mojo.Event.listTap, this.handleListClick.bindAsEventListener(this));
		this.controller.stopListening(this.controller.get('episodeList'), Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));

		this.timerToggle('stop');
	} catch(eventErrors) {
		Mojo.Log.error("[MainAssistant.cleanup] %s", eventErrors.message);
	}
};

/**
 * Called as each item in the list is drawn on the screen. Mostly used to make sure
 * items have their buttons properly hooked up in the list.
 */
MainAssistant.prototype.listItemRender = function(listWidget, itemModel, itemNode) {
	// If playing and the key matches the playing key set this item as the
	// user's selected row. Should keep the UI up to date!!
	// !!! VERY IMPORTANT !!!
	if(itemModel.key === this.nowPlayingKey) {
		this.nowPlayingNode = itemNode;
	}

	try {
		// Get instances of all items in the node
		var statusDiv = itemNode.select('.status')[0];
		var downloadBtn = itemNode.select('.downloadButton')[0];
		var episodeTitle = itemNode.select('.episodeTitle')[0];
		var currentTimeDiv = itemNode.select('.currentTimeDiv')[0];
		// Get the PFeedItem that is being represented by this itemModel
		var pfeedItem = AppAssistant.db.getItem(itemModel.key);
		// Get the percentage for the item to be displayed
		var percentage = this.downloadingPercentage.get(itemModel.key);
		// Check to make sure the item is not already downloaded
		// if it is remove the download button
		if(pfeedItem) {
			var statusIndicator = pfeedItem.getStatusIndicator();
			// Check if it is caching, if so set-up the cancel button
			switch(statusIndicator) {
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.ListenedCaching:
					// Give the downloadBtn the cancel class
					downloadBtn.addClassName('cancel');
					statusDiv.addClassName('downloading');
					statusDiv.setStyle({width: (Object.isUndefined(percentage) ? 0 : percentage) + "%"});
					break;
			}
			// Hide the episode length
			switch(statusIndicator) {
				case PFeedItem.Status.New:
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.NewCached:
					currentTimeDiv.hide();
					break;
			}
			// Check if the item is cached, if so hide the download button
			switch(statusIndicator) {
				case PFeedItem.Status.NewCached:
				case PFeedItem.Status.InProgressCached:
				case PFeedItem.Status.ListenedCached:
					// Remove the download button
					downloadBtn.remove();
					downloadBtn = undefined;
					break;
			}
			// Set up styles for New/NewCaching
			switch(statusIndicator) {
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.New:
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.addClassName('noTimeWithButton');
					break;
			}
			// Set up styles for InProgressCached/ListenedCached
			switch(statusIndicator) {
				case PFeedItem.Status.InProgressCached:
				case PFeedItem.Status.ListenedCached:
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.Listened:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.addClassName('withTimeNoButton');
					break;
			}
			// Set up styles for NewCached
			switch(statusIndicator) {
				case PFeedItem.Status.NewCached:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.addClassName('noTimeNoButton');
					
					break;
			}
			// Set up styles for InProgressCaching/ListenedCaching
			switch(statusIndicator) {
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.ListenedCaching:
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.Listened:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.addClassName('withTimeWithButton');
					break;
			}
			// Set the actual styling of the title
			switch(statusIndicator) {
				case PFeedItem.Status.New:
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.NewCached:
					episodeTitle.addClassName('newPFeedItem');
					break;
				case PFeedItem.Status.Listened:
				case PFeedItem.Status.ListenedCaching:
				case PFeedItem.Status.ListenedCached:
					episodeTitle.addClassName('listenedPFeedItem');
					break;
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.InProgressCached:
					episodeTitle.addClassName('inProgressPFeedItem');
					break;
			}
		}
		if(downloadBtn) {
			downloadBtn.addEventListener(Mojo.Event.tap, this.downloadFunction);
		}
	} catch(error) {
		Mojo.Log.error("[MainAssistant.listItemRender] %s", error.message);
	}
};

/**
 * Method updates a given item in the list. The 'given' item is specified
 * using the key parameter of the input.
 * @param key {string} The unique id of the list item, also the key of the PFeedItem
 */
MainAssistant.prototype.listItemUpdate = function(key) {
	// Protect from crashing
	try {
		// Get the item from the screen
		var node = this.controller.get(key);
		// Get the PFeedItem that is being represented by this itemModel
		var pfeedItem = AppAssistant.db.getItem(key);

		// Check to make sure the node trying to update
		// is even currently drawn on the scene (list)
		if(node && pfeedItem) {
			// Get the status of the item to be rendered
			var statusIndicator = pfeedItem.getStatusIndicator();
			// Get the Item that is currently downloading
			// Select the progress bar layer
			var statusDiv = node.select('.status')[0];
			// Select the time indicator layer
			var currentTimeDiv = node.select('.currentTimeDiv')[0];
			// Select the episode title layer
			var episodeTitle = node.select('.episodeTitle')[0];
			// Select the download button
			var downloadBtn = node.select('.downloadButton')[0];
			// Get the downloaded percentage
			var percentage = this.downloadingPercentage.get(key);
			// Check if it is caching, if so set-up the cancel button
			switch(statusIndicator) {
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.ListenedCaching:
					// Give the downloadBtn the cancel class
					downloadBtn.addClassName('cancel');
					statusDiv.addClassName('downloading');
					statusDiv.setStyle({width: (Object.isUndefined(percentage) ? 0 : percentage) + "%"});
					break;
				default:
					downloadBtn.removeClassName('cancel');
					statusDiv.removeClassName('downloading');
					statusDiv.setStyle({width: "0%"});
					break;
			}
			// Hide the episode length
			switch(statusIndicator) {
				case PFeedItem.Status.New:
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.NewCached:
					currentTimeDiv.hide();
					break;
			}
			// Check if the item is cached, if so hide the download button
			switch(statusIndicator) {
				case PFeedItem.Status.NewCached:
				case PFeedItem.Status.InProgressCached:
				case PFeedItem.Status.ListenedCached:
					// Remove the download button
					downloadBtn.remove();
					downloadBtn = undefined;
					statusDiv.removeClassName('downloading');
					statusDiv.setStyle({width: "0%"});
					break;
			}
			// Set up styles for New/NewCaching
			switch(statusIndicator) {
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.New:
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.addClassName('noTimeWithButton');
					break;
			}
			// Set up styles for InProgressCached/ListenedCached
			switch(statusIndicator) {
				case PFeedItem.Status.InProgressCached:
				case PFeedItem.Status.ListenedCached:
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.Listened:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.addClassName('withTimeNoButton');
					break;
			}
			// Set up styles for NewCached
			switch(statusIndicator) {
				case PFeedItem.Status.NewCached:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('withTimeWithButton');
					episodeTitle.addClassName('noTimeNoButton');
					break;
			}
			// Set up styles for InProgressCaching/ListenedCaching
			switch(statusIndicator) {
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.ListenedCaching:
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.Listened:
					episodeTitle.removeClassName('noTimeWithButton');
					episodeTitle.removeClassName('withTimeNoButton');
					episodeTitle.removeClassName('noTimeNoButton');
					episodeTitle.addClassName('withTimeWithButton');
					break;
			}			
			// Set the actual styling of the title
			switch(statusIndicator) {
				case PFeedItem.Status.New:
				case PFeedItem.Status.NewCaching:
				case PFeedItem.Status.NewCached:
					episodeTitle.addClassName('newPFeedItem');
					break;
				case PFeedItem.Status.Listened:
				case PFeedItem.Status.ListenedCaching:
				case PFeedItem.Status.ListenedCached:
					episodeTitle.addClassName('listenedPFeedItem');
					break;
				case PFeedItem.Status.InProgress:
				case PFeedItem.Status.InProgressCaching:
				case PFeedItem.Status.InProgressCached:
					episodeTitle.addClassName('inProgressPFeedItem');
					break;
			}
		}
	} catch(error) {
		Mojo.Log.error("[MainAssistant.listItemUpdate] %s", error.message);
	}
};

MainAssistant.prototype.listItemRemoved = function(listWidget, itemModel, itemNode) {
	// Should remove all events from this item...it's being removed from DOM anyway
	var downloadBtn = itemNode.select('.downloadButton')[0];
	if(downloadBtn) {
		downloadBtn.stopObserving();
	}
};

/**
 * After user swipes to delete.
 * Call the current podcast being displayed and tell it to
 * delete the item that was sent.
 */
MainAssistant.prototype.handleListDelete = function(event) {
	// event.item.key
	AppAssistant.db.currentPodcast().deleteItem(event.item.key, true);
};

MainAssistant.prototype.handleItemDownload = function(event) {
	// Stop the Mojo.Event.listTap from propigating
	event.stop();
	// Get the node from the list
	var node = event.target.parentNode;
	// Get the key that represents the item selected
	var key = node.identify();
	// If found
	if(node) {
		// Get the model for the item in the list
		var itemModel = AppAssistant.db.getItem(key);
		// Check if podcast is currently dowloading
		if(itemModel.isCaching()) {
			// If we are currently caching, cancel it
			AppAssistant.db.currentPodcast().cancelCache(itemModel.key);
		} else {
			// Tell the current podcast to download the podcast
			AppAssistant.db.currentPodcast().cacheEnclosure(itemModel.key);
		}
	}
};

/**
 * Refreshes the list, updates the album-art displayed on the screen,
 * loads/reloads the list items that are shown on the screen.
 * All of this is based on the currentPodcast method of the
 * PodcastStorage class.
 */
MainAssistant.prototype.podcastDisplayUpdate = function() {
	try {
		var currPodcast = AppAssistant.db.currentPodcast();
		if(currPodcast) {
			// Remove the beginning album-art-image
			this.controller.get('album-art-image').remove();
			var image = currPodcast.getImage();
			Mojo.Log.info("Image art: %s", image);
			this.albumArtDiv.appendChild(new Element('img', {
				id: 'album-art-image',
				'class': 'default-album-art-large',
				src: (!image.blank()) ? image : './images/default-album-art-144-144.png',
				alt: '',
				height: '144px',
				width: '144px'
			}));
			//this.controller.get('episodeList').mojo.revealItem(0, true);
			this.controller.get('podcastTitle').update(currPodcast.getTitle());

			// Populate the list dependant upon the list mode
			switch(this.mode) {
				//default:
				case MainAssistant.ListMode.New:
					this.episodeListModel.items = (!currPodcast.hasItems()) ? [] : currPodcast.getNewItems();
					break;
				case MainAssistant.ListMode.Listened:
					this.episodeListModel.items = (!currPodcast.hasItems()) ? [] : currPodcast.getListenedItems();
					break;
				case MainAssistant.ListMode.Downloaded:
					this.episodeListModel.items = (!currPodcast.hasItems()) ? [] : currPodcast.getDownloadedItems();
					break;
			}
			// Change the model
			this.controller.modelChanged(this.episodeListModel);
		} else {
			// No Podcasts are in the datbase, so clear the display
			this.controller.get('album-art-image').remove();
			this.albumArtDiv.appendChild(new Element('img', {
				id: 'album-art-image',
				src: './images/default-album-art-144-144.png',
				alt: '',
				height: '144px',
				width: '144px'
			}));
			this.controller.get('podcastTitle').update($L("There are no podcasts in the database."));
			this.episodeListModel.items = [];
			// Clear the list
			this.controller.modelChanged(this.episodeListModel);
		}
	} catch(error) {
		Mojo.Log.error("[MainAssistant.podcastDisplayUpdate] %s", error.message);
	}
};

/**
 *	Make sure the screen size is always correct for whatever orientation
 *	the user has the phone in.
 */
MainAssistant.prototype.handleOrientation = function(event) {

};

MainAssistant.prototype.handleShaking = function(event) {
};

/**
 * Handles the press and hold event for album-art. This
 * event should lead to a refreshing of the currently
 * selected podcasts.
 */
MainAssistant.prototype.handleAlbumArtHold = function(event) {
	// Since the div is also going to look
	// for tap events, this needs to stop
	// all events from propigating
	event.stop();
	// Update the current podcast
	AppAssistant.db.updateCurrent();
};

/**
 * Handles switching to the info page.
 */
MainAssistant.prototype.handleAlbumArtTap = function(event) {
	Mojo.Log.info("[MainAssistant.handleAlbutmArtTap]");
	Mojo.Controller.stageController.pushScene({
		name: 'info',
		transition: Mojo.Transition.zoomFade
	}, AppAssistant.db.currentPodcast());
};

/**
 * If the user flicks the album art to switch to the next podcast.
 */
MainAssistant.prototype.handleAlbumArtFlick = function(event) {
	// Stop the event from propagating
	event.stop();
	switch(event.type) {
		case Mojo.Event.dragStart:
			Mojo.Drag.startDragging(this.controller, this.albumArtDiv, event.down, {
				draggingClass: 'album-art-dragging-margin',
				preventVertical: true,
				preventDropReset: true
			});
			break;
	}
};

MainAssistant.prototype.dragDrop = function(element) {
	// Determine the middle of the screen
	var middleOfScreen = this.controller.sceneScroller.getWidth() / 2;
	Mojo.Log.info("The screen is %spx wide, the middle is at: %spx.", this.controller.sceneScroller.getWidth(), middleOfScreen);
	// Determine the position of the element
	var elementPosition = element.positionedOffset().left + (element.getWidth() / 2);
	Mojo.Log.info("The box is %spx wide, and I am currently at %spx.", element.getWidth(), elementPosition);
	// Determine if we should go forward or back
	var prevOrNext = (elementPosition > middleOfScreen ) ? 'next' : 'previous'
	Mojo.Log.info("Transition to the %s podcast.", prevOrNext);
	if(prevOrNext) {
		Mojo.Animation.animateStyle(this.albumArtDiv, 'left', 'bezier', {
			from: element.positionedOffset().left,
			to: (prevOrNext === 'next') ? this.animationFinish : -this.animationFinish,
			duration: this.animationDuration,
			curve: this.animationType,
			onComplete: this.switchPodcast.bind(this, prevOrNext)
		});
	}
};

MainAssistant.prototype.albumArtAreaLeftOrRight = function(event) {
	if(event.id === 'album-art-area-right') {
		this.switchPodcast('next');
	} else {
		this.switchPodcast('previous');
	}
};

/**
 * Once the podcast has been animated off the screen, this event handler
 * is called and it switches the podcast on the screen. It then performs
 * the necessary podcast changes within the database object. It also,
 * starts the animation to finish drawing the image on the screen.
 */
MainAssistant.prototype.switchPodcast = function(prevOrNext) {
	// Calculate the start and ending positions of the animations
	var start = (prevOrNext === 'next') ? -this.animationFinish : this.animationFinish;
	var finish = 0;
	// Shut-off the spinner
	if(this.spinnerModel.spinning) {
		this.spinnerModel.spinning = false;
		this.controller.modelChanged(this.spinnerModel);
	}
	// Remove any text in the display area
	this.podcastCount.update('');
	// Actually perform loading or changing to next podcast
	if(prevOrNext === 'next') {
		AppAssistant.db.nextPodcast();
		this.podcastDisplayUpdate();
	} else if(prevOrNext === 'previous') {
		AppAssistant.db.previousPodcast();
		this.podcastDisplayUpdate();
	}
	this.albumArtDiv.removeClassName('album-art-dragging-margin');
	// Move the image to it's new starting position
	this.albumArtDiv.setStyle({
		left: start + "px"
	});
	// Perform the animation
	Mojo.Animation.animateStyle(this.albumArtDiv, 'left', 'bezier', {
		from: start,
		to: this.controller.sceneScroller.getWidth() / 2,
		duration: this.animationDuration,
		curve: this.animationType,
		onComplete: function() {
			this.albumArtDiv.setStyle({
				left: "50%"
			});
		}.bind(this)
	});
};

/**
 * Handle the commands that come from the objects that are created.
 */
MainAssistant.prototype.handleCommand = function(command) {
	var podcastKey = undefined;
	if(command.podcast) {
	     podcastKey = command.podcast.key;
	}

	// Commands from the application-menu
	if(command.type === Mojo.Event.command) {
		switch(command.command) {
			case 'do-refresh-all':
				AppAssistant.db.updatePodcasts();
				break;
			case 'set-show-new':
				this.mode = MainAssistant.ListMode.New;
				this.podcastDisplayUpdate();
				break;
			case 'set-show-old':
				this.mode = MainAssistant.ListMode.Listened;
				this.podcastDisplayUpdate();
				break;
			case 'set-show-downloaded':
				this.mode = MainAssistant.ListMode.Downloaded;
				this.podcastDisplayUpdate();
				break;
		}
	} else {
		var msg;
		switch(command.type) {
			case PodcastStorage.SavingDatabaseFailure:
				Mojo.Log.error("[MainAssistant.SavingDatabaseFailure] %s", command.error.message);
				// Make a template for display on the screen
				var msgTemplate = new Template($L("There was an error saving the database. #{message}"));
				// Render the template
				msg = msgTemplate.evaluate(command.error);
				// Display it to the end user
				Mojo.Controller.errorDialog(msg);
				break;
			case Podcast.PodcastXMLDownloadProgress:
				break;
			case Podcast.PodcastXMLDownloadComplete:
				break;
			case Podcast.PodcastParseProgress:
				// Updated podcast is the currently showing podcast
				if(AppAssistant.db.currentPodcast().key == podcastKey) {
					// Create the text for the bannder message
					var bannerTemplate = new Template($L("Parsing item #{item} of #{numItems}"));
					// Fill out for correct updating
					var message = bannerTemplate.evaluate({item: command.item, numItems: command.numItems, title: command.podcast.getTitle()});
					// Show the banner quickly!!!
					this.podcastCount.update(message);
					//Mojo.Controller.getAppController().showBanner(message, {source: 'notification'});
				}
				break;
			case Podcast.PodcastStartUpdate:
				Mojo.Log.info("[MainAssistant.PodcastStartUpdate] %s starting update.", podcastKey);
				// Updated podcast is the currently showing podcast
				if(AppAssistant.db.currentPodcast().key == podcastKey) {
				    this.spinnerModel.spinning = true;
				    this.controller.modelChanged(this.spinnerModel);
				} else {
				    // TODO Dashboard please...
				    var title = command.podcast.getTitle();
				    var message = (title === undefined) ? $L("Updating podcast ...") : $L("Updating ") + title;
				    Mojo.Controller.getAppController().showBanner(message, {source: 'notification'});
				}
				break;
			case Podcast.PodcastUpdateSuccess:
				Mojo.Log.info("[MainAssistant.PodcastUpdateSuccess] %s finished updating.", podcastKey);
				// Remove any text in the display area
				this.podcastCount.update('');
				// Remove all notification banners
				Mojo.Controller.getAppController().removeAllBanners();
				// Put a message that the podcast has finished updating
				var title = command.podcast.getTitle() + $L(" Updated");
				Mojo.Controller.getAppController().showBanner(title, {source: 'notification'});
				// Shut-off the spinner
				if(this.spinnerModel.spinning) {
					this.spinnerModel.spinning = false;
					this.controller.modelChanged(this.spinnerModel);
				}
				// Updated podcast is the currently showing podcast
				if(AppAssistant.db.currentPodcast().key == podcastKey) {
					// Update the UI
					this.podcastDisplayUpdate();
				}
				break;
			case Podcast.PodcastUpdateFailure:
				try {
					// Updated podcast is the currently showing podcast
					if(AppAssistant.db.currentPodcast().key == podcastKey) {
						this.spinnerModel.spinning = false;
						this.controller.modelChanged(this.spinnerModel);
					}
					//msg = $L("Update of ") + command.podcast.key + $L(" failed. ") + command.message;
					// Make a template for display on the screen
					var msgTemplate = new Template($L("Update of #{key} failed. #{message}"));
					// Render the template
					msg = msgTemplate.evaluate({key: command.podcast.key, message: command.message});
					// Display it to the end user
					Mojo.Controller.errorDialog(msg);
				} catch(error) {
					Mojo.Log.error("[MainAssistant.PodcastUpdateFailure] %s", error.message);
				}
				break;
			case PFeedItem.CacheCanceled:
				// Remove the canceled button
				this.listItemUpdate(command.key);
				break;
			case PFeedItem.CacheProgress:
				// Update the downloading
				this.downloadingPercentage.set(command.key, command.percentage);
				this.listItemUpdate(command.key);
				break;
			case PFeedItem.CacheError:
				// Something went wrong
				this.downloadingPercentage.unset(command.key);
				this.listItemUpdate(command.key);
				var msgTemplate = new Template($L("[Code #{completionStatusCode}] Cache of #{url} failed."));
				msg = msgTemplate.evaluate(command);
				Mojo.Controller.errorDialog(msg);
				break;
			case PFeedItem.EnclosureCached:
				this.downloadingPercentage.unset(command.key);
				this.listItemUpdate(command.key);
				break;
			case Podcast.ImageCached:
				this.podcastDisplayUpdate();
				break;
			default:
				Mojo.Log.info("[MainAssistant.handleCommand] Not handling %s", command.type);
				break;
		}
	}
};

MainAssistant.prototype.handleListClick = function(event) {
	// Get the selected row
	var nowPlaying = AppAssistant.db.getItem(event.item.key);
	Mojo.Log.info("[MainAssistant.handleListClick] (%i) %s", event.index, nowPlaying.getEnclosure());
	switch(nowPlaying.enclosureType) {
		case 'video/m4v':
		case 'video/mp4':
		case 'video/x-m4v':
		case 'video/quicktime':
		case 'video/MPEG4-visual':
			Mojo.Log.info("[MainAssistant.handleListClick] Playing Video");
			//this.controller.get('video-object').toggleClassName('video');
			//this.videoPlayer.src = event.item.enclosure;
			// Make sure the audio stops then play some videos
			this.stop();
			var args = {
				appId: "com.palm.app.videoplayer",
				name: "nowplaying"
			};
			var params = {
				target: nowPlaying.getEnclosure(),
				title: nowPlaying.getTitle(),
				thumbUrl: AppAssistant.db.currentPodcast().getImage()
			};
			this.controller.stageController.pushScene(args, params);
			break;
		case 'audio/aac':
		case 'audio/mp3':
		case 'audio/mpeg':
		case 'audio/x-m4a':
		case 'audio/x-mpeg':
			Mojo.Log.info("[MainAssistant.handleListClick] Playing Audio");
			this.nowPlayingKey = nowPlaying.key;
			this.nowPlayingNode = this.controller.get(nowPlaying.key);
			// Push the audio scene and the pass the Podcast to play
			this.controller.stageController.pushScene({
				name: "now-playing-audio",
				transition: Mojo.Transition.zoomFade
			}, nowPlaying);
			break;
		default:
			Mojo.Log.error("[MainAssistant.handleListClick] Unknown file extension. %s", nowPlaying.enclosureType);
			var template = new Template($L("Unknown file extension: #{enclosureType}"));
			Mojo.Controller.errorDialog(template.evaluate(nowPlaying));
			break;
	}
};

/**
 * Tells the media object to stop playing the current object.
 */
MainAssistant.prototype.stop = function() {
	this.audioPlayer.pause();
	this.clearSource();
};

/**
 * Clears the Audio object and stops it from playing anything.
 */
MainAssistant.prototype.clearSource = function() {
	this.audioPlayer.src = null;
};


/**
 * Function starts/stops the display update from happening.
 * @param action {string} The acceptable values are either: start or stop. 'start' will start the display update; where 'stop' will stop it.
 */
MainAssistant.prototype.timerToggle = function(action) {
	try {
		if((this.sceneUpdateTimer !== undefined && action == 'start') || action == 'stop') {
			clearInterval(this.sceneUpdateTimer);
			this.sceneUpdateTimer = undefined;
		}

		if(action == 'start') {
			this.sceneUpdateTimer = setInterval(this.timerUpdateSceneHandler, 1000);
		}
	} catch(error) {
		Mojo.Log.error("[MainAssistant.timerToggle] %s", error.message);
	}
};


MainAssistant.prototype.updateSceneOnTimer = function() {
	if(this.nowPlayingNode && this.isPlaying()) {
		this.nowPlayingNode.select('.currentTimeDiv')[0].update(this.audioPlayer.currentTime.secondsToDuration());
	} else {
		this.timerToggle('stop');
	}
};

/**
 * Checks to see if the Audio object is currently playing. The is playing algorithm is based on:
 * "A media element is said to be potentially playing when its paused attribute is false, the readyState
 * attribute is either HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA, the element has not ended playback,
 * playback has not stopped due to errors, and the element has not paused for user interaction."
 * This is from: http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html#potentially-playing
 */
MainAssistant.prototype.isPlaying = function() {
	if(this.audioPlayer) {
		return (
			!this.audioPlayer.paused && (
				this.audioPlayer.readyState === this.audioPlayer.HAVE_FUTURE_DATA ||
				this.audioPlayer.readyState === this.audioPlayer.HAVE_ENOUGH_DATA
			) &&
			!this.audioPlayer.ended
		);
	} else {
		return false;
	}
};

MainAssistant.ListMode = {};
MainAssistant.ListMode.New = 'new';
MainAssistant.ListMode.Listened = 'listened';
MainAssistant.ListMode.Downloaded = 'downloaded';
