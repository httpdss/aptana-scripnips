/*
 * Menu: Zen Coding > Match pair
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M4+D
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "lib/htmlparser.js"
 */

include('lib/html_matcher.js');

function main() {
	var editor = editors.activeEditor,
		selection = editor.selectionRange,
		range = HTMLPairMatcher(editor.source, Math.max(selection.startingOffset, selection.endingOffset));
		
	if (range && range[0] != -1) {
		editor.selectAndReveal(range[0], range[1] - range[0]);
	}
}