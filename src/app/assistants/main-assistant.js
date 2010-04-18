function MainAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the
	 * additional parameters (after the scene name) that were passed to pushScene. The reference
	 * to the scene controller (this.controller) has not be established yet, so any initialization
	 * that needs the scene controller should be done in the setup function below. */
	// Set the display to show new podcasts only
	this.mode = MainAssistant.ListMode.New;
	this.videoPlayer = {};
	this.screenWidth = Mojo.Environment.DeviceInfo.screenWidth;
	this.screenHeight = Mojo.Environment.DeviceInfo.screenHeight;
	this.animationFinish = 500;
	this.animationDuration = 0.25;
	this.animationType = 'ease-in';

	this.nowPlayingKey = '';
	this.nowPlayingNode = undefined;

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
	this.audioEventListener = this.audioEvent.bindAsEventListener(this);
}

MainAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

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
		this.controller.listen(this.controller.get('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.listen(this.controller.get('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.listen(this.controller.get('album-art'), Mojo.Event.tap, this.handleAlbumArtTap.bindAsEventListener(this));
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
		this.audioPlayer.addEventListener(Media.Event.TIMEUPDATE, this.audioEventListener);
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
		this.controller.stopListening(this.controller.get('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
		this.controller.stopListening(this.controller.get('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
		this.controller.stopListening(this.controller.get('episodeList'), Mojo.Event.listTap, this.handleListClick.bindAsEventListener(this));
		this.controller.stopListening(this.controller.get('episodeList'), Mojo.Event.listDelete, this.handleListDelete.bindAsEventListener(this));

		this.audioPlayer.stopObserving(Media.Event.TIMEUPDATE, this.audioEventListener);
	} catch(eventErrors) {
		Mojo.Log.error("[MainAssistant.cleanup] %s", eventErrors.message);
	}
};

MainAssistant.prototype.listItemRender = function(listWidget, itemModel, itemNode) {
	// If playing and the key matches the playing key set this item as the
	// user's selected row. Should keep the UI up to date!!
	// !!! VERY IMPORTANT !!!
	if(itemModel.key === this.nowPlayingKey) {
		this.nowPlayingNode = itemNode;
	}

	try {
		// Setup the download btn listener
		var downloadBtn = itemNode.select('.downloadButton')[0];
		var episodeTitle = itemNode.select('.episodeTitle')[0];
		var episodeLength = itemNode.select('.episodeLength')[0];
		// Get the PFeedItem that is being represented by this itemModel
		var pfeedItem = AppAssistant.db.getItem(itemModel.key);
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
		var node = this.controller.get(key);
		var itemModel = AppAssistant.db.getItem(key);

		// Check to make sure the node trying to update
		// is even currently drawn on the scene (list)
		if(node) {
			// Get the Item that is currently downloading
			// Select the progress bar layer
			var statusDiv = node.select('.status')[0];
			// Select the time indicator layer
			var currentTimeDiv = node.select('.episodeLength')[0];
			// Select the episode title layer
			var episodeTitle = node.select('.episodeTitle')[0];
			// Select the download button
			var downloadBtn = node.select('.downloadButton')[0];
			// Check to see if in one of 5 states:
			// 1. Downloading => itemModel !== undefined && itemModel.isCaching() == true
			// 2. Downloaded => itemModel.isEnclosureCache() == true
			// 3. Default => itemModel.isEnclosureCached() == false && itemModel.isCaching() == false
			// Case 1: Downloading
			if(itemModel && itemModel.isCaching()) {
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

			// Case 2: Downloaded
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
			// Case 3: Default
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
	AppAssistant.db.currentPodcast().markAsListened(event.item.key, true);
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
			this.controller.get('album-art').removeChild(this.controller.get('image'));
			this.controller.get('album-art').appendChild(new Element('img', {
				id: 'image',
				src: (currPodcast.getImage) ? currPodcast.getImage() : '',
				alt: '',
				height: '144px',
				width: '144px'
			}));
			//this.controller.get('episodeList').mojo.revealItem(0, true);
			this.controller.get('podcastTitle').update((currPodcast.title === undefined) ? "" : currPodcast.title);

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
			this.controller.get('album-art').removeChild(this.controller.get('image'));
			this.controller.get('album-art').appendChild(new Element('img', {
				id: 'image',
				src: './images/default-album-art.png',
				alt: '',
				height: '144px',
				width: '144px'
			}));
			this.controller.get('podcastTitle').update("No Podcasts In Database");
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
	},AppAssistant.db.currentPodcast());
};

/**
 * If the user flicks the album art to switch to the next podcast.
 */
MainAssistant.prototype.handleAlbumArtFlick = function(event) {
	// Stop the event from propagating
	event.stop();
	var start = this.controller.get("album-art").cumulativeOffset().left;
	if(event.velocity.x >= 500) {
		Mojo.Animation.animateStyle(this.controller.get("album-art"), 'left', 'bezier', {
			from: start,
			to: this.animationFinish,
			duration: this.animationDuration,
			curve: this.animationType,
			onComplete: this.switchPodcast.bind(this, 'previous')
		});
	} else if(event.velocity.x <= - 500) {
		Mojo.Animation.animateStyle(this.controller.get("album-art"), 'left', 'bezier', {
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
		AppAssistant.db.nextPodcast();
		this.podcastDisplayUpdate();
	} else if(next === 'previous') {
		AppAssistant.db.previousPodcast();
		this.podcastDisplayUpdate();
	}
	// Move the image to it's new starting position
	this.controller.get('album-art').setStyle({
		left: start + "px"
	});
	// Perform the animation
	Mojo.Animation.animateStyle(this.controller.get('album-art'), 'left', 'bezier', {
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
				break;
			case Podcast.PodcastStartUpdate:
				Mojo.Log.info("[MainAssistant.PodcastStartUpdate] %s starting update.", podcastKey);
				// Updated podcast is the currently showing podcast
				if(AppAssistant.db.currentPodcast().key == podcastKey) {
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
				if(AppAssistant.db.currentPodcast().key == podcastKey) {
					this.spinnerModel.spinning = false;
					this.controller.modelChanged(this.spinnerModel);
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
					msg = "Update of " + command.podcast.key + " failed. " + command.message;
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
				this.listItemUpdate(command.key, command.percentage);
				break;
			case PFeedItem.CacheError:
				// Something went wrong
				this.listItemUpdate(command.key);
				msg = "[Code " + command.completionStatusCode + "] Cache of " + command.url + " failed.";
				Mojo.Controller.errorDialog(msg);
				break;
			case PFeedItem.EnclosureCached:
				this.listItemUpdate(command.key);
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
		case 'video/mp4':
		case 'video/x-m4v':
		case 'video/quicktime':
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
				title: nowPlaying.title,
				thumbUrl: AppAssistant.db.currentPodcast().getImage()
			};
			this.controller.stageController.pushScene(args, params);
			break;
		case 'audio/mp3':
		case 'audio/mpeg':
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


MainAssistant.prototype.audioEvent = function(event) {
	if(event.type === Media.Event.TIMEUPDATE) {
		if(this.nowPlayingNode) {
			this.nowPlayingNode.select('.episodeLength')[0].update(this.audioPlayer.currentTime.secondsToDuration());
		}
	}
};

MainAssistant.ListMode = {};
MainAssistant.ListMode.New = 'new';
MainAssistant.ListMode.Listened = 'listened';
MainAssistant.ListMode.Downloaded = 'downloaded';
