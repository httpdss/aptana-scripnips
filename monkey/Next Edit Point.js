/*
 * Menu: Zen Coding > Next Edit Point
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M3+]
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "lib/zen_eclipse.js"
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include('lib/zen_eclipse.js');

function main() {
	var editor = editors.activeEditor,
		new_point = findNewEditPoint(1);
	if (new_point != -1)
		editor.currentOffset = new_point;
}