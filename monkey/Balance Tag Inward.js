/*
 * Menu: Zen Coding > Balance Tag Inward
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M1+M2+D
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include('zencoding.js');

function main() {
	zen_editor.setContext(editors.activeEditor);
	zen_coding.runAction('match_pair_inward', zen_editor);
}