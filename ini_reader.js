const fs = require('fs')
const { decode } = require('./ini.js')

exports.parse = parse

function parse(...files) {
	var content = ''
	for(var file of files) {
    if(!fs.existsSync(file)) {
      console.warn('[WARN] [ini.parse] "' + file + '" not exist')
      continue;
    }
		content += fs.readFileSync(file, 'utf-8') + '\n'
	}

	var iniConfig = decode(content);

	var getJsonValue = (keyStr) => {
		let result = iniConfig
		for(let key of keyStr.split('.')) {
			result = result[key]
			if(!result) {
				return null
			}
		}
		if(typeof result == 'object') {
			return null
		}
		return result
	};

	function setJsonValue(keyPath, value) {
		let result = iniConfig
		keys = keyPath.split('.')
		for(var i = 0; i < keys.length; i++) {
			if(i == keys.length - 1) {
				// last
				result[keys[i]] = value
			} else {
				result = result[keys[i]]
				if(!result) {
					result = {}
				}
			}
		}
	}

	function buildMarco(keyPath) {
		let value = getJsonValue(keyPath)
		if(!value) {
			return
		}
		groups = String(value).match(/\$\{.+?\}/g)
		if(!groups) {
			return value
		}

		for(let group of groups) {
			macroKey = group.substring(2, group.length - 1).replace(/\//g, '.')
			brotherKey = keyPath + '.' + macroKey
			lastIndexOfDot = keyPath.lastIndexOf('.')
			if(lastIndexOfDot != -1) {
				brotherKey = keyPath.substring(0, lastIndexOfDot) + '.' + macroKey
			}
			macroValue = buildMarco(brotherKey)
			if(!macroValue) {
				macroValue = buildMarco(macroKey)
				if(!macroValue) {
					continue
				}
			}
			value = value.replace(group, macroValue)
		}
		setJsonValue(keyPath, value)

		return value
	}

	var convertMacro = (json, keyPrefix) => {
		Object.keys(json).forEach(function(key, _, __) {
			var value = json[key]
			var fullKey = (keyPrefix ? keyPrefix + '.' : '') + key
			if(typeof value == 'object') {
				convertMacro(value, fullKey)
			} else {
				buildMarco(fullKey)
			}
		});
	};

	convertMacro(iniConfig)

	return new Ini(iniConfig);
}

function Ini(json) {
	this.json = json
}

Ini.prototype.get = function(keyPath) {
	keyPath = keyPath.replace(/\//g, '.')
	var result = this.json
	for(let key of keyPath.split('.')) {
		result = result[key]
		if(!result) {
			return 
		}
	}
	return result
}
