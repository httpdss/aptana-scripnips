/*
 * Menu: Django > Open template
 * Key: M1+M2+F3
 * Kudos: Kevin Lindsey
 * License: EPL 1.0
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * DOM: http://localhost/com.aptana.ide.scripting
 */

// includes
include("lib/IDE_Utils.js");

/**
 * main
 */
function main()
{
    var sourceEditor = editors.activeEditor;
    
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

            var parent = new File(editors.activeEditor.uri.substring(5)).parentFile.absolutePath;


            var file = new File(parent + "/templates/" + selection);
            if (file.exists == false)
            {
                alert("mal path")
            } else {
                
                fileUtils.open(file.absolutePath);
            }
            
            
    }

}

