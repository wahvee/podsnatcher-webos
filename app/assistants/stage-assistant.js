function StageAssistant() {
}

StageAssistant.prototype.setup = function() {	
	// Setup Application Menu with an About entry
  	//
  	appMenuAttr = {omitDefaultItems: true};
  	appMenuModel = {
    	visible: true,
    	items: [
      		//{label: "About News...", command: 'do-aboutNews'},
      		Mojo.Menu.editItem,
      		Mojo.Menu.prefsItem,
			/* TODO: Write help page; un-comment below when complete */
      		//Mojo.Menu.helpItem
    	]
  	};
  
  	Mojo.Log.info("About to start Splash Screen!");
	this.controller.pushScene("splash-screen");
}
