function HomeScreenAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

HomeScreenAssistant.prototype.setup = function() {
	Mojo.Log.info("Home Screen is loaded.");
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	this.controller.setupWidget(Mojo.Menu.appMenu, appMenuAttr, appMenuModel);
	
	/* Create the Command Menu @ the bottom of the screen */
	this.controller.setupWidget(Mojo.Menu.commandMenu,
        undefined,
        this.model = {
          visible: true,
          items: [ 
                 { iconPath: "images/icons_podcast_32x32.png", command: "add_podcast"},
            ]
    });
	
	/* Create the dynamic list for the page. This is the primary design on this page. */
	/* NOTE: The item template is relative to the app/views folder */
	this.controller.setupWidget("home-screen-list",
		this.attributes = {
			itemTemplate: "home-screen/list/listItem",
			swipeToDelete: true,
			reorderable: true,
			//addItemLabel: $L('Add Podcast')
		},
		this.model = {
			listTitle: $L('List Title'),
				items : [
				{data:$L("Item 1"), year:$L("1974")},
				{data:$L("Item 2"), year:$L("1975")},
				{data:$L("Item 3"), year:$L("1972")},
				{data:$L("Item 4"), year:$L("2003")},
				{data:$L("Item 5"), year:$L("1996")},
				{data:$L("Item 6"), year:$L("1969")},
				{data:$L("Item 7"), year:$L("1984")},
				{data:$L("Item 8"), year:$L("1987")},
				]		
		}
	);
	
	/* add event handlers to listen to events from widgets */
}

HomeScreenAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


HomeScreenAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

HomeScreenAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

/**
 * This function is called by the commandMenu and
 * appMenu on the current scene.
 * @param {Object} event	The object that is returned by the button event
 */
HomeScreenAssistant.prototype.handleCommand = function(event) {
	if(event.type == Mojo.Event.command) {
		switch(event.command) {
			case "add_podcast":
				/* TODO: Dynamically add List items! */
				Mojo.Controller.errorDialog("Lindsey is cool!");
			break;
			case "palm-show-app-menu":
				/* DO NOTHING */
			break;
			case "do-preferences":
				/* TODO: Implement the preferences page */
				this.controller.stageController.pushScene("preferences");
			break;
			default:
				Mojo.Controller.errorDialog("Got command " + event.command);
			break;
		}
	}
}
