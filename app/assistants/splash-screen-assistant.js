function SplashScreenAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	  
	this.appVersion = "1.0.0";
	this.vendor = "Us";
	this.appName = "My App";
}

SplashScreenAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	Mojo.Log.info("Splash Screen Loaded!");
	
	// This code is in the setup function
	// Reading version number from appinfo.json file
	var file = Mojo.appPath + 'appinfo.json';
	Mojo.Log.info("The file to read is: %s", file);
	var fileAJAX = new Ajax.Request(file, {
		method: 'get',
		parameters: '',
		evalJSON: 'force',
		onSuccess: this.fileReadCallback.bind(this),
		onFailure: this.fileReadErrorCallback.bind(this)
		});
}

SplashScreenAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


SplashScreenAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SplashScreenAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  
}

SplashScreenAssistant.prototype.fileReadCallback = function(transport) {
   this.appVersion = transport.responseJSON.version;	// Get app version
   this.vendor = transport.responseJSON.vendor;			// Get who made app
   this.appName = transport.responseJSON.title;			// Get program title
   
   this.controller.document.write("<h1>"+this.appName+"</h1>");
   this.controller.document.write("<h2>"+this.vendor+"</h2>");
   this.controller.document.write("<h2>"+this.appVersion+"</h2>");
};

SplashScreenAssistant.prototype.fileReadErrorCallback = function(error){
	Mojo.Log.error("Was unable to read the file. Error message is as follows: %s", error);
}
