/*
 * Menu: Zen Coding > Toggle Comment
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M1+C
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include("lib/htmlparser.js");
include("lib/zen_coding.js");
include("lib/zen_eclipse.js");


var comment = "//";
var commentLength = comment.length;

function main() {
	
	var editor = editors.activeEditor;
	var cursor_pos = editor.currentOffset;

	//define which comment style should be used
	var type = String(getPartition(cursor_pos));

	//test if line should be commented or uncommented
	var lx = getLexemeFromPosition(cursor_pos);
//	out.println(lx.getToken() +' == '+ getCommentLexemeName(type));
	if(lx && lx.getType() == getCommentLexemeName(type)){
		//text must be uncommented
		switch(type){
			case 'text/html':
			case 'text/xml':
			case 'text/xsl':
				uncommentXML(lx, editor);
				break;
			case 'text/css':
				uncommentCSS(lx, editor);
				break;
		}
	}
	else{
		//text must be commented
		switch(type){
			case 'text/html':
			case 'text/xml':
				commentXML(editor);
				break;
			case 'text/css':
				commentCSS(editor);
				break;
			case 'text/javascript':
			case 'text/jscomment':
				commentJS(editor);
				break;
			default:
				out.println('no style for '+type);
		}
	}
}

/**
 * Comment strings in XML style
 * @param {Object} editor
 */
function commentXML(editor){
	editor = editors.activeEditor;
	editor.beginCompoundChange();
	
	// first we need to know if we're trying to comment selection or tag pair
	if (editor.selectionRange.startingOffset != editor.selectionRange.endingOffset) {
		if (zen_coding.isInsideTag(editor.source, editor.currentOffset)) {
			// commenting pair, find ranges and add comments
			var range = zen_coding.getPairRange(editor.source, editor.currentOffset);
			if (range) {
				editor.applyEdit(range.end, 0, ' -->');
				editor.applyEdit(range.start, 0, '<!-- ');
			}
		}
	} else {
		editor.applyEdit(editor.selectionRange.startingOffset, 0, '<!-- ');
		editor.applyEdit(editor.selectionRange.endingOffset, 0, ' -->');
	}

	editor.endCompoundChange();
}

/**
 * Uncomment strings in XML style
 * @param {Object} lx Commented lexeme object
 * @param {Object} editor
 */
function uncommentXML(lx, editor){
	editor.beginCompoundChange();

	editor.applyEdit(lx.getEndingOffset() - 4, 4, '');
	editor.applyEdit(lx.getStartingOffset(), 5, '');

	editor.endCompoundChange();
}

/**
 * Comment strings in XML style
 * @param {Object} editor
 */
function commentCSS(editor){
	editor.beginCompoundChange();

	editor.applyEdit(editor.selectionRange.startingOffset, 0, '/* ');
	editor.applyEdit(editor.selectionRange.endingOffset, 0, ' */');

	editor.endCompoundChange();
}

/**
 * Uncomment strings in CSS style
 * @param {Object} lx Commented lexeme object
 * @param {Object} editor
 */
function uncommentCSS(lx, editor){
	editor.beginCompoundChange();

	editor.applyEdit(lx.getEndingOffset() - 3, 3, '');
	editor.applyEdit(lx.getStartingOffset(), 3, '');

	editor.endCompoundChange();
}

/**
 * Comment strings in JavaScript style
 * @param {Object} editor
 */
function commentJS(editor){
	// get range of lines in the selection (or at the cursor position)
	var range = editor.selectionRange;
	var startLine = editor.getLineAtOffset(range.startingOffset);
	var endLine = editor.getLineAtOffset(range.endingOffset);

	// determine if we're adding or removing comments
	var source = editor.source;
	var offset = editor.getOffsetAtLine(startLine);
	var addComment = (source.substring(offset, offset + commentLength) != comment);
	var adjust = 0;

	editor.beginCompoundChange();

	if (addComment) {
		for (var i = startLine; i <= endLine; i++) {
			var offset = editor.getOffsetAtLine(i);
			editor.applyEdit(offset, 0, comment);
		}
	} else {
		for (var i = startLine; i <= endLine; i++) {
			var offset = editor.getOffsetAtLine(i);

			if (source.substring(offset + adjust, offset + adjust + commentLength) == comment) {
				editor.applyEdit(offset, commentLength, "");
				adjust += commentLength;
			}
		}
	}

	editor.endCompoundChange();
}

/**
 * Returns comment lexeme name for current document type
 * @param {String} type Document MIME-type
 * @return {String}
 */
function getCommentLexemeName(type){
	switch(type){
		case 'text/html':
		case 'text/css':
			return 'COMMENT';
		default:
			return '';
	}
}