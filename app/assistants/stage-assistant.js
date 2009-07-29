function StageAssistant() {
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
  
  	Mojo.Log.info("About to start Splash Screen!");
	this.controller.pushScene("splash-screen");
}
