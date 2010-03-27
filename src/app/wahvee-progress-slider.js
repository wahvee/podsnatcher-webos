/**
 * Slider property defaults to "slider"
 */
Mojo.Widget.WahveeProgressSlider = Class.create({
	initialize: function() {
	},
	setup: function() {
		// The HTML element for this widget is found in...this.controller.element
		// The name of the widget (or ID of the element that will become this widget) is...this.controller.widgetName
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.widgetName;
		this.sliderValueProperty = this.controller.attributes.sliderProperty || "slider";
		this.progressStartProperty = this.controller.attributes.progressStartProperty || "progressLowerValue";
		this.progressEndProperty = this.controller.attributes.progressProperty || "progressUpperValue";
		this.maxValue = this.controller.model.maxValue || 1;
		this.minValue = this.controller.model.minValue || 0;
		
		// Now render the widget
		this.renderWidget();
	},
	renderWidget: function() {
		var sliderTemplate = "wahvee-progress-slider/wahvee-progress-slider";
		var physicalWidthOfSlider = this.controller.element.getWidth();
		var physicalHeightOfSlider = this.controller.element.getHeight();
		
		var html = Mojo.View.render(
			{
				object: {
					divPrefix: this.divPrefix
				},
				template: sliderTemplate
			}
		);
		
		// Add the generated HTML to the template
		this.controller.element.update(html);
		
		this.setDownloadPercentage();
	},
	positionSlider: function() {
	
	},
	setDownloadPercentage: function() {
		var percentage = (this.controller.model[this.progressEndProperty] >= 0 && this.controller.model[this.progressEndProperty] <= 1) ? this.controller.model[this.progressEndProperty] : 1;
		
		Mojo.Log.info("Set percentage to: ", percentage * 100);
		var progBar = this.controller.get(this.divPrefix + "-progress");
		progBar.setStyle({
			width: percentage * 100 + "%"
		});
	},
	handleModelChanged: function() {
		this.setDownloadPercentage();
		this.set
	},
	handleSliderDrag: function(event) {
		
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragStart);
	}
});