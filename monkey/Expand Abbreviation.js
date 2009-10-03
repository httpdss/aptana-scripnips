/*
 * Menu: Zen Coding > Expand Abbreviation
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru), Vadim Makeev (http://pepelsbey.net)
 * License: EPL 1.0
 * Key: M1+M3+E
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "settings.js"
 * @include "lib/core.js"
 */

var use_tab = false; 

include('settings.js');
try {
	include('my-settings.js');
} catch(e){}

include('lib/core.js');

function main() {
	try {
		var editor_type = zen_coding.getEditorType();
		if (!editor_type) {
			if (use_tab)
				expandTab();
			else
				printMessage('"Expand abbreviation" doesn\'t work in this editor.');
			return;
		}
	} catch(e) {
		if (use_tab) 
			expandTab();
	}
					
	var editor = editors.activeEditor,
		start_offset = editor.selectionRange.startingOffset,
		end_offset = editor.selectionRange.endingOffset,
		start_line = editor.getLineAtOffset(start_offset),
		end_line = editor.getLineAtOffset(end_offset),
	
		abbr,
		content = '';
		
	if (start_line == end_line && (abbr = zen_coding.findAbbreviation())) {
		switch(editor_type) {
			case 'html':
			case 'xml':
			case 'xsl':
				var tree = zen_coding.parseIntoTree(abbr, editor_type);				if (tree) 					content = tree.toString(true);
				break;
			default:
				try {
					content = zen_settings[editor_type].snippets[abbr];				} catch(e) {}
		}
		
		replaceAbbreviationWithContent(abbr, content);
	} else if (use_tab) {
		// аббревиатуры раскрываются с помощью таба, но сама аббревиатура 
		// не найдена, будем делать отступ
		expandTab();
	}
}

function expandTab() {
	var editor = editors.activeEditor,
		start_offset = editor.selectionRange.startingOffset,
		end_offset = editor.selectionRange.endingOffset,
		start_line = editor.getLineAtOffset(start_offset),
		end_line = editor.getLineAtOffset(end_offset);
		
	var start_line_offset = editor.getOffsetAtLine(start_line),
			end_line_offset = editor.getOffsetAtLine(end_line + 1) - zen_coding.getNewline().length;
			
	if (start_line != end_line) {
		// выделили несколько строк, отбиваем их
		content = editor.source.substring(start_line_offset, end_line_offset);
		var new_content = zen_settings.indentation + zen_coding.padString(content, 1);
		
		editor.applyEdit(start_line_offset, content.length, new_content);
		editor.selectAndReveal(start_line_offset, zen_settings.indentation.length + content.length + end_line - start_line);
	} else {
		// выделение на одной строке, заменяем его на отступ
		editor.applyEdit(start_offset, end_offset - start_offset, zen_settings.indentation);
		editor.currentOffset++;
	}
}

/**
 * Заменяет аббревиатуру на ее значение. Отчкой отсчета считается текущая 
 * позиция каретки в редакторе. Многострочное содержимое будет автоматически
 * отбито нужным количеством отступов
 * @param {String} abbr Аббревиатура
 * @param {String} content Содержимое
 */
function replaceAbbreviationWithContent(abbr, content) {
	var editor = editors.activeEditor;
	
	if (!content)
		return;
		
	// заменяем переводы строк на те, что используются в редакторе
	content = content.replace(/\n/g, zen_coding.getNewline());
	
	// ставим отступ у текущей строки
	content = zen_coding.padString(content, zen_coding.getCurrentLinePadding()); 
	
	// получаем позицию, куда нужно поставить курсор
	var start_pos = editor.selectionRange.endingOffset - abbr.length;
	var cursor_pos = content.indexOf('|');
	content = content.replace(/\|/g, '');
	
	// заменяем аббревиатуру на текст
	editor.applyEdit(start_pos, abbr.length, content);
	
	// ставим курсор
	if (cursor_pos != -1)
		editor.currentOffset = start_pos + cursor_pos;
}

function printMessage(message) {
	out.println(message);
}