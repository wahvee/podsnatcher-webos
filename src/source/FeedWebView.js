enyo.kind({
  name: "MyApps.FeedWebView",
  kind: enyo.SlidingView,
  layoutKind: enyo.VFlexLayout,
  components: [
    {kind: enyo.Header, style: "min-height: 60px;", components: [
      {kind: enyo.HFlexBox, flex: 1, components: [
        {content: "", name: "selectedItemName", style: "text-overflow: ellipsis; overflow: hidden; white-space: nowrap;", flex: 1},
        {kind: enyo.Spinner, name: "feedWebViewSpinner", align: "right"}
      ]}
    ]},
    {kind: enyo.Scroller, flex: 1, components: [
    ]},
    {kind: enyo.Toolbar, pack: "justify", components: [
      {kind: enyo.GrabButton}
    ]}
  ]
});
