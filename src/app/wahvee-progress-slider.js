/**
 * Slider property defaults to "slider"
 */
Mojo.Widget.WahveeProgressSlider = Class.create({
	initialize: function() {
		this.sliderPhysicalMax = 100;
		this.sliderPhysicalMin = 0;
		this.offset = 0;
		this.lastPos = 0;
		this.percent = 0;
		this.seeking = false;

		this.dragStartHandler = this.dragStartHandlerFunc.bindAsEventListener(this);
		this.draggingHandler = this.dragging.bindAsEventListener(this);
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

		// Now render the widget
		this.renderWidget();

		// Make the dragging area expandable
		this.controller.exposeMethods(['updateDraggingArea']);
	},
	/**
	 * Sets up the widget for it's first time use on the screen.
	 */
	renderWidget: function() {
		// Path to the template
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

		// Setup the container to do the drop positioning (keeps it within the bounds)
		Mojo.Drag.setupDropContainer(this.controller.element, this);

		// Update the download percentage drawn on screen and the slider percentage
		this.setDownloadPercentage();
		this.setPositionSlider();
	},
	/**
	 * Function is called and sets the sliders min and max values. This does not effect,
	 * their actual physical widths or postiions. It just affects the number that is
	 * calculated and returned as the sliders value.
	 */
	updateDraggingArea: function(newMin, newMax) {
		this.sliderMaxValue = newMax;
		this.sliderMinValue = newMin;
		this.sliderValDifference = this.sliderMaxValue - this.sliderMinValue;
	},
	/**
	 * Actually positions the slider on the screen.
	 */
	setPositionSlider: function() {
		var position = this.background.offsetLeft;
		var physicalWidthOfSlider = this.background.getWidth();
		var x1 = position - this.offset;
		var x2 = physicalWidthOfSlider - this.offset + position;
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
	/**
	 * Update the screen to show the download percentage.
	 */
	setDownloadPercentage: function() {
		var modelPercent = this.controller.model[this.progressEndProperty].roundNumber(2);
		var modelLowPercent = this.controller.model[this.progressStartProperty];
		if(this.percent < modelPercent) {
			this.percent = modelPercent;
			this.progressBar.setStyle({
				//left: modelLowPercent * 100 + "%", // Lower bound of the percentage
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
		event.stop();
		this.seeking = true;
		var position = this.background.offsetLeft;
		var physicalWidthOfSlider = this.background.getWidth();
		Mojo.Drag.startDragging(this.controller.scene, this.slider, event.down, {
			draggingClass: "wahvee-progress-slider-btn-drag",
			preventVertical: true,
			preventDropReset: true,
			minHorizontalPixel: position - this.offset,
			maxHorizontalPixel: physicalWidthOfSlider - this.offset + position
		});
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragStart); //allow applications to see this event
	},
	/**
	 * function called whenever the item moves over this container.
	 */
	dragging: function(event) {
		event.stop();
		var pos = this.determineSliderValue(this.slider.offsetLeft);
		pos = pos.roundNumber(2);
		if(this.lastPos != pos) {
			this.lastPos = pos;
			Mojo.Event.send(this.controller.element, Mojo.Event.dragging, {value: pos});
		}
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
		var position = this.background.offsetLeft;
		var physicalWidthOfSlider = this.background.getWidth();
		// Physical area able to allow sliding
		var x1 = position - this.offset;
		var x2 = physicalWidthOfSlider - this.offset + position;
		var xdiff = x2 - x1;
		var xoffset = x - x1;
		var sliderValue = this.sliderValDifference * xoffset;
		sliderValue /= xdiff;
		sliderValue += this.sliderMinValue;
		return sliderValue;
	},
	/**
	 * @private
	 * Cause the model to change. Send an event to anyone who is listening.
	 */
	updateModel: function() {
		var pos = this.determineSliderValue(this.slider.offsetLeft);
		if (pos !== this.controller.model[this.sliderValueProperty]) {
			this.controller.model[this.sliderValueProperty] = pos;
			Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: pos});
		}
	},
	/**
	 * @private
	 * This is about to be destroyed. So I need to remove the event listeners.
	 */
	cleanup: function() {
		this.controller.stopListening(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.stopListening(this.slider, Mojo.Event.dragging, this.draggingHandler);
	}
});
