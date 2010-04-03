/**
 * Slider property defaults to "slider"
 */
Mojo.Widget.WahveeProgressSlider = Class.create({
	initialize: function() {
		this.seeking = false;
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
		this.sliderMaxValue = this.controller.attributes.sliderMaxValue || 1;
		this.sliderMinValue = this.controller.attributes.sliderMinValue || 0;
		this.sliderValDifference = this.sliderMaxValue - this.sliderMinValue;
		this.sliderPhysicalMax = 100;
		this.sliderPhysicalMin = 0;
		this.offset = 0;

		// Now render the widget
		this.renderWidget();

		// Make the dragging area expandable
		this.controller.exposeMethods(['updateDraggingArea']);
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

		// Determine the offset to get the middle of the slider
		this.offset = this.slider.getWidth() / 2;

		// Start listening for dragging of the slider button
		this.controller.listen(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.listen(this.slider, Mojo.Event.dragging, this.draggingHandler);

		Mojo.Drag.setupDropContainer(this.controller.element, this);

		this.setDownloadPercentage();
		this.setPositionSlider();
	},
	updateDraggingArea: function(newMin, newMax) {
		this.sliderMaxValue = newMax;
		this.sliderMinValue = newMin;
		this.sliderValDifference = this.sliderMaxValue - this.sliderMinValue;
	},
	setPositionSlider: function() {
		var position = this.controller.element.positionedOffset();
		var physicalWidthOfSlider = this.controller.element.getWidth();
		var x1 = position.left;
		var x2 = position.left + physicalWidthOfSlider;
		var sliderModelValue = this.controller.model[this.sliderValueProperty];
		var sliderValue = (sliderModelValue >= this.sliderMinValue && sliderModelValue <= this.sliderMaxValue) ? sliderModelValue : this.sliderMaxValue;
		var sliderXPos = (((x2 - x1) * (sliderValue - this.sliderMinValue)) / this.sliderValDifference) + x1;

		this.slider.setStyle({
			left: sliderXPos + "px"
		});
	},
	setDownloadPercentage: function() {
		var modelPercent = this.controller.model[this.progressEndProperty];
		var modelLowPercent = this.controller.model[this.progressStartProperty];
		var percentage = (modelPercent >= 0 && modelPercent <= 1) ? modelPercent : 1;
		var lowPercent = (modelLowPercent >= 0 && modelLowPercent <= 1) ? modelLowPercent : 1;
		this.progressBar.setStyle({
			left: lowPercent * 100 + "%", // Lower bound of the percentage
			width: percentage * 100 + "%" // Upper bound of the percentage
		});
	},
	handleModelChanged: function() {
		if(!this.seeking) {
			this.setDownloadPercentage();
			this.setPositionSlider();
		}
	},
	/**
	 * When the user starts trying to drag the slider-btn, make it draggable.
	 */
	dragStartHandlerFunc: function(event) {
		this.seeking = true;
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
		//this.determineSliderValue(event.target.offsetLeft + this.offset);
	},
	/**
	 * Called by the Mojo.Drag events.
	 */
	dragDrop: function(element) {
		this.slider.removeClassName("wahvee-progress-slider-btn-drag");
		this.determineSliderValue(element.offsetLeft + this.offset);
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragEnd); //allow applications to see this event
		this.seeking = false;
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
		var x1 = position.left;
		var x2 = position.left + physicalWidthOfSlider;
		var sliderValue = ((this.sliderValDifference * (x - x1)) / (x2 - x1)) + this.sliderMinValue;
		this.controller.model[this.sliderValueProperty] = sliderValue;
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: sliderValue});
	},
	cleanup: function() {
		this.controller.stopListening(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.stopListening(this.slider, Mojo.Event.dragging, this.draggingHandler);
	}
});
