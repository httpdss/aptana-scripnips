/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @include "settings.js"
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */var zen_coding = (function(){
	
	var re_tag = /<\/?[\w:\-]+(?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*\s*(\/?)>$/;
	
	/**
	 * Проверяет, является ли символ допустимым в аббревиатуре
	 * @param {String} ch
	 * @return {Boolean}
	 */
	function isAllowedChar(ch) {
		var char_code = ch.charCodeAt(0),
			special_chars = '#.>+*:$-_!@';
		
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
		return editors.activeEditor.lineDelimiter;
	}
	
	/**
	 * Отбивает текст отступами
	 * @param {String} text Текст, который нужно отбить
	 * @param {String|Number} pad Количество отступов или сам отступ
	 * @return {String}
	 */
	function padString(text, pad) {
		var pad_str = '', result = '';
		if (typeof(pad) == 'number')
			for (var i = 0; i < pad; i++) 
				pad_str += zen_settings.indentation;
		else
			pad_str = pad;
		
		// бьем текст на строки и отбиваем все, кроме первой, строки
		var nl = getNewline(), 
			lines = text.split(new RegExp('\\r?\\n|' + nl));
			
		result += lines[0];
		for (var j = 1; j < lines.length; j++) 
			result += nl + pad_str + lines[j];
			
		return result;
	}
	
	/**
	 * Get the type of the partition based on the current offset	 * @param {Number} offset	 * @return {String}	 */	function getPartition(offset){		var class_name = String(editors.activeEditor.textEditor.getClass());		if (class_name == 'class org.eclipse.wst.xsl.ui.internal.editor.XSLEditor')			return 'text/xsl';					try {				var fileContext = editors.activeEditor.textEditor.getFileContext();				if (fileContext !== null && fileContext !== undefined) {				var partition = fileContext.getPartitionAtOffset(offset);				return String(partition.getType());			}		} catch(e) {					}			return null;	}
	
	/**
	 * Проверяет, является ли аббревиатура сниппетом
	 * @param {String} abbr
	 * @param {String} type
	 * @return {Boolean}
	 */
	function isShippet(abbr, type) {
		var res = zen_settings[type || 'html'];
		return res.snippets && zen_settings[type || 'html'].snippets[abbr] ? true : false;
	}
	
	/**
	 * Проверяет, закачивается ли строка полноценным тэгом. В основном 
	 * используется для проверки принадлежности символа '>' аббревиатуре 
	 * или тэгу
	 * @param {String} str
	 * @return {Boolean}
	 */
	function isEndsWithTag(str) {
		return re_tag.test(str);
	}
	
	/**
	 * Тэг
	 * @class
	 * @param {String} name Имя тэга
	 * @param {Number} count Сколько раз вывести тэг (по умолчанию: 1)
	 * @param {String} type Тип тэга (html, xml)
	 */
	function Tag(name, count, type) {
		name = name.toLowerCase();
		type = type || 'html';
		this.name = Tag.getRealName(name, type);
		this.count = count || 1;
		this.children = [];
		this.attributes = [];
		this._res = zen_settings[type];
		
		//добавляем атрибуты по умолчанию
		if ('default_attributes' in this._res) {
			var def_attrs = this._res.default_attributes[name];		if (def_attrs) {
			
			def_attrs = def_attrs instanceof Array ? def_attrs : [def_attrs];
			for (var i = 0; i < def_attrs.length; i++) {
				var attrs = def_attrs[i];
				for (var attr_name in attrs) 
					this.addAttribute(attr_name, attrs[attr_name]);
			}
		}
	}
	}
	
	/**
	 * Возвращает настоящее имя тэга
	 * @param {String} name
	 * @return {String}
	 */
	Tag.getRealName = function(name, type) {
		var real_name = name,
			res = zen_settings[type || 'html'],
			aliases = res.aliases || res.short_names;
		
		if (aliases && aliases[name]) // аббревиатура: bq -> blockquote
			real_name = aliases[name];
		else if (name.indexOf(':') != -1) {
			// проверим, есть ли группирующий селектор
			var group_name = name.substring(0, name.indexOf(':')) + ':*';
			if (aliases[group_name])
				real_name = aliases[group_name];
		}
		
		return real_name;
	}
	
	Tag.prototype = {
		/**
		 * Добавляет нового потомка
		 * @param {Tag} tag
		 */
		addChild: function(tag) {
			this.children.push(tag);
		},
		
		/**
		 * Добавляет атрибут
		 * @param {String} name Название атрибута
		 * @param {String} value Значение атрибута
		 */
		addAttribute: function(name, value) {
			this.attributes.push({name: name, value: value});
		},
		
		/**
		 * Проверяет, является ли текущий элемент пустым
		 * @return {Boolean}
		 */
		isEmpty: function() {
			return ('empty_elements' in this._res) 
				? this._res.empty_elements[this.name] 
				: false;
		},
		
		/**
		 * Проверяет, является ли текущий элемент строчным
		 * @return {Boolean}
		 */
		isInline: function() {
			return ('inline_elements' in this._res) 
				? this._res.inline_elements[this.name] 
				: false;
		},
		
		/**
		 * Проверяет, является ли текущий элемент блочным
		 * @return {Boolean}
		 */
		isBlock: function() {
			return ('block_elements' in this._res) 
				? this._res.block_elements[this.name] 
				: true;
		},
		
		/**
		 * Проверяет, есть ли блочные потомки у текущего тэга. 
		 * Используется для форматирования
		 * @return {Boolean}
		 */
		hasBlockChildren: function() {
			for (var i = 0; i < this.children.length; i++) {
				if (this.children[i].isBlock())
					return true;
			}
			
			return false;
		},
		
		/**
		 * Преобразует тэг в строку. Если будет передан аргумент 
		 * <code>format</code> — вывод будет отформатирован согласно настройкам
		 * в <code>zen_settings</code>. Также в этом случае будет ставится 
		 * символ «|», означающий место вставки курсора. Курсор будет ставится
		 * в пустых атрибутах и элементах без потомков
		 * @param {Boolean} format Форматировать вывод
		 * @param {Boolean} indent Добавлять отступ
		 * @return {String}
		 */
		toString: function(format, indent) {
			var result = [], 
				attrs = '', 
				content = '', 
				start_tag = '', 
				end_tag = '',
				cursor = format ? '|' : '',
				a;

			indent = indent || false;
				
			// делаем строку атрибутов
			for (var i = 0; i < this.attributes.length; i++) {
				a = this.attributes[i];
				attrs += ' ' + a.name + '="' + (a.value || cursor) + '"';
			}
			
			// выводим потомков
			if (!this.isEmpty())
				for (var j = 0; j < this.children.length; j++) {
					content += this.children[j].toString(format, true);
					if (format && this.children[j].isBlock() && j != this.children.length - 1)
						content += getNewline();
				}
			
			if (this.name) {
				if (this.isEmpty()) {
					start_tag = '<' + this.name + attrs + ' />';
				} else {
					start_tag = '<' + this.name + attrs + '>';
					end_tag = '</' + this.name + '>';
				}
			}
			
			// форматируем вывод
			if (format) {
				if (this.name && this.hasBlockChildren()) {
					start_tag += getNewline() + zen_settings.indentation;
					end_tag = getNewline() + end_tag;
				}
				
				if (content)
					content = padString(content, indent ? 1 : 0);
				else
					start_tag += cursor;
					
			}
					
			// выводим тэг нужное количество раз
			for (var i = 0; i < this.count; i++) 
				result.push(start_tag.replace(/\$/g, i + 1) + content + end_tag);
			
			return result.join(format && this.isBlock() ? getNewline() : '');
		}
	};
	
	function Snippet(name, count, type) {
		/** @type {String} */
		this.name = name;
		this.count = count || 1;
		this.children = [];
		this._res = zen_settings[type || 'html'];
	}
	
	Snippet.prototype = {
		/**
		 * Добавляет нового потомка
		 * @param {Tag} tag
		 */
		addChild: function(tag) {
			this.children.push(tag);
		},
		
		addAttribute: function(){
		},
		
		isBlock: function() {
			return true; 
		},
		
		toString: function(format, indent) {
			indent = indent || false;
			
			var content = '', 
				result = [], 
				data = this._res.snippets[this.name],
				begin = '',
				end = '',
				child_padding = '',
				child_token = '${child}';
			
			if (data) {
				if (format) {
					var nl = getNewline();
					data = data.replace(/\n/g, nl);
					// нужно узнать, какой отступ должен быть у потомков
					var lines = data.split(nl);
					for (var j = 0; j < lines.length; j++) {
						if (lines[j].indexOf(child_token) != -1) {
							child_padding =  (m = lines[j].match(/(^\s+)/)) ? m[1] : '';
							break;
						}
					}
				}
				
				var parts = data.split(child_token);
				begin = parts[0] || '';
				end = parts[1] || '';
			}
			
			for (var i = 0; i < this.children.length; i++) {
				content += this.children[i].toString(format, true);
				if (format && this.children[i].isBlock() && i != this.children.length - 1)
					content += getNewline();
			}
			
			if (child_padding)
				content = padString(content, child_padding);
			
			
			// выводим тэг нужное количество раз
			for (var i = 0; i < this.count; i++) 
				result.push(begin.replace(/\$/g, i + 1) + content + end);
			
			return result.join(format ? getNewline() : '');
		}
	}
	
	return {
		/**
		 * Ищет аббревиатуру в текущем редакторе и возвращает ее
		 * @return {String|null}
		 */
		findAbbreviation: function() {
			/** Текущий редактор */
			var editor = editors.activeEditor;
			
			if (editor.selectionRange.startingOffset != editor.selectionRange.endingOffset) {
				// пользователь сам выделил нужную аббревиатуру
				return editor.source.substring(editor.selectionRange.startingOffset, editor.selectionRange.endingOffset);
			}
			
			// будем искать аббревиатуру с текущей позиции каретки
			var original_offset = editor.currentOffset,
				cur_line = editor.getLineAtOffset(original_offset),
				line_offset = editor.getOffsetAtLine(cur_line);
			
			return this.extractAbbreviation(editor.source.substring(line_offset, original_offset));
		},
		
		/**
		 * Извлекает аббревиатуру из строки
		 * @param {String} str
		 * @return {String} Аббревиатура или пустая строка
		 */
		extractAbbreviation: function(str) {
			var cur_offset = str.length,
				start_index = -1;
			
			while (true) {
				cur_offset--;
				if (cur_offset < 0) {
					// дошли до начала строки
					start_index = 0;
					break;
				}
				
				var ch = str.charAt(cur_offset);
				
				if (!isAllowedChar(ch) || (ch == '>' && isEndsWithTag(str.substring(0, cur_offset + 1)))) {
					start_index = cur_offset + 1;
					break;
				}
			}
			
			if (start_index != -1) 
				// что-то нашли, возвращаем аббревиатуру
				return str.substring(start_index);
			else
				return '';
		},
		
		/**
		 * Преобразует аббревиатуру в дерево элементов
		 * @param {String} abbr Аббревиатура
		 * @param {String} type Тип документа (xsl, html)
		 * @return {Tag}
		 */
		parseIntoTree: function(abbr, type) {
			type = type || 'html';
			var root = new Tag('', 1, type),
				parent = root,
				last = null,
				res = zen_settings[type],
				re = /([\+>])?([a-z][a-z0-9:\!\-]*)(#[\w\-\$]+)?((?:\.[\w\-\$]+)*)(?:\*(\d+))?/ig;
			
			if (!abbr)
				return null;
			
			// заменяем разворачиваемые элементы
			abbr = abbr.replace(/([a-z][a-z0-9]*)\+$/i, function(str, tag_name){
				if ('expandos' in res)
					return res.expandos[tag_name] || str;
				else
					return str;
			});
			
			abbr = abbr.replace(re, function(str, operator, tag_name, id, class_name, multiplier){
				multiplier = multiplier ? parseInt(multiplier) : 1;
				
				var current = isShippet(tag_name, type) ? new Snippet(tag_name, multiplier, type) : new Tag(tag_name, multiplier, type);
				if (id)
					current.addAttribute('id', id.substr(1));
				
				if (class_name) 
					current.addAttribute('class', class_name.substr(1).replace(/\./g, ' '));
				
				
				// двигаемся вглубь дерева
				if (operator == '>' && last)
					parent = last;
					
				parent.addChild(current);
				
				last = current;
				return '';
			});
			
			// если в abbr пустая строка — значит, вся аббревиатура без проблем 
			// была преобразована в дерево, если нет, то аббревиатура была не валидной
			return (!abbr) ? root : null;
		},
		
		/**
		 * Отбивает текст отступами
		 * @param {String} text Текст, который нужно отбить
		 * @param {String|Number} pad Количество отступов или сам отступ
		 * @return {String}
		 */
		padString: padString,
		getNewline: getNewline,
		
		/**
		 * Ищет новую точку вставки каретки		 * @param {Number} Инкремент поиска: -1 — ищем влево, 1 — ищем вправо		 * @param {Number} Начальное смещение относительно текущей позиции курсора		 * @return {Number} Вернет -1, если не была найдена новая позиция		 */		findNewEditPoint: function(inc, offset) {			inc = inc || 1;
			offset = offset || 0;			var editor = editors.activeEditor,				cur_point = editor.currentOffset + offset,				max_len = editor.sourceLength,				next_point = -1;						function ch(ix) {				return editor.source.charAt(ix);			}							while (cur_point < max_len && cur_point > 0) {				cur_point += inc;				var cur_char = ch(cur_point),					next_char = ch(cur_point + 1),					prev_char = ch(cur_point - 1);									switch (cur_char) {					case '"':					case '\'':						if (next_char == cur_char && prev_char == '=') {							// пустой атрибут							next_point = cur_point + 1;						}						break;					case '>':						if (next_char == '<') {							// между тэгами							next_point = cur_point + 1;						}						break;				}								if (next_point != -1)					break;			}						return next_point;		},
		
		/**
		 * Возвращает тип текущего редактора (css или html)		 * @return {String|null}		 */		getEditorType: function() {			var content_types = {				'text/html':  'html',				'text/xml' :  'html',				'text/css' :  'css',				'text/xsl' :  'xsl'			};						return content_types[getPartition(editors.activeEditor.currentOffset)];		},
		
		/**
		 * Возвращает отступ текущей строки у редактора
		 * @return {String}
		 */
		getCurrentLinePadding: function() {
			var editor = editors.activeEditor,
				cur_line_num = editor.getLineAtOffset(editor.selectionRange.startingOffset),
				end_offset = editor.getOffsetAtLine(cur_line_num + 1) + getNewline().length,
				cur_line = editor.source.substring(editor.getOffsetAtLine(cur_line_num), end_offset);			return (cur_line.match(/^(\s+)/) || [''])[0];		}
	}
	
})();