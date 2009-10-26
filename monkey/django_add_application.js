/*
 * Menu: Django > Add App
 * Key: M1+M2+k
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
  * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.doms
 */

function main() {
    /*projects = workspace.root.getProjects();
    for (var i = projects.length - 1; i >= 0; i--){
	alert(projects[i]);    
    };
*/
    var dialog = Packages.org.eclipse.jface.dialogs.InputDialog(window.getShell(), 
                                                                "Add Application", 
                                                                "Enter application name:", 
                                                                "", 
                                                                null);
    
    if( dialog.open() == 0 ){
        alert(dialog.getValue());
    }
}
