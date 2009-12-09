/*
 * Menu: Zen Coding > Merge Lines
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M4+M
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "lib/zen_eclipse.js"
 * @include "lib/zen_coding.js"
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include('lib/html_matcher.js');
include('lib/zen_coding.js');
include('lib/zen_eclipse.js');

function main() {
	var editor = editors.activeEditor,
		start_ix = editor.selectionRange.startingOffset, 
		end_ix = editor.selectionRange.endingOffset;
	
	if (start_ix == end_ix) {
		// find matching tag
		var pair = HTMLPairMatcher(editor.source, editor.currentOffset);
		if (pair) {
			start_ix = pair[0];
			end_ix = pair[1];
		}
	}
	
	if (start_ix != end_ix) {
		// got range, merge lines
		var text = editor.source.substring(start_ix, end_ix),
			old_length = text.length;
		var lines = text.split(/(\r|\n)/);
		
		for (var i = 1; i < lines.length; i++) {
			lines[i] = lines[i].replace(/^\s+/, '');
		}
		
		text = lines.join('').replace(/\s{2,}/, ' ');
		editor.applyEdit(start_ix, old_length, text);
		editor.selectAndReveal(start_ix, text.length);
	}
	
}