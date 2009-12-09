/**
 * Eclipse layer for Zen Coding
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "zen_coding.js"
 */

/**
 * If you're using Tab key, you have to set this variable to 'true'
 * @type Boolean
 */
var use_tab = false;

/**
 * Get the type of the partition based on the current offset
 * @param {Number} offset
 * @return {String}
 */
function getPartition(offset){
	var class_name = String(editors.activeEditor.textEditor.getClass());
	if (class_name.toLowerCase().indexOf('xsleditor') != -1)
		return 'text/xsl';
		
	try {

		var fileContext = editors.activeEditor.textEditor.getFileContext();

		if (fileContext !== null && fileContext !== undefined) {
			var partition = fileContext.getPartitionAtOffset(offset);
			return String(partition.getType());
		}
	} catch(e) {}

	return null;
}

/**
 * Returns current editor type ('css', 'html', etc)
 * @return {String|null}
 */
function getEditorType() {
	var content_types = {
		'text/html':  'html',
		'text/xml' :  'xml',
		'text/css' :  'css',
		'text/xsl' :  'xsl'
	};
	
	return content_types[getPartition(editors.activeEditor.currentOffset)];
}

if (!('zen_coding' in this))
	zen_coding = {};

/**
 * Returns editor's newline character
 * @return {String}
 */
zen_coding.getNewline = function() {
	return editors.activeEditor.lineDelimiter;
}

/**
 * Search for abbreviation in current editor from current caret position
 * @return {String|null}
 */
function findAbbreviation() {
	/** Current editor */
	var editor = editors.activeEditor;
	
	if (editor.selectionRange.startingOffset != editor.selectionRange.endingOffset) {
		// abbreviation is selected by user
		return editor.source.substring(editor.selectionRange.startingOffset, editor.selectionRange.endingOffset);
	}
	
	// search for new abbreviation from current caret position
	var original_offset = editor.currentOffset,
		cur_line = editor.getLineAtOffset(original_offset),
		line_offset = editor.getOffsetAtLine(cur_line);
	
	return zen_coding.extractAbbreviation(editor.source.substring(line_offset, original_offset));
}

/**
 * Search for new caret insertion point
 * @param {Number} Search increment: -1 — search left, 1 — search right
 * @param {Number} Initial offset relative to current caret position
 * @return {Number} Returns -1 if insertion point wasn't found
 */
function findNewEditPoint(inc, offset) {
	inc = inc || 1;
	offset = offset || 0;
	var editor = editors.activeEditor,
		cur_point = editor.currentOffset + offset,
		max_len = editor.sourceLength,
		next_point = -1;
	
	function ch(ix) {
		return editor.source.charAt(ix);
	}
		
	while (cur_point < max_len && cur_point > 0) {
		cur_point += inc;
		var cur_char = ch(cur_point),
			next_char = ch(cur_point + 1),
			prev_char = ch(cur_point - 1);
			
		switch (cur_char) {
			case '"':
			case '\'':
				if (next_char == cur_char && prev_char == '=') {
					// empty attribute
					next_point = cur_point + 1;
				}
				break;
			case '>':
				if (next_char == '<') {
					// between tags
					next_point = cur_point + 1;
				}
				break;
		}
		
		if (next_point != -1)
			break;
	}
	
	return next_point;
}

/**
 * Returns padding of current editor's line
 * @return {String}
 */
function getCurrentLinePadding() {
	var editor = editors.activeEditor,
		cur_line_num = editor.getLineAtOffset(editor.selectionRange.startingOffset),
		end_offset = editor.getOffsetAtLine(cur_line_num + 1) + zen_coding.getNewline().length,
		cur_line = editor.source.substring(editor.getOffsetAtLine(cur_line_num), end_offset);
	return (cur_line.match(/^(\s+)/) || [''])[0];
}

/**
 * Unindent content, thus preparing text for tag wrapping
 * @param {String} text
 * @return {String}
 */
function unindent(text) {
	var pad = getCurrentLinePadding();
	var lines = zen_coding.splitByLines(text);
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search(pad) == 0)
			lines[i] = lines[i].substr(pad.length);
	}
	
	return lines.join(zen_coding.getNewline());
}

function expandTab() {
	var editor = editors.activeEditor,
		start_offset = editor.selectionRange.startingOffset,
		end_offset = editor.selectionRange.endingOffset,
		start_line = editor.getLineAtOffset(start_offset),
		end_line = editor.getLineAtOffset(end_offset),
		
		indent = zen_settings.variables.indentation;
		
	var start_line_offset = editor.getOffsetAtLine(start_line),
			end_line_offset = editor.getOffsetAtLine(end_line + 1) - zen_coding.getNewline().length;
			
	if (start_line != end_line) {
		// selecated a few lines, indent them
		content = editor.source.substring(start_line_offset, end_line_offset);
		var new_content = indent + zen_coding.padString(content, 1);
		
		editor.applyEdit(start_line_offset, content.length, new_content);
		editor.selectAndReveal(start_line_offset, indent.length + content.length + end_line - start_line);
	} else {
		// selection spans just a single string, replace indentation
		editor.applyEdit(start_offset, end_offset - start_offset, indent);
		editor.currentOffset++;
	}
}

/**
 * Replaces current editor's substring with new content. Multiline content
 * will be automatically padded
 * 
 * @param {String} editor_str Current editor's substring
 * @param {String} content New content
 */
function replaceEditorContent(editor_str, content) {
	var editor = editors.activeEditor;
	
	if (!content)
		return;
		
	// set newlines according to editor's settings
	content = content.replace(/\n/g, zen_coding.getNewline());
	
	// add padding for current line
	content = zen_coding.padString(content, getCurrentLinePadding()); 
	
	// get char index where we need to place cursor
	var start_pos = editor.selectionRange.endingOffset - editor_str.length;
	var cursor_pos = content.indexOf('|');
	content = content.replace(/\|/g, '');
	
	// replace content in editor
	editor.applyEdit(start_pos, editor_str.length, content);
	
	// place cursor
	if (cursor_pos != -1)
		editor.currentOffset = start_pos + cursor_pos;
}

function guessProfileName() {
	switch(getEditorType()) {
		 case 'xml':
		 case 'xsl':
		 	return 'xml';
		 case 'html':
		 	// html or xhtml?
		 	return editors.activeEditor.source.search(/<!DOCTYPE[^>]+XHTML.+?>/) != -1 
		 		? 'xhtml'
		 		: 'html';
	}
	
	return 'html';
}

function mainExpandAbbreviation(editor_type, profile_name) {
	profile_name = profile_name || 'xhtml';
	
	var editor = editors.activeEditor,
		start_offset = editor.selectionRange.startingOffset,
		end_offset = editor.selectionRange.endingOffset,
		start_line = editor.getLineAtOffset(start_offset),
		end_line = editor.getLineAtOffset(end_offset),
	
		abbr,
		content = '';
		
	if (start_line == end_line && (abbr = findAbbreviation())) {
		content = zen_coding.expandAbbreviation(abbr, editor_type, profile_name);
		replaceEditorContent(abbr, content);
	} else if (use_tab) {
		// A 'Tab' key is used as trigger, but no valid abbreviation found,
		// let's indent selection
		expandTab();
	}
}

/**
 * Wraps content with abbreviation
 * @param {String} editor_type
 * @param {String} profile_name
 */
function mainWrapWithAbbreviation(editor_type, profile_name) {
	profile_name = profile_name || 'xhtml';
	
	var editor = editors.activeEditor,
		start_offset = editor.selectionRange.startingOffset,
		end_offset = editor.selectionRange.endingOffset,
	
		abbr = prompt('Enter abbreviation');
		
	if (!abbr)
		return null; 
	
	if (start_offset == end_offset) {
		// no selection, find tag pair
		var range = HTMLPairMatcher(editor.source, Math.max(start_offset, end_offset));
		
		if (!range || range[0] == -1) // nothing to wrap
			return null;
			
		start_offset = range[0];
		end_offset = range[1];
			
		// narrow down selection until first non-space character
		var re_space = /\s|\n|\r/;
		function isSpace(ch) {
			return re_space.test(ch);
		}
		
		while (start_offset < end_offset) {
			if (!isSpace(editor.source.charAt(start_offset)))
				break;
				
			start_offset++;
		}
		
		while (end_offset > start_offset) {
			end_offset--;
			if (!isSpace(editor.source.charAt(end_offset))) {
				end_offset++;
				break;
			}
		}
			
	}
	
	var content = editor.source.substring(start_offset, end_offset),
		result = zen_coding.wrapWithAbbreviation(abbr, unindent(content), editor_type, profile_name);
	
	if (result) {
		editor.currentOffset = end_offset;
		replaceEditorContent(content, result);
	}
}

function printMessage(message) {
	out.println(message);
}

/**
 * getLexemeList
 *
 * @return {LexemeList}
 */
function getLexemeList() {
	var result = null;
	var fileContext = getFileContext();
	
	if (fileContext !== null && fileContext !== undefined) {
		result = fileContext.getLexemeList();
	}
	
	return result;
}

/**
 * getFileContext
 * 
 * @return {FileContext}
 */
function getFileContext() {
	var result = null;
	
	try	{
		result = editors.activeEditor.textEditor.getFileContext();
	} catch(e) {}
	
	return result;
}

/**
 * Return lexeme from position
 * @param {Number} pos Position where to get lexeme
 * @return {Object}
 */
function getLexemeFromPosition(pos){
	var lexemeList = getLexemeList(), lx;
	if (lexemeList != null && lexemeList.size() > 0){
		for (var i = 0; i < lexemeList.size(); i++){
			lx = lexemeList.get(i);
			if(lx.getStartingOffset() <= pos && lx.getEndingOffset() >= pos){
				return lx;
			}
		}
	}

	return null;
}