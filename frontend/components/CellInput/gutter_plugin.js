import { StateField, setDiagnosticsEffect, gutter, RangeSet } from "../../imports/CodemirrorPlutoSetup.js"

class LintGutterMarker {
    constructor(diagnostics) {
        this.diagnostics = diagnostics
        this.severity = diagnostics.reduce((max, d) => {
            let s = d.severity
            return s == "error" || (s == "warning" && max == "info") ? s : max
        }, "info")
    }

    toDOM(view) {
        let elt = document.createElement("div")
        elt.className = "cm-lint-marker cm-lint-marker-" + this.severity
        elt.onmouseover = () => {} // gutterMarkerMouseOver(view, elt, this.diagnostics)
        return elt
    }
}

function markersForDiagnostics(doc, diagnostics) {
    let byLine = Object.create(null)
    for (let diagnostic of diagnostics) {
        let line = doc.lineAt(diagnostic.from)
        ;(byLine[line.from] || (byLine[line.from] = [])).push(diagnostic)
    }
    let markers = []
    for (let line in byLine) {
        markers.push(new LintGutterMarker(byLine[line]).range(+line))
    }
    return RangeSet.of(markers, true)
}

const lintGutterMarkers = StateField.define({
    create() {
        return RangeSet.empty
    },
    update(markers, tr) {
        markers = markers.map(tr.changes)
        for (let effect of tr.effects)
            if (effect.is(setDiagnosticsEffect)) {
                markers = markersForDiagnostics(tr.state.doc, effect.value)
            }
        return markers
    },
})
