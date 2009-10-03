/*
 * Menu: Django > Add App
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
  * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.doms
 */

include("/home/kenny/Aptana Studio Workspace/Scripts/monkey/lib/IDE_Utils.js")
function main() {
    projects = workspace.root.getProjects();
    for (var i = projects.length - 1; i >= 0; i--){
	alert(projects[i]);    
};

    
    
}

function alert(message) {
    Packages.org.eclipse.jface.dialogs.MessageDialog.openInformation(   
    window.getShell(),  
    "Message", 
    message 
    )
}