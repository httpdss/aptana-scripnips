/*
 * Menu: Zen Coding > Go to Matching Pair
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M2+M4+ARROW_UP
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "./lib/html_matcher.js"
 */

include('lib/html_matcher.js');

function main() {
	var editor = editors.activeEditor,
		caret_pos = editor.currentOffset;
		
	if (editor.source.charAt(caret_pos) == '<') 
		// looks like caret is outside of tag pair  
		caret_pos++;
		
	var range = HTMLPairMatcher(editor.source, caret_pos);
		
	if (range && range[0] != -1) {
		// match found
		var open_tag = HTMLPairMatcher.last_match.opening_tag,
			close_tag = HTMLPairMatcher.last_match.closing_tag;
			
		if (close_tag) { // exclude unary tags
			if (open_tag.start <= caret_pos && open_tag.end >= caret_pos)
				editor.currentOffset = close_tag.start
			else if (close_tag.start <= caret_pos && close_tag.end >= caret_pos)
				editor.currentOffset = open_tag.start;
		}
	}
}