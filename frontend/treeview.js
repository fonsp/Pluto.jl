window.onjltreeclick = (self, e) => {
    if (e.target !== self && !self.classList.contains("collapsed")) {
        return
    }
    var parent_tree = self.parentElement
    while (parent_tree.tagName != "PLUTO-OUTPUT") {
        parent_tree = parent_tree.parentElement
        if (parent_tree.tagName == "JLTREE" && parent_tree.classList.contains("collapsed")) {
            return // and bubble upwards
        }
    }

    self.classList.toggle("collapsed")
}

window.onjltreeclickmore = (self, e) => {
    if (e.target !== self || self.closest("jltree.collapsed") != null) {
        return
    }
    var parent_tree = self.closest("jltree")
    const objectid = parent_tree.getAttribute("objectid")

    const notebook = self.closest("pluto-notebook")

    // TODO actually do something
    console.log(notebook.requests)
}
