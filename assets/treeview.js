window.onjltreeclick = (self, e) => {
	if(e.target !== self && !self.classList.contains("collapsed")){
		return
	}
	var parentTree = self.parentElement
	while(parentTree.tagName != "CELLOUTPUT"){
		parentTree = parentTree.parentElement
		if(parentTree.tagName == "JLTREE" && parentTree.classList.contains("collapsed")){
			return // and bubble upwards
		}
	}

	self.classList.toggle("collapsed")
}