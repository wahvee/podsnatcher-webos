function MainAssistant(db) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	   this.db = db;
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
			 swipeToDelete: false,
			 renderLimit: 15,
			 reorderable: false
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
			 // Colorize the background of the scroller for this scene
			 //this.controller.sceneScroller.addClassName('scrollerBg');
			 this.controller.setupWidget("updatingSpinner", this.spinnerAttributes, this.spinnerModel);
			 this.controller.setupWidget("episodeList", this.episodeListAttributes, this.episodeListModel);
	   } catch (func_error) {
			 Mojo.Log.info("[Create Widgets] %s", func_error.message);
	   }
	
	   /* add event handlers to listen to events from widgets */
	   // Wait for screen orientation changes
	   this.controller.listen(document, Mojo.Event.orientationChange, this.handleOrientation.bindAsEventListener(this));
	   // Listen for user to flick the album-art to change podcasts
	   this.controller.listen($('album-art'), Mojo.Event.flick, this.handleAlbumArtFlick.bindAsEventListener(this));
	   this.controller.listen($('album-art'), Mojo.Event.hold, this.handleAlbumArtHold.bindAsEventListener(this));
	   // Listen for podcast updates
	   this.db.addEventListener(PodcastStorage.LoadingDatabaseSuccess, this.dbLoaded.bind(this));
	   this.db.addEventListener(PodcastStorage.LoadingDatabaseFailure, this.dbLoaded.bind(this));
	   
	   this.db.addEventListener(PodcastStorage.PodcastStartUpdate, this.podcastUpdating.bind(this));
	   this.db.addEventListener(PodcastStorage.PodcastUpdateSuccess, this.podcastUpdateSuccess.bind(this));
	   this.db.addEventListener(PodcastStorage.PodcastUpdateFailure, this.podcastUpdateFailure.bind(this));
	   
	   this.db.addEventListener(PodcastStorage.PodcastListStartUpdate, this.updatingPodcasts.bind(this, 'start'));
	   this.db.addEventListener(PodcastStorage.PodcastListFinishUpdate, this.updatingPodcasts.bind(this, 'finish'));
	   
	   //this.db.addEventListener(PodcastStorage.SavingDatabaseSuccess, undefined);
	   this.db.addEventListener(PodcastStorage.SavingDatabaseFailure, function() {
			 Mojo.Controller.errorDialog("There was an error. %s", error.message);
	   });
}

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	   $("updatingSpinner").show();
	   $("updatingSpinner").setStyle({
			 visibility: 'hidden'
	   });
	   
	   // Begin loading the database
	   this.db.loadDatabase();
}


MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
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
			 $('podcastTitle').innerHTML = (currPodcast.title === undefined) ? "Loading..." : currPodcast.title;
			 this.episodeListModel.items = (currPodcast.items === undefined) ? [] : currPodcast.items;
			 this.controller.modelChanged(this.episodeListModel);
	   } catch(error) {
			 Mojo.Log.error("[MainAssistant.refreshUI] %s", error.message);
	   }
}

MainAssistant.prototype.dbLoaded = function(error) {
	   if(error !== undefined) {
			 Mojo.Log.error("[MainAssistant.dbLoaded] %s", error.message);
	   } else {
			 Mojo.Log.info("[MainAssistant.dbLoaded]");
			 if(this.db.requiresUpdate) {
				    this.db.updatePodcasts();
			 } else {
				    this.refreshUI();
			 }
	   }
}

MainAssistant.prototype.updatingPodcasts = function(startOrFinish) {
	   // Check to see whether the podcasts are starting to update or finishing
	   Mojo.Log.info("[MainAssistant.updatingPodcasts] Podcasts are %sing updates.", startOrFinish);
	   this.refreshUI();
	   if(startOrFinish == 'finish') {
			 this.db.savePodcasts();
	   }
}

MainAssistant.prototype.podcastUpdating = function(podcastKey) {
	   Mojo.Log.info("[MainAssistant.podcastUpdating] %s starting update.", podcastKey);
	   // Updated podcast is the currently showing podcast
	   if(this.db.currentPodcast().key == podcastKey) {
			 this.spinnerModel.spinning = true;
			 this.controller.modelChanged(this.spinnerModel);
			 $("updatingSpinner").setStyle({
				    visibility: 'visible'
			 });
	   } else {
			 // TODO Dashboard please...
			 var title = undefined; //this.db.findPodcast(podcastKey).title;
			 var message = (title === undefined) ? "Updating podcast..." : "Updating " + title;
			 Mojo.Controller.getAppController().showBanner(message, {source: 'notification'});
	   }
}

MainAssistant.prototype.podcastUpdateSuccess = function(podcastKey) {
	   Mojo.Log.info("[MainAssistant.podcastUpdateSuccess] %s finished updating.", podcastKey);
	   // Updated podcast is the currently showing podcast
	   if(this.db.currentPodcast().key == podcastKey) {
			 this.spinnerModel.spinning = false;
			 this.controller.modelChanged(this.spinnerModel);
			 $("updatingSpinner").show();
			 $("updatingSpinner").setStyle({
				    visibility: 'hidden'
			 });
			 
			 this.refreshUI();
	   }
}

MainAssistant.prototype.podcastUpdateFailure = function(podcastKey) {
	   // Updated podcast is the currently showing podcast
	   if(this.db.currentPodcast().key == podcastKey) {
			 this.spinnerModel.spinning = false;
			 this.controller.modelChanged(this.spinnerModel);
			 $("updatingSpinner").show();
			 $("updatingSpinner").setStyle({
				    visibility: 'hidden'
			 });
	   }
}

/**
 *	Make sure the screen size is always correct for whatever orientation
 *	the user has the phone in.
 */
MainAssistant.prototype.handleOrientation = function(event) {
	
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
