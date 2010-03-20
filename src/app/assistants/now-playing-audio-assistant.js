function NowPlayingAudioAssistant(podcastToPlay) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */

	this.podcastItem = podcastToPlay;
	this.podcast = AppAssistant.db.podcastContainingItem(this.podcastItem.key);
	this.audioEventListener = this.audioEvent.bindAsEventListener(this);

	this.sliderAttributes = {
		modelProperty: 'value',
		minValue: 0,
		maxValue: 1,
		round: false,
		updateInterval: 0
	};

	this.sliderModel = {
		value: .3,
		disabled: false
	};
}

NowPlayingAudioAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	var renderedInfo = Mojo.View.render(
		{
			object: {
				title: this.podcast.title,
				author: this.podcast.author,
				category: this.podcast.category,
				language: this.podcast.language,
				copyright: this.podcast.copyright,
				image: this.podcast.getImage(),
				episodeTitle: this.podcastItem.title,
				episodeDescription: Mojo.Format.runTextIndexer(this.podcastItem.description)
			},
			template: 'now-playing-audio/now-playing-audio-scene-template'
		}
	);

	$('now-playing-audio-scene-container').update(renderedInfo);

	/* setup widgets here */
	this.controller.setupWidget(
		"player-controls-slider",
		this.sliderAttributes,
		this.sliderModel
	);

	// Load the MediaExtension library
	this.libs = MojoLoader.require({ name: "mediaextension", version: "1.0"});
	// If you don't already have one, get a reference to the media element, using its ID
	this.audioPlayer = this.controller.get("audio-element");
	// Instantiate the MediaExtension object
	this.extObj = this.libs.mediaextension.MediaExtension.getInstance(this.audioPlayer);
	// Set the media class
	this.extObj.audioClass = "media";

	// Tell the audio object what to play
	this.setSource();

	/* add event handlers to listen to events from widgets */
};

NowPlayingAudioAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	// Audio events
	this.audioPlayer.addEventListener(Media.Event.X_PALM_CONNECT, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.X_PALM_DISCONNECT, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.X_PALM_WATCHDOG, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.ABORT, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.CANPLAY, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.CANPLAYTHROUGH, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.DURATIONCHANGE, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.EMPTIED, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.ENDED, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.ERROR, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.LOAD, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.LOADEDMETADATA, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.LOADSTART, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.PAUSE, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.PLAY, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.PROGRESS, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.SEEKED, this.audioEventListener, false);
	this.audioPlayer.addEventListener(Media.Event.SEEKING, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.STALLED, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.TIMEUPDATE, this.audioEventListener, false);
	//this.audioPlayer.addEventListener(Media.Event.WAITING, this.audioEventListener, false);
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
	if(this.audioPlayer.src !== this.podcastItem.getEnclosure()) {
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
	this.audioPlayer.pause = true;
	this.clearSource();
};

NowPlayingAudioAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */

	// Store the current playing position
	Mojo.Log.info("[NowPlayingAudioAssistant.deactivate] Saving current position: %s", this.audioPlayer.currentTime);
	this.podcastItem.savePosition(this.audioPlayer.currentTime);

	// Clean-up all the events on the audio player object
	this.audioPlayer.stopObserving(Media.Event.X_PALM_CONNECT, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.X_PALM_DISCONNECT, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.X_PALM_WATCHDOG, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.ABORT, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.CANPLAY, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.CANPLAYTHROUGH, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.CANSHOWFIRSTFRAME, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.DURATIONCHANGE, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.EMPTIED, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.ENDED, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.ERROR, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.LOAD, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.LOADEDFIRSTFRAME, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.LOADEDMETADATA, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.LOADSTART, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.PAUSE, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.PLAY, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.PROGRESS, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.SEEKED, this.audioEventListener, false);
	this.audioPlayer.stopObserving(Media.Event.SEEKING, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.STALLED, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.TIMEUPDATE, this.audioEventListener, false);
	//this.audioPlayer.stopObserving(Media.Event.WAITING, this.audioEventListener, false);
};

NowPlayingAudioAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
	Mojo.Log.info("[NowPlayingAudioAssistant.cleanup] Cleaning up.");

	// Stop the audio from playing
	this.stop();

	// Store the current playing position
	Mojo.Log.info("[NowPlayingAudioAssistant.cleanup] Saving current position: %s", this.audioPlayer.currentTime);
	this.podcastItem.savePosition(this.audioPlayer.currentTime);
};

NowPlayingAudioAssistant.prototype.audioEvent = function(event) {
        switch(event.type) {
                //case Media.Event.X_PALM_CONNECT:
                //        this.audioPlayerCanPlay = true;
                //        break;
                //case Media.Event.X_PALM_DISCONNECT:
                //        this.audioPlayerCanPlay = false;
                //        break;
                //case Media.Event.LOADSTART:
                //case Media.Event.LOAD:
                //        break;
                //case Media.Event.PROGRESS:
                //        var totalDuration = this.audioPlayer.duration;
                //        var bufferedMedia = this.audioPlayer.buffered.end();
                //        if(bufferedMedia !== undefined) {
                //                // Calculate percent complete
                //                var percentage = (!isNaN(totalDuration) && !isNaN(bufferedMedia) && totalDuration !== 0) ? ((bufferedMedia / totalDuration) * 100) : 0;
                //
                //                // Update the UI
                //                this.listItemUpdate(this.actionItems.nowPlayingModel.key, percentage);
                //        }
                //        break;
                //case Media.Event.PLAY:
                //        this.play();
                //        break;
                //case Media.Event.PAUSE:
                //        Mojo.Log.info("[Media.Event.PAUSE] %s", this.audioPlayer.paused);
                //        this.pause();
                //        break;
                //case Media.Event.ENDED:
                //        this.stop();
                //        break;
			 case Media.Event.CANPLAYTHROUGH:
				this.audioPlayer.play();
				break;
			 case Media.Event.ERROR:
				//MediaError.MEDIA_ERR_ABORTED=1	Equals HTML5 aborted error value.
				//MediaError.MEDIA_ERR_DECODE=2	Equals HTML5 decode error value.
				//MediaError.MEDIA_ERR_NETWORK=3	Equals HTML5 network error value.
				//MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED=4
				var error = '';
				switch(event.target.error.code) {
					case event.target.error.MEDIA_ERR_ABORTED:
						error = "The media was aborted.";
						break;
					case event.target.error.MEDIA_ERR_DECODE:
						error = "There was an error decoding the file: " + event.target.src;
						break;
					case event.target.error.MEDIA_ERR_NETWORK:
						error = "There was an error with the network.";
						break;
					case event.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
						error = "The source file is not supported: " + event.target.src;
						break;
					default:
						error = "Unknown error " + event.target.error.code;
						break;
				}
				Mojo.Log.error("[NowPlayingAudioAssistant.Media.ERROR] %s", error);
				break;
                default:
				Mojo.Log.info("[NowPlayingAudioAssistant.audioEvent] %s", event.type);
				break;
        }
};
