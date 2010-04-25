function NowPlayingAudioAssistant(podcastToPlay) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	this.animationDuration = 0.25;
	this.animationType = 'ease-in';
	this.controlShown = false;
	this.podcastItem = podcastToPlay;
	this.podcast = AppAssistant.db.podcastContainingItem(this.podcastItem.key);
	this.minimize = this.deactivate.bindAsEventListener(this);
	this.maximize = this.activate.bindAsEventListener(this);
	this.seekingEventListener = this.userSeeking.bindAsEventListener(this);
	this.seekedEventListener = this.userSeeked.bindAsEventListener(this);
	this.audioEventListener = this.audioEvent.bindAsEventListener(this);
	this.playPauseBtnListener = this.handlePlayPauseToggle.bindAsEventListener(this);
	this.forwardBtnListener = this.handleForwardButton.bindAsEventListener(this);
	this.rewindBtnListener = this.handleRewindButton.bindAsEventListener(this);
	this.timerUpdateSceneHandler = this.updateSceneOnTimer.bindAsEventListener(this);
	this.toggleControlAreaListener = this.handlePlayerAreaTap.bindAsEventListener(this);
	this.hideControlAreaListener = this.handleSceneTap.bindAsEventListener(this);
	this.resume = this.podcastItem.currentTime > 0;
	this.sceneUpdateTimer = undefined;

	this.sliderAttributes = {
		sliderProperty: "currentTime",
		progressProperty: "progressUpper",
		progressStartProperty: "progressLower",
		round: false,
		cancellable: true,
		updateInterval: 0
	};

	this.sliderModel = {
		sliderMinValue: 0,
		sliderMaxValue: 100,
		currentTime: 0,
		progressUpper: 0,
		progressLower: 0
	};
}

NowPlayingAudioAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	this.controller.setupWidget(Mojo.Menu.appMenu, AppAssistant.appMenuAttr, AppAssistant.standardModel);

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	var renderedInfo = Mojo.View.render(
		{
			object: {
				title: Mojo.Format.runTextIndexer(this.podcast.title),
				author: Mojo.Format.runTextIndexer(this.podcast.author),
				category: Mojo.Format.runTextIndexer(this.podcast.category),
				language: Mojo.Format.runTextIndexer(this.podcast.language),
				copyright: Mojo.Format.runTextIndexer(this.podcast.copyright),
				image: this.podcast.getImage(),
				episodeTitle: Mojo.Format.runTextIndexer(this.podcastItem.title),
				episodeDescription: Mojo.Format.runTextIndexer(this.podcastItem.description)
			},
			template: 'now-playing-audio/now-playing-audio-scene-template'
		}
	);

	this.controller.get("now-playing-audio-scene-container").update(renderedInfo);

	/* setup widgets here */
	this.podcastDescription = this.controller.get('podcast-description');
	this.playerControlArea = this.controller.get('player-controls-slider-area');
	this.playPauseElement = this.controller.get('play-pause-toggle');
	this.forward = this.controller.get('fastforward');
	this.rewind = this.controller.get('rewind');
	this.timePlayed = this.controller.get('timePlayed');
	this.timeRemaining = this.controller.get('timeRemaining');
	this.progressSlider = this.controller.get("player-controls-slider");

	// Load the MediaExtension library
	this.libs = MojoLoader.require({ name: "mediaextension", version: "1.0"});
	// If you don't already have one, get a reference to the media element, using its ID
	this.audioPlayer = this.controller.get("audio-element");
	// Instantiate the MediaExtension object
	this.extObj = this.libs.mediaextension.MediaExtension.getInstance(this.audioPlayer);
	// Set the media class
	this.extObj.audioClass = Media.AudioClass.MEDIA;

	// Fix for making the slider render correctly if resuming play-back screen
	if(this.isPlaying()) {
		Mojo.Log.error("Setting duration to: %s", this.audioPlayer.duration);
		this.sliderModel.sliderMaxValue = this.audioPlayer.duration;
		this.sliderModel.currentTime = this.audioPlayer.currentTime;
	}

	this.controller.setupWidget(
		"player-controls-slider",
		this.sliderAttributes,
		this.sliderModel
	);

	// Tell the audio object what to play
	this.setSource();
	// Decide to show the player controls
	//this.togglePlayerControls(this.controlShown);

	/* add event handlers to listen to events from widgets */
	this.controller.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.maximize);
	this.controller.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.minimize);
};

NowPlayingAudioAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	// Make sure the Scene is displaying correct info when the scene
	if(this.isPlaying()) {
		this.playPauseElement.removeClassName('play');
		this.playPauseElement.addClassName('pause');
		this.timerToggle('start');
	}

	// Audio events
	//this.audioPlayer.addEventListener(Media.Event.X_PALM_CONNECT, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.X_PALM_DISCONNECT, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.X_PALM_WATCHDOG, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.ABORT, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.CANPLAY, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.CANPLAYTHROUGH, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.DURATIONCHANGE, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.EMPTIED, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.ENDED, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.ERROR, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.LOAD, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.LOADEDMETADATA, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.LOADSTART, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.PAUSE, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.PLAY, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.PROGRESS, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.SEEKED, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.SEEKING, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.STALLED, this.audioEventListener);
	//this.audioPlayer.addEventListener(Media.Event.TIMEUPDATE, this.audioEventListener);
	this.audioPlayer.addEventListener(Media.Event.WAITING, this.audioEventListener);

	this.controller.listen("player-controls-slider", Mojo.Event.propertyChange, this.seekedEventListener);
	this.controller.listen("player-controls-slider", Mojo.Event.dragging, this.seekingEventListener);

	this.controller.listen(this.playPauseElement, Mojo.Event.tap, this.playPauseBtnListener);
	this.controller.listen(this.forward, Mojo.Event.tap, this.forwardBtnListener);
	this.controller.listen(this.rewind, Mojo.Event.tap, this.rewindBtnListener);

	// Listen for events to control the display or hiding of the player control area at the bottom of the screen
	this.controller.listen(this.playerControlArea, Mojo.Event.tap, this.toggleControlAreaListener);
	this.controller.listen(this.controller.stageController.document, Mojo.Event.tap, this.hideControlAreaListener);
	this.controller.listen(this.podcastDescription, Mojo.Event.flick, this.hideControlAreaListener);
	this.controller.listen(this.podcastDescription, Mojo.Event.dragStart, this.hideControlAreaListener);
};

/**
 * Checks to see if the Audio object is currently playing. The is playing algorithm is based on:
 * "A media element is said to be potentially playing when its paused attribute is false, the readyState
 * attribute is either HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA, the element has not ended playback,
 * playback has not stopped due to errors, and the element has not paused for user interaction."
 * This is from: http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html#potentially-playing
 */
NowPlayingAudioAssistant.prototype.isPlaying = function() {
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

/**
 * Take the enclosure path from the podcast item object and set the HTML5 Audio object to play it.
 */
NowPlayingAudioAssistant.prototype.setSource = function() {
	//Mojo.Log.info("Audio Src: %s", this.audioPlayer.currentSrc);
	//Mojo.Log.info("Podcast Src: %s", this.podcastItem.getEnclosure());
	//Mojo.Log.info(Object.keys(this.audioPlayer));
	if(this.audioPlayer.currentSrc !== this.podcastItem.getEnclosure()) {
		this.clearSource();
		this.audioPlayer.src = this.podcastItem.getEnclosure();
		this.audioPlayer.load();
	}
};

/**
 * Clears the Audio object and stops it from playing anything.
 */
NowPlayingAudioAssistant.prototype.clearSource = function() {
	this.audioPlayer.src = null;
};

/**
 * Tells the media object to stop playing the current object.
 */
NowPlayingAudioAssistant.prototype.stop = function() {
	this.audioPlayer.pause();
	this.clearSource();
};

/**
 * Handle user pressing the play-pause-toggle div.
 */
NowPlayingAudioAssistant.prototype.handlePlayPauseToggle = function(event) {
	event.stop();
	if(this.isPlaying()) {
		this.audioPlayer.pause();
	} else {
		this.audioPlayer.play();
	}
};

NowPlayingAudioAssistant.prototype.handleForwardButton = function(event) {
	event.stop();
	if(this.isPlaying()) {
		this.audioPlayer.currentTime += 20;
		this.audioPlayer.play();
	}
};

NowPlayingAudioAssistant.prototype.handleRewindButton = function(event) {
	event.stop();
	if(this.isPlaying()) {
		this.audioPlayer.currentTime -= 15;
		this.audioPlayer.play();
	}
};

/**
 * ALways hides the player controls.
 */
NowPlayingAudioAssistant.prototype.handleSceneTap = function(event) {
	if(this.controlShown) {
		this.togglePlayerControls(false);
	}
};

/**
 * This method is used toggle if the player area is either showing
 * or hiding.
 */
NowPlayingAudioAssistant.prototype.handlePlayerAreaTap = function(event) {
	event.stop();
	this.togglePlayerControls(!this.controlShown);
};

/**
 * Handle updating the UI elements like the slider position and the now
 * playing times.
 */
NowPlayingAudioAssistant.prototype.updateSceneOnTimer = function() {
	// Check to make sure the control panel is on the stage,
	// and make sure the user is playing something. Otherwise, stop screen updating, wasting battery
	if(this.isPlaying() && this.controlShown) {
		this.timePlayed.update(this.audioPlayer.currentTime.secondsToDuration());
		this.timeRemaining.update((this.audioPlayer.duration - this.audioPlayer.currentTime).secondsToDuration());
		this.sliderModel.currentTime = this.audioPlayer.currentTime;
		this.controller.modelChanged(this.sliderModel);
	} else {
		this.timerToggle('stop');
	}
};

/**
 * Function starts/stops the display update from happening.
 * @param action {string} The acceptable values are either: start or stop. 'start' will start the display update; where 'stop' will stop it.
 */
NowPlayingAudioAssistant.prototype.timerToggle = function(action) {
	try {
		if((this.sceneUpdateTimer !== undefined && action == 'start') || action == 'stop') {
			clearInterval(this.sceneUpdateTimer);
			this.sceneUpdateTimer = undefined;
		}

		if(action == 'start') {
			this.sceneUpdateTimer = setInterval(this.timerUpdateSceneHandler, 1000);
		}
	} catch(error) {
		Mojo.Log.error("[NowPlayingAudioAssistant.timerToggle] %s", error.message);
	}
};

/**
 * Function shows or hides the player controls at the bottom of the screen. It stores
 * the controlShown parameter to be whatever is passed in.
 * @param show {boolean} If true shows the player controls, false hides them.
 */
NowPlayingAudioAssistant.prototype.togglePlayerControls = function(show) {
	// Player controls are shown: bottom = 0;
	// Player controls are hidden: bottom = -63px;
	var startPosition = (!show) ? 0 : -72;	//was -63
	var endPosition = (show) ? 0 : -72;		//was -63
	this.controlShown = show;

	// Make sure the timer is running if the user is playing and control
	// panel is showing
	if(this.controlShown && this.isPlaying()) {
		this.timerToggle('start');
		this.audioPlayer.addEventListener(Media.Event.PROGRESS, this.audioEventListener);
	} else {
		// Stop listening for events
		this.timerToggle('stop');
		this.audioPlayer.stopObserving(Media.Event.PROGRESS, this.audioEventListener);
	}

	Mojo.Animation.animateStyle(this.playerControlArea, 'bottom', 'bezier', {
		from: startPosition,
		to: endPosition,
		duration: this.animationDuration,
		curve: this.animationType
	});
};

NowPlayingAudioAssistant.prototype.userSeeking = function(event) {
	event.stop();
	if(this.isPlaying()) {
		this.audioPlayer.pause();
	}
	this.timePlayed.update(event.value.secondsToDuration());
	this.timeRemaining.update((this.sliderModel.sliderMaxValue - event.value).secondsToDuration());
};

NowPlayingAudioAssistant.prototype.userSeeked = function(event) {
	event.stop();
	Mojo.Log.info("[NowPlayingAudioAssistant.userSeeked] %s", event.value);
	// Actually fast forward to the time
	this.audioPlayer.currentTime = event.value;
	this.audioPlayer.play();
	this.timePlayed.update(event.value.secondsToDuration());
	this.timeRemaining.update((this.audioPlayer.duration - event.value).secondsToDuration());
};

NowPlayingAudioAssistant.prototype.audioEvent = function(event) {
	switch(event.type) {
		case Media.Event.SEEKED:
			this.updateSceneOnTimer();
			break;
		case Media.Event.LOAD:
			// Update the UI
			this.sliderModel.progressUpper = 1;
			this.controller.modelChanged(this.sliderModel);
			break;
		case Media.Event.PROGRESS:
			var totalDuration = this.audioPlayer.duration;
			var bufferedStart = this.audioPlayer.buffered.start(0);
			var bufferedMedia = this.audioPlayer.buffered.end(0);
			if(bufferedMedia !== undefined) {
				// Calculate percent complete
				var percentage = (!isNaN(totalDuration) && !isNaN(bufferedMedia) && totalDuration !== 0) ? bufferedMedia / totalDuration : 0;
				var percentageStart = (!isNaN(totalDuration) && !isNaN(bufferedStart) && totalDuration !== 0) ? bufferedStart : 0;

				//Mojo.Log.info("[Media.Event.Progress] Start: %s, End: %s", percentageStart, percentage);

				// Update the UI
				this.sliderModel.progressUpper = percentage;
				this.controller.modelChanged(this.sliderModel);
			}
			break;
		case Media.Event.DURATIONCHANGE:
			if(!isNaN(this.audioPlayer.duration)) {
				// Set the maximum value to be the duration
				this.controller.get("player-controls-slider").mojo.updateDraggingArea(0, this.audioPlayer.duration);
			}
			break;
		case Media.Event.PLAY:
			// turn on the pause button
			this.playPauseElement.removeClassName('play');
			this.playPauseElement.addClassName('pause');
			this.timerToggle('start');
			break;
		case Media.Event.PAUSE:
			// turn on the play button
			this.playPauseElement.removeClassName('pause');
			this.playPauseElement.addClassName('play');
			this.timerToggle('stop');
			break;
		//case Media.Event.ENDED:
		//	this.stop();
		//	break;
		case Media.Event.CANPLAYTHROUGH:
			// Check if we are supposed to jump to a specfic point
			// If so do not start playing yet
			if(!this.resume) {
				this.audioPlayer.play();
			} else if(this.resume && !this.isPlaying()) {
				//Mojo.Log.info("[NowPlayingAudioAssistant.Media.CANPLAYTHROUGH] Resuming at %s", this.podcastItem.currentTime);
				this.audioPlayer.currentTime = this.podcastItem.currentTime;
				this.audioPlayer.play();
				this.resume = false;
			}
			break;
		case Media.Event.ERROR:
			//MediaError.MEDIA_ERR_ABORTED=1	Equals HTML5 aborted error value.
			//MediaError.MEDIA_ERR_DECODE=2	Equals HTML5 decode error value.
			//MediaError.MEDIA_ERR_NETWORK=3	Equals HTML5 network error value.
			//MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED=4
			var error = '';
			switch(event.target.error.code) {
				case event.target.error.MEDIA_ERR_ABORTED:
					error = $L("The media was aborted.");
					break;
				case event.target.error.MEDIA_ERR_DECODE:
					error = $L("There was an error decoding the file: ") + event.target.src;
					break;
				case event.target.error.MEDIA_ERR_NETWORK:
					error = $L("There was an error with the network.");
					break;
				case event.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					error = $L("The source file is not supported: ") + event.target.src;
					break;
				default:
					error = $L("Unknown error ") + event.target.error.code;
					break;
			}
			Mojo.Log.error("[NowPlayingAudioAssistant.Media.ERROR] %s", error);
			break;
		default:
			Mojo.Log.info("[NowPlayingAudioAssistant.audioEvent] %s", event.type);
			break;
	}
};

NowPlayingAudioAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.timerToggle('stop');

	// Store the current playing position
	Mojo.Log.info("[NowPlayingAudioAssistant.deactivate] Saving current position: %s", this.audioPlayer.currentTime);
	this.podcastItem.savePosition(this.audioPlayer.currentTime);

	// Clean-up all the events on the audio player object
	//this.audioPlayer.stopObserving(Media.Event.X_PALM_CONNECT, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.X_PALM_DISCONNECT, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.X_PALM_WATCHDOG, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.ABORT, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.CANPLAY, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.CANPLAYTHROUGH, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.DURATIONCHANGE, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.EMPTIED, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.ENDED, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.ERROR, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.LOAD, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.LOADEDFIRSTFRAME, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.LOADEDMETADATA, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.LOADSTART, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.PAUSE, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.PLAY, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.PROGRESS, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.SEEKED, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.SEEKING, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.STALLED, this.audioEventListener);
	//this.audioPlayer.stopObserving(Media.Event.TIMEUPDATE, this.audioEventListener);
	this.audioPlayer.stopObserving(Media.Event.WAITING, this.audioEventListener);

	this.controller.stopListening(this.playPauseElement, Mojo.Event.tap, this.playPauseBtnListener);
	this.controller.stopListening(this.forward, Mojo.Event.tap, this.forwardBtnListener);
	this.controller.stopListening(this.rewind, Mojo.Event.tap, this.rewindBtnListener);
	this.controller.stopListening("player-controls-slider", Mojo.Event.propertyChange, this.seekedEventListener);
	this.controller.stopListening("player-controls-slider", Mojo.Event.dragging, this.seekingEventListener);

	this.controller.stopListening(this.playerControlArea, Mojo.Event.tap, this.toggleControlAreaListener);
	this.controller.stopListening(this.controller.stageController.document, Mojo.Event.tap, this.hideControlAreaListener);
	this.controller.stopListening(this.podcastDescription, Mojo.Event.flick, this.hideControlAreaListener);
	this.controller.stopListening(this.podcastDescription, Mojo.Event.dragStart, this.hideControlAreaListener);
};

NowPlayingAudioAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
	this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.maximize);
	this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.minimize);
};
