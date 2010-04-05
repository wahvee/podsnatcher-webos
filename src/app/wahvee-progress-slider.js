/**
 * Slider property defaults to "slider"
 */
Mojo.Widget.WahveeProgressSlider = Class.create({
	initialize: function() {
		this.seeking = false;
		this.dragStartHandler = this.dragStartHandlerFunc.bindAsEventListener(this);
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
		this.percent = 0;
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
		var xdiff = x2 - x1;
		var slidOffset = sliderValue - this.sliderMinValue;
		var sliderXPos = xdiff * slidOffset;
		sliderXPos /= this.sliderValDifference;
		sliderXPos += x1;
		this.slider.setStyle({
			left: sliderXPos + "px"
		});
	},
	setDownloadPercentage: function() {
		var modelPercent = this.controller.model[this.progressEndProperty].toPrecision(3);
		var modelLowPercent = this.controller.model[this.progressStartProperty];
		if(this.percent < modelPercent) {
			this.percent = modelPercent;
			this.progressBar.setStyle({
				//left: lowPercent * 100 + "%", // Lower bound of the percentage
				width: modelPercent * 100 + "%" // Upper bound of the percentage
			});
		}
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
	dragHover: function(element) {
		var pos = this.determineSliderValue(this.slider.offsetLeft + this.offset);
		Mojo.Event.send.defer(this.controller.element, Mojo.Event.dragging, {value: pos});
	},
	/**
	 * Called by the Mojo.Drag events.
	 */
	dragDrop: function(element) {
		this.slider.removeClassName("wahvee-progress-slider-btn-drag");
		this.updateModel();
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
		var xdiff = x2 - x1;
		var xoffset = x - x1;
		var sliderValue = this.sliderValDifference * xoffset;
		sliderValue /= xdiff;
		sliderValue += this.sliderMinValue;
		return sliderValue;
	},
	updateModel: function() {
		var pos = this.determineSliderValue(this.slider.offsetLeft);
		if (pos !== this.controller.model[this.sliderValueProperty]) {
			this.controller.model[this.sliderValueProperty] = pos;
			Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: pos});
		}
	},
	cleanup: function() {
		this.controller.stopListening(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
	}
});
