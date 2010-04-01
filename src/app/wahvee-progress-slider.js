/**
 * Slider property defaults to "slider"
 */
Mojo.Widget.WahveeProgressSlider = Class.create({
	initialize: function() {
		this.dragStartHandler = this.dragStartHandlerFunc.bindAsEventListener(this);
		this.draggingHandler = this.draggingHandlerFunc.bindAsEventListener(this);
	},
	setup: function() {
		// The HTML element for this widget is found in...this.controller.element
		// The name of the widget (or ID of the element that will become this widget) is...this.controller.widgetName
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.widgetName;
		this.sliderValueProperty = this.controller.attributes.sliderProperty || "slider";
		this.progressStartProperty = this.controller.attributes.progressStartProperty || "progressLowerValue";
		this.progressEndProperty = this.controller.attributes.progressProperty || "progressUpperValue";
		this.sliderMaxValue = this.controller.model.sliderMaxValue || 1;
		this.sliderMinValue = this.controller.model.sliderMinValue || 0;

		// Now render the widget
		this.renderWidget();
	},
	renderWidget: function() {
		var sliderTemplate = "wahvee-progress-slider/wahvee-progress-slider";
		//var physicalHeightOfSlider = this.controller.element.getHeight();
		var html = Mojo.View.render({
			object: {
				divPrefix: this.divPrefix
			},
			template: sliderTemplate
		});

		// Add the generated HTML to the template
		this.controller.element.update(html);
		// Get the two elements to be drawn/positioned by this widget
		this.background = this.controller.get(this.divPrefix + "-background");
		this.progressBar = this.controller.get(this.divPrefix + "-progress");
		this.slider = this.controller.get(this.divPrefix + "-slider-btn");

		// Start listening for dragging of the slider button
		this.controller.listen(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.listen(this.slider, Mojo.Event.dragging, this.draggingHandler);

		Mojo.Drag.setupDropContainer(this.controller.element, this);

		this.setDownloadPercentage();
		this.setPositionSlider();
	},
	setPositionSlider: function() {
		this.sliderMaxValue = this.controller.model.sliderMaxValue || 1;
		this.sliderMinValue = this.controller.model.sliderMinValue || 0;
		var sliderValue = (this.controller.model[this.sliderValueProperty] >= this.sliderMinValue && this.controller.model[this.sliderValueProperty] <= this.sliderMaxValue) ? this.controller.model[this.sliderValueProperty] : this.sliderMaxValue;
		//var physicalWidthOfSlider = this.controller.element.getWidth();
		var percentage = sliderValue / this.sliderMaxValue;

		this.slider.setStyle({
			left: percentage * 100 + "%"
		});
	},
	setDownloadPercentage: function() {
		var percentage = (this.controller.model[this.progressEndProperty] >= 0 && this.controller.model[this.progressEndProperty] <= 1) ? this.controller.model[this.progressEndProperty] : 1;
		var lowPercent = (this.controller.model[this.progressStartProperty] >= 0 && this.controller.model[this.progressStartProperty] <= 1) ? this.controller.model[this.progressStartProperty] : 1;
		this.progressBar.setStyle({
			left: lowPercent * 100 + "%", // Lower bound of the percentage
			width: percentage * 100 + "%" // Upper bound of the percentage
		});
	},
	handleModelChanged: function() {
		this.setDownloadPercentage();
		this.setPositionSlider();
	},
	/**
	 * When the user starts trying to drag the slider-btn, make it draggable.
	 */
	dragStartHandlerFunc: function(event) {
		//this.slider.addClassName("wahvee-progress-slider-brn-drag");
		var position = this.controller.element.positionedOffset();
		var physicalWidthOfSlider = this.controller.element.getWidth();
		Mojo.Drag.startDragging(this.controller.scene, this.slider, event.down, {
			draggingClass: "wahvee-progress-slider-btn-drag",
			preventVertical: true,
			preventDropReset: true,
			minHorizontalPixel: position.left,
			maxHorizontalPixel: position.left + physicalWidthOfSlider
		});
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragStart); //allow applications to see this event
	},
	/**
	 * function called whenever the item moves over this container.
	 */
	draggingHandlerFunc: function(event) {
		var offset = event.target.getWidth() / 2;
		this.determineSliderValue(event.target.offsetLeft + offset);
	},
	/**
	 * Called by the Mojo.Drag events.
	 */
	dragDrop: function(element) {
		this.slider.removeClassName("wahvee-progress-slider-btn-drag");
		var offset = element.getWidth() / 2;
		this.determineSliderValue(element.offsetLeft + offset);
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragEnd); //allow applications to see this event
	},
	/**
	 * Function is given an x position, this value must be greater than the minimum
	 * slider position and less than the largest slider position. The value of the slider
	 * is then created and the value is stored in the model.
	 */
	determineSliderValue: function(x) {
		var position = this.controller.element.positionedOffset();
		var physicalWidthOfSlider = this.controller.element.getWidth();
		// Physical area able to allow sliding
		this.sliderMaxValue = this.controller.model.sliderMaxValue || 1;
		this.sliderMinValue = this.controller.model.sliderMinValue || 0;
		var x1 = position.left;
		var x2 = position.left + physicalWidthOfSlider;
		var sliderValue = (((this.sliderMaxValue - this.sliderMinValue) * (x - x1)) / (x2 - x1)) + this.sliderMinValue;
		this.controller.model[this.sliderValueProperty] = sliderValue;
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: this.controller.model[this.sliderValueProperty]});
	},
	cleanup: function() {
		this.controller.stopListening(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.stopListening(this.slider, Mojo.Event.dragging, this.draggingHandler);
	}
});
