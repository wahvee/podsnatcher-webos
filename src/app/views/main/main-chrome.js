opus.Gizmo({
	name: "main",
	dropTarget: true,
	type: "Palm.Mojo.Panel",
	h: "100%",
	styles: {
		zIndex: 2
	},
	chrome: [
		{
			name: "appScroller",
			type: "Palm.Mojo.Scroller",
			l: 0,
			t: 0,
			h: "100%",
			hAlign: "left",
			vAlign: "top",
			styles: {
				cursor: "move",
				overflow: "hidden"
			},
			controls: [
				{
					name: "podcastList",
					dropTarget: true,
					items: [],
					title: undefined,
					reorderable: false,
					itemTemplateFile: "main/main-scene-item-template",
					onlisttap: "",
					useSampleData: false,
					type: "Palm.Mojo.List",
					l: 0,
					t: 0,
					h: 100,
					hAlign: "left",
					vAlign: "top"
				}
			]
		}
	]
});