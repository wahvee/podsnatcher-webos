Mojo.Widget.MyList = Class.create(Mojo.Widget.List, {
	setup: function($super) {
		$super();
		var attributes = this.controller.attributes;
		this.onItemRemoved = attributes.onItemRemoved;	
	},
	removeListItemNode: function($super, node) {
		var itemModel = this.getItemByNode(node);
		$super(node);
		if(itemModel && this.onItemRemoved) {
			this.onItemRemoved(this.controller.element, itemModel, node);
		}
	},
	dragStartHandler: function($super, event) {
		$super(event);
		var node = Mojo.Widget.Util.findListItemNode(event.target, this.listItemsParent);
		node.removeClassName(this.kDeleteDragClass);
		node.addClassName("list-click-and-swipe");
	},
	completeSwipeDelete: function($super, el, cancelled) {
		$super(el, cancelled);
		el.removeClassName("list-click-and-swipe");
	}
});

// Replace Mojo's version at runtime
//Mojo.Widget.List = new MyListWidget();