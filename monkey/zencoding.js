include('zen_settings.js');
zen_coding = (function(){
/**
 * Core library that do all Zen Coding magic
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @include "settings.js"
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */var zen_coding = (function(){
	
	var re_tag = /<\/?[\w:\-]+(?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*\s*(\/?)>$/;
	
	var TYPE_ABBREVIATION = 'zen-tag',
		TYPE_EXPANDO = 'zen-expando',
	
		/** Reference to another abbreviation or tag */
		TYPE_REFERENCE = 'zen-reference',
		
		caret_placeholder = '{%::zen-caret::%}',
		newline = '\n',
		default_tag = 'div';
		
	var default_profile = {
		tag_case: 'lower',
		attr_case: 'lower',
		attr_quotes: 'double',
		
		// each tag on new line
		tag_nl: 'decide',
		
		place_cursor: true,
		
		// indent tags
		indent: true,
		
		// how many inline elements should be to force line break 
		// (set to 0 to disable)
		inline_break: 3,
		
		// use self-closing style for writing empty elements, e.g. <br /> or <br>
		self_closing_tag: 'xhtml'
	};
	
	var profiles = {};
	
	/** List of registered filters */
	var filters = {},
		/** Filters that will be applied for unknown syntax */
		basic_filters = 'html';
	
	/**
	 * Проверяет, является ли символ допустимым в аббревиатуре
	 * @param {String} ch
	 * @return {Boolean}
	 */
	function isAllowedChar(ch) {
		var char_code = ch.charCodeAt(0),
			special_chars = '#.>+*:$-_!@[]()|';
		
		return (char_code > 64 && char_code < 91)       // uppercase letter
				|| (char_code > 96 && char_code < 123)  // lowercase letter
				|| (char_code > 47 && char_code < 58)   // number
				|| special_chars.indexOf(ch) != -1;     // special character
	}
	
	/**
	 * Возвращает символ перевода строки, используемый в редакторе
	 * @return {String}
	 */
	function getNewline() {
		return zen_coding.getNewline();
	}
	
	/**
	 * Split text into lines. Set <code>remove_empty</code> to true to filter
	 * empty lines
	 * @param {String} text
	 * @param {Boolean} [remove_empty]
	 * @return {Array}
	 */
	function splitByLines(text, remove_empty) {
		// IE fails to split string by regexp, 
		// need to normalize newlines first
		// Also, Mozilla's Rhiho JS engine has a wierd newline bug
		var nl = getNewline();
		var lines = (text || '')
			.replace(/\r\n/g, '\n')
			.replace(/\n\r/g, '\n')
			.replace(/\n/g, nl)
			.split(nl);
		
		if (remove_empty) {
			for (var i = lines.length; i >= 0; i--) {
				if (!trim(lines[i]))
					lines.splice(i, 1);
			}
		}
		
		return lines;
	}
	
	/**
	 * Trim whitespace from string
	 * @param {String} text
	 * @return {String}
	 */
	function trim(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	}
	
	function createProfile(options) {
		var result = {};
		for (var p in default_profile)
			result[p] = (p in options) ? options[p] : default_profile[p];
		
		return result;
	}
	
	function setupProfile(name, options) {
		profiles[name.toLowerCase()] = createProfile(options || {});
	}
	
	/**
	 * Helper function that transforms string into hash
	 * @return {Object}
	 */
	function stringToHash(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
	
	/**
	 * Repeats string <code>how_many</code> times
	 * @param {String} str
	 * @param {Number} how_many
	 * @return {String}
	 */
	function repeatString(str, how_many) {
		var result = '';
		for (var i = 0; i < how_many; i++) 
			result += str;
			
		return result;
	}
	
	/**
	 * Indents text with padding
	 * @param {String} text Text to indent
	 * @param {String|Number} pad Padding size (number) or padding itself (string)
	 * @return {String}
	 */
	function padString(text, pad) {
		var pad_str = (typeof(pad) == 'number') 
				? repeatString(getIndentation(), pad) 
				: pad, 
			result = '';
		
		var lines = splitByLines(text),
			nl = getNewline();
			
		result += lines[0];
		for (var j = 1; j < lines.length; j++) 
			result += nl + pad_str + lines[j];
			
		return result;
	}
	
	/**
	 * Class inheritance method
	 * @param {Function} derived Derived class
	 * @param {Function} from Base class
	 */
	function inherit(derived, from) {
		var Inheritance = function(){};
	
		Inheritance.prototype = from.prototype;
	
		derived.prototype = new Inheritance();
		derived.prototype.constructor = derived;
		derived.baseConstructor = from;
		derived.superClass = from.prototype;
	};
	
	/**
	 * Check if passed abbreviation is snippet
	 * @param {String} abbr
	 * @param {String} type
	 * @return {Boolean}
	 */
	function isShippet(abbr, type) {
		return getSnippet(type, abbr) ? true : false;
	}
	
	/**
	 * Test if passed string ends with XHTML tag. This method is used for testing
	 * '>' character: it belongs to tag or it's a part of abbreviation? 
	 * @param {String} str
	 * @return {Boolean}
	 */
	function isEndsWithTag(str) {
		return re_tag.test(str);
	}
	
	/**
	 * Returns specified elements collection (like 'empty', 'block_level') from
	 * <code>resource</code>. If collections wasn't found, returns empty object
	 * @param {Object} resource
	 * @param {String} type
	 * @return {Object}
	 */
	function getElementsCollection(resource, type) {
		if (resource && resource.element_types)
			return resource.element_types[type] || {}
		else
			return {};
	}
	
	/**
	 * Replace variables like ${var} in string
	 * @param {String} str
	 * @param {Object} [vars] Variable set (default is <code>zen_settings.variables</code>) 
	 * @return {String}
	 */
	function replaceVariables(str, vars) {
		vars = vars || zen_settings.variables;
		return str.replace(/\$\{([\w\-]+)\}/g, function(str, p1){
			return (p1 in vars) ? vars[p1] : str;
		});
	}
	
	/**
	 * Tag
	 * @class
	 * @param {String} name tag name
	 * @param {Number} count Output multiplier (default: 1)
	 * @param {String} type Tag type (html, xml)
	 */
	function Tag(name, count, type) {
		name = name.toLowerCase();
		type = type || 'html';
		
		var abbr = getAbbreviation(type, name);
		if (abbr && abbr.type == TYPE_REFERENCE)
			abbr = getAbbreviation(type, abbr.value);
		
		this.name = (abbr) ? abbr.value.name : name.replace('+', '');
		this.count = count || 1;
		this.children = [];
		this.attributes = [];
		this._attr_hash = {};
		this._abbr = abbr;
		this._res = zen_settings[type];
		this._content = '';
		this.repeat_by_lines = false;
		this.parent = null;
		
		// add default attributes
		if (this._abbr && this._abbr.value.attributes) {
			var def_attrs = this._abbr.value.attributes;			if (def_attrs) {
				for (var i = 0; i < def_attrs.length; i++) {
					var attr = def_attrs[i];
					this.addAttribute(attr.name, attr.value);
				}
			}
		}
	}
	
	Tag.prototype = {
		/**
		 * Adds new child tag to current one
		 * @param {Tag} tag
		 */
		addChild: function(tag) {
			tag.parent = this;
			this.children.push(tag);
		},
		
		/**
		 * Adds new attribute
		 * @param {String} name Attribute's name
		 * @param {String} value Attribute's value
		 */
		addAttribute: function(name, value) {
			// the only place in Tag where pipe (caret) character may exist
			// is the attribute: escape it with internal placeholder
			value = replaceUnescapedSymbol(value, '|', caret_placeholder);
			
			var a;
			if (name in this._attr_hash) {
				// attribute already exists, decide what to do
				a = this._attr_hash[name];
				if (name == 'class') {
					// 'class' is a magic attribute
					a.value += ((a.value) ? ' ' : '') + value;
				} else {
					a.value = value;
				}
			} else {
				a = {name: name, value: value};
				this._attr_hash[name] = a
				this.attributes.push(a);
			}
		},
		
		/**
		 * This function tests if current tags' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return this.getContent() && re_tag.test(this.getContent());
		},
		
		/**
		 * Set textual content for tag
		 * @param {String} str Tag's content
		 */
		setContent: function(str) {
			this._content = str;
		},
		
		/**
		 * Returns tag's textual content
		 * @return {String}
		 */
		getContent: function() {
			return this._content;
		},
		
		/**
		 * Search for deepest and latest child of current element
		 * @return {Tag|null} Returns null if there's no children
		 */
		findDeepestChild: function() {
			if (!this.children.length)
				return null;
				
			var deepest_child = this;
			while (true) {
				deepest_child = deepest_child.children[ deepest_child.children.length - 1 ];
				if (!deepest_child.children.length)
					break;
			}
			
			return deepest_child;
		}
	};
	
	function Snippet(name, count, type) {
		/** @type {String} */
		this.name = name;
		this.count = count || 1;
		this.children = [];
		this._content = '';
		this.repeat_by_lines = false;
		this.attributes = {'id': caret_placeholder, 'class': caret_placeholder};
		this.value = replaceUnescapedSymbol(getSnippet(type, name), '|', caret_placeholder);
		this.parent = null;
	}
	
	inherit(Snippet, Tag);
	
	/**
	 * Returns abbreviation value from data set
	 * @param {String} type Resource type (html, css, ...)
	 * @param {String} abbr Abbreviation name
	 * @return {Object|null}
	 */
	function getAbbreviation(type, abbr) {
		return getSettingsResource(type, abbr, 'abbreviations');
	}
	
	/**
	 * Returns snippet value from data set
	 * @param {String} type Resource type (html, css, ...)
	 * @param {String} snippet_name Snippet name
	 * @return {Object|null}
	 */
	function getSnippet(type, snippet_name) {
		return getSettingsResource(type, snippet_name, 'snippets');
	}
	
	/**
	 * Returns variable value
	 * @return {String}
	 */
	function getVariable(name) {
		return zen_settings.variables[name];
	}
	
	/**
	 * Returns indentation string
	 * @return {String}
	 */
	function getIndentation() {
		return getVariable('indentation');
	}
	
	/**
	 * Creates resource inheritance chain for lookups
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 * @return {Array}
	 */
	function createResourceChain(syntax, name) {
		var resource = zen_settings[syntax],
			result = [];
		
		if (resource) {
			if (name in resource)
				result.push(resource[name]);
			if ('extends' in resource) {
				// find resource in ancestors
				for (var i = 0; i < resource['extends'].length; i++) {
					var type = resource['extends'][i];
					if (zen_settings[type] && zen_settings[type][name])
						result.push(zen_settings[type][name]);
				}
			}
		}
		
		return result;
	}
	
	/**
	 * Get resource collection from settings file for specified syntax. 
	 * It follows inheritance chain if resource wasn't directly found in
	 * syntax settings
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 */
	function getResource(syntax, name) {
		var chain = createResourceChain(syntax, name);
		return chain[0];
	}
	
	/**
	 * Returns resurce value from data set with respect of inheritance
	 * @param {String} syntax Resource syntax (html, css, ...)
	 * @param {String} abbr Abbreviation name
	 * @param {String} name Resource name ('snippets' or 'abbreviation')
	 * @return {Object|null}
	 */
	function getSettingsResource(syntax, abbr, name) {
		var chain = createResourceChain(syntax, name);
		for (var i = 0, il = chain.length; i < il; i++) {
			if (abbr in chain[i])
				return chain[i][abbr];
		}
		
		return null;
	}
	
	/**
	 * Get word, starting at <code>ix</code> character of <code>str</code>
	 */
	function getWord(ix, str) {
		var m = str.substring(ix).match(/^[\w\-:\$]+/);
		return m ? m[0] : '';
	}
	
	/**
	 * Extract attributes and their values from attribute set 
	 * @param {String} attr_set
	 */
	function extractAttributes(attr_set) {
		attr_set = trim(attr_set);
		var loop_count = 100, // endless loop protection
			re_string = /^(["'])((?:(?!\1)[^\\]|\\.)*)\1/,
			result = [],
			attr;
			
		while (attr_set && loop_count--) {
			var attr_name = getWord(0, attr_set);
			attr = null;
			if (attr_name) {
				attr = {name: attr_name, value: ''};
//				result[attr_name] = '';
				// let's see if attribute has value
				var ch = attr_set.charAt(attr_name.length);
				switch (ch) {
					case '=':
						var ch2 = attr_set.charAt(attr_name.length + 1);
						if (ch2 == '"' || ch2 == "'") {
							// we have a quoted string
							var m = attr_set.substring(attr_name.length + 1).match(re_string);
							if (m) {
								attr.value = m[2];
								attr_set = trim(attr_set.substring(attr_name.length + m[0].length + 1));
							} else {
								// something wrong, break loop
								attr_set = '';
							}
						} else {
							// unquoted string
							var m = attr_set.substring(attr_name.length + 1).match(/(.+?)(\s|$)/);
							if (m) {
								attr.value = m[1];
								attr_set = trim(attr_set.substring(attr_name.length + m[1].length + 1));
							} else {
								// something wrong, break loop
								attr_set = '';
							}
						}
						break;
					default:
						attr_set = trim(attr_set.substring(attr_name.length));
						break;
				}
			} else {
				// something wrong, can't extract attribute name
				break;
			}
			
			if (attr) result.push(attr);
		}
		return result;
	}
	
	/**
	 * Parses tag attributes extracted from abbreviation
	 * @param {String} str
	 */
	function parseAttributes(str) {
		/*
		 * Example of incoming data:
		 * #header
		 * .some.data
		 * .some.data#header
		 * [attr]
		 * #item[attr=Hello other="World"].class
		 */
		var result = [],
			class_name,
			char_map = {'#': 'id', '.': 'class'};
		
		// walk char-by-char
		var i = 0,
			il = str.length,
			val;
			
		while (i < il) {
			var ch = str.charAt(i);
			switch (ch) {
				case '#': // id
					val = getWord(i, str.substring(1));
					result.push({name: char_map[ch], value: val});
					i += val.length + 1;
					break;
				case '.': // class
					val = getWord(i, str.substring(1));
					if (!class_name) {
						// remember object pointer for value modification
						class_name = {name: char_map[ch], value: ''};
						result.push(class_name);
					}
					
					class_name.value += ((class_name.value) ? ' ' : '') + val;
					i += val.length + 1;
					break;
				case '[': //begin attribute set
					// search for end of set
					var end_ix = str.indexOf(']', i);
					if (end_ix == -1) {
						// invalid attribute set, stop searching
						i = str.length;
					} else {
						var attrs = extractAttributes(str.substring(i + 1, end_ix));
						for (var j = 0, jl = attrs.length; j < jl; j++) {
							result.push(attrs[j]);
						}
						i = end_ix;
					}
					break;
				default:
					i++;
				
			}
		}
		
		return result;
	}
	
	/**
	 * Creates group element
	 * @param {String} expr Part of abbreviation that belongs to group item
	 * @param {abbrGroup} [parent] Parent group item element
	 */
	function abbrGroup(parent) {
		return {
			expr: '',
			parent: parent || null,
			children: [],
			addChild: function() {
				var child = abbrGroup(this);
				this.children.push(child);
				return child;
			},
			cleanUp: function() {
				for (var i = this.children.length - 1; i >= 0; i--) {
					var expr = this.children[i].expr;
					if (!expr)
						this.children.splice(i, 1);
					else {
						// remove operators at the and of expression
//						this.children[i].expr = expr.replace(/[\+>]+$/, '');
						this.children[i].cleanUp();
					}
				}
			}
		}
	}
	
	/**
	 * Split abbreviation by groups
	 * @param {String} abbr
	 * @return {abbrGroup()}
	 */
	function splitByGroups(abbr) {
		var root = abbrGroup(),
			last_parent = root,
			cur_item = root.addChild(),
			stack = [],
			i = 0,
			il = abbr.length;
		
		while (i < il) {
			var ch = abbr.charAt(i);
			switch(ch) {
				case '(':
					// found new group
					var operator = i ? abbr.charAt(i - 1) : '';
					if (operator == '>') {
						stack.push(cur_item);
						last_parent = cur_item;
					} else {
						stack.push(last_parent);
					}
					cur_item = null;
					break;
				case ')':
					last_parent = stack.pop();
					cur_item = null;
					var next_char = (i < il - 1) ? abbr.charAt(i + 1) : '';
					if (next_char == '+' || next_char == '>') 
						// next char is group operator, skip it
						i++;
					break;
				default:
					if (ch == '+' || ch == '>') {
						// skip operator if it's followed by parenthesis
						var next_char = (i + 1 < il) ? abbr.charAt(i + 1) : '';
						if (next_char == '(') break;
					}
					if (!cur_item)
						cur_item = last_parent.addChild();
					cur_item.expr += ch;
			}
			
			i++;
		}
		
		root.cleanUp();
		return root;
	}
	
	/**
	 * @class
	 * Creates simplified tag from Zen Coding tag
	 * @param {Tag} tag
	 */
	function ZenNode(tag) {
		
		this.type = (tag instanceof Snippet) ? 'snippet' : 'tag';
		this.name = tag.name;
		this.attributes = tag.attributes;
		this.children = [];
		
		/** @type {Tag} Source element from which current tag was created */
		this.source = tag;
		
		// relations
		/** @type {ZenNode} */
		this.parent = null;
		/** @type {ZenNode} */
		this.nextSibling = null;
		/** @type {ZenNode} */
		this.previousSibling = null;
		
		// output params
		this.start = '';
		this.end = '';
		this.content = '';
		this.padding = '';
	}
	
	ZenNode.prototype = {
		/**
		 * @type {ZenNode} tag
		 */
		addChild: function(tag) {
			tag.parent = this;
			var last_child = this.children[this.children.length - 1];
			if (last_child) {
				tag.previousSibling = last_child;
				last_child.nextSibling = tag;
			}
			
			this.children.push(tag);
		},
		
		/**
		 * Get attribute's value.
		 * @param {String} name
		 * @return {String|null} Returns <code>null</code> if attribute wasn't found
		 */
		getAttribute: function(name) {
			name = name.toLowerCase();
			for (var i = 0, il = this.attributes.length; i < il; i++) {
				if (this.attributes[i].name.toLowerCase() == name)
					return this.attributes[i].value;
			}
			
			return null;
		},
		
		/**
		 * Test if current tag is unary (no closing tag)
		 * @return {Boolean}
		 */
		isUnary: function() {
			if (this.type == 'snippet')
				return false;
				
			return (this.source._abbr && this.source._abbr.value.is_empty) || (this.name in getElementsCollection(this.source._res, 'empty'));
		},
		
		/**
		 * Test if current tag is inline-level (like &lt;strong&gt;, &lt;img&gt;)
		 * @return {Boolean}
		 */
		isInline: function() {
			return (this.name in getElementsCollection(this.source._res, 'inline_level'));
		},
		
		/**
		 * Test if current element is block-level
		 * @return {Boolean}
		 */
		isBlock: function() {
			return this.type == 'snippet' || !this.isInline();
		},
		
		/**
		 * This function tests if current tags' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return this.content && re_tag.test(this.content);
		},
		
		/**
		 * Check if tag has child elements
		 * @return {Boolean}
		 */
		hasChildren: function() {
			return !!this.children.length;
		},
		
		/**
		 * Test if current tag contains block-level children
		 * @return {Boolean}
		 */
		hasBlockChildren: function() {
			if (this.hasTagsInContent() && this.isBlock()) {
				return true;
			}
			
			for (var i = 0; i < this.children.length; i++) {
				if (this.children[i].isBlock())
					return true;
			}
			
			return false;
		},
		
		/**
		 * Search for deepest and latest child of current element
		 * @return {ZenNode|null} Returns <code>null</code> if there's no children
		 */
		findDeepestChild: function() {
			if (!this.children.length)
				return null;
				
			var deepest_child = this;
			while (true) {
				deepest_child = deepest_child.children[ deepest_child.children.length - 1 ];
				if (!deepest_child.children.length)
					break;
			}
			
			return deepest_child;
		},
		
		/**
		 * @return {String}
		 */
		toString: function() {
			var content = '';
			for (var i = 0, il = this.children.length; i < il; i++) {
				content += this.children[i].toString();
			}
			
			return this.start + this.content + content + this.end;
		}
	}
	
	/**
	 * Roll outs basic Zen Coding tree into simplified, DOM-like tree.
	 * The simplified tree, for example, represents each multiplied element 
	 * as a separate element sets with its own content, if exists.
	 * 
	 * The simplified tree element contains some meta info (tag name, attributes, 
	 * etc.) as well as output strings, which are exactly what will be outputted
	 * after expanding abbreviation. This tree is used for <i>filtering</i>:
	 * you can apply filters that will alter output strings to get desired look
	 * of expanded abbreviation.
	 * 
	 * @param {Tag} tree
	 * @param {ZenNode} [parent]
	 */
	function rolloutTree(tree, parent) {
		parent = parent || new ZenNode(tree);
		var how_many = 1,
			tag_content = '';
		
		for (var i = 0, il = tree.children.length; i < il; i++) {
			/** @type {Tag} */
			var child = tree.children[i];
			how_many = child.count;
			
			if (child.repeat_by_lines) {
				// it's a repeating element
				tag_content = splitByLines(child.getContent(), true);
				how_many = Math.max(tag_content.length, 1);
			} else {
				tag_content = child.getContent();
			}
			
			for (var j = 0; j < how_many; j++) {
				var tag = new ZenNode(child);
				parent.addChild(tag);
				
				if (child.children.length)
					rolloutTree(child, tag);
					
				var add_point = tag.findDeepestChild() || tag;
				if (tag_content) {
					add_point.content = (typeof(tag_content) == 'string') 
						? tag_content 
						: (tag_content[j] || '');
				}
			}
		}
		
		return parent;
	}
	
	/**
	 * Runs filters on tree
	 * @param {ZenNode} tree
	 * @param {String|Object} profile
	 * @param {String[]|String} filter_list
	 * @return {ZenNode}
	 */
	function runFilters(tree, profile, filter_list) {
		if (typeof(profile) == 'string' && profile in profiles)
			profile = profiles[profile];
		
		if (!profile)
			profile = profiles['plain'];
			
		if (typeof(filter_list) == 'string')
			filter_list = filter_list.split(/[\|,]/g);
			
		for (var i = 0, il = filter_list.length; i < il; i++) {
			var name = trim(filter_list[i].toLowerCase());
			if (name && name in filters) {
				tree = filters[name](tree, profile);
			}
		}
		
		return tree;
	}
	
	/**
	 * Transforms abbreviation into a primary internal tree. This tree should'n 
	 * be used ouside of this scope
	 * @param {String} abbr Abbreviation
	 * @param {String} [type] Document type (xsl, html, etc.)
	 * @return {Tag}
	 */
	function abbrToPrimaryTree(abbr, type) {
		type = type || 'html';
		var root = new Tag('', 1, type),
			parent = root,
			last = null,
			multiply_elem = null,
			res = zen_settings[type],
			re = /([\+>])?([a-z@\!\#\.][a-z0-9:\-]*)((?:(?:[#\.][\w\-\$]+)|(?:\[[^\]]+\]))+)?(\*(\d*))?(\+$)?/ig;
//				re = /([\+>])?([a-z@\!][a-z0-9:\-]*)(#[\w\-\$]+)?((?:\.[\w\-\$]+)*)(\*(\d*))?(\+$)?/ig;
		
		if (!abbr)
			return null;
		
		// replace expandos
		abbr = abbr.replace(/([a-z][\w\:\-]*)\+$/i, function(str){
			var a = getAbbreviation(type, str);
			return a ? a.value : str;
		});
		
		abbr = abbr.replace(re, function(str, operator, tag_name, attrs, has_multiplier, multiplier, has_expando){
			var multiply_by_lines = (has_multiplier && !multiplier);
			multiplier = multiplier ? parseInt(multiplier) : 1;
			
			var tag_ch = tag_name.charAt(0);
			if (tag_ch == '#' || tag_ch == '.') {
				attrs = tag_name + (attrs || '');
				tag_name = default_tag;
			}
			
			if (has_expando)
				tag_name += '+';
				
			var current = isShippet(tag_name, type) ? new Snippet(tag_name, multiplier, type) : new Tag(tag_name, multiplier, type);
			if (attrs) {
				attrs = parseAttributes(attrs);
				for (var i = 0, il = attrs.length; i < il; i++) {
					current.addAttribute(attrs[i].name, attrs[i].value);
				}
			}
			
			// dive into tree
			if (operator == '>' && last)
				parent = last;
				
			parent.addChild(current);
			
			last = current;
			
			if (multiply_by_lines)
				multiply_elem = current;
			
			return '';
		});
		
		root.last = last;
		root.multiply_elem = multiply_elem;
		
		// empty 'abbr' string means that abbreviation was successfully expanded,
		// if not — abbreviation wasn't valid 
		return (!abbr) ? root : null;	
	}
	
	/**
	 * Expand single group item 
	 * @param {abbrGroup} group
	 * @param {String} type
	 * @param {Tag} parent
	 */
	function expandGroup(group, type, parent) {
		var tree = abbrToPrimaryTree(group.expr, type),
			/** @type {Tag} */
			last_item = null;
			
		if (tree) {
			for (var i = 0, il = tree.children.length; i < il; i++) {
				last_item = tree.children[i];
				parent.addChild(last_item);
			}
		} else {
			throw new Error('InvalidGroup');
		}
		
		// set repeating element to the topmost node
		var root = parent;
		while (root.parent)
			root = root.parent;
		
		root.last = tree.last;
		if (tree.multiply_elem)
			root.multiply_elem = tree.multiply_elem;
			
		// process child groups
		if (group.children.length) {
			var add_point = last_item.findDeepestChild() || last_item;
			for (var j = 0, jl = group.children.length; j < jl; j++) {
				expandGroup(group.children[j], type, add_point);
			}
		}
	}
	
	/**
	 * Pad string with zeroes
	 * @param {String} str
	 * @param {Number} pad
	 */
	function zeroPadString(str, pad) {
		var padding = '', 
			il = str.length;
			
		while (pad > il++) padding += '0';
		return padding + str; 
	}
	
	/**
	 * Replaces unescaped symbols in <code>str</code>. For example, the '$' symbol
	 * will be replaced in 'item$count', but not in 'item\$count'.
	 * @param {String} str Original string
	 * @param {String} symbol Symbol to replace
	 * @param {String|Function} replace Symbol replacement
	 * @return {String}
	 */
	function replaceUnescapedSymbol(str, symbol, replace) {
		var i = 0,
			il = str.length,
			sl = symbol.length,
			match_count = 0;
			
		while (i < il) {
			if (str.charAt(i) == '\\') {
				// escaped symbol, skip next character
				i += sl + 1;
			} else if (str.substr(i, sl) == symbol) {
				// have match
				var cur_sl = sl;
				match_count++;
				var new_value = replace;
				if (typeof(replace) !== 'string') {
					var replace_data = replace(str, symbol, i, match_count);
					if (replace_data) {
						cur_sl = replace_data[0].length;
						new_value = replace_data[1];
					} else {
						new_value = false;
					}
				}
				
				if (new_value === false) { // skip replacement
					i++;
					continue;
				}
				
				str = str.substring(0, i) + new_value + str.substring(i + cur_sl);
				// adjust indexes
				il = str.length;
				i += new_value.length;
			} else {
				i++;
			}
		}
		
		return str;
	}
	
	// create default profiles
	setupProfile('xhtml');
	setupProfile('html', {self_closing_tag: false});
	setupProfile('xml', {self_closing_tag: true, tag_nl: true});
	setupProfile('plain', {tag_nl: false, indent: false, place_cursor: false});
	
	
	return {
		/** Hash of all available actions */
		actions: {},
		
		/**
		 * Adds new Zen Coding action. This action will be available in
		 * <code>zen_settings.actions</code> object.
		 * @param {String} name Action's name
		 * @param {Function} fn Action itself. The first argument should be
		 * <code>zen_editor</code> instance.
		 */
		registerAction: function(name, fn) {
			this.actions[name] = fn;
		},
		
		/**
		 * Runs Zen Coding action. For list of available actions and their
		 * arguments see <code>zen_actions.js</code> file.
		 * @param {String} name Action name 
		 * @param {Array} args Additional arguments. It may be array of arguments
		 * or inline arguments. The first argument should be <code>zen_editor</code> instance
		 * @example
		 * zen_coding.runActions('expand_abbreviation', zen_editor);  
		 * zen_coding.runActions('wrap_with_abbreviation', [zen_editor, 'div']);  
		 */
		runAction: function(name, args) {
			if (!(args instanceof Array))
				args = Array.prototype.slice.call(arguments, 1);
				
			try {
				if (name in this.actions)
					return this.actions[name].apply(this, args);
			} catch(e){
				return false; 
			}
		},
		
		expandAbbreviation: function(abbr, type, profile) {
			type = type || 'html';
			var tree_root = this.parseIntoTree(abbr, type);
			if (tree_root) {
				var tree = rolloutTree(tree_root);
				this.applyFilters(tree, type, profile, tree_root.filters);
				return replaceVariables(tree.toString());
			}
			
			return '';
		},
		
		/**
		 * Extracts abbreviations from text stream, starting from the end
		 * @param {String} str
		 * @return {String} Abbreviation or empty string
		 */
		extractAbbreviation: function(str) {
			var cur_offset = str.length,
				start_index = -1,
				brace_count = 0;
			
			while (true) {
				cur_offset--;
				if (cur_offset < 0) {
					// moved to the beginning of the line
					start_index = 0;
					break;
				}
				
				var ch = str.charAt(cur_offset);
				
				if (ch == ']')
					brace_count++;
				else if (ch == '[')
					brace_count--;
				else {
					if (brace_count) 
						// respect all characters inside attribute sets
						continue;
					else if (!isAllowedChar(ch) || (ch == '>' && isEndsWithTag(str.substring(0, cur_offset + 1)))) {
						// found stop symbol
						start_index = cur_offset + 1;
						break;
					}
				}
			}
			
			if (start_index != -1) 
				// found somethind, return abbreviation
				return str.substring(start_index);
			else
				return '';
		},
		
		/**
		 * Parses abbreviation into a node set
		 * @param {String} abbr Abbreviation
		 * @param {String} type Document type (xsl, html, etc.)
		 * @return {Tag}
		 */
		parseIntoTree: function(abbr, type) {
			type = type || 'html';
			// remove filters from abbreviation
			var filter_list = '';
			abbr = abbr.replace(/\|([\w\|\-]+)$/, function(str, p1){
				filter_list = p1;
				return '';
			});
			
			// split abbreviation by groups
			var group_root = splitByGroups(abbr),
				tree_root = new Tag('', 1, type);
			
			// then recursively expand each group item
			try {
				for (var i = 0, il = group_root.children.length; i < il; i++) {
					expandGroup(group_root.children[i], type, tree_root);
				}
			} catch(e) {
				// there's invalid group, stop parsing
				return null;
			}
			
			tree_root.filters = filter_list;
			return tree_root;
		},
		
		/**
		 * Indents text with padding
		 * @param {String} text Text to indent
		 * @param {String|Number} pad Padding size (number) or padding itself (string)
		 * @return {String}
		 */
		padString: padString,
		setupProfile: setupProfile,
		getNewline: function(){
			return newline;
		},
		
		setNewline: function(str) {
			newline = str;
		},
		
		/**
		 * Wraps passed text with abbreviation. Text will be placed inside last
		 * expanded element
		 * @param {String} abbr Abbreviation
		 * @param {String} text Text to wrap
		 * @param {String} [type] Document type (html, xml, etc.). Default is 'html'
		 * @param {String} [profile] Output profile's name. Default is 'plain'
		 * @return {String}
		 */
		wrapWithAbbreviation: function(abbr, text, type, profile) {
			type = type || 'html';
			var tree_root = this.parseIntoTree(abbr, type);
			if (tree_root) {
				var repeat_elem = tree_root.multiply_elem || tree_root.last;
				repeat_elem.setContent(text);
				repeat_elem.repeat_by_lines = !!tree_root.multiply_elem;
				
				var tree = rolloutTree(tree_root);
				this.applyFilters(tree, type, profile, tree_root.filters);
				return replaceVariables(tree.toString());
			}
			
			return null;
		},
		
		splitByLines: splitByLines,
		
		/**
		 * Check if cursor is placed inside xHTML tag
		 * @param {String} html Contents of the document
		 * @param {Number} cursor_pos Current caret position inside tag
		 * @return {Boolean}
		 */
		isInsideTag: function(html, cursor_pos) {
			var re_tag = /^<\/?\w[\w\:\-]*.*?>/;
			
			// search left to find opening brace
			var pos = cursor_pos;
			while (pos > -1) {
				if (html.charAt(pos) == '<') 
					break;
				pos--;
			}
			
			if (pos != -1) {
				var m = re_tag.exec(html.substring(pos));
				if (m && cursor_pos > pos && cursor_pos < pos + m[0].length)
					return true;
			}
			
			return false;
		},
		
		/**
		 * Returns caret placeholder
		 * @return {String}
		 */
		getCaretPlaceholder: function() {
			return (typeof(caret_placeholder) != 'string') 
				? caret_placeholder()
				: caret_placeholder
		},
		
		/**
		 * Set caret placeholder: a string (like '|') or function.
		 * You may use a function as a placeholder generator. For example,
		 * TextMate uses ${0}, ${1}, ..., ${n} natively for quick Tab-switching
		 * between them.
		 * @param {String|Function} value
		 */
		setCaretPlaceholder: function(value) {
			caret_placeholder = value;
		},
		
		rolloutTree: rolloutTree,
		
		/**
		 * Register new filter
		 * @param {String} name Filter name
		 * @param {Function} fn Filter function
		 */
		registerFilter: function(name, fn) {
			filters[name] = fn;
		},
		
		/**
		 * Factory method that produces <code>ZenNode</code> instance
		 * @param {String} name Node name
		 * @param {Array} [attrs] Array of attributes as key/value objects  
		 * @return {ZenNode}
		 */
		nodeFactory: function(name, attrs) {
			return new ZenNode({name: name, attributes: attrs || []});
		},
		
		/**
		 * Applies filters to tree according to syntax
		 * @param {ZenNode} tree Tag tree to apply filters to
		 * @param {String} syntax Syntax name ('html', 'css', etc.)
		 * @param {String|Object} profile Profile or profile's name
		 * @param {String|Array} [additional_filters] List or pipe-separated 
		 * string of additional filters to apply
		 * 
		 * @return {ZenNode}
		 */
		applyFilters: function(tree, syntax, profile, additional_filters){
			var _filters = getResource(syntax, 'filters') || basic_filters;
				
			if (additional_filters)
				_filters += '|' + ((typeof(additional_filters) == 'string') 
					? additional_filters 
					: additional_filters.join('|'));
				
			if (!_filters)
				// looks like unknown syntax, apply basic filters
				_filters = basic_filters;
				
			return runFilters(tree, profile, _filters);
		},
		
		runFilters: runFilters,
		
		repeatString: repeatString,
		getVariable: getVariable,
		setVariable: function(name, value) {
			zen_settings.variables[name] = value;
		},
		replaceVariables: replaceVariables,
		
		/**
		 * Escapes special characters used in Zen Coding, like '$', '|', etc.
		 * Use this method before passing to actions like "Wrap with Abbreviation"
		 * to make sure that existing spacial characters won't be altered
		 * @param {String} text
		 * @return {String}
		 */
		escapeText: function(text) {
			return text.replace(/([\$\|\\])/g, '\\$1');
		},
		
		/**
		 * Unescapes special characters used in Zen Coding, like '$', '|', etc.
		 * @param {String} text
		 * @return {String}
		 */
		unescapeText: function(text) {
			return text.replace(/\\(.)/g, '$1');
		},
		
		/**
		 * Replaces '$' character in string assuming it might be escaped with '\'
		 * @param {String} str
		 * @param {String|Number} value
		 * @return {String}
		 */
		replaceCounter: function(str, value) {
			var symbol = '$';
			value = String(value);
			return replaceUnescapedSymbol(str, symbol, function(str, symbol, pos, match_num){
				if (str.charAt(pos + 1) == '{') {
					// it's a variable, skip it
					return false;
				}
				
				// replace sequense of $ symbols with padded number  
				var j = pos + 1;
				while(str.charAt(j) == '$' && str.charAt(j + 1) != '{') j++;
				return [str.substring(pos, j), zeroPadString(value, j - pos)];
			});
		},
		
		/**
		 * Get profile by it's name. If profile wasn't found, returns 'plain'
		 * profile
		 */
		getProfile: function(name) {
			return (name in profiles) ? profiles[name] : profiles['plain'];
		},
		
		settings_parser: (function(){
			/**
			 * Unified object for parsed data
			 */
			function entry(type, key, value) {
				return {
					type: type,
					key: key,
					value: value
				};
			}
			
			/** Regular expression for XML tag matching */
			var re_tag = /^<(\w+\:?[\w\-]*)((?:\s+[\w\:\-]+\s*=\s*(['"]).*?\3)*)\s*(\/?)>/,
				re_attrs = /([\w\-]+)\s*=\s*(['"])(.*?)\2/g;
			
			/**
			 * Make expando from string
			 * @param {String} key
			 * @param {String} value
			 * @return {Object}
			 */
			function makeExpando(key, value) {
				return entry(TYPE_EXPANDO, key, value);
			}
			
			/**
			 * Make abbreviation from string
			 * @param {String} key Abbreviation key
			 * @param {String} tag_name Expanded element's tag name
			 * @param {String} attrs Expanded element's attributes
			 * @param {Boolean} is_empty Is expanded element empty or not
			 * @return {Object}
			 */
			function makeAbbreviation(key, tag_name, attrs, is_empty) {
				var result = {
					name: tag_name,
					is_empty: Boolean(is_empty)
				};
				
				if (attrs) {
					var m;
					result.attributes = [];
					while (m = re_attrs.exec(attrs)) {
						result.attributes.push({
							name: m[1],
							value: m[3]
						});
					}
				}
				
				return entry(TYPE_ABBREVIATION, key, result);
			}
			
			/**
			 * Parses all abbreviations inside object
			 * @param {Object} obj
			 */
			function parseAbbreviations(obj) {
				for (var key in obj) {
					var value = obj[key], m;
					
					key = trim(key);
					if (key.substr(-1) == '+') {
						// this is expando, leave 'value' as is
						obj[key] = makeExpando(key, value);
					} else if (m = re_tag.exec(value)) {
						obj[key] = makeAbbreviation(key, m[1], m[2], m[4] == '/');
					} else {
						// assume it's reference to another abbreviation
						obj[key] = entry(TYPE_REFERENCE, key, value);
					}
					
				}
			}
			
			return {
				/**
				 * Parse user's settings
				 * @param {Object} settings
				 */
				parse: function(settings) {
					for (var p in settings) {
						if (p == 'abbreviations')
							parseAbbreviations(settings[p]);
						else if (p == 'extends') {
							var ar = settings[p].split(',');
							for (var i = 0; i < ar.length; i++) 
								ar[i] = trim(ar[i]);
							settings[p] = ar;
						}
						else if (typeof(settings[p]) == 'object')
							arguments.callee(settings[p]);
					}
				},
				
				extend: function(parent, child) {
					for (var p in child) {
						if (typeof(child[p]) == 'object' && parent.hasOwnProperty(p))
							arguments.callee(parent[p], child[p]);
						else
							parent[p] = child[p];
					}
				},
				
				/**
				 * Create hash maps on certain string properties
				 * @param {Object} obj
				 */
				createMaps: function(obj) {
					for (var p in obj) {
						if (p == 'element_types') {
							for (var k in obj[p]) 
								obj[p][k] = stringToHash(obj[p][k]);
						} else if (typeof(obj[p]) == 'object') {
							arguments.callee(obj[p]);
						}
					}
				},
				
				TYPE_ABBREVIATION: TYPE_ABBREVIATION,
				TYPE_EXPANDO: TYPE_EXPANDO,
				
				/** Reference to another abbreviation or tag */
				TYPE_REFERENCE: TYPE_REFERENCE
			}
		})()
	}
	
})();

if ('zen_settings' in this || zen_settings) {
	// first we need to expand some strings into hashes
	zen_coding.settings_parser.createMaps(zen_settings);
	if ('my_zen_settings' in this) {
		// we need to extend default settings with user's
		zen_coding.settings_parser.createMaps(my_zen_settings);
		zen_coding.settings_parser.extend(zen_settings, my_zen_settings);
	}
	
	// now we need to parse final set of settings
	zen_coding.settings_parser.parse(zen_settings);
}/**
 * Middleware layer that communicates between editor and Zen Coding.
 * This layer describes all available Zen Coding actions, like 
 * "Expand Abbreviation".
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "zen_editor.js"
 * @include "html_matcher.js"
 * @include "zen_coding.js"
 */

/**
 * Search for abbreviation in editor from current caret position
 * @param {zen_editor} editor Editor instance
 * @return {String|null}
 */
function findAbbreviation(editor) {
	var range = editor.getSelectionRange();
	if (range.start != range.end) {
		// abbreviation is selected by user
		return editor.getContent().substring(range.start, range.end);
	}
	
	// search for new abbreviation from current caret position
	var cur_line = editor.getCurrentLineRange();
	return zen_coding.extractAbbreviation(editor.getContent().substring(cur_line.start, range.start));
}

/**
 * Find from current caret position and expand abbreviation in editor
 * @param {zen_editor} editor Editor instance
 * @param {String} [syntax] Syntax type (html, css, etc.)
 * @param {String} [profile_name] Output profile name (html, xml, xhtml)
 * @return {Boolean} Returns <code>true</code> if abbreviation was expanded 
 * successfully
 */
function expandAbbreviation(editor, syntax, profile_name) {
	syntax = syntax || editor.getSyntax();
	profile_name = profile_name || editor.getProfileName();
	
	var caret_pos = editor.getSelectionRange().end,
		abbr,
		content = '';
		
	if ( (abbr = findAbbreviation(editor)) ) {
		content = zen_coding.expandAbbreviation(abbr, syntax, profile_name);
		if (content) {
			editor.replaceContent(content, caret_pos - abbr.length, caret_pos);
			return true;
		}
	}
	
	return false;
}

/**
 * A special version of <code>expandAbbreviation</code> function: if it can't
 * find abbreviation, it will place Tab character at caret position
 * @param {zen_editor} editor Editor instance
 * @param {String} syntax Syntax type (html, css, etc.)
 * @param {String} profile_name Output profile name (html, xml, xhtml)
 */
function expandAbbreviationWithTab(editor, syntax, profile_name) {
	syntax = syntax || editor.getSyntax();
	profile_name = profile_name || editor.getProfileName();
	if (!expandAbbreviation(editor, syntax, profile_name))
		editor.replaceContent(zen_coding.getVariable('indentation'), editor.getCaretPos());
}

/**
 * Find and select HTML tag pair
 * @param {zen_editor} editor Editor instance
 * @param {String} [direction] Direction of pair matching: 'in' or 'out'. 
 * Default is 'out'
 */
function matchPair(editor, direction, syntax) {
	direction = (direction || 'out').toLowerCase();
	syntax = syntax || editor.getProfileName();
	
	var range = editor.getSelectionRange(),
		cursor = range.end,
		range_start = range.start, 
		range_end = range.end,
//		content = zen_coding.splitByLines(editor.getContent()).join('\n'),
		content = editor.getContent(),
		range = null,
		_r,
	
		old_open_tag = zen_coding.html_matcher.last_match['opening_tag'],
		old_close_tag = zen_coding.html_matcher.last_match['closing_tag'];
		
	if (direction == 'in' && old_open_tag && range_start != range_end) {
//		user has previously selected tag and wants to move inward
		if (!old_close_tag) {
//			unary tag was selected, can't move inward
			return false;
		} else if (old_open_tag.start == range_start) {
			if (content.charAt(old_open_tag.end) == '<') {
//				test if the first inward tag matches the entire parent tag's content
				_r = zen_coding.html_matcher.find(content, old_open_tag.end + 1, syntax);
				if (_r[0] == old_open_tag.end && _r[1] == old_close_tag.start) {
					range = zen_coding.html_matcher(content, old_open_tag.end + 1, syntax);
				} else {
					range = [old_open_tag.end, old_close_tag.start];
				}
			} else {
				range = [old_open_tag.end, old_close_tag.start];
			}
		} else {
			var new_cursor = content.substring(0, old_close_tag.start).indexOf('<', old_open_tag.end);
			var search_pos = new_cursor != -1 ? new_cursor + 1 : old_open_tag.end;
			range = zen_coding.html_matcher(content, search_pos, syntax);
		}
	} else {
		range = zen_coding.html_matcher(content, cursor, syntax);
	}
	
	if (range !== null && range[0] != -1) {
		editor.createSelection(range[0], range[1]);
		return true;
	} else {
		return false;
	}
}

/**
 * Narrow down text indexes, adjusting selection to non-space characters
 * @param {String} text
 * @param {Number} start
 * @param {Number} end
 * @return {Array}
 */
function narrowToNonSpace(text, start, end) {
	// narrow down selection until first non-space character
	var re_space = /\s|\n|\r/;
	function isSpace(ch) {
		return re_space.test(ch);
	}
	
	while (start < end) {
		if (!isSpace(text.charAt(start)))
			break;
			
		start++;
	}
	
	while (end > start) {
		end--;
		if (!isSpace(text.charAt(end))) {
			end++;
			break;
		}
	}
	
	return [start, end];
}

/**
 * Wraps content with abbreviation
 * @param {zen_editor} Editor instance
 * @param {String} abbr Abbreviation to wrap with
 * @param {String} [syntax] Syntax type (html, css, etc.)
 * @param {String} [profile_name] Output profile name (html, xml, xhtml)
 */
function wrapWithAbbreviation(editor, abbr, syntax, profile_name) {
	syntax = syntax || editor.getSyntax();
	profile_name = profile_name || editor.getProfileName();
	
	var range = editor.getSelectionRange(),
		start_offset = range.start,
		end_offset = range.end,
		content = editor.getContent();
		
		
	if (!abbr)
		return null; 
	
	if (start_offset == end_offset) {
		// no selection, find tag pair
		range = zen_coding.html_matcher(content, start_offset, profile_name);
		
		if (!range || range[0] == -1) // nothing to wrap
			return null;
		
		var narrowed_sel = narrowToNonSpace(content, range[0], range[1]);
		
		start_offset = narrowed_sel[0];
		end_offset = narrowed_sel[1];
	}
	
	var new_content = content.substring(start_offset, end_offset),
		result = zen_coding.wrapWithAbbreviation(abbr, unindent(editor, new_content), syntax, profile_name);
	
	if (result) {
		editor.setCaretPos(end_offset);
		editor.replaceContent(result, start_offset, end_offset);
	}
}

/**
 * Unindent content, thus preparing text for tag wrapping
 * @param {zen_editor} editor Editor instance
 * @param {String} text
 * @return {String}
 */
function unindent(editor, text) {
	return unindentText(text, getCurrentLinePadding(editor));
}

/**
 * Removes padding at the beginning of each text's line
 * @param {String} text
 * @param {String} pad
 */
function unindentText(text, pad) {
	var lines = zen_coding.splitByLines(text);
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].search(pad) == 0)
			lines[i] = lines[i].substr(pad.length);
	}
	
	return lines.join(zen_coding.getNewline());
}

/**
 * Returns padding of current editor's line
 * @param {zen_editor} Editor instance
 * @return {String}
 */
function getCurrentLinePadding(editor) {
	return getLinePadding(editor.getCurrentLine());
}

/**
 * Returns line padding
 * @param {String} line
 * @return {String}
 */
function getLinePadding(line) {
	return (line.match(/^(\s+)/) || [''])[0];
}

/**
 * Search for new caret insertion point
 * @param {zen_editor} editor Editor instance
 * @param {Number} inc Search increment: -1 — search left, 1 — search right
 * @param {Number} offset Initial offset relative to current caret position
 * @return {Number} Returns -1 if insertion point wasn't found
 */
function findNewEditPoint(editor, inc, offset) {
	inc = inc || 1;
	offset = offset || 0;
	var cur_point = editor.getCaretPos() + offset,
		content = editor.getContent(),
		max_len = content.length,
		next_point = -1,
		re_empty_line = /^\s+$/;
	
	function ch(ix) {
		return content.charAt(ix);
	}
	
	function getLine(ix) {
		var start = ix;
		while (start >= 0) {
			var c = ch(start);
			if (c == '\n' || c == '\r')
				break;
			start--;
		}
		
		return content.substring(start, ix);
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
			case '\n':
			case '\r':
				// empty line
				if (re_empty_line.test(getLine(cur_point - 1))) {
					next_point = cur_point;
				}
				break;
		}
		
		if (next_point != -1)
			break;
	}
	
	return next_point;
}

/**
 * Move caret to previous edit point
 * @param {zen_editor} editor Editor instance
 */
function prevEditPoint(editor) {
	var cur_pos = editor.getCaretPos(),
		new_point = findNewEditPoint(editor, -1);
		
	if (new_point == cur_pos)
		// we're still in the same point, try searching from the other place
		new_point = findNewEditPoint(editor, -1, -2);
	
	if (new_point != -1) 
		editor.setCaretPos(new_point);
}

/**
 * Move caret to next edit point
 * @param {zen_editor} editor Editor instance
 */
function nextEditPoint(editor) {
	var new_point = findNewEditPoint(editor, 1);
	if (new_point != -1)
		editor.setCaretPos(new_point);
}

/**
 * Inserts newline character with proper indentation
 * @param {zen_editor} editor Editor instance
 * @param {String} mode Syntax mode (only 'html' is implemented)
 */
function insertFormattedNewline(editor, mode) {
	mode = mode || 'html';
	var caret_pos = editor.getCaretPos(),
		nl = zen_coding.getNewline(),
		pad = zen_coding.getVariable('indentation');
		
	switch (mode) {
		case 'html':
			// let's see if we're breaking newly created tag
			var pair = zen_coding.html_matcher.getTags(editor.getContent(), editor.getCaretPos(), editor.getProfileName());
			
			if (pair[0] && pair[1] && pair[0].type == 'tag' && pair[0].end == caret_pos && pair[1].start == caret_pos) {
				editor.replaceContent(nl + pad + zen_coding.getCaretPlaceholder() + nl, caret_pos);
			} else {
				editor.replaceContent(nl, caret_pos);
			}
			break;
		default:
			editor.replaceContent(nl, caret_pos);
	}
}

/**
 * Select line under cursor
 * @param {zen_editor} editor Editor instance
 */
function selectLine(editor) {
	var range = editor.getCurrentLineRange();
	editor.createSelection(range.start, range.end);
}

/**
 * Moves caret to matching opening or closing tag
 * @param {zen_editor} editor
 */
function goToMatchingPair(editor) {
	var content = editor.getContent(),
		caret_pos = editor.getCaretPos();
	
	if (content.charAt(caret_pos) == '<') 
		// looks like caret is outside of tag pair  
		caret_pos++;
		
	var tags = zen_coding.html_matcher.getTags(content, caret_pos, editor.getProfileName());
		
	if (tags && tags[0]) {
		// match found
		var open_tag = tags[0],
			close_tag = tags[1];
			
		if (close_tag) { // exclude unary tags
			if (open_tag.start <= caret_pos && open_tag.end >= caret_pos)
				editor.setCaretPos(close_tag.start);
			else if (close_tag.start <= caret_pos && close_tag.end >= caret_pos)
				editor.setCaretPos(open_tag.start);
		}
	}
}

/**
 * Merge lines spanned by user selection. If there's no selection, tries to find
 * matching tags and use them as selection
 * @param {zen_editor} editor
 */
function mergeLines(editor) {
	var selection = editor.getSelectionRange();
	if (selection.start == selection.end) {
		// find matching tag
		var pair = zen_coding.html_matcher(editor.getContent(), editor.getCaretPos(), editor.getProfileName());
		if (pair) {
			selection.start = pair[0];
			selection.end = pair[1];
		}
	}
	
	if (selection.start != selection.end) {
		// got range, merge lines
		var text = editor.getContent().substring(selection.start, selection.end),
			old_length = text.length;
		var lines =  zen_coding.splitByLines(text);
		
		for (var i = 1; i < lines.length; i++) {
			lines[i] = lines[i].replace(/^\s+/, '');
		}
		
		text = lines.join('').replace(/\s{2,}/, ' ');
		editor.replaceContent(text, selection.start, selection.end);
		editor.createSelection(selection.start, selection.start + text.length);
	}
}

/**
 * Toggle comment on current editor's selection or HTML tag/CSS rule
 * @param {zen_editor} editor
 */
function toggleComment(editor) {
	switch (editor.getSyntax()) {
		case 'css':
			return toggleCSSComment(editor);
		default:
			return toggleHTMLComment(editor);
	}
}

/**
 * Toggle HTML comment on current selection or tag
 * @param {zen_editor} editor
 * @return {Boolean} Returns <code>true</code> if comment was toggled
 */
function toggleHTMLComment(editor) {
	var rng = editor.getSelectionRange(),
		content = editor.getContent();
		
	if (rng.start == rng.end) {
		// no selection, find matching tag
		var pair = zen_coding.html_matcher.getTags(content, editor.getCaretPos(), editor.getProfileName());
		if (pair && pair[0]) { // found pair
			rng.start = pair[0].start;
			rng.end = pair[1] ? pair[1].end : pair[0].end;
		}
	}
	
	return genericCommentToggle(editor, '<!--', '-->', rng.start, rng.end);
}

/**
 * Simple CSS commenting
 * @param {zen_editor} editor
 * @return {Boolean} Returns <code>true</code> if comment was toggled
 */
function toggleCSSComment(editor) {
	var rng = editor.getSelectionRange();
		
	if (rng.start == rng.end) {
		// no selection, get current line
		rng = editor.getCurrentLineRange();

		// adjust start index till first non-space character
		var _r = narrowToNonSpace(editor.getContent(), rng.start, rng.end);
		rng.start = _r[0];
		rng.end = _r[1];
	}
	
	return genericCommentToggle(editor, '/*', '*/', rng.start, rng.end);
}

/**
 * Search for nearest comment in <code>str</code>, starting from index <code>from</code>
 * @param {String} text Where to search
 * @param {Number} from Search start index
 * @param {String} start_token Comment start string
 * @param {String} end_token Comment end string
 * @return {Array|null} Returns null if comment wasn't found
 */
function searchComment(text, from, start_token, end_token) {
	var start_ch = start_token.charAt(0),
		end_ch = end_token.charAt(0),
		comment_start = -1,
		comment_end = -1;
	
	function hasMatch(str, start) {
		return text.substr(start, str.length) == str;
	}
		
	// search for comment start
	while (from--) {
		if (text.charAt(from) == start_ch && hasMatch(start_token, from)) {
			comment_start = from;
			break;
		}
	}
	
	if (comment_start != -1) {
		// search for comment end
		from = comment_start;
		var content_len = text.length;
		while (content_len >= from++) {
			if (text.charAt(from) == end_ch && hasMatch(end_token, from)) {
				comment_end = from + end_token.length;
				break;
			}
		}
	}
	
	return (comment_start != -1 && comment_end != -1) 
		? [comment_start, comment_end] 
		: null;
}

/**
 * Escape special regexp chars in string, making it usable for creating dynamic
 * regular expressions
 * @param {String} str
 * @return {String}
 */
function escapeForRegexp(str) {
  var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\
  return str.replace(specials, "\\$&");
}

/**
 * Generic comment toggling routine
 * @param {zen_editor} editor
 * @param {String} comment_start Comment start token
 * @param {String} comment_end Comment end token
 * @param {Number} range_start Start selection range
 * @param {Number} range_end End selection range
 * @return {Boolean}
 */
function genericCommentToggle(editor, comment_start, comment_end, range_start, range_end) {
	var content = editor.getContent(),
		caret_pos = editor.getCaretPos(),
		new_content = null;
		
	/**
	 * Remove comment markers from string
	 * @param {Sting} str
	 * @return {String}
	 */
	function removeComment(str) {
		return str
			.replace(new RegExp('^' + escapeForRegexp(comment_start) + '\\s*'), function(str){
				caret_pos -= str.length;
				return '';
			}).replace(new RegExp('\\s*' + escapeForRegexp(comment_end) + '$'), '');
	}
	
	function hasMatch(str, start) {
		return content.substr(start, str.length) == str;
	}
		
	// first, we need to make sure that this substring is not inside 
	// comment
	var comment_range = searchComment(content, caret_pos, comment_start, comment_end);
	
	if (comment_range && comment_range[0] <= range_start && comment_range[1] >= range_end) {
		// we're inside comment, remove it
		range_start = comment_range[0];
		range_end = comment_range[1];
		
		new_content = removeComment(content.substring(range_start, range_end));
	} else {
		// should add comment
		// make sure that there's no comment inside selection
		new_content = comment_start + ' ' + 
			content.substring(range_start, range_end)
				.replace(new RegExp(escapeForRegexp(comment_start) + '\\s*|\\s*' + escapeForRegexp(comment_end), 'g'), '') +
			' ' + comment_end;
			
		// adjust caret position
		caret_pos += comment_start.length + 1;
	}

	// replace editor content
	if (new_content !== null) {
		editor.setCaretPos(range_start);
		editor.replaceContent(unindent(editor, new_content), range_start, range_end);
		editor.setCaretPos(caret_pos);
		return true;
	}
	
	return false;
}

/**
 * Splits or joins tag, e.g. transforms it into a short notation and vice versa:<br>
 * &lt;div&gt;&lt;/div&gt; → &lt;div /&gt; : join<br>
 * &lt;div /&gt; → &lt;div&gt;&lt;/div&gt; : split
 * @param {zen_editor} editor Editor instance
 * @param {String} [profile_name] Profile name
 */
function splitJoinTag(editor, profile_name) {
	var caret_pos = editor.getCaretPos(),
		profile = zen_coding.getProfile(profile_name || editor.getProfileName()),
		caret = zen_coding.getCaretPlaceholder();

	// find tag at current position
	var pair = zen_coding.html_matcher.getTags(editor.getContent(), caret_pos, editor.getProfileName());
	if (pair && pair[0]) {
		var new_content = pair[0].full_tag;
		
		if (pair[1]) { // join tag
			var closing_slash = ' /';
			if (profile.self_closing_tag === true)
				closing_slash = '/';
				
			new_content = new_content.replace(/\s*>$/, closing_slash + '>');
			
			// add caret placeholder
			if (new_content.length + pair[0].start < caret_pos)
				new_content += caret;
			else {
				var d = caret_pos - pair[0].start;
				new_content = new_content.substring(0, d) + caret + new_content.substring(d);
			}
			
			editor.replaceContent(new_content, pair[0].start, pair[1].end);
		} else { // split tag
			var nl = zen_coding.getNewline(),
				pad = zen_coding.getVariable('indentation');
			
			// define tag content depending on profile
			var tag_content = (profile.tag_nl === true)
					? nl + pad +caret + nl
					: caret;
					
			new_content = new_content.replace(/\s*\/>$/, '>') + tag_content + '</' + pair[0].name + '>';
			editor.replaceContent(new_content, pair[0].start, pair[0].end);
		}
		
		return true;
	} else {
		return false;
	}
}

/**
 * Returns line bounds for specific character position
 * @param {String} text
 * @param {Number} from Where to start searching
 * @return {Object}
 */
function getLineBounds(text, from) {
	var len = text.length,
		start = 0,
		end = len - 1;
	
	// search left
	for (var i = from - 1; i > 0; i--) {
		var ch = text.charAt(i);
		if (ch == '\n' || ch == '\r') {
			start = i + 1;
			break;
		}
	}
	// search right
	for (var j = from; j < len; j++) {
		var ch = text.charAt(j);
		if (ch == '\n' || ch == '\r') {
			end = j;
			break;
		}
	}
	
	return {start: start, end: end};
}

/**
 * Gracefully removes tag under cursor
 * @param {zen_editor} editor
 */
function removeTag(editor) {
	var caret_pos = editor.getCaretPos(),
		content = editor.getContent();
		
	// search for tag
	var pair = zen_coding.html_matcher.getTags(content, caret_pos, editor.getProfileName());
	if (pair && pair[0]) {
		if (!pair[1]) {
			// simply remove unary tag
			editor.replaceContent(zen_coding.getCaretPlaceholder(), pair[0].start, pair[0].end);
		} else {
			var tag_content_range = narrowToNonSpace(content, pair[0].end, pair[1].start),
				start_line_bounds = getLineBounds(content, tag_content_range[0]),
				start_line_pad = getLinePadding(content.substring(start_line_bounds.start, start_line_bounds.end)),
				tag_content = content.substring(tag_content_range[0], tag_content_range[1]);
				
			tag_content = unindentText(tag_content, start_line_pad);
			editor.replaceContent(zen_coding.getCaretPlaceholder() + tag_content, pair[0].start, pair[1].end);
		}
		
		return true;
	} else {
		return false;
	}
}

// register all actions
zen_coding.registerAction('expand_abbreviation', expandAbbreviation);
zen_coding.registerAction('expand_abbreviation_with_tab', expandAbbreviationWithTab);
zen_coding.registerAction('match_pair', matchPair);
zen_coding.registerAction('match_pair_inward', function(editor){
	matchPair(editor, 'in');
});

zen_coding.registerAction('match_pair_outward', function(editor){
	matchPair(editor, 'out');
});
zen_coding.registerAction('wrap_with_abbreviation', wrapWithAbbreviation);
zen_coding.registerAction('prev_edit_point', prevEditPoint);
zen_coding.registerAction('next_edit_point', nextEditPoint);
zen_coding.registerAction('insert_formatted_line_break', insertFormattedNewline);
zen_coding.registerAction('select_line', selectLine);
zen_coding.registerAction('matching_pair', goToMatchingPair);
zen_coding.registerAction('merge_lines', mergeLines);
zen_coding.registerAction('toggle_comment', toggleComment);
zen_coding.registerAction('split_join_tag', splitJoinTag);
zen_coding.registerAction('remove_tag', removeTag);
/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */(function(){
	// Regular Expressions for parsing tags and attributes
	var start_tag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		end_tag = /^<\/([\w\:\-]+)[^>]*>/,
		attr = /([\w\-:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
		
	// Empty Elements - HTML 4.01
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

	// Block Elements - HTML 4.01
	var block = makeMap("address,applet,blockquote,button,center,dd,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

	// Inline Elements - HTML 4.01
	var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var close_self = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");
	
	/** Current matching mode */
	var cur_mode = 'xhtml';
	
	/** Last matched HTML pair */
	var last_match = {
		opening_tag: null, // tag() or comment() object
		closing_tag: null, // tag() or comment() object
		start_ix: -1,
		end_ix: -1
	};
	
	function setMode(new_mode) {
		if (!new_mode || new_mode != 'html')
			new_mode = 'xhtml';
			
		cur_mode = new_mode;
	}
	
	function tag(match, ix) {
		var name = match[1].toLowerCase();
		return  {
			name: name,
			full_tag: match[0],
			start: ix,
			end: ix + match[0].length,
			unary: Boolean(match[3]) || (name in empty && cur_mode == 'html'),
			has_close: Boolean(match[3]),
			type: 'tag',
			close_self: (name in close_self && cur_mode == 'html')
		};
	}
	
	function comment(start, end) {
		return {
			start: start,
			end: end,
			type: 'comment'
		};
	}
	
	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
	
	/**
	 * Makes selection ranges for matched tag pair
	 * @param {tag} opening_tag
	 * @param {tag} closing_tag
	 * @param {Number} ix
	 */
	function makeRange(opening_tag, closing_tag, ix) {
		ix = ix || 0;
		
		var start_ix = -1, 
			end_ix = -1;
		
		if (opening_tag && !closing_tag) { // unary element
			start_ix = opening_tag.start;
			end_ix = opening_tag.end;
		} else if (opening_tag && closing_tag) { // complete element
			if (
				(opening_tag.start < ix && opening_tag.end > ix) || 
				(closing_tag.start <= ix && closing_tag.end > ix)
			) {
				start_ix = opening_tag.start;
				end_ix = closing_tag.end;
			} else {
				start_ix = opening_tag.end;
				end_ix = closing_tag.start;
			}
		}
		
		return [start_ix, end_ix];
	}
	
	/**
	 * Save matched tag for later use and return found indexes
	 * @param {tag} opening_tag
	 * @param {tag} closing_tag
	 * @param {Number} ix
	 * @return {Array}
	 */
	function saveMatch(opening_tag, closing_tag, ix) {
		ix = ix || 0;
		last_match.opening_tag = opening_tag; 
		last_match.closing_tag = closing_tag;
		
		var range = makeRange(opening_tag, closing_tag, ix);
		last_match.start_ix = range[0];
		last_match.end_ix = range[1];
		
		return last_match.start_ix != -1 ? [last_match.start_ix, last_match.end_ix] : null;
	}
	
	/**
	 * Handle unary tag: find closing tag if needed
	 * @param {String} text
	 * @param {Number} ix
	 * @param {tag} open_tag
	 * @return {tag|null} Closing tag (or null if not found) 
	 */
	function handleUnaryTag(text, ix, open_tag) {
		if (open_tag.has_close)
			return null;
		else {
			// TODO finish this method
		}
	}
	
	/**
	 * Search for matching tags in <code>html</code>, starting from 
	 * <code>start_ix</code> position
	 * @param {String} html Code to search
	 * @param {Number} start_ix Character index where to start searching pair 
	 * (commonly, current caret position)
	 * @param {Function} action Function that creates selection range
	 * @return {Array|null}
	 */
	function findPair(html, start_ix, mode, action) {
		action = action || makeRange;
		setMode(mode);
		
		var forward_stack = [],
			backward_stack = [],
			/** @type {tag()} */
			opening_tag = null,
			/** @type {tag()} */
			closing_tag = null,
			range = null,
			html_len = html.length,
			m,
			ix,
			tmp_tag;
			
		forward_stack.last = backward_stack.last = function() {
			return this[this.length - 1];
		}
		
		function hasMatch(str, start) {
			if (arguments.length == 1)
				start = ix;
			return html.substr(start, str.length) == str;
		}
		
		function searchCommentStart(from) {
			while (from--) {
				if (html.charAt(from) == '<' && hasMatch('<!--', from))
					break;
			}
			
			return from;
		}
		
		// find opening tag
		ix = start_ix;
		while (ix-- && ix >= 0) {
			var ch = html.charAt(ix);
			if (ch == '<') {
				var check_str = html.substring(ix, html_len);
				
				if ( (m = check_str.match(end_tag)) ) { // found closing tag
					tmp_tag = tag(m, ix);
					if (tmp_tag.start < start_ix && tmp_tag.end > start_ix) // direct hit on searched closing tag
						closing_tag = tmp_tag;
					else
						backward_stack.push(tmp_tag);
				} else if ( (m = check_str.match(start_tag)) ) { // found opening tag
					tmp_tag = tag(m, ix);
					
					if (tmp_tag.unary) {
						if (tmp_tag.start < start_ix && tmp_tag.end > start_ix) // exact match
							// TODO handle unary tag 
							return action(tmp_tag, null, start_ix);
					} else if (backward_stack.last() && backward_stack.last().name == tmp_tag.name) {
						backward_stack.pop();
					} else { // found nearest unclosed tag
						opening_tag = tmp_tag;
						break;
					}
				} else if (check_str.indexOf('<!--') == 0) { // found comment start
					var end_ix = check_str.search('-->') + ix + 3;
					if (ix < start_ix && end_ix >= start_ix)
						return action( comment(ix, end_ix) );
				}
			} else if (ch == '-' && hasMatch('-->')) { // found comment end
				// search left until comment start is reached
				ix = searchCommentStart(ix);
			}
		}
		
		if (!opening_tag)
			return action(null);
		
		// find closing tag
		if (!closing_tag) {
			for (ix = start_ix; ix < html_len; ix++) {
				var ch = html.charAt(ix);
				if (ch == '<') {
					var check_str = html.substring(ix, html_len);
					
					if ( (m = check_str.match(start_tag)) ) { // found opening tag
						tmp_tag = tag(m, ix);
						if (!tmp_tag.unary)
							forward_stack.push( tmp_tag );
					} else if ( (m = check_str.match(end_tag)) ) { // found closing tag
						var tmp_tag = tag(m, ix);
						if (forward_stack.last() && forward_stack.last().name == tmp_tag.name)
							forward_stack.pop();
						else { // found matched closing tag
							closing_tag = tmp_tag;
							break;
						}
					} else if (hasMatch('<!--')) { // found comment
						ix += check_str.search('-->') + 3;
					}
				} else if (ch == '-' && hasMatch('-->')) {
					// looks like cursor was inside comment with invalid HTML
					if (!forward_stack.last() || forward_stack.last().type != 'comment') {
						var end_ix = ix + 3;
						return action(comment( searchCommentStart(ix), end_ix ));
					}
				}
			}
		}
		
		return action(opening_tag, closing_tag, start_ix);
	}
	
	/**
	 * Search for matching tags in <code>html</code>, starting 
	 * from <code>start_ix</code> position. The result is automatically saved in 
	 * <code>last_match</code> property
	 * 
	 * @return {Array|null}
	 */
	var HTMLPairMatcher = this.HTMLPairMatcher = function(/* String */ html, /* Number */ start_ix, /*  */ mode){
		return findPair(html, start_ix, mode, saveMatch);
	}
	
	HTMLPairMatcher.start_tag = start_tag;
	HTMLPairMatcher.end_tag = end_tag;
	
	/**
	 * Search for matching tags in <code>html</code>, starting from 
	 * <code>start_ix</code> position. The difference between 
	 * <code>HTMLPairMatcher</code> function itself is that <code>find</code> 
	 * method doesn't save matched result in <code>last_match</code> property.
	 * This method is generally used for lookups 
	 */
	HTMLPairMatcher.find = function(html, start_ix, mode) {
		return findPair(html, start_ix, mode);
	};
	
	/**
	 * Search for matching tags in <code>html</code>, starting from 
	 * <code>start_ix</code> position. The difference between 
	 * <code>HTMLPairMatcher</code> function itself is that <code>getTags</code> 
	 * method doesn't save matched result in <code>last_match</code> property 
	 * and returns array of opening and closing tags
	 * This method is generally used for lookups 
	 */
	HTMLPairMatcher.getTags = function(html, start_ix, mode) {
		return findPair(html, start_ix, mode, function(opening_tag, closing_tag){
			return [opening_tag, closing_tag];
		});
	};
	
	HTMLPairMatcher.last_match = last_match;
	
	try {
		zen_coding.html_matcher = HTMLPairMatcher;
	} catch(e){}
	
})();return zen_coding;	
})();/**
 * Zen Editor interface for EclipseMonkey  
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "../../javascript/zen_coding.js"
 */
var zen_editor = (function(){
	/** @type {editors.activeEditor} */
	var editor,
		is_filters_loaded = false;
	
	/**
	 * Returns whitrespace padding of string
	 * @param {String} str String line
	 * @return {String}
	 */
	function getStringPadding(str) {
		return (str.match(/^(\s+)/) || [''])[0];
	}
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	function getContent() {
		return editor.source;
	}
	
	/**
	 * Get the type of the partition based on the current offset
	 * @param {Number} offset
	 * @return {String}
	 */
	function getPartition(offset){
		var class_name = String(editor.textEditor.getClass()).toLowerCase();
		if (class_name.indexOf('xsleditor') != -1)
			return 'text/xsl';
		else if (class_name.indexOf('hamleditor') != -1)
			return 'text/haml';
		else if (class_name.indexOf('sasseditor') != -1)
			return 'text/css';
			
		try {
			var fileContext = editor.textEditor.getFileContext();
	
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
			'text/haml':  'haml',
			'text/xsl' :  'xsl'
		};
		
		return content_types[getPartition(editor.currentOffset)];
	}
	
	/**
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
	 * @return {FileContext}
	 */
	function getFileContext() {
		var result = null;
		
		try	{
			result = editor.textEditor.getFileContext();
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
	
	/**
	 * Dynamically load Zen Coding filters
	 */
	function loadFilters() {
		if (is_filters_loaded)
			return;
			
		var File = Packages.java.io.File;
		var f = new File(location);
		var filter_dir = new File(f.getParent(), 'filters')
		
		if (filter_dir.exists()) {
			var files = filter_dir.listFiles();
			for (var i = 0, il = files.length; i < il; i++) {
				var file = files[i];
				if (file.getName().toLowerCase().endsWith('.js'))
					include(file);
			}
			
			is_filters_loaded = true
		}
	}
	
	return {
		/**
		 * Depreacted name of <code>setContext</code> method
		 * @deprecated
		 * @alias zen_editor#setContext
		 * @param {Object} obj Context editor
		 */
		setTarget: function(obj) {
			this.setContext(obj);
		},
		
		/**
		 * Setup underlying editor context. You should call this method 
		 * <code>before</code> using any Zen Coding action.
		 * @param {editors.activeEditor} context
		 */
		setContext: function(context) {
			editor = context;
			zen_coding.setNewline(editor.lineDelimiter);
			loadFilters();
		},
		
		/**
		 * Returns character indexes of selected text: object with <code>start</code>
		 * and <code>end</code> properties
		 * @return {Object}
		 * @example
		 * var selection = zen_editor.getSelectionRange();
		 * alert(selection.start + ', ' + selection.end); 
		 */
		getSelectionRange: function() {
			return {
				start: editor.selectionRange.startingOffset,
				end: editor.selectionRange.endingOffset
			};
		},
		
		/**
		 * Creates selection from <code>start</code> to <code>end</code> character
		 * indexes. If <code>end</code> is ommited, this method should place caret 
		 * and <code>start</code> index
		 * @param {Number} start
		 * @param {Number} [end]
		 * @example
		 * zen_editor.createSelection(10, 40);
		 * 
		 * //move caret to 15th character
		 * zen_editor.createSelection(15);
		 */
		createSelection: function(start, end) {
			if (arguments.length == 1)
				end = start;
			
			editor.selectAndReveal(start, end - start);
		},
		
		/**
		 * Returns current line's start and end indexes and object with <code>start</code>
		 * and <code>end</code> properties
		 * @return {Object}
		 * @example
		 * var range = zen_editor.getCurrentLineRange();
		 * alert(range.start + ', ' + range.end);
		 */
		getCurrentLineRange: function() {
			var range = this.getSelectionRange(),
				cur_line_num = editor.getLineAtOffset(range.start);
			
			return {
				start: editor.getOffsetAtLine(cur_line_num), 
				end: editor.getOffsetAtLine(cur_line_num + 1) - zen_coding.getNewline().length
			};
		},
		
		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function(){
			return editor.currentOffset;
		},
		
		/**
		 * Set new caret position
		 */
		setCaretPos: function(pos){
			editor.currentOffset = pos;
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			var range = this.getCurrentLineRange();
			return this.getContent().substring(range.start, range.end);
		},
		
		/**
		 * Replace editor's content or it's part (from <code>start</code> to 
		 * <code>end</code> index). If <code>value</code> contains 
		 * <code>caret_placeholder</code>, the editor will put caret into 
		 * this position. If you skip <code>start</code> and <code>end</code>
		 * arguments, the whole target's content will be replaced with 
		 * <code>value</code>. 
		 * 
		 * If you pass <code>start</code> argument only,
		 * the <code>value</code> will be placed at <code>start</code> string 
		 * index of current content. 
		 * 
		 * If you pass <code>start</code> and <code>end</code> arguments,
		 * the corresponding substring of current target's content will be 
		 * replaced with <code>value</code>. 
		 * @param {String} value Content you want to paste
		 * @param {Number} [start] Start index of editor's content
		 * @param {Number} [end] End index of editor's content
		 */
		replaceContent: function(value, start, end) {
			var content = this.getContent(),
				caret_pos = this.getCaretPos(),
				has_start = typeof(start) !== 'undefined',
				has_end = typeof(end) !== 'undefined',
				caret_placeholder = zen_coding.getCaretPlaceholder();
				
			// indent new value
			value = zen_coding.padString(value, getStringPadding(this.getCurrentLine()));
			
			// find new caret position
			var new_pos = value.indexOf(caret_placeholder);
			if (new_pos != -1) {
				caret_pos = (start || 0) + new_pos;
				value = value.split(caret_placeholder).join('');
			} else {
				caret_pos = value.length + (start || 0);
			}
			
//			editor.beginCompoundChange();
			try {
				if (has_start && has_end) {
					editor.applyEdit(start, end - start, value);
				} else if (has_start) {
					editor.applyEdit(start, 0, value);
				} else {
					editor.applyEdit(0, content.length, value);
				}
				
				this.setCaretPos(caret_pos);
			} catch(e){}
//			editor.endCompoundChange();
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: getContent,
		
		/**
		 * Returns current editpr's syntax mode
		 * @return {String}
		 */
		getSyntax: function(){
			var syntax = getEditorType() || 'html';
			
			if (syntax == 'html') {
				// get the context tag
				var pair = zen_coding.html_matcher.getTags(this.getContent(), this.getCaretPos());
				if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
					// check that we're actually inside the tag
					if (pair[0].end <= caret_pos && pair[1].start >= caret_pos)
						syntax = 'css';
				}
			}
			
			return syntax;
		},
		
		/**
		 * Returns current output profile name (@see zen_coding#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			switch(getEditorType()) {
				 case 'xml':
				 case 'xsl':
				 	return 'xml';
				 case 'html':
				 	// html or xhtml?
				 	return this.getContent().search(/<!DOCTYPE[^>]+XHTML/) != -1 
				 		? 'xhtml'
				 		: 'html';
			}
			
			return 'xhtml';
		}
	};
})();