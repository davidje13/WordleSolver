'use strict';

function textnode(text) {
	return document.createTextNode(text);
};

function make(type, attrs = {}, children = []) {
	const o = document.createElement(type);
	for (const attr in attrs) {
		o.setAttribute(attr, attrs[attr]);
	}
	for (const child of children) {
		if (typeof child === 'string') {
			o.appendChild(textnode(child));
		} else {
			o.appendChild(child);
		}
	}
	return o;
};

function clearDOM(o) {
	while (o.lastChild) {
		o.removeChild(o.lastChild);
	}
}
