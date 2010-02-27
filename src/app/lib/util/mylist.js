Mojo.Widget.MyList = Class.create(Mojo.Widget.List, {
	setup: function($super) {
		$super();
		var attributes = this.controller.attributes;
		this.onItemRemoved = attributes.onItemRemoved;	
	},
	removeListItemNode: function($super, node) {
		var itemModel = this.getItemByNode(node);
		
		if(node.parentNode && itemModel && this.onItemRemoved) {
			this.onItemRemoved(this.controller.element, itemModel, node);
		}
		
		$super(node);
	}
});

// Replace Mojo's version at runtime
//Mojo.Widget.List = new MyListWidget();