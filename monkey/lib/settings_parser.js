/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
var zen_coding_parser = (function(){
	/**
	 * Check if <code>needle</code> exists in <code>haystack</code>
	 * @param {Object} needle
	 * @param {Array} haystack
	 * @return {Boolean}
	 */
	function inArray(needle, haystack) {
		var exists = false;
		for (var i = 0; i < haystack.length; i++) {
			if (haystack[i] == needle) {
				exists = true;
				break;
			}
		}
		
		return exists;
	}
	
	var tags_attrs = ['block_elements', 'inline_elements', 'empty_elements'];
	var attrs_to_parse = ['default_attributes', 'aliases'];
	
	
})();