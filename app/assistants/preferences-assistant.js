function PreferencesAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	  this.show_splash = false;
}

PreferencesAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	var obj = this.controller.stageController, str = "String: ";
	for(var prop in obj) {
		str += "\n["+prop+"]="+obj[prop];
	}
	Mojo.Log.info(str);
	
	/* setup widgets here */
	this.controller.setupWidget("show-splash-toggle",
         this.attributes = {
             trueValue: true,
             falseValue: false 
         },
         this.model = {
             value: false,
             disabled: false
         });
	
	/* add event handlers to listen to events from widgets */
	this.togglePressed = this.togglePressed.bindAsEventListener(this);
	Mojo.Event.listen($("show-splash-toggle"), Mojo.Event.propertyChange, this.togglePressed);
}

PreferencesAssistant.prototype.togglePressed = function(event){
		//Display the value of the toggle
		//this.showDialogBox( "The toggle value changed" ,"Toggle value is now: " + event.value);
		Mojo.Log.info("Toggle value is now: " + event.value);
		this.show_splash = event.value;
}

PreferencesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


PreferencesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	this.cookie = new Mojo.Model.Cookie("PodSnatcherPreferences");
	this.cookie.put({
		VersionString: "1.0",
		ShowSplashScreen: this.show_splash
	});
}

PreferencesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}
