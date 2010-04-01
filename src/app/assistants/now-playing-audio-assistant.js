function NowPlayingAudioAssistant(podcastToPlay) {

	this.sliderAttributes = {
		sliderProperty: "currentTime",
		progressProperty: "progressUpper",
		progressStartProperty: "progressLower",
		round: false,
		cancellable: true,
		updateInterval: 0
	};

	this.sliderModel = {
		sliderMinValue: 0,
		sliderMaxValue: 100,
		currentTime: 50,
		progressUpper: .5,
		progressLower: .2
	};
}

NowPlayingAudioAssistant.prototype.setup = function() {
	this.controller.setupWidget("player-controls-slider", this.sliderAttributes, this.sliderModel);
};

NowPlayingAudioAssistant.prototype.activate = function(event) {};

NowPlayingAudioAssistant.prototype.deactivate = function(event) {};

NowPlayingAudioAssistant.prototype.cleanup = function(event) {};