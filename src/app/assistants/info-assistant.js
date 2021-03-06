function InfoAssistant(podcast) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */

	var image = podcast.getImage();
	this.renderedInfo = Mojo.View.render(
		{
			object: {
				title: Mojo.Format.runTextIndexer(podcast.getTitle()),
				author: Mojo.Format.runTextIndexer(podcast.author),
				category: Mojo.Format.runTextIndexer(podcast.category),
				language: Mojo.Format.runTextIndexer(podcast.language),
				copyright: Mojo.Format.runTextIndexer(podcast.copyright),
				description: Mojo.Format.runTextIndexer(podcast.description),
				image: (!image.blank()) ? image : './images/default-album-art-85-85.png'
			},
			template: 'info/info-scene-template'
		}
	);
}

InfoAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	this.controller.setupWidget(Mojo.Menu.appMenu, AppAssistant.appMenuAttr, AppAssistant.standardModel);

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	this.controller.get('info-scene-container').update(this.renderedInfo);

	/* setup widgets here */

	/* add event handlers to listen to events from widgets */
};

InfoAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

InfoAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

InfoAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as
	   a result of being popped off the scene stack */
};
