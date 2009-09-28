/*
 * Menu: Django > Add application
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 */

function main() {
 
    
    var sourceEditor = editors.activeEditor;
    
    var defaultTag = "trans" // default value to place in prompt
    
    // make sure we have an editor
    if (sourceEditor === undefined) {
        valid = false;
        showError("No active editor");
    }
    else    
    {
            var range = sourceEditor.selectionRange;
            var offset = range.startingOffset;
            var deleteLength = range.endingOffset - range.startingOffset;
            var source = sourceEditor.source;
            
            var selection = source.substring(range.startingOffset, range.endingOffset);
            var wrap = prompt("Tag to wrap selection with (i.e. 'trans'):", defaultTag);
            if(wrap != undefined)
            {
                selection = "{% " + wrap + " '" +selection + "' %}";
                
                // apply edit and reveal in editor
                sourceEditor.applyEdit(offset, deleteLength, selection);
                sourceEditor.selectAndReveal(offset, selection.length);
            }
    }
}