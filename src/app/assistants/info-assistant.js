function InfoAssistant(podcast) {
	/* this is the creator function for your scene assistant object. It will be passed all the
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */

	this.podcast = podcast;

	var renderedInfo = Mojo.View.render(
		{
			object: {
				title: podcast.title,
				author: podcast.author,
				category: podcast.category,
				language: podcast.language,
				copyright: podcast.copyright,
				description: podcast.description,
				image: podcast.getImage()
			},
			template: 'info/info-scene-template'
		}
	);

	$('info-scene-container').update(renderedInfo);

	//$('infoTitle').innerText = this.podcast.title;
	//$('infoAuthor').innerText = this.podcast.author;
	//$('infoCategory').innerText = this.podcast.category;
	//$('infoLanguage').innerText = "Language: " + this.podcast.language;
	//$('infoCopyright').innerText = this.podcast.copyright;
	//$('podcast-description').innerText = this.podcast.description;
	//$('info-image').remove();
	//var img = new Element('img', {
	//	id: "info-image",
	//	src: this.podcast.getImage(),
	//	alt: this.podcast.title,
	//	width: "85px"
	//});
	//$('info-album-art').appendChild(img);

}

InfoAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed */

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
