// helpful prototypes
[HTMLCollection.prototype, NodeList.prototype].forEach(protoType =>
{
	if (!protoType.filter) protoType.filter = Array.prototype.filter;
	if (!protoType.map) protoType.map = Array.prototype.map;
	if (!protoType.forEach) protoType.forEach = Array.prototype.forEach;
});


/**
 * Observer class
 */
class Observable extends EventTarget
{
	#value;
	constructor(value = "") {
		super();
		this.#value = value;
	}
	
	subscribe(event, handler)
	{
		this.addEventListener(event, handler);
	}
	
	unsubscribe(event, handler)
	{
		this.removeEventListener(event, handler);
	}
	
	notify (event, data = {})
	{
		this.dispatchEvent(new CustomEvent(event, {detail: data}));
	}
	
	get value()
	{
		return this.#value;
	}
	set value(newValue)
	{
		this.#value = newValue;
	}
}

class Binding
{
	#boundData = {};
	#observables = {
		bind: {},
		model: {},
		for: {},
		if: {}
	};
	
	/**
	 * Function to take a path string and will return the value or set the value if passed
	 * @param keys key string by dot notation, works with array notation
	 * @param object Object that the pathing is being worked on
	 * @param value OPTIONAL value to set the value of the keys path to
	 * @returns {unknown} for the sake of guard clauses, will return but no value is returned --
	 */
	#resolvePath = function(keys, object, value = null)
	{
		// get property value
		if (value === null)
		{
			return keys.split('.').reduce(function(prev, curr) {
				return prev ? prev = prev[curr] : undefined;
			}, object);
		}
		// set property value
		let way = keys.replace(/\[/g, '.').replace(/]/g, '').split('.'), last = way.pop();
		way.reduce(function (o, k, i, kk) {
			return o[k] = o[k] || (isFinite(i + 1 in kk ? kk[i + 1] : last) ? [] : {});
		}, object)[last] = value;
	}
	
	defaultBoundBehavior = (event) => {
		const prop = event.detail.prop;
		const value = this.#resolvePath(prop, this.#boundData);
		document.querySelectorAll(':not([role="template"])[jf-bind="'+prop+'"]').forEach(binding =>
		{
			['input','select'].includes(binding.tagName.toLowerCase()) ? binding.value = value : binding.tagName.toLowerCase() === 'textarea' ? binding.textContent = value : binding.innerHTML = value;
		});
	};
	
	defaultModelBehavior = (event) => {
		const prop = event.detail.prop;
		let binding = document.querySelector(':not([role="template"])[jf-model="'+prop+'"]');
		let observer = this.#observables.model[prop];
		observer.value = event.detail.value;
		// set value to input field
		['input','select'].includes(binding.tagName.toLowerCase()) ? binding.value = observer.value : binding.tagName.toLowerCase() === 'textarea' ? binding.textContent = observer.value : null;
		// update the property value with new value
		this.#resolvePath(prop, this.#boundData, observer.value);
		// update all bound values to the new value...
		this.#observables.bind[prop].notify('load', {value: this.#resolvePath(prop, this.#boundData), prop: prop});
	};
	
	defaultForBehavior = (event) => {
		let loopable = this.#resolvePath(event.detail.prop, this.#boundData);
		let target = document.querySelector('[jf-for="'+event.detail.prop+' as '+event.detail.varName+'"]');
		let template = target.querySelector('[role="template"]');
		for (this[event.detail.varName] of loopable)
		{
			let newElem;
			if (template !== null && template !== undefined)
			{
				// clone template.
				newElem = template.cloneNode(true);
				// remove template role from cloned
				newElem.removeAttribute('role');
			}
			else if (target.hasAttribute('jf-template'))
			{
				// create template from jf-template attribute
				let tempEle = document.createElement('div');
				// set the temp element inner html as the html string
				tempEle.innerHTML = target.getAttribute('jf-template');
				// extract the inner html to the newElem variable to use...
				newElem = tempEle.firstElementChild;
			}
			else
			{
				// throw major error - for loops must have a template, can be a html element with [role='template'] attribute or inline with the for method as a jf-template="HTMLString" attribute.
				return console.error('Missing template. For binding requires a dom element with roll=template attribute or on the for look element a jf-template with a html string.');
			}
			// do a light bind to local value
			// if the template bind is empty then will do a bind with the value, if a value is given then it will need to be fetched we will also need to check the template if bind is set
			//   for now Ill console log the object out.
			if (newElem.hasAttribute('jf-bind') && newElem.getAttribute('jf-bind') === "")
			{
				['input','select'].includes(newElem.tagName.toLowerCase())  ? newElem.value = this[event.detail.varName] : newElem.tagName.toLowerCase() === 'textarea' ? newElem.textContent = this[event.detail.varName] : newElem.innerHTML = this[event.detail.varName];
			}
			else if (newElem.childElementCount !== 0)
			{
				newElem.children.forEach(ele =>
				{
					if (ele.hasAttribute('jf-bind'))
					{
						let value = ele.getAttribute('jf-bind').length > 0 ? this.#resolvePath(ele.getAttribute('jf-bind'), this[event.detail.varName]) : this[event.detail.varName];
						['input','select'].includes(ele.tagName.toLowerCase())  ? ele.value = value : ele.tagName.toLowerCase() === 'textarea' ? ele.textContent = value : ele.innerHTML = value;
					}
				});
			}
			// push to document via target
			target.append(newElem);
		}
		// possibly remove template? only issue with that would be if we want to allow for expandability...
	};
	
	defaultIfBehavior = (event) => {}
	
	constructor(data = {}, handler = {for: null, bind: null, model: null, if: null})
	{
		this.#boundData = data;
		// set default handlers if defined
		if (handler.for instanceof Function)
		{
			this.defaultForBehavior = handler.for;
		}
		if (handler.bind instanceof Function)
		{
			this.defaultBoundBehavior= handler.bind;
		}
		if (handler.model instanceof Function)
		{
			this.defaultModelBehavior = handler.model;
		}
		if (handler.if instanceof Function)
		{
			this.defaultIfBehavior = handler.if;
		}
	}
	apply()
	{
		document.querySelectorAll(':not([role="template"])[jf-bind]').forEach((element) =>
		{
			let data = element.getAttribute('jf-bind');
			let objVal = this.#resolvePath(data, this.#boundData);
			let observer = new Observable(objVal);
			this.#observables.bind[data] = observer;
			observer.subscribe('load', this.defaultBoundBehavior);
			this.#observables.bind[data].notify('load', {value: objVal, prop: data});
		}, this);
		
		document.querySelectorAll(':not([role="template"])[jf-model]').forEach(binding =>
		{
			let data = binding.getAttribute('jf-model');
			let objVal = this.#resolvePath(data, this.#boundData);
			let observer = new Observable(objVal);
			this.#observables.model[data] = observer;
			observer.subscribe('load', this.defaultModelBehavior);
			observer.notify('load', {value: objVal, prop: data});
			observer.subscribe('input', this.defaultModelBehavior);
			observer.subscribe('change', this.defaultModelBehavior);
			binding.addEventListener('input', (event) => {observer.notify('input', {value: event.target.tagName.toLowerCase() !== 'textarea' ? event.target.value : event.target.textContent, prop: data })});
			binding.addEventListener('change', (event) => {observer.notify('change', {value: event.target.tagName.toLowerCase() !== 'textarea' ? event.target.value : event.target.textContent, prop: data })});
		}, this);
		
		document.querySelectorAll('[jf-for]').forEach(element =>
		{
			let data = element.getAttribute('jf-for').split(' as ');
			let observer = new Observable(this.#resolvePath(data[0], this.#boundData));
			this.#observables.for[data[0]] = observer;
			observer.subscribe('load', this.defaultForBehavior);
			observer.notify('load', {prop: data[0], varName: data[1]});
		}, this);
		
		document.querySelectorAll("[jf-if]").forEach(element =>
		{
			const actions = {};
			// deal with if statement
			let data = element.getAttribute('jf-if');
			let objVal = this.#resolvePath(data.split(' ')[0], this.#boundData);
			let observer = new Observable(objVal);
			observer.subscribe('load', this.defaultIfBehavior);
			observer.subscribe('change', this.defaultIfBehavior);
			observer.notify('load', {value: objVal, target: element, conditional: data});
			this.#observables.if[data.split(' ')[0]] = observer;
			//
			// want to get the 'if' logic basics down before I complicate
			///
			// // check if && or || are present
			// if (data.indexOf("&&") !== -1)
			// {
			//  	// split ands
			// }
			// if (data.indexOf("||") !== -1)
			// {
			// 	// split or
			// }
		});
	}
	update(what, fireEvent = false, event = 'notify', updateValue = false, newValue = null)
	{
		if(Object.keys(this.#observables.bind).includes(what))
		{}
		if(Object.keys(this.#observables.model).includes(what))
		{}
		if(Object.keys(this.#observables.for).includes(what))
		{}
		if(Object.keys(this.#observables.if).includes(what))
		{
			const observable = this.#observables.if[what];
			if (updateValue) observable.value = newValue;
			if (fireEvent)
			{
				// for now we will only look at the first... this will be expanded on.
				let ele = document.querySelectorAll('[jf-if^="'+what+'"]')[0];
				let cond = ele.getAttribute('jf-if');
				let objVal = this.#resolvePath(what, this.#boundData);
				observable.notify(event, {value: objVal, target: ele, cond: cond});
			}
		}
	}
	get data()
	{
		return this.#boundData;
	}
	get observables ()
	{
		return this.#observables;
	}
}

class Methods extends EventTarget
{
	#methodData;
	#events = {};
	#renderPropsToEvent = (methodName, triggered, props = []) =>
	{
		let compiledProp = {event: triggered};
		let argNames = this.#events[methodName].toString()
									.substring(this.#events[methodName].toString().indexOf('('),
										this.#events[methodName].toString().indexOf(')')
									)
									.replace('(','')
									.replace(' ','')
									.split(',')
									.map(str=>str.trim())
									.filter((item,index)=> index !== 0);
		argNames.forEach(item=> compiledProp[item] = null);
		for (let index = 0; index < props.length; index++)
		{
			let propStr = props[index].replace('this', 'triggered.target');
			try {
				compiledProp[argNames[index]] = eval(propStr);
			}
			catch (e)
			{
				compiledProp[argNames[index]] = propStr;
			}
		}
		return compiledProp;
	}
	constructor(methodObj = {})
	{
		super();
		this.#methodData = methodObj;
		// get action names like click, input, change...
		this.startRegistration();
	}
	
	startRegistration(reBind = false)
	{
		for (let methodAction of Object.keys(this.#methodData))
		{
			// now we have the methods that will be used... we need to iterate over the method keys or method name and triggers
			for (let methodName of Object.keys(this.#methodData[methodAction]))
			{
				if (reBind)
				{
					document.querySelectorAll('[jf-'+methodAction+'="'+methodName+'"]:not([jf-event="static"])').forEach(element => {
						element.addEventListener(methodAction, e => {
							let props = e.target.hasAttribute('jf-props') ? e.target.getAttribute('jf-props').split(',').map(item => item.trim()) : undefined;
							this.triggerEvent(methodAction, methodName, e, props);
						});
					});
					continue;
				}
				this.registerEvent(methodAction, methodName, this.#methodData[methodAction][methodName]);
				document.querySelectorAll('[jf-'+methodAction+'="'+methodName+'"]').forEach(element => {
					element.addEventListener(methodAction, e => {
						let props = e.target.hasAttribute('jf-props') ? e.target.getAttribute('jf-props').split(',').map(item => item.trim()) : undefined;
						this.triggerEvent(methodAction, methodName, e, props);
					});
				});
			}
		}
	}
	
	clearRegisteredEvents(reBind = false)
	{
		for (let methodAction of Object.keys(this.#methodData))
		{
			// now we have the methods that will be used... we need to iterate over the method keys or method name and triggers
			for (let methodName of Object.keys(this.#methodData[methodAction]))
			{
				if (reBind)
				{
					document.querySelectorAll('[jf-'+methodAction+'="'+methodName+'"]:not([jf-event="static"])').forEach(element => {
						element.addEventListener(methodAction, e => {
							let props = e.target.hasAttribute('jf-props') ? e.target.getAttribute('jf-props').split(',').map(item => item.trim()) : undefined;
							this.triggerEvent(methodAction, methodName, e, props);
						});
					});
					continue;
				}
				this.unregisterEvent(methodAction, methodName, this.#methodData[methodAction][methodName]);
				document.querySelectorAll('[jf-'+methodAction+'="'+methodName+'"]').forEach(element => {
					element.addEventListener(methodAction, e => {
						let props = e.target.hasAttribute('jf-props') ? e.target.getAttribute('jf-props').split(',').map(item => item.trim()) : undefined;
						this.triggerEvent(methodAction, methodName, e, props);
					});
				});
			}
		}
	}
	
	registerEvent(action, cbName, callback)
	{
		this.addEventListener(`${action}.${cbName}`, callback);
		this.#events[`${action}.${cbName}`] = callback;
	}
	unregisterEvent(action, cbName, callback)
	{
		this.removeEventListener(action + "." + cbName, callback);
	}
	triggerEvent(action, callbackName, triggerEvent, props=[])
	{
		this.dispatchEvent(new CustomEvent(`${action}.${callbackName}`, {detail: this.#renderPropsToEvent(`${action}.${callbackName}`, triggerEvent, props)}));
	}
	
	get methods()
	{
		return this.#events;
	}
	get events()
	{
		return this.#events;
	}
}

class App
{
	#bind;
	#method;
	
	/**
	 * Initiate the bindable content, (bind, model) and eventually if and for...
	 * @param appObj Object, must have data object or will fail. eg: {..., data: {...}, methods: {}, ...}
	 */
	constructor(appObj = {data:{}, methods: {}, defaultHandlers: { for: null, bind: null, model: null, if:null }})
	{
		this.#bind = new Binding(appObj.data, appObj.defaultHandlers);
		this.#bind.apply();
		this.#method = new Methods(appObj.methods);
	}
	rebind()
	{
		console.log('here');
		document.querySelectorAll("[jf-for], [jf-for][jf-template]").forEach(ch => {
			if (ch.querySelector('[role="template"]') !== null)
			{
				ch.querySelectorAll('[role="template"] ~ *').forEach(e=>e.remove());
			}
			else
			{
				ch.innerHTML = ''; // OMG that was so annoying!
			}
		});
		// remove non-static event listeners
		this.#method.clearRegisteredEvents(true);
		this.#bind.apply();
		// when rebinding only reapply event listeners to non-static event objects
		this.#method.startRegistration(true);
	}
	
	/**
	 * Giving access to request updates... Currently, works only with single condition ifs observables.
	 * @param what dataObject (should be the left most condition. eg. app.data.showMe = false; &lt;p jf-if="showMe == true"&gt;...text or html...&lt;/p&gt;
	 * @param {boolean=false} fireEvent fire an event
	 * @param {string='notify'} event event string eg. 'load', 'input' & 'change' ... etc.
	 * @param {boolean=false} updateValue update observable value use caution here!
	 * @param {*=null} newValue value to update.
	 */
	update(what, fireEvent = false, event = 'notify', updateValue = false, newValue = null)
	{
		this.#bind.update(what, fireEvent, event, updateValue, newValue);
	}
	
	get methods()
	{
		return this.#method.methods;
	}
	get data ()
	{
		return this.#bind.data;
	}
	get observables ()
	{
		return this.#bind.observables;
	}
}