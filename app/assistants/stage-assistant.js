function StageAssistant() {
	this.cookie = new Mojo.Model.Cookie("PodSnatcherPreferences");
	this.showSplash = true;
	var existingPrefs = this.cookie.get(); 
	if (existingPrefs) {
    	if (existingPrefs.VersionString == "1.0") {
			this.showSplash = existingPrefs.ShowSplashScreen;
		} else {
			this.cookie.put({
				VersionString: "1.0",
				ShowSplashScreen: this.showSplash
			});
		} 
   }
}

StageAssistant.prototype.setup = function() {	
	// Setup Application Menu with an About entry
  	appMenuAttr = {omitDefaultItems: true};
  	appMenuModel = {
    	visible: true,
    	items: [
      		Mojo.Menu.editItem,
			/* TODO: Write help page; un-comment below when complete */
      		//Mojo.Menu.helpItem
			{label: "Preferences", command: 'do-preferences'},
    	]
  	};
  
  	if (this.showSplash) {
		Mojo.Log.info("About to start Splash Screen!");
		this.controller.pushScene("splash-screen");
	} else {
		Mojo.Log.info("Skipping the Splash Screen!");
		this.controller.pushScene("home-screen");
	}
}
