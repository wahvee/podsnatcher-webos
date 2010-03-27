function NowPlayingAudioAssistant(podcastToPlay) {

	this.sliderAttributes = {
		sliderProperty: "currentTime",
		progressProperty: "progressUpper",
		progressStartProperty: "progressLower",
		minValue: 0,
		maxValue: 100,
		round: false,
		cancellable: true,
		updateInterval: 0
	};

	this.sliderModel = {
		currentTime: 0,
		progressUpper: .5,
		progressLower: 0
	};
}

NowPlayingAudioAssistant.prototype.setup = function() {
	
	this.controller.setupWidget(
		"player-controls-slider",
		this.sliderAttributes,
		this.sliderModel
	);
};

NowPlayingAudioAssistant.prototype.activate = function(event) {
};

NowPlayingAudioAssistant.prototype.deactivate = function(event) {
};

NowPlayingAudioAssistant.prototype.cleanup = function(event) {
};
