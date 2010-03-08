function MainAssistant(db) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	 * additional parameters (after the scene name) that were passed to pushScene. The reference
	 * to the scene controller (this.controller) has not be established yet, so any initialization
	 * that needs the scene controller should be done in the setup function below. */
	this.db = db;
	this.uiUpdateTimer = undefined;
	this.actionItems = {
		nowPlayingModel: undefined,
		downloadingModels: new Hash()
	};
	// Set the display to show new podcasts only
	this.mode = MainAssistant.ListMode.New;
	this.audioPlayer = undefined;
	this.audioPlayerCanPlay = false;
	this.videoPlayer = {};
	this.screenWidth = Mojo.Environment.DeviceInfo.screenWidth;
	this.screenHeight = Mojo.Environment.DeviceInfo.screenHeight;
	this.animationFinish = 500;
	this.animationDuration = 0.25;
	this.animationType = 'ease-in';

	this.spinnerAttributes = {
		spinnerSize: Mojo.Widget.spinnerLarge
	};

	this.spinnerModel = {
		spinning: false
	};

	this.episodeListAttributes = {
		//listTemplate: "main/episodeListTemplate",
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
	this.audioEventListener = this.audioEvent.bindAsEventListener(this);
}

MainAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */

	/* setup widgets here */
	try {
		//this.videoPlayer = $('video-object');
		//this.videoPlayer = VideoTag.extendElement(this.videoPlayer, this.controller);

		// Changes for SDK 1.4 Audio object
		this.audioPlayer = new Audio();
		this.libs = MojoLoader.require({name: "mediaextension", version: "1.0"});
		this.extObj = this.libs.mediaextension.MediaExtension.getInstance(this.audioPlayer);
		this.extObj.audioClass = "media";

		this.controller.setupWidget("updatingSpinner", this.spinnerAttributes, this.spinnerModel);
		this.controller.setupWidget("episodeList", this.episodeListAttributes, this.episodeListModel);
		this.controller.setupWidget(Mojo.Menu.appMenu, appMenuAttr, appMenuModel);
	} catch (func_error) {
		Mojo.Log.error("[Create Widgets] %s", func_error.message);
	}

	/* add event handlers to listen to events from widgets */
	try {
		// Listen for user to flick the album-art to change podcasts
		this.controller.listen($('album-art-area-right'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.listen($('album-art-area-left'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.listen($('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.listen($('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.listen($('album-art'), Mojo.Event.tap, this.handleAlbumArtTap.bindAsEventListener(this));
		this.controller.listen($('episodeList'), Mojo.Event.listTap, this.handleListClick.bindAsEventListener(this));
		this.controller.listen($('episodeList'), Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));
	} catch(eventErrors) {
		      Mojo.Log.error("[MainAssistant.setup] %s", eventErrors.message);
	}

	try {
		// Begin loading the database
		this.db.loadDatabase();
	} catch(dbLoadErrors) {
		Mojo.Log.error("[MainAssistant.setup loadDB] %s", dbLoadErrors.message);
	}
};

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

	try {
		// Wait for screen orientation changes
		this.controller.listen(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
		this.controller.listen(document, "shakeend", this.handleShaking.bindAsEventListener(this));
		// Audio events
		this.controller.listen(this.audioPlayer, Media.Event.X_PALM_CONNECT, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.X_PALM_DISCONNECT, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.X_PALM_WATCHDOG, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.ABORT, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.CANPLAY, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.CANPLAYTHROUGH, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.DURATIONCHANGE, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.EMPTIED, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.ENDED, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.ERROR, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.LOAD, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.LOADEDFIRSTFRAME, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.LOADEDMETADATA, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.LOADSTART, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.PAUSE, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.PLAY, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.PROGRESS, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.SEEKED, this.audioEventListener, false);
		this.controller.listen(this.audioPlayer, Media.Event.SEEKING, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.STALLED, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.TIMEUPDATE, this.audioEventListener, false);
		//this.controller.listen(this.audioPlayer, Media.Event.WAITING, this.audioEventListener, false);
	} catch(eventErrors) {
		Mojo.Log.error("[MainAssistant.activate] %s", eventErrors.message);
	}
};


MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	a result of being popped off the scene stack */

	try {
		this.stop();
		this.controller.stopListening(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
		this.controller.stopListening(document, "shakeend", this.handleShaking.bindAsEventListener(this));

		this.controller.stopListening($('album-art-area-right'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.stopListening($('album-art-area-left'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
		this.controller.stopListening($('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.stopListening($('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.stopListening($('episodeList'), Mojo.Event.listTap, this.handleListClick.bindAsEventListener(this));
		this.controller.stopListening($('episodeList'), Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));

		this.controller.stopListening(this.audioPlayer, Media.Event.X_PALM_CONNECT, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.X_PALM_DISCONNECT, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.X_PALM_WATCHDOG, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.ABORT, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.CANPLAY, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.CANPLAYTHROUGH, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.DURATIONCHANGE, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.EMPTIED, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.ENDED, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.ERROR, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.LOAD, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.LOADEDFIRSTFRAME, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.LOADEDMETADATA, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.LOADSTART, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.PAUSE, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.PLAY, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.PROGRESS, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.SEEKED, this.audioEventListener, false);
		this.controller.stopListening(this.audioPlayer, Media.Event.SEEKING, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.STALLED, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.TIMEUPDATE, this.audioEventListener, false);
		//this.controller.stopListening(this.audioPlayer, Media.Event.WAITING, this.audioEventListener, false);
	} catch(eventErrors) {
		Mojo.Log.error("[MainAssistant.cleanup] %s", eventErrors.message);
	}
};

MainAssistant.prototype.listItemRender = function(listWidget, itemModel, itemNode) {
	// If playing and the key matches the playing key set this item as the
	// user's selected row. Should keep the UI up to date!!
	// !!! VERY IMPORTANT !!!
	try {
		// Setup the download btn listener
		var downloadBtn = itemNode.select('.downloadButton')[0];
		var episodeTitle = itemNode.select('.episodeTitle')[0];
		var episodeLength = itemNode.select('.episodeLength')[0];
		// Get the PFeedItem that is being represented by this itemModel
		var pfeedItem = this.db.getItem(itemModel.key);
		// Check to make sure the item is not already downloaded
		// if it is remove the download button
		if(pfeedItem) {
			if(pfeedItem.isEnclosureCached() && downloadBtn && episodeTitle && episodeLength) {
				// Remove the download button from the scene
				episodeTitle.removeClassName('withButton');
				episodeLength.removeClassName('withButton');
				downloadBtn.remove();
			} else if(pfeedItem.isCaching() && downloadBtn && episodeTitle && episodeLength) {
				// Give the downloadBtn the cancel class
				downloadBtn.addClassName('cancel');
				statusDiv.addClassName('downloading');
				statusDiv.setStyle({width: (Object.isUndefined(percentage) ? 0 : percentage) + "%"});
				// Clean-up
				statusDiv.removeClassName('playing');
				episodeTitle.addClassName('withButton');
				currentTimeDiv.addClassName('withButton');
			} else if(!pfeedItem.listened) {
				episodeTitle.addClassName('newEpisode');
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
MainAssistant.prototype.listItemUpdate = function(key, percentage) {
	// Protect from crashing
	try {
		// Get the item from the screen
		var node = $(key);

		// Check to make sure the node trying to update
		// is even currently drawn on the scene (list)
		if(node) {
			var itemModel = this.actionItems.downloadingModels.get(key);
			// Select the progress bar layer
			var statusDiv = node.select('.status')[0];
			// Select the time indicator layer
			var currentTimeDiv = node.select('.episodeLength')[0];
			// Select the episode title layer
			var episodeTitle = node.select('.episodeTitle')[0];
			// Select the download button
			var downloadBtn = node.select('.downloadButton')[0];
			// Check to see if in one of 5 states:
			// 1. Buffering => this.audioPlayer.networkState == this.audioPlayer.NETWORK_LOADING && key === this.actionItems.nowPlayingModel.key
			// 2. Playing => this.audioPlayer.paused == false && key === this.actionItems.nowPlayingModel.key
			// 3. Downloading => itemModel !== undefined && itemModel.isCaching() == true
			// 4. Downloaded => itemModel.isEnclosureCache() == true
			// 5. Default => itemModel.isEnclosureCached() == false && itemModel.isCaching() == false
			// Case 1: Buffering
			if(this.audioPlayer.networkState === this.audioPlayer.NETWORK_LOADING && this.actionItems.nowPlayingModel && key === this.actionItems.nowPlayingModel.key) {
				// Turn on the downloading class if it was not already on
				statusDiv.addClassName('downloading');
				// Make the inset appear
				node.addClassName('clicked');

				// Set the percentage width for the download
				statusDiv.setStyle({
					width: percentage.toFixed(2) + "%"
				});
				// Set the current playing time
				if(!this.audioPlayer.paused) {
					currentTimeDiv.nodeValue = this.audioPlayer.currentTime.secondsToDuration();
				} else {
					currentTimeDiv.nodeValue = (0).secondsToDuration();
				}
				// Clean-up make sure not playing
				statusDiv.removeClassName('playing');
				// Remove event listener, preventing memory leaks
				if(downloadBtn) {
					downloadBtn.stopObserving();
					downloadBtn.remove();
				}
				// Correct formatting of the
				episodeTitle.removeClassName('withButton');
				currentTimeDiv.removeClassName('withButton');

			// Case 2: Playing
			} else if(!this.audioPlayer.paused && this.actionItems.nowPlayingModel && this.actionItems.nowPlayingModel.key) {
				// Make the inset appear
				node.addClassName('clicked');
				// Set the current playing time
				currentTimeDiv.nodeValue = this.audioPlayer.currentTime.secondsToDuration();
				// Make sure that the status div is in 'playing' mode
				if(!statusDiv.hasClassName('playing')) {
					statusDiv.addClassName('playing');
				}
				// Set the width of the status div to percent played
				percentage = ((this.audioPlayer.currentTime / this.audioPlayer.duration) * 100);
				percentage = (isNaN(percentage) || percentage === undefined) ? 0 : percentage;
				// ((this.audioPlayer.currentTime / this.audioPlayer.duration) * 100)
				statusDiv.setStyle({
					width: percentage.toFixed(2) + "%"
				});
				// Clean-up make sure no downloading
				statusDiv.removeClassName('downloading');
				// Remove event listener, preventing memory leaks
				if(downloadBtn) {
					downloadBtn.stopObserving();
					downloadBtn.remove();
				}
				// Correct formatting of the
				episodeTitle.removeClassName('withButton');
				currentTimeDiv.removeClassName('withButton');

			// Case 3: Downloading
			} else if(itemModel && itemModel.isCaching()) {
				// Make the inset appear
				node.addClassName('clicked');
				// Give the downloadBtn the cancel class
				downloadBtn.addClassName('cancel');
				statusDiv.addClassName('downloading');
				statusDiv.setStyle({width: (Object.isUndefined(percentage) ? 0 : percentage) + "%"});
				// Clean-up
				statusDiv.removeClassName('playing');
				episodeTitle.addClassName('withButton');
				currentTimeDiv.addClassName('withButton');

			// Case 4: Downloaded
			} else if(itemModel && itemModel.isEnclosureCached()) {
				// Remove event listener, preventing memory leaks
				downloadBtn.stopObserving();
				downloadBtn.remove();
				currentTimeDiv.removeClassName('withButton');
				episodeTitle.removeClassName('withButton');
				// Reset the status div
				statusDiv.removeClassName('playing');
				statusDiv.removeClassName('downloading');
				statusDiv.setStyle({width: '0%'});
				node.removeClassName('clicked');
			// Case 5: Default
			} else {
				if(downloadBtn === undefined) {
					// TODO: Need to re-add the download button
				} else {
					downloadBtn.removeClassName('cancel');
				}
				currentTimeDiv.addClassName('withButton');
				episodeTitle.addClassName('withButton');
				statusDiv.removeClassName('playing');
				statusDiv.removeClassName('downloading');
				node.removeClassName('clicked');
				statusDiv.setStyle({width: '0%'});
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
	this.db.currentPodcast().deleteItem(event.item.key);
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
		var itemModel = this.db.getItem(key);
		// Check if podcast is currently dowloading
		if(itemModel.isCaching()) {
			// If we are currently caching, cancel it
			this.db.currentPodcast().cancelCache(itemModel.key);
		} else {
			// Tell the current podcast to download the podcast
			this.db.currentPodcast().cacheEnclosure(itemModel.key);
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
		var currPodcast = this.db.currentPodcast();
		$('album-art').removeChild($('image'));
		$('album-art').appendChild(new Element('img', {
			id: 'image',
			src: (Object.isFunction(currPodcast.getImage)) ? currPodcast.getImage() : '',
			alt: '',
			height: '144px',
			width: '144px'
		}));
		//$('episodeList').mojo.revealItem(0, true);
		$('podcastTitle').innerText = (currPodcast.title === undefined) ? "" : currPodcast.title;

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
	this.db.updateCurrent();
};

/**
 * Handles switching to the info page.
 */
MainAssistant.prototype.handleAlbumArtTap = function(event) {
	Mojo.Log.info("[MainAssistant.handleAlbutmArtTap]");
	Mojo.Controller.stageController.pushScene({
		name: 'info',
		podcast: this.db.currentPodcast(),
		transition: Mojo.Transition.zoomFade
	});
}

/**
 * If the user flicks the album art to switch to the next podcast.
 */
MainAssistant.prototype.handleAlbumArtFlick = function(event) {
	var start = $("album-art").cumulativeOffset().left;
	if(event.velocity.x >= 500) {
		Mojo.Animation.animateStyle($("album-art"), 'left', 'bezier', {
			from: start,
			to: this.animationFinish,
			duration: this.animationDuration,
			curve: this.animationType,
			onComplete: this.switchPodcast.bind(this, 'previous')
		});
	} else if(event.velocity.x <= - 500) {
		Mojo.Animation.animateStyle($("album-art"), 'left', 'bezier', {
			from: start,
			to: -this.animationFinish,
			duration: this.animationDuration,
			curve: this.animationType,
			onComplete: this.switchPodcast.bind(this, 'next')
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

MainAssistant.prototype.switchPodcast = function(next) {
	// Calculate the start and ending positions of the animations
	var start = (next === 'next') ? this.animationFinish : -this.animationFinish;
	var finish = 0;
	// Actually perform loading or changing to next podcast
	if(next === 'next') {
		this.db.nextPodcast();
		this.podcastDisplayUpdate();
	} else if(next === 'previous') {
		this.db.previousPodcast();
		this.podcastDisplayUpdate();
	}
	// Move the image to it's new starting position
	$('album-art').setStyle({
		left: start + "px"
	});
	// Perform the animation
	Mojo.Animation.animateStyle($('album-art'), 'left', 'bezier', {
		from: start,
		to: finish,
		duration: this.animationDuration,
		curve: this.animationType
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
				this.db.updatePodcasts();
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
		switch(command.type) {
			case PodcastStorage.LoadingDatabaseSuccess:
				Mojo.Log.info("[MainAssistant.LoadingDatabaseSuccess]");
				this.podcastDisplayUpdate();
				if(this.db.requiresUpdate) {
				    this.db.updatePodcasts();
				}
				break;
			case PodcastStorage.LoadingDatabaseFailure:
				Mojo.Log.error("[MainAssistant.LoadingDatabaseFailure] %s", command.error.message);
				break;
			case PodcastStorage.SavingDatabaseFailure:
				Mojo.Log.error("[MainAssistant.SavingDatabaseFailure] %s", command.error.message);
				break;
			case PodcastStorage.SavingDatabaseSuccess:
				break;
			case Podcast.PodcastStartUpdate:
				Mojo.Log.info("[MainAssistant.PodcastStartUpdate] %s starting update.", podcastKey);
				// Updated podcast is the currently showing podcast
				if(this.db.currentPodcast().key == podcastKey) {
				    this.spinnerModel.spinning = true;
				    this.controller.modelChanged(this.spinnerModel);
				} else {
				    // TODO Dashboard please...
				    var title = command.podcast.title;
				    var message = (title === undefined) ? "Updating podcast..." : "Updating " + title;
				    Mojo.Controller.getAppController().showBanner(message, {source: 'notification'});
				}
				break;
			case Podcast.PodcastUpdateSuccess:
				Mojo.Log.info("[MainAssistant.PodcastUpdateSuccess] %s finished updating.", podcastKey);
				// Updated podcast is the currently showing podcast
				if(this.db.currentPodcast().key == podcastKey) {
					this.spinnerModel.spinning = false;
					this.controller.modelChanged(this.spinnerModel);

					this.podcastDisplayUpdate();
				}
				break;
			case Podcast.PodcastUpdateFailure:
				try {
					// Updated podcast is the currently showing podcast
					if(this.db.currentPodcast().key == podcastKey) {
						this.spinnerModel.spinning = false;
						this.controller.modelChanged(this.spinnerModel);
					}
					var msg = "Update of " + command.podcast.key + " failed. " + command.message;
					Mojo.Controller.errorDialog(msg);
				} catch(error) {
					Mojo.Log.error("[MainAssistant.PodcastUpdateFailure] %s", error.message);
				}
				break;
			case PFeedItem.CacheCanceled:
				// Remove the canceled button
				this.listItemUpdate(command.key);
				// Remove the item from the downloading models
				this.actionItems.downloadingModels.unset(command.key);
				break;
			case PFeedItem.CacheProgress:
				// Update the downloading
				// Check that the download item is set
				if(this.actionItems.downloadingModels.get(command.key) === undefined) {
					// If not set it
					this.actionItems.downloadingModels.set(command.key, command.item);
				}
				this.listItemUpdate(command.key, command.percentage);
				break;
			case PFeedItem.CacheError:
				// Something went wrong
				this.listItemUpdate(command.key);
				// Remove the item from the downloading models
				this.actionItems.downloadingModels.unset(command.key);
				var msg = "[Code " + command.completionStatusCode + "] Cache of " + command.url + " failed."
				Mojo.Controller.errorDialog(msg);
				break;
			case PFeedItem.EnclosureCached:
				this.listItemUpdate(command.key);
				// Remove the item from the downloading models
				this.actionItems.downloadingModels.unset(command.key);
				break;
			default:
				Mojo.Log.info("[MainAssistant.handleCommand] Not handling %s", command.type);
				break;
		}
	}
};

MainAssistant.prototype.handleListClick = function(event) {
	var nowPlaying = this.actionItems.nowPlayingModel;
	// Check if we should pause
	if(!this.audioPlayer.paused && nowPlaying && nowPlaying.key === event.item.key) {
		// Pause the player since it is the same item and we clicked
		Mojo.Log.info("[MainAssistant.handleListClick] Pausing %s", event.item.key);
		this.audioPlayer.pause();

	// Check if we should resume
	} else if(this.audioPlayer.paused && nowPlaying && nowPlaying.key === event.item.key) {
		// The player needs to start playing since it was paused
		Mojo.Log.info("[MainAssistant.handleListClick] Resuming %s", event.item.key);
		this.audioPlayer.play();

	// Otherwise start fresh
	} else {
		// Get the selected row
		this.actionItems.nowPlayingModel = this.db.getItem(event.item.key);
		nowPlaying = this.actionItems.nowPlayingModel;
		Mojo.Log.info("[MainAssistant.handleListClick] (%i) %s", event.index, nowPlaying.getEnclosure());
		switch(nowPlaying.enclosureType) {
			case 'video/mp4':
			case 'video/x-m4v':
			case 'video/quicktime':
				Mojo.Log.info("[MainAssistant.handleListClick] Playing Video");
				//$('video-object').toggleClassName('video');
				//this.videoPlayer.src = event.item.enclosure;
				// Make sure the audio stops then play some videos
				while(!this.audioPlayer.paused) {
					this.stop();
				}
				var args = {
					appId: "com.palm.app.videoplayer",
					name: "nowplaying"
				};
				var params = {
					target: nowPlaying.getEnclosure(),
					title: nowPlaying.title,
					thumbUrl: nowPlaying.getImage()
				};
				this.controller.stageController.pushScene(args, params);
				break;
			case 'audio/mp3':
			case 'audio/mpeg':
				Mojo.Log.info("[MainAssistant.handleListClick] Playing Audio");
				// Check if the scene can play audio
				if(this.audioPlayerCanPlay) {
					// If currently playing then stop what is currently playing
					while(!this.audioPlayer.paused) {
						this.stop();
					}
					this.audioPlayer.src = nowPlaying.getEnclosure();
				}
				break;
			default:
				Mojo.Log.error("[MainAssistant.handleListClick] Unknown file extension. %s", nowPlaying.enclosureType);
				break;
		}
	}
};

/**
 * Handles all HTML 5 Audio object events.
 */
MainAssistant.prototype.audioEvent = function(event) {
	switch(event.type) {
		case Media.Event.X_PALM_CONNECT:
			this.audioPlayerCanPlay = true;
			break;
		case Media.Event.X_PALM_DISCONNECT:
			this.audioPlayerCanPlay = false;
			break;
		case Media.Event.LOADSTART:
		case Media.Event.LOAD:
			break;
		case Media.Event.PROGRESS:
			var totalDuration = this.audioPlayer.duration;
			var bufferedMedia = this.audioPlayer.buffered.end();
			if(bufferedMedia !== undefined) {
				// Calculate percent complete
				var percentage = (!isNaN(totalDuration) && !isNaN(bufferedMedia) && totalDuration !== 0) ? ((bufferedMedia / totalDuration) * 100) : 0;

				// Update the UI
				this.listItemUpdate(this.actionItems.nowPlayingModel.key, percentage);
			}
			break;
		case Media.Event.PLAY:
			this.play();
			break;
		case Media.Event.PAUSE:
			Mojo.Log.info("[Media.Event.PAUSE] %s", this.audioPlayer.paused);
			this.pause();
			break;
		case Media.Event.ENDED:
			this.stop();
			break;
		default:
			Mojo.Log.error("[MainAssistant.audioEvent] %s", event.type);
			break;
	}
};

MainAssistant.prototype.play = function() {
	// Start timer
	this.timerHandler('start');
};

MainAssistant.prototype.pause = function() {
	this.timerHandler('stop');
	// Store the current position
};

MainAssistant.prototype.stop = function() {
	this.timerHandler('stop');
	if(this.audioPlayerCanPlay) {
		this.actionItems.nowPlayingModel = undefined;
	}
};

MainAssistant.prototype.timerHandler = function(action) {
	try {
		if((this.uiUpdateTimer !== undefined && action == 'start') || action == 'stop') {
			clearInterval(this.uiUpdateTimer);
			this.uiUpdateTimer = undefined;
		}

		if(action == 'start') {
			this.uiUpdateTimer = setInterval(this.listItemUpdate.bind(this), 500);
		}
	} catch(error) {
		Mojo.Log.error("[MainAssistant.timerHandler] %s", error.message);
	}
};

MainAssistant.ListMode = {};
MainAssistant.ListMode.New = 'new';
MainAssistant.ListMode.Listened = 'listened';
MainAssistant.ListMode.Downloaded = 'downloaded';
