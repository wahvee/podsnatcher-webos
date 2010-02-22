function MainAssistant(db) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	   this.db = db;
	   this.selectedRow = undefined;
	   this.audioPlayer = undefined;
	   this.audioPlayerCanPlay = false;
	   this.audioPlayerIsPlaying = false;
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
			 listTemplate: "main/episodeListTemplate",
			 itemTemplate: "main/episodeListItemTemplate",
			 swipeToDelete: true,
			 uniquenessProperty: 'key',
			 onItemRendered: this.listItemRender.bindAsEventListener(this)
	   };
	   
	   this.episodeListModel = {
			 items: []
	   };
}

MainAssistant.prototype.setup = function() {
	   /* this function is for setup tasks that have to happen when the scene is first created */
	   
	   /* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	   
	   /* setup widgets here */
	   try {
			 //this.videoPlayer = $('video-object');
			 //this.videoPlayer = VideoTag.extendElement(this.videoPlayer, this.controller);
			 this.audioPlayer = new Audio();
			 this.controller.setupWidget("updatingSpinner", this.spinnerAttributes, this.spinnerModel);
			 this.controller.setupWidget("episodeList", this.episodeListAttributes, this.episodeListModel);
	   } catch (func_error) {
			 Mojo.Log.info("[Create Widgets] %s", func_error.message);
	   }
	
	   /* add event handlers to listen to events from widgets */
	   try {
			 // Listen for user to flick the album-art to change podcasts
			 this.controller.listen($('album-art-area-right'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
			 this.controller.listen($('album-art-area-left'), Mojo.Event.tap, this.albumArtAreaLeftOrRight.bind(this));
			 this.controller.listen($('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
			 this.controller.listen($('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
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
}

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	   // Wait for screen orientation changes
	   this.controller.listen(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
	   this.controller.listen(document, "shakeend", this.handleShaking.bindAsEventListener(this));
	   
	   try {			 
			 this.audioPlayer.addEventListener(Media.Event.X_PALM_CONNECT, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.X_PALM_DISCONNECT, this.audioEvent.bindAsEventListener(this), false);
			 //this.audioPlayer.addEventListener(Media.Event.X_PALM_WATCHDOG, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.ABORT, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.CANPLAY, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.CANPLAYTHROUGH, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.DURATIONCHANGE, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.EMPTIED, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.ENDED, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.ERROR, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.LOAD, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.LOADEDMETADATA, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.LOADSTART, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.PAUSE, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.PLAY, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.PROGRESS, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.SEEKED, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.SEEKING, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.STALLED, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.TIMEUPDATE, this.audioEvent.bindAsEventListener(this), false);
			 this.audioPlayer.addEventListener(Media.Event.WAITING, this.audioEvent.bindAsEventListener(this), false);
	   } catch(eventErrors) {
			 Mojo.Log.error("[MainAssistant.activate] %s", eventErrors.message);
	   }
}


MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

MainAssistant.prototype.listItemRender = function(listWidget, itemModel, itemNode) {
}

/**
 * After user swipes to delete.
 * Call the current podcast being displayed and tell it to
 * delete the item that was sent.
 */
MainAssistant.prototype.handleListDelete = function(event) {
	   // event.item.key
	   this.db.currentPodcast().deleteItem(event.item.key);
}

MainAssistant.prototype.refreshUI = function() {
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
			 $('podcastTitle').innerHTML = (currPodcast.title === undefined) ? "" : currPodcast.title;
			 this.episodeListModel.items = (currPodcast.items === undefined) ? [] : currPodcast.items;
			 this.controller.modelChanged(this.episodeListModel);
	   } catch(error) {
			 Mojo.Log.error("[MainAssistant.refreshUI] %s", error.message);
	   }
}

/**
 * Handle the commands that come from the objects that are created.
 */
MainAssistant.prototype.handleCommand = function(command) {
	   switch(command.type) {
			 case PodcastStorage.PodcastListStartUpdate:
				    Mojo.Log.info("[MainAssistant.PodcastListStartUpdate] Podcasts are starting updates.");
				    this.refreshUI();
				    break;
			 case PodcastStorage.PodcastListFinishUpdate:
				    Mojo.Log.info("[MainAssistant.PodcastListFinishUpdate] Podcasts are finishing updates.");
				    this.db.save();
				    break;
			 case PodcastStorage.LoadingDatabaseSuccess:
				    Mojo.Log.info("[MainAssistant.LoadingDatabaseSuccess]");
				    this.refreshUI();
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
			 case Podcast.PodcastStartUpdate:
				    var podcastKey = command.podcast.key;
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
				    var podcastKey = command.podcast.key;
				    Mojo.Log.info("[MainAssistant.PodcastUpdateSuccess] %s finished updating.", podcastKey);
				    // Updated podcast is the currently showing podcast
				    if(this.db.currentPodcast().key == podcastKey) {
						  this.spinnerModel.spinning = false;
						  this.controller.modelChanged(this.spinnerModel);
						  
						  this.refreshUI();
				    }
				    break;
			 case Podcast.PodcastUpdateFailure:
				    // Updated podcast is the currently showing podcast
				    var podcastKey = command.podcast.key;
				    if(this.db.currentPodcast().key == podcastKey) {
						  this.spinnerModel.spinning = false;
						  this.controller.modelChanged(this.spinnerModel);
				    }
				    break;
			 default:
				    Mojo.Log.info("[MainAssistant.handleCommand] Not handling %s", command.type);
				    break;
	   }
}

/**
 *	Make sure the screen size is always correct for whatever orientation
 *	the user has the phone in.
 */
MainAssistant.prototype.handleOrientation = function(event) {
	
}

MainAssistant.prototype.handleShaking = function(event) {
	Mojo.Log.info("[MainAssistant.handleShaking] %s", event.magnitude);
}

MainAssistant.prototype.handleAlbumArtHold = function(event) {
	   this.db.updateCurrent();
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
				    onComplete: this.switchPodcast.bind(this, 'next')
			 });
	   } else if(event.velocity.x <= - 500) {
			 Mojo.Animation.animateStyle($("album-art"), 'left', 'bezier', {
				    from: start,
				    to: -this.animationFinish,
				    duration: this.animationDuration,
				    curve: this.animationType,
				    onComplete: this.switchPodcast.bind(this, 'previous')
			 });
	   }
}

MainAssistant.prototype.albumArtAreaLeftOrRight = function(event) {
	   if(event.id === 'album-art-area-right') {
			 this.switchPodcast('next');
	   } else {
			 this.switchPodcast('previous');
	   }
}

MainAssistant.prototype.switchPodcast = function(next) {
	   // Calculate the start and ending positions of the animations
	   var start = (next === 'next') ? -this.animationFinish : this.animationFinish;
	   var finish = 0;
	   // Actually perform loading or changing to next podcast
	   if(next === 'next') {
			 this.db.nextPodcast();
			 this.refreshUI();
	   } else if(next === 'previous') {
			 this.db.previousPodcast();
			 this.refreshUI();
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
}

MainAssistant.prototype.handleListClick = function(event) {
	   Mojo.Log.info("[MainAssistant.handleListClick](%i) %s", event.index, event.item.enclosure);
	   // Get the selected row
	   this.selectedRow = event.target.mojo.getNodeByIndex(event.index);
	   //this.selectedRow.addClassName('video');
	   switch(event.item.enclosureType) {
			 case 'video/mp4':
			 case 'video/x-m4v':
			 case 'video/quicktime':
				    Mojo.Log.info("[MainAssistant.handleListClick] Playing Video");
				    //$('video-object').toggleClassName('video');
				    //this.videoPlayer.src = event.item.enclosure;
				    // Make sure the audio stops then play some videos
				    while(this.audioPlayerIsPlaying) {
						  this.audioPlayer.pause();
						  this.audioPlayer.src = null;
						  this.audioPlayer.load();
						  this.audioPlayerIsPlaying = false;
				    }
				    var args = {
						  appId: "com.palm.app.videoplayer",
						  name: "nowplaying"
				    };
				    var params = {
						  target: event.item.enclosure,
						  title: event.item.title,
						  thumbUrl: this.db.currentPodcast().getImage()
				    };
				    this.controller.stageController.pushScene(args, params);
				    break;
			 case 'audio/mp3':
			 case 'audio/mpeg':
				    Mojo.Log.info("[MainAssistant.handleListClick] Playing Audio");
				    if(this.audioPlayerCanPlay) {
						  // If currently playing then stop what is currently playing
						  if(this.audioPlayerIsPlaying) {
								this.audioPlayer.pause();
								this.audioPlayer.src = null;
								this.audioPlayer.load();
						  }
						  this.audioPlayer.src = event.item.enclosure;
						  this.audioPlayerIsPlaying = true;
				    } else {
						  this.audioPlayerIsPlaying = false;
				    }
				    break;
			 default:
				    Mojo.Log.error("[MainAssistant.handleListClick] Unknown file extension. %s", event.item.enclosureType);
				    break;			 
	   }
}

MainAssistant.prototype.audioEvent = function(event) {
	   switch(event.type) {
			 case Media.Event.X_PALM_CONNECT:
				    this.audioPlayerCanPlay = true;
				    break;
			 case Media.Event.X_PALM_DISCONNECT:
				    this.audioPlayerCanPlay = false;
				    break;
			 case Media.Event.PROGRESS:
				    
				    break;
			 case Media.Event.PLAY:
				    this.audioPlayerIsPlaying = true;
				    break;
			 case Media.Event.PAUSE:
				    this.audioPlayerIsPlaying = false;
				    break;
			 default:
				    Mojo.Log.error("[MainAssistant.audioEvent] %s", event.type);
				    break;
	   }
}

