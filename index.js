const XLSX = require('xlsx')
const fs = require('fs')
const _ = require('lodash')
const filePath = process.env.API_FILE

console.log('API generator v0.0.1')

let dataStream = XLSX.readFile(filePath)
let worksheet = dataStream.Sheets[dataStream.SheetNames[0]]

worksheet['!ref'] = 'A4:H' + _.trimStart(worksheet['!ref'].split(':')[1], 'AMJ')

let data = XLSX.utils.sheet_to_json(worksheet, {
	header:['method','prefix','url','action','model','relation','routes','middlewares','description']
})

let routePath = __dirname + '/routes'
let controllerPath = __dirname + '/controllers'
let middlewarePath = __dirname + '/middlewares'

let routes = {}
let controllers = {}
let middlewares = {}

for(r in data) {
	let route = data[r]

    // Creating Middleware Files
	let _middlewares = route.middlewares.split(',')
	for(let middleware in _middlewares) {
		let _middleware = _middlewares[middleware].split('.')
		let _middlewareName = _middleware[0]
		let _actionName = _middleware[1]

		if (_.isArray(middlewares[_middlewareName])) {
			middlewares[_middlewareName] = _.xor(middlewares[_middlewareName], [_actionName])
		} else {
			middlewares[_middlewareName] = []
		}
	}

    // Creating Controller Files
	let action = route.action.split('.')
	let _controllerName = action[0]
	let _actionName = action[1]

	if (_.isArray(controllers[_controllerName])) {
		controllers[_controllerName] = _.concat(controllers[_controllerName], _actionName)
	} else {
		controllers[_controllerName] = []
	}

    // Creating Route Files
	if (_.isArray(routes[route.routes])) {
		routes[route.routes] = _.concat(routes[route.routes], _.pick(route, ['method','prefix','url','action','middlewares']))
	} else {
		routes[route.routes] = []
	}
}

console.log('1. Creating route files.....\n')
for(route in routes) {
	fs.writeFile(routePath + '/' + route, JSON.stringify(routes[route], null, '\t'), err => {
		if(err) throw err
		console.log('+ ' + route + ' created');
	})
}

console.log('2. Creating Controller Files.....')
for(let controller in controllers) {
	let controllerFileName = controllerPath + '/' + controller + '.js'
	const controllerName = controller

	fs.writeFile(controllerFileName, 'class ' + controllerName + ' {\n', e => {
		if(e) throw e
		console.log('"' + controllerName + '" created');

		let actions = controllers[controllerName]
		for(act in actions) {
			let action = actions[act]

			fs.appendFileSync(controllerFileName, '\tstatic async ' + action + '(req, res) {}\n')
			console.log('++ Action "' + action + '" of Class ' + controllerName + ' created');
		}
		fs.appendFileSync(controllerFileName, '}\n\nmodule.exports = ' + controllerName)
		console.log('++ Export Module ' + controllerName + '\n');
	})
}

console.log('3. Creating Middleware Files.....')
for(let middleware in middlewares) {
	let middlewareFileName = middlewarePath + '/' + middleware + '.js'
	const middlewareName = middleware

	fs.writeFile(middlewareFileName, 'class ' + middlewareName + ' {\n', e => {
		if(e) throw e

		console.log('"' + middlewareName + '" Class created');

		let actions = middlewares[middlewareName]
		for(act in actions) {
			let action = actions[act]

			fs.appendFileSync(middlewareFileName, '\t static async ' + action + '(req, res, next) {}\n')
			console.log('++ Action "' + action + '" of Class ' + middlewareName + ' created');
		}
		fs.appendFileSync(middlewareFileName, '}\n\nmodule.exports = ' + middlewareName)
		console.log('++ Export Module ' + middlewareName + '\n');
	})
}
