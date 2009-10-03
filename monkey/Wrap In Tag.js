/*
 * Menu: Zen Coding > Wrap In Tag
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M3+W
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */
 
var tag_name  = 'span';

function main() {
	var editor = editors.activeEditor,
		start_ix = editor.selectionRange.startingOffset,
		end_ix = editor.selectionRange.endingOffset;
		
	if (start_ix == end_ix) {
		// нет выделения — будем обрамлять всю строку
		var cur_line = editor.getLineAtOffset(start_ix);
		start_ix = editor.getOffsetAtLine(cur_line);
		end_ix = editor.getOffsetAtLine(cur_line + 1) - editor.lineDelimiter.length;
		
		// не нужно учитывать отступ в начале и в конце строки
		var line = editor.source.substring(start_ix, end_ix);
		var m = line.match(/^\s+/);
		if (m)
			start_ix += m[0].length;
			
		m = line.match(/\s+$/);
		if (m)
			end_ix -= m[0].length;
	}
	
	var text = editor.source.substring(start_ix, end_ix);
	editor.applyEdit(start_ix, text.length, '<' + tag_name + '>' + text + '</' + tag_name + '>');
	editor.selectAndReveal(start_ix + 1, tag_name.length);
}