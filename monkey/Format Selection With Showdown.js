/*
 * Menu: Zen Coding > Format Selection with Showdown
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M3+F
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "lib/showdown.js"
 * @include "lib/reformator.js"
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include('lib/zen_coding.js');
include('lib/zen_eclipse.js');
include('lib/showdown.js');

function main() {
	var editor = editors.activeEditor,
		start_ix = editor.selectionRange.startingOffset,
		end_ix = editor.selectionRange.endingOffset;
	
	if (start_ix != end_ix) {
		var text = editor.source.substring(start_ix, end_ix);
		var line_padding = getCurrentLinePadding();
		var orig_length = text.length;
		
		// удаляем все отступы в начале строки
		if (line_padding) {
			text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"); 
			
			var lines = text.split('\n');
			lines[0] = lines[0].replace(/^\s+/, '');
			var re = new RegExp('^' + line_padding);
			for (var i	= 1; i < lines.length; i++) {
				lines[i] = lines[i].replace(re, '');
			}
			
			text = lines.join('\n');
		}
		
		var converter = new Showdown.converter();
		var html = converter.makeHtml(text);
		
		// заменяем переводы строк на те, что используются в редакторе
		html = html.replace(/\r?\n/g, getNewline());
		
		// делаем отбивку
		html = zen_coding.padString(html, getCurrentLinePadding());
		
		// записываем результат
		editor.applyEdit(start_ix, orig_length, html);
	}
}