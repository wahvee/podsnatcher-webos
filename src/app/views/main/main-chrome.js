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
					onlisttap: "",
					useSampleData: false,
					type: "Palm.Mojo.List",
					l: 0,
					t: 0,
					h: "100%",
					hAlign: "left",
					vAlign: "top",
					controls: [
						{
							name: "podcastRow",
							content: "<div class='result palm-row' x-mojo-tap-highlight='momentary'>\n  <div class=\"palm-row-wrapper\">\n    <img src=\"#{podcast-img}\" alt=\"#{title}'s Cover Art\" width=\"60\" height=\"60\" />\n    <div class=\"podcast-title\">#{title}</div>\n    <div class=\"most-recent-title\">#{most-recent}</div>\n  </div>\n</div>\n",
							type: "Palm.Mojo.Html",
							l: 0,
							t: 0
						}
					]
				}
			]
		}
	]
});