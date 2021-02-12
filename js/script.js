/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.3
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var css = getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? html['offset' + axis] + computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')] + computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')] : 0);
}

function getWindowSizes() {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes() : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && parent.nodeName === 'HTML') {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  boundaries.left += padding;
  boundaries.top += padding;
  boundaries.right -= padding;
  boundaries.bottom -= padding;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var styles = getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroy the popper
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger onUpdate callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  // Avoid blurry text by using full pixel integers.
  // For pixel-perfect positioning, top/bottom prefers rounded
  // values, while left/right prefers floored values.
  var offsets = {
    left: Math.floor(popper.left),
    top: Math.round(popper.top),
    bottom: Math.round(popper.bottom),
    right: Math.floor(popper.right)
  };

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    top = -offsetParentRect.height + offsets.bottom;
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    left = -offsetParentRect.width + offsets.right;
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends({}, attributes, data.attributes);
  data.styles = _extends({}, styles, data.styles);
  data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjuction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-right` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unitless, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the height.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > More on this [reading this issue](https://github.com/FezVrasta/popper.js/issues/373)
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * An scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper this makes sure the popper has always a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier, can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near eachothers
   * without leaving any gap between the two. Expecially useful when the arrow is
   * enabled and you want to assure it to point to its reference element.
   * It cares only about the first axis, you can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjuction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations).
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position,
     * the popper will never be placed outside of the defined boundaries
     * (except if keepTogether is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define you own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the informations used by Popper.js
 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overriden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass as 3rd argument an object with the same
 * structure of this object, example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated, this callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Create a new Popper.js instance
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as popper.
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedule an update, it will run on the next UI update available
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

return Popper;

})));
//# sourceMappingURL=popper.js.map

/*!
  * Bootstrap v4.1.2 (https://getbootstrap.com/)
  * Copyright 2011-2018 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery'), require('popper.js')) :
  typeof define === 'function' && define.amd ? define(['exports', 'jquery', 'popper.js'], factory) :
  (factory((global.bootstrap = {}),global.jQuery,global.Popper));
}(this, (function (exports,$,Popper) { 'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;
  Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Util = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Private TransitionEnd Helpers
     * ------------------------------------------------------------------------
     */
    var TRANSITION_END = 'transitionend';
    var MAX_UID = 1000000;
    var MILLISECONDS_MULTIPLIER = 1000; // Shoutout AngusCroll (https://goo.gl/pxwQGp)

    function toType(obj) {
      return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    }

    function getSpecialTransitionEndEvent() {
      return {
        bindType: TRANSITION_END,
        delegateType: TRANSITION_END,
        handle: function handle(event) {
          if ($$$1(event.target).is(this)) {
            return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
          }

          return undefined; // eslint-disable-line no-undefined
        }
      };
    }

    function transitionEndEmulator(duration) {
      var _this = this;

      var called = false;
      $$$1(this).one(Util.TRANSITION_END, function () {
        called = true;
      });
      setTimeout(function () {
        if (!called) {
          Util.triggerTransitionEnd(_this);
        }
      }, duration);
      return this;
    }

    function setTransitionEndSupport() {
      $$$1.fn.emulateTransitionEnd = transitionEndEmulator;
      $$$1.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }
    /**
     * --------------------------------------------------------------------------
     * Public Util Api
     * --------------------------------------------------------------------------
     */


    var Util = {
      TRANSITION_END: 'bsTransitionEnd',
      getUID: function getUID(prefix) {
        do {
          // eslint-disable-next-line no-bitwise
          prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
        } while (document.getElementById(prefix));

        return prefix;
      },
      getSelectorFromElement: function getSelectorFromElement(element) {
        var selector = element.getAttribute('data-target');

        if (!selector || selector === '#') {
          selector = element.getAttribute('href') || '';
        }

        try {
          return document.querySelector(selector) ? selector : null;
        } catch (err) {
          return null;
        }
      },
      getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
        if (!element) {
          return 0;
        } // Get transition-duration of the element


        var transitionDuration = $$$1(element).css('transition-duration');
        var floatTransitionDuration = parseFloat(transitionDuration); // Return 0 if element or transition duration is not found

        if (!floatTransitionDuration) {
          return 0;
        } // If multiple durations are defined, take the first


        transitionDuration = transitionDuration.split(',')[0];
        return parseFloat(transitionDuration) * MILLISECONDS_MULTIPLIER;
      },
      reflow: function reflow(element) {
        return element.offsetHeight;
      },
      triggerTransitionEnd: function triggerTransitionEnd(element) {
        $$$1(element).trigger(TRANSITION_END);
      },
      // TODO: Remove in v5
      supportsTransitionEnd: function supportsTransitionEnd() {
        return Boolean(TRANSITION_END);
      },
      isElement: function isElement(obj) {
        return (obj[0] || obj).nodeType;
      },
      typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
        for (var property in configTypes) {
          if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
            var expectedTypes = configTypes[property];
            var value = config[property];
            var valueType = value && Util.isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
              throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
            }
          }
        }
      }
    };
    setTransitionEndSupport();
    return Util;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): alert.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Alert = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'alert';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.alert';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Selector = {
      DISMISS: '[data-dismiss="alert"]'
    };
    var Event = {
      CLOSE: "close" + EVENT_KEY,
      CLOSED: "closed" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      ALERT: 'alert',
      FADE: 'fade',
      SHOW: 'show'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Alert =
    /*#__PURE__*/
    function () {
      function Alert(element) {
        this._element = element;
      } // Getters


      var _proto = Alert.prototype;

      // Public
      _proto.close = function close(element) {
        var rootElement = this._element;

        if (element) {
          rootElement = this._getRootElement(element);
        }

        var customEvent = this._triggerCloseEvent(rootElement);

        if (customEvent.isDefaultPrevented()) {
          return;
        }

        this._removeElement(rootElement);
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._getRootElement = function _getRootElement(element) {
        var selector = Util.getSelectorFromElement(element);
        var parent = false;

        if (selector) {
          parent = document.querySelector(selector);
        }

        if (!parent) {
          parent = $$$1(element).closest("." + ClassName.ALERT)[0];
        }

        return parent;
      };

      _proto._triggerCloseEvent = function _triggerCloseEvent(element) {
        var closeEvent = $$$1.Event(Event.CLOSE);
        $$$1(element).trigger(closeEvent);
        return closeEvent;
      };

      _proto._removeElement = function _removeElement(element) {
        var _this = this;

        $$$1(element).removeClass(ClassName.SHOW);

        if (!$$$1(element).hasClass(ClassName.FADE)) {
          this._destroyElement(element);

          return;
        }

        var transitionDuration = Util.getTransitionDurationFromElement(element);
        $$$1(element).one(Util.TRANSITION_END, function (event) {
          return _this._destroyElement(element, event);
        }).emulateTransitionEnd(transitionDuration);
      };

      _proto._destroyElement = function _destroyElement(element) {
        $$$1(element).detach().trigger(Event.CLOSED).remove();
      }; // Static


      Alert._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $element = $$$1(this);
          var data = $element.data(DATA_KEY);

          if (!data) {
            data = new Alert(this);
            $element.data(DATA_KEY, data);
          }

          if (config === 'close') {
            data[config](this);
          }
        });
      };

      Alert._handleDismiss = function _handleDismiss(alertInstance) {
        return function (event) {
          if (event) {
            event.preventDefault();
          }

          alertInstance.close(this);
        };
      };

      _createClass(Alert, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Alert;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Alert._jQueryInterface;
    $$$1.fn[NAME].Constructor = Alert;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Alert._jQueryInterface;
    };

    return Alert;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): button.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Button = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'button';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.button';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      ACTIVE: 'active',
      BUTTON: 'btn',
      FOCUS: 'focus'
    };
    var Selector = {
      DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
      DATA_TOGGLE: '[data-toggle="buttons"]',
      INPUT: 'input',
      ACTIVE: '.active',
      BUTTON: '.btn'
    };
    var Event = {
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      FOCUS_BLUR_DATA_API: "focus" + EVENT_KEY + DATA_API_KEY + " " + ("blur" + EVENT_KEY + DATA_API_KEY)
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Button =
    /*#__PURE__*/
    function () {
      function Button(element) {
        this._element = element;
      } // Getters


      var _proto = Button.prototype;

      // Public
      _proto.toggle = function toggle() {
        var triggerChangeEvent = true;
        var addAriaPressed = true;
        var rootElement = $$$1(this._element).closest(Selector.DATA_TOGGLE)[0];

        if (rootElement) {
          var input = this._element.querySelector(Selector.INPUT);

          if (input) {
            if (input.type === 'radio') {
              if (input.checked && this._element.classList.contains(ClassName.ACTIVE)) {
                triggerChangeEvent = false;
              } else {
                var activeElement = rootElement.querySelector(Selector.ACTIVE);

                if (activeElement) {
                  $$$1(activeElement).removeClass(ClassName.ACTIVE);
                }
              }
            }

            if (triggerChangeEvent) {
              if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
                return;
              }

              input.checked = !this._element.classList.contains(ClassName.ACTIVE);
              $$$1(input).trigger('change');
            }

            input.focus();
            addAriaPressed = false;
          }
        }

        if (addAriaPressed) {
          this._element.setAttribute('aria-pressed', !this._element.classList.contains(ClassName.ACTIVE));
        }

        if (triggerChangeEvent) {
          $$$1(this._element).toggleClass(ClassName.ACTIVE);
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Static


      Button._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new Button(this);
            $$$1(this).data(DATA_KEY, data);
          }

          if (config === 'toggle') {
            data[config]();
          }
        });
      };

      _createClass(Button, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Button;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      event.preventDefault();
      var button = event.target;

      if (!$$$1(button).hasClass(ClassName.BUTTON)) {
        button = $$$1(button).closest(Selector.BUTTON);
      }

      Button._jQueryInterface.call($$$1(button), 'toggle');
    }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      var button = $$$1(event.target).closest(Selector.BUTTON)[0];
      $$$1(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Button._jQueryInterface;
    $$$1.fn[NAME].Constructor = Button;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Button._jQueryInterface;
    };

    return Button;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): carousel.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Carousel = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'carousel';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.carousel';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key

    var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

    var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

    var Default = {
      interval: 5000,
      keyboard: true,
      slide: false,
      pause: 'hover',
      wrap: true
    };
    var DefaultType = {
      interval: '(number|boolean)',
      keyboard: 'boolean',
      slide: '(boolean|string)',
      pause: '(string|boolean)',
      wrap: 'boolean'
    };
    var Direction = {
      NEXT: 'next',
      PREV: 'prev',
      LEFT: 'left',
      RIGHT: 'right'
    };
    var Event = {
      SLIDE: "slide" + EVENT_KEY,
      SLID: "slid" + EVENT_KEY,
      KEYDOWN: "keydown" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY,
      TOUCHEND: "touchend" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      CAROUSEL: 'carousel',
      ACTIVE: 'active',
      SLIDE: 'slide',
      RIGHT: 'carousel-item-right',
      LEFT: 'carousel-item-left',
      NEXT: 'carousel-item-next',
      PREV: 'carousel-item-prev',
      ITEM: 'carousel-item'
    };
    var Selector = {
      ACTIVE: '.active',
      ACTIVE_ITEM: '.active.carousel-item',
      ITEM: '.carousel-item',
      NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
      INDICATORS: '.carousel-indicators',
      DATA_SLIDE: '[data-slide], [data-slide-to]',
      DATA_RIDE: '[data-ride="carousel"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Carousel =
    /*#__PURE__*/
    function () {
      function Carousel(element, config) {
        this._items = null;
        this._interval = null;
        this._activeElement = null;
        this._isPaused = false;
        this._isSliding = false;
        this.touchTimeout = null;
        this._config = this._getConfig(config);
        this._element = $$$1(element)[0];
        this._indicatorsElement = this._element.querySelector(Selector.INDICATORS);

        this._addEventListeners();
      } // Getters


      var _proto = Carousel.prototype;

      // Public
      _proto.next = function next() {
        if (!this._isSliding) {
          this._slide(Direction.NEXT);
        }
      };

      _proto.nextWhenVisible = function nextWhenVisible() {
        // Don't call next when the page isn't visible
        // or the carousel or its parent isn't visible
        if (!document.hidden && $$$1(this._element).is(':visible') && $$$1(this._element).css('visibility') !== 'hidden') {
          this.next();
        }
      };

      _proto.prev = function prev() {
        if (!this._isSliding) {
          this._slide(Direction.PREV);
        }
      };

      _proto.pause = function pause(event) {
        if (!event) {
          this._isPaused = true;
        }

        if (this._element.querySelector(Selector.NEXT_PREV)) {
          Util.triggerTransitionEnd(this._element);
          this.cycle(true);
        }

        clearInterval(this._interval);
        this._interval = null;
      };

      _proto.cycle = function cycle(event) {
        if (!event) {
          this._isPaused = false;
        }

        if (this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }

        if (this._config.interval && !this._isPaused) {
          this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
        }
      };

      _proto.to = function to(index) {
        var _this = this;

        this._activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);

        var activeIndex = this._getItemIndex(this._activeElement);

        if (index > this._items.length - 1 || index < 0) {
          return;
        }

        if (this._isSliding) {
          $$$1(this._element).one(Event.SLID, function () {
            return _this.to(index);
          });
          return;
        }

        if (activeIndex === index) {
          this.pause();
          this.cycle();
          return;
        }

        var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

        this._slide(direction, this._items[index]);
      };

      _proto.dispose = function dispose() {
        $$$1(this._element).off(EVENT_KEY);
        $$$1.removeData(this._element, DATA_KEY);
        this._items = null;
        this._config = null;
        this._element = null;
        this._interval = null;
        this._isPaused = null;
        this._isSliding = null;
        this._activeElement = null;
        this._indicatorsElement = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._addEventListeners = function _addEventListeners() {
        var _this2 = this;

        if (this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN, function (event) {
            return _this2._keydown(event);
          });
        }

        if (this._config.pause === 'hover') {
          $$$1(this._element).on(Event.MOUSEENTER, function (event) {
            return _this2.pause(event);
          }).on(Event.MOUSELEAVE, function (event) {
            return _this2.cycle(event);
          });

          if ('ontouchstart' in document.documentElement) {
            // If it's a touch-enabled device, mouseenter/leave are fired as
            // part of the mouse compatibility events on first tap - the carousel
            // would stop cycling until user tapped out of it;
            // here, we listen for touchend, explicitly pause the carousel
            // (as if it's the second time we tap on it, mouseenter compat event
            // is NOT fired) and after a timeout (to allow for mouse compatibility
            // events to fire) we explicitly restart cycling
            $$$1(this._element).on(Event.TOUCHEND, function () {
              _this2.pause();

              if (_this2.touchTimeout) {
                clearTimeout(_this2.touchTimeout);
              }

              _this2.touchTimeout = setTimeout(function (event) {
                return _this2.cycle(event);
              }, TOUCHEVENT_COMPAT_WAIT + _this2._config.interval);
            });
          }
        }
      };

      _proto._keydown = function _keydown(event) {
        if (/input|textarea/i.test(event.target.tagName)) {
          return;
        }

        switch (event.which) {
          case ARROW_LEFT_KEYCODE:
            event.preventDefault();
            this.prev();
            break;

          case ARROW_RIGHT_KEYCODE:
            event.preventDefault();
            this.next();
            break;

          default:
        }
      };

      _proto._getItemIndex = function _getItemIndex(element) {
        this._items = element && element.parentNode ? [].slice.call(element.parentNode.querySelectorAll(Selector.ITEM)) : [];
        return this._items.indexOf(element);
      };

      _proto._getItemByDirection = function _getItemByDirection(direction, activeElement) {
        var isNextDirection = direction === Direction.NEXT;
        var isPrevDirection = direction === Direction.PREV;

        var activeIndex = this._getItemIndex(activeElement);

        var lastItemIndex = this._items.length - 1;
        var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

        if (isGoingToWrap && !this._config.wrap) {
          return activeElement;
        }

        var delta = direction === Direction.PREV ? -1 : 1;
        var itemIndex = (activeIndex + delta) % this._items.length;
        return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
      };

      _proto._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
        var targetIndex = this._getItemIndex(relatedTarget);

        var fromIndex = this._getItemIndex(this._element.querySelector(Selector.ACTIVE_ITEM));

        var slideEvent = $$$1.Event(Event.SLIDE, {
          relatedTarget: relatedTarget,
          direction: eventDirectionName,
          from: fromIndex,
          to: targetIndex
        });
        $$$1(this._element).trigger(slideEvent);
        return slideEvent;
      };

      _proto._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
        if (this._indicatorsElement) {
          var indicators = [].slice.call(this._indicatorsElement.querySelectorAll(Selector.ACTIVE));
          $$$1(indicators).removeClass(ClassName.ACTIVE);

          var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

          if (nextIndicator) {
            $$$1(nextIndicator).addClass(ClassName.ACTIVE);
          }
        }
      };

      _proto._slide = function _slide(direction, element) {
        var _this3 = this;

        var activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);

        var activeElementIndex = this._getItemIndex(activeElement);

        var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

        var nextElementIndex = this._getItemIndex(nextElement);

        var isCycling = Boolean(this._interval);
        var directionalClassName;
        var orderClassName;
        var eventDirectionName;

        if (direction === Direction.NEXT) {
          directionalClassName = ClassName.LEFT;
          orderClassName = ClassName.NEXT;
          eventDirectionName = Direction.LEFT;
        } else {
          directionalClassName = ClassName.RIGHT;
          orderClassName = ClassName.PREV;
          eventDirectionName = Direction.RIGHT;
        }

        if (nextElement && $$$1(nextElement).hasClass(ClassName.ACTIVE)) {
          this._isSliding = false;
          return;
        }

        var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);

        if (slideEvent.isDefaultPrevented()) {
          return;
        }

        if (!activeElement || !nextElement) {
          // Some weirdness is happening, so we bail
          return;
        }

        this._isSliding = true;

        if (isCycling) {
          this.pause();
        }

        this._setActiveIndicatorElement(nextElement);

        var slidEvent = $$$1.Event(Event.SLID, {
          relatedTarget: nextElement,
          direction: eventDirectionName,
          from: activeElementIndex,
          to: nextElementIndex
        });

        if ($$$1(this._element).hasClass(ClassName.SLIDE)) {
          $$$1(nextElement).addClass(orderClassName);
          Util.reflow(nextElement);
          $$$1(activeElement).addClass(directionalClassName);
          $$$1(nextElement).addClass(directionalClassName);
          var transitionDuration = Util.getTransitionDurationFromElement(activeElement);
          $$$1(activeElement).one(Util.TRANSITION_END, function () {
            $$$1(nextElement).removeClass(directionalClassName + " " + orderClassName).addClass(ClassName.ACTIVE);
            $$$1(activeElement).removeClass(ClassName.ACTIVE + " " + orderClassName + " " + directionalClassName);
            _this3._isSliding = false;
            setTimeout(function () {
              return $$$1(_this3._element).trigger(slidEvent);
            }, 0);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          $$$1(activeElement).removeClass(ClassName.ACTIVE);
          $$$1(nextElement).addClass(ClassName.ACTIVE);
          this._isSliding = false;
          $$$1(this._element).trigger(slidEvent);
        }

        if (isCycling) {
          this.cycle();
        }
      }; // Static


      Carousel._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data());

          if (typeof config === 'object') {
            _config = _objectSpread({}, _config, config);
          }

          var action = typeof config === 'string' ? config : _config.slide;

          if (!data) {
            data = new Carousel(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'number') {
            data.to(config);
          } else if (typeof action === 'string') {
            if (typeof data[action] === 'undefined') {
              throw new TypeError("No method named \"" + action + "\"");
            }

            data[action]();
          } else if (_config.interval) {
            data.pause();
            data.cycle();
          }
        });
      };

      Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
        var selector = Util.getSelectorFromElement(this);

        if (!selector) {
          return;
        }

        var target = $$$1(selector)[0];

        if (!target || !$$$1(target).hasClass(ClassName.CAROUSEL)) {
          return;
        }

        var config = _objectSpread({}, $$$1(target).data(), $$$1(this).data());

        var slideIndex = this.getAttribute('data-slide-to');

        if (slideIndex) {
          config.interval = false;
        }

        Carousel._jQueryInterface.call($$$1(target), config);

        if (slideIndex) {
          $$$1(target).data(DATA_KEY).to(slideIndex);
        }

        event.preventDefault();
      };

      _createClass(Carousel, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Carousel;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);
    $$$1(window).on(Event.LOAD_DATA_API, function () {
      var carousels = [].slice.call(document.querySelectorAll(Selector.DATA_RIDE));

      for (var i = 0, len = carousels.length; i < len; i++) {
        var $carousel = $$$1(carousels[i]);

        Carousel._jQueryInterface.call($carousel, $carousel.data());
      }
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Carousel._jQueryInterface;
    $$$1.fn[NAME].Constructor = Carousel;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Carousel._jQueryInterface;
    };

    return Carousel;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): collapse.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Collapse = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'collapse';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.collapse';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      toggle: true,
      parent: ''
    };
    var DefaultType = {
      toggle: 'boolean',
      parent: '(string|element)'
    };
    var Event = {
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SHOW: 'show',
      COLLAPSE: 'collapse',
      COLLAPSING: 'collapsing',
      COLLAPSED: 'collapsed'
    };
    var Dimension = {
      WIDTH: 'width',
      HEIGHT: 'height'
    };
    var Selector = {
      ACTIVES: '.show, .collapsing',
      DATA_TOGGLE: '[data-toggle="collapse"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Collapse =
    /*#__PURE__*/
    function () {
      function Collapse(element, config) {
        this._isTransitioning = false;
        this._element = element;
        this._config = this._getConfig(config);
        this._triggerArray = $$$1.makeArray(document.querySelectorAll("[data-toggle=\"collapse\"][href=\"#" + element.id + "\"]," + ("[data-toggle=\"collapse\"][data-target=\"#" + element.id + "\"]")));
        var toggleList = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));

        for (var i = 0, len = toggleList.length; i < len; i++) {
          var elem = toggleList[i];
          var selector = Util.getSelectorFromElement(elem);
          var filterElement = [].slice.call(document.querySelectorAll(selector)).filter(function (foundElem) {
            return foundElem === element;
          });

          if (selector !== null && filterElement.length > 0) {
            this._selector = selector;

            this._triggerArray.push(elem);
          }
        }

        this._parent = this._config.parent ? this._getParent() : null;

        if (!this._config.parent) {
          this._addAriaAndCollapsedClass(this._element, this._triggerArray);
        }

        if (this._config.toggle) {
          this.toggle();
        }
      } // Getters


      var _proto = Collapse.prototype;

      // Public
      _proto.toggle = function toggle() {
        if ($$$1(this._element).hasClass(ClassName.SHOW)) {
          this.hide();
        } else {
          this.show();
        }
      };

      _proto.show = function show() {
        var _this = this;

        if (this._isTransitioning || $$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var actives;
        var activesData;

        if (this._parent) {
          actives = [].slice.call(this._parent.querySelectorAll(Selector.ACTIVES)).filter(function (elem) {
            return elem.getAttribute('data-parent') === _this._config.parent;
          });

          if (actives.length === 0) {
            actives = null;
          }
        }

        if (actives) {
          activesData = $$$1(actives).not(this._selector).data(DATA_KEY);

          if (activesData && activesData._isTransitioning) {
            return;
          }
        }

        var startEvent = $$$1.Event(Event.SHOW);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        if (actives) {
          Collapse._jQueryInterface.call($$$1(actives).not(this._selector), 'hide');

          if (!activesData) {
            $$$1(actives).data(DATA_KEY, null);
          }
        }

        var dimension = this._getDimension();

        $$$1(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);
        this._element.style[dimension] = 0;

        if (this._triggerArray.length) {
          $$$1(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
        }

        this.setTransitioning(true);

        var complete = function complete() {
          $$$1(_this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);
          _this._element.style[dimension] = '';

          _this.setTransitioning(false);

          $$$1(_this._element).trigger(Event.SHOWN);
        };

        var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
        var scrollSize = "scroll" + capitalizedDimension;
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        this._element.style[dimension] = this._element[scrollSize] + "px";
      };

      _proto.hide = function hide() {
        var _this2 = this;

        if (this._isTransitioning || !$$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var startEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        var dimension = this._getDimension();

        this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + "px";
        Util.reflow(this._element);
        $$$1(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);
        var triggerArrayLength = this._triggerArray.length;

        if (triggerArrayLength > 0) {
          for (var i = 0; i < triggerArrayLength; i++) {
            var trigger = this._triggerArray[i];
            var selector = Util.getSelectorFromElement(trigger);

            if (selector !== null) {
              var $elem = $$$1([].slice.call(document.querySelectorAll(selector)));

              if (!$elem.hasClass(ClassName.SHOW)) {
                $$$1(trigger).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
              }
            }
          }
        }

        this.setTransitioning(true);

        var complete = function complete() {
          _this2.setTransitioning(false);

          $$$1(_this2._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
        };

        this._element.style[dimension] = '';
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      };

      _proto.setTransitioning = function setTransitioning(isTransitioning) {
        this._isTransitioning = isTransitioning;
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._config = null;
        this._parent = null;
        this._element = null;
        this._triggerArray = null;
        this._isTransitioning = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        config.toggle = Boolean(config.toggle); // Coerce string values

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getDimension = function _getDimension() {
        var hasWidth = $$$1(this._element).hasClass(Dimension.WIDTH);
        return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
      };

      _proto._getParent = function _getParent() {
        var _this3 = this;

        var parent = null;

        if (Util.isElement(this._config.parent)) {
          parent = this._config.parent; // It's a jQuery object

          if (typeof this._config.parent.jquery !== 'undefined') {
            parent = this._config.parent[0];
          }
        } else {
          parent = document.querySelector(this._config.parent);
        }

        var selector = "[data-toggle=\"collapse\"][data-parent=\"" + this._config.parent + "\"]";
        var children = [].slice.call(parent.querySelectorAll(selector));
        $$$1(children).each(function (i, element) {
          _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
        });
        return parent;
      };

      _proto._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
        if (element) {
          var isOpen = $$$1(element).hasClass(ClassName.SHOW);

          if (triggerArray.length) {
            $$$1(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
          }
        }
      }; // Static


      Collapse._getTargetFromElement = function _getTargetFromElement(element) {
        var selector = Util.getSelectorFromElement(element);
        return selector ? document.querySelector(selector) : null;
      };

      Collapse._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          var _config = _objectSpread({}, Default, $this.data(), typeof config === 'object' && config ? config : {});

          if (!data && _config.toggle && /show|hide/.test(config)) {
            _config.toggle = false;
          }

          if (!data) {
            data = new Collapse(this, _config);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Collapse, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Collapse;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
      if (event.currentTarget.tagName === 'A') {
        event.preventDefault();
      }

      var $trigger = $$$1(this);
      var selector = Util.getSelectorFromElement(this);
      var selectors = [].slice.call(document.querySelectorAll(selector));
      $$$1(selectors).each(function () {
        var $target = $$$1(this);
        var data = $target.data(DATA_KEY);
        var config = data ? 'toggle' : $trigger.data();

        Collapse._jQueryInterface.call($target, config);
      });
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Collapse._jQueryInterface;
    $$$1.fn[NAME].Constructor = Collapse;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Collapse._jQueryInterface;
    };

    return Collapse;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): dropdown.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Dropdown = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'dropdown';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.dropdown';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key

    var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key

    var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key

    var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key

    var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

    var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + "|" + ARROW_DOWN_KEYCODE + "|" + ESCAPE_KEYCODE);
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      KEYDOWN_DATA_API: "keydown" + EVENT_KEY + DATA_API_KEY,
      KEYUP_DATA_API: "keyup" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DISABLED: 'disabled',
      SHOW: 'show',
      DROPUP: 'dropup',
      DROPRIGHT: 'dropright',
      DROPLEFT: 'dropleft',
      MENURIGHT: 'dropdown-menu-right',
      MENULEFT: 'dropdown-menu-left',
      POSITION_STATIC: 'position-static'
    };
    var Selector = {
      DATA_TOGGLE: '[data-toggle="dropdown"]',
      FORM_CHILD: '.dropdown form',
      MENU: '.dropdown-menu',
      NAVBAR_NAV: '.navbar-nav',
      VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
    };
    var AttachmentMap = {
      TOP: 'top-start',
      TOPEND: 'top-end',
      BOTTOM: 'bottom-start',
      BOTTOMEND: 'bottom-end',
      RIGHT: 'right-start',
      RIGHTEND: 'right-end',
      LEFT: 'left-start',
      LEFTEND: 'left-end'
    };
    var Default = {
      offset: 0,
      flip: true,
      boundary: 'scrollParent',
      reference: 'toggle',
      display: 'dynamic'
    };
    var DefaultType = {
      offset: '(number|string|function)',
      flip: 'boolean',
      boundary: '(string|element)',
      reference: '(string|element)',
      display: 'string'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Dropdown =
    /*#__PURE__*/
    function () {
      function Dropdown(element, config) {
        this._element = element;
        this._popper = null;
        this._config = this._getConfig(config);
        this._menu = this._getMenuElement();
        this._inNavbar = this._detectNavbar();

        this._addEventListeners();
      } // Getters


      var _proto = Dropdown.prototype;

      // Public
      _proto.toggle = function toggle() {
        if (this._element.disabled || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this._element);

        var isActive = $$$1(this._menu).hasClass(ClassName.SHOW);

        Dropdown._clearMenus();

        if (isActive) {
          return;
        }

        var relatedTarget = {
          relatedTarget: this._element
        };
        var showEvent = $$$1.Event(Event.SHOW, relatedTarget);
        $$$1(parent).trigger(showEvent);

        if (showEvent.isDefaultPrevented()) {
          return;
        } // Disable totally Popper.js for Dropdown in Navbar


        if (!this._inNavbar) {
          /**
           * Check for Popper dependency
           * Popper - https://popper.js.org
           */
          if (typeof Popper === 'undefined') {
            throw new TypeError('Bootstrap dropdown require Popper.js (https://popper.js.org)');
          }

          var referenceElement = this._element;

          if (this._config.reference === 'parent') {
            referenceElement = parent;
          } else if (Util.isElement(this._config.reference)) {
            referenceElement = this._config.reference; // Check if it's jQuery element

            if (typeof this._config.reference.jquery !== 'undefined') {
              referenceElement = this._config.reference[0];
            }
          } // If boundary is not `scrollParent`, then set position to `static`
          // to allow the menu to "escape" the scroll parent's boundaries
          // https://github.com/twbs/bootstrap/issues/24251


          if (this._config.boundary !== 'scrollParent') {
            $$$1(parent).addClass(ClassName.POSITION_STATIC);
          }

          this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
        } // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


        if ('ontouchstart' in document.documentElement && $$$1(parent).closest(Selector.NAVBAR_NAV).length === 0) {
          $$$1(document.body).children().on('mouseover', null, $$$1.noop);
        }

        this._element.focus();

        this._element.setAttribute('aria-expanded', true);

        $$$1(this._menu).toggleClass(ClassName.SHOW);
        $$$1(parent).toggleClass(ClassName.SHOW).trigger($$$1.Event(Event.SHOWN, relatedTarget));
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._element).off(EVENT_KEY);
        this._element = null;
        this._menu = null;

        if (this._popper !== null) {
          this._popper.destroy();

          this._popper = null;
        }
      };

      _proto.update = function update() {
        this._inNavbar = this._detectNavbar();

        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Private


      _proto._addEventListeners = function _addEventListeners() {
        var _this = this;

        $$$1(this._element).on(Event.CLICK, function (event) {
          event.preventDefault();
          event.stopPropagation();

          _this.toggle();
        });
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this._element).data(), config);
        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getMenuElement = function _getMenuElement() {
        if (!this._menu) {
          var parent = Dropdown._getParentFromElement(this._element);

          if (parent) {
            this._menu = parent.querySelector(Selector.MENU);
          }
        }

        return this._menu;
      };

      _proto._getPlacement = function _getPlacement() {
        var $parentDropdown = $$$1(this._element.parentNode);
        var placement = AttachmentMap.BOTTOM; // Handle dropup

        if ($parentDropdown.hasClass(ClassName.DROPUP)) {
          placement = AttachmentMap.TOP;

          if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
            placement = AttachmentMap.TOPEND;
          }
        } else if ($parentDropdown.hasClass(ClassName.DROPRIGHT)) {
          placement = AttachmentMap.RIGHT;
        } else if ($parentDropdown.hasClass(ClassName.DROPLEFT)) {
          placement = AttachmentMap.LEFT;
        } else if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
          placement = AttachmentMap.BOTTOMEND;
        }

        return placement;
      };

      _proto._detectNavbar = function _detectNavbar() {
        return $$$1(this._element).closest('.navbar').length > 0;
      };

      _proto._getPopperConfig = function _getPopperConfig() {
        var _this2 = this;

        var offsetConf = {};

        if (typeof this._config.offset === 'function') {
          offsetConf.fn = function (data) {
            data.offsets = _objectSpread({}, data.offsets, _this2._config.offset(data.offsets) || {});
            return data;
          };
        } else {
          offsetConf.offset = this._config.offset;
        }

        var popperConfig = {
          placement: this._getPlacement(),
          modifiers: {
            offset: offsetConf,
            flip: {
              enabled: this._config.flip
            },
            preventOverflow: {
              boundariesElement: this._config.boundary
            }
          } // Disable Popper.js if we have a static display

        };

        if (this._config.display === 'static') {
          popperConfig.modifiers.applyStyle = {
            enabled: false
          };
        }

        return popperConfig;
      }; // Static


      Dropdown._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data) {
            data = new Dropdown(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      Dropdown._clearMenus = function _clearMenus(event) {
        if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
          return;
        }

        var toggles = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));

        for (var i = 0, len = toggles.length; i < len; i++) {
          var parent = Dropdown._getParentFromElement(toggles[i]);

          var context = $$$1(toggles[i]).data(DATA_KEY);
          var relatedTarget = {
            relatedTarget: toggles[i]
          };

          if (event && event.type === 'click') {
            relatedTarget.clickEvent = event;
          }

          if (!context) {
            continue;
          }

          var dropdownMenu = context._menu;

          if (!$$$1(parent).hasClass(ClassName.SHOW)) {
            continue;
          }

          if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $$$1.contains(parent, event.target)) {
            continue;
          }

          var hideEvent = $$$1.Event(Event.HIDE, relatedTarget);
          $$$1(parent).trigger(hideEvent);

          if (hideEvent.isDefaultPrevented()) {
            continue;
          } // If this is a touch-enabled device we remove the extra
          // empty mouseover listeners we added for iOS support


          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().off('mouseover', null, $$$1.noop);
          }

          toggles[i].setAttribute('aria-expanded', 'false');
          $$$1(dropdownMenu).removeClass(ClassName.SHOW);
          $$$1(parent).removeClass(ClassName.SHOW).trigger($$$1.Event(Event.HIDDEN, relatedTarget));
        }
      };

      Dropdown._getParentFromElement = function _getParentFromElement(element) {
        var parent;
        var selector = Util.getSelectorFromElement(element);

        if (selector) {
          parent = document.querySelector(selector);
        }

        return parent || element.parentNode;
      }; // eslint-disable-next-line complexity


      Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
        // If not input/textarea:
        //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
        // If input/textarea:
        //  - If space key => not a dropdown command
        //  - If key is other than escape
        //    - If key is not up or down => not a dropdown command
        //    - If trigger inside the menu => not a dropdown command
        if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $$$1(event.target).closest(Selector.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (this.disabled || $$$1(this).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this);

        var isActive = $$$1(parent).hasClass(ClassName.SHOW);

        if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
          if (event.which === ESCAPE_KEYCODE) {
            var toggle = parent.querySelector(Selector.DATA_TOGGLE);
            $$$1(toggle).trigger('focus');
          }

          $$$1(this).trigger('click');
          return;
        }

        var items = [].slice.call(parent.querySelectorAll(Selector.VISIBLE_ITEMS));

        if (items.length === 0) {
          return;
        }

        var index = items.indexOf(event.target);

        if (event.which === ARROW_UP_KEYCODE && index > 0) {
          // Up
          index--;
        }

        if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
          // Down
          index++;
        }

        if (index < 0) {
          index = 0;
        }

        items[index].focus();
      };

      _createClass(Dropdown, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Dropdown;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler).on(Event.CLICK_DATA_API + " " + Event.KEYUP_DATA_API, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();
      event.stopPropagation();

      Dropdown._jQueryInterface.call($$$1(this), 'toggle');
    }).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, function (e) {
      e.stopPropagation();
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Dropdown._jQueryInterface;
    $$$1.fn[NAME].Constructor = Dropdown;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Dropdown._jQueryInterface;
    };

    return Dropdown;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): modal.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Modal = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'modal';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.modal';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var Default = {
      backdrop: true,
      keyboard: true,
      focus: true,
      show: true
    };
    var DefaultType = {
      backdrop: '(boolean|string)',
      keyboard: 'boolean',
      focus: 'boolean',
      show: 'boolean'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      RESIZE: "resize" + EVENT_KEY,
      CLICK_DISMISS: "click.dismiss" + EVENT_KEY,
      KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY,
      MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY,
      MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
      BACKDROP: 'modal-backdrop',
      OPEN: 'modal-open',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DIALOG: '.modal-dialog',
      DATA_TOGGLE: '[data-toggle="modal"]',
      DATA_DISMISS: '[data-dismiss="modal"]',
      FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
      STICKY_CONTENT: '.sticky-top'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Modal =
    /*#__PURE__*/
    function () {
      function Modal(element, config) {
        this._config = this._getConfig(config);
        this._element = element;
        this._dialog = element.querySelector(Selector.DIALOG);
        this._backdrop = null;
        this._isShown = false;
        this._isBodyOverflowing = false;
        this._ignoreBackdropClick = false;
        this._scrollbarWidth = 0;
      } // Getters


      var _proto = Modal.prototype;

      // Public
      _proto.toggle = function toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      };

      _proto.show = function show(relatedTarget) {
        var _this = this;

        if (this._isTransitioning || this._isShown) {
          return;
        }

        if ($$$1(this._element).hasClass(ClassName.FADE)) {
          this._isTransitioning = true;
        }

        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: relatedTarget
        });
        $$$1(this._element).trigger(showEvent);

        if (this._isShown || showEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = true;

        this._checkScrollbar();

        this._setScrollbar();

        this._adjustDialog();

        $$$1(document.body).addClass(ClassName.OPEN);

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
          return _this.hide(event);
        });
        $$$1(this._dialog).on(Event.MOUSEDOWN_DISMISS, function () {
          $$$1(_this._element).one(Event.MOUSEUP_DISMISS, function (event) {
            if ($$$1(event.target).is(_this._element)) {
              _this._ignoreBackdropClick = true;
            }
          });
        });

        this._showBackdrop(function () {
          return _this._showElement(relatedTarget);
        });
      };

      _proto.hide = function hide(event) {
        var _this2 = this;

        if (event) {
          event.preventDefault();
        }

        if (this._isTransitioning || !this._isShown) {
          return;
        }

        var hideEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(hideEvent);

        if (!this._isShown || hideEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = false;
        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (transition) {
          this._isTransitioning = true;
        }

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(document).off(Event.FOCUSIN);
        $$$1(this._element).removeClass(ClassName.SHOW);
        $$$1(this._element).off(Event.CLICK_DISMISS);
        $$$1(this._dialog).off(Event.MOUSEDOWN_DISMISS);

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._element).one(Util.TRANSITION_END, function (event) {
            return _this2._hideModal(event);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          this._hideModal();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(window, document, this._element, this._backdrop).off(EVENT_KEY);
        this._config = null;
        this._element = null;
        this._dialog = null;
        this._backdrop = null;
        this._isShown = null;
        this._isBodyOverflowing = null;
        this._ignoreBackdropClick = null;
        this._scrollbarWidth = null;
      };

      _proto.handleUpdate = function handleUpdate() {
        this._adjustDialog();
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._showElement = function _showElement(relatedTarget) {
        var _this3 = this;

        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
          // Don't move modal's DOM position
          document.body.appendChild(this._element);
        }

        this._element.style.display = 'block';

        this._element.removeAttribute('aria-hidden');

        this._element.scrollTop = 0;

        if (transition) {
          Util.reflow(this._element);
        }

        $$$1(this._element).addClass(ClassName.SHOW);

        if (this._config.focus) {
          this._enforceFocus();
        }

        var shownEvent = $$$1.Event(Event.SHOWN, {
          relatedTarget: relatedTarget
        });

        var transitionComplete = function transitionComplete() {
          if (_this3._config.focus) {
            _this3._element.focus();
          }

          _this3._isTransitioning = false;
          $$$1(_this3._element).trigger(shownEvent);
        };

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
        } else {
          transitionComplete();
        }
      };

      _proto._enforceFocus = function _enforceFocus() {
        var _this4 = this;

        $$$1(document).off(Event.FOCUSIN) // Guard against infinite focus loop
        .on(Event.FOCUSIN, function (event) {
          if (document !== event.target && _this4._element !== event.target && $$$1(_this4._element).has(event.target).length === 0) {
            _this4._element.focus();
          }
        });
      };

      _proto._setEscapeEvent = function _setEscapeEvent() {
        var _this5 = this;

        if (this._isShown && this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
            if (event.which === ESCAPE_KEYCODE) {
              event.preventDefault();

              _this5.hide();
            }
          });
        } else if (!this._isShown) {
          $$$1(this._element).off(Event.KEYDOWN_DISMISS);
        }
      };

      _proto._setResizeEvent = function _setResizeEvent() {
        var _this6 = this;

        if (this._isShown) {
          $$$1(window).on(Event.RESIZE, function (event) {
            return _this6.handleUpdate(event);
          });
        } else {
          $$$1(window).off(Event.RESIZE);
        }
      };

      _proto._hideModal = function _hideModal() {
        var _this7 = this;

        this._element.style.display = 'none';

        this._element.setAttribute('aria-hidden', true);

        this._isTransitioning = false;

        this._showBackdrop(function () {
          $$$1(document.body).removeClass(ClassName.OPEN);

          _this7._resetAdjustments();

          _this7._resetScrollbar();

          $$$1(_this7._element).trigger(Event.HIDDEN);
        });
      };

      _proto._removeBackdrop = function _removeBackdrop() {
        if (this._backdrop) {
          $$$1(this._backdrop).remove();
          this._backdrop = null;
        }
      };

      _proto._showBackdrop = function _showBackdrop(callback) {
        var _this8 = this;

        var animate = $$$1(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';

        if (this._isShown && this._config.backdrop) {
          this._backdrop = document.createElement('div');
          this._backdrop.className = ClassName.BACKDROP;

          if (animate) {
            this._backdrop.classList.add(animate);
          }

          $$$1(this._backdrop).appendTo(document.body);
          $$$1(this._element).on(Event.CLICK_DISMISS, function (event) {
            if (_this8._ignoreBackdropClick) {
              _this8._ignoreBackdropClick = false;
              return;
            }

            if (event.target !== event.currentTarget) {
              return;
            }

            if (_this8._config.backdrop === 'static') {
              _this8._element.focus();
            } else {
              _this8.hide();
            }
          });

          if (animate) {
            Util.reflow(this._backdrop);
          }

          $$$1(this._backdrop).addClass(ClassName.SHOW);

          if (!callback) {
            return;
          }

          if (!animate) {
            callback();
            return;
          }

          var backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
          $$$1(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
        } else if (!this._isShown && this._backdrop) {
          $$$1(this._backdrop).removeClass(ClassName.SHOW);

          var callbackRemove = function callbackRemove() {
            _this8._removeBackdrop();

            if (callback) {
              callback();
            }
          };

          if ($$$1(this._element).hasClass(ClassName.FADE)) {
            var _backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);

            $$$1(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(_backdropTransitionDuration);
          } else {
            callbackRemove();
          }
        } else if (callback) {
          callback();
        }
      }; // ----------------------------------------------------------------------
      // the following methods are used to handle overflowing modals
      // todo (fat): these should probably be refactored out of modal.js
      // ----------------------------------------------------------------------


      _proto._adjustDialog = function _adjustDialog() {
        var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

        if (!this._isBodyOverflowing && isModalOverflowing) {
          this._element.style.paddingLeft = this._scrollbarWidth + "px";
        }

        if (this._isBodyOverflowing && !isModalOverflowing) {
          this._element.style.paddingRight = this._scrollbarWidth + "px";
        }
      };

      _proto._resetAdjustments = function _resetAdjustments() {
        this._element.style.paddingLeft = '';
        this._element.style.paddingRight = '';
      };

      _proto._checkScrollbar = function _checkScrollbar() {
        var rect = document.body.getBoundingClientRect();
        this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
        this._scrollbarWidth = this._getScrollbarWidth();
      };

      _proto._setScrollbar = function _setScrollbar() {
        var _this9 = this;

        if (this._isBodyOverflowing) {
          // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
          //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
          var fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
          var stickyContent = [].slice.call(document.querySelectorAll(Selector.STICKY_CONTENT)); // Adjust fixed content padding

          $$$1(fixedContent).each(function (index, element) {
            var actualPadding = element.style.paddingRight;
            var calculatedPadding = $$$1(element).css('padding-right');
            $$$1(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + "px");
          }); // Adjust sticky content margin

          $$$1(stickyContent).each(function (index, element) {
            var actualMargin = element.style.marginRight;
            var calculatedMargin = $$$1(element).css('margin-right');
            $$$1(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) - _this9._scrollbarWidth + "px");
          }); // Adjust body padding

          var actualPadding = document.body.style.paddingRight;
          var calculatedPadding = $$$1(document.body).css('padding-right');
          $$$1(document.body).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + "px");
        }
      };

      _proto._resetScrollbar = function _resetScrollbar() {
        // Restore fixed content padding
        var fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
        $$$1(fixedContent).each(function (index, element) {
          var padding = $$$1(element).data('padding-right');
          $$$1(element).removeData('padding-right');
          element.style.paddingRight = padding ? padding : '';
        }); // Restore sticky content

        var elements = [].slice.call(document.querySelectorAll("" + Selector.STICKY_CONTENT));
        $$$1(elements).each(function (index, element) {
          var margin = $$$1(element).data('margin-right');

          if (typeof margin !== 'undefined') {
            $$$1(element).css('margin-right', margin).removeData('margin-right');
          }
        }); // Restore body padding

        var padding = $$$1(document.body).data('padding-right');
        $$$1(document.body).removeData('padding-right');
        document.body.style.paddingRight = padding ? padding : '';
      };

      _proto._getScrollbarWidth = function _getScrollbarWidth() {
        // thx d.walsh
        var scrollDiv = document.createElement('div');
        scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      }; // Static


      Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data(), typeof config === 'object' && config ? config : {});

          if (!data) {
            data = new Modal(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config](relatedTarget);
          } else if (_config.show) {
            data.show(relatedTarget);
          }
        });
      };

      _createClass(Modal, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Modal;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      var _this10 = this;

      var target;
      var selector = Util.getSelectorFromElement(this);

      if (selector) {
        target = document.querySelector(selector);
      }

      var config = $$$1(target).data(DATA_KEY) ? 'toggle' : _objectSpread({}, $$$1(target).data(), $$$1(this).data());

      if (this.tagName === 'A' || this.tagName === 'AREA') {
        event.preventDefault();
      }

      var $target = $$$1(target).one(Event.SHOW, function (showEvent) {
        if (showEvent.isDefaultPrevented()) {
          // Only register focus restorer if modal will actually get shown
          return;
        }

        $target.one(Event.HIDDEN, function () {
          if ($$$1(_this10).is(':visible')) {
            _this10.focus();
          }
        });
      });

      Modal._jQueryInterface.call($$$1(target), config, this);
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Modal._jQueryInterface;
    $$$1.fn[NAME].Constructor = Modal;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Modal._jQueryInterface;
    };

    return Modal;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): tooltip.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tooltip = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tooltip';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.tooltip';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-tooltip';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
    var DefaultType = {
      animation: 'boolean',
      template: 'string',
      title: '(string|element|function)',
      trigger: 'string',
      delay: '(number|object)',
      html: 'boolean',
      selector: '(string|boolean)',
      placement: '(string|function)',
      offset: '(number|string)',
      container: '(string|element|boolean)',
      fallbackPlacement: '(string|array)',
      boundary: '(string|element)'
    };
    var AttachmentMap = {
      AUTO: 'auto',
      TOP: 'top',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };
    var Default = {
      animation: true,
      template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
      trigger: 'hover focus',
      title: '',
      delay: 0,
      html: false,
      selector: false,
      placement: 'top',
      offset: 0,
      container: false,
      fallbackPlacement: 'flip',
      boundary: 'scrollParent'
    };
    var HoverState = {
      SHOW: 'show',
      OUT: 'out'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
    };
    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TOOLTIP: '.tooltip',
      TOOLTIP_INNER: '.tooltip-inner',
      ARROW: '.arrow'
    };
    var Trigger = {
      HOVER: 'hover',
      FOCUS: 'focus',
      CLICK: 'click',
      MANUAL: 'manual'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tooltip =
    /*#__PURE__*/
    function () {
      function Tooltip(element, config) {
        /**
         * Check for Popper dependency
         * Popper - https://popper.js.org
         */
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap tooltips require Popper.js (https://popper.js.org)');
        } // private


        this._isEnabled = true;
        this._timeout = 0;
        this._hoverState = '';
        this._activeTrigger = {};
        this._popper = null; // Protected

        this.element = element;
        this.config = this._getConfig(config);
        this.tip = null;

        this._setListeners();
      } // Getters


      var _proto = Tooltip.prototype;

      // Public
      _proto.enable = function enable() {
        this._isEnabled = true;
      };

      _proto.disable = function disable() {
        this._isEnabled = false;
      };

      _proto.toggleEnabled = function toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      };

      _proto.toggle = function toggle(event) {
        if (!this._isEnabled) {
          return;
        }

        if (event) {
          var dataKey = this.constructor.DATA_KEY;
          var context = $$$1(event.currentTarget).data(dataKey);

          if (!context) {
            context = new this.constructor(event.currentTarget, this._getDelegateConfig());
            $$$1(event.currentTarget).data(dataKey, context);
          }

          context._activeTrigger.click = !context._activeTrigger.click;

          if (context._isWithActiveTrigger()) {
            context._enter(null, context);
          } else {
            context._leave(null, context);
          }
        } else {
          if ($$$1(this.getTipElement()).hasClass(ClassName.SHOW)) {
            this._leave(null, this);

            return;
          }

          this._enter(null, this);
        }
      };

      _proto.dispose = function dispose() {
        clearTimeout(this._timeout);
        $$$1.removeData(this.element, this.constructor.DATA_KEY);
        $$$1(this.element).off(this.constructor.EVENT_KEY);
        $$$1(this.element).closest('.modal').off('hide.bs.modal');

        if (this.tip) {
          $$$1(this.tip).remove();
        }

        this._isEnabled = null;
        this._timeout = null;
        this._hoverState = null;
        this._activeTrigger = null;

        if (this._popper !== null) {
          this._popper.destroy();
        }

        this._popper = null;
        this.element = null;
        this.config = null;
        this.tip = null;
      };

      _proto.show = function show() {
        var _this = this;

        if ($$$1(this.element).css('display') === 'none') {
          throw new Error('Please use show on visible elements');
        }

        var showEvent = $$$1.Event(this.constructor.Event.SHOW);

        if (this.isWithContent() && this._isEnabled) {
          $$$1(this.element).trigger(showEvent);
          var isInTheDom = $$$1.contains(this.element.ownerDocument.documentElement, this.element);

          if (showEvent.isDefaultPrevented() || !isInTheDom) {
            return;
          }

          var tip = this.getTipElement();
          var tipId = Util.getUID(this.constructor.NAME);
          tip.setAttribute('id', tipId);
          this.element.setAttribute('aria-describedby', tipId);
          this.setContent();

          if (this.config.animation) {
            $$$1(tip).addClass(ClassName.FADE);
          }

          var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

          var attachment = this._getAttachment(placement);

          this.addAttachmentClass(attachment);
          var container = this.config.container === false ? document.body : $$$1(document).find(this.config.container);
          $$$1(tip).data(this.constructor.DATA_KEY, this);

          if (!$$$1.contains(this.element.ownerDocument.documentElement, this.tip)) {
            $$$1(tip).appendTo(container);
          }

          $$$1(this.element).trigger(this.constructor.Event.INSERTED);
          this._popper = new Popper(this.element, tip, {
            placement: attachment,
            modifiers: {
              offset: {
                offset: this.config.offset
              },
              flip: {
                behavior: this.config.fallbackPlacement
              },
              arrow: {
                element: Selector.ARROW
              },
              preventOverflow: {
                boundariesElement: this.config.boundary
              }
            },
            onCreate: function onCreate(data) {
              if (data.originalPlacement !== data.placement) {
                _this._handlePopperPlacementChange(data);
              }
            },
            onUpdate: function onUpdate(data) {
              _this._handlePopperPlacementChange(data);
            }
          });
          $$$1(tip).addClass(ClassName.SHOW); // If this is a touch-enabled device we add extra
          // empty mouseover listeners to the body's immediate children;
          // only needed because of broken event delegation on iOS
          // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().on('mouseover', null, $$$1.noop);
          }

          var complete = function complete() {
            if (_this.config.animation) {
              _this._fixTransition();
            }

            var prevHoverState = _this._hoverState;
            _this._hoverState = null;
            $$$1(_this.element).trigger(_this.constructor.Event.SHOWN);

            if (prevHoverState === HoverState.OUT) {
              _this._leave(null, _this);
            }
          };

          if ($$$1(this.tip).hasClass(ClassName.FADE)) {
            var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
            $$$1(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
          } else {
            complete();
          }
        }
      };

      _proto.hide = function hide(callback) {
        var _this2 = this;

        var tip = this.getTipElement();
        var hideEvent = $$$1.Event(this.constructor.Event.HIDE);

        var complete = function complete() {
          if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
            tip.parentNode.removeChild(tip);
          }

          _this2._cleanTipClass();

          _this2.element.removeAttribute('aria-describedby');

          $$$1(_this2.element).trigger(_this2.constructor.Event.HIDDEN);

          if (_this2._popper !== null) {
            _this2._popper.destroy();
          }

          if (callback) {
            callback();
          }
        };

        $$$1(this.element).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          return;
        }

        $$$1(tip).removeClass(ClassName.SHOW); // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support

        if ('ontouchstart' in document.documentElement) {
          $$$1(document.body).children().off('mouseover', null, $$$1.noop);
        }

        this._activeTrigger[Trigger.CLICK] = false;
        this._activeTrigger[Trigger.FOCUS] = false;
        this._activeTrigger[Trigger.HOVER] = false;

        if ($$$1(this.tip).hasClass(ClassName.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(tip);
          $$$1(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }

        this._hoverState = '';
      };

      _proto.update = function update() {
        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Protected


      _proto.isWithContent = function isWithContent() {
        return Boolean(this.getTitle());
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var tip = this.getTipElement();
        this.setElementContent($$$1(tip.querySelectorAll(Selector.TOOLTIP_INNER)), this.getTitle());
        $$$1(tip).removeClass(ClassName.FADE + " " + ClassName.SHOW);
      };

      _proto.setElementContent = function setElementContent($element, content) {
        var html = this.config.html;

        if (typeof content === 'object' && (content.nodeType || content.jquery)) {
          // Content is a DOM node or a jQuery
          if (html) {
            if (!$$$1(content).parent().is($element)) {
              $element.empty().append(content);
            }
          } else {
            $element.text($$$1(content).text());
          }
        } else {
          $element[html ? 'html' : 'text'](content);
        }
      };

      _proto.getTitle = function getTitle() {
        var title = this.element.getAttribute('data-original-title');

        if (!title) {
          title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
        }

        return title;
      }; // Private


      _proto._getAttachment = function _getAttachment(placement) {
        return AttachmentMap[placement.toUpperCase()];
      };

      _proto._setListeners = function _setListeners() {
        var _this3 = this;

        var triggers = this.config.trigger.split(' ');
        triggers.forEach(function (trigger) {
          if (trigger === 'click') {
            $$$1(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
              return _this3.toggle(event);
            });
          } else if (trigger !== Trigger.MANUAL) {
            var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
            var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;
            $$$1(_this3.element).on(eventIn, _this3.config.selector, function (event) {
              return _this3._enter(event);
            }).on(eventOut, _this3.config.selector, function (event) {
              return _this3._leave(event);
            });
          }

          $$$1(_this3.element).closest('.modal').on('hide.bs.modal', function () {
            return _this3.hide();
          });
        });

        if (this.config.selector) {
          this.config = _objectSpread({}, this.config, {
            trigger: 'manual',
            selector: ''
          });
        } else {
          this._fixTitle();
        }
      };

      _proto._fixTitle = function _fixTitle() {
        var titleType = typeof this.element.getAttribute('data-original-title');

        if (this.element.getAttribute('title') || titleType !== 'string') {
          this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
          this.element.setAttribute('title', '');
        }
      };

      _proto._enter = function _enter(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
        }

        if ($$$1(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
          context._hoverState = HoverState.SHOW;
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.SHOW;

        if (!context.config.delay || !context.config.delay.show) {
          context.show();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.SHOW) {
            context.show();
          }
        }, context.config.delay.show);
      };

      _proto._leave = function _leave(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
        }

        if (context._isWithActiveTrigger()) {
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.OUT;

        if (!context.config.delay || !context.config.delay.hide) {
          context.hide();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.OUT) {
            context.hide();
          }
        }, context.config.delay.hide);
      };

      _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
        for (var trigger in this._activeTrigger) {
          if (this._activeTrigger[trigger]) {
            return true;
          }
        }

        return false;
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this.element).data(), typeof config === 'object' && config ? config : {});

        if (typeof config.delay === 'number') {
          config.delay = {
            show: config.delay,
            hide: config.delay
          };
        }

        if (typeof config.title === 'number') {
          config.title = config.title.toString();
        }

        if (typeof config.content === 'number') {
          config.content = config.content.toString();
        }

        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getDelegateConfig = function _getDelegateConfig() {
        var config = {};

        if (this.config) {
          for (var key in this.config) {
            if (this.constructor.Default[key] !== this.config[key]) {
              config[key] = this.config[key];
            }
          }
        }

        return config;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length) {
          $tip.removeClass(tabClass.join(''));
        }
      };

      _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(popperData) {
        var popperInstance = popperData.instance;
        this.tip = popperInstance.popper;

        this._cleanTipClass();

        this.addAttachmentClass(this._getAttachment(popperData.placement));
      };

      _proto._fixTransition = function _fixTransition() {
        var tip = this.getTipElement();
        var initConfigAnimation = this.config.animation;

        if (tip.getAttribute('x-placement') !== null) {
          return;
        }

        $$$1(tip).removeClass(ClassName.FADE);
        this.config.animation = false;
        this.hide();
        this.show();
        this.config.animation = initConfigAnimation;
      }; // Static


      Tooltip._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data && /dispose|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Tooltip(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tooltip, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Tooltip;
    }();
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Tooltip._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tooltip;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tooltip._jQueryInterface;
    };

    return Tooltip;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): popover.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Popover = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'popover';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.popover';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-popover';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');

    var Default = _objectSpread({}, Tooltip.Default, {
      placement: 'right',
      trigger: 'click',
      content: '',
      template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
    });

    var DefaultType = _objectSpread({}, Tooltip.DefaultType, {
      content: '(string|element|function)'
    });

    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TITLE: '.popover-header',
      CONTENT: '.popover-body'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Popover =
    /*#__PURE__*/
    function (_Tooltip) {
      _inheritsLoose(Popover, _Tooltip);

      function Popover() {
        return _Tooltip.apply(this, arguments) || this;
      }

      var _proto = Popover.prototype;

      // Overrides
      _proto.isWithContent = function isWithContent() {
        return this.getTitle() || this._getContent();
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var $tip = $$$1(this.getTipElement()); // We use append for html objects to maintain js events

        this.setElementContent($tip.find(Selector.TITLE), this.getTitle());

        var content = this._getContent();

        if (typeof content === 'function') {
          content = content.call(this.element);
        }

        this.setElementContent($tip.find(Selector.CONTENT), content);
        $tip.removeClass(ClassName.FADE + " " + ClassName.SHOW);
      }; // Private


      _proto._getContent = function _getContent() {
        return this.element.getAttribute('data-content') || this.config.content;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length > 0) {
          $tip.removeClass(tabClass.join(''));
        }
      }; // Static


      Popover._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data && /destroy|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Popover(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Popover, null, [{
        key: "VERSION",
        // Getters
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Popover;
    }(Tooltip);
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Popover._jQueryInterface;
    $$$1.fn[NAME].Constructor = Popover;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Popover._jQueryInterface;
    };

    return Popover;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): scrollspy.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var ScrollSpy = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'scrollspy';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.scrollspy';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      offset: 10,
      method: 'auto',
      target: ''
    };
    var DefaultType = {
      offset: 'number',
      method: 'string',
      target: '(string|element)'
    };
    var Event = {
      ACTIVATE: "activate" + EVENT_KEY,
      SCROLL: "scroll" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_ITEM: 'dropdown-item',
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active'
    };
    var Selector = {
      DATA_SPY: '[data-spy="scroll"]',
      ACTIVE: '.active',
      NAV_LIST_GROUP: '.nav, .list-group',
      NAV_LINKS: '.nav-link',
      NAV_ITEMS: '.nav-item',
      LIST_ITEMS: '.list-group-item',
      DROPDOWN: '.dropdown',
      DROPDOWN_ITEMS: '.dropdown-item',
      DROPDOWN_TOGGLE: '.dropdown-toggle'
    };
    var OffsetMethod = {
      OFFSET: 'offset',
      POSITION: 'position'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var ScrollSpy =
    /*#__PURE__*/
    function () {
      function ScrollSpy(element, config) {
        var _this = this;

        this._element = element;
        this._scrollElement = element.tagName === 'BODY' ? window : element;
        this._config = this._getConfig(config);
        this._selector = this._config.target + " " + Selector.NAV_LINKS + "," + (this._config.target + " " + Selector.LIST_ITEMS + ",") + (this._config.target + " " + Selector.DROPDOWN_ITEMS);
        this._offsets = [];
        this._targets = [];
        this._activeTarget = null;
        this._scrollHeight = 0;
        $$$1(this._scrollElement).on(Event.SCROLL, function (event) {
          return _this._process(event);
        });
        this.refresh();

        this._process();
      } // Getters


      var _proto = ScrollSpy.prototype;

      // Public
      _proto.refresh = function refresh() {
        var _this2 = this;

        var autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
        var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
        var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
        this._offsets = [];
        this._targets = [];
        this._scrollHeight = this._getScrollHeight();
        var targets = [].slice.call(document.querySelectorAll(this._selector));
        targets.map(function (element) {
          var target;
          var targetSelector = Util.getSelectorFromElement(element);

          if (targetSelector) {
            target = document.querySelector(targetSelector);
          }

          if (target) {
            var targetBCR = target.getBoundingClientRect();

            if (targetBCR.width || targetBCR.height) {
              // TODO (fat): remove sketch reliance on jQuery position/offset
              return [$$$1(target)[offsetMethod]().top + offsetBase, targetSelector];
            }
          }

          return null;
        }).filter(function (item) {
          return item;
        }).sort(function (a, b) {
          return a[0] - b[0];
        }).forEach(function (item) {
          _this2._offsets.push(item[0]);

          _this2._targets.push(item[1]);
        });
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._scrollElement).off(EVENT_KEY);
        this._element = null;
        this._scrollElement = null;
        this._config = null;
        this._selector = null;
        this._offsets = null;
        this._targets = null;
        this._activeTarget = null;
        this._scrollHeight = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, typeof config === 'object' && config ? config : {});

        if (typeof config.target !== 'string') {
          var id = $$$1(config.target).attr('id');

          if (!id) {
            id = Util.getUID(NAME);
            $$$1(config.target).attr('id', id);
          }

          config.target = "#" + id;
        }

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getScrollTop = function _getScrollTop() {
        return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
      };

      _proto._getScrollHeight = function _getScrollHeight() {
        return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      };

      _proto._getOffsetHeight = function _getOffsetHeight() {
        return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
      };

      _proto._process = function _process() {
        var scrollTop = this._getScrollTop() + this._config.offset;

        var scrollHeight = this._getScrollHeight();

        var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

        if (this._scrollHeight !== scrollHeight) {
          this.refresh();
        }

        if (scrollTop >= maxScroll) {
          var target = this._targets[this._targets.length - 1];

          if (this._activeTarget !== target) {
            this._activate(target);
          }

          return;
        }

        if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
          this._activeTarget = null;

          this._clear();

          return;
        }

        var offsetLength = this._offsets.length;

        for (var i = offsetLength; i--;) {
          var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);

          if (isActiveTarget) {
            this._activate(this._targets[i]);
          }
        }
      };

      _proto._activate = function _activate(target) {
        this._activeTarget = target;

        this._clear();

        var queries = this._selector.split(','); // eslint-disable-next-line arrow-body-style


        queries = queries.map(function (selector) {
          return selector + "[data-target=\"" + target + "\"]," + (selector + "[href=\"" + target + "\"]");
        });
        var $link = $$$1([].slice.call(document.querySelectorAll(queries.join(','))));

        if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
          $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          $link.addClass(ClassName.ACTIVE);
        } else {
          // Set triggered link as active
          $link.addClass(ClassName.ACTIVE); // Set triggered links parents as active
          // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_LINKS + ", " + Selector.LIST_ITEMS).addClass(ClassName.ACTIVE); // Handle special case when .nav-link is inside .nav-item

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_ITEMS).children(Selector.NAV_LINKS).addClass(ClassName.ACTIVE);
        }

        $$$1(this._scrollElement).trigger(Event.ACTIVATE, {
          relatedTarget: target
        });
      };

      _proto._clear = function _clear() {
        var nodes = [].slice.call(document.querySelectorAll(this._selector));
        $$$1(nodes).filter(Selector.ACTIVE).removeClass(ClassName.ACTIVE);
      }; // Static


      ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data) {
            data = new ScrollSpy(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(ScrollSpy, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return ScrollSpy;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(window).on(Event.LOAD_DATA_API, function () {
      var scrollSpys = [].slice.call(document.querySelectorAll(Selector.DATA_SPY));
      var scrollSpysLength = scrollSpys.length;

      for (var i = scrollSpysLength; i--;) {
        var $spy = $$$1(scrollSpys[i]);

        ScrollSpy._jQueryInterface.call($spy, $spy.data());
      }
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = ScrollSpy._jQueryInterface;
    $$$1.fn[NAME].Constructor = ScrollSpy;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return ScrollSpy._jQueryInterface;
    };

    return ScrollSpy;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): tab.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tab = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tab';
    var VERSION = '4.1.2';
    var DATA_KEY = 'bs.tab';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active',
      DISABLED: 'disabled',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DROPDOWN: '.dropdown',
      NAV_LIST_GROUP: '.nav, .list-group',
      ACTIVE: '.active',
      ACTIVE_UL: '> li > .active',
      DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
      DROPDOWN_TOGGLE: '.dropdown-toggle',
      DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tab =
    /*#__PURE__*/
    function () {
      function Tab(element) {
        this._element = element;
      } // Getters


      var _proto = Tab.prototype;

      // Public
      _proto.show = function show() {
        var _this = this;

        if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $$$1(this._element).hasClass(ClassName.ACTIVE) || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var target;
        var previous;
        var listElement = $$$1(this._element).closest(Selector.NAV_LIST_GROUP)[0];
        var selector = Util.getSelectorFromElement(this._element);

        if (listElement) {
          var itemSelector = listElement.nodeName === 'UL' ? Selector.ACTIVE_UL : Selector.ACTIVE;
          previous = $$$1.makeArray($$$1(listElement).find(itemSelector));
          previous = previous[previous.length - 1];
        }

        var hideEvent = $$$1.Event(Event.HIDE, {
          relatedTarget: this._element
        });
        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: previous
        });

        if (previous) {
          $$$1(previous).trigger(hideEvent);
        }

        $$$1(this._element).trigger(showEvent);

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
          return;
        }

        if (selector) {
          target = document.querySelector(selector);
        }

        this._activate(this._element, listElement);

        var complete = function complete() {
          var hiddenEvent = $$$1.Event(Event.HIDDEN, {
            relatedTarget: _this._element
          });
          var shownEvent = $$$1.Event(Event.SHOWN, {
            relatedTarget: previous
          });
          $$$1(previous).trigger(hiddenEvent);
          $$$1(_this._element).trigger(shownEvent);
        };

        if (target) {
          this._activate(target, target.parentNode, complete);
        } else {
          complete();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._activate = function _activate(element, container, callback) {
        var _this2 = this;

        var activeElements;

        if (container.nodeName === 'UL') {
          activeElements = $$$1(container).find(Selector.ACTIVE_UL);
        } else {
          activeElements = $$$1(container).children(Selector.ACTIVE);
        }

        var active = activeElements[0];
        var isTransitioning = callback && active && $$$1(active).hasClass(ClassName.FADE);

        var complete = function complete() {
          return _this2._transitionComplete(element, active, callback);
        };

        if (active && isTransitioning) {
          var transitionDuration = Util.getTransitionDurationFromElement(active);
          $$$1(active).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      };

      _proto._transitionComplete = function _transitionComplete(element, active, callback) {
        if (active) {
          $$$1(active).removeClass(ClassName.SHOW + " " + ClassName.ACTIVE);
          var dropdownChild = $$$1(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];

          if (dropdownChild) {
            $$$1(dropdownChild).removeClass(ClassName.ACTIVE);
          }

          if (active.getAttribute('role') === 'tab') {
            active.setAttribute('aria-selected', false);
          }
        }

        $$$1(element).addClass(ClassName.ACTIVE);

        if (element.getAttribute('role') === 'tab') {
          element.setAttribute('aria-selected', true);
        }

        Util.reflow(element);
        $$$1(element).addClass(ClassName.SHOW);

        if (element.parentNode && $$$1(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {
          var dropdownElement = $$$1(element).closest(Selector.DROPDOWN)[0];

          if (dropdownElement) {
            var dropdownToggleList = [].slice.call(dropdownElement.querySelectorAll(Selector.DROPDOWN_TOGGLE));
            $$$1(dropdownToggleList).addClass(ClassName.ACTIVE);
          }

          element.setAttribute('aria-expanded', true);
        }

        if (callback) {
          callback();
        }
      }; // Static


      Tab._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          if (!data) {
            data = new Tab(this);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tab, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Tab;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();

      Tab._jQueryInterface.call($$$1(this), 'show');
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Tab._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tab;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tab._jQueryInterface;
    };

    return Tab;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.2): index.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  (function ($$$1) {
    if (typeof $$$1 === 'undefined') {
      throw new TypeError('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
    }

    var version = $$$1.fn.jquery.split(' ')[0].split('.');
    var minMajor = 1;
    var ltMajor = 2;
    var minMinor = 9;
    var minPatch = 1;
    var maxMajor = 4;

    if (version[0] < ltMajor && version[1] < minMinor || version[0] === minMajor && version[1] === minMinor && version[2] < minPatch || version[0] >= maxMajor) {
      throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
    }
  })($);

  exports.Util = Util;
  exports.Alert = Alert;
  exports.Button = Button;
  exports.Carousel = Carousel;
  exports.Collapse = Collapse;
  exports.Dropdown = Dropdown;
  exports.Modal = Modal;
  exports.Popover = Popover;
  exports.Scrollspy = ScrollSpy;
  exports.Tab = Tab;
  exports.Tooltip = Tooltip;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bootstrap.js.map

/*!
 * Select2 4.0.12
 * https://select2.github.io
 *
 * Released under the MIT license
 * https://github.com/select2/select2/blob/master/LICENSE.md
 */
;(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = function (root, jQuery) {
      if (jQuery === undefined) {
        // require('jQuery') returns a factory that requires window to
        // build a jQuery instance, we normalize how we use modules
        // that require this pattern but the window provided is a noop
        // if it's defined (how jquery works)
        if (typeof window !== 'undefined') {
          jQuery = require('jquery');
        }
        else {
          jQuery = require('jquery')(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    // Browser globals
    factory(jQuery);
  }
} (function (jQuery) {
  // This is needed so we can catch the AMD loader configuration and use it
  // The inner file should be wrapped (by `banner.start.js`) in a function that
  // returns the AMD loader references.
  var S2 =(function () {
  // Restore the Select2 AMD loader so it can be used
  // Needed mostly in the language files, where the loader is not inserted
  if (jQuery && jQuery.fn && jQuery.fn.select2 && jQuery.fn.select2.amd) {
    var S2 = jQuery.fn.select2.amd;
  }
var S2;(function () { if (!S2 || !S2.requirejs) {
if (!S2) { S2 = {}; } else { require = S2; }
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

S2.requirejs = requirejs;S2.require = require;S2.define = define;
}
}());
S2.define("almond", function(){});

/* global jQuery:false, $:false */
S2.define('jquery',[],function () {
  var _$ = jQuery || $;

  if (_$ == null && console && console.error) {
    console.error(
      'Select2: An instance of jQuery or a jQuery-compatible library was not ' +
      'found. Make sure that you are including jQuery before Select2 on your ' +
      'web page.'
    );
  }

  return _$;
});

S2.define('select2/utils',[
  'jquery'
], function ($) {
  var Utils = {};

  Utils.Extend = function (ChildClass, SuperClass) {
    var __hasProp = {}.hasOwnProperty;

    function BaseConstructor () {
      this.constructor = ChildClass;
    }

    for (var key in SuperClass) {
      if (__hasProp.call(SuperClass, key)) {
        ChildClass[key] = SuperClass[key];
      }
    }

    BaseConstructor.prototype = SuperClass.prototype;
    ChildClass.prototype = new BaseConstructor();
    ChildClass.__super__ = SuperClass.prototype;

    return ChildClass;
  };

  function getMethods (theClass) {
    var proto = theClass.prototype;

    var methods = [];

    for (var methodName in proto) {
      var m = proto[methodName];

      if (typeof m !== 'function') {
        continue;
      }

      if (methodName === 'constructor') {
        continue;
      }

      methods.push(methodName);
    }

    return methods;
  }

  Utils.Decorate = function (SuperClass, DecoratorClass) {
    var decoratedMethods = getMethods(DecoratorClass);
    var superMethods = getMethods(SuperClass);

    function DecoratedClass () {
      var unshift = Array.prototype.unshift;

      var argCount = DecoratorClass.prototype.constructor.length;

      var calledConstructor = SuperClass.prototype.constructor;

      if (argCount > 0) {
        unshift.call(arguments, SuperClass.prototype.constructor);

        calledConstructor = DecoratorClass.prototype.constructor;
      }

      calledConstructor.apply(this, arguments);
    }

    DecoratorClass.displayName = SuperClass.displayName;

    function ctr () {
      this.constructor = DecoratedClass;
    }

    DecoratedClass.prototype = new ctr();

    for (var m = 0; m < superMethods.length; m++) {
      var superMethod = superMethods[m];

      DecoratedClass.prototype[superMethod] =
        SuperClass.prototype[superMethod];
    }

    var calledMethod = function (methodName) {
      // Stub out the original method if it's not decorating an actual method
      var originalMethod = function () {};

      if (methodName in DecoratedClass.prototype) {
        originalMethod = DecoratedClass.prototype[methodName];
      }

      var decoratedMethod = DecoratorClass.prototype[methodName];

      return function () {
        var unshift = Array.prototype.unshift;

        unshift.call(arguments, originalMethod);

        return decoratedMethod.apply(this, arguments);
      };
    };

    for (var d = 0; d < decoratedMethods.length; d++) {
      var decoratedMethod = decoratedMethods[d];

      DecoratedClass.prototype[decoratedMethod] = calledMethod(decoratedMethod);
    }

    return DecoratedClass;
  };

  var Observable = function () {
    this.listeners = {};
  };

  Observable.prototype.on = function (event, callback) {
    this.listeners = this.listeners || {};

    if (event in this.listeners) {
      this.listeners[event].push(callback);
    } else {
      this.listeners[event] = [callback];
    }
  };

  Observable.prototype.trigger = function (event) {
    var slice = Array.prototype.slice;
    var params = slice.call(arguments, 1);

    this.listeners = this.listeners || {};

    // Params should always come in as an array
    if (params == null) {
      params = [];
    }

    // If there are no arguments to the event, use a temporary object
    if (params.length === 0) {
      params.push({});
    }

    // Set the `_type` of the first object to the event
    params[0]._type = event;

    if (event in this.listeners) {
      this.invoke(this.listeners[event], slice.call(arguments, 1));
    }

    if ('*' in this.listeners) {
      this.invoke(this.listeners['*'], arguments);
    }
  };

  Observable.prototype.invoke = function (listeners, params) {
    for (var i = 0, len = listeners.length; i < len; i++) {
      listeners[i].apply(this, params);
    }
  };

  Utils.Observable = Observable;

  Utils.generateChars = function (length) {
    var chars = '';

    for (var i = 0; i < length; i++) {
      var randomChar = Math.floor(Math.random() * 36);
      chars += randomChar.toString(36);
    }

    return chars;
  };

  Utils.bind = function (func, context) {
    return function () {
      func.apply(context, arguments);
    };
  };

  Utils._convertData = function (data) {
    for (var originalKey in data) {
      var keys = originalKey.split('-');

      var dataLevel = data;

      if (keys.length === 1) {
        continue;
      }

      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];

        // Lowercase the first letter
        // By default, dash-separated becomes camelCase
        key = key.substring(0, 1).toLowerCase() + key.substring(1);

        if (!(key in dataLevel)) {
          dataLevel[key] = {};
        }

        if (k == keys.length - 1) {
          dataLevel[key] = data[originalKey];
        }

        dataLevel = dataLevel[key];
      }

      delete data[originalKey];
    }

    return data;
  };

  Utils.hasScroll = function (index, el) {
    // Adapted from the function created by @ShadowScripter
    // and adapted by @BillBarry on the Stack Exchange Code Review website.
    // The original code can be found at
    // http://codereview.stackexchange.com/q/13338
    // and was designed to be used with the Sizzle selector engine.

    var $el = $(el);
    var overflowX = el.style.overflowX;
    var overflowY = el.style.overflowY;

    //Check both x and y declarations
    if (overflowX === overflowY &&
        (overflowY === 'hidden' || overflowY === 'visible')) {
      return false;
    }

    if (overflowX === 'scroll' || overflowY === 'scroll') {
      return true;
    }

    return ($el.innerHeight() < el.scrollHeight ||
      $el.innerWidth() < el.scrollWidth);
  };

  Utils.escapeMarkup = function (markup) {
    var replaceMap = {
      '\\': '&#92;',
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;',
      '/': '&#47;'
    };

    // Do not try to escape the markup if it's not a string
    if (typeof markup !== 'string') {
      return markup;
    }

    return String(markup).replace(/[&<>"'\/\\]/g, function (match) {
      return replaceMap[match];
    });
  };

  // Append an array of jQuery nodes to a given element.
  Utils.appendMany = function ($element, $nodes) {
    // jQuery 1.7.x does not support $.fn.append() with an array
    // Fall back to a jQuery object collection using $.fn.add()
    if ($.fn.jquery.substr(0, 3) === '1.7') {
      var $jqNodes = $();

      $.map($nodes, function (node) {
        $jqNodes = $jqNodes.add(node);
      });

      $nodes = $jqNodes;
    }

    $element.append($nodes);
  };

  // Cache objects in Utils.__cache instead of $.data (see #4346)
  Utils.__cache = {};

  var id = 0;
  Utils.GetUniqueElementId = function (element) {
    // Get a unique element Id. If element has no id,
    // creates a new unique number, stores it in the id
    // attribute and returns the new id.
    // If an id already exists, it simply returns it.

    var select2Id = element.getAttribute('data-select2-id');
    if (select2Id == null) {
      // If element has id, use it.
      if (element.id) {
        select2Id = element.id;
        element.setAttribute('data-select2-id', select2Id);
      } else {
        element.setAttribute('data-select2-id', ++id);
        select2Id = id.toString();
      }
    }
    return select2Id;
  };

  Utils.StoreData = function (element, name, value) {
    // Stores an item in the cache for a specified element.
    // name is the cache key.
    var id = Utils.GetUniqueElementId(element);
    if (!Utils.__cache[id]) {
      Utils.__cache[id] = {};
    }

    Utils.__cache[id][name] = value;
  };

  Utils.GetData = function (element, name) {
    // Retrieves a value from the cache by its key (name)
    // name is optional. If no name specified, return
    // all cache items for the specified element.
    // and for a specified element.
    var id = Utils.GetUniqueElementId(element);
    if (name) {
      if (Utils.__cache[id]) {
        if (Utils.__cache[id][name] != null) {
          return Utils.__cache[id][name];
        }
        return $(element).data(name); // Fallback to HTML5 data attribs.
      }
      return $(element).data(name); // Fallback to HTML5 data attribs.
    } else {
      return Utils.__cache[id];
    }
  };

  Utils.RemoveData = function (element) {
    // Removes all cached items for a specified element.
    var id = Utils.GetUniqueElementId(element);
    if (Utils.__cache[id] != null) {
      delete Utils.__cache[id];
    }

    element.removeAttribute('data-select2-id');
  };

  return Utils;
});

S2.define('select2/results',[
  'jquery',
  './utils'
], function ($, Utils) {
  function Results ($element, options, dataAdapter) {
    this.$element = $element;
    this.data = dataAdapter;
    this.options = options;

    Results.__super__.constructor.call(this);
  }

  Utils.Extend(Results, Utils.Observable);

  Results.prototype.render = function () {
    var $results = $(
      '<ul class="select2-results__options" role="listbox"></ul>'
    );

    if (this.options.get('multiple')) {
      $results.attr('aria-multiselectable', 'true');
    }

    this.$results = $results;

    return $results;
  };

  Results.prototype.clear = function () {
    this.$results.empty();
  };

  Results.prototype.displayMessage = function (params) {
    var escapeMarkup = this.options.get('escapeMarkup');

    this.clear();
    this.hideLoading();

    var $message = $(
      '<li role="alert" aria-live="assertive"' +
      ' class="select2-results__option"></li>'
    );

    var message = this.options.get('translations').get(params.message);

    $message.append(
      escapeMarkup(
        message(params.args)
      )
    );

    $message[0].className += ' select2-results__message';

    this.$results.append($message);
  };

  Results.prototype.hideMessages = function () {
    this.$results.find('.select2-results__message').remove();
  };

  Results.prototype.append = function (data) {
    this.hideLoading();

    var $options = [];

    if (data.results == null || data.results.length === 0) {
      if (this.$results.children().length === 0) {
        this.trigger('results:message', {
          message: 'noResults'
        });
      }

      return;
    }

    data.results = this.sort(data.results);

    for (var d = 0; d < data.results.length; d++) {
      var item = data.results[d];

      var $option = this.option(item);

      $options.push($option);
    }

    this.$results.append($options);
  };

  Results.prototype.position = function ($results, $dropdown) {
    var $resultsContainer = $dropdown.find('.select2-results');
    $resultsContainer.append($results);
  };

  Results.prototype.sort = function (data) {
    var sorter = this.options.get('sorter');

    return sorter(data);
  };

  Results.prototype.highlightFirstItem = function () {
    var $options = this.$results
      .find('.select2-results__option[aria-selected]');

    var $selected = $options.filter('[aria-selected=true]');

    // Check if there are any selected options
    if ($selected.length > 0) {
      // If there are selected options, highlight the first
      $selected.first().trigger('mouseenter');
    } else {
      // If there are no selected options, highlight the first option
      // in the dropdown
      $options.first().trigger('mouseenter');
    }

    this.ensureHighlightVisible();
  };

  Results.prototype.setClasses = function () {
    var self = this;

    this.data.current(function (selected) {
      var selectedIds = $.map(selected, function (s) {
        return s.id.toString();
      });

      var $options = self.$results
        .find('.select2-results__option[aria-selected]');

      $options.each(function () {
        var $option = $(this);

        var item = Utils.GetData(this, 'data');

        // id needs to be converted to a string when comparing
        var id = '' + item.id;

        if ((item.element != null && item.element.selected) ||
            (item.element == null && $.inArray(id, selectedIds) > -1)) {
          $option.attr('aria-selected', 'true');
        } else {
          $option.attr('aria-selected', 'false');
        }
      });

    });
  };

  Results.prototype.showLoading = function (params) {
    this.hideLoading();

    var loadingMore = this.options.get('translations').get('searching');

    var loading = {
      disabled: true,
      loading: true,
      text: loadingMore(params)
    };
    var $loading = this.option(loading);
    $loading.className += ' loading-results';

    this.$results.prepend($loading);
  };

  Results.prototype.hideLoading = function () {
    this.$results.find('.loading-results').remove();
  };

  Results.prototype.option = function (data) {
    var option = document.createElement('li');
    option.className = 'select2-results__option';

    var attrs = {
      'role': 'option',
      'aria-selected': 'false'
    };

    var matches = window.Element.prototype.matches ||
      window.Element.prototype.msMatchesSelector ||
      window.Element.prototype.webkitMatchesSelector;

    if ((data.element != null && matches.call(data.element, ':disabled')) ||
        (data.element == null && data.disabled)) {
      delete attrs['aria-selected'];
      attrs['aria-disabled'] = 'true';
    }

    if (data.id == null) {
      delete attrs['aria-selected'];
    }

    if (data._resultId != null) {
      option.id = data._resultId;
    }

    if (data.title) {
      option.title = data.title;
    }

    if (data.children) {
      attrs.role = 'group';
      attrs['aria-label'] = data.text;
      delete attrs['aria-selected'];
    }

    for (var attr in attrs) {
      var val = attrs[attr];

      option.setAttribute(attr, val);
    }

    if (data.children) {
      var $option = $(option);

      var label = document.createElement('strong');
      label.className = 'select2-results__group';

      var $label = $(label);
      this.template(data, label);

      var $children = [];

      for (var c = 0; c < data.children.length; c++) {
        var child = data.children[c];

        var $child = this.option(child);

        $children.push($child);
      }

      var $childrenContainer = $('<ul></ul>', {
        'class': 'select2-results__options select2-results__options--nested'
      });

      $childrenContainer.append($children);

      $option.append(label);
      $option.append($childrenContainer);
    } else {
      this.template(data, option);
    }

    Utils.StoreData(option, 'data', data);

    return option;
  };

  Results.prototype.bind = function (container, $container) {
    var self = this;

    var id = container.id + '-results';

    this.$results.attr('id', id);

    container.on('results:all', function (params) {
      self.clear();
      self.append(params.data);

      if (container.isOpen()) {
        self.setClasses();
        self.highlightFirstItem();
      }
    });

    container.on('results:append', function (params) {
      self.append(params.data);

      if (container.isOpen()) {
        self.setClasses();
      }
    });

    container.on('query', function (params) {
      self.hideMessages();
      self.showLoading(params);
    });

    container.on('select', function () {
      if (!container.isOpen()) {
        return;
      }

      self.setClasses();

      if (self.options.get('scrollAfterSelect')) {
        self.highlightFirstItem();
      }
    });

    container.on('unselect', function () {
      if (!container.isOpen()) {
        return;
      }

      self.setClasses();

      if (self.options.get('scrollAfterSelect')) {
        self.highlightFirstItem();
      }
    });

    container.on('open', function () {
      // When the dropdown is open, aria-expended="true"
      self.$results.attr('aria-expanded', 'true');
      self.$results.attr('aria-hidden', 'false');

      self.setClasses();
      self.ensureHighlightVisible();
    });

    container.on('close', function () {
      // When the dropdown is closed, aria-expended="false"
      self.$results.attr('aria-expanded', 'false');
      self.$results.attr('aria-hidden', 'true');
      self.$results.removeAttr('aria-activedescendant');
    });

    container.on('results:toggle', function () {
      var $highlighted = self.getHighlightedResults();

      if ($highlighted.length === 0) {
        return;
      }

      $highlighted.trigger('mouseup');
    });

    container.on('results:select', function () {
      var $highlighted = self.getHighlightedResults();

      if ($highlighted.length === 0) {
        return;
      }

      var data = Utils.GetData($highlighted[0], 'data');

      if ($highlighted.attr('aria-selected') == 'true') {
        self.trigger('close', {});
      } else {
        self.trigger('select', {
          data: data
        });
      }
    });

    container.on('results:previous', function () {
      var $highlighted = self.getHighlightedResults();

      var $options = self.$results.find('[aria-selected]');

      var currentIndex = $options.index($highlighted);

      // If we are already at the top, don't move further
      // If no options, currentIndex will be -1
      if (currentIndex <= 0) {
        return;
      }

      var nextIndex = currentIndex - 1;

      // If none are highlighted, highlight the first
      if ($highlighted.length === 0) {
        nextIndex = 0;
      }

      var $next = $options.eq(nextIndex);

      $next.trigger('mouseenter');

      var currentOffset = self.$results.offset().top;
      var nextTop = $next.offset().top;
      var nextOffset = self.$results.scrollTop() + (nextTop - currentOffset);

      if (nextIndex === 0) {
        self.$results.scrollTop(0);
      } else if (nextTop - currentOffset < 0) {
        self.$results.scrollTop(nextOffset);
      }
    });

    container.on('results:next', function () {
      var $highlighted = self.getHighlightedResults();

      var $options = self.$results.find('[aria-selected]');

      var currentIndex = $options.index($highlighted);

      var nextIndex = currentIndex + 1;

      // If we are at the last option, stay there
      if (nextIndex >= $options.length) {
        return;
      }

      var $next = $options.eq(nextIndex);

      $next.trigger('mouseenter');

      var currentOffset = self.$results.offset().top +
        self.$results.outerHeight(false);
      var nextBottom = $next.offset().top + $next.outerHeight(false);
      var nextOffset = self.$results.scrollTop() + nextBottom - currentOffset;

      if (nextIndex === 0) {
        self.$results.scrollTop(0);
      } else if (nextBottom > currentOffset) {
        self.$results.scrollTop(nextOffset);
      }
    });

    container.on('results:focus', function (params) {
      params.element.addClass('select2-results__option--highlighted');
    });

    container.on('results:message', function (params) {
      self.displayMessage(params);
    });

    if ($.fn.mousewheel) {
      this.$results.on('mousewheel', function (e) {
        var top = self.$results.scrollTop();

        var bottom = self.$results.get(0).scrollHeight - top + e.deltaY;

        var isAtTop = e.deltaY > 0 && top - e.deltaY <= 0;
        var isAtBottom = e.deltaY < 0 && bottom <= self.$results.height();

        if (isAtTop) {
          self.$results.scrollTop(0);

          e.preventDefault();
          e.stopPropagation();
        } else if (isAtBottom) {
          self.$results.scrollTop(
            self.$results.get(0).scrollHeight - self.$results.height()
          );

          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    this.$results.on('mouseup', '.select2-results__option[aria-selected]',
      function (evt) {
      var $this = $(this);

      var data = Utils.GetData(this, 'data');

      if ($this.attr('aria-selected') === 'true') {
        if (self.options.get('multiple')) {
          self.trigger('unselect', {
            originalEvent: evt,
            data: data
          });
        } else {
          self.trigger('close', {});
        }

        return;
      }

      self.trigger('select', {
        originalEvent: evt,
        data: data
      });
    });

    this.$results.on('mouseenter', '.select2-results__option[aria-selected]',
      function (evt) {
      var data = Utils.GetData(this, 'data');

      self.getHighlightedResults()
          .removeClass('select2-results__option--highlighted');

      self.trigger('results:focus', {
        data: data,
        element: $(this)
      });
    });
  };

  Results.prototype.getHighlightedResults = function () {
    var $highlighted = this.$results
    .find('.select2-results__option--highlighted');

    return $highlighted;
  };

  Results.prototype.destroy = function () {
    this.$results.remove();
  };

  Results.prototype.ensureHighlightVisible = function () {
    var $highlighted = this.getHighlightedResults();

    if ($highlighted.length === 0) {
      return;
    }

    var $options = this.$results.find('[aria-selected]');

    var currentIndex = $options.index($highlighted);

    var currentOffset = this.$results.offset().top;
    var nextTop = $highlighted.offset().top;
    var nextOffset = this.$results.scrollTop() + (nextTop - currentOffset);

    var offsetDelta = nextTop - currentOffset;
    nextOffset -= $highlighted.outerHeight(false) * 2;

    if (currentIndex <= 2) {
      this.$results.scrollTop(0);
    } else if (offsetDelta > this.$results.outerHeight() || offsetDelta < 0) {
      this.$results.scrollTop(nextOffset);
    }
  };

  Results.prototype.template = function (result, container) {
    var template = this.options.get('templateResult');
    var escapeMarkup = this.options.get('escapeMarkup');

    var content = template(result, container);

    if (content == null) {
      container.style.display = 'none';
    } else if (typeof content === 'string') {
      container.innerHTML = escapeMarkup(content);
    } else {
      $(container).append(content);
    }
  };

  return Results;
});

S2.define('select2/keys',[

], function () {
  var KEYS = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    ESC: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETE: 46
  };

  return KEYS;
});

S2.define('select2/selection/base',[
  'jquery',
  '../utils',
  '../keys'
], function ($, Utils, KEYS) {
  function BaseSelection ($element, options) {
    this.$element = $element;
    this.options = options;

    BaseSelection.__super__.constructor.call(this);
  }

  Utils.Extend(BaseSelection, Utils.Observable);

  BaseSelection.prototype.render = function () {
    var $selection = $(
      '<span class="select2-selection" role="combobox" ' +
      ' aria-haspopup="true" aria-expanded="false">' +
      '</span>'
    );

    this._tabindex = 0;

    if (Utils.GetData(this.$element[0], 'old-tabindex') != null) {
      this._tabindex = Utils.GetData(this.$element[0], 'old-tabindex');
    } else if (this.$element.attr('tabindex') != null) {
      this._tabindex = this.$element.attr('tabindex');
    }

    $selection.attr('title', this.$element.attr('title'));
    $selection.attr('tabindex', this._tabindex);
    $selection.attr('aria-disabled', 'false');

    this.$selection = $selection;

    return $selection;
  };

  BaseSelection.prototype.bind = function (container, $container) {
    var self = this;

    var resultsId = container.id + '-results';

    this.container = container;

    this.$selection.on('focus', function (evt) {
      self.trigger('focus', evt);
    });

    this.$selection.on('blur', function (evt) {
      self._handleBlur(evt);
    });

    this.$selection.on('keydown', function (evt) {
      self.trigger('keypress', evt);

      if (evt.which === KEYS.SPACE) {
        evt.preventDefault();
      }
    });

    container.on('results:focus', function (params) {
      self.$selection.attr('aria-activedescendant', params.data._resultId);
    });

    container.on('selection:update', function (params) {
      self.update(params.data);
    });

    container.on('open', function () {
      // When the dropdown is open, aria-expanded="true"
      self.$selection.attr('aria-expanded', 'true');
      self.$selection.attr('aria-owns', resultsId);

      self._attachCloseHandler(container);
    });

    container.on('close', function () {
      // When the dropdown is closed, aria-expanded="false"
      self.$selection.attr('aria-expanded', 'false');
      self.$selection.removeAttr('aria-activedescendant');
      self.$selection.removeAttr('aria-owns');

      self.$selection.trigger('focus');

      self._detachCloseHandler(container);
    });

    container.on('enable', function () {
      self.$selection.attr('tabindex', self._tabindex);
      self.$selection.attr('aria-disabled', 'false');
    });

    container.on('disable', function () {
      self.$selection.attr('tabindex', '-1');
      self.$selection.attr('aria-disabled', 'true');
    });
  };

  BaseSelection.prototype._handleBlur = function (evt) {
    var self = this;

    // This needs to be delayed as the active element is the body when the tab
    // key is pressed, possibly along with others.
    window.setTimeout(function () {
      // Don't trigger `blur` if the focus is still in the selection
      if (
        (document.activeElement == self.$selection[0]) ||
        ($.contains(self.$selection[0], document.activeElement))
      ) {
        return;
      }

      self.trigger('blur', evt);
    }, 1);
  };

  BaseSelection.prototype._attachCloseHandler = function (container) {

    $(document.body).on('mousedown.select2.' + container.id, function (e) {
      var $target = $(e.target);

      var $select = $target.closest('.select2');

      var $all = $('.select2.select2-container--open');

      $all.each(function () {
        if (this == $select[0]) {
          return;
        }

        var $element = Utils.GetData(this, 'element');

        $element.select2('close');
      });
    });
  };

  BaseSelection.prototype._detachCloseHandler = function (container) {
    $(document.body).off('mousedown.select2.' + container.id);
  };

  BaseSelection.prototype.position = function ($selection, $container) {
    var $selectionContainer = $container.find('.selection');
    $selectionContainer.append($selection);
  };

  BaseSelection.prototype.destroy = function () {
    this._detachCloseHandler(this.container);
  };

  BaseSelection.prototype.update = function (data) {
    throw new Error('The `update` method must be defined in child classes.');
  };

  return BaseSelection;
});

S2.define('select2/selection/single',[
  'jquery',
  './base',
  '../utils',
  '../keys'
], function ($, BaseSelection, Utils, KEYS) {
  function SingleSelection () {
    SingleSelection.__super__.constructor.apply(this, arguments);
  }

  Utils.Extend(SingleSelection, BaseSelection);

  SingleSelection.prototype.render = function () {
    var $selection = SingleSelection.__super__.render.call(this);

    $selection.addClass('select2-selection--single');

    $selection.html(
      '<span class="select2-selection__rendered"></span>' +
      '<span class="select2-selection__arrow" role="presentation">' +
        '<b role="presentation"></b>' +
      '</span>'
    );

    return $selection;
  };

  SingleSelection.prototype.bind = function (container, $container) {
    var self = this;

    SingleSelection.__super__.bind.apply(this, arguments);

    var id = container.id + '-container';

    this.$selection.find('.select2-selection__rendered')
      .attr('id', id)
      .attr('role', 'textbox')
      .attr('aria-readonly', 'true');
    this.$selection.attr('aria-labelledby', id);

    this.$selection.on('mousedown', function (evt) {
      // Only respond to left clicks
      if (evt.which !== 1) {
        return;
      }

      self.trigger('toggle', {
        originalEvent: evt
      });
    });

    this.$selection.on('focus', function (evt) {
      // User focuses on the container
    });

    this.$selection.on('blur', function (evt) {
      // User exits the container
    });

    container.on('focus', function (evt) {
      if (!container.isOpen()) {
        self.$selection.trigger('focus');
      }
    });
  };

  SingleSelection.prototype.clear = function () {
    var $rendered = this.$selection.find('.select2-selection__rendered');
    $rendered.empty();
    $rendered.removeAttr('title'); // clear tooltip on empty
  };

  SingleSelection.prototype.display = function (data, container) {
    var template = this.options.get('templateSelection');
    var escapeMarkup = this.options.get('escapeMarkup');

    return escapeMarkup(template(data, container));
  };

  SingleSelection.prototype.selectionContainer = function () {
    return $('<span></span>');
  };

  SingleSelection.prototype.update = function (data) {
    if (data.length === 0) {
      this.clear();
      return;
    }

    var selection = data[0];

    var $rendered = this.$selection.find('.select2-selection__rendered');
    var formatted = this.display(selection, $rendered);

    $rendered.empty().append(formatted);

    var title = selection.title || selection.text;

    if (title) {
      $rendered.attr('title', title);
    } else {
      $rendered.removeAttr('title');
    }
  };

  return SingleSelection;
});

S2.define('select2/selection/multiple',[
  'jquery',
  './base',
  '../utils'
], function ($, BaseSelection, Utils) {
  function MultipleSelection ($element, options) {
    MultipleSelection.__super__.constructor.apply(this, arguments);
  }

  Utils.Extend(MultipleSelection, BaseSelection);

  MultipleSelection.prototype.render = function () {
    var $selection = MultipleSelection.__super__.render.call(this);

    $selection.addClass('select2-selection--multiple');

    $selection.html(
      '<ul class="select2-selection__rendered"></ul>'
    );

    return $selection;
  };

  MultipleSelection.prototype.bind = function (container, $container) {
    var self = this;

    MultipleSelection.__super__.bind.apply(this, arguments);

    this.$selection.on('click', function (evt) {
      self.trigger('toggle', {
        originalEvent: evt
      });
    });

    this.$selection.on(
      'click',
      '.select2-selection__choice__remove',
      function (evt) {
        // Ignore the event if it is disabled
        if (self.options.get('disabled')) {
          return;
        }

        var $remove = $(this);
        var $selection = $remove.parent();

        var data = Utils.GetData($selection[0], 'data');

        self.trigger('unselect', {
          originalEvent: evt,
          data: data
        });
      }
    );
  };

  MultipleSelection.prototype.clear = function () {
    var $rendered = this.$selection.find('.select2-selection__rendered');
    $rendered.empty();
    $rendered.removeAttr('title');
  };

  MultipleSelection.prototype.display = function (data, container) {
    var template = this.options.get('templateSelection');
    var escapeMarkup = this.options.get('escapeMarkup');

    return escapeMarkup(template(data, container));
  };

  MultipleSelection.prototype.selectionContainer = function () {
    var $container = $(
      '<li class="select2-selection__choice">' +
        '<span class="select2-selection__choice__remove" role="presentation">' +
          '&times;' +
        '</span>' +
      '</li>'
    );

    return $container;
  };

  MultipleSelection.prototype.update = function (data) {
    this.clear();

    if (data.length === 0) {
      return;
    }

    var $selections = [];

    for (var d = 0; d < data.length; d++) {
      var selection = data[d];

      var $selection = this.selectionContainer();
      var formatted = this.display(selection, $selection);

      $selection.append(formatted);

      var title = selection.title || selection.text;

      if (title) {
        $selection.attr('title', title);
      }

      Utils.StoreData($selection[0], 'data', selection);

      $selections.push($selection);
    }

    var $rendered = this.$selection.find('.select2-selection__rendered');

    Utils.appendMany($rendered, $selections);
  };

  return MultipleSelection;
});

S2.define('select2/selection/placeholder',[
  '../utils'
], function (Utils) {
  function Placeholder (decorated, $element, options) {
    this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

    decorated.call(this, $element, options);
  }

  Placeholder.prototype.normalizePlaceholder = function (_, placeholder) {
    if (typeof placeholder === 'string') {
      placeholder = {
        id: '',
        text: placeholder
      };
    }

    return placeholder;
  };

  Placeholder.prototype.createPlaceholder = function (decorated, placeholder) {
    var $placeholder = this.selectionContainer();

    $placeholder.html(this.display(placeholder));
    $placeholder.addClass('select2-selection__placeholder')
                .removeClass('select2-selection__choice');

    return $placeholder;
  };

  Placeholder.prototype.update = function (decorated, data) {
    var singlePlaceholder = (
      data.length == 1 && data[0].id != this.placeholder.id
    );
    var multipleSelections = data.length > 1;

    if (multipleSelections || singlePlaceholder) {
      return decorated.call(this, data);
    }

    this.clear();

    var $placeholder = this.createPlaceholder(this.placeholder);

    this.$selection.find('.select2-selection__rendered').append($placeholder);
  };

  return Placeholder;
});

S2.define('select2/selection/allowClear',[
  'jquery',
  '../keys',
  '../utils'
], function ($, KEYS, Utils) {
  function AllowClear () { }

  AllowClear.prototype.bind = function (decorated, container, $container) {
    var self = this;

    decorated.call(this, container, $container);

    if (this.placeholder == null) {
      if (this.options.get('debug') && window.console && console.error) {
        console.error(
          'Select2: The `allowClear` option should be used in combination ' +
          'with the `placeholder` option.'
        );
      }
    }

    this.$selection.on('mousedown', '.select2-selection__clear',
      function (evt) {
        self._handleClear(evt);
    });

    container.on('keypress', function (evt) {
      self._handleKeyboardClear(evt, container);
    });
  };

  AllowClear.prototype._handleClear = function (_, evt) {
    // Ignore the event if it is disabled
    if (this.options.get('disabled')) {
      return;
    }

    var $clear = this.$selection.find('.select2-selection__clear');

    // Ignore the event if nothing has been selected
    if ($clear.length === 0) {
      return;
    }

    evt.stopPropagation();

    var data = Utils.GetData($clear[0], 'data');

    var previousVal = this.$element.val();
    this.$element.val(this.placeholder.id);

    var unselectData = {
      data: data
    };
    this.trigger('clear', unselectData);
    if (unselectData.prevented) {
      this.$element.val(previousVal);
      return;
    }

    for (var d = 0; d < data.length; d++) {
      unselectData = {
        data: data[d]
      };

      // Trigger the `unselect` event, so people can prevent it from being
      // cleared.
      this.trigger('unselect', unselectData);

      // If the event was prevented, don't clear it out.
      if (unselectData.prevented) {
        this.$element.val(previousVal);
        return;
      }
    }

    this.$element.trigger('change');

    this.trigger('toggle', {});
  };

  AllowClear.prototype._handleKeyboardClear = function (_, evt, container) {
    if (container.isOpen()) {
      return;
    }

    if (evt.which == KEYS.DELETE || evt.which == KEYS.BACKSPACE) {
      this._handleClear(evt);
    }
  };

  AllowClear.prototype.update = function (decorated, data) {
    decorated.call(this, data);

    if (this.$selection.find('.select2-selection__placeholder').length > 0 ||
        data.length === 0) {
      return;
    }

    var removeAll = this.options.get('translations').get('removeAllItems');   

    var $remove = $(
      '<span class="select2-selection__clear" title="' + removeAll() +'">' +
        '&times;' +
      '</span>'
    );
    Utils.StoreData($remove[0], 'data', data);

    this.$selection.find('.select2-selection__rendered').prepend($remove);
  };

  return AllowClear;
});

S2.define('select2/selection/search',[
  'jquery',
  '../utils',
  '../keys'
], function ($, Utils, KEYS) {
  function Search (decorated, $element, options) {
    decorated.call(this, $element, options);
  }

  Search.prototype.render = function (decorated) {
    var $search = $(
      '<li class="select2-search select2-search--inline">' +
        '<input class="select2-search__field" type="search" tabindex="-1"' +
        ' autocomplete="off" autocorrect="off" autocapitalize="none"' +
        ' spellcheck="false" role="searchbox" aria-autocomplete="list" />' +
      '</li>'
    );

    this.$searchContainer = $search;
    this.$search = $search.find('input');

    var $rendered = decorated.call(this);

    this._transferTabIndex();

    return $rendered;
  };

  Search.prototype.bind = function (decorated, container, $container) {
    var self = this;

    var resultsId = container.id + '-results';

    decorated.call(this, container, $container);

    container.on('open', function () {
      self.$search.attr('aria-controls', resultsId);
      self.$search.trigger('focus');
    });

    container.on('close', function () {
      self.$search.val('');
      self.$search.removeAttr('aria-controls');
      self.$search.removeAttr('aria-activedescendant');
      self.$search.trigger('focus');
    });

    container.on('enable', function () {
      self.$search.prop('disabled', false);

      self._transferTabIndex();
    });

    container.on('disable', function () {
      self.$search.prop('disabled', true);
    });

    container.on('focus', function (evt) {
      self.$search.trigger('focus');
    });

    container.on('results:focus', function (params) {
      if (params.data._resultId) {
        self.$search.attr('aria-activedescendant', params.data._resultId);
      } else {
        self.$search.removeAttr('aria-activedescendant');
      }
    });

    this.$selection.on('focusin', '.select2-search--inline', function (evt) {
      self.trigger('focus', evt);
    });

    this.$selection.on('focusout', '.select2-search--inline', function (evt) {
      self._handleBlur(evt);
    });

    this.$selection.on('keydown', '.select2-search--inline', function (evt) {
      evt.stopPropagation();

      self.trigger('keypress', evt);

      self._keyUpPrevented = evt.isDefaultPrevented();

      var key = evt.which;

      if (key === KEYS.BACKSPACE && self.$search.val() === '') {
        var $previousChoice = self.$searchContainer
          .prev('.select2-selection__choice');

        if ($previousChoice.length > 0) {
          var item = Utils.GetData($previousChoice[0], 'data');

          self.searchRemoveChoice(item);

          evt.preventDefault();
        }
      }
    });

    this.$selection.on('click', '.select2-search--inline', function (evt) {
      if (self.$search.val()) {
        evt.stopPropagation();
      }
    });

    // Try to detect the IE version should the `documentMode` property that
    // is stored on the document. This is only implemented in IE and is
    // slightly cleaner than doing a user agent check.
    // This property is not available in Edge, but Edge also doesn't have
    // this bug.
    var msie = document.documentMode;
    var disableInputEvents = msie && msie <= 11;

    // Workaround for browsers which do not support the `input` event
    // This will prevent double-triggering of events for browsers which support
    // both the `keyup` and `input` events.
    this.$selection.on(
      'input.searchcheck',
      '.select2-search--inline',
      function (evt) {
        // IE will trigger the `input` event when a placeholder is used on a
        // search box. To get around this issue, we are forced to ignore all
        // `input` events in IE and keep using `keyup`.
        if (disableInputEvents) {
          self.$selection.off('input.search input.searchcheck');
          return;
        }

        // Unbind the duplicated `keyup` event
        self.$selection.off('keyup.search');
      }
    );

    this.$selection.on(
      'keyup.search input.search',
      '.select2-search--inline',
      function (evt) {
        // IE will trigger the `input` event when a placeholder is used on a
        // search box. To get around this issue, we are forced to ignore all
        // `input` events in IE and keep using `keyup`.
        if (disableInputEvents && evt.type === 'input') {
          self.$selection.off('input.search input.searchcheck');
          return;
        }

        var key = evt.which;

        // We can freely ignore events from modifier keys
        if (key == KEYS.SHIFT || key == KEYS.CTRL || key == KEYS.ALT) {
          return;
        }

        // Tabbing will be handled during the `keydown` phase
        if (key == KEYS.TAB) {
          return;
        }

        self.handleSearch(evt);
      }
    );
  };

  /**
   * This method will transfer the tabindex attribute from the rendered
   * selection to the search box. This allows for the search box to be used as
   * the primary focus instead of the selection container.
   *
   * @private
   */
  Search.prototype._transferTabIndex = function (decorated) {
    this.$search.attr('tabindex', this.$selection.attr('tabindex'));
    this.$selection.attr('tabindex', '-1');
  };

  Search.prototype.createPlaceholder = function (decorated, placeholder) {
    this.$search.attr('placeholder', placeholder.text);
  };

  Search.prototype.update = function (decorated, data) {
    var searchHadFocus = this.$search[0] == document.activeElement;

    this.$search.attr('placeholder', '');

    decorated.call(this, data);

    this.$selection.find('.select2-selection__rendered')
                   .append(this.$searchContainer);

    this.resizeSearch();
    if (searchHadFocus) {
      this.$search.trigger('focus');
    }
  };

  Search.prototype.handleSearch = function () {
    this.resizeSearch();

    if (!this._keyUpPrevented) {
      var input = this.$search.val();

      this.trigger('query', {
        term: input
      });
    }

    this._keyUpPrevented = false;
  };

  Search.prototype.searchRemoveChoice = function (decorated, item) {
    this.trigger('unselect', {
      data: item
    });

    this.$search.val(item.text);
    this.handleSearch();
  };

  Search.prototype.resizeSearch = function () {
    this.$search.css('width', '25px');

    var width = '';

    if (this.$search.attr('placeholder') !== '') {
      width = this.$selection.find('.select2-selection__rendered').width();
    } else {
      var minimumWidth = this.$search.val().length + 1;

      width = (minimumWidth * 0.75) + 'em';
    }

    this.$search.css('width', width);
  };

  return Search;
});

S2.define('select2/selection/eventRelay',[
  'jquery'
], function ($) {
  function EventRelay () { }

  EventRelay.prototype.bind = function (decorated, container, $container) {
    var self = this;
    var relayEvents = [
      'open', 'opening',
      'close', 'closing',
      'select', 'selecting',
      'unselect', 'unselecting',
      'clear', 'clearing'
    ];

    var preventableEvents = [
      'opening', 'closing', 'selecting', 'unselecting', 'clearing'
    ];

    decorated.call(this, container, $container);

    container.on('*', function (name, params) {
      // Ignore events that should not be relayed
      if ($.inArray(name, relayEvents) === -1) {
        return;
      }

      // The parameters should always be an object
      params = params || {};

      // Generate the jQuery event for the Select2 event
      var evt = $.Event('select2:' + name, {
        params: params
      });

      self.$element.trigger(evt);

      // Only handle preventable events if it was one
      if ($.inArray(name, preventableEvents) === -1) {
        return;
      }

      params.prevented = evt.isDefaultPrevented();
    });
  };

  return EventRelay;
});

S2.define('select2/translation',[
  'jquery',
  'require'
], function ($, require) {
  function Translation (dict) {
    this.dict = dict || {};
  }

  Translation.prototype.all = function () {
    return this.dict;
  };

  Translation.prototype.get = function (key) {
    return this.dict[key];
  };

  Translation.prototype.extend = function (translation) {
    this.dict = $.extend({}, translation.all(), this.dict);
  };

  // Static functions

  Translation._cache = {};

  Translation.loadPath = function (path) {
    if (!(path in Translation._cache)) {
      var translations = require(path);

      Translation._cache[path] = translations;
    }

    return new Translation(Translation._cache[path]);
  };

  return Translation;
});

S2.define('select2/diacritics',[

], function () {
  var diacritics = {
    '\u24B6': 'A',
    '\uFF21': 'A',
    '\u00C0': 'A',
    '\u00C1': 'A',
    '\u00C2': 'A',
    '\u1EA6': 'A',
    '\u1EA4': 'A',
    '\u1EAA': 'A',
    '\u1EA8': 'A',
    '\u00C3': 'A',
    '\u0100': 'A',
    '\u0102': 'A',
    '\u1EB0': 'A',
    '\u1EAE': 'A',
    '\u1EB4': 'A',
    '\u1EB2': 'A',
    '\u0226': 'A',
    '\u01E0': 'A',
    '\u00C4': 'A',
    '\u01DE': 'A',
    '\u1EA2': 'A',
    '\u00C5': 'A',
    '\u01FA': 'A',
    '\u01CD': 'A',
    '\u0200': 'A',
    '\u0202': 'A',
    '\u1EA0': 'A',
    '\u1EAC': 'A',
    '\u1EB6': 'A',
    '\u1E00': 'A',
    '\u0104': 'A',
    '\u023A': 'A',
    '\u2C6F': 'A',
    '\uA732': 'AA',
    '\u00C6': 'AE',
    '\u01FC': 'AE',
    '\u01E2': 'AE',
    '\uA734': 'AO',
    '\uA736': 'AU',
    '\uA738': 'AV',
    '\uA73A': 'AV',
    '\uA73C': 'AY',
    '\u24B7': 'B',
    '\uFF22': 'B',
    '\u1E02': 'B',
    '\u1E04': 'B',
    '\u1E06': 'B',
    '\u0243': 'B',
    '\u0182': 'B',
    '\u0181': 'B',
    '\u24B8': 'C',
    '\uFF23': 'C',
    '\u0106': 'C',
    '\u0108': 'C',
    '\u010A': 'C',
    '\u010C': 'C',
    '\u00C7': 'C',
    '\u1E08': 'C',
    '\u0187': 'C',
    '\u023B': 'C',
    '\uA73E': 'C',
    '\u24B9': 'D',
    '\uFF24': 'D',
    '\u1E0A': 'D',
    '\u010E': 'D',
    '\u1E0C': 'D',
    '\u1E10': 'D',
    '\u1E12': 'D',
    '\u1E0E': 'D',
    '\u0110': 'D',
    '\u018B': 'D',
    '\u018A': 'D',
    '\u0189': 'D',
    '\uA779': 'D',
    '\u01F1': 'DZ',
    '\u01C4': 'DZ',
    '\u01F2': 'Dz',
    '\u01C5': 'Dz',
    '\u24BA': 'E',
    '\uFF25': 'E',
    '\u00C8': 'E',
    '\u00C9': 'E',
    '\u00CA': 'E',
    '\u1EC0': 'E',
    '\u1EBE': 'E',
    '\u1EC4': 'E',
    '\u1EC2': 'E',
    '\u1EBC': 'E',
    '\u0112': 'E',
    '\u1E14': 'E',
    '\u1E16': 'E',
    '\u0114': 'E',
    '\u0116': 'E',
    '\u00CB': 'E',
    '\u1EBA': 'E',
    '\u011A': 'E',
    '\u0204': 'E',
    '\u0206': 'E',
    '\u1EB8': 'E',
    '\u1EC6': 'E',
    '\u0228': 'E',
    '\u1E1C': 'E',
    '\u0118': 'E',
    '\u1E18': 'E',
    '\u1E1A': 'E',
    '\u0190': 'E',
    '\u018E': 'E',
    '\u24BB': 'F',
    '\uFF26': 'F',
    '\u1E1E': 'F',
    '\u0191': 'F',
    '\uA77B': 'F',
    '\u24BC': 'G',
    '\uFF27': 'G',
    '\u01F4': 'G',
    '\u011C': 'G',
    '\u1E20': 'G',
    '\u011E': 'G',
    '\u0120': 'G',
    '\u01E6': 'G',
    '\u0122': 'G',
    '\u01E4': 'G',
    '\u0193': 'G',
    '\uA7A0': 'G',
    '\uA77D': 'G',
    '\uA77E': 'G',
    '\u24BD': 'H',
    '\uFF28': 'H',
    '\u0124': 'H',
    '\u1E22': 'H',
    '\u1E26': 'H',
    '\u021E': 'H',
    '\u1E24': 'H',
    '\u1E28': 'H',
    '\u1E2A': 'H',
    '\u0126': 'H',
    '\u2C67': 'H',
    '\u2C75': 'H',
    '\uA78D': 'H',
    '\u24BE': 'I',
    '\uFF29': 'I',
    '\u00CC': 'I',
    '\u00CD': 'I',
    '\u00CE': 'I',
    '\u0128': 'I',
    '\u012A': 'I',
    '\u012C': 'I',
    '\u0130': 'I',
    '\u00CF': 'I',
    '\u1E2E': 'I',
    '\u1EC8': 'I',
    '\u01CF': 'I',
    '\u0208': 'I',
    '\u020A': 'I',
    '\u1ECA': 'I',
    '\u012E': 'I',
    '\u1E2C': 'I',
    '\u0197': 'I',
    '\u24BF': 'J',
    '\uFF2A': 'J',
    '\u0134': 'J',
    '\u0248': 'J',
    '\u24C0': 'K',
    '\uFF2B': 'K',
    '\u1E30': 'K',
    '\u01E8': 'K',
    '\u1E32': 'K',
    '\u0136': 'K',
    '\u1E34': 'K',
    '\u0198': 'K',
    '\u2C69': 'K',
    '\uA740': 'K',
    '\uA742': 'K',
    '\uA744': 'K',
    '\uA7A2': 'K',
    '\u24C1': 'L',
    '\uFF2C': 'L',
    '\u013F': 'L',
    '\u0139': 'L',
    '\u013D': 'L',
    '\u1E36': 'L',
    '\u1E38': 'L',
    '\u013B': 'L',
    '\u1E3C': 'L',
    '\u1E3A': 'L',
    '\u0141': 'L',
    '\u023D': 'L',
    '\u2C62': 'L',
    '\u2C60': 'L',
    '\uA748': 'L',
    '\uA746': 'L',
    '\uA780': 'L',
    '\u01C7': 'LJ',
    '\u01C8': 'Lj',
    '\u24C2': 'M',
    '\uFF2D': 'M',
    '\u1E3E': 'M',
    '\u1E40': 'M',
    '\u1E42': 'M',
    '\u2C6E': 'M',
    '\u019C': 'M',
    '\u24C3': 'N',
    '\uFF2E': 'N',
    '\u01F8': 'N',
    '\u0143': 'N',
    '\u00D1': 'N',
    '\u1E44': 'N',
    '\u0147': 'N',
    '\u1E46': 'N',
    '\u0145': 'N',
    '\u1E4A': 'N',
    '\u1E48': 'N',
    '\u0220': 'N',
    '\u019D': 'N',
    '\uA790': 'N',
    '\uA7A4': 'N',
    '\u01CA': 'NJ',
    '\u01CB': 'Nj',
    '\u24C4': 'O',
    '\uFF2F': 'O',
    '\u00D2': 'O',
    '\u00D3': 'O',
    '\u00D4': 'O',
    '\u1ED2': 'O',
    '\u1ED0': 'O',
    '\u1ED6': 'O',
    '\u1ED4': 'O',
    '\u00D5': 'O',
    '\u1E4C': 'O',
    '\u022C': 'O',
    '\u1E4E': 'O',
    '\u014C': 'O',
    '\u1E50': 'O',
    '\u1E52': 'O',
    '\u014E': 'O',
    '\u022E': 'O',
    '\u0230': 'O',
    '\u00D6': 'O',
    '\u022A': 'O',
    '\u1ECE': 'O',
    '\u0150': 'O',
    '\u01D1': 'O',
    '\u020C': 'O',
    '\u020E': 'O',
    '\u01A0': 'O',
    '\u1EDC': 'O',
    '\u1EDA': 'O',
    '\u1EE0': 'O',
    '\u1EDE': 'O',
    '\u1EE2': 'O',
    '\u1ECC': 'O',
    '\u1ED8': 'O',
    '\u01EA': 'O',
    '\u01EC': 'O',
    '\u00D8': 'O',
    '\u01FE': 'O',
    '\u0186': 'O',
    '\u019F': 'O',
    '\uA74A': 'O',
    '\uA74C': 'O',
    '\u0152': 'OE',
    '\u01A2': 'OI',
    '\uA74E': 'OO',
    '\u0222': 'OU',
    '\u24C5': 'P',
    '\uFF30': 'P',
    '\u1E54': 'P',
    '\u1E56': 'P',
    '\u01A4': 'P',
    '\u2C63': 'P',
    '\uA750': 'P',
    '\uA752': 'P',
    '\uA754': 'P',
    '\u24C6': 'Q',
    '\uFF31': 'Q',
    '\uA756': 'Q',
    '\uA758': 'Q',
    '\u024A': 'Q',
    '\u24C7': 'R',
    '\uFF32': 'R',
    '\u0154': 'R',
    '\u1E58': 'R',
    '\u0158': 'R',
    '\u0210': 'R',
    '\u0212': 'R',
    '\u1E5A': 'R',
    '\u1E5C': 'R',
    '\u0156': 'R',
    '\u1E5E': 'R',
    '\u024C': 'R',
    '\u2C64': 'R',
    '\uA75A': 'R',
    '\uA7A6': 'R',
    '\uA782': 'R',
    '\u24C8': 'S',
    '\uFF33': 'S',
    '\u1E9E': 'S',
    '\u015A': 'S',
    '\u1E64': 'S',
    '\u015C': 'S',
    '\u1E60': 'S',
    '\u0160': 'S',
    '\u1E66': 'S',
    '\u1E62': 'S',
    '\u1E68': 'S',
    '\u0218': 'S',
    '\u015E': 'S',
    '\u2C7E': 'S',
    '\uA7A8': 'S',
    '\uA784': 'S',
    '\u24C9': 'T',
    '\uFF34': 'T',
    '\u1E6A': 'T',
    '\u0164': 'T',
    '\u1E6C': 'T',
    '\u021A': 'T',
    '\u0162': 'T',
    '\u1E70': 'T',
    '\u1E6E': 'T',
    '\u0166': 'T',
    '\u01AC': 'T',
    '\u01AE': 'T',
    '\u023E': 'T',
    '\uA786': 'T',
    '\uA728': 'TZ',
    '\u24CA': 'U',
    '\uFF35': 'U',
    '\u00D9': 'U',
    '\u00DA': 'U',
    '\u00DB': 'U',
    '\u0168': 'U',
    '\u1E78': 'U',
    '\u016A': 'U',
    '\u1E7A': 'U',
    '\u016C': 'U',
    '\u00DC': 'U',
    '\u01DB': 'U',
    '\u01D7': 'U',
    '\u01D5': 'U',
    '\u01D9': 'U',
    '\u1EE6': 'U',
    '\u016E': 'U',
    '\u0170': 'U',
    '\u01D3': 'U',
    '\u0214': 'U',
    '\u0216': 'U',
    '\u01AF': 'U',
    '\u1EEA': 'U',
    '\u1EE8': 'U',
    '\u1EEE': 'U',
    '\u1EEC': 'U',
    '\u1EF0': 'U',
    '\u1EE4': 'U',
    '\u1E72': 'U',
    '\u0172': 'U',
    '\u1E76': 'U',
    '\u1E74': 'U',
    '\u0244': 'U',
    '\u24CB': 'V',
    '\uFF36': 'V',
    '\u1E7C': 'V',
    '\u1E7E': 'V',
    '\u01B2': 'V',
    '\uA75E': 'V',
    '\u0245': 'V',
    '\uA760': 'VY',
    '\u24CC': 'W',
    '\uFF37': 'W',
    '\u1E80': 'W',
    '\u1E82': 'W',
    '\u0174': 'W',
    '\u1E86': 'W',
    '\u1E84': 'W',
    '\u1E88': 'W',
    '\u2C72': 'W',
    '\u24CD': 'X',
    '\uFF38': 'X',
    '\u1E8A': 'X',
    '\u1E8C': 'X',
    '\u24CE': 'Y',
    '\uFF39': 'Y',
    '\u1EF2': 'Y',
    '\u00DD': 'Y',
    '\u0176': 'Y',
    '\u1EF8': 'Y',
    '\u0232': 'Y',
    '\u1E8E': 'Y',
    '\u0178': 'Y',
    '\u1EF6': 'Y',
    '\u1EF4': 'Y',
    '\u01B3': 'Y',
    '\u024E': 'Y',
    '\u1EFE': 'Y',
    '\u24CF': 'Z',
    '\uFF3A': 'Z',
    '\u0179': 'Z',
    '\u1E90': 'Z',
    '\u017B': 'Z',
    '\u017D': 'Z',
    '\u1E92': 'Z',
    '\u1E94': 'Z',
    '\u01B5': 'Z',
    '\u0224': 'Z',
    '\u2C7F': 'Z',
    '\u2C6B': 'Z',
    '\uA762': 'Z',
    '\u24D0': 'a',
    '\uFF41': 'a',
    '\u1E9A': 'a',
    '\u00E0': 'a',
    '\u00E1': 'a',
    '\u00E2': 'a',
    '\u1EA7': 'a',
    '\u1EA5': 'a',
    '\u1EAB': 'a',
    '\u1EA9': 'a',
    '\u00E3': 'a',
    '\u0101': 'a',
    '\u0103': 'a',
    '\u1EB1': 'a',
    '\u1EAF': 'a',
    '\u1EB5': 'a',
    '\u1EB3': 'a',
    '\u0227': 'a',
    '\u01E1': 'a',
    '\u00E4': 'a',
    '\u01DF': 'a',
    '\u1EA3': 'a',
    '\u00E5': 'a',
    '\u01FB': 'a',
    '\u01CE': 'a',
    '\u0201': 'a',
    '\u0203': 'a',
    '\u1EA1': 'a',
    '\u1EAD': 'a',
    '\u1EB7': 'a',
    '\u1E01': 'a',
    '\u0105': 'a',
    '\u2C65': 'a',
    '\u0250': 'a',
    '\uA733': 'aa',
    '\u00E6': 'ae',
    '\u01FD': 'ae',
    '\u01E3': 'ae',
    '\uA735': 'ao',
    '\uA737': 'au',
    '\uA739': 'av',
    '\uA73B': 'av',
    '\uA73D': 'ay',
    '\u24D1': 'b',
    '\uFF42': 'b',
    '\u1E03': 'b',
    '\u1E05': 'b',
    '\u1E07': 'b',
    '\u0180': 'b',
    '\u0183': 'b',
    '\u0253': 'b',
    '\u24D2': 'c',
    '\uFF43': 'c',
    '\u0107': 'c',
    '\u0109': 'c',
    '\u010B': 'c',
    '\u010D': 'c',
    '\u00E7': 'c',
    '\u1E09': 'c',
    '\u0188': 'c',
    '\u023C': 'c',
    '\uA73F': 'c',
    '\u2184': 'c',
    '\u24D3': 'd',
    '\uFF44': 'd',
    '\u1E0B': 'd',
    '\u010F': 'd',
    '\u1E0D': 'd',
    '\u1E11': 'd',
    '\u1E13': 'd',
    '\u1E0F': 'd',
    '\u0111': 'd',
    '\u018C': 'd',
    '\u0256': 'd',
    '\u0257': 'd',
    '\uA77A': 'd',
    '\u01F3': 'dz',
    '\u01C6': 'dz',
    '\u24D4': 'e',
    '\uFF45': 'e',
    '\u00E8': 'e',
    '\u00E9': 'e',
    '\u00EA': 'e',
    '\u1EC1': 'e',
    '\u1EBF': 'e',
    '\u1EC5': 'e',
    '\u1EC3': 'e',
    '\u1EBD': 'e',
    '\u0113': 'e',
    '\u1E15': 'e',
    '\u1E17': 'e',
    '\u0115': 'e',
    '\u0117': 'e',
    '\u00EB': 'e',
    '\u1EBB': 'e',
    '\u011B': 'e',
    '\u0205': 'e',
    '\u0207': 'e',
    '\u1EB9': 'e',
    '\u1EC7': 'e',
    '\u0229': 'e',
    '\u1E1D': 'e',
    '\u0119': 'e',
    '\u1E19': 'e',
    '\u1E1B': 'e',
    '\u0247': 'e',
    '\u025B': 'e',
    '\u01DD': 'e',
    '\u24D5': 'f',
    '\uFF46': 'f',
    '\u1E1F': 'f',
    '\u0192': 'f',
    '\uA77C': 'f',
    '\u24D6': 'g',
    '\uFF47': 'g',
    '\u01F5': 'g',
    '\u011D': 'g',
    '\u1E21': 'g',
    '\u011F': 'g',
    '\u0121': 'g',
    '\u01E7': 'g',
    '\u0123': 'g',
    '\u01E5': 'g',
    '\u0260': 'g',
    '\uA7A1': 'g',
    '\u1D79': 'g',
    '\uA77F': 'g',
    '\u24D7': 'h',
    '\uFF48': 'h',
    '\u0125': 'h',
    '\u1E23': 'h',
    '\u1E27': 'h',
    '\u021F': 'h',
    '\u1E25': 'h',
    '\u1E29': 'h',
    '\u1E2B': 'h',
    '\u1E96': 'h',
    '\u0127': 'h',
    '\u2C68': 'h',
    '\u2C76': 'h',
    '\u0265': 'h',
    '\u0195': 'hv',
    '\u24D8': 'i',
    '\uFF49': 'i',
    '\u00EC': 'i',
    '\u00ED': 'i',
    '\u00EE': 'i',
    '\u0129': 'i',
    '\u012B': 'i',
    '\u012D': 'i',
    '\u00EF': 'i',
    '\u1E2F': 'i',
    '\u1EC9': 'i',
    '\u01D0': 'i',
    '\u0209': 'i',
    '\u020B': 'i',
    '\u1ECB': 'i',
    '\u012F': 'i',
    '\u1E2D': 'i',
    '\u0268': 'i',
    '\u0131': 'i',
    '\u24D9': 'j',
    '\uFF4A': 'j',
    '\u0135': 'j',
    '\u01F0': 'j',
    '\u0249': 'j',
    '\u24DA': 'k',
    '\uFF4B': 'k',
    '\u1E31': 'k',
    '\u01E9': 'k',
    '\u1E33': 'k',
    '\u0137': 'k',
    '\u1E35': 'k',
    '\u0199': 'k',
    '\u2C6A': 'k',
    '\uA741': 'k',
    '\uA743': 'k',
    '\uA745': 'k',
    '\uA7A3': 'k',
    '\u24DB': 'l',
    '\uFF4C': 'l',
    '\u0140': 'l',
    '\u013A': 'l',
    '\u013E': 'l',
    '\u1E37': 'l',
    '\u1E39': 'l',
    '\u013C': 'l',
    '\u1E3D': 'l',
    '\u1E3B': 'l',
    '\u017F': 'l',
    '\u0142': 'l',
    '\u019A': 'l',
    '\u026B': 'l',
    '\u2C61': 'l',
    '\uA749': 'l',
    '\uA781': 'l',
    '\uA747': 'l',
    '\u01C9': 'lj',
    '\u24DC': 'm',
    '\uFF4D': 'm',
    '\u1E3F': 'm',
    '\u1E41': 'm',
    '\u1E43': 'm',
    '\u0271': 'm',
    '\u026F': 'm',
    '\u24DD': 'n',
    '\uFF4E': 'n',
    '\u01F9': 'n',
    '\u0144': 'n',
    '\u00F1': 'n',
    '\u1E45': 'n',
    '\u0148': 'n',
    '\u1E47': 'n',
    '\u0146': 'n',
    '\u1E4B': 'n',
    '\u1E49': 'n',
    '\u019E': 'n',
    '\u0272': 'n',
    '\u0149': 'n',
    '\uA791': 'n',
    '\uA7A5': 'n',
    '\u01CC': 'nj',
    '\u24DE': 'o',
    '\uFF4F': 'o',
    '\u00F2': 'o',
    '\u00F3': 'o',
    '\u00F4': 'o',
    '\u1ED3': 'o',
    '\u1ED1': 'o',
    '\u1ED7': 'o',
    '\u1ED5': 'o',
    '\u00F5': 'o',
    '\u1E4D': 'o',
    '\u022D': 'o',
    '\u1E4F': 'o',
    '\u014D': 'o',
    '\u1E51': 'o',
    '\u1E53': 'o',
    '\u014F': 'o',
    '\u022F': 'o',
    '\u0231': 'o',
    '\u00F6': 'o',
    '\u022B': 'o',
    '\u1ECF': 'o',
    '\u0151': 'o',
    '\u01D2': 'o',
    '\u020D': 'o',
    '\u020F': 'o',
    '\u01A1': 'o',
    '\u1EDD': 'o',
    '\u1EDB': 'o',
    '\u1EE1': 'o',
    '\u1EDF': 'o',
    '\u1EE3': 'o',
    '\u1ECD': 'o',
    '\u1ED9': 'o',
    '\u01EB': 'o',
    '\u01ED': 'o',
    '\u00F8': 'o',
    '\u01FF': 'o',
    '\u0254': 'o',
    '\uA74B': 'o',
    '\uA74D': 'o',
    '\u0275': 'o',
    '\u0153': 'oe',
    '\u01A3': 'oi',
    '\u0223': 'ou',
    '\uA74F': 'oo',
    '\u24DF': 'p',
    '\uFF50': 'p',
    '\u1E55': 'p',
    '\u1E57': 'p',
    '\u01A5': 'p',
    '\u1D7D': 'p',
    '\uA751': 'p',
    '\uA753': 'p',
    '\uA755': 'p',
    '\u24E0': 'q',
    '\uFF51': 'q',
    '\u024B': 'q',
    '\uA757': 'q',
    '\uA759': 'q',
    '\u24E1': 'r',
    '\uFF52': 'r',
    '\u0155': 'r',
    '\u1E59': 'r',
    '\u0159': 'r',
    '\u0211': 'r',
    '\u0213': 'r',
    '\u1E5B': 'r',
    '\u1E5D': 'r',
    '\u0157': 'r',
    '\u1E5F': 'r',
    '\u024D': 'r',
    '\u027D': 'r',
    '\uA75B': 'r',
    '\uA7A7': 'r',
    '\uA783': 'r',
    '\u24E2': 's',
    '\uFF53': 's',
    '\u00DF': 's',
    '\u015B': 's',
    '\u1E65': 's',
    '\u015D': 's',
    '\u1E61': 's',
    '\u0161': 's',
    '\u1E67': 's',
    '\u1E63': 's',
    '\u1E69': 's',
    '\u0219': 's',
    '\u015F': 's',
    '\u023F': 's',
    '\uA7A9': 's',
    '\uA785': 's',
    '\u1E9B': 's',
    '\u24E3': 't',
    '\uFF54': 't',
    '\u1E6B': 't',
    '\u1E97': 't',
    '\u0165': 't',
    '\u1E6D': 't',
    '\u021B': 't',
    '\u0163': 't',
    '\u1E71': 't',
    '\u1E6F': 't',
    '\u0167': 't',
    '\u01AD': 't',
    '\u0288': 't',
    '\u2C66': 't',
    '\uA787': 't',
    '\uA729': 'tz',
    '\u24E4': 'u',
    '\uFF55': 'u',
    '\u00F9': 'u',
    '\u00FA': 'u',
    '\u00FB': 'u',
    '\u0169': 'u',
    '\u1E79': 'u',
    '\u016B': 'u',
    '\u1E7B': 'u',
    '\u016D': 'u',
    '\u00FC': 'u',
    '\u01DC': 'u',
    '\u01D8': 'u',
    '\u01D6': 'u',
    '\u01DA': 'u',
    '\u1EE7': 'u',
    '\u016F': 'u',
    '\u0171': 'u',
    '\u01D4': 'u',
    '\u0215': 'u',
    '\u0217': 'u',
    '\u01B0': 'u',
    '\u1EEB': 'u',
    '\u1EE9': 'u',
    '\u1EEF': 'u',
    '\u1EED': 'u',
    '\u1EF1': 'u',
    '\u1EE5': 'u',
    '\u1E73': 'u',
    '\u0173': 'u',
    '\u1E77': 'u',
    '\u1E75': 'u',
    '\u0289': 'u',
    '\u24E5': 'v',
    '\uFF56': 'v',
    '\u1E7D': 'v',
    '\u1E7F': 'v',
    '\u028B': 'v',
    '\uA75F': 'v',
    '\u028C': 'v',
    '\uA761': 'vy',
    '\u24E6': 'w',
    '\uFF57': 'w',
    '\u1E81': 'w',
    '\u1E83': 'w',
    '\u0175': 'w',
    '\u1E87': 'w',
    '\u1E85': 'w',
    '\u1E98': 'w',
    '\u1E89': 'w',
    '\u2C73': 'w',
    '\u24E7': 'x',
    '\uFF58': 'x',
    '\u1E8B': 'x',
    '\u1E8D': 'x',
    '\u24E8': 'y',
    '\uFF59': 'y',
    '\u1EF3': 'y',
    '\u00FD': 'y',
    '\u0177': 'y',
    '\u1EF9': 'y',
    '\u0233': 'y',
    '\u1E8F': 'y',
    '\u00FF': 'y',
    '\u1EF7': 'y',
    '\u1E99': 'y',
    '\u1EF5': 'y',
    '\u01B4': 'y',
    '\u024F': 'y',
    '\u1EFF': 'y',
    '\u24E9': 'z',
    '\uFF5A': 'z',
    '\u017A': 'z',
    '\u1E91': 'z',
    '\u017C': 'z',
    '\u017E': 'z',
    '\u1E93': 'z',
    '\u1E95': 'z',
    '\u01B6': 'z',
    '\u0225': 'z',
    '\u0240': 'z',
    '\u2C6C': 'z',
    '\uA763': 'z',
    '\u0386': '\u0391',
    '\u0388': '\u0395',
    '\u0389': '\u0397',
    '\u038A': '\u0399',
    '\u03AA': '\u0399',
    '\u038C': '\u039F',
    '\u038E': '\u03A5',
    '\u03AB': '\u03A5',
    '\u038F': '\u03A9',
    '\u03AC': '\u03B1',
    '\u03AD': '\u03B5',
    '\u03AE': '\u03B7',
    '\u03AF': '\u03B9',
    '\u03CA': '\u03B9',
    '\u0390': '\u03B9',
    '\u03CC': '\u03BF',
    '\u03CD': '\u03C5',
    '\u03CB': '\u03C5',
    '\u03B0': '\u03C5',
    '\u03CE': '\u03C9',
    '\u03C2': '\u03C3',
    '\u2019': '\''
  };

  return diacritics;
});

S2.define('select2/data/base',[
  '../utils'
], function (Utils) {
  function BaseAdapter ($element, options) {
    BaseAdapter.__super__.constructor.call(this);
  }

  Utils.Extend(BaseAdapter, Utils.Observable);

  BaseAdapter.prototype.current = function (callback) {
    throw new Error('The `current` method must be defined in child classes.');
  };

  BaseAdapter.prototype.query = function (params, callback) {
    throw new Error('The `query` method must be defined in child classes.');
  };

  BaseAdapter.prototype.bind = function (container, $container) {
    // Can be implemented in subclasses
  };

  BaseAdapter.prototype.destroy = function () {
    // Can be implemented in subclasses
  };

  BaseAdapter.prototype.generateResultId = function (container, data) {
    var id = container.id + '-result-';

    id += Utils.generateChars(4);

    if (data.id != null) {
      id += '-' + data.id.toString();
    } else {
      id += '-' + Utils.generateChars(4);
    }
    return id;
  };

  return BaseAdapter;
});

S2.define('select2/data/select',[
  './base',
  '../utils',
  'jquery'
], function (BaseAdapter, Utils, $) {
  function SelectAdapter ($element, options) {
    this.$element = $element;
    this.options = options;

    SelectAdapter.__super__.constructor.call(this);
  }

  Utils.Extend(SelectAdapter, BaseAdapter);

  SelectAdapter.prototype.current = function (callback) {
    var data = [];
    var self = this;

    this.$element.find(':selected').each(function () {
      var $option = $(this);

      var option = self.item($option);

      data.push(option);
    });

    callback(data);
  };

  SelectAdapter.prototype.select = function (data) {
    var self = this;

    data.selected = true;

    // If data.element is a DOM node, use it instead
    if ($(data.element).is('option')) {
      data.element.selected = true;

      this.$element.trigger('change');

      return;
    }

    if (this.$element.prop('multiple')) {
      this.current(function (currentData) {
        var val = [];

        data = [data];
        data.push.apply(data, currentData);

        for (var d = 0; d < data.length; d++) {
          var id = data[d].id;

          if ($.inArray(id, val) === -1) {
            val.push(id);
          }
        }

        self.$element.val(val);
        self.$element.trigger('change');
      });
    } else {
      var val = data.id;

      this.$element.val(val);
      this.$element.trigger('change');
    }
  };

  SelectAdapter.prototype.unselect = function (data) {
    var self = this;

    if (!this.$element.prop('multiple')) {
      return;
    }

    data.selected = false;

    if ($(data.element).is('option')) {
      data.element.selected = false;

      this.$element.trigger('change');

      return;
    }

    this.current(function (currentData) {
      var val = [];

      for (var d = 0; d < currentData.length; d++) {
        var id = currentData[d].id;

        if (id !== data.id && $.inArray(id, val) === -1) {
          val.push(id);
        }
      }

      self.$element.val(val);

      self.$element.trigger('change');
    });
  };

  SelectAdapter.prototype.bind = function (container, $container) {
    var self = this;

    this.container = container;

    container.on('select', function (params) {
      self.select(params.data);
    });

    container.on('unselect', function (params) {
      self.unselect(params.data);
    });
  };

  SelectAdapter.prototype.destroy = function () {
    // Remove anything added to child elements
    this.$element.find('*').each(function () {
      // Remove any custom data set by Select2
      Utils.RemoveData(this);
    });
  };

  SelectAdapter.prototype.query = function (params, callback) {
    var data = [];
    var self = this;

    var $options = this.$element.children();

    $options.each(function () {
      var $option = $(this);

      if (!$option.is('option') && !$option.is('optgroup')) {
        return;
      }

      var option = self.item($option);

      var matches = self.matches(params, option);

      if (matches !== null) {
        data.push(matches);
      }
    });

    callback({
      results: data
    });
  };

  SelectAdapter.prototype.addOptions = function ($options) {
    Utils.appendMany(this.$element, $options);
  };

  SelectAdapter.prototype.option = function (data) {
    var option;

    if (data.children) {
      option = document.createElement('optgroup');
      option.label = data.text;
    } else {
      option = document.createElement('option');

      if (option.textContent !== undefined) {
        option.textContent = data.text;
      } else {
        option.innerText = data.text;
      }
    }

    if (data.id !== undefined) {
      option.value = data.id;
    }

    if (data.disabled) {
      option.disabled = true;
    }

    if (data.selected) {
      option.selected = true;
    }

    if (data.title) {
      option.title = data.title;
    }

    var $option = $(option);

    var normalizedData = this._normalizeItem(data);
    normalizedData.element = option;

    // Override the option's data with the combined data
    Utils.StoreData(option, 'data', normalizedData);

    return $option;
  };

  SelectAdapter.prototype.item = function ($option) {
    var data = {};

    data = Utils.GetData($option[0], 'data');

    if (data != null) {
      return data;
    }

    if ($option.is('option')) {
      data = {
        id: $option.val(),
        text: $option.text(),
        disabled: $option.prop('disabled'),
        selected: $option.prop('selected'),
        title: $option.prop('title')
      };
    } else if ($option.is('optgroup')) {
      data = {
        text: $option.prop('label'),
        children: [],
        title: $option.prop('title')
      };

      var $children = $option.children('option');
      var children = [];

      for (var c = 0; c < $children.length; c++) {
        var $child = $($children[c]);

        var child = this.item($child);

        children.push(child);
      }

      data.children = children;
    }

    data = this._normalizeItem(data);
    data.element = $option[0];

    Utils.StoreData($option[0], 'data', data);

    return data;
  };

  SelectAdapter.prototype._normalizeItem = function (item) {
    if (item !== Object(item)) {
      item = {
        id: item,
        text: item
      };
    }

    item = $.extend({}, {
      text: ''
    }, item);

    var defaults = {
      selected: false,
      disabled: false
    };

    if (item.id != null) {
      item.id = item.id.toString();
    }

    if (item.text != null) {
      item.text = item.text.toString();
    }

    if (item._resultId == null && item.id && this.container != null) {
      item._resultId = this.generateResultId(this.container, item);
    }

    return $.extend({}, defaults, item);
  };

  SelectAdapter.prototype.matches = function (params, data) {
    var matcher = this.options.get('matcher');

    return matcher(params, data);
  };

  return SelectAdapter;
});

S2.define('select2/data/array',[
  './select',
  '../utils',
  'jquery'
], function (SelectAdapter, Utils, $) {
  function ArrayAdapter ($element, options) {
    this._dataToConvert = options.get('data') || [];

    ArrayAdapter.__super__.constructor.call(this, $element, options);
  }

  Utils.Extend(ArrayAdapter, SelectAdapter);

  ArrayAdapter.prototype.bind = function (container, $container) {
    ArrayAdapter.__super__.bind.call(this, container, $container);

    this.addOptions(this.convertToOptions(this._dataToConvert));
  };

  ArrayAdapter.prototype.select = function (data) {
    var $option = this.$element.find('option').filter(function (i, elm) {
      return elm.value == data.id.toString();
    });

    if ($option.length === 0) {
      $option = this.option(data);

      this.addOptions($option);
    }

    ArrayAdapter.__super__.select.call(this, data);
  };

  ArrayAdapter.prototype.convertToOptions = function (data) {
    var self = this;

    var $existing = this.$element.find('option');
    var existingIds = $existing.map(function () {
      return self.item($(this)).id;
    }).get();

    var $options = [];

    // Filter out all items except for the one passed in the argument
    function onlyItem (item) {
      return function () {
        return $(this).val() == item.id;
      };
    }

    for (var d = 0; d < data.length; d++) {
      var item = this._normalizeItem(data[d]);

      // Skip items which were pre-loaded, only merge the data
      if ($.inArray(item.id, existingIds) >= 0) {
        var $existingOption = $existing.filter(onlyItem(item));

        var existingData = this.item($existingOption);
        var newData = $.extend(true, {}, item, existingData);

        var $newOption = this.option(newData);

        $existingOption.replaceWith($newOption);

        continue;
      }

      var $option = this.option(item);

      if (item.children) {
        var $children = this.convertToOptions(item.children);

        Utils.appendMany($option, $children);
      }

      $options.push($option);
    }

    return $options;
  };

  return ArrayAdapter;
});

S2.define('select2/data/ajax',[
  './array',
  '../utils',
  'jquery'
], function (ArrayAdapter, Utils, $) {
  function AjaxAdapter ($element, options) {
    this.ajaxOptions = this._applyDefaults(options.get('ajax'));

    if (this.ajaxOptions.processResults != null) {
      this.processResults = this.ajaxOptions.processResults;
    }

    AjaxAdapter.__super__.constructor.call(this, $element, options);
  }

  Utils.Extend(AjaxAdapter, ArrayAdapter);

  AjaxAdapter.prototype._applyDefaults = function (options) {
    var defaults = {
      data: function (params) {
        return $.extend({}, params, {
          q: params.term
        });
      },
      transport: function (params, success, failure) {
        var $request = $.ajax(params);

        $request.then(success);
        $request.fail(failure);

        return $request;
      }
    };

    return $.extend({}, defaults, options, true);
  };

  AjaxAdapter.prototype.processResults = function (results) {
    return results;
  };

  AjaxAdapter.prototype.query = function (params, callback) {
    var matches = [];
    var self = this;

    if (this._request != null) {
      // JSONP requests cannot always be aborted
      if ($.isFunction(this._request.abort)) {
        this._request.abort();
      }

      this._request = null;
    }

    var options = $.extend({
      type: 'GET'
    }, this.ajaxOptions);

    if (typeof options.url === 'function') {
      options.url = options.url.call(this.$element, params);
    }

    if (typeof options.data === 'function') {
      options.data = options.data.call(this.$element, params);
    }

    function request () {
      var $request = options.transport(options, function (data) {
        var results = self.processResults(data, params);

        if (self.options.get('debug') && window.console && console.error) {
          // Check to make sure that the response included a `results` key.
          if (!results || !results.results || !$.isArray(results.results)) {
            console.error(
              'Select2: The AJAX results did not return an array in the ' +
              '`results` key of the response.'
            );
          }
        }

        callback(results);
      }, function () {
        // Attempt to detect if a request was aborted
        // Only works if the transport exposes a status property
        if ('status' in $request &&
            ($request.status === 0 || $request.status === '0')) {
          return;
        }

        self.trigger('results:message', {
          message: 'errorLoading'
        });
      });

      self._request = $request;
    }

    if (this.ajaxOptions.delay && params.term != null) {
      if (this._queryTimeout) {
        window.clearTimeout(this._queryTimeout);
      }

      this._queryTimeout = window.setTimeout(request, this.ajaxOptions.delay);
    } else {
      request();
    }
  };

  return AjaxAdapter;
});

S2.define('select2/data/tags',[
  'jquery'
], function ($) {
  function Tags (decorated, $element, options) {
    var tags = options.get('tags');

    var createTag = options.get('createTag');

    if (createTag !== undefined) {
      this.createTag = createTag;
    }

    var insertTag = options.get('insertTag');

    if (insertTag !== undefined) {
        this.insertTag = insertTag;
    }

    decorated.call(this, $element, options);

    if ($.isArray(tags)) {
      for (var t = 0; t < tags.length; t++) {
        var tag = tags[t];
        var item = this._normalizeItem(tag);

        var $option = this.option(item);

        this.$element.append($option);
      }
    }
  }

  Tags.prototype.query = function (decorated, params, callback) {
    var self = this;

    this._removeOldTags();

    if (params.term == null || params.page != null) {
      decorated.call(this, params, callback);
      return;
    }

    function wrapper (obj, child) {
      var data = obj.results;

      for (var i = 0; i < data.length; i++) {
        var option = data[i];

        var checkChildren = (
          option.children != null &&
          !wrapper({
            results: option.children
          }, true)
        );

        var optionText = (option.text || '').toUpperCase();
        var paramsTerm = (params.term || '').toUpperCase();

        var checkText = optionText === paramsTerm;

        if (checkText || checkChildren) {
          if (child) {
            return false;
          }

          obj.data = data;
          callback(obj);

          return;
        }
      }

      if (child) {
        return true;
      }

      var tag = self.createTag(params);

      if (tag != null) {
        var $option = self.option(tag);
        $option.attr('data-select2-tag', true);

        self.addOptions([$option]);

        self.insertTag(data, tag);
      }

      obj.results = data;

      callback(obj);
    }

    decorated.call(this, params, wrapper);
  };

  Tags.prototype.createTag = function (decorated, params) {
    var term = $.trim(params.term);

    if (term === '') {
      return null;
    }

    return {
      id: term,
      text: term
    };
  };

  Tags.prototype.insertTag = function (_, data, tag) {
    data.unshift(tag);
  };

  Tags.prototype._removeOldTags = function (_) {
    var $options = this.$element.find('option[data-select2-tag]');

    $options.each(function () {
      if (this.selected) {
        return;
      }

      $(this).remove();
    });
  };

  return Tags;
});

S2.define('select2/data/tokenizer',[
  'jquery'
], function ($) {
  function Tokenizer (decorated, $element, options) {
    var tokenizer = options.get('tokenizer');

    if (tokenizer !== undefined) {
      this.tokenizer = tokenizer;
    }

    decorated.call(this, $element, options);
  }

  Tokenizer.prototype.bind = function (decorated, container, $container) {
    decorated.call(this, container, $container);

    this.$search =  container.dropdown.$search || container.selection.$search ||
      $container.find('.select2-search__field');
  };

  Tokenizer.prototype.query = function (decorated, params, callback) {
    var self = this;

    function createAndSelect (data) {
      // Normalize the data object so we can use it for checks
      var item = self._normalizeItem(data);

      // Check if the data object already exists as a tag
      // Select it if it doesn't
      var $existingOptions = self.$element.find('option').filter(function () {
        return $(this).val() === item.id;
      });

      // If an existing option wasn't found for it, create the option
      if (!$existingOptions.length) {
        var $option = self.option(item);
        $option.attr('data-select2-tag', true);

        self._removeOldTags();
        self.addOptions([$option]);
      }

      // Select the item, now that we know there is an option for it
      select(item);
    }

    function select (data) {
      self.trigger('select', {
        data: data
      });
    }

    params.term = params.term || '';

    var tokenData = this.tokenizer(params, this.options, createAndSelect);

    if (tokenData.term !== params.term) {
      // Replace the search term if we have the search box
      if (this.$search.length) {
        this.$search.val(tokenData.term);
        this.$search.trigger('focus');
      }

      params.term = tokenData.term;
    }

    decorated.call(this, params, callback);
  };

  Tokenizer.prototype.tokenizer = function (_, params, options, callback) {
    var separators = options.get('tokenSeparators') || [];
    var term = params.term;
    var i = 0;

    var createTag = this.createTag || function (params) {
      return {
        id: params.term,
        text: params.term
      };
    };

    while (i < term.length) {
      var termChar = term[i];

      if ($.inArray(termChar, separators) === -1) {
        i++;

        continue;
      }

      var part = term.substr(0, i);
      var partParams = $.extend({}, params, {
        term: part
      });

      var data = createTag(partParams);

      if (data == null) {
        i++;
        continue;
      }

      callback(data);

      // Reset the term to not include the tokenized portion
      term = term.substr(i + 1) || '';
      i = 0;
    }

    return {
      term: term
    };
  };

  return Tokenizer;
});

S2.define('select2/data/minimumInputLength',[

], function () {
  function MinimumInputLength (decorated, $e, options) {
    this.minimumInputLength = options.get('minimumInputLength');

    decorated.call(this, $e, options);
  }

  MinimumInputLength.prototype.query = function (decorated, params, callback) {
    params.term = params.term || '';

    if (params.term.length < this.minimumInputLength) {
      this.trigger('results:message', {
        message: 'inputTooShort',
        args: {
          minimum: this.minimumInputLength,
          input: params.term,
          params: params
        }
      });

      return;
    }

    decorated.call(this, params, callback);
  };

  return MinimumInputLength;
});

S2.define('select2/data/maximumInputLength',[

], function () {
  function MaximumInputLength (decorated, $e, options) {
    this.maximumInputLength = options.get('maximumInputLength');

    decorated.call(this, $e, options);
  }

  MaximumInputLength.prototype.query = function (decorated, params, callback) {
    params.term = params.term || '';

    if (this.maximumInputLength > 0 &&
        params.term.length > this.maximumInputLength) {
      this.trigger('results:message', {
        message: 'inputTooLong',
        args: {
          maximum: this.maximumInputLength,
          input: params.term,
          params: params
        }
      });

      return;
    }

    decorated.call(this, params, callback);
  };

  return MaximumInputLength;
});

S2.define('select2/data/maximumSelectionLength',[

], function (){
  function MaximumSelectionLength (decorated, $e, options) {
    this.maximumSelectionLength = options.get('maximumSelectionLength');

    decorated.call(this, $e, options);
  }

  MaximumSelectionLength.prototype.bind =
    function (decorated, container, $container) {
      var self = this;

      decorated.call(this, container, $container);

      container.on('select', function () {
        self._checkIfMaximumSelected();
      });
  };

  MaximumSelectionLength.prototype.query =
    function (decorated, params, callback) {
      var self = this;

      this._checkIfMaximumSelected(function () {
        decorated.call(self, params, callback);
      });
  };

  MaximumSelectionLength.prototype._checkIfMaximumSelected =
    function (_, successCallback) {
      var self = this;

      this.current(function (currentData) {
        var count = currentData != null ? currentData.length : 0;
        if (self.maximumSelectionLength > 0 &&
          count >= self.maximumSelectionLength) {
          self.trigger('results:message', {
            message: 'maximumSelected',
            args: {
              maximum: self.maximumSelectionLength
            }
          });
          return;
        }

        if (successCallback) {
          successCallback();
        }
      });
  };

  return MaximumSelectionLength;
});

S2.define('select2/dropdown',[
  'jquery',
  './utils'
], function ($, Utils) {
  function Dropdown ($element, options) {
    this.$element = $element;
    this.options = options;

    Dropdown.__super__.constructor.call(this);
  }

  Utils.Extend(Dropdown, Utils.Observable);

  Dropdown.prototype.render = function () {
    var $dropdown = $(
      '<span class="select2-dropdown">' +
        '<span class="select2-results"></span>' +
      '</span>'
    );

    $dropdown.attr('dir', this.options.get('dir'));

    this.$dropdown = $dropdown;

    return $dropdown;
  };

  Dropdown.prototype.bind = function () {
    // Should be implemented in subclasses
  };

  Dropdown.prototype.position = function ($dropdown, $container) {
    // Should be implemented in subclasses
  };

  Dropdown.prototype.destroy = function () {
    // Remove the dropdown from the DOM
    this.$dropdown.remove();
  };

  return Dropdown;
});

S2.define('select2/dropdown/search',[
  'jquery',
  '../utils'
], function ($, Utils) {
  function Search () { }

  Search.prototype.render = function (decorated) {
    var $rendered = decorated.call(this);

    var $search = $(
      '<span class="select2-search select2-search--dropdown">' +
        '<input class="select2-search__field" type="search" tabindex="-1"' +
        ' autocomplete="off" autocorrect="off" autocapitalize="none"' +
        ' spellcheck="false" role="searchbox" aria-autocomplete="list" />' +
      '</span>'
    );

    this.$searchContainer = $search;
    this.$search = $search.find('input');

    $rendered.prepend($search);

    return $rendered;
  };

  Search.prototype.bind = function (decorated, container, $container) {
    var self = this;

    var resultsId = container.id + '-results';

    decorated.call(this, container, $container);

    this.$search.on('keydown', function (evt) {
      self.trigger('keypress', evt);

      self._keyUpPrevented = evt.isDefaultPrevented();
    });

    // Workaround for browsers which do not support the `input` event
    // This will prevent double-triggering of events for browsers which support
    // both the `keyup` and `input` events.
    this.$search.on('input', function (evt) {
      // Unbind the duplicated `keyup` event
      $(this).off('keyup');
    });

    this.$search.on('keyup input', function (evt) {
      self.handleSearch(evt);
    });

    container.on('open', function () {
      self.$search.attr('tabindex', 0);
      self.$search.attr('aria-controls', resultsId);

      self.$search.trigger('focus');

      window.setTimeout(function () {
        self.$search.trigger('focus');
      }, 0);
    });

    container.on('close', function () {
      self.$search.attr('tabindex', -1);
      self.$search.removeAttr('aria-controls');
      self.$search.removeAttr('aria-activedescendant');

      self.$search.val('');
      self.$search.trigger('blur');
    });

    container.on('focus', function () {
      if (!container.isOpen()) {
        self.$search.trigger('focus');
      }
    });

    container.on('results:all', function (params) {
      if (params.query.term == null || params.query.term === '') {
        var showSearch = self.showSearch(params);

        if (showSearch) {
          self.$searchContainer.removeClass('select2-search--hide');
        } else {
          self.$searchContainer.addClass('select2-search--hide');
        }
      }
    });

    container.on('results:focus', function (params) {
      if (params.data._resultId) {
        self.$search.attr('aria-activedescendant', params.data._resultId);
      } else {
        self.$search.removeAttr('aria-activedescendant');
      }
    });
  };

  Search.prototype.handleSearch = function (evt) {
    if (!this._keyUpPrevented) {
      var input = this.$search.val();

      this.trigger('query', {
        term: input
      });
    }

    this._keyUpPrevented = false;
  };

  Search.prototype.showSearch = function (_, params) {
    return true;
  };

  return Search;
});

S2.define('select2/dropdown/hidePlaceholder',[

], function () {
  function HidePlaceholder (decorated, $element, options, dataAdapter) {
    this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

    decorated.call(this, $element, options, dataAdapter);
  }

  HidePlaceholder.prototype.append = function (decorated, data) {
    data.results = this.removePlaceholder(data.results);

    decorated.call(this, data);
  };

  HidePlaceholder.prototype.normalizePlaceholder = function (_, placeholder) {
    if (typeof placeholder === 'string') {
      placeholder = {
        id: '',
        text: placeholder
      };
    }

    return placeholder;
  };

  HidePlaceholder.prototype.removePlaceholder = function (_, data) {
    var modifiedData = data.slice(0);

    for (var d = data.length - 1; d >= 0; d--) {
      var item = data[d];

      if (this.placeholder.id === item.id) {
        modifiedData.splice(d, 1);
      }
    }

    return modifiedData;
  };

  return HidePlaceholder;
});

S2.define('select2/dropdown/infiniteScroll',[
  'jquery'
], function ($) {
  function InfiniteScroll (decorated, $element, options, dataAdapter) {
    this.lastParams = {};

    decorated.call(this, $element, options, dataAdapter);

    this.$loadingMore = this.createLoadingMore();
    this.loading = false;
  }

  InfiniteScroll.prototype.append = function (decorated, data) {
    this.$loadingMore.remove();
    this.loading = false;

    decorated.call(this, data);

    if (this.showLoadingMore(data)) {
      this.$results.append(this.$loadingMore);
      this.loadMoreIfNeeded();
    }
  };

  InfiniteScroll.prototype.bind = function (decorated, container, $container) {
    var self = this;

    decorated.call(this, container, $container);

    container.on('query', function (params) {
      self.lastParams = params;
      self.loading = true;
    });

    container.on('query:append', function (params) {
      self.lastParams = params;
      self.loading = true;
    });

    this.$results.on('scroll', this.loadMoreIfNeeded.bind(this));
  };

  InfiniteScroll.prototype.loadMoreIfNeeded = function () {
    var isLoadMoreVisible = $.contains(
      document.documentElement,
      this.$loadingMore[0]
    );

    if (this.loading || !isLoadMoreVisible) {
      return;
    }

    var currentOffset = this.$results.offset().top +
      this.$results.outerHeight(false);
    var loadingMoreOffset = this.$loadingMore.offset().top +
      this.$loadingMore.outerHeight(false);

    if (currentOffset + 50 >= loadingMoreOffset) {
      this.loadMore();
    }
  };

  InfiniteScroll.prototype.loadMore = function () {
    this.loading = true;

    var params = $.extend({}, {page: 1}, this.lastParams);

    params.page++;

    this.trigger('query:append', params);
  };

  InfiniteScroll.prototype.showLoadingMore = function (_, data) {
    return data.pagination && data.pagination.more;
  };

  InfiniteScroll.prototype.createLoadingMore = function () {
    var $option = $(
      '<li ' +
      'class="select2-results__option select2-results__option--load-more"' +
      'role="option" aria-disabled="true"></li>'
    );

    var message = this.options.get('translations').get('loadingMore');

    $option.html(message(this.lastParams));

    return $option;
  };

  return InfiniteScroll;
});

S2.define('select2/dropdown/attachBody',[
  'jquery',
  '../utils'
], function ($, Utils) {
  function AttachBody (decorated, $element, options) {
    this.$dropdownParent = $(options.get('dropdownParent') || document.body);

    decorated.call(this, $element, options);
  }

  AttachBody.prototype.bind = function (decorated, container, $container) {
    var self = this;

    decorated.call(this, container, $container);

    container.on('open', function () {
      self._showDropdown();
      self._attachPositioningHandler(container);

      // Must bind after the results handlers to ensure correct sizing
      self._bindContainerResultHandlers(container);
    });

    container.on('close', function () {
      self._hideDropdown();
      self._detachPositioningHandler(container);
    });

    this.$dropdownContainer.on('mousedown', function (evt) {
      evt.stopPropagation();
    });
  };

  AttachBody.prototype.destroy = function (decorated) {
    decorated.call(this);

    this.$dropdownContainer.remove();
  };

  AttachBody.prototype.position = function (decorated, $dropdown, $container) {
    // Clone all of the container classes
    $dropdown.attr('class', $container.attr('class'));

    $dropdown.removeClass('select2');
    $dropdown.addClass('select2-container--open');

    $dropdown.css({
      position: 'absolute',
      top: -999999
    });

    this.$container = $container;
  };

  AttachBody.prototype.render = function (decorated) {
    var $container = $('<span></span>');

    var $dropdown = decorated.call(this);
    $container.append($dropdown);

    this.$dropdownContainer = $container;

    return $container;
  };

  AttachBody.prototype._hideDropdown = function (decorated) {
    this.$dropdownContainer.detach();
  };

  AttachBody.prototype._bindContainerResultHandlers =
      function (decorated, container) {

    // These should only be bound once
    if (this._containerResultsHandlersBound) {
      return;
    }

    var self = this;

    container.on('results:all', function () {
      self._positionDropdown();
      self._resizeDropdown();
    });

    container.on('results:append', function () {
      self._positionDropdown();
      self._resizeDropdown();
    });

    container.on('results:message', function () {
      self._positionDropdown();
      self._resizeDropdown();
    });

    container.on('select', function () {
      self._positionDropdown();
      self._resizeDropdown();
    });

    container.on('unselect', function () {
      self._positionDropdown();
      self._resizeDropdown();
    });

    this._containerResultsHandlersBound = true;
  };

  AttachBody.prototype._attachPositioningHandler =
      function (decorated, container) {
    var self = this;

    var scrollEvent = 'scroll.select2.' + container.id;
    var resizeEvent = 'resize.select2.' + container.id;
    var orientationEvent = 'orientationchange.select2.' + container.id;

    var $watchers = this.$container.parents().filter(Utils.hasScroll);
    $watchers.each(function () {
      Utils.StoreData(this, 'select2-scroll-position', {
        x: $(this).scrollLeft(),
        y: $(this).scrollTop()
      });
    });

    $watchers.on(scrollEvent, function (ev) {
      var position = Utils.GetData(this, 'select2-scroll-position');
      $(this).scrollTop(position.y);
    });

    $(window).on(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent,
      function (e) {
      self._positionDropdown();
      self._resizeDropdown();
    });
  };

  AttachBody.prototype._detachPositioningHandler =
      function (decorated, container) {
    var scrollEvent = 'scroll.select2.' + container.id;
    var resizeEvent = 'resize.select2.' + container.id;
    var orientationEvent = 'orientationchange.select2.' + container.id;

    var $watchers = this.$container.parents().filter(Utils.hasScroll);
    $watchers.off(scrollEvent);

    $(window).off(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent);
  };

  AttachBody.prototype._positionDropdown = function () {
    var $window = $(window);

    var isCurrentlyAbove = this.$dropdown.hasClass('select2-dropdown--above');
    var isCurrentlyBelow = this.$dropdown.hasClass('select2-dropdown--below');

    var newDirection = null;

    var offset = this.$container.offset();

    offset.bottom = offset.top + this.$container.outerHeight(false);

    var container = {
      height: this.$container.outerHeight(false)
    };

    container.top = offset.top;
    container.bottom = offset.top + container.height;

    var dropdown = {
      height: this.$dropdown.outerHeight(false)
    };

    var viewport = {
      top: $window.scrollTop(),
      bottom: $window.scrollTop() + $window.height()
    };

    var enoughRoomAbove = viewport.top < (offset.top - dropdown.height);
    var enoughRoomBelow = viewport.bottom > (offset.bottom + dropdown.height);

    var css = {
      left: offset.left,
      top: container.bottom
    };

    // Determine what the parent element is to use for calculating the offset
    var $offsetParent = this.$dropdownParent;

    // For statically positioned elements, we need to get the element
    // that is determining the offset
    if ($offsetParent.css('position') === 'static') {
      $offsetParent = $offsetParent.offsetParent();
    }

    var parentOffset = {
      top: 0,
      left: 0
    };

    if (
      $.contains(document.body, $offsetParent[0]) ||
      $offsetParent[0].isConnected
      ) {
      parentOffset = $offsetParent.offset();
    }

    css.top -= parentOffset.top;
    css.left -= parentOffset.left;

    if (!isCurrentlyAbove && !isCurrentlyBelow) {
      newDirection = 'below';
    }

    if (!enoughRoomBelow && enoughRoomAbove && !isCurrentlyAbove) {
      newDirection = 'above';
    } else if (!enoughRoomAbove && enoughRoomBelow && isCurrentlyAbove) {
      newDirection = 'below';
    }

    if (newDirection == 'above' ||
      (isCurrentlyAbove && newDirection !== 'below')) {
      css.top = container.top - parentOffset.top - dropdown.height;
    }

    if (newDirection != null) {
      this.$dropdown
        .removeClass('select2-dropdown--below select2-dropdown--above')
        .addClass('select2-dropdown--' + newDirection);
      this.$container
        .removeClass('select2-container--below select2-container--above')
        .addClass('select2-container--' + newDirection);
    }

    this.$dropdownContainer.css(css);
  };

  AttachBody.prototype._resizeDropdown = function () {
    var css = {
      width: this.$container.outerWidth(false) + 'px'
    };

    if (this.options.get('dropdownAutoWidth')) {
      css.minWidth = css.width;
      css.position = 'relative';
      css.width = 'auto';
    }

    this.$dropdown.css(css);
  };

  AttachBody.prototype._showDropdown = function (decorated) {
    this.$dropdownContainer.appendTo(this.$dropdownParent);

    this._positionDropdown();
    this._resizeDropdown();
  };

  return AttachBody;
});

S2.define('select2/dropdown/minimumResultsForSearch',[

], function () {
  function countResults (data) {
    var count = 0;

    for (var d = 0; d < data.length; d++) {
      var item = data[d];

      if (item.children) {
        count += countResults(item.children);
      } else {
        count++;
      }
    }

    return count;
  }

  function MinimumResultsForSearch (decorated, $element, options, dataAdapter) {
    this.minimumResultsForSearch = options.get('minimumResultsForSearch');

    if (this.minimumResultsForSearch < 0) {
      this.minimumResultsForSearch = Infinity;
    }

    decorated.call(this, $element, options, dataAdapter);
  }

  MinimumResultsForSearch.prototype.showSearch = function (decorated, params) {
    if (countResults(params.data.results) < this.minimumResultsForSearch) {
      return false;
    }

    return decorated.call(this, params);
  };

  return MinimumResultsForSearch;
});

S2.define('select2/dropdown/selectOnClose',[
  '../utils'
], function (Utils) {
  function SelectOnClose () { }

  SelectOnClose.prototype.bind = function (decorated, container, $container) {
    var self = this;

    decorated.call(this, container, $container);

    container.on('close', function (params) {
      self._handleSelectOnClose(params);
    });
  };

  SelectOnClose.prototype._handleSelectOnClose = function (_, params) {
    if (params && params.originalSelect2Event != null) {
      var event = params.originalSelect2Event;

      // Don't select an item if the close event was triggered from a select or
      // unselect event
      if (event._type === 'select' || event._type === 'unselect') {
        return;
      }
    }

    var $highlightedResults = this.getHighlightedResults();

    // Only select highlighted results
    if ($highlightedResults.length < 1) {
      return;
    }

    var data = Utils.GetData($highlightedResults[0], 'data');

    // Don't re-select already selected resulte
    if (
      (data.element != null && data.element.selected) ||
      (data.element == null && data.selected)
    ) {
      return;
    }

    this.trigger('select', {
        data: data
    });
  };

  return SelectOnClose;
});

S2.define('select2/dropdown/closeOnSelect',[

], function () {
  function CloseOnSelect () { }

  CloseOnSelect.prototype.bind = function (decorated, container, $container) {
    var self = this;

    decorated.call(this, container, $container);

    container.on('select', function (evt) {
      self._selectTriggered(evt);
    });

    container.on('unselect', function (evt) {
      self._selectTriggered(evt);
    });
  };

  CloseOnSelect.prototype._selectTriggered = function (_, evt) {
    var originalEvent = evt.originalEvent;

    // Don't close if the control key is being held
    if (originalEvent && (originalEvent.ctrlKey || originalEvent.metaKey)) {
      return;
    }

    this.trigger('close', {
      originalEvent: originalEvent,
      originalSelect2Event: evt
    });
  };

  return CloseOnSelect;
});

S2.define('select2/i18n/en',[],function () {
  // English
  return {
    errorLoading: function () {
      return 'The results could not be loaded.';
    },
    inputTooLong: function (args) {
      var overChars = args.input.length - args.maximum;

      var message = 'Please delete ' + overChars + ' character';

      if (overChars != 1) {
        message += 's';
      }

      return message;
    },
    inputTooShort: function (args) {
      var remainingChars = args.minimum - args.input.length;

      var message = 'Please enter ' + remainingChars + ' or more characters';

      return message;
    },
    loadingMore: function () {
      return 'Loading more results…';
    },
    maximumSelected: function (args) {
      var message = 'You can only select ' + args.maximum + ' item';

      if (args.maximum != 1) {
        message += 's';
      }

      return message;
    },
    noResults: function () {
      return 'No results found';
    },
    searching: function () {
      return 'Searching…';
    },
    removeAllItems: function () {
      return 'Remove all items';
    }
  };
});

S2.define('select2/defaults',[
  'jquery',
  'require',

  './results',

  './selection/single',
  './selection/multiple',
  './selection/placeholder',
  './selection/allowClear',
  './selection/search',
  './selection/eventRelay',

  './utils',
  './translation',
  './diacritics',

  './data/select',
  './data/array',
  './data/ajax',
  './data/tags',
  './data/tokenizer',
  './data/minimumInputLength',
  './data/maximumInputLength',
  './data/maximumSelectionLength',

  './dropdown',
  './dropdown/search',
  './dropdown/hidePlaceholder',
  './dropdown/infiniteScroll',
  './dropdown/attachBody',
  './dropdown/minimumResultsForSearch',
  './dropdown/selectOnClose',
  './dropdown/closeOnSelect',

  './i18n/en'
], function ($, require,

             ResultsList,

             SingleSelection, MultipleSelection, Placeholder, AllowClear,
             SelectionSearch, EventRelay,

             Utils, Translation, DIACRITICS,

             SelectData, ArrayData, AjaxData, Tags, Tokenizer,
             MinimumInputLength, MaximumInputLength, MaximumSelectionLength,

             Dropdown, DropdownSearch, HidePlaceholder, InfiniteScroll,
             AttachBody, MinimumResultsForSearch, SelectOnClose, CloseOnSelect,

             EnglishTranslation) {
  function Defaults () {
    this.reset();
  }

  Defaults.prototype.apply = function (options) {
    options = $.extend(true, {}, this.defaults, options);

    if (options.dataAdapter == null) {
      if (options.ajax != null) {
        options.dataAdapter = AjaxData;
      } else if (options.data != null) {
        options.dataAdapter = ArrayData;
      } else {
        options.dataAdapter = SelectData;
      }

      if (options.minimumInputLength > 0) {
        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          MinimumInputLength
        );
      }

      if (options.maximumInputLength > 0) {
        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          MaximumInputLength
        );
      }

      if (options.maximumSelectionLength > 0) {
        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          MaximumSelectionLength
        );
      }

      if (options.tags) {
        options.dataAdapter = Utils.Decorate(options.dataAdapter, Tags);
      }

      if (options.tokenSeparators != null || options.tokenizer != null) {
        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          Tokenizer
        );
      }

      if (options.query != null) {
        var Query = require(options.amdBase + 'compat/query');

        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          Query
        );
      }

      if (options.initSelection != null) {
        var InitSelection = require(options.amdBase + 'compat/initSelection');

        options.dataAdapter = Utils.Decorate(
          options.dataAdapter,
          InitSelection
        );
      }
    }

    if (options.resultsAdapter == null) {
      options.resultsAdapter = ResultsList;

      if (options.ajax != null) {
        options.resultsAdapter = Utils.Decorate(
          options.resultsAdapter,
          InfiniteScroll
        );
      }

      if (options.placeholder != null) {
        options.resultsAdapter = Utils.Decorate(
          options.resultsAdapter,
          HidePlaceholder
        );
      }

      if (options.selectOnClose) {
        options.resultsAdapter = Utils.Decorate(
          options.resultsAdapter,
          SelectOnClose
        );
      }
    }

    if (options.dropdownAdapter == null) {
      if (options.multiple) {
        options.dropdownAdapter = Dropdown;
      } else {
        var SearchableDropdown = Utils.Decorate(Dropdown, DropdownSearch);

        options.dropdownAdapter = SearchableDropdown;
      }

      if (options.minimumResultsForSearch !== 0) {
        options.dropdownAdapter = Utils.Decorate(
          options.dropdownAdapter,
          MinimumResultsForSearch
        );
      }

      if (options.closeOnSelect) {
        options.dropdownAdapter = Utils.Decorate(
          options.dropdownAdapter,
          CloseOnSelect
        );
      }

      if (
        options.dropdownCssClass != null ||
        options.dropdownCss != null ||
        options.adaptDropdownCssClass != null
      ) {
        var DropdownCSS = require(options.amdBase + 'compat/dropdownCss');

        options.dropdownAdapter = Utils.Decorate(
          options.dropdownAdapter,
          DropdownCSS
        );
      }

      options.dropdownAdapter = Utils.Decorate(
        options.dropdownAdapter,
        AttachBody
      );
    }

    if (options.selectionAdapter == null) {
      if (options.multiple) {
        options.selectionAdapter = MultipleSelection;
      } else {
        options.selectionAdapter = SingleSelection;
      }

      // Add the placeholder mixin if a placeholder was specified
      if (options.placeholder != null) {
        options.selectionAdapter = Utils.Decorate(
          options.selectionAdapter,
          Placeholder
        );
      }

      if (options.allowClear) {
        options.selectionAdapter = Utils.Decorate(
          options.selectionAdapter,
          AllowClear
        );
      }

      if (options.multiple) {
        options.selectionAdapter = Utils.Decorate(
          options.selectionAdapter,
          SelectionSearch
        );
      }

      if (
        options.containerCssClass != null ||
        options.containerCss != null ||
        options.adaptContainerCssClass != null
      ) {
        var ContainerCSS = require(options.amdBase + 'compat/containerCss');

        options.selectionAdapter = Utils.Decorate(
          options.selectionAdapter,
          ContainerCSS
        );
      }

      options.selectionAdapter = Utils.Decorate(
        options.selectionAdapter,
        EventRelay
      );
    }

    // If the defaults were not previously applied from an element, it is
    // possible for the language option to have not been resolved
    options.language = this._resolveLanguage(options.language);

    // Always fall back to English since it will always be complete
    options.language.push('en');

    var uniqueLanguages = [];

    for (var l = 0; l < options.language.length; l++) {
      var language = options.language[l];

      if (uniqueLanguages.indexOf(language) === -1) {
        uniqueLanguages.push(language);
      }
    }

    options.language = uniqueLanguages;

    options.translations = this._processTranslations(
      options.language,
      options.debug
    );

    return options;
  };

  Defaults.prototype.reset = function () {
    function stripDiacritics (text) {
      // Used 'uni range + named function' from http://jsperf.com/diacritics/18
      function match(a) {
        return DIACRITICS[a] || a;
      }

      return text.replace(/[^\u0000-\u007E]/g, match);
    }

    function matcher (params, data) {
      // Always return the object if there is nothing to compare
      if ($.trim(params.term) === '') {
        return data;
      }

      // Do a recursive check for options with children
      if (data.children && data.children.length > 0) {
        // Clone the data object if there are children
        // This is required as we modify the object to remove any non-matches
        var match = $.extend(true, {}, data);

        // Check each child of the option
        for (var c = data.children.length - 1; c >= 0; c--) {
          var child = data.children[c];

          var matches = matcher(params, child);

          // If there wasn't a match, remove the object in the array
          if (matches == null) {
            match.children.splice(c, 1);
          }
        }

        // If any children matched, return the new object
        if (match.children.length > 0) {
          return match;
        }

        // If there were no matching children, check just the plain object
        return matcher(params, match);
      }

      var original = stripDiacritics(data.text).toUpperCase();
      var term = stripDiacritics(params.term).toUpperCase();

      // Check if the text contains the term
      if (original.indexOf(term) > -1) {
        return data;
      }

      // If it doesn't contain the term, don't return anything
      return null;
    }

    this.defaults = {
      amdBase: './',
      amdLanguageBase: './i18n/',
      closeOnSelect: true,
      debug: false,
      dropdownAutoWidth: false,
      escapeMarkup: Utils.escapeMarkup,
      language: {},
      matcher: matcher,
      minimumInputLength: 0,
      maximumInputLength: 0,
      maximumSelectionLength: 0,
      minimumResultsForSearch: 0,
      selectOnClose: false,
      scrollAfterSelect: false,
      sorter: function (data) {
        return data;
      },
      templateResult: function (result) {
        return result.text;
      },
      templateSelection: function (selection) {
        return selection.text;
      },
      theme: 'default',
      width: 'resolve'
    };
  };

  Defaults.prototype.applyFromElement = function (options, $element) {
    var optionLanguage = options.language;
    var defaultLanguage = this.defaults.language;
    var elementLanguage = $element.prop('lang');
    var parentLanguage = $element.closest('[lang]').prop('lang');

    var languages = Array.prototype.concat.call(
      this._resolveLanguage(elementLanguage),
      this._resolveLanguage(optionLanguage),
      this._resolveLanguage(defaultLanguage),
      this._resolveLanguage(parentLanguage)
    );

    options.language = languages;

    return options;
  };

  Defaults.prototype._resolveLanguage = function (language) {
    if (!language) {
      return [];
    }

    if ($.isEmptyObject(language)) {
      return [];
    }

    if ($.isPlainObject(language)) {
      return [language];
    }

    var languages;

    if (!$.isArray(language)) {
      languages = [language];
    } else {
      languages = language;
    }

    var resolvedLanguages = [];

    for (var l = 0; l < languages.length; l++) {
      resolvedLanguages.push(languages[l]);

      if (typeof languages[l] === 'string' && languages[l].indexOf('-') > 0) {
        // Extract the region information if it is included
        var languageParts = languages[l].split('-');
        var baseLanguage = languageParts[0];

        resolvedLanguages.push(baseLanguage);
      }
    }

    return resolvedLanguages;
  };

  Defaults.prototype._processTranslations = function (languages, debug) {
    var translations = new Translation();

    for (var l = 0; l < languages.length; l++) {
      var languageData = new Translation();

      var language = languages[l];

      if (typeof language === 'string') {
        try {
          // Try to load it with the original name
          languageData = Translation.loadPath(language);
        } catch (e) {
          try {
            // If we couldn't load it, check if it wasn't the full path
            language = this.defaults.amdLanguageBase + language;
            languageData = Translation.loadPath(language);
          } catch (ex) {
            // The translation could not be loaded at all. Sometimes this is
            // because of a configuration problem, other times this can be
            // because of how Select2 helps load all possible translation files
            if (debug && window.console && console.warn) {
              console.warn(
                'Select2: The language file for "' + language + '" could ' +
                'not be automatically loaded. A fallback will be used instead.'
              );
            }
          }
        }
      } else if ($.isPlainObject(language)) {
        languageData = new Translation(language);
      } else {
        languageData = language;
      }

      translations.extend(languageData);
    }

    return translations;
  };

  Defaults.prototype.set = function (key, value) {
    var camelKey = $.camelCase(key);

    var data = {};
    data[camelKey] = value;

    var convertedData = Utils._convertData(data);

    $.extend(true, this.defaults, convertedData);
  };

  var defaults = new Defaults();

  return defaults;
});

S2.define('select2/options',[
  'require',
  'jquery',
  './defaults',
  './utils'
], function (require, $, Defaults, Utils) {
  function Options (options, $element) {
    this.options = options;

    if ($element != null) {
      this.fromElement($element);
    }

    if ($element != null) {
      this.options = Defaults.applyFromElement(this.options, $element);
    }

    this.options = Defaults.apply(this.options);

    if ($element && $element.is('input')) {
      var InputCompat = require(this.get('amdBase') + 'compat/inputData');

      this.options.dataAdapter = Utils.Decorate(
        this.options.dataAdapter,
        InputCompat
      );
    }
  }

  Options.prototype.fromElement = function ($e) {
    var excludedData = ['select2'];

    if (this.options.multiple == null) {
      this.options.multiple = $e.prop('multiple');
    }

    if (this.options.disabled == null) {
      this.options.disabled = $e.prop('disabled');
    }

    if (this.options.dir == null) {
      if ($e.prop('dir')) {
        this.options.dir = $e.prop('dir');
      } else if ($e.closest('[dir]').prop('dir')) {
        this.options.dir = $e.closest('[dir]').prop('dir');
      } else {
        this.options.dir = 'ltr';
      }
    }

    $e.prop('disabled', this.options.disabled);
    $e.prop('multiple', this.options.multiple);

    if (Utils.GetData($e[0], 'select2Tags')) {
      if (this.options.debug && window.console && console.warn) {
        console.warn(
          'Select2: The `data-select2-tags` attribute has been changed to ' +
          'use the `data-data` and `data-tags="true"` attributes and will be ' +
          'removed in future versions of Select2.'
        );
      }

      Utils.StoreData($e[0], 'data', Utils.GetData($e[0], 'select2Tags'));
      Utils.StoreData($e[0], 'tags', true);
    }

    if (Utils.GetData($e[0], 'ajaxUrl')) {
      if (this.options.debug && window.console && console.warn) {
        console.warn(
          'Select2: The `data-ajax-url` attribute has been changed to ' +
          '`data-ajax--url` and support for the old attribute will be removed' +
          ' in future versions of Select2.'
        );
      }

      $e.attr('ajax--url', Utils.GetData($e[0], 'ajaxUrl'));
      Utils.StoreData($e[0], 'ajax-Url', Utils.GetData($e[0], 'ajaxUrl'));
    }

    var dataset = {};

    function upperCaseLetter(_, letter) {
      return letter.toUpperCase();
    }

    // Pre-load all of the attributes which are prefixed with `data-`
    for (var attr = 0; attr < $e[0].attributes.length; attr++) {
      var attributeName = $e[0].attributes[attr].name;
      var prefix = 'data-';

      if (attributeName.substr(0, prefix.length) == prefix) {
        // Get the contents of the attribute after `data-`
        var dataName = attributeName.substring(prefix.length);

        // Get the data contents from the consistent source
        // This is more than likely the jQuery data helper
        var dataValue = Utils.GetData($e[0], dataName);

        // camelCase the attribute name to match the spec
        var camelDataName = dataName.replace(/-([a-z])/g, upperCaseLetter);

        // Store the data attribute contents into the dataset since
        dataset[camelDataName] = dataValue;
      }
    }

    // Prefer the element's `dataset` attribute if it exists
    // jQuery 1.x does not correctly handle data attributes with multiple dashes
    if ($.fn.jquery && $.fn.jquery.substr(0, 2) == '1.' && $e[0].dataset) {
      dataset = $.extend(true, {}, $e[0].dataset, dataset);
    }

    // Prefer our internal data cache if it exists
    var data = $.extend(true, {}, Utils.GetData($e[0]), dataset);

    data = Utils._convertData(data);

    for (var key in data) {
      if ($.inArray(key, excludedData) > -1) {
        continue;
      }

      if ($.isPlainObject(this.options[key])) {
        $.extend(this.options[key], data[key]);
      } else {
        this.options[key] = data[key];
      }
    }

    return this;
  };

  Options.prototype.get = function (key) {
    return this.options[key];
  };

  Options.prototype.set = function (key, val) {
    this.options[key] = val;
  };

  return Options;
});

S2.define('select2/core',[
  'jquery',
  './options',
  './utils',
  './keys'
], function ($, Options, Utils, KEYS) {
  var Select2 = function ($element, options) {
    if (Utils.GetData($element[0], 'select2') != null) {
      Utils.GetData($element[0], 'select2').destroy();
    }

    this.$element = $element;

    this.id = this._generateId($element);

    options = options || {};

    this.options = new Options(options, $element);

    Select2.__super__.constructor.call(this);

    // Set up the tabindex

    var tabindex = $element.attr('tabindex') || 0;
    Utils.StoreData($element[0], 'old-tabindex', tabindex);
    $element.attr('tabindex', '-1');

    // Set up containers and adapters

    var DataAdapter = this.options.get('dataAdapter');
    this.dataAdapter = new DataAdapter($element, this.options);

    var $container = this.render();

    this._placeContainer($container);

    var SelectionAdapter = this.options.get('selectionAdapter');
    this.selection = new SelectionAdapter($element, this.options);
    this.$selection = this.selection.render();

    this.selection.position(this.$selection, $container);

    var DropdownAdapter = this.options.get('dropdownAdapter');
    this.dropdown = new DropdownAdapter($element, this.options);
    this.$dropdown = this.dropdown.render();

    this.dropdown.position(this.$dropdown, $container);

    var ResultsAdapter = this.options.get('resultsAdapter');
    this.results = new ResultsAdapter($element, this.options, this.dataAdapter);
    this.$results = this.results.render();

    this.results.position(this.$results, this.$dropdown);

    // Bind events

    var self = this;

    // Bind the container to all of the adapters
    this._bindAdapters();

    // Register any DOM event handlers
    this._registerDomEvents();

    // Register any internal event handlers
    this._registerDataEvents();
    this._registerSelectionEvents();
    this._registerDropdownEvents();
    this._registerResultsEvents();
    this._registerEvents();

    // Set the initial state
    this.dataAdapter.current(function (initialData) {
      self.trigger('selection:update', {
        data: initialData
      });
    });

    // Hide the original select
    $element.addClass('select2-hidden-accessible');
    $element.attr('aria-hidden', 'true');

    // Synchronize any monitored attributes
    this._syncAttributes();

    Utils.StoreData($element[0], 'select2', this);

    // Ensure backwards compatibility with $element.data('select2').
    $element.data('select2', this);
  };

  Utils.Extend(Select2, Utils.Observable);

  Select2.prototype._generateId = function ($element) {
    var id = '';

    if ($element.attr('id') != null) {
      id = $element.attr('id');
    } else if ($element.attr('name') != null) {
      id = $element.attr('name') + '-' + Utils.generateChars(2);
    } else {
      id = Utils.generateChars(4);
    }

    id = id.replace(/(:|\.|\[|\]|,)/g, '');
    id = 'select2-' + id;

    return id;
  };

  Select2.prototype._placeContainer = function ($container) {
    $container.insertAfter(this.$element);

    var width = this._resolveWidth(this.$element, this.options.get('width'));

    if (width != null) {
      $container.css('width', width);
    }
  };

  Select2.prototype._resolveWidth = function ($element, method) {
    var WIDTH = /^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;

    if (method == 'resolve') {
      var styleWidth = this._resolveWidth($element, 'style');

      if (styleWidth != null) {
        return styleWidth;
      }

      return this._resolveWidth($element, 'element');
    }

    if (method == 'element') {
      var elementWidth = $element.outerWidth(false);

      if (elementWidth <= 0) {
        return 'auto';
      }

      return elementWidth + 'px';
    }

    if (method == 'style') {
      var style = $element.attr('style');

      if (typeof(style) !== 'string') {
        return null;
      }

      var attrs = style.split(';');

      for (var i = 0, l = attrs.length; i < l; i = i + 1) {
        var attr = attrs[i].replace(/\s/g, '');
        var matches = attr.match(WIDTH);

        if (matches !== null && matches.length >= 1) {
          return matches[1];
        }
      }

      return null;
    }

    if (method == 'computedstyle') {
      var computedStyle = window.getComputedStyle($element[0]);

      return computedStyle.width;
    }

    return method;
  };

  Select2.prototype._bindAdapters = function () {
    this.dataAdapter.bind(this, this.$container);
    this.selection.bind(this, this.$container);

    this.dropdown.bind(this, this.$container);
    this.results.bind(this, this.$container);
  };

  Select2.prototype._registerDomEvents = function () {
    var self = this;

    this.$element.on('change.select2', function () {
      self.dataAdapter.current(function (data) {
        self.trigger('selection:update', {
          data: data
        });
      });
    });

    this.$element.on('focus.select2', function (evt) {
      self.trigger('focus', evt);
    });

    this._syncA = Utils.bind(this._syncAttributes, this);
    this._syncS = Utils.bind(this._syncSubtree, this);

    if (this.$element[0].attachEvent) {
      this.$element[0].attachEvent('onpropertychange', this._syncA);
    }

    var observer = window.MutationObserver ||
      window.WebKitMutationObserver ||
      window.MozMutationObserver
    ;

    if (observer != null) {
      this._observer = new observer(function (mutations) {
        $.each(mutations, self._syncA);
        $.each(mutations, self._syncS);
      });
      this._observer.observe(this.$element[0], {
        attributes: true,
        childList: true,
        subtree: false
      });
    } else if (this.$element[0].addEventListener) {
      this.$element[0].addEventListener(
        'DOMAttrModified',
        self._syncA,
        false
      );
      this.$element[0].addEventListener(
        'DOMNodeInserted',
        self._syncS,
        false
      );
      this.$element[0].addEventListener(
        'DOMNodeRemoved',
        self._syncS,
        false
      );
    }
  };

  Select2.prototype._registerDataEvents = function () {
    var self = this;

    this.dataAdapter.on('*', function (name, params) {
      self.trigger(name, params);
    });
  };

  Select2.prototype._registerSelectionEvents = function () {
    var self = this;
    var nonRelayEvents = ['toggle', 'focus'];

    this.selection.on('toggle', function () {
      self.toggleDropdown();
    });

    this.selection.on('focus', function (params) {
      self.focus(params);
    });

    this.selection.on('*', function (name, params) {
      if ($.inArray(name, nonRelayEvents) !== -1) {
        return;
      }

      self.trigger(name, params);
    });
  };

  Select2.prototype._registerDropdownEvents = function () {
    var self = this;

    this.dropdown.on('*', function (name, params) {
      self.trigger(name, params);
    });
  };

  Select2.prototype._registerResultsEvents = function () {
    var self = this;

    this.results.on('*', function (name, params) {
      self.trigger(name, params);
    });
  };

  Select2.prototype._registerEvents = function () {
    var self = this;

    this.on('open', function () {
      self.$container.addClass('select2-container--open');
    });

    this.on('close', function () {
      self.$container.removeClass('select2-container--open');
    });

    this.on('enable', function () {
      self.$container.removeClass('select2-container--disabled');
    });

    this.on('disable', function () {
      self.$container.addClass('select2-container--disabled');
    });

    this.on('blur', function () {
      self.$container.removeClass('select2-container--focus');
    });

    this.on('query', function (params) {
      if (!self.isOpen()) {
        self.trigger('open', {});
      }

      this.dataAdapter.query(params, function (data) {
        self.trigger('results:all', {
          data: data,
          query: params
        });
      });
    });

    this.on('query:append', function (params) {
      this.dataAdapter.query(params, function (data) {
        self.trigger('results:append', {
          data: data,
          query: params
        });
      });
    });

    this.on('keypress', function (evt) {
      var key = evt.which;

      if (self.isOpen()) {
        if (key === KEYS.ESC || key === KEYS.TAB ||
            (key === KEYS.UP && evt.altKey)) {
          self.close();

          evt.preventDefault();
        } else if (key === KEYS.ENTER) {
          self.trigger('results:select', {});

          evt.preventDefault();
        } else if ((key === KEYS.SPACE && evt.ctrlKey)) {
          self.trigger('results:toggle', {});

          evt.preventDefault();
        } else if (key === KEYS.UP) {
          self.trigger('results:previous', {});

          evt.preventDefault();
        } else if (key === KEYS.DOWN) {
          self.trigger('results:next', {});

          evt.preventDefault();
        }
      } else {
        if (key === KEYS.ENTER || key === KEYS.SPACE ||
            (key === KEYS.DOWN && evt.altKey)) {
          self.open();

          evt.preventDefault();
        }
      }
    });
  };

  Select2.prototype._syncAttributes = function () {
    this.options.set('disabled', this.$element.prop('disabled'));

    if (this.options.get('disabled')) {
      if (this.isOpen()) {
        this.close();
      }

      this.trigger('disable', {});
    } else {
      this.trigger('enable', {});
    }
  };

  Select2.prototype._syncSubtree = function (evt, mutations) {
    var changed = false;
    var self = this;

    // Ignore any mutation events raised for elements that aren't options or
    // optgroups. This handles the case when the select element is destroyed
    if (
      evt && evt.target && (
        evt.target.nodeName !== 'OPTION' && evt.target.nodeName !== 'OPTGROUP'
      )
    ) {
      return;
    }

    if (!mutations) {
      // If mutation events aren't supported, then we can only assume that the
      // change affected the selections
      changed = true;
    } else if (mutations.addedNodes && mutations.addedNodes.length > 0) {
      for (var n = 0; n < mutations.addedNodes.length; n++) {
        var node = mutations.addedNodes[n];

        if (node.selected) {
          changed = true;
        }
      }
    } else if (mutations.removedNodes && mutations.removedNodes.length > 0) {
      changed = true;
    }

    // Only re-pull the data if we think there is a change
    if (changed) {
      this.dataAdapter.current(function (currentData) {
        self.trigger('selection:update', {
          data: currentData
        });
      });
    }
  };

  /**
   * Override the trigger method to automatically trigger pre-events when
   * there are events that can be prevented.
   */
  Select2.prototype.trigger = function (name, args) {
    var actualTrigger = Select2.__super__.trigger;
    var preTriggerMap = {
      'open': 'opening',
      'close': 'closing',
      'select': 'selecting',
      'unselect': 'unselecting',
      'clear': 'clearing'
    };

    if (args === undefined) {
      args = {};
    }

    if (name in preTriggerMap) {
      var preTriggerName = preTriggerMap[name];
      var preTriggerArgs = {
        prevented: false,
        name: name,
        args: args
      };

      actualTrigger.call(this, preTriggerName, preTriggerArgs);

      if (preTriggerArgs.prevented) {
        args.prevented = true;

        return;
      }
    }

    actualTrigger.call(this, name, args);
  };

  Select2.prototype.toggleDropdown = function () {
    if (this.options.get('disabled')) {
      return;
    }

    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  };

  Select2.prototype.open = function () {
    if (this.isOpen()) {
      return;
    }

    this.trigger('query', {});
  };

  Select2.prototype.close = function () {
    if (!this.isOpen()) {
      return;
    }

    this.trigger('close', {});
  };

  Select2.prototype.isOpen = function () {
    return this.$container.hasClass('select2-container--open');
  };

  Select2.prototype.hasFocus = function () {
    return this.$container.hasClass('select2-container--focus');
  };

  Select2.prototype.focus = function (data) {
    // No need to re-trigger focus events if we are already focused
    if (this.hasFocus()) {
      return;
    }

    this.$container.addClass('select2-container--focus');
    this.trigger('focus', {});
  };

  Select2.prototype.enable = function (args) {
    if (this.options.get('debug') && window.console && console.warn) {
      console.warn(
        'Select2: The `select2("enable")` method has been deprecated and will' +
        ' be removed in later Select2 versions. Use $element.prop("disabled")' +
        ' instead.'
      );
    }

    if (args == null || args.length === 0) {
      args = [true];
    }

    var disabled = !args[0];

    this.$element.prop('disabled', disabled);
  };

  Select2.prototype.data = function () {
    if (this.options.get('debug') &&
        arguments.length > 0 && window.console && console.warn) {
      console.warn(
        'Select2: Data can no longer be set using `select2("data")`. You ' +
        'should consider setting the value instead using `$element.val()`.'
      );
    }

    var data = [];

    this.dataAdapter.current(function (currentData) {
      data = currentData;
    });

    return data;
  };

  Select2.prototype.val = function (args) {
    if (this.options.get('debug') && window.console && console.warn) {
      console.warn(
        'Select2: The `select2("val")` method has been deprecated and will be' +
        ' removed in later Select2 versions. Use $element.val() instead.'
      );
    }

    if (args == null || args.length === 0) {
      return this.$element.val();
    }

    var newVal = args[0];

    if ($.isArray(newVal)) {
      newVal = $.map(newVal, function (obj) {
        return obj.toString();
      });
    }

    this.$element.val(newVal).trigger('change');
  };

  Select2.prototype.destroy = function () {
    this.$container.remove();

    if (this.$element[0].detachEvent) {
      this.$element[0].detachEvent('onpropertychange', this._syncA);
    }

    if (this._observer != null) {
      this._observer.disconnect();
      this._observer = null;
    } else if (this.$element[0].removeEventListener) {
      this.$element[0]
        .removeEventListener('DOMAttrModified', this._syncA, false);
      this.$element[0]
        .removeEventListener('DOMNodeInserted', this._syncS, false);
      this.$element[0]
        .removeEventListener('DOMNodeRemoved', this._syncS, false);
    }

    this._syncA = null;
    this._syncS = null;

    this.$element.off('.select2');
    this.$element.attr('tabindex',
    Utils.GetData(this.$element[0], 'old-tabindex'));

    this.$element.removeClass('select2-hidden-accessible');
    this.$element.attr('aria-hidden', 'false');
    Utils.RemoveData(this.$element[0]);
    this.$element.removeData('select2');

    this.dataAdapter.destroy();
    this.selection.destroy();
    this.dropdown.destroy();
    this.results.destroy();

    this.dataAdapter = null;
    this.selection = null;
    this.dropdown = null;
    this.results = null;
  };

  Select2.prototype.render = function () {
    var $container = $(
      '<span class="select2 select2-container">' +
        '<span class="selection"></span>' +
        '<span class="dropdown-wrapper" aria-hidden="true"></span>' +
      '</span>'
    );

    $container.attr('dir', this.options.get('dir'));

    this.$container = $container;

    this.$container.addClass('select2-container--' + this.options.get('theme'));

    Utils.StoreData($container[0], 'element', this.$element);

    return $container;
  };

  return Select2;
});

S2.define('jquery-mousewheel',[
  'jquery'
], function ($) {
  // Used to shim jQuery.mousewheel for non-full builds.
  return $;
});

S2.define('jquery.select2',[
  'jquery',
  'jquery-mousewheel',

  './select2/core',
  './select2/defaults',
  './select2/utils'
], function ($, _, Select2, Defaults, Utils) {
  if ($.fn.select2 == null) {
    // All methods that should return the element
    var thisMethods = ['open', 'close', 'destroy'];

    $.fn.select2 = function (options) {
      options = options || {};

      if (typeof options === 'object') {
        this.each(function () {
          var instanceOptions = $.extend(true, {}, options);

          var instance = new Select2($(this), instanceOptions);
        });

        return this;
      } else if (typeof options === 'string') {
        var ret;
        var args = Array.prototype.slice.call(arguments, 1);

        this.each(function () {
          var instance = Utils.GetData(this, 'select2');

          if (instance == null && window.console && console.error) {
            console.error(
              'The select2(\'' + options + '\') method was called on an ' +
              'element that is not using Select2.'
            );
          }

          ret = instance[options].apply(instance, args);
        });

        // Check if we should be returning `this`
        if ($.inArray(options, thisMethods) > -1) {
          return this;
        }

        return ret;
      } else {
        throw new Error('Invalid arguments for Select2: ' + options);
      }
    };
  }

  if ($.fn.select2.defaults == null) {
    $.fn.select2.defaults = Defaults;
  }

  return Select2;
});

  // Return the AMD loader configuration so it can be used outside of this file
  return {
    define: S2.define,
    require: S2.require
  };
}());

  // Autoload the jQuery bindings
  // We know that all of the modules exist above this, so we're safe
  var select2 = S2.require('jquery.select2');

  // Hold the AMD module references on the jQuery function that was just loaded
  // This allows Select2 to use the internal loader outside of this file, such
  // as in the language files.
  jQuery.fn.select2.amd = S2;

  // Return the Select2 instance for anyone who is importing it.
  return select2;
}));

!function(a){if("object"==typeof exports)module.exports=a();else if("function"==typeof define&&define.amd)define(a);else{var b;"undefined"!=typeof window?b=window:"undefined"!=typeof global?b=global:"undefined"!=typeof self&&(b=self),b.proj4=a()}}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);throw new Error("Cannot find module '"+g+"'")}var j=c[g]={exports:{}};b[g][0].call(j.exports,function(a){var c=b[g][1][a];return e(c?c:a)},j,j.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){function Point(a,b,c){if(!(this instanceof Point))return new Point(a,b,c);if(Array.isArray(a))this.x=a[0],this.y=a[1],this.z=a[2]||0;else if("object"==typeof a)this.x=a.x,this.y=a.y,this.z=a.z||0;else if("string"==typeof a&&"undefined"==typeof b){var d=a.split(",");this.x=parseFloat(d[0],10),this.y=parseFloat(d[1],10),this.z=parseFloat(d[2],10)||0}else this.x=a,this.y=b,this.z=c||0;console.warn("proj4.Point will be removed in version 3, use proj4.toPoint")}var d=a("mgrs");Point.fromMGRS=function(a){return new Point(d.toPoint(a))},Point.prototype.toMGRS=function(a){return d.forward([this.x,this.y],a)},b.exports=Point},{mgrs:67}],2:[function(a,b,c){function Projection(a,b){if(!(this instanceof Projection))return new Projection(a);b=b||function(a){if(a)throw a};var c=d(a);if("object"!=typeof c)return void b(a);var f=g(c),h=Projection.projections.get(f.projName);h?(e(this,f),e(this,h),this.init(),b(null,this)):b(a)}var d=a("./parseCode"),e=a("./extend"),f=a("./projections"),g=a("./deriveConstants");Projection.projections=f,Projection.projections.start(),b.exports=Projection},{"./deriveConstants":33,"./extend":34,"./parseCode":37,"./projections":39}],3:[function(a,b,c){b.exports=function(a,b,c){var d,e,f,g=c.x,h=c.y,i=c.z||0;for(f=0;3>f;f++)if(!b||2!==f||void 0!==c.z)switch(0===f?(d=g,e="x"):1===f?(d=h,e="y"):(d=i,e="z"),a.axis[f]){case"e":c[e]=d;break;case"w":c[e]=-d;break;case"n":c[e]=d;break;case"s":c[e]=-d;break;case"u":void 0!==c[e]&&(c.z=d);break;case"d":void 0!==c[e]&&(c.z=-d);break;default:return null}return c}},{}],4:[function(a,b,c){var d=Math.PI/2,e=a("./sign");b.exports=function(a){return Math.abs(a)<d?a:a-e(a)*Math.PI}},{"./sign":21}],5:[function(a,b,c){var d=2*Math.PI,e=3.14159265359,f=a("./sign");b.exports=function(a){return Math.abs(a)<=e?a:a-f(a)*d}},{"./sign":21}],6:[function(a,b,c){b.exports=function(a){return Math.abs(a)>1&&(a=a>1?1:-1),Math.asin(a)}},{}],7:[function(a,b,c){b.exports=function(a){return 1-.25*a*(1+a/16*(3+1.25*a))}},{}],8:[function(a,b,c){b.exports=function(a){return.375*a*(1+.25*a*(1+.46875*a))}},{}],9:[function(a,b,c){b.exports=function(a){return.05859375*a*a*(1+.75*a)}},{}],10:[function(a,b,c){b.exports=function(a){return a*a*a*(35/3072)}},{}],11:[function(a,b,c){b.exports=function(a,b,c){var d=b*c;return a/Math.sqrt(1-d*d)}},{}],12:[function(a,b,c){b.exports=function(a,b,c,d,e){var f,g;f=a/b;for(var h=0;15>h;h++)if(g=(a-(b*f-c*Math.sin(2*f)+d*Math.sin(4*f)-e*Math.sin(6*f)))/(b-2*c*Math.cos(2*f)+4*d*Math.cos(4*f)-6*e*Math.cos(6*f)),f+=g,Math.abs(g)<=1e-10)return f;return 0/0}},{}],13:[function(a,b,c){var d=Math.PI/2;b.exports=function(a,b){var c=1-(1-a*a)/(2*a)*Math.log((1-a)/(1+a));if(Math.abs(Math.abs(b)-c)<1e-6)return 0>b?-1*d:d;for(var e,f,g,h,i=Math.asin(.5*b),j=0;30>j;j++)if(f=Math.sin(i),g=Math.cos(i),h=a*f,e=Math.pow(1-h*h,2)/(2*g)*(b/(1-a*a)-f/(1-h*h)+.5/a*Math.log((1-h)/(1+h))),i+=e,Math.abs(e)<=1e-10)return i;return 0/0}},{}],14:[function(a,b,c){b.exports=function(a,b,c,d,e){return a*e-b*Math.sin(2*e)+c*Math.sin(4*e)-d*Math.sin(6*e)}},{}],15:[function(a,b,c){b.exports=function(a,b,c){var d=a*b;return c/Math.sqrt(1-d*d)}},{}],16:[function(a,b,c){var d=Math.PI/2;b.exports=function(a,b){for(var c,e,f=.5*a,g=d-2*Math.atan(b),h=0;15>=h;h++)if(c=a*Math.sin(g),e=d-2*Math.atan(b*Math.pow((1-c)/(1+c),f))-g,g+=e,Math.abs(e)<=1e-10)return g;return-9999}},{}],17:[function(a,b,c){var d=1,e=.25,f=.046875,g=.01953125,h=.01068115234375,i=.75,j=.46875,k=.013020833333333334,l=.007120768229166667,m=.3645833333333333,n=.005696614583333333,o=.3076171875;b.exports=function(a){var b=[];b[0]=d-a*(e+a*(f+a*(g+a*h))),b[1]=a*(i-a*(f+a*(g+a*h)));var c=a*a;return b[2]=c*(j-a*(k+a*l)),c*=a,b[3]=c*(m-a*n),b[4]=c*a*o,b}},{}],18:[function(a,b,c){var d=a("./pj_mlfn"),e=1e-10,f=20;b.exports=function(a,b,c){for(var g=1/(1-b),h=a,i=f;i;--i){var j=Math.sin(h),k=1-b*j*j;if(k=(d(h,j,Math.cos(h),c)-a)*k*Math.sqrt(k)*g,h-=k,Math.abs(k)<e)return h}return h}},{"./pj_mlfn":19}],19:[function(a,b,c){b.exports=function(a,b,c,d){return c*=b,b*=b,d[0]*a-c*(d[1]+b*(d[2]+b*(d[3]+b*d[4])))}},{}],20:[function(a,b,c){b.exports=function(a,b){var c;return a>1e-7?(c=a*b,(1-a*a)*(b/(1-c*c)-.5/a*Math.log((1-c)/(1+c)))):2*b}},{}],21:[function(a,b,c){b.exports=function(a){return 0>a?-1:1}},{}],22:[function(a,b,c){b.exports=function(a,b){return Math.pow((1-a)/(1+a),b)}},{}],23:[function(a,b,c){b.exports=function(a){var b={x:a[0],y:a[1]};return a.length>2&&(b.z=a[2]),a.length>3&&(b.m=a[3]),b}},{}],24:[function(a,b,c){var d=Math.PI/2;b.exports=function(a,b,c){var e=a*c,f=.5*a;return e=Math.pow((1-e)/(1+e),f),Math.tan(.5*(d-b))/e}},{}],25:[function(a,b,c){c.wgs84={towgs84:"0,0,0",ellipse:"WGS84",datumName:"WGS84"},c.ch1903={towgs84:"674.374,15.056,405.346",ellipse:"bessel",datumName:"swiss"},c.ggrs87={towgs84:"-199.87,74.79,246.62",ellipse:"GRS80",datumName:"Greek_Geodetic_Reference_System_1987"},c.nad83={towgs84:"0,0,0",ellipse:"GRS80",datumName:"North_American_Datum_1983"},c.nad27={nadgrids:"@conus,@alaska,@ntv2_0.gsb,@ntv1_can.dat",ellipse:"clrk66",datumName:"North_American_Datum_1927"},c.potsdam={towgs84:"606.0,23.0,413.0",ellipse:"bessel",datumName:"Potsdam Rauenberg 1950 DHDN"},c.carthage={towgs84:"-263.0,6.0,431.0",ellipse:"clark80",datumName:"Carthage 1934 Tunisia"},c.hermannskogel={towgs84:"653.0,-212.0,449.0",ellipse:"bessel",datumName:"Hermannskogel"},c.ire65={towgs84:"482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",ellipse:"mod_airy",datumName:"Ireland 1965"},c.rassadiran={towgs84:"-133.63,-157.5,-158.62",ellipse:"intl",datumName:"Rassadiran"},c.nzgd49={towgs84:"59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993",ellipse:"intl",datumName:"New Zealand Geodetic Datum 1949"},c.osgb36={towgs84:"446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894",ellipse:"airy",datumName:"Airy 1830"},c.s_jtsk={towgs84:"589,76,480",ellipse:"bessel",datumName:"S-JTSK (Ferro)"},c.beduaram={towgs84:"-106,-87,188",ellipse:"clrk80",datumName:"Beduaram"},c.gunung_segara={towgs84:"-403,684,41",ellipse:"bessel",datumName:"Gunung Segara Jakarta"},c.rnb72={towgs84:"106.869,-52.2978,103.724,-0.33657,0.456955,-1.84218,1",ellipse:"intl",datumName:"Reseau National Belge 1972"}},{}],26:[function(a,b,c){c.MERIT={a:6378137,rf:298.257,ellipseName:"MERIT 1983"},c.SGS85={a:6378136,rf:298.257,ellipseName:"Soviet Geodetic System 85"},c.GRS80={a:6378137,rf:298.257222101,ellipseName:"GRS 1980(IUGG, 1980)"},c.IAU76={a:6378140,rf:298.257,ellipseName:"IAU 1976"},c.airy={a:6377563.396,b:6356256.91,ellipseName:"Airy 1830"},c.APL4={a:6378137,rf:298.25,ellipseName:"Appl. Physics. 1965"},c.NWL9D={a:6378145,rf:298.25,ellipseName:"Naval Weapons Lab., 1965"},c.mod_airy={a:6377340.189,b:6356034.446,ellipseName:"Modified Airy"},c.andrae={a:6377104.43,rf:300,ellipseName:"Andrae 1876 (Den., Iclnd.)"},c.aust_SA={a:6378160,rf:298.25,ellipseName:"Australian Natl & S. Amer. 1969"},c.GRS67={a:6378160,rf:298.247167427,ellipseName:"GRS 67(IUGG 1967)"},c.bessel={a:6377397.155,rf:299.1528128,ellipseName:"Bessel 1841"},c.bess_nam={a:6377483.865,rf:299.1528128,ellipseName:"Bessel 1841 (Namibia)"},c.clrk66={a:6378206.4,b:6356583.8,ellipseName:"Clarke 1866"},c.clrk80={a:6378249.145,rf:293.4663,ellipseName:"Clarke 1880 mod."},c.clrk58={a:6378293.645208759,rf:294.2606763692654,ellipseName:"Clarke 1858"},c.CPM={a:6375738.7,rf:334.29,ellipseName:"Comm. des Poids et Mesures 1799"},c.delmbr={a:6376428,rf:311.5,ellipseName:"Delambre 1810 (Belgium)"},c.engelis={a:6378136.05,rf:298.2566,ellipseName:"Engelis 1985"},c.evrst30={a:6377276.345,rf:300.8017,ellipseName:"Everest 1830"},c.evrst48={a:6377304.063,rf:300.8017,ellipseName:"Everest 1948"},c.evrst56={a:6377301.243,rf:300.8017,ellipseName:"Everest 1956"},c.evrst69={a:6377295.664,rf:300.8017,ellipseName:"Everest 1969"},c.evrstSS={a:6377298.556,rf:300.8017,ellipseName:"Everest (Sabah & Sarawak)"},c.fschr60={a:6378166,rf:298.3,ellipseName:"Fischer (Mercury Datum) 1960"},c.fschr60m={a:6378155,rf:298.3,ellipseName:"Fischer 1960"},c.fschr68={a:6378150,rf:298.3,ellipseName:"Fischer 1968"},c.helmert={a:6378200,rf:298.3,ellipseName:"Helmert 1906"},c.hough={a:6378270,rf:297,ellipseName:"Hough"},c.intl={a:6378388,rf:297,ellipseName:"International 1909 (Hayford)"},c.kaula={a:6378163,rf:298.24,ellipseName:"Kaula 1961"},c.lerch={a:6378139,rf:298.257,ellipseName:"Lerch 1979"},c.mprts={a:6397300,rf:191,ellipseName:"Maupertius 1738"},c.new_intl={a:6378157.5,b:6356772.2,ellipseName:"New International 1967"},c.plessis={a:6376523,rf:6355863,ellipseName:"Plessis 1817 (France)"},c.krass={a:6378245,rf:298.3,ellipseName:"Krassovsky, 1942"},c.SEasia={a:6378155,b:6356773.3205,ellipseName:"Southeast Asia"},c.walbeck={a:6376896,b:6355834.8467,ellipseName:"Walbeck"},c.WGS60={a:6378165,rf:298.3,ellipseName:"WGS 60"},c.WGS66={a:6378145,rf:298.25,ellipseName:"WGS 66"},c.WGS7={a:6378135,rf:298.26,ellipseName:"WGS 72"},c.WGS84={a:6378137,rf:298.257223563,ellipseName:"WGS 84"},c.sphere={a:6370997,b:6370997,ellipseName:"Normal Sphere (r=6370997)"}},{}],27:[function(a,b,c){c.greenwich=0,c.lisbon=-9.131906111111,c.paris=2.337229166667,c.bogota=-74.080916666667,c.madrid=-3.687938888889,c.rome=12.452333333333,c.bern=7.439583333333,c.jakarta=106.807719444444,c.ferro=-17.666666666667,c.brussels=4.367975,c.stockholm=18.058277777778,c.athens=23.7163375,c.oslo=10.722916666667},{}],28:[function(a,b,c){c.ft={to_meter:.3048},c["us-ft"]={to_meter:1200/3937}},{}],29:[function(a,b,c){function d(a,b,c){var d;return Array.isArray(c)?(d=g(a,b,c),3===c.length?[d.x,d.y,d.z]:[d.x,d.y]):g(a,b,c)}function e(a){return a instanceof f?a:a.oProj?a.oProj:f(a)}function proj4(a,b,c){a=e(a);var f,g=!1;return"undefined"==typeof b?(b=a,a=h,g=!0):("undefined"!=typeof b.x||Array.isArray(b))&&(c=b,b=a,a=h,g=!0),b=e(b),c?d(a,b,c):(f={forward:function(c){return d(a,b,c)},inverse:function(c){return d(b,a,c)}},g&&(f.oProj=b),f)}var f=a("./Proj"),g=a("./transform"),h=f("WGS84");b.exports=proj4},{"./Proj":2,"./transform":65}],30:[function(a,b,c){var d=Math.PI/2,e=1,f=2,g=3,h=4,i=5,j=484813681109536e-20,k=1.0026,l=.3826834323650898,m=function(a){if(!(this instanceof m))return new m(a);if(this.datum_type=h,a){if(a.datumCode&&"none"===a.datumCode&&(this.datum_type=i),a.datum_params){for(var b=0;b<a.datum_params.length;b++)a.datum_params[b]=parseFloat(a.datum_params[b]);(0!==a.datum_params[0]||0!==a.datum_params[1]||0!==a.datum_params[2])&&(this.datum_type=e),a.datum_params.length>3&&(0!==a.datum_params[3]||0!==a.datum_params[4]||0!==a.datum_params[5]||0!==a.datum_params[6])&&(this.datum_type=f,a.datum_params[3]*=j,a.datum_params[4]*=j,a.datum_params[5]*=j,a.datum_params[6]=a.datum_params[6]/1e6+1)}this.datum_type=a.grids?g:this.datum_type,this.a=a.a,this.b=a.b,this.es=a.es,this.ep2=a.ep2,this.datum_params=a.datum_params,this.datum_type===g&&(this.grids=a.grids)}};m.prototype={compare_datums:function(a){return this.datum_type!==a.datum_type?!1:this.a!==a.a||Math.abs(this.es-a.es)>5e-11?!1:this.datum_type===e?this.datum_params[0]===a.datum_params[0]&&this.datum_params[1]===a.datum_params[1]&&this.datum_params[2]===a.datum_params[2]:this.datum_type===f?this.datum_params[0]===a.datum_params[0]&&this.datum_params[1]===a.datum_params[1]&&this.datum_params[2]===a.datum_params[2]&&this.datum_params[3]===a.datum_params[3]&&this.datum_params[4]===a.datum_params[4]&&this.datum_params[5]===a.datum_params[5]&&this.datum_params[6]===a.datum_params[6]:this.datum_type===g||a.datum_type===g?this.nadgrids===a.nadgrids:!0},geodetic_to_geocentric:function(a){var b,c,e,f,g,h,i,j=a.x,k=a.y,l=a.z?a.z:0,m=0;if(-d>k&&k>-1.001*d)k=-d;else if(k>d&&1.001*d>k)k=d;else if(-d>k||k>d)return null;return j>Math.PI&&(j-=2*Math.PI),g=Math.sin(k),i=Math.cos(k),h=g*g,f=this.a/Math.sqrt(1-this.es*h),b=(f+l)*i*Math.cos(j),c=(f+l)*i*Math.sin(j),e=(f*(1-this.es)+l)*g,a.x=b,a.y=c,a.z=e,m},geocentric_to_geodetic:function(a){var b,c,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t=1e-12,u=t*t,v=30,w=a.x,x=a.y,y=a.z?a.z:0;if(o=!1,b=Math.sqrt(w*w+x*x),c=Math.sqrt(w*w+x*x+y*y),b/this.a<t){if(o=!0,q=0,c/this.a<t)return r=d,void(s=-this.b)}else q=Math.atan2(x,w);e=y/c,f=b/c,g=1/Math.sqrt(1-this.es*(2-this.es)*f*f),j=f*(1-this.es)*g,k=e*g,p=0;do p++,i=this.a/Math.sqrt(1-this.es*k*k),s=b*j+y*k-i*(1-this.es*k*k),h=this.es*i/(i+s),g=1/Math.sqrt(1-h*(2-h)*f*f),l=f*(1-h)*g,m=e*g,n=m*j-l*k,j=l,k=m;while(n*n>u&&v>p);return r=Math.atan(m/Math.abs(l)),a.x=q,a.y=r,a.z=s,a},geocentric_to_geodetic_noniter:function(a){var b,c,e,f,g,h,i,j,m,n,o,p,q,r,s,t,u,v=a.x,w=a.y,x=a.z?a.z:0;if(v=parseFloat(v),w=parseFloat(w),x=parseFloat(x),u=!1,0!==v)b=Math.atan2(w,v);else if(w>0)b=d;else if(0>w)b=-d;else if(u=!0,b=0,x>0)c=d;else{if(!(0>x))return c=d,void(e=-this.b);c=-d}return g=v*v+w*w,f=Math.sqrt(g),h=x*k,j=Math.sqrt(h*h+g),n=h/j,p=f/j,o=n*n*n,i=x+this.b*this.ep2*o,t=f-this.a*this.es*p*p*p,m=Math.sqrt(i*i+t*t),q=i/m,r=t/m,s=this.a/Math.sqrt(1-this.es*q*q),e=r>=l?f/r-s:-l>=r?f/-r-s:x/q+s*(this.es-1),u===!1&&(c=Math.atan(q/r)),a.x=b,a.y=c,a.z=e,a},geocentric_to_wgs84:function(a){if(this.datum_type===e)a.x+=this.datum_params[0],a.y+=this.datum_params[1],a.z+=this.datum_params[2];else if(this.datum_type===f){var b=this.datum_params[0],c=this.datum_params[1],d=this.datum_params[2],g=this.datum_params[3],h=this.datum_params[4],i=this.datum_params[5],j=this.datum_params[6],k=j*(a.x-i*a.y+h*a.z)+b,l=j*(i*a.x+a.y-g*a.z)+c,m=j*(-h*a.x+g*a.y+a.z)+d;a.x=k,a.y=l,a.z=m}},geocentric_from_wgs84:function(a){if(this.datum_type===e)a.x-=this.datum_params[0],a.y-=this.datum_params[1],a.z-=this.datum_params[2];else if(this.datum_type===f){var b=this.datum_params[0],c=this.datum_params[1],d=this.datum_params[2],g=this.datum_params[3],h=this.datum_params[4],i=this.datum_params[5],j=this.datum_params[6],k=(a.x-b)/j,l=(a.y-c)/j,m=(a.z-d)/j;a.x=k+i*l-h*m,a.y=-i*k+l+g*m,a.z=h*k-g*l+m}}},b.exports=m},{}],31:[function(a,b,c){var d=1,e=2,f=3,g=5,h=6378137,i=.006694379990141316;b.exports=function(a,b,c){function j(a){return a===d||a===e}var k,l,m;if(a.compare_datums(b))return c;if(a.datum_type===g||b.datum_type===g)return c;var n=a.a,o=a.es,p=b.a,q=b.es,r=a.datum_type;if(r===f)if(0===this.apply_gridshift(a,0,c))a.a=h,a.es=i;else{if(!a.datum_params)return a.a=n,a.es=a.es,c;for(k=1,l=0,m=a.datum_params.length;m>l;l++)k*=a.datum_params[l];if(0===k)return a.a=n,a.es=a.es,c;r=a.datum_params.length>3?e:d}return b.datum_type===f&&(b.a=h,b.es=i),(a.es!==b.es||a.a!==b.a||j(r)||j(b.datum_type))&&(a.geodetic_to_geocentric(c),j(a.datum_type)&&a.geocentric_to_wgs84(c),j(b.datum_type)&&b.geocentric_from_wgs84(c),b.geocentric_to_geodetic(c)),b.datum_type===f&&this.apply_gridshift(b,1,c),a.a=n,a.es=o,b.a=p,b.es=q,c}},{}],32:[function(a,b,c){function d(a){var b=this;if(2===arguments.length){var c=arguments[1];d[a]="string"==typeof c?"+"===c.charAt(0)?f(arguments[1]):g(arguments[1]):c}else if(1===arguments.length){if(Array.isArray(a))return a.map(function(a){Array.isArray(a)?d.apply(b,a):d(a)});if("string"==typeof a){if(a in d)return d[a]}else"EPSG"in a?d["EPSG:"+a.EPSG]=a:"ESRI"in a?d["ESRI:"+a.ESRI]=a:"IAU2000"in a?d["IAU2000:"+a.IAU2000]=a:console.log(a);return}}var e=a("./global"),f=a("./projString"),g=a("./wkt");e(d),b.exports=d},{"./global":35,"./projString":38,"./wkt":66}],33:[function(a,b,c){var d=a("./constants/Datum"),e=a("./constants/Ellipsoid"),f=a("./extend"),g=a("./datum"),h=1e-10,i=.16666666666666666,j=.04722222222222222,k=.022156084656084655;b.exports=function(a){if(a.datumCode&&"none"!==a.datumCode){var b=d[a.datumCode];b&&(a.datum_params=b.towgs84?b.towgs84.split(","):null,a.ellps=b.ellipse,a.datumName=b.datumName?b.datumName:a.datumCode)}if(!a.a){var c=e[a.ellps]?e[a.ellps]:e.WGS84;f(a,c)}return a.rf&&!a.b&&(a.b=(1-1/a.rf)*a.a),(0===a.rf||Math.abs(a.a-a.b)<h)&&(a.sphere=!0,a.b=a.a),a.a2=a.a*a.a,a.b2=a.b*a.b,a.es=(a.a2-a.b2)/a.a2,a.e=Math.sqrt(a.es),a.R_A&&(a.a*=1-a.es*(i+a.es*(j+a.es*k)),a.a2=a.a*a.a,a.b2=a.b*a.b,a.es=0),a.ep2=(a.a2-a.b2)/a.b2,a.k0||(a.k0=1),a.axis||(a.axis="enu"),a.datum||(a.datum=g(a)),a}},{"./constants/Datum":25,"./constants/Ellipsoid":26,"./datum":30,"./extend":34}],34:[function(a,b,c){b.exports=function(a,b){a=a||{};var c,d;if(!b)return a;for(d in b)c=b[d],void 0!==c&&(a[d]=c);return a}},{}],35:[function(a,b,c){b.exports=function(a){a("EPSG:4326","+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees"),a("EPSG:4269","+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees"),a("EPSG:3857","+title=WGS 84 / Pseudo-Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"),a.WGS84=a["EPSG:4326"],a["EPSG:3785"]=a["EPSG:3857"],a.GOOGLE=a["EPSG:3857"],a["EPSG:900913"]=a["EPSG:3857"],a["EPSG:102113"]=a["EPSG:3857"]}},{}],36:[function(a,b,c){var proj4=a("./core");proj4.defaultDatum="WGS84",proj4.Proj=a("./Proj"),proj4.WGS84=new proj4.Proj("WGS84"),proj4.Point=a("./Point"),proj4.toPoint=a("./common/toPoint"),proj4.defs=a("./defs"),proj4.transform=a("./transform"),proj4.mgrs=a("mgrs"),proj4.version=a("../package.json").version,a("./includedProjections")(proj4),b.exports=proj4},{"../package.json":68,"./Point":1,"./Proj":2,"./common/toPoint":23,"./core":29,"./defs":32,"./includedProjections":"hTEDpn","./transform":65,mgrs:67}],37:[function(a,b,c){function d(a){return"string"==typeof a}function e(a){return a in i}function f(a){var b=["GEOGCS","GEOCCS","PROJCS","LOCAL_CS"];return b.reduce(function(b,c){return b+1+a.indexOf(c)},0)}function g(a){return"+"===a[0]}function h(a){return d(a)?e(a)?i[a]:f(a)?j(a):g(a)?k(a):void 0:a}var i=a("./defs"),j=a("./wkt"),k=a("./projString");b.exports=h},{"./defs":32,"./projString":38,"./wkt":66}],38:[function(a,b,c){var d=.017453292519943295,e=a("./constants/PrimeMeridian"),f=a("./constants/units");b.exports=function(a){var b={},c={};a.split("+").map(function(a){return a.trim()}).filter(function(a){return a}).forEach(function(a){var b=a.split("=");b.push(!0),c[b[0].toLowerCase()]=b[1]});var g,h,i,j={proj:"projName",datum:"datumCode",rf:function(a){b.rf=parseFloat(a)},lat_0:function(a){b.lat0=a*d},lat_1:function(a){b.lat1=a*d},lat_2:function(a){b.lat2=a*d},lat_ts:function(a){b.lat_ts=a*d},lon_0:function(a){b.long0=a*d},lon_1:function(a){b.long1=a*d},lon_2:function(a){b.long2=a*d},alpha:function(a){b.alpha=parseFloat(a)*d},lonc:function(a){b.longc=a*d},x_0:function(a){b.x0=parseFloat(a)},y_0:function(a){b.y0=parseFloat(a)},k_0:function(a){b.k0=parseFloat(a)},k:function(a){b.k0=parseFloat(a)},a:function(a){b.a=parseFloat(a)},b:function(a){b.b=parseFloat(a)},r_a:function(){b.R_A=!0},zone:function(a){b.zone=parseInt(a,10)},south:function(){b.utmSouth=!0},towgs84:function(a){b.datum_params=a.split(",").map(function(a){return parseFloat(a)})},to_meter:function(a){b.to_meter=parseFloat(a)},units:function(a){b.units=a,f[a]&&(b.to_meter=f[a].to_meter)},from_greenwich:function(a){b.from_greenwich=a*d},pm:function(a){b.from_greenwich=(e[a]?e[a]:parseFloat(a))*d},nadgrids:function(a){"@null"===a?b.datumCode="none":b.nadgrids=a},axis:function(a){var c="ewnsud";3===a.length&&-1!==c.indexOf(a.substr(0,1))&&-1!==c.indexOf(a.substr(1,1))&&-1!==c.indexOf(a.substr(2,1))&&(b.axis=a)}};for(g in c)h=c[g],g in j?(i=j[g],"function"==typeof i?i(h):b[i]=h):b[g]=h;return"string"==typeof b.datumCode&&"WGS84"!==b.datumCode&&(b.datumCode=b.datumCode.toLowerCase()),b}},{"./constants/PrimeMeridian":27,"./constants/units":28}],39:[function(a,b,c){function d(a,b){var c=g.length;return a.names?(g[c]=a,a.names.forEach(function(a){f[a.toLowerCase()]=c}),this):(console.log(b),!0)}var e=[a("./projections/merc"),a("./projections/longlat")],f={},g=[];c.add=d,c.get=function(a){if(!a)return!1;var b=a.toLowerCase();return"undefined"!=typeof f[b]&&g[f[b]]?g[f[b]]:void 0},c.start=function(){e.forEach(d)}},{"./projections/longlat":51,"./projections/merc":52}],40:[function(a,b,c){var d=1e-10,e=a("../common/msfnz"),f=a("../common/qsfnz"),g=a("../common/adjust_lon"),h=a("../common/asinz");c.init=function(){Math.abs(this.lat1+this.lat2)<d||(this.temp=this.b/this.a,this.es=1-Math.pow(this.temp,2),this.e3=Math.sqrt(this.es),this.sin_po=Math.sin(this.lat1),this.cos_po=Math.cos(this.lat1),this.t1=this.sin_po,this.con=this.sin_po,this.ms1=e(this.e3,this.sin_po,this.cos_po),this.qs1=f(this.e3,this.sin_po,this.cos_po),this.sin_po=Math.sin(this.lat2),this.cos_po=Math.cos(this.lat2),this.t2=this.sin_po,this.ms2=e(this.e3,this.sin_po,this.cos_po),this.qs2=f(this.e3,this.sin_po,this.cos_po),this.sin_po=Math.sin(this.lat0),this.cos_po=Math.cos(this.lat0),this.t3=this.sin_po,this.qs0=f(this.e3,this.sin_po,this.cos_po),this.ns0=Math.abs(this.lat1-this.lat2)>d?(this.ms1*this.ms1-this.ms2*this.ms2)/(this.qs2-this.qs1):this.con,this.c=this.ms1*this.ms1+this.ns0*this.qs1,this.rh=this.a*Math.sqrt(this.c-this.ns0*this.qs0)/this.ns0)},c.forward=function(a){var b=a.x,c=a.y;this.sin_phi=Math.sin(c),this.cos_phi=Math.cos(c);var d=f(this.e3,this.sin_phi,this.cos_phi),e=this.a*Math.sqrt(this.c-this.ns0*d)/this.ns0,h=this.ns0*g(b-this.long0),i=e*Math.sin(h)+this.x0,j=this.rh-e*Math.cos(h)+this.y0;return a.x=i,a.y=j,a},c.inverse=function(a){var b,c,d,e,f,h;return a.x-=this.x0,a.y=this.rh-a.y+this.y0,this.ns0>=0?(b=Math.sqrt(a.x*a.x+a.y*a.y),d=1):(b=-Math.sqrt(a.x*a.x+a.y*a.y),d=-1),e=0,0!==b&&(e=Math.atan2(d*a.x,d*a.y)),d=b*this.ns0/this.a,this.sphere?h=Math.asin((this.c-d*d)/(2*this.ns0)):(c=(this.c-d*d)/this.ns0,h=this.phi1z(this.e3,c)),f=g(e/this.ns0+this.long0),a.x=f,a.y=h,a},c.phi1z=function(a,b){var c,e,f,g,i,j=h(.5*b);if(d>a)return j;for(var k=a*a,l=1;25>=l;l++)if(c=Math.sin(j),e=Math.cos(j),f=a*c,g=1-f*f,i=.5*g*g/e*(b/(1-k)-c/g+.5/a*Math.log((1-f)/(1+f))),j+=i,Math.abs(i)<=1e-7)return j;return null},c.names=["Albers_Conic_Equal_Area","Albers","aea"]},{"../common/adjust_lon":5,"../common/asinz":6,"../common/msfnz":15,"../common/qsfnz":20}],41:[function(a,b,c){var d=a("../common/adjust_lon"),e=Math.PI/2,f=1e-10,g=a("../common/mlfn"),h=a("../common/e0fn"),i=a("../common/e1fn"),j=a("../common/e2fn"),k=a("../common/e3fn"),l=a("../common/gN"),m=a("../common/asinz"),n=a("../common/imlfn");c.init=function(){this.sin_p12=Math.sin(this.lat0),this.cos_p12=Math.cos(this.lat0)},c.forward=function(a){var b,c,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H=a.x,I=a.y,J=Math.sin(a.y),K=Math.cos(a.y),L=d(H-this.long0);return this.sphere?Math.abs(this.sin_p12-1)<=f?(a.x=this.x0+this.a*(e-I)*Math.sin(L),a.y=this.y0-this.a*(e-I)*Math.cos(L),a):Math.abs(this.sin_p12+1)<=f?(a.x=this.x0+this.a*(e+I)*Math.sin(L),a.y=this.y0+this.a*(e+I)*Math.cos(L),a):(B=this.sin_p12*J+this.cos_p12*K*Math.cos(L),z=Math.acos(B),A=z/Math.sin(z),a.x=this.x0+this.a*A*K*Math.sin(L),a.y=this.y0+this.a*A*(this.cos_p12*J-this.sin_p12*K*Math.cos(L)),a):(b=h(this.es),c=i(this.es),m=j(this.es),n=k(this.es),Math.abs(this.sin_p12-1)<=f?(o=this.a*g(b,c,m,n,e),p=this.a*g(b,c,m,n,I),a.x=this.x0+(o-p)*Math.sin(L),a.y=this.y0-(o-p)*Math.cos(L),a):Math.abs(this.sin_p12+1)<=f?(o=this.a*g(b,c,m,n,e),p=this.a*g(b,c,m,n,I),a.x=this.x0+(o+p)*Math.sin(L),a.y=this.y0+(o+p)*Math.cos(L),a):(q=J/K,r=l(this.a,this.e,this.sin_p12),s=l(this.a,this.e,J),t=Math.atan((1-this.es)*q+this.es*r*this.sin_p12/(s*K)),u=Math.atan2(Math.sin(L),this.cos_p12*Math.tan(t)-this.sin_p12*Math.cos(L)),C=0===u?Math.asin(this.cos_p12*Math.sin(t)-this.sin_p12*Math.cos(t)):Math.abs(Math.abs(u)-Math.PI)<=f?-Math.asin(this.cos_p12*Math.sin(t)-this.sin_p12*Math.cos(t)):Math.asin(Math.sin(L)*Math.cos(t)/Math.sin(u)),v=this.e*this.sin_p12/Math.sqrt(1-this.es),w=this.e*this.cos_p12*Math.cos(u)/Math.sqrt(1-this.es),x=v*w,y=w*w,D=C*C,E=D*C,F=E*C,G=F*C,z=r*C*(1-D*y*(1-y)/6+E/8*x*(1-2*y)+F/120*(y*(4-7*y)-3*v*v*(1-7*y))-G/48*x),a.x=this.x0+z*Math.sin(u),a.y=this.y0+z*Math.cos(u),a))},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b,c,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I;if(this.sphere){if(b=Math.sqrt(a.x*a.x+a.y*a.y),b>2*e*this.a)return;return c=b/this.a,o=Math.sin(c),p=Math.cos(c),q=this.long0,Math.abs(b)<=f?r=this.lat0:(r=m(p*this.sin_p12+a.y*o*this.cos_p12/b),s=Math.abs(this.lat0)-e,q=d(Math.abs(s)<=f?this.lat0>=0?this.long0+Math.atan2(a.x,-a.y):this.long0-Math.atan2(-a.x,a.y):this.long0+Math.atan2(a.x*o,b*this.cos_p12*p-a.y*this.sin_p12*o))),a.x=q,a.y=r,a}return t=h(this.es),u=i(this.es),v=j(this.es),w=k(this.es),Math.abs(this.sin_p12-1)<=f?(x=this.a*g(t,u,v,w,e),b=Math.sqrt(a.x*a.x+a.y*a.y),y=x-b,r=n(y/this.a,t,u,v,w),q=d(this.long0+Math.atan2(a.x,-1*a.y)),a.x=q,a.y=r,a):Math.abs(this.sin_p12+1)<=f?(x=this.a*g(t,u,v,w,e),b=Math.sqrt(a.x*a.x+a.y*a.y),y=b-x,r=n(y/this.a,t,u,v,w),q=d(this.long0+Math.atan2(a.x,a.y)),a.x=q,a.y=r,a):(b=Math.sqrt(a.x*a.x+a.y*a.y),B=Math.atan2(a.x,a.y),z=l(this.a,this.e,this.sin_p12),C=Math.cos(B),D=this.e*this.cos_p12*C,E=-D*D/(1-this.es),F=3*this.es*(1-E)*this.sin_p12*this.cos_p12*C/(1-this.es),G=b/z,H=G-E*(1+E)*Math.pow(G,3)/6-F*(1+3*E)*Math.pow(G,4)/24,I=1-E*H*H/2-G*H*H*H/6,A=Math.asin(this.sin_p12*Math.cos(H)+this.cos_p12*Math.sin(H)*C),q=d(this.long0+Math.asin(Math.sin(B)*Math.sin(H)/Math.cos(A))),r=Math.atan((1-this.es*I*this.sin_p12/Math.sin(A))*Math.tan(A)/(1-this.es)),a.x=q,a.y=r,a)},c.names=["Azimuthal_Equidistant","aeqd"]},{"../common/adjust_lon":5,"../common/asinz":6,"../common/e0fn":7,"../common/e1fn":8,"../common/e2fn":9,"../common/e3fn":10,"../common/gN":11,"../common/imlfn":12,"../common/mlfn":14}],42:[function(a,b,c){var d=a("../common/mlfn"),e=a("../common/e0fn"),f=a("../common/e1fn"),g=a("../common/e2fn"),h=a("../common/e3fn"),i=a("../common/gN"),j=a("../common/adjust_lon"),k=a("../common/adjust_lat"),l=a("../common/imlfn"),m=Math.PI/2,n=1e-10;c.init=function(){this.sphere||(this.e0=e(this.es),this.e1=f(this.es),this.e2=g(this.es),this.e3=h(this.es),this.ml0=this.a*d(this.e0,this.e1,this.e2,this.e3,this.lat0))},c.forward=function(a){var b,c,e=a.x,f=a.y;if(e=j(e-this.long0),this.sphere)b=this.a*Math.asin(Math.cos(f)*Math.sin(e)),c=this.a*(Math.atan2(Math.tan(f),Math.cos(e))-this.lat0);else{var g=Math.sin(f),h=Math.cos(f),k=i(this.a,this.e,g),l=Math.tan(f)*Math.tan(f),m=e*Math.cos(f),n=m*m,o=this.es*h*h/(1-this.es),p=this.a*d(this.e0,this.e1,this.e2,this.e3,f);b=k*m*(1-n*l*(1/6-(8-l+8*o)*n/120)),c=p-this.ml0+k*g/h*n*(.5+(5-l+6*o)*n/24)}return a.x=b+this.x0,a.y=c+this.y0,a},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b,c,d=a.x/this.a,e=a.y/this.a;if(this.sphere){var f=e+this.lat0;b=Math.asin(Math.sin(f)*Math.cos(d)),c=Math.atan2(Math.tan(d),Math.cos(f))}else{var g=this.ml0/this.a+e,h=l(g,this.e0,this.e1,this.e2,this.e3);if(Math.abs(Math.abs(h)-m)<=n)return a.x=this.long0,a.y=m,0>e&&(a.y*=-1),a;var o=i(this.a,this.e,Math.sin(h)),p=o*o*o/this.a/this.a*(1-this.es),q=Math.pow(Math.tan(h),2),r=d*this.a/o,s=r*r;b=h-o*Math.tan(h)/p*r*r*(.5-(1+3*q)*r*r/24),c=r*(1-s*(q/3+(1+3*q)*q*s/15))/Math.cos(h)}return a.x=j(c+this.long0),a.y=k(b),a},c.names=["Cassini","Cassini_Soldner","cass"]},{"../common/adjust_lat":4,"../common/adjust_lon":5,"../common/e0fn":7,"../common/e1fn":8,"../common/e2fn":9,"../common/e3fn":10,"../common/gN":11,"../common/imlfn":12,"../common/mlfn":14}],43:[function(a,b,c){var d=a("../common/adjust_lon"),e=a("../common/qsfnz"),f=a("../common/msfnz"),g=a("../common/iqsfnz");c.init=function(){this.sphere||(this.k0=f(this.e,Math.sin(this.lat_ts),Math.cos(this.lat_ts)))},c.forward=function(a){var b,c,f=a.x,g=a.y,h=d(f-this.long0);if(this.sphere)b=this.x0+this.a*h*Math.cos(this.lat_ts),c=this.y0+this.a*Math.sin(g)/Math.cos(this.lat_ts);else{var i=e(this.e,Math.sin(g));b=this.x0+this.a*this.k0*h,c=this.y0+this.a*i*.5/this.k0}return a.x=b,a.y=c,a},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b,c;return this.sphere?(b=d(this.long0+a.x/this.a/Math.cos(this.lat_ts)),c=Math.asin(a.y/this.a*Math.cos(this.lat_ts))):(c=g(this.e,2*a.y*this.k0/this.a),b=d(this.long0+a.x/(this.a*this.k0))),a.x=b,a.y=c,a},c.names=["cea"]},{"../common/adjust_lon":5,"../common/iqsfnz":13,"../common/msfnz":15,"../common/qsfnz":20}],44:[function(a,b,c){var d=a("../common/adjust_lon"),e=a("../common/adjust_lat");c.init=function(){this.x0=this.x0||0,this.y0=this.y0||0,this.lat0=this.lat0||0,this.long0=this.long0||0,this.lat_ts=this.lat_ts||0,this.title=this.title||"Equidistant Cylindrical (Plate Carre)",this.rc=Math.cos(this.lat_ts)},c.forward=function(a){var b=a.x,c=a.y,f=d(b-this.long0),g=e(c-this.lat0);return a.x=this.x0+this.a*f*this.rc,a.y=this.y0+this.a*g,a},c.inverse=function(a){var b=a.x,c=a.y;return a.x=d(this.long0+(b-this.x0)/(this.a*this.rc)),a.y=e(this.lat0+(c-this.y0)/this.a),a},c.names=["Equirectangular","Equidistant_Cylindrical","eqc"]},{"../common/adjust_lat":4,"../common/adjust_lon":5}],45:[function(a,b,c){var d=a("../common/e0fn"),e=a("../common/e1fn"),f=a("../common/e2fn"),g=a("../common/e3fn"),h=a("../common/msfnz"),i=a("../common/mlfn"),j=a("../common/adjust_lon"),k=a("../common/adjust_lat"),l=a("../common/imlfn"),m=1e-10;c.init=function(){Math.abs(this.lat1+this.lat2)<m||(this.lat2=this.lat2||this.lat1,this.temp=this.b/this.a,this.es=1-Math.pow(this.temp,2),this.e=Math.sqrt(this.es),this.e0=d(this.es),this.e1=e(this.es),this.e2=f(this.es),this.e3=g(this.es),this.sinphi=Math.sin(this.lat1),this.cosphi=Math.cos(this.lat1),this.ms1=h(this.e,this.sinphi,this.cosphi),this.ml1=i(this.e0,this.e1,this.e2,this.e3,this.lat1),Math.abs(this.lat1-this.lat2)<m?this.ns=this.sinphi:(this.sinphi=Math.sin(this.lat2),this.cosphi=Math.cos(this.lat2),this.ms2=h(this.e,this.sinphi,this.cosphi),this.ml2=i(this.e0,this.e1,this.e2,this.e3,this.lat2),this.ns=(this.ms1-this.ms2)/(this.ml2-this.ml1)),this.g=this.ml1+this.ms1/this.ns,this.ml0=i(this.e0,this.e1,this.e2,this.e3,this.lat0),this.rh=this.a*(this.g-this.ml0))},c.forward=function(a){var b,c=a.x,d=a.y;if(this.sphere)b=this.a*(this.g-d);else{var e=i(this.e0,this.e1,this.e2,this.e3,d);b=this.a*(this.g-e)}var f=this.ns*j(c-this.long0),g=this.x0+b*Math.sin(f),h=this.y0+this.rh-b*Math.cos(f);return a.x=g,a.y=h,a},c.inverse=function(a){a.x-=this.x0,a.y=this.rh-a.y+this.y0;var b,c,d,e;this.ns>=0?(c=Math.sqrt(a.x*a.x+a.y*a.y),b=1):(c=-Math.sqrt(a.x*a.x+a.y*a.y),b=-1);var f=0;if(0!==c&&(f=Math.atan2(b*a.x,b*a.y)),this.sphere)return e=j(this.long0+f/this.ns),d=k(this.g-c/this.a),a.x=e,a.y=d,a;var g=this.g-c/this.a;return d=l(g,this.e0,this.e1,this.e2,this.e3),e=j(this.long0+f/this.ns),a.x=e,a.y=d,a},c.names=["Equidistant_Conic","eqdc"]},{"../common/adjust_lat":4,"../common/adjust_lon":5,"../common/e0fn":7,"../common/e1fn":8,"../common/e2fn":9,"../common/e3fn":10,"../common/imlfn":12,"../common/mlfn":14,"../common/msfnz":15}],46:[function(a,b,c){var d=Math.PI/4,e=a("../common/srat"),f=Math.PI/2,g=20;c.init=function(){var a=Math.sin(this.lat0),b=Math.cos(this.lat0);b*=b,this.rc=Math.sqrt(1-this.es)/(1-this.es*a*a),this.C=Math.sqrt(1+this.es*b*b/(1-this.es)),this.phic0=Math.asin(a/this.C),this.ratexp=.5*this.C*this.e,this.K=Math.tan(.5*this.phic0+d)/(Math.pow(Math.tan(.5*this.lat0+d),this.C)*e(this.e*a,this.ratexp))},c.forward=function(a){var b=a.x,c=a.y;return a.y=2*Math.atan(this.K*Math.pow(Math.tan(.5*c+d),this.C)*e(this.e*Math.sin(c),this.ratexp))-f,a.x=this.C*b,a},c.inverse=function(a){for(var b=1e-14,c=a.x/this.C,h=a.y,i=Math.pow(Math.tan(.5*h+d)/this.K,1/this.C),j=g;j>0&&(h=2*Math.atan(i*e(this.e*Math.sin(a.y),-.5*this.e))-f,!(Math.abs(h-a.y)<b));--j)a.y=h;return j?(a.x=c,a.y=h,a):null},c.names=["gauss"]},{"../common/srat":22}],47:[function(a,b,c){var d=a("../common/adjust_lon"),e=1e-10,f=a("../common/asinz");c.init=function(){this.sin_p14=Math.sin(this.lat0),
this.cos_p14=Math.cos(this.lat0),this.infinity_dist=1e3*this.a,this.rc=1},c.forward=function(a){var b,c,f,g,h,i,j,k,l=a.x,m=a.y;return f=d(l-this.long0),b=Math.sin(m),c=Math.cos(m),g=Math.cos(f),i=this.sin_p14*b+this.cos_p14*c*g,h=1,i>0||Math.abs(i)<=e?(j=this.x0+this.a*h*c*Math.sin(f)/i,k=this.y0+this.a*h*(this.cos_p14*b-this.sin_p14*c*g)/i):(j=this.x0+this.infinity_dist*c*Math.sin(f),k=this.y0+this.infinity_dist*(this.cos_p14*b-this.sin_p14*c*g)),a.x=j,a.y=k,a},c.inverse=function(a){var b,c,e,g,h,i;return a.x=(a.x-this.x0)/this.a,a.y=(a.y-this.y0)/this.a,a.x/=this.k0,a.y/=this.k0,(b=Math.sqrt(a.x*a.x+a.y*a.y))?(g=Math.atan2(b,this.rc),c=Math.sin(g),e=Math.cos(g),i=f(e*this.sin_p14+a.y*c*this.cos_p14/b),h=Math.atan2(a.x*c,b*this.cos_p14*e-a.y*this.sin_p14*c),h=d(this.long0+h)):(i=this.phic0,h=0),a.x=h,a.y=i,a},c.names=["gnom"]},{"../common/adjust_lon":5,"../common/asinz":6}],48:[function(a,b,c){var d=a("../common/adjust_lon");c.init=function(){this.a=6377397.155,this.es=.006674372230614,this.e=Math.sqrt(this.es),this.lat0||(this.lat0=.863937979737193),this.long0||(this.long0=.4334234309119251),this.k0||(this.k0=.9999),this.s45=.785398163397448,this.s90=2*this.s45,this.fi0=this.lat0,this.e2=this.es,this.e=Math.sqrt(this.e2),this.alfa=Math.sqrt(1+this.e2*Math.pow(Math.cos(this.fi0),4)/(1-this.e2)),this.uq=1.04216856380474,this.u0=Math.asin(Math.sin(this.fi0)/this.alfa),this.g=Math.pow((1+this.e*Math.sin(this.fi0))/(1-this.e*Math.sin(this.fi0)),this.alfa*this.e/2),this.k=Math.tan(this.u0/2+this.s45)/Math.pow(Math.tan(this.fi0/2+this.s45),this.alfa)*this.g,this.k1=this.k0,this.n0=this.a*Math.sqrt(1-this.e2)/(1-this.e2*Math.pow(Math.sin(this.fi0),2)),this.s0=1.37008346281555,this.n=Math.sin(this.s0),this.ro0=this.k1*this.n0/Math.tan(this.s0),this.ad=this.s90-this.uq},c.forward=function(a){var b,c,e,f,g,h,i,j=a.x,k=a.y,l=d(j-this.long0);return b=Math.pow((1+this.e*Math.sin(k))/(1-this.e*Math.sin(k)),this.alfa*this.e/2),c=2*(Math.atan(this.k*Math.pow(Math.tan(k/2+this.s45),this.alfa)/b)-this.s45),e=-l*this.alfa,f=Math.asin(Math.cos(this.ad)*Math.sin(c)+Math.sin(this.ad)*Math.cos(c)*Math.cos(e)),g=Math.asin(Math.cos(c)*Math.sin(e)/Math.cos(f)),h=this.n*g,i=this.ro0*Math.pow(Math.tan(this.s0/2+this.s45),this.n)/Math.pow(Math.tan(f/2+this.s45),this.n),a.y=i*Math.cos(h)/1,a.x=i*Math.sin(h)/1,this.czech||(a.y*=-1,a.x*=-1),a},c.inverse=function(a){var b,c,d,e,f,g,h,i,j=a.x;a.x=a.y,a.y=j,this.czech||(a.y*=-1,a.x*=-1),g=Math.sqrt(a.x*a.x+a.y*a.y),f=Math.atan2(a.y,a.x),e=f/Math.sin(this.s0),d=2*(Math.atan(Math.pow(this.ro0/g,1/this.n)*Math.tan(this.s0/2+this.s45))-this.s45),b=Math.asin(Math.cos(this.ad)*Math.sin(d)-Math.sin(this.ad)*Math.cos(d)*Math.cos(e)),c=Math.asin(Math.cos(d)*Math.sin(e)/Math.cos(b)),a.x=this.long0-c/this.alfa,h=b,i=0;var k=0;do a.y=2*(Math.atan(Math.pow(this.k,-1/this.alfa)*Math.pow(Math.tan(b/2+this.s45),1/this.alfa)*Math.pow((1+this.e*Math.sin(h))/(1-this.e*Math.sin(h)),this.e/2))-this.s45),Math.abs(h-a.y)<1e-10&&(i=1),h=a.y,k+=1;while(0===i&&15>k);return k>=15?null:a},c.names=["Krovak","krovak"]},{"../common/adjust_lon":5}],49:[function(a,b,c){var d=Math.PI/2,e=Math.PI/4,f=1e-10,g=a("../common/qsfnz"),h=a("../common/adjust_lon");c.S_POLE=1,c.N_POLE=2,c.EQUIT=3,c.OBLIQ=4,c.init=function(){var a=Math.abs(this.lat0);if(this.mode=Math.abs(a-d)<f?this.lat0<0?this.S_POLE:this.N_POLE:Math.abs(a)<f?this.EQUIT:this.OBLIQ,this.es>0){var b;switch(this.qp=g(this.e,1),this.mmf=.5/(1-this.es),this.apa=this.authset(this.es),this.mode){case this.N_POLE:this.dd=1;break;case this.S_POLE:this.dd=1;break;case this.EQUIT:this.rq=Math.sqrt(.5*this.qp),this.dd=1/this.rq,this.xmf=1,this.ymf=.5*this.qp;break;case this.OBLIQ:this.rq=Math.sqrt(.5*this.qp),b=Math.sin(this.lat0),this.sinb1=g(this.e,b)/this.qp,this.cosb1=Math.sqrt(1-this.sinb1*this.sinb1),this.dd=Math.cos(this.lat0)/(Math.sqrt(1-this.es*b*b)*this.rq*this.cosb1),this.ymf=(this.xmf=this.rq)/this.dd,this.xmf*=this.dd}}else this.mode===this.OBLIQ&&(this.sinph0=Math.sin(this.lat0),this.cosph0=Math.cos(this.lat0))},c.forward=function(a){var b,c,i,j,k,l,m,n,o,p,q=a.x,r=a.y;if(q=h(q-this.long0),this.sphere){if(k=Math.sin(r),p=Math.cos(r),i=Math.cos(q),this.mode===this.OBLIQ||this.mode===this.EQUIT){if(c=this.mode===this.EQUIT?1+p*i:1+this.sinph0*k+this.cosph0*p*i,f>=c)return null;c=Math.sqrt(2/c),b=c*p*Math.sin(q),c*=this.mode===this.EQUIT?k:this.cosph0*k-this.sinph0*p*i}else if(this.mode===this.N_POLE||this.mode===this.S_POLE){if(this.mode===this.N_POLE&&(i=-i),Math.abs(r+this.phi0)<f)return null;c=e-.5*r,c=2*(this.mode===this.S_POLE?Math.cos(c):Math.sin(c)),b=c*Math.sin(q),c*=i}}else{switch(m=0,n=0,o=0,i=Math.cos(q),j=Math.sin(q),k=Math.sin(r),l=g(this.e,k),(this.mode===this.OBLIQ||this.mode===this.EQUIT)&&(m=l/this.qp,n=Math.sqrt(1-m*m)),this.mode){case this.OBLIQ:o=1+this.sinb1*m+this.cosb1*n*i;break;case this.EQUIT:o=1+n*i;break;case this.N_POLE:o=d+r,l=this.qp-l;break;case this.S_POLE:o=r-d,l=this.qp+l}if(Math.abs(o)<f)return null;switch(this.mode){case this.OBLIQ:case this.EQUIT:o=Math.sqrt(2/o),c=this.mode===this.OBLIQ?this.ymf*o*(this.cosb1*m-this.sinb1*n*i):(o=Math.sqrt(2/(1+n*i)))*m*this.ymf,b=this.xmf*o*n*j;break;case this.N_POLE:case this.S_POLE:l>=0?(b=(o=Math.sqrt(l))*j,c=i*(this.mode===this.S_POLE?o:-o)):b=c=0}}return a.x=this.a*b+this.x0,a.y=this.a*c+this.y0,a},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b,c,e,g,i,j,k,l=a.x/this.a,m=a.y/this.a;if(this.sphere){var n,o=0,p=0;if(n=Math.sqrt(l*l+m*m),c=.5*n,c>1)return null;switch(c=2*Math.asin(c),(this.mode===this.OBLIQ||this.mode===this.EQUIT)&&(p=Math.sin(c),o=Math.cos(c)),this.mode){case this.EQUIT:c=Math.abs(n)<=f?0:Math.asin(m*p/n),l*=p,m=o*n;break;case this.OBLIQ:c=Math.abs(n)<=f?this.phi0:Math.asin(o*this.sinph0+m*p*this.cosph0/n),l*=p*this.cosph0,m=(o-Math.sin(c)*this.sinph0)*n;break;case this.N_POLE:m=-m,c=d-c;break;case this.S_POLE:c-=d}b=0!==m||this.mode!==this.EQUIT&&this.mode!==this.OBLIQ?Math.atan2(l,m):0}else{if(k=0,this.mode===this.OBLIQ||this.mode===this.EQUIT){if(l/=this.dd,m*=this.dd,j=Math.sqrt(l*l+m*m),f>j)return a.x=0,a.y=this.phi0,a;g=2*Math.asin(.5*j/this.rq),e=Math.cos(g),l*=g=Math.sin(g),this.mode===this.OBLIQ?(k=e*this.sinb1+m*g*this.cosb1/j,i=this.qp*k,m=j*this.cosb1*e-m*this.sinb1*g):(k=m*g/j,i=this.qp*k,m=j*e)}else if(this.mode===this.N_POLE||this.mode===this.S_POLE){if(this.mode===this.N_POLE&&(m=-m),i=l*l+m*m,!i)return a.x=0,a.y=this.phi0,a;k=1-i/this.qp,this.mode===this.S_POLE&&(k=-k)}b=Math.atan2(l,m),c=this.authlat(Math.asin(k),this.apa)}return a.x=h(this.long0+b),a.y=c,a},c.P00=.3333333333333333,c.P01=.17222222222222222,c.P02=.10257936507936508,c.P10=.06388888888888888,c.P11=.0664021164021164,c.P20=.016415012942191543,c.authset=function(a){var b,c=[];return c[0]=a*this.P00,b=a*a,c[0]+=b*this.P01,c[1]=b*this.P10,b*=a,c[0]+=b*this.P02,c[1]+=b*this.P11,c[2]=b*this.P20,c},c.authlat=function(a,b){var c=a+a;return a+b[0]*Math.sin(c)+b[1]*Math.sin(c+c)+b[2]*Math.sin(c+c+c)},c.names=["Lambert Azimuthal Equal Area","Lambert_Azimuthal_Equal_Area","laea"]},{"../common/adjust_lon":5,"../common/qsfnz":20}],50:[function(a,b,c){var d=1e-10,e=a("../common/msfnz"),f=a("../common/tsfnz"),g=Math.PI/2,h=a("../common/sign"),i=a("../common/adjust_lon"),j=a("../common/phi2z");c.init=function(){if(this.lat2||(this.lat2=this.lat1),this.k0||(this.k0=1),this.x0=this.x0||0,this.y0=this.y0||0,!(Math.abs(this.lat1+this.lat2)<d)){var a=this.b/this.a;this.e=Math.sqrt(1-a*a);var b=Math.sin(this.lat1),c=Math.cos(this.lat1),g=e(this.e,b,c),h=f(this.e,this.lat1,b),i=Math.sin(this.lat2),j=Math.cos(this.lat2),k=e(this.e,i,j),l=f(this.e,this.lat2,i),m=f(this.e,this.lat0,Math.sin(this.lat0));this.ns=Math.abs(this.lat1-this.lat2)>d?Math.log(g/k)/Math.log(h/l):b,isNaN(this.ns)&&(this.ns=b),this.f0=g/(this.ns*Math.pow(h,this.ns)),this.rh=this.a*this.f0*Math.pow(m,this.ns),this.title||(this.title="Lambert Conformal Conic")}},c.forward=function(a){var b=a.x,c=a.y;Math.abs(2*Math.abs(c)-Math.PI)<=d&&(c=h(c)*(g-2*d));var e,j,k=Math.abs(Math.abs(c)-g);if(k>d)e=f(this.e,c,Math.sin(c)),j=this.a*this.f0*Math.pow(e,this.ns);else{if(k=c*this.ns,0>=k)return null;j=0}var l=this.ns*i(b-this.long0);return a.x=this.k0*j*Math.sin(l)+this.x0,a.y=this.k0*(this.rh-j*Math.cos(l))+this.y0,a},c.inverse=function(a){var b,c,d,e,f,h=(a.x-this.x0)/this.k0,k=this.rh-(a.y-this.y0)/this.k0;this.ns>0?(b=Math.sqrt(h*h+k*k),c=1):(b=-Math.sqrt(h*h+k*k),c=-1);var l=0;if(0!==b&&(l=Math.atan2(c*h,c*k)),0!==b||this.ns>0){if(c=1/this.ns,d=Math.pow(b/(this.a*this.f0),c),e=j(this.e,d),-9999===e)return null}else e=-g;return f=i(l/this.ns+this.long0),a.x=f,a.y=e,a},c.names=["Lambert Tangential Conformal Conic Projection","Lambert_Conformal_Conic","Lambert_Conformal_Conic_2SP","lcc"]},{"../common/adjust_lon":5,"../common/msfnz":15,"../common/phi2z":16,"../common/sign":21,"../common/tsfnz":24}],51:[function(a,b,c){function d(a){return a}c.init=function(){},c.forward=d,c.inverse=d,c.names=["longlat","identity"]},{}],52:[function(a,b,c){var d=a("../common/msfnz"),e=Math.PI/2,f=1e-10,g=57.29577951308232,h=a("../common/adjust_lon"),i=Math.PI/4,j=a("../common/tsfnz"),k=a("../common/phi2z");c.init=function(){var a=this.b/this.a;this.es=1-a*a,"x0"in this||(this.x0=0),"y0"in this||(this.y0=0),this.e=Math.sqrt(this.es),this.lat_ts?this.k0=this.sphere?Math.cos(this.lat_ts):d(this.e,Math.sin(this.lat_ts),Math.cos(this.lat_ts)):this.k0||(this.k0=this.k?this.k:1)},c.forward=function(a){var b=a.x,c=a.y;if(c*g>90&&-90>c*g&&b*g>180&&-180>b*g)return null;var d,k;if(Math.abs(Math.abs(c)-e)<=f)return null;if(this.sphere)d=this.x0+this.a*this.k0*h(b-this.long0),k=this.y0+this.a*this.k0*Math.log(Math.tan(i+.5*c));else{var l=Math.sin(c),m=j(this.e,c,l);d=this.x0+this.a*this.k0*h(b-this.long0),k=this.y0-this.a*this.k0*Math.log(m)}return a.x=d,a.y=k,a},c.inverse=function(a){var b,c,d=a.x-this.x0,f=a.y-this.y0;if(this.sphere)c=e-2*Math.atan(Math.exp(-f/(this.a*this.k0)));else{var g=Math.exp(-f/(this.a*this.k0));if(c=k(this.e,g),-9999===c)return null}return b=h(this.long0+d/(this.a*this.k0)),a.x=b,a.y=c,a},c.names=["Mercator","Popular Visualisation Pseudo Mercator","Mercator_1SP","Mercator_Auxiliary_Sphere","merc"]},{"../common/adjust_lon":5,"../common/msfnz":15,"../common/phi2z":16,"../common/tsfnz":24}],53:[function(a,b,c){var d=a("../common/adjust_lon");c.init=function(){},c.forward=function(a){var b=a.x,c=a.y,e=d(b-this.long0),f=this.x0+this.a*e,g=this.y0+this.a*Math.log(Math.tan(Math.PI/4+c/2.5))*1.25;return a.x=f,a.y=g,a},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b=d(this.long0+a.x/this.a),c=2.5*(Math.atan(Math.exp(.8*a.y/this.a))-Math.PI/4);return a.x=b,a.y=c,a},c.names=["Miller_Cylindrical","mill"]},{"../common/adjust_lon":5}],54:[function(a,b,c){var d=a("../common/adjust_lon"),e=1e-10;c.init=function(){},c.forward=function(a){for(var b=a.x,c=a.y,f=d(b-this.long0),g=c,h=Math.PI*Math.sin(c),i=0;!0;i++){var j=-(g+Math.sin(g)-h)/(1+Math.cos(g));if(g+=j,Math.abs(j)<e)break}g/=2,Math.PI/2-Math.abs(c)<e&&(f=0);var k=.900316316158*this.a*f*Math.cos(g)+this.x0,l=1.4142135623731*this.a*Math.sin(g)+this.y0;return a.x=k,a.y=l,a},c.inverse=function(a){var b,c;a.x-=this.x0,a.y-=this.y0,c=a.y/(1.4142135623731*this.a),Math.abs(c)>.999999999999&&(c=.999999999999),b=Math.asin(c);var e=d(this.long0+a.x/(.900316316158*this.a*Math.cos(b)));e<-Math.PI&&(e=-Math.PI),e>Math.PI&&(e=Math.PI),c=(2*b+Math.sin(2*b))/Math.PI,Math.abs(c)>1&&(c=1);var f=Math.asin(c);return a.x=e,a.y=f,a},c.names=["Mollweide","moll"]},{"../common/adjust_lon":5}],55:[function(a,b,c){var d=484813681109536e-20;c.iterations=1,c.init=function(){this.A=[],this.A[1]=.6399175073,this.A[2]=-.1358797613,this.A[3]=.063294409,this.A[4]=-.02526853,this.A[5]=.0117879,this.A[6]=-.0055161,this.A[7]=.0026906,this.A[8]=-.001333,this.A[9]=67e-5,this.A[10]=-34e-5,this.B_re=[],this.B_im=[],this.B_re[1]=.7557853228,this.B_im[1]=0,this.B_re[2]=.249204646,this.B_im[2]=.003371507,this.B_re[3]=-.001541739,this.B_im[3]=.04105856,this.B_re[4]=-.10162907,this.B_im[4]=.01727609,this.B_re[5]=-.26623489,this.B_im[5]=-.36249218,this.B_re[6]=-.6870983,this.B_im[6]=-1.1651967,this.C_re=[],this.C_im=[],this.C_re[1]=1.3231270439,this.C_im[1]=0,this.C_re[2]=-.577245789,this.C_im[2]=-.007809598,this.C_re[3]=.508307513,this.C_im[3]=-.112208952,this.C_re[4]=-.15094762,this.C_im[4]=.18200602,this.C_re[5]=1.01418179,this.C_im[5]=1.64497696,this.C_re[6]=1.9660549,this.C_im[6]=2.5127645,this.D=[],this.D[1]=1.5627014243,this.D[2]=.5185406398,this.D[3]=-.03333098,this.D[4]=-.1052906,this.D[5]=-.0368594,this.D[6]=.007317,this.D[7]=.0122,this.D[8]=.00394,this.D[9]=-.0013},c.forward=function(a){var b,c=a.x,e=a.y,f=e-this.lat0,g=c-this.long0,h=f/d*1e-5,i=g,j=1,k=0;for(b=1;10>=b;b++)j*=h,k+=this.A[b]*j;var l,m,n=k,o=i,p=1,q=0,r=0,s=0;for(b=1;6>=b;b++)l=p*n-q*o,m=q*n+p*o,p=l,q=m,r=r+this.B_re[b]*p-this.B_im[b]*q,s=s+this.B_im[b]*p+this.B_re[b]*q;return a.x=s*this.a+this.x0,a.y=r*this.a+this.y0,a},c.inverse=function(a){var b,c,e,f=a.x,g=a.y,h=f-this.x0,i=g-this.y0,j=i/this.a,k=h/this.a,l=1,m=0,n=0,o=0;for(b=1;6>=b;b++)c=l*j-m*k,e=m*j+l*k,l=c,m=e,n=n+this.C_re[b]*l-this.C_im[b]*m,o=o+this.C_im[b]*l+this.C_re[b]*m;for(var p=0;p<this.iterations;p++){var q,r,s=n,t=o,u=j,v=k;for(b=2;6>=b;b++)q=s*n-t*o,r=t*n+s*o,s=q,t=r,u+=(b-1)*(this.B_re[b]*s-this.B_im[b]*t),v+=(b-1)*(this.B_im[b]*s+this.B_re[b]*t);s=1,t=0;var w=this.B_re[1],x=this.B_im[1];for(b=2;6>=b;b++)q=s*n-t*o,r=t*n+s*o,s=q,t=r,w+=b*(this.B_re[b]*s-this.B_im[b]*t),x+=b*(this.B_im[b]*s+this.B_re[b]*t);var y=w*w+x*x;n=(u*w+v*x)/y,o=(v*w-u*x)/y}var z=n,A=o,B=1,C=0;for(b=1;9>=b;b++)B*=z,C+=this.D[b]*B;var D=this.lat0+C*d*1e5,E=this.long0+A;return a.x=E,a.y=D,a},c.names=["New_Zealand_Map_Grid","nzmg"]},{}],56:[function(a,b,c){var d=a("../common/tsfnz"),e=a("../common/adjust_lon"),f=a("../common/phi2z"),g=Math.PI/2,h=Math.PI/4,i=1e-10;c.init=function(){this.no_off=this.no_off||!1,this.no_rot=this.no_rot||!1,isNaN(this.k0)&&(this.k0=1);var a=Math.sin(this.lat0),b=Math.cos(this.lat0),c=this.e*a;this.bl=Math.sqrt(1+this.es/(1-this.es)*Math.pow(b,4)),this.al=this.a*this.bl*this.k0*Math.sqrt(1-this.es)/(1-c*c);var f=d(this.e,this.lat0,a),g=this.bl/b*Math.sqrt((1-this.es)/(1-c*c));1>g*g&&(g=1);var h,i;if(isNaN(this.longc)){var j=d(this.e,this.lat1,Math.sin(this.lat1)),k=d(this.e,this.lat2,Math.sin(this.lat2));this.el=this.lat0>=0?(g+Math.sqrt(g*g-1))*Math.pow(f,this.bl):(g-Math.sqrt(g*g-1))*Math.pow(f,this.bl);var l=Math.pow(j,this.bl),m=Math.pow(k,this.bl);h=this.el/l,i=.5*(h-1/h);var n=(this.el*this.el-m*l)/(this.el*this.el+m*l),o=(m-l)/(m+l),p=e(this.long1-this.long2);this.long0=.5*(this.long1+this.long2)-Math.atan(n*Math.tan(.5*this.bl*p)/o)/this.bl,this.long0=e(this.long0);var q=e(this.long1-this.long0);this.gamma0=Math.atan(Math.sin(this.bl*q)/i),this.alpha=Math.asin(g*Math.sin(this.gamma0))}else h=this.lat0>=0?g+Math.sqrt(g*g-1):g-Math.sqrt(g*g-1),this.el=h*Math.pow(f,this.bl),i=.5*(h-1/h),this.gamma0=Math.asin(Math.sin(this.alpha)/g),this.long0=this.longc-Math.asin(i*Math.tan(this.gamma0))/this.bl;this.uc=this.no_off?0:this.lat0>=0?this.al/this.bl*Math.atan2(Math.sqrt(g*g-1),Math.cos(this.alpha)):-1*this.al/this.bl*Math.atan2(Math.sqrt(g*g-1),Math.cos(this.alpha))},c.forward=function(a){var b,c,f,j=a.x,k=a.y,l=e(j-this.long0);if(Math.abs(Math.abs(k)-g)<=i)f=k>0?-1:1,c=this.al/this.bl*Math.log(Math.tan(h+f*this.gamma0*.5)),b=-1*f*g*this.al/this.bl;else{var m=d(this.e,k,Math.sin(k)),n=this.el/Math.pow(m,this.bl),o=.5*(n-1/n),p=.5*(n+1/n),q=Math.sin(this.bl*l),r=(o*Math.sin(this.gamma0)-q*Math.cos(this.gamma0))/p;c=Math.abs(Math.abs(r)-1)<=i?Number.POSITIVE_INFINITY:.5*this.al*Math.log((1-r)/(1+r))/this.bl,b=Math.abs(Math.cos(this.bl*l))<=i?this.al*this.bl*l:this.al*Math.atan2(o*Math.cos(this.gamma0)+q*Math.sin(this.gamma0),Math.cos(this.bl*l))/this.bl}return this.no_rot?(a.x=this.x0+b,a.y=this.y0+c):(b-=this.uc,a.x=this.x0+c*Math.cos(this.alpha)+b*Math.sin(this.alpha),a.y=this.y0+b*Math.cos(this.alpha)-c*Math.sin(this.alpha)),a},c.inverse=function(a){var b,c;this.no_rot?(c=a.y-this.y0,b=a.x-this.x0):(c=(a.x-this.x0)*Math.cos(this.alpha)-(a.y-this.y0)*Math.sin(this.alpha),b=(a.y-this.y0)*Math.cos(this.alpha)+(a.x-this.x0)*Math.sin(this.alpha),b+=this.uc);var d=Math.exp(-1*this.bl*c/this.al),h=.5*(d-1/d),j=.5*(d+1/d),k=Math.sin(this.bl*b/this.al),l=(k*Math.cos(this.gamma0)+h*Math.sin(this.gamma0))/j,m=Math.pow(this.el/Math.sqrt((1+l)/(1-l)),1/this.bl);return Math.abs(l-1)<i?(a.x=this.long0,a.y=g):Math.abs(l+1)<i?(a.x=this.long0,a.y=-1*g):(a.y=f(this.e,m),a.x=e(this.long0-Math.atan2(h*Math.cos(this.gamma0)-k*Math.sin(this.gamma0),Math.cos(this.bl*b/this.al))/this.bl)),a},c.names=["Hotine_Oblique_Mercator","Hotine Oblique Mercator","Hotine_Oblique_Mercator_Azimuth_Natural_Origin","Hotine_Oblique_Mercator_Azimuth_Center","omerc"]},{"../common/adjust_lon":5,"../common/phi2z":16,"../common/tsfnz":24}],57:[function(a,b,c){var d=a("../common/e0fn"),e=a("../common/e1fn"),f=a("../common/e2fn"),g=a("../common/e3fn"),h=a("../common/adjust_lon"),i=a("../common/adjust_lat"),j=a("../common/mlfn"),k=1e-10,l=a("../common/gN"),m=20;c.init=function(){this.temp=this.b/this.a,this.es=1-Math.pow(this.temp,2),this.e=Math.sqrt(this.es),this.e0=d(this.es),this.e1=e(this.es),this.e2=f(this.es),this.e3=g(this.es),this.ml0=this.a*j(this.e0,this.e1,this.e2,this.e3,this.lat0)},c.forward=function(a){var b,c,d,e=a.x,f=a.y,g=h(e-this.long0);if(d=g*Math.sin(f),this.sphere)Math.abs(f)<=k?(b=this.a*g,c=-1*this.a*this.lat0):(b=this.a*Math.sin(d)/Math.tan(f),c=this.a*(i(f-this.lat0)+(1-Math.cos(d))/Math.tan(f)));else if(Math.abs(f)<=k)b=this.a*g,c=-1*this.ml0;else{var m=l(this.a,this.e,Math.sin(f))/Math.tan(f);b=m*Math.sin(d),c=this.a*j(this.e0,this.e1,this.e2,this.e3,f)-this.ml0+m*(1-Math.cos(d))}return a.x=b+this.x0,a.y=c+this.y0,a},c.inverse=function(a){var b,c,d,e,f,g,i,l,n;if(d=a.x-this.x0,e=a.y-this.y0,this.sphere)if(Math.abs(e+this.a*this.lat0)<=k)b=h(d/this.a+this.long0),c=0;else{g=this.lat0+e/this.a,i=d*d/this.a/this.a+g*g,l=g;var o;for(f=m;f;--f)if(o=Math.tan(l),n=-1*(g*(l*o+1)-l-.5*(l*l+i)*o)/((l-g)/o-1),l+=n,Math.abs(n)<=k){c=l;break}b=h(this.long0+Math.asin(d*Math.tan(l)/this.a)/Math.sin(c))}else if(Math.abs(e+this.ml0)<=k)c=0,b=h(this.long0+d/this.a);else{g=(this.ml0+e)/this.a,i=d*d/this.a/this.a+g*g,l=g;var p,q,r,s,t;for(f=m;f;--f)if(t=this.e*Math.sin(l),p=Math.sqrt(1-t*t)*Math.tan(l),q=this.a*j(this.e0,this.e1,this.e2,this.e3,l),r=this.e0-2*this.e1*Math.cos(2*l)+4*this.e2*Math.cos(4*l)-6*this.e3*Math.cos(6*l),s=q/this.a,n=(g*(p*s+1)-s-.5*p*(s*s+i))/(this.es*Math.sin(2*l)*(s*s+i-2*g*s)/(4*p)+(g-s)*(p*r-2/Math.sin(2*l))-r),l-=n,Math.abs(n)<=k){c=l;break}p=Math.sqrt(1-this.es*Math.pow(Math.sin(c),2))*Math.tan(c),b=h(this.long0+Math.asin(d*p/this.a)/Math.sin(c))}return a.x=b,a.y=c,a},c.names=["Polyconic","poly"]},{"../common/adjust_lat":4,"../common/adjust_lon":5,"../common/e0fn":7,"../common/e1fn":8,"../common/e2fn":9,"../common/e3fn":10,"../common/gN":11,"../common/mlfn":14}],58:[function(a,b,c){var d=a("../common/adjust_lon"),e=a("../common/adjust_lat"),f=a("../common/pj_enfn"),g=20,h=a("../common/pj_mlfn"),i=a("../common/pj_inv_mlfn"),j=Math.PI/2,k=1e-10,l=a("../common/asinz");c.init=function(){this.sphere?(this.n=1,this.m=0,this.es=0,this.C_y=Math.sqrt((this.m+1)/this.n),this.C_x=this.C_y/(this.m+1)):this.en=f(this.es)},c.forward=function(a){var b,c,e=a.x,f=a.y;if(e=d(e-this.long0),this.sphere){if(this.m)for(var i=this.n*Math.sin(f),j=g;j;--j){var l=(this.m*f+Math.sin(f)-i)/(this.m+Math.cos(f));if(f-=l,Math.abs(l)<k)break}else f=1!==this.n?Math.asin(this.n*Math.sin(f)):f;b=this.a*this.C_x*e*(this.m+Math.cos(f)),c=this.a*this.C_y*f}else{var m=Math.sin(f),n=Math.cos(f);c=this.a*h(f,m,n,this.en),b=this.a*e*n/Math.sqrt(1-this.es*m*m)}return a.x=b,a.y=c,a},c.inverse=function(a){var b,c,f,g;return a.x-=this.x0,f=a.x/this.a,a.y-=this.y0,b=a.y/this.a,this.sphere?(b/=this.C_y,f/=this.C_x*(this.m+Math.cos(b)),this.m?b=l((this.m*b+Math.sin(b))/this.n):1!==this.n&&(b=l(Math.sin(b)/this.n)),f=d(f+this.long0),b=e(b)):(b=i(a.y/this.a,this.es,this.en),g=Math.abs(b),j>g?(g=Math.sin(b),c=this.long0+a.x*Math.sqrt(1-this.es*g*g)/(this.a*Math.cos(b)),f=d(c)):j>g-k&&(f=this.long0)),a.x=f,a.y=b,a},c.names=["Sinusoidal","sinu"]},{"../common/adjust_lat":4,"../common/adjust_lon":5,"../common/asinz":6,"../common/pj_enfn":17,"../common/pj_inv_mlfn":18,"../common/pj_mlfn":19}],59:[function(a,b,c){c.init=function(){var a=this.lat0;this.lambda0=this.long0;var b=Math.sin(a),c=this.a,d=this.rf,e=1/d,f=2*e-Math.pow(e,2),g=this.e=Math.sqrt(f);this.R=this.k0*c*Math.sqrt(1-f)/(1-f*Math.pow(b,2)),this.alpha=Math.sqrt(1+f/(1-f)*Math.pow(Math.cos(a),4)),this.b0=Math.asin(b/this.alpha);var h=Math.log(Math.tan(Math.PI/4+this.b0/2)),i=Math.log(Math.tan(Math.PI/4+a/2)),j=Math.log((1+g*b)/(1-g*b));this.K=h-this.alpha*i+this.alpha*g/2*j},c.forward=function(a){var b=Math.log(Math.tan(Math.PI/4-a.y/2)),c=this.e/2*Math.log((1+this.e*Math.sin(a.y))/(1-this.e*Math.sin(a.y))),d=-this.alpha*(b+c)+this.K,e=2*(Math.atan(Math.exp(d))-Math.PI/4),f=this.alpha*(a.x-this.lambda0),g=Math.atan(Math.sin(f)/(Math.sin(this.b0)*Math.tan(e)+Math.cos(this.b0)*Math.cos(f))),h=Math.asin(Math.cos(this.b0)*Math.sin(e)-Math.sin(this.b0)*Math.cos(e)*Math.cos(f));return a.y=this.R/2*Math.log((1+Math.sin(h))/(1-Math.sin(h)))+this.y0,a.x=this.R*g+this.x0,a},c.inverse=function(a){for(var b=a.x-this.x0,c=a.y-this.y0,d=b/this.R,e=2*(Math.atan(Math.exp(c/this.R))-Math.PI/4),f=Math.asin(Math.cos(this.b0)*Math.sin(e)+Math.sin(this.b0)*Math.cos(e)*Math.cos(d)),g=Math.atan(Math.sin(d)/(Math.cos(this.b0)*Math.cos(d)-Math.sin(this.b0)*Math.tan(e))),h=this.lambda0+g/this.alpha,i=0,j=f,k=-1e3,l=0;Math.abs(j-k)>1e-7;){if(++l>20)return;i=1/this.alpha*(Math.log(Math.tan(Math.PI/4+f/2))-this.K)+this.e*Math.log(Math.tan(Math.PI/4+Math.asin(this.e*Math.sin(j))/2)),k=j,j=2*Math.atan(Math.exp(i))-Math.PI/2}return a.x=h,a.y=j,a},c.names=["somerc"]},{}],60:[function(a,b,c){var d=Math.PI/2,e=1e-10,f=a("../common/sign"),g=a("../common/msfnz"),h=a("../common/tsfnz"),i=a("../common/phi2z"),j=a("../common/adjust_lon");c.ssfn_=function(a,b,c){return b*=c,Math.tan(.5*(d+a))*Math.pow((1-b)/(1+b),.5*c)},c.init=function(){this.coslat0=Math.cos(this.lat0),this.sinlat0=Math.sin(this.lat0),this.sphere?1===this.k0&&!isNaN(this.lat_ts)&&Math.abs(this.coslat0)<=e&&(this.k0=.5*(1+f(this.lat0)*Math.sin(this.lat_ts))):(Math.abs(this.coslat0)<=e&&(this.con=this.lat0>0?1:-1),this.cons=Math.sqrt(Math.pow(1+this.e,1+this.e)*Math.pow(1-this.e,1-this.e)),1===this.k0&&!isNaN(this.lat_ts)&&Math.abs(this.coslat0)<=e&&(this.k0=.5*this.cons*g(this.e,Math.sin(this.lat_ts),Math.cos(this.lat_ts))/h(this.e,this.con*this.lat_ts,this.con*Math.sin(this.lat_ts))),this.ms1=g(this.e,this.sinlat0,this.coslat0),this.X0=2*Math.atan(this.ssfn_(this.lat0,this.sinlat0,this.e))-d,this.cosX0=Math.cos(this.X0),this.sinX0=Math.sin(this.X0))},c.forward=function(a){var b,c,f,g,i,k,l=a.x,m=a.y,n=Math.sin(m),o=Math.cos(m),p=j(l-this.long0);return Math.abs(Math.abs(l-this.long0)-Math.PI)<=e&&Math.abs(m+this.lat0)<=e?(a.x=0/0,a.y=0/0,a):this.sphere?(b=2*this.k0/(1+this.sinlat0*n+this.coslat0*o*Math.cos(p)),a.x=this.a*b*o*Math.sin(p)+this.x0,a.y=this.a*b*(this.coslat0*n-this.sinlat0*o*Math.cos(p))+this.y0,a):(c=2*Math.atan(this.ssfn_(m,n,this.e))-d,g=Math.cos(c),f=Math.sin(c),Math.abs(this.coslat0)<=e?(i=h(this.e,m*this.con,this.con*n),k=2*this.a*this.k0*i/this.cons,a.x=this.x0+k*Math.sin(l-this.long0),a.y=this.y0-this.con*k*Math.cos(l-this.long0),a):(Math.abs(this.sinlat0)<e?(b=2*this.a*this.k0/(1+g*Math.cos(p)),a.y=b*f):(b=2*this.a*this.k0*this.ms1/(this.cosX0*(1+this.sinX0*f+this.cosX0*g*Math.cos(p))),a.y=b*(this.cosX0*f-this.sinX0*g*Math.cos(p))+this.y0),a.x=b*g*Math.sin(p)+this.x0,a))},c.inverse=function(a){a.x-=this.x0,a.y-=this.y0;var b,c,f,g,h,k=Math.sqrt(a.x*a.x+a.y*a.y);if(this.sphere){var l=2*Math.atan(k/(.5*this.a*this.k0));return b=this.long0,c=this.lat0,e>=k?(a.x=b,a.y=c,a):(c=Math.asin(Math.cos(l)*this.sinlat0+a.y*Math.sin(l)*this.coslat0/k),b=j(Math.abs(this.coslat0)<e?this.lat0>0?this.long0+Math.atan2(a.x,-1*a.y):this.long0+Math.atan2(a.x,a.y):this.long0+Math.atan2(a.x*Math.sin(l),k*this.coslat0*Math.cos(l)-a.y*this.sinlat0*Math.sin(l))),a.x=b,a.y=c,a)}if(Math.abs(this.coslat0)<=e){if(e>=k)return c=this.lat0,b=this.long0,a.x=b,a.y=c,a;a.x*=this.con,a.y*=this.con,f=k*this.cons/(2*this.a*this.k0),c=this.con*i(this.e,f),b=this.con*j(this.con*this.long0+Math.atan2(a.x,-1*a.y))}else g=2*Math.atan(k*this.cosX0/(2*this.a*this.k0*this.ms1)),b=this.long0,e>=k?h=this.X0:(h=Math.asin(Math.cos(g)*this.sinX0+a.y*Math.sin(g)*this.cosX0/k),b=j(this.long0+Math.atan2(a.x*Math.sin(g),k*this.cosX0*Math.cos(g)-a.y*this.sinX0*Math.sin(g)))),c=-1*i(this.e,Math.tan(.5*(d+h)));return a.x=b,a.y=c,a},c.names=["stere","Stereographic_South_Pole","Polar Stereographic (variant B)"]},{"../common/adjust_lon":5,"../common/msfnz":15,"../common/phi2z":16,"../common/sign":21,"../common/tsfnz":24}],61:[function(a,b,c){var d=a("./gauss"),e=a("../common/adjust_lon");c.init=function(){d.init.apply(this),this.rc&&(this.sinc0=Math.sin(this.phic0),this.cosc0=Math.cos(this.phic0),this.R2=2*this.rc,this.title||(this.title="Oblique Stereographic Alternative"))},c.forward=function(a){var b,c,f,g;return a.x=e(a.x-this.long0),d.forward.apply(this,[a]),b=Math.sin(a.y),c=Math.cos(a.y),f=Math.cos(a.x),g=this.k0*this.R2/(1+this.sinc0*b+this.cosc0*c*f),a.x=g*c*Math.sin(a.x),a.y=g*(this.cosc0*b-this.sinc0*c*f),a.x=this.a*a.x+this.x0,a.y=this.a*a.y+this.y0,a},c.inverse=function(a){var b,c,f,g,h;if(a.x=(a.x-this.x0)/this.a,a.y=(a.y-this.y0)/this.a,a.x/=this.k0,a.y/=this.k0,h=Math.sqrt(a.x*a.x+a.y*a.y)){var i=2*Math.atan2(h,this.R2);b=Math.sin(i),c=Math.cos(i),g=Math.asin(c*this.sinc0+a.y*b*this.cosc0/h),f=Math.atan2(a.x*b,h*this.cosc0*c-a.y*this.sinc0*b)}else g=this.phic0,f=0;return a.x=f,a.y=g,d.inverse.apply(this,[a]),a.x=e(a.x+this.long0),a},c.names=["Stereographic_North_Pole","Oblique_Stereographic","Polar_Stereographic","sterea","Oblique Stereographic Alternative"]},{"../common/adjust_lon":5,"./gauss":46}],62:[function(a,b,c){var d=a("../common/e0fn"),e=a("../common/e1fn"),f=a("../common/e2fn"),g=a("../common/e3fn"),h=a("../common/mlfn"),i=a("../common/adjust_lon"),j=Math.PI/2,k=1e-10,l=a("../common/sign"),m=a("../common/asinz");c.init=function(){this.e0=d(this.es),this.e1=e(this.es),this.e2=f(this.es),this.e3=g(this.es),this.ml0=this.a*h(this.e0,this.e1,this.e2,this.e3,this.lat0)},c.forward=function(a){var b,c,d,e=a.x,f=a.y,g=i(e-this.long0),j=Math.sin(f),k=Math.cos(f);if(this.sphere){var l=k*Math.sin(g);if(Math.abs(Math.abs(l)-1)<1e-10)return 93;c=.5*this.a*this.k0*Math.log((1+l)/(1-l)),b=Math.acos(k*Math.cos(g)/Math.sqrt(1-l*l)),0>f&&(b=-b),d=this.a*this.k0*(b-this.lat0)}else{var m=k*g,n=Math.pow(m,2),o=this.ep2*Math.pow(k,2),p=Math.tan(f),q=Math.pow(p,2);b=1-this.es*Math.pow(j,2);var r=this.a/Math.sqrt(b),s=this.a*h(this.e0,this.e1,this.e2,this.e3,f);c=this.k0*r*m*(1+n/6*(1-q+o+n/20*(5-18*q+Math.pow(q,2)+72*o-58*this.ep2)))+this.x0,d=this.k0*(s-this.ml0+r*p*n*(.5+n/24*(5-q+9*o+4*Math.pow(o,2)+n/30*(61-58*q+Math.pow(q,2)+600*o-330*this.ep2))))+this.y0}return a.x=c,a.y=d,a},c.inverse=function(a){var b,c,d,e,f,g,h=6;if(this.sphere){var n=Math.exp(a.x/(this.a*this.k0)),o=.5*(n-1/n),p=this.lat0+a.y/(this.a*this.k0),q=Math.cos(p);b=Math.sqrt((1-q*q)/(1+o*o)),f=m(b),0>p&&(f=-f),g=0===o&&0===q?this.long0:i(Math.atan2(o,q)+this.long0)}else{var r=a.x-this.x0,s=a.y-this.y0;for(b=(this.ml0+s/this.k0)/this.a,c=b,e=0;!0&&(d=(b+this.e1*Math.sin(2*c)-this.e2*Math.sin(4*c)+this.e3*Math.sin(6*c))/this.e0-c,c+=d,!(Math.abs(d)<=k));e++)if(e>=h)return 95;if(Math.abs(c)<j){var t=Math.sin(c),u=Math.cos(c),v=Math.tan(c),w=this.ep2*Math.pow(u,2),x=Math.pow(w,2),y=Math.pow(v,2),z=Math.pow(y,2);b=1-this.es*Math.pow(t,2);var A=this.a/Math.sqrt(b),B=A*(1-this.es)/b,C=r/(A*this.k0),D=Math.pow(C,2);f=c-A*v*D/B*(.5-D/24*(5+3*y+10*w-4*x-9*this.ep2-D/30*(61+90*y+298*w+45*z-252*this.ep2-3*x))),g=i(this.long0+C*(1-D/6*(1+2*y+w-D/20*(5-2*w+28*y-3*x+8*this.ep2+24*z)))/u)}else f=j*l(s),g=this.long0}return a.x=g,a.y=f,a},c.names=["Transverse_Mercator","Transverse Mercator","tmerc"]},{"../common/adjust_lon":5,"../common/asinz":6,"../common/e0fn":7,"../common/e1fn":8,"../common/e2fn":9,"../common/e3fn":10,"../common/mlfn":14,"../common/sign":21}],63:[function(a,b,c){var d=.017453292519943295,e=a("./tmerc");c.dependsOn="tmerc",c.init=function(){this.zone&&(this.lat0=0,this.long0=(6*Math.abs(this.zone)-183)*d,this.x0=5e5,this.y0=this.utmSouth?1e7:0,this.k0=.9996,e.init.apply(this),this.forward=e.forward,this.inverse=e.inverse)},c.names=["Universal Transverse Mercator System","utm"]},{"./tmerc":62}],64:[function(a,b,c){var d=a("../common/adjust_lon"),e=Math.PI/2,f=1e-10,g=a("../common/asinz");c.init=function(){this.R=this.a},c.forward=function(a){var b,c,h=a.x,i=a.y,j=d(h-this.long0);Math.abs(i)<=f&&(b=this.x0+this.R*j,c=this.y0);var k=g(2*Math.abs(i/Math.PI));(Math.abs(j)<=f||Math.abs(Math.abs(i)-e)<=f)&&(b=this.x0,c=i>=0?this.y0+Math.PI*this.R*Math.tan(.5*k):this.y0+Math.PI*this.R*-Math.tan(.5*k));var l=.5*Math.abs(Math.PI/j-j/Math.PI),m=l*l,n=Math.sin(k),o=Math.cos(k),p=o/(n+o-1),q=p*p,r=p*(2/n-1),s=r*r,t=Math.PI*this.R*(l*(p-s)+Math.sqrt(m*(p-s)*(p-s)-(s+m)*(q-s)))/(s+m);0>j&&(t=-t),b=this.x0+t;var u=m+p;return t=Math.PI*this.R*(r*u-l*Math.sqrt((s+m)*(m+1)-u*u))/(s+m),c=i>=0?this.y0+t:this.y0-t,a.x=b,a.y=c,a},c.inverse=function(a){var b,c,e,g,h,i,j,k,l,m,n,o,p;return a.x-=this.x0,a.y-=this.y0,n=Math.PI*this.R,e=a.x/n,g=a.y/n,h=e*e+g*g,i=-Math.abs(g)*(1+h),j=i-2*g*g+e*e,k=-2*i+1+2*g*g+h*h,p=g*g/k+(2*j*j*j/k/k/k-9*i*j/k/k)/27,l=(i-j*j/3/k)/k,m=2*Math.sqrt(-l/3),n=3*p/l/m,Math.abs(n)>1&&(n=n>=0?1:-1),o=Math.acos(n)/3,c=a.y>=0?(-m*Math.cos(o+Math.PI/3)-j/3/k)*Math.PI:-(-m*Math.cos(o+Math.PI/3)-j/3/k)*Math.PI,b=Math.abs(e)<f?this.long0:d(this.long0+Math.PI*(h-1+Math.sqrt(1+2*(e*e-g*g)+h*h))/2/e),a.x=b,a.y=c,a},c.names=["Van_der_Grinten_I","VanDerGrinten","vandg"]},{"../common/adjust_lon":5,"../common/asinz":6}],65:[function(a,b,c){var d=.017453292519943295,e=57.29577951308232,f=1,g=2,h=a("./datum_transform"),i=a("./adjust_axis"),j=a("./Proj"),k=a("./common/toPoint");b.exports=function l(a,b,c){function m(a,b){return(a.datum.datum_type===f||a.datum.datum_type===g)&&"WGS84"!==b.datumCode}var n;return Array.isArray(c)&&(c=k(c)),a.datum&&b.datum&&(m(a,b)||m(b,a))&&(n=new j("WGS84"),l(a,n,c),a=n),"enu"!==a.axis&&i(a,!1,c),"longlat"===a.projName?(c.x*=d,c.y*=d):(a.to_meter&&(c.x*=a.to_meter,c.y*=a.to_meter),a.inverse(c)),a.from_greenwich&&(c.x+=a.from_greenwich),c=h(a.datum,b.datum,c),b.from_greenwich&&(c.x-=b.from_greenwich),"longlat"===b.projName?(c.x*=e,c.y*=e):(b.forward(c),b.to_meter&&(c.x/=b.to_meter,c.y/=b.to_meter)),"enu"!==b.axis&&i(b,!0,c),c}},{"./Proj":2,"./adjust_axis":3,"./common/toPoint":23,"./datum_transform":31}],66:[function(a,b,c){function d(a,b,c){a[b]=c.map(function(a){var b={};return e(a,b),b}).reduce(function(a,b){return j(a,b)},{})}function e(a,b){var c;return Array.isArray(a)?(c=a.shift(),"PARAMETER"===c&&(c=a.shift()),1===a.length?Array.isArray(a[0])?(b[c]={},e(a[0],b[c])):b[c]=a[0]:a.length?"TOWGS84"===c?b[c]=a:(b[c]={},["UNIT","PRIMEM","VERT_DATUM"].indexOf(c)>-1?(b[c]={name:a[0].toLowerCase(),convert:a[1]},3===a.length&&(b[c].auth=a[2])):"SPHEROID"===c?(b[c]={name:a[0],a:a[1],rf:a[2]},4===a.length&&(b[c].auth=a[3])):["GEOGCS","GEOCCS","DATUM","VERT_CS","COMPD_CS","LOCAL_CS","FITTED_CS","LOCAL_DATUM"].indexOf(c)>-1?(a[0]=["name",a[0]],d(b,c,a)):a.every(function(a){return Array.isArray(a)})?d(b,c,a):e(a,b[c])):b[c]=!0,void 0):void(b[a]=!0)}function f(a,b){var c=b[0],d=b[1];!(c in a)&&d in a&&(a[c]=a[d],3===b.length&&(a[c]=b[2](a[c])))}function g(a){return a*i}function h(a){function b(b){var c=a.to_meter||1;return parseFloat(b,10)*c}"GEOGCS"===a.type?a.projName="longlat":"LOCAL_CS"===a.type?(a.projName="identity",a.local=!0):a.projName="object"==typeof a.PROJECTION?Object.keys(a.PROJECTION)[0]:a.PROJECTION,a.UNIT&&(a.units=a.UNIT.name.toLowerCase(),"metre"===a.units&&(a.units="meter"),a.UNIT.convert&&(a.to_meter=parseFloat(a.UNIT.convert,10))),
a.GEOGCS&&(a.datumCode=a.GEOGCS.DATUM?a.GEOGCS.DATUM.name.toLowerCase():a.GEOGCS.name.toLowerCase(),"d_"===a.datumCode.slice(0,2)&&(a.datumCode=a.datumCode.slice(2)),("new_zealand_geodetic_datum_1949"===a.datumCode||"new_zealand_1949"===a.datumCode)&&(a.datumCode="nzgd49"),"wgs_1984"===a.datumCode&&("Mercator_Auxiliary_Sphere"===a.PROJECTION&&(a.sphere=!0),a.datumCode="wgs84"),"_ferro"===a.datumCode.slice(-6)&&(a.datumCode=a.datumCode.slice(0,-6)),"_jakarta"===a.datumCode.slice(-8)&&(a.datumCode=a.datumCode.slice(0,-8)),~a.datumCode.indexOf("belge")&&(a.datumCode="rnb72"),a.GEOGCS.DATUM&&a.GEOGCS.DATUM.SPHEROID&&(a.ellps=a.GEOGCS.DATUM.SPHEROID.name.replace("_19","").replace(/[Cc]larke\_18/,"clrk"),"international"===a.ellps.toLowerCase().slice(0,13)&&(a.ellps="intl"),a.a=a.GEOGCS.DATUM.SPHEROID.a,a.rf=parseFloat(a.GEOGCS.DATUM.SPHEROID.rf,10)),~a.datumCode.indexOf("osgb_1936")&&(a.datumCode="osgb36")),a.b&&!isFinite(a.b)&&(a.b=a.a);var c=function(b){return f(a,b)},d=[["standard_parallel_1","Standard_Parallel_1"],["standard_parallel_2","Standard_Parallel_2"],["false_easting","False_Easting"],["false_northing","False_Northing"],["central_meridian","Central_Meridian"],["latitude_of_origin","Latitude_Of_Origin"],["latitude_of_origin","Central_Parallel"],["scale_factor","Scale_Factor"],["k0","scale_factor"],["latitude_of_center","Latitude_of_center"],["lat0","latitude_of_center",g],["longitude_of_center","Longitude_Of_Center"],["longc","longitude_of_center",g],["x0","false_easting",b],["y0","false_northing",b],["long0","central_meridian",g],["lat0","latitude_of_origin",g],["lat0","standard_parallel_1",g],["lat1","standard_parallel_1",g],["lat2","standard_parallel_2",g],["alpha","azimuth",g],["srsCode","name"]];d.forEach(c),a.long0||!a.longc||"Albers_Conic_Equal_Area"!==a.projName&&"Lambert_Azimuthal_Equal_Area"!==a.projName||(a.long0=a.longc),a.lat_ts||!a.lat1||"Stereographic_South_Pole"!==a.projName&&"Polar Stereographic (variant B)"!==a.projName||(a.lat0=g(a.lat1>0?90:-90),a.lat_ts=a.lat1)}var i=.017453292519943295,j=a("./extend");b.exports=function(a,b){var c=JSON.parse((","+a).replace(/\s*\,\s*([A-Z_0-9]+?)(\[)/g,',["$1",').slice(1).replace(/\s*\,\s*([A-Z_0-9]+?)\]/g,',"$1"]').replace(/,\["VERTCS".+/,"")),d=c.shift(),f=c.shift();c.unshift(["name",f]),c.unshift(["type",d]),c.unshift("output");var g={};return e(c,g),h(g.output),j(b,g.output)}},{"./extend":34}],67:[function(a,b,c){function d(a){return a*(Math.PI/180)}function e(a){return 180*(a/Math.PI)}function f(a){var b,c,e,f,g,i,j,k,l,m=a.lat,n=a.lon,o=6378137,p=.00669438,q=.9996,r=d(m),s=d(n);l=Math.floor((n+180)/6)+1,180===n&&(l=60),m>=56&&64>m&&n>=3&&12>n&&(l=32),m>=72&&84>m&&(n>=0&&9>n?l=31:n>=9&&21>n?l=33:n>=21&&33>n?l=35:n>=33&&42>n&&(l=37)),b=6*(l-1)-180+3,k=d(b),c=p/(1-p),e=o/Math.sqrt(1-p*Math.sin(r)*Math.sin(r)),f=Math.tan(r)*Math.tan(r),g=c*Math.cos(r)*Math.cos(r),i=Math.cos(r)*(s-k),j=o*((1-p/4-3*p*p/64-5*p*p*p/256)*r-(3*p/8+3*p*p/32+45*p*p*p/1024)*Math.sin(2*r)+(15*p*p/256+45*p*p*p/1024)*Math.sin(4*r)-35*p*p*p/3072*Math.sin(6*r));var t=q*e*(i+(1-f+g)*i*i*i/6+(5-18*f+f*f+72*g-58*c)*i*i*i*i*i/120)+5e5,u=q*(j+e*Math.tan(r)*(i*i/2+(5-f+9*g+4*g*g)*i*i*i*i/24+(61-58*f+f*f+600*g-330*c)*i*i*i*i*i*i/720));return 0>m&&(u+=1e7),{northing:Math.round(u),easting:Math.round(t),zoneNumber:l,zoneLetter:h(m)}}function g(a){var b=a.northing,c=a.easting,d=a.zoneLetter,f=a.zoneNumber;if(0>f||f>60)return null;var h,i,j,k,l,m,n,o,p,q,r=.9996,s=6378137,t=.00669438,u=(1-Math.sqrt(1-t))/(1+Math.sqrt(1-t)),v=c-5e5,w=b;"N">d&&(w-=1e7),o=6*(f-1)-180+3,h=t/(1-t),n=w/r,p=n/(s*(1-t/4-3*t*t/64-5*t*t*t/256)),q=p+(3*u/2-27*u*u*u/32)*Math.sin(2*p)+(21*u*u/16-55*u*u*u*u/32)*Math.sin(4*p)+151*u*u*u/96*Math.sin(6*p),i=s/Math.sqrt(1-t*Math.sin(q)*Math.sin(q)),j=Math.tan(q)*Math.tan(q),k=h*Math.cos(q)*Math.cos(q),l=s*(1-t)/Math.pow(1-t*Math.sin(q)*Math.sin(q),1.5),m=v/(i*r);var x=q-i*Math.tan(q)/l*(m*m/2-(5+3*j+10*k-4*k*k-9*h)*m*m*m*m/24+(61+90*j+298*k+45*j*j-252*h-3*k*k)*m*m*m*m*m*m/720);x=e(x);var y=(m-(1+2*j+k)*m*m*m/6+(5-2*k+28*j-3*k*k+8*h+24*j*j)*m*m*m*m*m/120)/Math.cos(q);y=o+e(y);var z;if(a.accuracy){var A=g({northing:a.northing+a.accuracy,easting:a.easting+a.accuracy,zoneLetter:a.zoneLetter,zoneNumber:a.zoneNumber});z={top:A.lat,right:A.lon,bottom:x,left:y}}else z={lat:x,lon:y};return z}function h(a){var b="Z";return 84>=a&&a>=72?b="X":72>a&&a>=64?b="W":64>a&&a>=56?b="V":56>a&&a>=48?b="U":48>a&&a>=40?b="T":40>a&&a>=32?b="S":32>a&&a>=24?b="R":24>a&&a>=16?b="Q":16>a&&a>=8?b="P":8>a&&a>=0?b="N":0>a&&a>=-8?b="M":-8>a&&a>=-16?b="L":-16>a&&a>=-24?b="K":-24>a&&a>=-32?b="J":-32>a&&a>=-40?b="H":-40>a&&a>=-48?b="G":-48>a&&a>=-56?b="F":-56>a&&a>=-64?b="E":-64>a&&a>=-72?b="D":-72>a&&a>=-80&&(b="C"),b}function i(a,b){var c=""+a.easting,d=""+a.northing;return a.zoneNumber+a.zoneLetter+j(a.easting,a.northing,a.zoneNumber)+c.substr(c.length-5,b)+d.substr(d.length-5,b)}function j(a,b,c){var d=k(c),e=Math.floor(a/1e5),f=Math.floor(b/1e5)%20;return l(e,f,d)}function k(a){var b=a%q;return 0===b&&(b=q),b}function l(a,b,c){var d=c-1,e=r.charCodeAt(d),f=s.charCodeAt(d),g=e+a-1,h=f+b,i=!1;g>x&&(g=g-x+t-1,i=!0),(g===u||u>e&&g>u||(g>u||u>e)&&i)&&g++,(g===v||v>e&&g>v||(g>v||v>e)&&i)&&(g++,g===u&&g++),g>x&&(g=g-x+t-1),h>w?(h=h-w+t-1,i=!0):i=!1,(h===u||u>f&&h>u||(h>u||u>f)&&i)&&h++,(h===v||v>f&&h>v||(h>v||v>f)&&i)&&(h++,h===u&&h++),h>w&&(h=h-w+t-1);var j=String.fromCharCode(g)+String.fromCharCode(h);return j}function m(a){if(a&&0===a.length)throw"MGRSPoint coverting from nothing";for(var b,c=a.length,d=null,e="",f=0;!/[A-Z]/.test(b=a.charAt(f));){if(f>=2)throw"MGRSPoint bad conversion from: "+a;e+=b,f++}var g=parseInt(e,10);if(0===f||f+3>c)throw"MGRSPoint bad conversion from: "+a;var h=a.charAt(f++);if("A">=h||"B"===h||"Y"===h||h>="Z"||"I"===h||"O"===h)throw"MGRSPoint zone letter "+h+" not handled: "+a;d=a.substring(f,f+=2);for(var i=k(g),j=n(d.charAt(0),i),l=o(d.charAt(1),i);l<p(h);)l+=2e6;var m=c-f;if(m%2!==0)throw"MGRSPoint has to have an even number \nof digits after the zone letter and two 100km letters - front \nhalf for easting meters, second half for \nnorthing meters"+a;var q,r,s,t,u,v=m/2,w=0,x=0;return v>0&&(q=1e5/Math.pow(10,v),r=a.substring(f,f+v),w=parseFloat(r)*q,s=a.substring(f+v),x=parseFloat(s)*q),t=w+j,u=x+l,{easting:t,northing:u,zoneLetter:h,zoneNumber:g,accuracy:q}}function n(a,b){for(var c=r.charCodeAt(b-1),d=1e5,e=!1;c!==a.charCodeAt(0);){if(c++,c===u&&c++,c===v&&c++,c>x){if(e)throw"Bad character: "+a;c=t,e=!0}d+=1e5}return d}function o(a,b){if(a>"V")throw"MGRSPoint given invalid Northing "+a;for(var c=s.charCodeAt(b-1),d=0,e=!1;c!==a.charCodeAt(0);){if(c++,c===u&&c++,c===v&&c++,c>w){if(e)throw"Bad character: "+a;c=t,e=!0}d+=1e5}return d}function p(a){var b;switch(a){case"C":b=11e5;break;case"D":b=2e6;break;case"E":b=28e5;break;case"F":b=37e5;break;case"G":b=46e5;break;case"H":b=55e5;break;case"J":b=64e5;break;case"K":b=73e5;break;case"L":b=82e5;break;case"M":b=91e5;break;case"N":b=0;break;case"P":b=8e5;break;case"Q":b=17e5;break;case"R":b=26e5;break;case"S":b=35e5;break;case"T":b=44e5;break;case"U":b=53e5;break;case"V":b=62e5;break;case"W":b=7e6;break;case"X":b=79e5;break;default:b=-1}if(b>=0)return b;throw"Invalid zone letter: "+a}var q=6,r="AJSAJS",s="AFAFAF",t=65,u=73,v=79,w=86,x=90;c.forward=function(a,b){return b=b||5,i(f({lat:a[1],lon:a[0]}),b)},c.inverse=function(a){var b=g(m(a.toUpperCase()));return[b.left,b.bottom,b.right,b.top]},c.toPoint=function(a){var b=c.inverse(a);return[(b[2]+b[0])/2,(b[3]+b[1])/2]}},{}],68:[function(a,b,c){b.exports={name:"proj4",version:"2.3.6",description:"Proj4js is a JavaScript library to transform point coordinates from one coordinate system to another, including datum transformations.",main:"lib/index.js",directories:{test:"test",doc:"docs"},scripts:{test:"./node_modules/istanbul/lib/cli.js test ./node_modules/mocha/bin/_mocha test/test.js"},repository:{type:"git",url:"git://github.com/proj4js/proj4js.git"},author:"",license:"MIT",jam:{main:"dist/proj4.js",include:["dist/proj4.js","README.md","AUTHORS","LICENSE.md"]},devDependencies:{"grunt-cli":"~0.1.13",grunt:"~0.4.2","grunt-contrib-connect":"~0.6.0","grunt-contrib-jshint":"~0.8.0",chai:"~1.8.1",mocha:"~1.17.1","grunt-mocha-phantomjs":"~0.4.0",browserify:"~3.24.5","grunt-browserify":"~1.3.0","grunt-contrib-uglify":"~0.3.2",curl:"git://github.com/cujojs/curl.git",istanbul:"~0.2.4",tin:"~0.4.0"},dependencies:{mgrs:"0.0.0"}}},{}],"./includedProjections":[function(a,b,c){b.exports=a("hTEDpn")},{}],hTEDpn:[function(a,b,c){var d=[a("./lib/projections/tmerc"),a("./lib/projections/utm"),a("./lib/projections/sterea"),a("./lib/projections/stere"),a("./lib/projections/somerc"),a("./lib/projections/omerc"),a("./lib/projections/lcc"),a("./lib/projections/krovak"),a("./lib/projections/cass"),a("./lib/projections/laea"),a("./lib/projections/aea"),a("./lib/projections/gnom"),a("./lib/projections/cea"),a("./lib/projections/eqc"),a("./lib/projections/poly"),a("./lib/projections/nzmg"),a("./lib/projections/mill"),a("./lib/projections/sinu"),a("./lib/projections/moll"),a("./lib/projections/eqdc"),a("./lib/projections/vandg"),a("./lib/projections/aeqd")];b.exports=function(proj4){d.forEach(function(a){proj4.Proj.projections.add(a)})}},{"./lib/projections/aea":40,"./lib/projections/aeqd":41,"./lib/projections/cass":42,"./lib/projections/cea":43,"./lib/projections/eqc":44,"./lib/projections/eqdc":45,"./lib/projections/gnom":47,"./lib/projections/krovak":48,"./lib/projections/laea":49,"./lib/projections/lcc":50,"./lib/projections/mill":53,"./lib/projections/moll":54,"./lib/projections/nzmg":55,"./lib/projections/omerc":56,"./lib/projections/poly":57,"./lib/projections/sinu":58,"./lib/projections/somerc":59,"./lib/projections/stere":60,"./lib/projections/sterea":61,"./lib/projections/tmerc":62,"./lib/projections/utm":63,"./lib/projections/vandg":64}]},{},[36])(36)});
/*
 Highcharts JS v7.1.0 (2019-04-01)

 (c) 2009-2018 Torstein Honsi

 License: www.highcharts.com/license
*/
(function(N,K){"object"===typeof module&&module.exports?(K["default"]=K,module.exports=N.document?K(N):K):"function"===typeof define&&define.amd?define("highcharts/highcharts",function(){return K(N)}):(N.Highcharts&&N.Highcharts.error(16,!0),N.Highcharts=K(N))})("undefined"!==typeof window?window:this,function(N){function K(a,C,I,H){a.hasOwnProperty(C)||(a[C]=H.apply(null,I))}var F={};K(F,"parts/Globals.js",[],function(){var a="undefined"===typeof N?"undefined"!==typeof window?window:{}:N,C=a.document,
I=a.navigator&&a.navigator.userAgent||"",H=C&&C.createElementNS&&!!C.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect,k=/(edge|msie|trident)/i.test(I)&&!a.opera,d=-1!==I.indexOf("Firefox"),q=-1!==I.indexOf("Chrome"),t=d&&4>parseInt(I.split("Firefox/")[1],10);return{product:"Highcharts",version:"7.1.0",deg2rad:2*Math.PI/360,doc:C,hasBidiBug:t,hasTouch:C&&void 0!==C.documentElement.ontouchstart,isMS:k,isWebKit:-1!==I.indexOf("AppleWebKit"),isFirefox:d,isChrome:q,isSafari:!q&&-1!==I.indexOf("Safari"),
isTouchDevice:/(Mobile|Android|Windows Phone)/.test(I),SVG_NS:"http://www.w3.org/2000/svg",chartCount:0,seriesTypes:{},symbolSizes:{},svg:H,win:a,marginNames:["plotTop","marginRight","marginBottom","plotLeft"],noop:function(){},charts:[],dateFormats:{}}});K(F,"parts/Utilities.js",[F["parts/Globals.js"]],function(a){a.timers=[];var C=a.charts,I=a.doc,H=a.win;a.error=function(k,d,q){var t=a.isNumber(k)?"Highcharts error #"+k+": www.highcharts.com/errors/"+k:k,u=function(){if(d)throw Error(t);H.console&&
console.log(t)};q?a.fireEvent(q,"displayError",{code:k,message:t},u):u()};a.Fx=function(a,d,q){this.options=d;this.elem=a;this.prop=q};a.Fx.prototype={dSetter:function(){var a=this.paths[0],d=this.paths[1],q=[],t=this.now,u=a.length,v;if(1===t)q=this.toD;else if(u===d.length&&1>t)for(;u--;)v=parseFloat(a[u]),q[u]=isNaN(v)?d[u]:t*parseFloat(d[u]-v)+v;else q=d;this.elem.attr("d",q,null,!0)},update:function(){var a=this.elem,d=this.prop,q=this.now,t=this.options.step;if(this[d+"Setter"])this[d+"Setter"]();
else a.attr?a.element&&a.attr(d,q,null,!0):a.style[d]=q+this.unit;t&&t.call(a,q,this)},run:function(k,d,q){var t=this,u=t.options,v=function(a){return v.stopped?!1:t.step(a)},p=H.requestAnimationFrame||function(a){setTimeout(a,13)},g=function(){for(var e=0;e<a.timers.length;e++)a.timers[e]()||a.timers.splice(e--,1);a.timers.length&&p(g)};k!==d||this.elem["forceAnimate:"+this.prop]?(this.startTime=+new Date,this.start=k,this.end=d,this.unit=q,this.now=this.start,this.pos=0,v.elem=this.elem,v.prop=
this.prop,v()&&1===a.timers.push(v)&&p(g)):(delete u.curAnim[this.prop],u.complete&&0===Object.keys(u.curAnim).length&&u.complete.call(this.elem))},step:function(k){var d=+new Date,q,t=this.options,u=this.elem,v=t.complete,p=t.duration,g=t.curAnim;u.attr&&!u.element?k=!1:k||d>=p+this.startTime?(this.now=this.end,this.pos=1,this.update(),q=g[this.prop]=!0,a.objectEach(g,function(a){!0!==a&&(q=!1)}),q&&v&&v.call(u),k=!1):(this.pos=t.easing((d-this.startTime)/p),this.now=this.start+(this.end-this.start)*
this.pos,this.update(),k=!0);return k},initPath:function(k,d,q){function t(a){var b,f;for(c=a.length;c--;)b="M"===a[c]||"L"===a[c],f=/[a-zA-Z]/.test(a[c+3]),b&&f&&a.splice(c+1,0,a[c+1],a[c+2],a[c+1],a[c+2])}function u(a,f){for(;a.length<b;){a[0]=f[b-a.length];var e=a.slice(0,l);[].splice.apply(a,[0,0].concat(e));w&&(e=a.slice(a.length-l),[].splice.apply(a,[a.length,0].concat(e)),c--)}a[0]="M"}function v(a,c){for(var e=(b-a.length)/l;0<e&&e--;)f=a.slice().splice(a.length/r-l,l*r),f[0]=c[b-l-e*l],m&&
(f[l-6]=f[l-2],f[l-5]=f[l-1]),[].splice.apply(a,[a.length/r,0].concat(f)),w&&e--}d=d||"";var p,g=k.startX,e=k.endX,m=-1<d.indexOf("C"),l=m?7:3,b,f,c;d=d.split(" ");q=q.slice();var w=k.isArea,r=w?2:1,J;m&&(t(d),t(q));if(g&&e){for(c=0;c<g.length;c++)if(g[c]===e[0]){p=c;break}else if(g[0]===e[e.length-g.length+c]){p=c;J=!0;break}void 0===p&&(d=[])}d.length&&a.isNumber(p)&&(b=q.length+p*r*l,J?(u(d,q),v(q,d)):(u(q,d),v(d,q)));return[d,q]},fillSetter:function(){a.Fx.prototype.strokeSetter.apply(this,arguments)},
strokeSetter:function(){this.elem.attr(this.prop,a.color(this.start).tweenTo(a.color(this.end),this.pos),null,!0)}};a.merge=function(){var k,d=arguments,q,t={},u=function(d,p){"object"!==typeof d&&(d={});a.objectEach(p,function(g,e){!a.isObject(g,!0)||a.isClass(g)||a.isDOMElement(g)?d[e]=p[e]:d[e]=u(d[e]||{},g)});return d};!0===d[0]&&(t=d[1],d=Array.prototype.slice.call(d,2));q=d.length;for(k=0;k<q;k++)t=u(t,d[k]);return t};a.pInt=function(a,d){return parseInt(a,d||10)};a.isString=function(a){return"string"===
typeof a};a.isArray=function(a){a=Object.prototype.toString.call(a);return"[object Array]"===a||"[object Array Iterator]"===a};a.isObject=function(k,d){return!!k&&"object"===typeof k&&(!d||!a.isArray(k))};a.isDOMElement=function(k){return a.isObject(k)&&"number"===typeof k.nodeType};a.isClass=function(k){var d=k&&k.constructor;return!(!a.isObject(k,!0)||a.isDOMElement(k)||!d||!d.name||"Object"===d.name)};a.isNumber=function(a){return"number"===typeof a&&!isNaN(a)&&Infinity>a&&-Infinity<a};a.erase=
function(a,d){for(var k=a.length;k--;)if(a[k]===d){a.splice(k,1);break}};a.defined=function(a){return void 0!==a&&null!==a};a.attr=function(k,d,q){var t;a.isString(d)?a.defined(q)?k.setAttribute(d,q):k&&k.getAttribute&&((t=k.getAttribute(d))||"class"!==d||(t=k.getAttribute(d+"Name"))):a.defined(d)&&a.isObject(d)&&a.objectEach(d,function(a,d){k.setAttribute(d,a)});return t};a.splat=function(k){return a.isArray(k)?k:[k]};a.syncTimeout=function(a,d,q){if(d)return setTimeout(a,d,q);a.call(0,q)};a.clearTimeout=
function(k){a.defined(k)&&clearTimeout(k)};a.extend=function(a,d){var k;a||(a={});for(k in d)a[k]=d[k];return a};a.pick=function(){var a=arguments,d,q,t=a.length;for(d=0;d<t;d++)if(q=a[d],void 0!==q&&null!==q)return q};a.css=function(k,d){a.isMS&&!a.svg&&d&&void 0!==d.opacity&&(d.filter="alpha(opacity\x3d"+100*d.opacity+")");a.extend(k.style,d)};a.createElement=function(k,d,q,t,u){k=I.createElement(k);var v=a.css;d&&a.extend(k,d);u&&v(k,{padding:0,border:"none",margin:0});q&&v(k,q);t&&t.appendChild(k);
return k};a.extendClass=function(k,d){var q=function(){};q.prototype=new k;a.extend(q.prototype,d);return q};a.pad=function(a,d,q){return Array((d||2)+1-String(a).replace("-","").length).join(q||0)+a};a.relativeLength=function(a,d,q){return/%$/.test(a)?d*parseFloat(a)/100+(q||0):parseFloat(a)};a.wrap=function(a,d,q){var k=a[d];a[d]=function(){var a=Array.prototype.slice.call(arguments),d=arguments,p=this;p.proceed=function(){k.apply(p,arguments.length?arguments:d)};a.unshift(k);a=q.apply(this,a);
p.proceed=null;return a}};a.datePropsToTimestamps=function(k){a.objectEach(k,function(d,q){a.isObject(d)&&"function"===typeof d.getTime?k[q]=d.getTime():(a.isObject(d)||a.isArray(d))&&a.datePropsToTimestamps(d)})};a.formatSingle=function(k,d,q){var t=/\.([0-9])/,u=a.defaultOptions.lang;/f$/.test(k)?(q=(q=k.match(t))?q[1]:-1,null!==d&&(d=a.numberFormat(d,q,u.decimalPoint,-1<k.indexOf(",")?u.thousandsSep:""))):d=(q||a.time).dateFormat(k,d);return d};a.format=function(k,d,q){for(var t="{",u=!1,v,p,g,
e,m=[],l;k;){t=k.indexOf(t);if(-1===t)break;v=k.slice(0,t);if(u){v=v.split(":");p=v.shift().split(".");e=p.length;l=d;for(g=0;g<e;g++)l&&(l=l[p[g]]);v.length&&(l=a.formatSingle(v.join(":"),l,q));m.push(l)}else m.push(v);k=k.slice(t+1);t=(u=!u)?"}":"{"}m.push(k);return m.join("")};a.getMagnitude=function(a){return Math.pow(10,Math.floor(Math.log(a)/Math.LN10))};a.normalizeTickInterval=function(k,d,q,t,u){var v,p=k;q=a.pick(q,1);v=k/q;d||(d=u?[1,1.2,1.5,2,2.5,3,4,5,6,8,10]:[1,2,2.5,5,10],!1===t&&(1===
q?d=d.filter(function(a){return 0===a%1}):.1>=q&&(d=[1/q])));for(t=0;t<d.length&&!(p=d[t],u&&p*q>=k||!u&&v<=(d[t]+(d[t+1]||d[t]))/2);t++);return p=a.correctFloat(p*q,-Math.round(Math.log(.001)/Math.LN10))};a.stableSort=function(a,d){var k=a.length,t,u;for(u=0;u<k;u++)a[u].safeI=u;a.sort(function(a,p){t=d(a,p);return 0===t?a.safeI-p.safeI:t});for(u=0;u<k;u++)delete a[u].safeI};a.arrayMin=function(a){for(var d=a.length,k=a[0];d--;)a[d]<k&&(k=a[d]);return k};a.arrayMax=function(a){for(var d=a.length,
k=a[0];d--;)a[d]>k&&(k=a[d]);return k};a.destroyObjectProperties=function(k,d){a.objectEach(k,function(a,t){a&&a!==d&&a.destroy&&a.destroy();delete k[t]})};a.discardElement=function(k){var d=a.garbageBin;d||(d=a.createElement("div"));k&&d.appendChild(k);d.innerHTML=""};a.correctFloat=function(a,d){return parseFloat(a.toPrecision(d||14))};a.setAnimation=function(k,d){d.renderer.globalAnimation=a.pick(k,d.options.chart.animation,!0)};a.animObject=function(k){return a.isObject(k)?a.merge(k):{duration:k?
500:0}};a.timeUnits={millisecond:1,second:1E3,minute:6E4,hour:36E5,day:864E5,week:6048E5,month:24192E5,year:314496E5};a.numberFormat=function(k,d,q,t){k=+k||0;d=+d;var u=a.defaultOptions.lang,v=(k.toString().split(".")[1]||"").split("e")[0].length,p,g,e=k.toString().split("e");-1===d?d=Math.min(v,20):a.isNumber(d)?d&&e[1]&&0>e[1]&&(p=d+ +e[1],0<=p?(e[0]=(+e[0]).toExponential(p).split("e")[0],d=p):(e[0]=e[0].split(".")[0]||0,k=20>d?(e[0]*Math.pow(10,e[1])).toFixed(d):0,e[1]=0)):d=2;g=(Math.abs(e[1]?
e[0]:k)+Math.pow(10,-Math.max(d,v)-1)).toFixed(d);v=String(a.pInt(g));p=3<v.length?v.length%3:0;q=a.pick(q,u.decimalPoint);t=a.pick(t,u.thousandsSep);k=(0>k?"-":"")+(p?v.substr(0,p)+t:"");k+=v.substr(p).replace(/(\d{3})(?=\d)/g,"$1"+t);d&&(k+=q+g.slice(-d));e[1]&&0!==+k&&(k+="e"+e[1]);return k};Math.easeInOutSine=function(a){return-.5*(Math.cos(Math.PI*a)-1)};a.getStyle=function(k,d,q){if("width"===d)return Math.max(0,Math.min(k.offsetWidth,k.scrollWidth,k.getBoundingClientRect&&"none"===a.getStyle(k,
"transform",!1)?Math.floor(k.getBoundingClientRect().width):Infinity)-a.getStyle(k,"padding-left")-a.getStyle(k,"padding-right"));if("height"===d)return Math.max(0,Math.min(k.offsetHeight,k.scrollHeight)-a.getStyle(k,"padding-top")-a.getStyle(k,"padding-bottom"));H.getComputedStyle||a.error(27,!0);if(k=H.getComputedStyle(k,void 0))k=k.getPropertyValue(d),a.pick(q,"opacity"!==d)&&(k=a.pInt(k));return k};a.inArray=function(a,d,q){return d.indexOf(a,q)};a.find=Array.prototype.find?function(a,d){return a.find(d)}:
function(a,d){var k,t=a.length;for(k=0;k<t;k++)if(d(a[k],k))return a[k]};a.keys=Object.keys;a.offset=function(a){var d=I.documentElement;a=a.parentElement||a.parentNode?a.getBoundingClientRect():{top:0,left:0};return{top:a.top+(H.pageYOffset||d.scrollTop)-(d.clientTop||0),left:a.left+(H.pageXOffset||d.scrollLeft)-(d.clientLeft||0)}};a.stop=function(k,d){for(var q=a.timers.length;q--;)a.timers[q].elem!==k||d&&d!==a.timers[q].prop||(a.timers[q].stopped=!0)};a.objectEach=function(a,d,q){for(var k in a)a.hasOwnProperty(k)&&
d.call(q||a[k],a[k],k,a)};a.objectEach({map:"map",each:"forEach",grep:"filter",reduce:"reduce",some:"some"},function(k,d){a[d]=function(a){return Array.prototype[k].apply(a,[].slice.call(arguments,1))}});a.addEvent=function(k,d,q,t){var u,v=k.addEventListener||a.addEventListenerPolyfill;u="function"===typeof k&&k.prototype?k.prototype.protoEvents=k.prototype.protoEvents||{}:k.hcEvents=k.hcEvents||{};a.Point&&k instanceof a.Point&&k.series&&k.series.chart&&(k.series.chart.runTrackerClick=!0);v&&v.call(k,
d,q,!1);u[d]||(u[d]=[]);u[d].push(q);t&&a.isNumber(t.order)&&(q.order=t.order,u[d].sort(function(a,g){return a.order-g.order}));return function(){a.removeEvent(k,d,q)}};a.removeEvent=function(k,d,q){function t(g,e){var m=k.removeEventListener||a.removeEventListenerPolyfill;m&&m.call(k,g,e,!1)}function u(g){var e,m;k.nodeName&&(d?(e={},e[d]=!0):e=g,a.objectEach(e,function(a,b){if(g[b])for(m=g[b].length;m--;)t(b,g[b][m])}))}var v,p;["protoEvents","hcEvents"].forEach(function(a){var e=k[a];e&&(d?(v=
e[d]||[],q?(p=v.indexOf(q),-1<p&&(v.splice(p,1),e[d]=v),t(d,q)):(u(e),e[d]=[])):(u(e),k[a]={}))})};a.fireEvent=function(k,d,q,t){var u,v,p,g,e;q=q||{};I.createEvent&&(k.dispatchEvent||k.fireEvent)?(u=I.createEvent("Events"),u.initEvent(d,!0,!0),a.extend(u,q),k.dispatchEvent?k.dispatchEvent(u):k.fireEvent(d,u)):["protoEvents","hcEvents"].forEach(function(m){if(k[m])for(v=k[m][d]||[],p=v.length,q.target||a.extend(q,{preventDefault:function(){q.defaultPrevented=!0},target:k,type:d}),g=0;g<p;g++)(e=v[g])&&
!1===e.call(k,q)&&q.preventDefault()});t&&!q.defaultPrevented&&t.call(k,q)};a.animate=function(k,d,q){var t,u="",v,p,g;a.isObject(q)||(g=arguments,q={duration:g[2],easing:g[3],complete:g[4]});a.isNumber(q.duration)||(q.duration=400);q.easing="function"===typeof q.easing?q.easing:Math[q.easing]||Math.easeInOutSine;q.curAnim=a.merge(d);a.objectEach(d,function(e,g){a.stop(k,g);p=new a.Fx(k,q,g);v=null;"d"===g?(p.paths=p.initPath(k,k.d,d.d),p.toD=d.d,t=0,v=1):k.attr?t=k.attr(g):(t=parseFloat(a.getStyle(k,
g))||0,"opacity"!==g&&(u="px"));v||(v=e);v&&v.match&&v.match("px")&&(v=v.replace(/px/g,""));p.run(t,v,u)})};a.seriesType=function(k,d,q,t,u){var v=a.getOptions(),p=a.seriesTypes;v.plotOptions[k]=a.merge(v.plotOptions[d],q);p[k]=a.extendClass(p[d]||function(){},t);p[k].prototype.type=k;u&&(p[k].prototype.pointClass=a.extendClass(a.Point,u));return p[k]};a.uniqueKey=function(){var a=Math.random().toString(36).substring(2,9),d=0;return function(){return"highcharts-"+a+"-"+d++}}();a.isFunction=function(a){return"function"===
typeof a};H.jQuery&&(H.jQuery.fn.highcharts=function(){var k=[].slice.call(arguments);if(this[0])return k[0]?(new (a[a.isString(k[0])?k.shift():"Chart"])(this[0],k[0],k[1]),this):C[a.attr(this[0],"data-highcharts-chart")]})});K(F,"parts/Color.js",[F["parts/Globals.js"]],function(a){var C=a.isNumber,I=a.merge,H=a.pInt;a.Color=function(k){if(!(this instanceof a.Color))return new a.Color(k);this.init(k)};a.Color.prototype={parsers:[{regex:/rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,
parse:function(a){return[H(a[1]),H(a[2]),H(a[3]),parseFloat(a[4],10)]}},{regex:/rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/,parse:function(a){return[H(a[1]),H(a[2]),H(a[3]),1]}}],names:{white:"#ffffff",black:"#000000"},init:function(k){var d,q,t,u;if((this.input=k=this.names[k&&k.toLowerCase?k.toLowerCase():""]||k)&&k.stops)this.stops=k.stops.map(function(d){return new a.Color(d[1])});else if(k&&k.charAt&&"#"===k.charAt()&&(d=k.length,k=parseInt(k.substr(1),16),7===d?q=[(k&16711680)>>
16,(k&65280)>>8,k&255,1]:4===d&&(q=[(k&3840)>>4|(k&3840)>>8,(k&240)>>4|k&240,(k&15)<<4|k&15,1])),!q)for(t=this.parsers.length;t--&&!q;)u=this.parsers[t],(d=u.regex.exec(k))&&(q=u.parse(d));this.rgba=q||[]},get:function(a){var d=this.input,k=this.rgba,t;this.stops?(t=I(d),t.stops=[].concat(t.stops),this.stops.forEach(function(d,k){t.stops[k]=[t.stops[k][0],d.get(a)]})):t=k&&C(k[0])?"rgb"===a||!a&&1===k[3]?"rgb("+k[0]+","+k[1]+","+k[2]+")":"a"===a?k[3]:"rgba("+k.join(",")+")":d;return t},brighten:function(a){var d,
k=this.rgba;if(this.stops)this.stops.forEach(function(d){d.brighten(a)});else if(C(a)&&0!==a)for(d=0;3>d;d++)k[d]+=H(255*a),0>k[d]&&(k[d]=0),255<k[d]&&(k[d]=255);return this},setOpacity:function(a){this.rgba[3]=a;return this},tweenTo:function(a,d){var k=this.rgba,t=a.rgba;t.length&&k&&k.length?(a=1!==t[3]||1!==k[3],d=(a?"rgba(":"rgb(")+Math.round(t[0]+(k[0]-t[0])*(1-d))+","+Math.round(t[1]+(k[1]-t[1])*(1-d))+","+Math.round(t[2]+(k[2]-t[2])*(1-d))+(a?","+(t[3]+(k[3]-t[3])*(1-d)):"")+")"):d=a.input||
"none";return d}};a.color=function(k){return new a.Color(k)}});K(F,"parts/SvgRenderer.js",[F["parts/Globals.js"]],function(a){var C,I,H=a.addEvent,k=a.animate,d=a.attr,q=a.charts,t=a.color,u=a.css,v=a.createElement,p=a.defined,g=a.deg2rad,e=a.destroyObjectProperties,m=a.doc,l=a.extend,b=a.erase,f=a.hasTouch,c=a.isArray,w=a.isFirefox,r=a.isMS,J=a.isObject,G=a.isString,B=a.isWebKit,n=a.merge,E=a.noop,z=a.objectEach,A=a.pick,D=a.pInt,h=a.removeEvent,y=a.splat,M=a.stop,R=a.svg,L=a.SVG_NS,S=a.symbolSizes,
P=a.win;C=a.SVGElement=function(){return this};l(C.prototype,{opacity:1,SVG_NS:L,textProps:"direction fontSize fontWeight fontFamily fontStyle color lineHeight width textAlign textDecoration textOverflow textOutline cursor".split(" "),init:function(x,h){this.element="span"===h?v(h):m.createElementNS(this.SVG_NS,h);this.renderer=x;a.fireEvent(this,"afterInit")},animate:function(x,h,c){var b=a.animObject(A(h,this.renderer.globalAnimation,!0));A(m.hidden,m.msHidden,m.webkitHidden,!1)&&(b.duration=0);
0!==b.duration?(c&&(b.complete=c),k(this,x,b)):(this.attr(x,null,c),a.objectEach(x,function(a,x){b.step&&b.step.call(this,a,{prop:x,pos:1})},this));return this},complexColor:function(x,h,b){var f=this.renderer,e,y,l,g,L,m,w,E,Q,r,d,D=[],R;a.fireEvent(this.renderer,"complexColor",{args:arguments},function(){x.radialGradient?y="radialGradient":x.linearGradient&&(y="linearGradient");y&&(l=x[y],L=f.gradients,w=x.stops,r=b.radialReference,c(l)&&(x[y]=l={x1:l[0],y1:l[1],x2:l[2],y2:l[3],gradientUnits:"userSpaceOnUse"}),
"radialGradient"===y&&r&&!p(l.gradientUnits)&&(g=l,l=n(l,f.getRadialAttr(r,g),{gradientUnits:"userSpaceOnUse"})),z(l,function(a,x){"id"!==x&&D.push(x,a)}),z(w,function(a){D.push(a)}),D=D.join(","),L[D]?d=L[D].attr("id"):(l.id=d=a.uniqueKey(),L[D]=m=f.createElement(y).attr(l).add(f.defs),m.radAttr=g,m.stops=[],w.forEach(function(x){0===x[1].indexOf("rgba")?(e=a.color(x[1]),E=e.get("rgb"),Q=e.get("a")):(E=x[1],Q=1);x=f.createElement("stop").attr({offset:x[0],"stop-color":E,"stop-opacity":Q}).add(m);
m.stops.push(x)})),R="url("+f.url+"#"+d+")",b.setAttribute(h,R),b.gradient=D,x.toString=function(){return R})})},applyTextOutline:function(x){var h=this.element,b,c,f;-1!==x.indexOf("contrast")&&(x=x.replace(/contrast/g,this.renderer.getContrast(h.style.fill)));x=x.split(" ");b=x[x.length-1];(c=x[0])&&"none"!==c&&a.svg&&(this.fakeTS=!0,x=[].slice.call(h.getElementsByTagName("tspan")),this.ySetter=this.xSetter,c=c.replace(/(^[\d\.]+)(.*?)$/g,function(a,x,h){return 2*x+h}),this.removeTextOutline(x),
f=h.firstChild,x.forEach(function(a,x){0===x&&(a.setAttribute("x",h.getAttribute("x")),x=h.getAttribute("y"),a.setAttribute("y",x||0),null===x&&h.setAttribute("y",0));a=a.cloneNode(1);d(a,{"class":"highcharts-text-outline",fill:b,stroke:b,"stroke-width":c,"stroke-linejoin":"round"});h.insertBefore(a,f)}))},removeTextOutline:function(a){for(var x=a.length,h;x--;)h=a[x],"highcharts-text-outline"===h.getAttribute("class")&&b(a,this.element.removeChild(h))},symbolCustomAttribs:"x y width height r start end innerR anchorX anchorY rounded".split(" "),
attr:function(x,h,c,b){var f,y=this.element,e,n=this,l,g,L=this.symbolCustomAttribs;"string"===typeof x&&void 0!==h&&(f=x,x={},x[f]=h);"string"===typeof x?n=(this[x+"Getter"]||this._defaultGetter).call(this,x,y):(z(x,function(h,c){l=!1;b||M(this,c);this.symbolName&&-1!==a.inArray(c,L)&&(e||(this.symbolAttr(x),e=!0),l=!0);!this.rotation||"x"!==c&&"y"!==c||(this.doTransform=!0);l||(g=this[c+"Setter"]||this._defaultSetter,g.call(this,h,c,y),!this.styledMode&&this.shadows&&/^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(c)&&
this.updateShadows(c,h,g))},this),this.afterSetters());c&&c.call(this);return n},afterSetters:function(){this.doTransform&&(this.updateTransform(),this.doTransform=!1)},updateShadows:function(a,h,c){for(var x=this.shadows,b=x.length;b--;)c.call(x[b],"height"===a?Math.max(h-(x[b].cutHeight||0),0):"d"===a?this.d:h,a,x[b])},addClass:function(a,h){var x=this.attr("class")||"";h||(a=(a||"").split(/ /g).reduce(function(a,h){-1===x.indexOf(h)&&a.push(h);return a},x?[x]:[]).join(" "));a!==x&&this.attr("class",
a);return this},hasClass:function(a){return-1!==(this.attr("class")||"").split(" ").indexOf(a)},removeClass:function(a){return this.attr("class",(this.attr("class")||"").replace(a,""))},symbolAttr:function(a){var x=this;"x y r start end width height innerR anchorX anchorY clockwise".split(" ").forEach(function(h){x[h]=A(a[h],x[h])});x.attr({d:x.renderer.symbols[x.symbolName](x.x,x.y,x.width,x.height,x)})},clip:function(a){return this.attr("clip-path",a?"url("+this.renderer.url+"#"+a.id+")":"none")},
crisp:function(a,h){var x;h=h||a.strokeWidth||0;x=Math.round(h)%2/2;a.x=Math.floor(a.x||this.x||0)+x;a.y=Math.floor(a.y||this.y||0)+x;a.width=Math.floor((a.width||this.width||0)-2*x);a.height=Math.floor((a.height||this.height||0)-2*x);p(a.strokeWidth)&&(a.strokeWidth=h);return a},css:function(a){var x=this.styles,h={},c=this.element,b,f="",y,e=!x,n=["textOutline","textOverflow","width"];a&&a.color&&(a.fill=a.color);x&&z(a,function(a,c){a!==x[c]&&(h[c]=a,e=!0)});e&&(x&&(a=l(x,h)),a&&(null===a.width||
"auto"===a.width?delete this.textWidth:"text"===c.nodeName.toLowerCase()&&a.width&&(b=this.textWidth=D(a.width))),this.styles=a,b&&!R&&this.renderer.forExport&&delete a.width,c.namespaceURI===this.SVG_NS?(y=function(a,x){return"-"+x.toLowerCase()},z(a,function(a,x){-1===n.indexOf(x)&&(f+=x.replace(/([A-Z])/g,y)+":"+a+";")}),f&&d(c,"style",f)):u(c,a),this.added&&("text"===this.element.nodeName&&this.renderer.buildText(this),a&&a.textOutline&&this.applyTextOutline(a.textOutline)));return this},getStyle:function(a){return P.getComputedStyle(this.element||
this,"").getPropertyValue(a)},strokeWidth:function(){if(!this.renderer.styledMode)return this["stroke-width"]||0;var a=this.getStyle("stroke-width"),h;a.indexOf("px")===a.length-2?a=D(a):(h=m.createElementNS(L,"rect"),d(h,{width:a,"stroke-width":0}),this.element.parentNode.appendChild(h),a=h.getBBox().width,h.parentNode.removeChild(h));return a},on:function(a,h){var x=this,c=x.element;f&&"click"===a?(c.ontouchstart=function(a){x.touchEventFired=Date.now();a.preventDefault();h.call(c,a)},c.onclick=
function(a){(-1===P.navigator.userAgent.indexOf("Android")||1100<Date.now()-(x.touchEventFired||0))&&h.call(c,a)}):c["on"+a]=h;return this},setRadialReference:function(a){var x=this.renderer.gradients[this.element.gradient];this.element.radialReference=a;x&&x.radAttr&&x.animate(this.renderer.getRadialAttr(a,x.radAttr));return this},translate:function(a,h){return this.attr({translateX:a,translateY:h})},invert:function(a){this.inverted=a;this.updateTransform();return this},updateTransform:function(){var a=
this.translateX||0,h=this.translateY||0,c=this.scaleX,b=this.scaleY,f=this.inverted,y=this.rotation,e=this.matrix,n=this.element;f&&(a+=this.width,h+=this.height);a=["translate("+a+","+h+")"];p(e)&&a.push("matrix("+e.join(",")+")");f?a.push("rotate(90) scale(-1,1)"):y&&a.push("rotate("+y+" "+A(this.rotationOriginX,n.getAttribute("x"),0)+" "+A(this.rotationOriginY,n.getAttribute("y")||0)+")");(p(c)||p(b))&&a.push("scale("+A(c,1)+" "+A(b,1)+")");a.length&&n.setAttribute("transform",a.join(" "))},toFront:function(){var a=
this.element;a.parentNode.appendChild(a);return this},align:function(a,h,c){var x,f,y,e,n={};f=this.renderer;y=f.alignedObjects;var l,g;if(a){if(this.alignOptions=a,this.alignByTranslate=h,!c||G(c))this.alignTo=x=c||"renderer",b(y,this),y.push(this),c=null}else a=this.alignOptions,h=this.alignByTranslate,x=this.alignTo;c=A(c,f[x],f);x=a.align;f=a.verticalAlign;y=(c.x||0)+(a.x||0);e=(c.y||0)+(a.y||0);"right"===x?l=1:"center"===x&&(l=2);l&&(y+=(c.width-(a.width||0))/l);n[h?"translateX":"x"]=Math.round(y);
"bottom"===f?g=1:"middle"===f&&(g=2);g&&(e+=(c.height-(a.height||0))/g);n[h?"translateY":"y"]=Math.round(e);this[this.placed?"animate":"attr"](n);this.placed=!0;this.alignAttr=n;return this},getBBox:function(a,h){var x,c=this.renderer,b,f=this.element,y=this.styles,e,n=this.textStr,L,m=c.cache,w=c.cacheKeys,E=f.namespaceURI===this.SVG_NS,r;h=A(h,this.rotation);b=h*g;e=c.styledMode?f&&C.prototype.getStyle.call(f,"font-size"):y&&y.fontSize;p(n)&&(r=n.toString(),-1===r.indexOf("\x3c")&&(r=r.replace(/[0-9]/g,
"0")),r+=["",h||0,e,this.textWidth,y&&y.textOverflow].join());r&&!a&&(x=m[r]);if(!x){if(E||c.forExport){try{(L=this.fakeTS&&function(a){[].forEach.call(f.querySelectorAll(".highcharts-text-outline"),function(x){x.style.display=a})})&&L("none"),x=f.getBBox?l({},f.getBBox()):{width:f.offsetWidth,height:f.offsetHeight},L&&L("")}catch(ba){}if(!x||0>x.width)x={width:0,height:0}}else x=this.htmlGetBBox();c.isSVG&&(a=x.width,c=x.height,E&&(x.height=c={"11px,17":14,"13px,20":16}[y&&y.fontSize+","+Math.round(c)]||
c),h&&(x.width=Math.abs(c*Math.sin(b))+Math.abs(a*Math.cos(b)),x.height=Math.abs(c*Math.cos(b))+Math.abs(a*Math.sin(b))));if(r&&0<x.height){for(;250<w.length;)delete m[w.shift()];m[r]||w.push(r);m[r]=x}}return x},show:function(a){return this.attr({visibility:a?"inherit":"visible"})},hide:function(){return this.attr({visibility:"hidden"})},fadeOut:function(a){var x=this;x.animate({opacity:0},{duration:a||150,complete:function(){x.attr({y:-9999})}})},add:function(a){var x=this.renderer,h=this.element,
c;a&&(this.parentGroup=a);this.parentInverted=a&&a.inverted;void 0!==this.textStr&&x.buildText(this);this.added=!0;if(!a||a.handleZ||this.zIndex)c=this.zIndexSetter();c||(a?a.element:x.box).appendChild(h);if(this.onAdd)this.onAdd();return this},safeRemoveChild:function(a){var x=a.parentNode;x&&x.removeChild(a)},destroy:function(){var a=this,h=a.element||{},c=a.renderer,f=c.isSVG&&"SPAN"===h.nodeName&&a.parentGroup,y=h.ownerSVGElement,e=a.clipPath;h.onclick=h.onmouseout=h.onmouseover=h.onmousemove=
h.point=null;M(a);e&&y&&([].forEach.call(y.querySelectorAll("[clip-path],[CLIP-PATH]"),function(a){-1<a.getAttribute("clip-path").indexOf(e.element.id)&&a.removeAttribute("clip-path")}),a.clipPath=e.destroy());if(a.stops){for(y=0;y<a.stops.length;y++)a.stops[y]=a.stops[y].destroy();a.stops=null}a.safeRemoveChild(h);for(c.styledMode||a.destroyShadows();f&&f.div&&0===f.div.childNodes.length;)h=f.parentGroup,a.safeRemoveChild(f.div),delete f.div,f=h;a.alignTo&&b(c.alignedObjects,a);z(a,function(h,x){delete a[x]});
return null},shadow:function(a,h,c){var x=[],b,f,y=this.element,e,n,l,g;if(!a)this.destroyShadows();else if(!this.shadows){n=A(a.width,3);l=(a.opacity||.15)/n;g=this.parentInverted?"(-1,-1)":"("+A(a.offsetX,1)+", "+A(a.offsetY,1)+")";for(b=1;b<=n;b++)f=y.cloneNode(0),e=2*n+1-2*b,d(f,{stroke:a.color||"#000000","stroke-opacity":l*b,"stroke-width":e,transform:"translate"+g,fill:"none"}),f.setAttribute("class",(f.getAttribute("class")||"")+" highcharts-shadow"),c&&(d(f,"height",Math.max(d(f,"height")-
e,0)),f.cutHeight=e),h?h.element.appendChild(f):y.parentNode&&y.parentNode.insertBefore(f,y),x.push(f);this.shadows=x}return this},destroyShadows:function(){(this.shadows||[]).forEach(function(a){this.safeRemoveChild(a)},this);this.shadows=void 0},xGetter:function(a){"circle"===this.element.nodeName&&("x"===a?a="cx":"y"===a&&(a="cy"));return this._defaultGetter(a)},_defaultGetter:function(a){a=A(this[a+"Value"],this[a],this.element?this.element.getAttribute(a):null,0);/^[\-0-9\.]+$/.test(a)&&(a=parseFloat(a));
return a},dSetter:function(a,h,c){a&&a.join&&(a=a.join(" "));/(NaN| {2}|^$)/.test(a)&&(a="M 0 0");this[h]!==a&&(c.setAttribute(h,a),this[h]=a)},dashstyleSetter:function(a){var h,x=this["stroke-width"];"inherit"===x&&(x=1);if(a=a&&a.toLowerCase()){a=a.replace("shortdashdotdot","3,1,1,1,1,1,").replace("shortdashdot","3,1,1,1").replace("shortdot","1,1,").replace("shortdash","3,1,").replace("longdash","8,3,").replace(/dot/g,"1,3,").replace("dash","4,3,").replace(/,$/,"").split(",");for(h=a.length;h--;)a[h]=
D(a[h])*x;a=a.join(",").replace(/NaN/g,"none");this.element.setAttribute("stroke-dasharray",a)}},alignSetter:function(a){var h={left:"start",center:"middle",right:"end"};h[a]&&(this.alignValue=a,this.element.setAttribute("text-anchor",h[a]))},opacitySetter:function(a,h,c){this[h]=a;c.setAttribute(h,a)},titleSetter:function(a){var h=this.element.getElementsByTagName("title")[0];h||(h=m.createElementNS(this.SVG_NS,"title"),this.element.appendChild(h));h.firstChild&&h.removeChild(h.firstChild);h.appendChild(m.createTextNode(String(A(a),
"").replace(/<[^>]*>/g,"").replace(/&lt;/g,"\x3c").replace(/&gt;/g,"\x3e")))},textSetter:function(a){a!==this.textStr&&(delete this.bBox,this.textStr=a,this.added&&this.renderer.buildText(this))},setTextPath:function(h,c){var x=this.element,b={textAnchor:"text-anchor"},f,y=!1,e,l=this.textPathWrapper,g=!l;c=n(!0,{enabled:!0,attributes:{dy:-5,startOffset:"50%",textAnchor:"middle"}},c);f=c.attributes;if(h&&c&&c.enabled){this.options&&this.options.padding&&(f.dx=-this.options.padding);l||(this.textPathWrapper=
l=this.renderer.createElement("textPath"),y=!0);e=l.element;(c=h.element.getAttribute("id"))||h.element.setAttribute("id",c=a.uniqueKey());if(g)for(h=x.getElementsByTagName("tspan");h.length;)h[0].setAttribute("y",0),e.appendChild(h[0]);y&&l.add({element:this.text?this.text.element:x});e.setAttributeNS("http://www.w3.org/1999/xlink","href",this.renderer.url+"#"+c);p(f.dy)&&(e.parentNode.setAttribute("dy",f.dy),delete f.dy);p(f.dx)&&(e.parentNode.setAttribute("dx",f.dx),delete f.dx);a.objectEach(f,
function(a,h){e.setAttribute(b[h]||h,a)});x.removeAttribute("transform");this.removeTextOutline.call(l,[].slice.call(x.getElementsByTagName("tspan")));this.applyTextOutline=this.updateTransform=E}else l&&(delete this.updateTransform,delete this.applyTextOutline,this.destroyTextPath(x,h));return this},destroyTextPath:function(a,h){var x;h.element.setAttribute("id","");for(x=this.textPathWrapper.element.childNodes;x.length;)a.firstChild.appendChild(x[0]);a.firstChild.removeChild(this.textPathWrapper.element);
delete h.textPathWrapper},fillSetter:function(a,h,c){"string"===typeof a?c.setAttribute(h,a):a&&this.complexColor(a,h,c)},visibilitySetter:function(a,h,c){"inherit"===a?c.removeAttribute(h):this[h]!==a&&c.setAttribute(h,a);this[h]=a},zIndexSetter:function(a,h){var c=this.renderer,x=this.parentGroup,f=(x||c).element||c.box,b,y=this.element,e,n,c=f===c.box;b=this.added;var l;p(a)?(y.setAttribute("data-z-index",a),a=+a,this[h]===a&&(b=!1)):p(this[h])&&y.removeAttribute("data-z-index");this[h]=a;if(b){(a=
this.zIndex)&&x&&(x.handleZ=!0);h=f.childNodes;for(l=h.length-1;0<=l&&!e;l--)if(x=h[l],b=x.getAttribute("data-z-index"),n=!p(b),x!==y)if(0>a&&n&&!c&&!l)f.insertBefore(y,h[l]),e=!0;else if(D(b)<=a||n&&(!p(a)||0<=a))f.insertBefore(y,h[l+1]||null),e=!0;e||(f.insertBefore(y,h[c?3:0]||null),e=!0)}return e},_defaultSetter:function(a,h,c){c.setAttribute(h,a)}});C.prototype.yGetter=C.prototype.xGetter;C.prototype.translateXSetter=C.prototype.translateYSetter=C.prototype.rotationSetter=C.prototype.verticalAlignSetter=
C.prototype.rotationOriginXSetter=C.prototype.rotationOriginYSetter=C.prototype.scaleXSetter=C.prototype.scaleYSetter=C.prototype.matrixSetter=function(a,h){this[h]=a;this.doTransform=!0};C.prototype["stroke-widthSetter"]=C.prototype.strokeSetter=function(a,h,c){this[h]=a;this.stroke&&this["stroke-width"]?(C.prototype.fillSetter.call(this,this.stroke,"stroke",c),c.setAttribute("stroke-width",this["stroke-width"]),this.hasStroke=!0):"stroke-width"===h&&0===a&&this.hasStroke&&(c.removeAttribute("stroke"),
this.hasStroke=!1)};I=a.SVGRenderer=function(){this.init.apply(this,arguments)};l(I.prototype,{Element:C,SVG_NS:L,init:function(a,h,c,f,b,y,e){var x;x=this.createElement("svg").attr({version:"1.1","class":"highcharts-root"});e||x.css(this.getStyle(f));f=x.element;a.appendChild(f);d(a,"dir","ltr");-1===a.innerHTML.indexOf("xmlns")&&d(f,"xmlns",this.SVG_NS);this.isSVG=!0;this.box=f;this.boxWrapper=x;this.alignedObjects=[];this.url=(w||B)&&m.getElementsByTagName("base").length?P.location.href.split("#")[0].replace(/<[^>]*>/g,
"").replace(/([\('\)])/g,"\\$1").replace(/ /g,"%20"):"";this.createElement("desc").add().element.appendChild(m.createTextNode("Created with Highcharts 7.1.0"));this.defs=this.createElement("defs").add();this.allowHTML=y;this.forExport=b;this.styledMode=e;this.gradients={};this.cache={};this.cacheKeys=[];this.imgCount=0;this.setSize(h,c,!1);var n;w&&a.getBoundingClientRect&&(h=function(){u(a,{left:0,top:0});n=a.getBoundingClientRect();u(a,{left:Math.ceil(n.left)-n.left+"px",top:Math.ceil(n.top)-n.top+
"px"})},h(),this.unSubPixelFix=H(P,"resize",h))},definition:function(a){function h(a,x){var f;y(a).forEach(function(a){var b=c.createElement(a.tagName),y={};z(a,function(a,h){"tagName"!==h&&"children"!==h&&"textContent"!==h&&(y[h]=a)});b.attr(y);b.add(x||c.defs);a.textContent&&b.element.appendChild(m.createTextNode(a.textContent));h(a.children||[],b);f=b});return f}var c=this;return h(a)},getStyle:function(a){return this.style=l({fontFamily:'"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif',
fontSize:"12px"},a)},setStyle:function(a){this.boxWrapper.css(this.getStyle(a))},isHidden:function(){return!this.boxWrapper.getBBox().width},destroy:function(){var a=this.defs;this.box=null;this.boxWrapper=this.boxWrapper.destroy();e(this.gradients||{});this.gradients=null;a&&(this.defs=a.destroy());this.unSubPixelFix&&this.unSubPixelFix();return this.alignedObjects=null},createElement:function(a){var h=new this.Element;h.init(this,a);return h},draw:E,getRadialAttr:function(a,h){return{cx:a[0]-a[2]/
2+h.cx*a[2],cy:a[1]-a[2]/2+h.cy*a[2],r:h.r*a[2]}},truncate:function(a,h,c,f,b,y,e){var x=this,n=a.rotation,l,g=f?1:0,L=(c||f).length,w=L,E=[],r=function(a){h.firstChild&&h.removeChild(h.firstChild);a&&h.appendChild(m.createTextNode(a))},p=function(y,n){n=n||y;if(void 0===E[n])if(h.getSubStringLength)try{E[n]=b+h.getSubStringLength(0,f?n+1:n)}catch(ca){}else x.getSpanWidth&&(r(e(c||f,y)),E[n]=b+x.getSpanWidth(a,h));return E[n]},z,d;a.rotation=0;z=p(h.textContent.length);if(d=b+z>y){for(;g<=L;)w=Math.ceil((g+
L)/2),f&&(l=e(f,w)),z=p(w,l&&l.length-1),g===L?g=L+1:z>y?L=w-1:g=w;0===L?r(""):c&&L===c.length-1||r(l||e(c||f,w))}f&&f.splice(0,w);a.actualWidth=z;a.rotation=n;return d},escapes:{"\x26":"\x26amp;","\x3c":"\x26lt;","\x3e":"\x26gt;","'":"\x26#39;",'"':"\x26quot;"},buildText:function(a){var h=a.element,c=this,f=c.forExport,b=A(a.textStr,"").toString(),x=-1!==b.indexOf("\x3c"),y=h.childNodes,e,n=d(h,"x"),l=a.styles,g=a.textWidth,w=l&&l.lineHeight,E=l&&l.textOutline,r=l&&"ellipsis"===l.textOverflow,p=
l&&"nowrap"===l.whiteSpace,B=l&&l.fontSize,M,S,G=y.length,l=g&&!a.added&&this.box,J=function(a){var b;c.styledMode||(b=/(px|em)$/.test(a&&a.style.fontSize)?a.style.fontSize:B||c.style.fontSize||12);return w?D(w):c.fontMetrics(b,a.getAttribute("style")?a:h).h},k=function(a,h){z(c.escapes,function(c,b){h&&-1!==h.indexOf(c)||(a=a.toString().replace(new RegExp(c,"g"),b))});return a},P=function(a,h){var c;c=a.indexOf("\x3c");a=a.substring(c,a.indexOf("\x3e")-c);c=a.indexOf(h+"\x3d");if(-1!==c&&(c=c+h.length+
1,h=a.charAt(c),'"'===h||"'"===h))return a=a.substring(c+1),a.substring(0,a.indexOf(h))};M=[b,r,p,w,E,B,g].join();if(M!==a.textCache){for(a.textCache=M;G--;)h.removeChild(y[G]);x||E||r||g||-1!==b.indexOf(" ")?(l&&l.appendChild(h),x?(b=c.styledMode?b.replace(/<(b|strong)>/g,'\x3cspan class\x3d"highcharts-strong"\x3e').replace(/<(i|em)>/g,'\x3cspan class\x3d"highcharts-emphasized"\x3e'):b.replace(/<(b|strong)>/g,'\x3cspan style\x3d"font-weight:bold"\x3e').replace(/<(i|em)>/g,'\x3cspan style\x3d"font-style:italic"\x3e'),
b=b.replace(/<a/g,"\x3cspan").replace(/<\/(b|strong|i|em|a)>/g,"\x3c/span\x3e").split(/<br.*?>/g)):b=[b],b=b.filter(function(a){return""!==a}),b.forEach(function(b,x){var y,l=0,w=0;b=b.replace(/^\s+|\s+$/g,"").replace(/<span/g,"|||\x3cspan").replace(/<\/span>/g,"\x3c/span\x3e|||");y=b.split("|||");y.forEach(function(b){if(""!==b||1===y.length){var E={},z=m.createElementNS(c.SVG_NS,"tspan"),D,A;(D=P(b,"class"))&&d(z,"class",D);if(D=P(b,"style"))D=D.replace(/(;| |^)color([ :])/,"$1fill$2"),d(z,"style",
D);(A=P(b,"href"))&&!f&&(d(z,"onclick",'location.href\x3d"'+A+'"'),d(z,"class","highcharts-anchor"),c.styledMode||u(z,{cursor:"pointer"}));b=k(b.replace(/<[a-zA-Z\/](.|\n)*?>/g,"")||" ");if(" "!==b){z.appendChild(m.createTextNode(b));l?E.dx=0:x&&null!==n&&(E.x=n);d(z,E);h.appendChild(z);!l&&S&&(!R&&f&&u(z,{display:"block"}),d(z,"dy",J(z)));if(g){var M=b.replace(/([^\^])-/g,"$1- ").split(" "),E=!p&&(1<y.length||x||1<M.length);A=0;var G=J(z);if(r)e=c.truncate(a,z,b,void 0,0,Math.max(0,g-parseInt(B||
12,10)),function(a,h){return a.substring(0,h)+"\u2026"});else if(E)for(;M.length;)M.length&&!p&&0<A&&(z=m.createElementNS(L,"tspan"),d(z,{dy:G,x:n}),D&&d(z,"style",D),z.appendChild(m.createTextNode(M.join(" ").replace(/- /g,"-"))),h.appendChild(z)),c.truncate(a,z,null,M,0===A?w:0,g,function(a,h){return M.slice(0,h).join(" ").replace(/- /g,"-")}),w=a.actualWidth,A++}l++}}});S=S||h.childNodes.length}),r&&e&&a.attr("title",k(a.textStr,["\x26lt;","\x26gt;"])),l&&l.removeChild(h),E&&a.applyTextOutline&&
a.applyTextOutline(E)):h.appendChild(m.createTextNode(k(b)))}},getContrast:function(a){a=t(a).rgba;a[0]*=1;a[1]*=1.2;a[2]*=.5;return 459<a[0]+a[1]+a[2]?"#000000":"#FFFFFF"},button:function(a,h,c,b,f,y,e,g,L,w){var x=this.label(a,h,c,L,null,null,w,null,"button"),m=0,E=this.styledMode;x.attr(n({padding:8,r:2},f));if(!E){var z,p,d,D;f=n({fill:"#f7f7f7",stroke:"#cccccc","stroke-width":1,style:{color:"#333333",cursor:"pointer",fontWeight:"normal"}},f);z=f.style;delete f.style;y=n(f,{fill:"#e6e6e6"},y);
p=y.style;delete y.style;e=n(f,{fill:"#e6ebf5",style:{color:"#000000",fontWeight:"bold"}},e);d=e.style;delete e.style;g=n(f,{style:{color:"#cccccc"}},g);D=g.style;delete g.style}H(x.element,r?"mouseover":"mouseenter",function(){3!==m&&x.setState(1)});H(x.element,r?"mouseout":"mouseleave",function(){3!==m&&x.setState(m)});x.setState=function(a){1!==a&&(x.state=m=a);x.removeClass(/highcharts-button-(normal|hover|pressed|disabled)/).addClass("highcharts-button-"+["normal","hover","pressed","disabled"][a||
0]);E||x.attr([f,y,e,g][a||0]).css([z,p,d,D][a||0])};E||x.attr(f).css(l({cursor:"default"},z));return x.on("click",function(a){3!==m&&b.call(x,a)})},crispLine:function(a,h){a[1]===a[4]&&(a[1]=a[4]=Math.round(a[1])-h%2/2);a[2]===a[5]&&(a[2]=a[5]=Math.round(a[2])+h%2/2);return a},path:function(a){var h=this.styledMode?{}:{fill:"none"};c(a)?h.d=a:J(a)&&l(h,a);return this.createElement("path").attr(h)},circle:function(a,h,c){a=J(a)?a:void 0===a?{}:{x:a,y:h,r:c};h=this.createElement("circle");h.xSetter=
h.ySetter=function(a,h,c){c.setAttribute("c"+h,a)};return h.attr(a)},arc:function(a,h,c,b,f,y){J(a)?(b=a,h=b.y,c=b.r,a=b.x):b={innerR:b,start:f,end:y};a=this.symbol("arc",a,h,c,c,b);a.r=c;return a},rect:function(a,h,c,b,f,y){f=J(a)?a.r:f;var e=this.createElement("rect");a=J(a)?a:void 0===a?{}:{x:a,y:h,width:Math.max(c,0),height:Math.max(b,0)};this.styledMode||(void 0!==y&&(a.strokeWidth=y,a=e.crisp(a)),a.fill="none");f&&(a.r=f);e.rSetter=function(a,h,c){e.r=a;d(c,{rx:a,ry:a})};e.rGetter=function(){return e.r};
return e.attr(a)},setSize:function(a,h,c){var b=this.alignedObjects,f=b.length;this.width=a;this.height=h;for(this.boxWrapper.animate({width:a,height:h},{step:function(){this.attr({viewBox:"0 0 "+this.attr("width")+" "+this.attr("height")})},duration:A(c,!0)?void 0:0});f--;)b[f].align()},g:function(a){var h=this.createElement("g");return a?h.attr({"class":"highcharts-"+a}):h},image:function(a,h,c,b,f,y){var e={preserveAspectRatio:"none"},x,n=function(a,h){a.setAttributeNS?a.setAttributeNS("http://www.w3.org/1999/xlink",
"href",h):a.setAttribute("hc-svg-href",h)},g=function(h){n(x.element,a);y.call(x,h)};1<arguments.length&&l(e,{x:h,y:c,width:b,height:f});x=this.createElement("image").attr(e);y?(n(x.element,"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw\x3d\x3d"),e=new P.Image,H(e,"load",g),e.src=a,e.complete&&g({})):n(x.element,a);return x},symbol:function(a,h,c,b,f,y){var e=this,n,x=/^url\((.*?)\)$/,g=x.test(a),L=!g&&(this.symbols[a]?a:"circle"),w=L&&this.symbols[L],E=p(h)&&w&&w.call(this.symbols,
Math.round(h),Math.round(c),b,f,y),r,z;w?(n=this.path(E),e.styledMode||n.attr("fill","none"),l(n,{symbolName:L,x:h,y:c,width:b,height:f}),y&&l(n,y)):g&&(r=a.match(x)[1],n=this.image(r),n.imgwidth=A(S[r]&&S[r].width,y&&y.width),n.imgheight=A(S[r]&&S[r].height,y&&y.height),z=function(){n.attr({width:n.width,height:n.height})},["width","height"].forEach(function(a){n[a+"Setter"]=function(a,h){var c={},b=this["img"+h],f="width"===h?"translateX":"translateY";this[h]=a;p(b)&&(y&&"within"===y.backgroundSize&&
this.width&&this.height&&(b=Math.round(b*Math.min(this.width/this.imgwidth,this.height/this.imgheight))),this.element&&this.element.setAttribute(h,b),this.alignByTranslate||(c[f]=((this[h]||0)-b)/2,this.attr(c)))}}),p(h)&&n.attr({x:h,y:c}),n.isImg=!0,p(n.imgwidth)&&p(n.imgheight)?z():(n.attr({width:0,height:0}),v("img",{onload:function(){var a=q[e.chartIndex];0===this.width&&(u(this,{position:"absolute",top:"-999em"}),m.body.appendChild(this));S[r]={width:this.width,height:this.height};n.imgwidth=
this.width;n.imgheight=this.height;n.element&&z();this.parentNode&&this.parentNode.removeChild(this);e.imgCount--;if(!e.imgCount&&a&&a.onload)a.onload()},src:r}),this.imgCount++));return n},symbols:{circle:function(a,h,c,b){return this.arc(a+c/2,h+b/2,c/2,b/2,{start:.5*Math.PI,end:2.5*Math.PI,open:!1})},square:function(a,h,c,b){return["M",a,h,"L",a+c,h,a+c,h+b,a,h+b,"Z"]},triangle:function(a,h,c,b){return["M",a+c/2,h,"L",a+c,h+b,a,h+b,"Z"]},"triangle-down":function(a,h,c,b){return["M",a,h,"L",a+c,
h,a+c/2,h+b,"Z"]},diamond:function(a,h,c,b){return["M",a+c/2,h,"L",a+c,h+b/2,a+c/2,h+b,a,h+b/2,"Z"]},arc:function(a,h,c,b,f){var y=f.start,e=f.r||c,n=f.r||b||c,l=f.end-.001;c=f.innerR;b=A(f.open,.001>Math.abs(f.end-f.start-2*Math.PI));var x=Math.cos(y),g=Math.sin(y),L=Math.cos(l),l=Math.sin(l),y=.001>f.end-y-Math.PI?0:1;f=["M",a+e*x,h+n*g,"A",e,n,0,y,A(f.clockwise,1),a+e*L,h+n*l];p(c)&&f.push(b?"M":"L",a+c*L,h+c*l,"A",c,c,0,y,0,a+c*x,h+c*g);f.push(b?"":"Z");return f},callout:function(a,h,c,b,f){var y=
Math.min(f&&f.r||0,c,b),e=y+6,n=f&&f.anchorX;f=f&&f.anchorY;var l;l=["M",a+y,h,"L",a+c-y,h,"C",a+c,h,a+c,h,a+c,h+y,"L",a+c,h+b-y,"C",a+c,h+b,a+c,h+b,a+c-y,h+b,"L",a+y,h+b,"C",a,h+b,a,h+b,a,h+b-y,"L",a,h+y,"C",a,h,a,h,a+y,h];n&&n>c?f>h+e&&f<h+b-e?l.splice(13,3,"L",a+c,f-6,a+c+6,f,a+c,f+6,a+c,h+b-y):l.splice(13,3,"L",a+c,b/2,n,f,a+c,b/2,a+c,h+b-y):n&&0>n?f>h+e&&f<h+b-e?l.splice(33,3,"L",a,f+6,a-6,f,a,f-6,a,h+y):l.splice(33,3,"L",a,b/2,n,f,a,b/2,a,h+y):f&&f>b&&n>a+e&&n<a+c-e?l.splice(23,3,"L",n+6,h+
b,n,h+b+6,n-6,h+b,a+y,h+b):f&&0>f&&n>a+e&&n<a+c-e&&l.splice(3,3,"L",n-6,h,n,h-6,n+6,h,c-y,h);return l}},clipRect:function(h,c,b,f){var y=a.uniqueKey()+"-",e=this.createElement("clipPath").attr({id:y}).add(this.defs);h=this.rect(h,c,b,f,0).add(e);h.id=y;h.clipPath=e;h.count=0;return h},text:function(a,h,c,b){var f={};if(b&&(this.allowHTML||!this.forExport))return this.html(a,h,c);f.x=Math.round(h||0);c&&(f.y=Math.round(c));p(a)&&(f.text=a);a=this.createElement("text").attr(f);b||(a.xSetter=function(a,
h,c){var b=c.getElementsByTagName("tspan"),f,y=c.getAttribute(h),e;for(e=0;e<b.length;e++)f=b[e],f.getAttribute(h)===y&&f.setAttribute(h,a);c.setAttribute(h,a)});return a},fontMetrics:function(a,h){a=!this.styledMode&&/px/.test(a)||!P.getComputedStyle?a||h&&h.style&&h.style.fontSize||this.style&&this.style.fontSize:h&&C.prototype.getStyle.call(h,"font-size");a=/px/.test(a)?D(a):12;h=24>a?a+3:Math.round(1.2*a);return{h:h,b:Math.round(.8*h),f:a}},rotCorr:function(a,h,c){var b=a;h&&c&&(b=Math.max(b*
Math.cos(h*g),4));return{x:-a/3*Math.sin(h*g),y:b}},label:function(c,b,f,y,e,g,L,w,m){var x=this,E=x.styledMode,r=x.g("button"!==m&&"label"),z=r.text=x.text("",0,0,L).attr({zIndex:1}),d,D,R=0,A=3,M=0,B,S,G,k,J,P={},v,q,t=/^url\((.*?)\)$/.test(y),u=E||t,Q=function(){return E?d.strokeWidth()%2/2:(v?parseInt(v,10):0)%2/2},U,T,O;m&&r.addClass("highcharts-"+m);U=function(){var a=z.element.style,h={};D=(void 0===B||void 0===S||J)&&p(z.textStr)&&z.getBBox();r.width=(B||D.width||0)+2*A+M;r.height=(S||D.height||
0)+2*A;q=A+Math.min(x.fontMetrics(a&&a.fontSize,z).b,D?D.height:Infinity);u&&(d||(r.box=d=x.symbols[y]||t?x.symbol(y):x.rect(),d.addClass(("button"===m?"":"highcharts-label-box")+(m?" highcharts-"+m+"-box":"")),d.add(r),a=Q(),h.x=a,h.y=(w?-q:0)+a),h.width=Math.round(r.width),h.height=Math.round(r.height),d.attr(l(h,P)),P={})};T=function(){var a=M+A,h;h=w?0:q;p(B)&&D&&("center"===J||"right"===J)&&(a+={center:.5,right:1}[J]*(B-D.width));if(a!==z.x||h!==z.y)z.attr("x",a),z.hasBoxWidthChanged&&(D=z.getBBox(!0),
U()),void 0!==h&&z.attr("y",h);z.x=a;z.y=h};O=function(a,h){d?d.attr(a,h):P[a]=h};r.onAdd=function(){z.add(r);r.attr({text:c||0===c?c:"",x:b,y:f});d&&p(e)&&r.attr({anchorX:e,anchorY:g})};r.widthSetter=function(h){B=a.isNumber(h)?h:null};r.heightSetter=function(a){S=a};r["text-alignSetter"]=function(a){J=a};r.paddingSetter=function(a){p(a)&&a!==A&&(A=r.padding=a,T())};r.paddingLeftSetter=function(a){p(a)&&a!==M&&(M=a,T())};r.alignSetter=function(a){a={left:0,center:.5,right:1}[a];a!==R&&(R=a,D&&r.attr({x:G}))};
r.textSetter=function(a){void 0!==a&&z.attr({text:a});U();T()};r["stroke-widthSetter"]=function(a,h){a&&(u=!0);v=this["stroke-width"]=a;O(h,a)};E?r.rSetter=function(a,h){O(h,a)}:r.strokeSetter=r.fillSetter=r.rSetter=function(a,h){"r"!==h&&("fill"===h&&a&&(u=!0),r[h]=a);O(h,a)};r.anchorXSetter=function(a,h){e=r.anchorX=a;O(h,Math.round(a)-Q()-G)};r.anchorYSetter=function(a,h){g=r.anchorY=a;O(h,a-k)};r.xSetter=function(a){r.x=a;R&&(a-=R*((B||D.width)+2*A),r["forceAnimate:x"]=!0);G=Math.round(a);r.attr("translateX",
G)};r.ySetter=function(a){k=r.y=Math.round(a);r.attr("translateY",k)};var aa=r.css;L={css:function(a){if(a){var h={};a=n(a);r.textProps.forEach(function(c){void 0!==a[c]&&(h[c]=a[c],delete a[c])});z.css(h);"width"in h&&U();"fontSize"in h&&(U(),T())}return aa.call(r,a)},getBBox:function(){return{width:D.width+2*A,height:D.height+2*A,x:D.x-A,y:D.y-A}},destroy:function(){h(r.element,"mouseenter");h(r.element,"mouseleave");z&&(z=z.destroy());d&&(d=d.destroy());C.prototype.destroy.call(r);r=x=U=T=O=null}};
E||(L.shadow=function(a){a&&(U(),d&&d.shadow(a));return r});return l(r,L)}});a.Renderer=I});K(F,"parts/Html.js",[F["parts/Globals.js"]],function(a){var C=a.attr,I=a.createElement,H=a.css,k=a.defined,d=a.extend,q=a.isFirefox,t=a.isMS,u=a.isWebKit,v=a.pick,p=a.pInt,g=a.SVGElement,e=a.SVGRenderer,m=a.win;d(g.prototype,{htmlCss:function(a){var b="SPAN"===this.element.tagName&&a&&"width"in a,f=v(b&&a.width,void 0),c;b&&(delete a.width,this.textWidth=f,c=!0);a&&"ellipsis"===a.textOverflow&&(a.whiteSpace=
"nowrap",a.overflow="hidden");this.styles=d(this.styles,a);H(this.element,a);c&&this.htmlUpdateTransform();return this},htmlGetBBox:function(){var a=this.element;return{x:a.offsetLeft,y:a.offsetTop,width:a.offsetWidth,height:a.offsetHeight}},htmlUpdateTransform:function(){if(this.added){var a=this.renderer,b=this.element,f=this.translateX||0,c=this.translateY||0,e=this.x||0,g=this.y||0,m=this.textAlign||"left",d={left:0,center:.5,right:1}[m],B=this.styles,n=B&&B.whiteSpace;H(b,{marginLeft:f,marginTop:c});
!a.styledMode&&this.shadows&&this.shadows.forEach(function(a){H(a,{marginLeft:f+1,marginTop:c+1})});this.inverted&&[].forEach.call(b.childNodes,function(c){a.invertChild(c,b)});if("SPAN"===b.tagName){var B=this.rotation,E=this.textWidth&&p(this.textWidth),z=[B,m,b.innerHTML,this.textWidth,this.textAlign].join(),A;(A=E!==this.oldTextWidth)&&!(A=E>this.oldTextWidth)&&((A=this.textPxLength)||(H(b,{width:"",whiteSpace:n||"nowrap"}),A=b.offsetWidth),A=A>E);A&&(/[ \-]/.test(b.textContent||b.innerText)||
"ellipsis"===b.style.textOverflow)?(H(b,{width:E+"px",display:"block",whiteSpace:n||"normal"}),this.oldTextWidth=E,this.hasBoxWidthChanged=!0):this.hasBoxWidthChanged=!1;z!==this.cTT&&(n=a.fontMetrics(b.style.fontSize,b).b,!k(B)||B===(this.oldRotation||0)&&m===this.oldAlign||this.setSpanRotation(B,d,n),this.getSpanCorrection(!k(B)&&this.textPxLength||b.offsetWidth,n,d,B,m));H(b,{left:e+(this.xCorr||0)+"px",top:g+(this.yCorr||0)+"px"});this.cTT=z;this.oldRotation=B;this.oldAlign=m}}else this.alignOnAdd=
!0},setSpanRotation:function(a,b,f){var c={},e=this.renderer.getTransformKey();c[e]=c.transform="rotate("+a+"deg)";c[e+(q?"Origin":"-origin")]=c.transformOrigin=100*b+"% "+f+"px";H(this.element,c)},getSpanCorrection:function(a,b,f){this.xCorr=-a*f;this.yCorr=-b}});d(e.prototype,{getTransformKey:function(){return t&&!/Edge/.test(m.navigator.userAgent)?"-ms-transform":u?"-webkit-transform":q?"MozTransform":m.opera?"-o-transform":""},html:function(e,b,f){var c=this.createElement("span"),l=c.element,
r=c.renderer,m=r.isSVG,p=function(a,c){["opacity","visibility"].forEach(function(b){a[b+"Setter"]=function(f,e,h){var y=a.div?a.div.style:c;g.prototype[b+"Setter"].call(this,f,e,h);y&&(y[e]=f)}});a.addedSetters=!0},B=a.charts[r.chartIndex],B=B&&B.styledMode;c.textSetter=function(a){a!==l.innerHTML&&(delete this.bBox,delete this.oldTextWidth);this.textStr=a;l.innerHTML=v(a,"");c.doTransform=!0};m&&p(c,c.element.style);c.xSetter=c.ySetter=c.alignSetter=c.rotationSetter=function(a,b){"align"===b&&(b=
"textAlign");c[b]=a;c.doTransform=!0};c.afterSetters=function(){this.doTransform&&(this.htmlUpdateTransform(),this.doTransform=!1)};c.attr({text:e,x:Math.round(b),y:Math.round(f)}).css({position:"absolute"});B||c.css({fontFamily:this.style.fontFamily,fontSize:this.style.fontSize});l.style.whiteSpace="nowrap";c.css=c.htmlCss;m&&(c.add=function(a){var b,f=r.box.parentNode,e=[];if(this.parentGroup=a){if(b=a.div,!b){for(;a;)e.push(a),a=a.parentGroup;e.reverse().forEach(function(a){function h(h,c){a[c]=
h;"translateX"===c?y.left=h+"px":y.top=h+"px";a.doTransform=!0}var y,n=C(a.element,"class");n&&(n={className:n});b=a.div=a.div||I("div",n,{position:"absolute",left:(a.translateX||0)+"px",top:(a.translateY||0)+"px",display:a.display,opacity:a.opacity,pointerEvents:a.styles&&a.styles.pointerEvents},b||f);y=b.style;d(a,{classSetter:function(a){return function(h){this.element.setAttribute("class",h);a.className=h}}(b),on:function(){e[0].div&&c.on.apply({element:e[0].div},arguments);return a},translateXSetter:h,
translateYSetter:h});a.addedSetters||p(a)})}}else b=f;b.appendChild(l);c.added=!0;c.alignOnAdd&&c.htmlUpdateTransform();return c});return c}})});K(F,"parts/Time.js",[F["parts/Globals.js"]],function(a){var C=a.defined,I=a.extend,H=a.merge,k=a.pick,d=a.timeUnits,q=a.win;a.Time=function(a){this.update(a,!1)};a.Time.prototype={defaultOptions:{},update:function(a){var d=k(a&&a.useUTC,!0),v=this;this.options=a=H(!0,this.options||{},a);this.Date=a.Date||q.Date||Date;this.timezoneOffset=(this.useUTC=d)&&
a.timezoneOffset;this.getTimezoneOffset=this.timezoneOffsetFunction();(this.variableTimezone=!(d&&!a.getTimezoneOffset&&!a.timezone))||this.timezoneOffset?(this.get=function(a,g){var e=g.getTime(),m=e-v.getTimezoneOffset(g);g.setTime(m);a=g["getUTC"+a]();g.setTime(e);return a},this.set=function(a,g,e){var m;if("Milliseconds"===a||"Seconds"===a||"Minutes"===a&&0===g.getTimezoneOffset()%60)g["set"+a](e);else m=v.getTimezoneOffset(g),m=g.getTime()-m,g.setTime(m),g["setUTC"+a](e),a=v.getTimezoneOffset(g),
m=g.getTime()+a,g.setTime(m)}):d?(this.get=function(a,g){return g["getUTC"+a]()},this.set=function(a,g,e){return g["setUTC"+a](e)}):(this.get=function(a,g){return g["get"+a]()},this.set=function(a,g,e){return g["set"+a](e)})},makeTime:function(d,q,v,p,g,e){var m,l,b;this.useUTC?(m=this.Date.UTC.apply(0,arguments),l=this.getTimezoneOffset(m),m+=l,b=this.getTimezoneOffset(m),l!==b?m+=b-l:l-36E5!==this.getTimezoneOffset(m-36E5)||a.isSafari||(m-=36E5)):m=(new this.Date(d,q,k(v,1),k(p,0),k(g,0),k(e,0))).getTime();
return m},timezoneOffsetFunction:function(){var d=this,k=this.options,v=q.moment;if(!this.useUTC)return function(a){return 6E4*(new Date(a)).getTimezoneOffset()};if(k.timezone){if(v)return function(a){return 6E4*-v.tz(a,k.timezone).utcOffset()};a.error(25)}return this.useUTC&&k.getTimezoneOffset?function(a){return 6E4*k.getTimezoneOffset(a)}:function(){return 6E4*(d.timezoneOffset||0)}},dateFormat:function(d,k,v){if(!a.defined(k)||isNaN(k))return a.defaultOptions.lang.invalidDate||"";d=a.pick(d,"%Y-%m-%d %H:%M:%S");
var p=this,g=new this.Date(k),e=this.get("Hours",g),m=this.get("Day",g),l=this.get("Date",g),b=this.get("Month",g),f=this.get("FullYear",g),c=a.defaultOptions.lang,w=c.weekdays,r=c.shortWeekdays,J=a.pad,g=a.extend({a:r?r[m]:w[m].substr(0,3),A:w[m],d:J(l),e:J(l,2," "),w:m,b:c.shortMonths[b],B:c.months[b],m:J(b+1),o:b+1,y:f.toString().substr(2,2),Y:f,H:J(e),k:e,I:J(e%12||12),l:e%12||12,M:J(p.get("Minutes",g)),p:12>e?"AM":"PM",P:12>e?"am":"pm",S:J(g.getSeconds()),L:J(Math.floor(k%1E3),3)},a.dateFormats);
a.objectEach(g,function(a,c){for(;-1!==d.indexOf("%"+c);)d=d.replace("%"+c,"function"===typeof a?a.call(p,k):a)});return v?d.substr(0,1).toUpperCase()+d.substr(1):d},resolveDTLFormat:function(d){return a.isObject(d,!0)?d:(d=a.splat(d),{main:d[0],from:d[1],to:d[2]})},getTimeTicks:function(a,q,v,p){var g=this,e=[],m,l={},b;m=new g.Date(q);var f=a.unitRange,c=a.count||1,w;p=k(p,1);if(C(q)){g.set("Milliseconds",m,f>=d.second?0:c*Math.floor(g.get("Milliseconds",m)/c));f>=d.second&&g.set("Seconds",m,f>=
d.minute?0:c*Math.floor(g.get("Seconds",m)/c));f>=d.minute&&g.set("Minutes",m,f>=d.hour?0:c*Math.floor(g.get("Minutes",m)/c));f>=d.hour&&g.set("Hours",m,f>=d.day?0:c*Math.floor(g.get("Hours",m)/c));f>=d.day&&g.set("Date",m,f>=d.month?1:Math.max(1,c*Math.floor(g.get("Date",m)/c)));f>=d.month&&(g.set("Month",m,f>=d.year?0:c*Math.floor(g.get("Month",m)/c)),b=g.get("FullYear",m));f>=d.year&&g.set("FullYear",m,b-b%c);f===d.week&&(b=g.get("Day",m),g.set("Date",m,g.get("Date",m)-b+p+(b<p?-7:0)));b=g.get("FullYear",
m);p=g.get("Month",m);var r=g.get("Date",m),J=g.get("Hours",m);q=m.getTime();g.variableTimezone&&(w=v-q>4*d.month||g.getTimezoneOffset(q)!==g.getTimezoneOffset(v));q=m.getTime();for(m=1;q<v;)e.push(q),q=f===d.year?g.makeTime(b+m*c,0):f===d.month?g.makeTime(b,p+m*c):!w||f!==d.day&&f!==d.week?w&&f===d.hour&&1<c?g.makeTime(b,p,r,J+m*c):q+f*c:g.makeTime(b,p,r+m*c*(f===d.day?1:7)),m++;e.push(q);f<=d.hour&&1E4>e.length&&e.forEach(function(a){0===a%18E5&&"000000000"===g.dateFormat("%H%M%S%L",a)&&(l[a]="day")})}e.info=
I(a,{higherRanks:l,totalRange:f*c});return e}}});K(F,"parts/Options.js",[F["parts/Globals.js"]],function(a){var C=a.color,I=a.merge;a.defaultOptions={colors:"#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #2b908f #f45b5b #91e8e1".split(" "),symbols:["circle","diamond","square","triangle","triangle-down"],lang:{loading:"Loading...",months:"January February March April May June July August September October November December".split(" "),shortMonths:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),
weekdays:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),decimalPoint:".",numericSymbols:"kMGTPE".split(""),resetZoom:"Reset zoom",resetZoomTitle:"Reset zoom level 1:1",thousandsSep:" "},global:{},time:a.Time.prototype.defaultOptions,chart:{styledMode:!1,borderRadius:0,colorCount:10,defaultSeriesType:"line",ignoreHiddenSeries:!0,spacing:[10,10,15,10],resetZoomButton:{theme:{zIndex:6},position:{align:"right",x:-10,y:10}},width:null,height:null,borderColor:"#335cad",backgroundColor:"#ffffff",
plotBorderColor:"#cccccc"},title:{text:"Chart title",align:"center",margin:15,widthAdjust:-44},subtitle:{text:"",align:"center",widthAdjust:-44},plotOptions:{},labels:{style:{position:"absolute",color:"#333333"}},legend:{enabled:!0,align:"center",alignColumns:!0,layout:"horizontal",labelFormatter:function(){return this.name},borderColor:"#999999",borderRadius:0,navigation:{activeColor:"#003399",inactiveColor:"#cccccc"},itemStyle:{color:"#333333",cursor:"pointer",fontSize:"12px",fontWeight:"bold",
textOverflow:"ellipsis"},itemHoverStyle:{color:"#000000"},itemHiddenStyle:{color:"#cccccc"},shadow:!1,itemCheckboxStyle:{position:"absolute",width:"13px",height:"13px"},squareSymbol:!0,symbolPadding:5,verticalAlign:"bottom",x:0,y:0,title:{style:{fontWeight:"bold"}}},loading:{labelStyle:{fontWeight:"bold",position:"relative",top:"45%"},style:{position:"absolute",backgroundColor:"#ffffff",opacity:.5,textAlign:"center"}},tooltip:{enabled:!0,animation:a.svg,borderRadius:3,dateTimeLabelFormats:{millisecond:"%A, %b %e, %H:%M:%S.%L",
second:"%A, %b %e, %H:%M:%S",minute:"%A, %b %e, %H:%M",hour:"%A, %b %e, %H:%M",day:"%A, %b %e, %Y",week:"Week from %A, %b %e, %Y",month:"%B %Y",year:"%Y"},footerFormat:"",padding:8,snap:a.isTouchDevice?25:10,headerFormat:'\x3cspan style\x3d"font-size: 10px"\x3e{point.key}\x3c/span\x3e\x3cbr/\x3e',pointFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e {series.name}: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e',backgroundColor:C("#f7f7f7").setOpacity(.85).get(),borderWidth:1,shadow:!0,
style:{color:"#333333",cursor:"default",fontSize:"12px",pointerEvents:"none",whiteSpace:"nowrap"}},credits:{enabled:!0,href:"https://www.highcharts.com?credits",position:{align:"right",x:-10,verticalAlign:"bottom",y:-5},style:{cursor:"pointer",color:"#999999",fontSize:"9px"},text:"Highcharts.com"}};a.setOptions=function(C){a.defaultOptions=I(!0,a.defaultOptions,C);a.time.update(I(a.defaultOptions.global,a.defaultOptions.time),!1);return a.defaultOptions};a.getOptions=function(){return a.defaultOptions};
a.defaultPlotOptions=a.defaultOptions.plotOptions;a.time=new a.Time(I(a.defaultOptions.global,a.defaultOptions.time));a.dateFormat=function(C,k,d){return a.time.dateFormat(C,k,d)}});K(F,"parts/Tick.js",[F["parts/Globals.js"]],function(a){var C=a.correctFloat,I=a.defined,H=a.destroyObjectProperties,k=a.fireEvent,d=a.isNumber,q=a.merge,t=a.pick,u=a.deg2rad;a.Tick=function(a,d,g,e,m){this.axis=a;this.pos=d;this.type=g||"";this.isNewLabel=this.isNew=!0;this.parameters=m||{};this.tickmarkOffset=this.parameters.tickmarkOffset;
this.options=this.parameters.options;g||e||this.addLabel()};a.Tick.prototype={addLabel:function(){var d=this,p=d.axis,g=p.options,e=p.chart,m=p.categories,l=p.names,b=d.pos,f=t(d.options&&d.options.labels,g.labels),c=p.tickPositions,w=b===c[0],r=b===c[c.length-1],m=this.parameters.category||(m?t(m[b],l[b],b):b),k=d.label,c=c.info,G,B,n,E;p.isDatetimeAxis&&c&&(B=e.time.resolveDTLFormat(g.dateTimeLabelFormats[!g.grid&&c.higherRanks[b]||c.unitName]),G=B.main);d.isFirst=w;d.isLast=r;d.formatCtx={axis:p,
chart:e,isFirst:w,isLast:r,dateTimeLabelFormat:G,tickPositionInfo:c,value:p.isLog?C(p.lin2log(m)):m,pos:b};g=p.labelFormatter.call(d.formatCtx,this.formatCtx);if(E=B&&B.list)d.shortenLabel=function(){for(n=0;n<E.length;n++)if(k.attr({text:p.labelFormatter.call(a.extend(d.formatCtx,{dateTimeLabelFormat:E[n]}))}),k.getBBox().width<p.getSlotWidth(d)-2*t(f.padding,5))return;k.attr({text:""})};if(I(k))k&&k.textStr!==g&&(!k.textWidth||f.style&&f.style.width||k.styles.width||k.css({width:null}),k.attr({text:g}));
else{if(d.label=k=I(g)&&f.enabled?e.renderer.text(g,0,0,f.useHTML).add(p.labelGroup):null)e.styledMode||k.css(q(f.style)),k.textPxLength=k.getBBox().width;d.rotation=0}},getLabelSize:function(){return this.label?this.label.getBBox()[this.axis.horiz?"height":"width"]:0},handleOverflow:function(a){var d=this.axis,g=d.options.labels,e=a.x,m=d.chart.chartWidth,l=d.chart.spacing,b=t(d.labelLeft,Math.min(d.pos,l[3])),l=t(d.labelRight,Math.max(d.isRadial?0:d.pos+d.len,m-l[1])),f=this.label,c=this.rotation,
w={left:0,center:.5,right:1}[d.labelAlign||f.attr("align")],r=f.getBBox().width,k=d.getSlotWidth(this),G=k,B=1,n,E={};if(c||"justify"!==t(g.overflow,"justify"))0>c&&e-w*r<b?n=Math.round(e/Math.cos(c*u)-b):0<c&&e+w*r>l&&(n=Math.round((m-e)/Math.cos(c*u)));else if(m=e+(1-w)*r,e-w*r<b?G=a.x+G*(1-w)-b:m>l&&(G=l-a.x+G*w,B=-1),G=Math.min(k,G),G<k&&"center"===d.labelAlign&&(a.x+=B*(k-G-w*(k-Math.min(r,G)))),r>G||d.autoRotation&&(f.styles||{}).width)n=G;n&&(this.shortenLabel?this.shortenLabel():(E.width=
Math.floor(n),(g.style||{}).textOverflow||(E.textOverflow="ellipsis"),f.css(E)))},getPosition:function(d,p,g,e){var m=this.axis,l=m.chart,b=e&&l.oldChartHeight||l.chartHeight;d={x:d?a.correctFloat(m.translate(p+g,null,null,e)+m.transB):m.left+m.offset+(m.opposite?(e&&l.oldChartWidth||l.chartWidth)-m.right-m.left:0),y:d?b-m.bottom+m.offset-(m.opposite?m.height:0):a.correctFloat(b-m.translate(p+g,null,null,e)-m.transB)};k(this,"afterGetPosition",{pos:d});return d},getLabelPosition:function(a,d,g,e,
m,l,b,f){var c=this.axis,w=c.transA,r=c.reversed,p=c.staggerLines,G=c.tickRotCorr||{x:0,y:0},B=m.y,n=e||c.reserveSpaceDefault?0:-c.labelOffset*("center"===c.labelAlign?.5:1),E={};I(B)||(B=0===c.side?g.rotation?-8:-g.getBBox().height:2===c.side?G.y+8:Math.cos(g.rotation*u)*(G.y-g.getBBox(!1,0).height/2));a=a+m.x+n+G.x-(l&&e?l*w*(r?-1:1):0);d=d+B-(l&&!e?l*w*(r?1:-1):0);p&&(g=b/(f||1)%p,c.opposite&&(g=p-g-1),d+=c.labelOffset/p*g);E.x=a;E.y=Math.round(d);k(this,"afterGetLabelPosition",{pos:E,tickmarkOffset:l,
index:b});return E},getMarkPath:function(a,d,g,e,m,l){return l.crispLine(["M",a,d,"L",a+(m?0:-g),d+(m?g:0)],e)},renderGridLine:function(a,d,g){var e=this.axis,m=e.options,l=this.gridLine,b={},f=this.pos,c=this.type,w=t(this.tickmarkOffset,e.tickmarkOffset),r=e.chart.renderer,p=c?c+"Grid":"grid",k=m[p+"LineWidth"],B=m[p+"LineColor"],m=m[p+"LineDashStyle"];l||(e.chart.styledMode||(b.stroke=B,b["stroke-width"]=k,m&&(b.dashstyle=m)),c||(b.zIndex=1),a&&(d=0),this.gridLine=l=r.path().attr(b).addClass("highcharts-"+
(c?c+"-":"")+"grid-line").add(e.gridGroup));if(l&&(g=e.getPlotLinePath(f+w,l.strokeWidth()*g,a,"pass")))l[a||this.isNew?"attr":"animate"]({d:g,opacity:d})},renderMark:function(a,d,g){var e=this.axis,m=e.options,l=e.chart.renderer,b=this.type,f=b?b+"Tick":"tick",c=e.tickSize(f),w=this.mark,r=!w,p=a.x;a=a.y;var k=t(m[f+"Width"],!b&&e.isXAxis?1:0),m=m[f+"Color"];c&&(e.opposite&&(c[0]=-c[0]),r&&(this.mark=w=l.path().addClass("highcharts-"+(b?b+"-":"")+"tick").add(e.axisGroup),e.chart.styledMode||w.attr({stroke:m,
"stroke-width":k})),w[r?"attr":"animate"]({d:this.getMarkPath(p,a,c[0],w.strokeWidth()*g,e.horiz,l),opacity:d}))},renderLabel:function(a,p,g,e){var m=this.axis,l=m.horiz,b=m.options,f=this.label,c=b.labels,w=c.step,m=t(this.tickmarkOffset,m.tickmarkOffset),r=!0,k=a.x;a=a.y;f&&d(k)&&(f.xy=a=this.getLabelPosition(k,a,f,l,c,m,e,w),this.isFirst&&!this.isLast&&!t(b.showFirstLabel,1)||this.isLast&&!this.isFirst&&!t(b.showLastLabel,1)?r=!1:!l||c.step||c.rotation||p||0===g||this.handleOverflow(a),w&&e%w&&
(r=!1),r&&d(a.y)?(a.opacity=g,f[this.isNewLabel?"attr":"animate"](a),this.isNewLabel=!1):(f.attr("y",-9999),this.isNewLabel=!0))},render:function(d,p,g){var e=this.axis,m=e.horiz,l=this.pos,b=t(this.tickmarkOffset,e.tickmarkOffset),l=this.getPosition(m,l,b,p),b=l.x,f=l.y,e=m&&b===e.pos+e.len||!m&&f===e.pos?-1:1;g=t(g,1);this.isActive=!0;this.renderGridLine(p,g,e);this.renderMark(l,g,e);this.renderLabel(l,p,g,d);this.isNew=!1;a.fireEvent(this,"afterRender")},destroy:function(){H(this,this.axis)}}});
K(F,"parts/Axis.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.animObject,H=a.arrayMax,k=a.arrayMin,d=a.color,q=a.correctFloat,t=a.defaultOptions,u=a.defined,v=a.deg2rad,p=a.destroyObjectProperties,g=a.extend,e=a.fireEvent,m=a.format,l=a.getMagnitude,b=a.isArray,f=a.isNumber,c=a.isString,w=a.merge,r=a.normalizeTickInterval,J=a.objectEach,G=a.pick,B=a.removeEvent,n=a.seriesTypes,E=a.splat,z=a.syncTimeout,A=a.Tick,D=function(){this.init.apply(this,arguments)};a.extend(D.prototype,{defaultOptions:{dateTimeLabelFormats:{millisecond:{main:"%H:%M:%S.%L",
range:!1},second:{main:"%H:%M:%S",range:!1},minute:{main:"%H:%M",range:!1},hour:{main:"%H:%M",range:!1},day:{main:"%e. %b"},week:{main:"%e. %b"},month:{main:"%b '%y"},year:{main:"%Y"}},endOnTick:!1,labels:{enabled:!0,indentation:10,x:0,style:{color:"#666666",cursor:"default",fontSize:"11px"}},maxPadding:.01,minorTickLength:2,minorTickPosition:"outside",minPadding:.01,showEmpty:!0,startOfWeek:1,startOnTick:!1,tickLength:10,tickPixelInterval:100,tickmarkPlacement:"between",tickPosition:"outside",title:{align:"middle",
style:{color:"#666666"}},type:"linear",minorGridLineColor:"#f2f2f2",minorGridLineWidth:1,minorTickColor:"#999999",lineColor:"#ccd6eb",lineWidth:1,gridLineColor:"#e6e6e6",tickColor:"#ccd6eb"},defaultYAxisOptions:{endOnTick:!0,maxPadding:.05,minPadding:.05,tickPixelInterval:72,showLastLabel:!0,labels:{x:-8},startOnTick:!0,title:{rotation:270,text:"Values"},stackLabels:{allowOverlap:!1,enabled:!1,formatter:function(){return a.numberFormat(this.total,-1)},style:{color:"#000000",fontSize:"11px",fontWeight:"bold",
textOutline:"1px contrast"}},gridLineWidth:1,lineWidth:0},defaultLeftAxisOptions:{labels:{x:-15},title:{rotation:270}},defaultRightAxisOptions:{labels:{x:15},title:{rotation:90}},defaultBottomAxisOptions:{labels:{autoRotation:[-45],x:0},margin:15,title:{rotation:0}},defaultTopAxisOptions:{labels:{autoRotation:[-45],x:0},margin:15,title:{rotation:0}},init:function(a,c){var h=c.isX,b=this;b.chart=a;b.horiz=a.inverted&&!b.isZAxis?!h:h;b.isXAxis=h;b.coll=b.coll||(h?"xAxis":"yAxis");e(this,"init",{userOptions:c});
b.opposite=c.opposite;b.side=c.side||(b.horiz?b.opposite?0:2:b.opposite?1:3);b.setOptions(c);var f=this.options,y=f.type;b.labelFormatter=f.labels.formatter||b.defaultLabelFormatter;b.userOptions=c;b.minPixelPadding=0;b.reversed=f.reversed;b.visible=!1!==f.visible;b.zoomEnabled=!1!==f.zoomEnabled;b.hasNames="category"===y||!0===f.categories;b.categories=f.categories||b.hasNames;b.names||(b.names=[],b.names.keys={});b.plotLinesAndBandsGroups={};b.isLog="logarithmic"===y;b.isDatetimeAxis="datetime"===
y;b.positiveValuesOnly=b.isLog&&!b.allowNegativeLog;b.isLinked=u(f.linkedTo);b.ticks={};b.labelEdge=[];b.minorTicks={};b.plotLinesAndBands=[];b.alternateBands={};b.len=0;b.minRange=b.userMinRange=f.minRange||f.maxZoom;b.range=f.range;b.offset=f.offset||0;b.stacks={};b.oldStacks={};b.stacksTouched=0;b.max=null;b.min=null;b.crosshair=G(f.crosshair,E(a.options.tooltip.crosshairs)[h?0:1],!1);c=b.options.events;-1===a.axes.indexOf(b)&&(h?a.axes.splice(a.xAxis.length,0,b):a.axes.push(b),a[b.coll].push(b));
b.series=b.series||[];a.inverted&&!b.isZAxis&&h&&void 0===b.reversed&&(b.reversed=!0);J(c,function(a,h){C(b,h,a)});b.lin2log=f.linearToLogConverter||b.lin2log;b.isLog&&(b.val2lin=b.log2lin,b.lin2val=b.lin2log);e(this,"afterInit")},setOptions:function(a){this.options=w(this.defaultOptions,"yAxis"===this.coll&&this.defaultYAxisOptions,[this.defaultTopAxisOptions,this.defaultRightAxisOptions,this.defaultBottomAxisOptions,this.defaultLeftAxisOptions][this.side],w(t[this.coll],a));e(this,"afterSetOptions",
{userOptions:a})},defaultLabelFormatter:function(){var h=this.axis,b=this.value,c=h.chart.time,f=h.categories,e=this.dateTimeLabelFormat,n=t.lang,l=n.numericSymbols,n=n.numericSymbolMagnitude||1E3,g=l&&l.length,d,r=h.options.labels.format,h=h.isLog?Math.abs(b):h.tickInterval;if(r)d=m(r,this,c);else if(f)d=b;else if(e)d=c.dateFormat(e,b);else if(g&&1E3<=h)for(;g--&&void 0===d;)c=Math.pow(n,g+1),h>=c&&0===10*b%c&&null!==l[g]&&0!==b&&(d=a.numberFormat(b/c,-1)+l[g]);void 0===d&&(d=1E4<=Math.abs(b)?a.numberFormat(b,
-1):a.numberFormat(b,-1,void 0,""));return d},getSeriesExtremes:function(){var a=this,b=a.chart,c;e(this,"getSeriesExtremes",null,function(){a.hasVisibleSeries=!1;a.dataMin=a.dataMax=a.threshold=null;a.softThreshold=!a.isXAxis;a.buildStacks&&a.buildStacks();a.series.forEach(function(h){if(h.visible||!b.options.chart.ignoreHiddenSeries){var e=h.options,y=e.threshold,n,l;a.hasVisibleSeries=!0;a.positiveValuesOnly&&0>=y&&(y=null);if(a.isXAxis)e=h.xData,e.length&&(c=h.getXExtremes(e),n=c.min,l=c.max,
f(n)||n instanceof Date||(e=e.filter(f),c=h.getXExtremes(e),n=c.min,l=c.max),e.length&&(a.dataMin=Math.min(G(a.dataMin,n),n),a.dataMax=Math.max(G(a.dataMax,l),l)));else if(h.getExtremes(),l=h.dataMax,n=h.dataMin,u(n)&&u(l)&&(a.dataMin=Math.min(G(a.dataMin,n),n),a.dataMax=Math.max(G(a.dataMax,l),l)),u(y)&&(a.threshold=y),!e.softThreshold||a.positiveValuesOnly)a.softThreshold=!1}})});e(this,"afterGetSeriesExtremes")},translate:function(a,b,c,e,n,l){var h=this.linkedParent||this,y=1,g=0,d=e?h.oldTransA:
h.transA;e=e?h.oldMin:h.min;var r=h.minPixelPadding;n=(h.isOrdinal||h.isBroken||h.isLog&&n)&&h.lin2val;d||(d=h.transA);c&&(y*=-1,g=h.len);h.reversed&&(y*=-1,g-=y*(h.sector||h.len));b?(a=(a*y+g-r)/d+e,n&&(a=h.lin2val(a))):(n&&(a=h.val2lin(a)),a=f(e)?y*(a-e)*d+g+y*r+(f(l)?d*l:0):void 0);return a},toPixels:function(a,b){return this.translate(a,!1,!this.horiz,null,!0)+(b?0:this.pos)},toValue:function(a,b){return this.translate(a-(b?0:this.pos),!0,!this.horiz,null,!0)},getPlotLinePath:function(a,b,c,n,
l){var h=this,y=h.chart,g=h.left,d=h.top,r,m,w,z,E=c&&y.oldChartHeight||y.chartHeight,L=c&&y.oldChartWidth||y.chartWidth,p,D=h.transB,A,B=function(a,h,b){if("pass"!==n&&a<h||a>b)n?a=Math.min(Math.max(h,a),b):p=!0;return a};A={value:a,lineWidth:b,old:c,force:n,translatedValue:l};e(this,"getPlotLinePath",A,function(e){l=G(l,h.translate(a,null,null,c));l=Math.min(Math.max(-1E5,l),1E5);r=w=Math.round(l+D);m=z=Math.round(E-l-D);f(l)?h.horiz?(m=d,z=E-h.bottom,r=w=B(r,g,g+h.width)):(r=g,w=L-h.right,m=z=
B(m,d,d+h.height)):(p=!0,n=!1);e.path=p&&!n?null:y.renderer.crispLine(["M",r,m,"L",w,z],b||1)});return A.path},getLinearTickPositions:function(a,b,c){var h,f=q(Math.floor(b/a)*a);c=q(Math.ceil(c/a)*a);var e=[],y;q(f+a)===f&&(y=20);if(this.single)return[b];for(b=f;b<=c;){e.push(b);b=q(b+a,y);if(b===h)break;h=b}return e},getMinorTickInterval:function(){var a=this.options;return!0===a.minorTicks?G(a.minorTickInterval,"auto"):!1===a.minorTicks?null:a.minorTickInterval},getMinorTickPositions:function(){var a=
this,b=a.options,c=a.tickPositions,f=a.minorTickInterval,e=[],n=a.pointRangePadding||0,l=a.min-n,n=a.max+n,g=n-l;if(g&&g/f<a.len/3)if(a.isLog)this.paddedTicks.forEach(function(h,b,c){b&&e.push.apply(e,a.getLogTickPositions(f,c[b-1],c[b],!0))});else if(a.isDatetimeAxis&&"auto"===this.getMinorTickInterval())e=e.concat(a.getTimeTicks(a.normalizeTimeTickInterval(f),l,n,b.startOfWeek));else for(b=l+(c[0]-l)%f;b<=n&&b!==e[0];b+=f)e.push(b);0!==e.length&&a.trimTicks(e);return e},adjustForMinRange:function(){var a=
this.options,b=this.min,c=this.max,f,e,n,l,g,d,r,m;this.isXAxis&&void 0===this.minRange&&!this.isLog&&(u(a.min)||u(a.max)?this.minRange=null:(this.series.forEach(function(a){d=a.xData;for(l=r=a.xIncrement?1:d.length-1;0<l;l--)if(g=d[l]-d[l-1],void 0===n||g<n)n=g}),this.minRange=Math.min(5*n,this.dataMax-this.dataMin)));c-b<this.minRange&&(e=this.dataMax-this.dataMin>=this.minRange,m=this.minRange,f=(m-c+b)/2,f=[b-f,G(a.min,b-f)],e&&(f[2]=this.isLog?this.log2lin(this.dataMin):this.dataMin),b=H(f),
c=[b+m,G(a.max,b+m)],e&&(c[2]=this.isLog?this.log2lin(this.dataMax):this.dataMax),c=k(c),c-b<m&&(f[0]=c-m,f[1]=G(a.min,c-m),b=H(f)));this.min=b;this.max=c},getClosest:function(){var a;this.categories?a=1:this.series.forEach(function(h){var b=h.closestPointRange,c=h.visible||!h.chart.options.chart.ignoreHiddenSeries;!h.noSharedTooltip&&u(b)&&c&&(a=u(a)?Math.min(a,b):b)});return a},nameToX:function(a){var h=b(this.categories),c=h?this.categories:this.names,f=a.options.x,e;a.series.requireSorting=!1;
u(f)||(f=!1===this.options.uniqueNames?a.series.autoIncrement():h?c.indexOf(a.name):G(c.keys[a.name],-1));-1===f?h||(e=c.length):e=f;void 0!==e&&(this.names[e]=a.name,this.names.keys[a.name]=e);return e},updateNames:function(){var a=this,b=this.names;0<b.length&&(Object.keys(b.keys).forEach(function(a){delete b.keys[a]}),b.length=0,this.minRange=this.userMinRange,(this.series||[]).forEach(function(h){h.xIncrement=null;if(!h.points||h.isDirtyData)a.max=Math.max(a.max,h.xData.length-1),h.processData(),
h.generatePoints();h.data.forEach(function(b,c){var f;b&&b.options&&void 0!==b.name&&(f=a.nameToX(b),void 0!==f&&f!==b.x&&(b.x=f,h.xData[c]=f))})}))},setAxisTranslation:function(a){var h=this,b=h.max-h.min,f=h.axisPointRange||0,l,g=0,d=0,r=h.linkedParent,m=!!h.categories,w=h.transA,z=h.isXAxis;if(z||m||f)l=h.getClosest(),r?(g=r.minPointOffset,d=r.pointRangePadding):h.series.forEach(function(a){var b=m?1:z?G(a.options.pointRange,l,0):h.axisPointRange||0,e=a.options.pointPlacement;f=Math.max(f,b);if(!h.single||
m)a=n.xrange&&a instanceof n.xrange?!z:z,g=Math.max(g,a&&c(e)?0:b/2),d=Math.max(d,a&&"on"===e?0:b)}),r=h.ordinalSlope&&l?h.ordinalSlope/l:1,h.minPointOffset=g*=r,h.pointRangePadding=d*=r,h.pointRange=Math.min(f,b),z&&(h.closestPointRange=l);a&&(h.oldTransA=w);h.translationSlope=h.transA=w=h.staticScale||h.len/(b+d||1);h.transB=h.horiz?h.left:h.bottom;h.minPixelPadding=w*g;e(this,"afterSetAxisTranslation")},minFromRange:function(){return this.max-this.range},setTickInterval:function(h){var b=this,
c=b.chart,n=b.options,g=b.isLog,d=b.isDatetimeAxis,m=b.isXAxis,w=b.isLinked,z=n.maxPadding,E=n.minPadding,p,D=n.tickInterval,A=n.tickPixelInterval,B=b.categories,k=f(b.threshold)?b.threshold:null,J=b.softThreshold,v,t,C;d||B||w||this.getTickAmount();t=G(b.userMin,n.min);C=G(b.userMax,n.max);w?(b.linkedParent=c[b.coll][n.linkedTo],p=b.linkedParent.getExtremes(),b.min=G(p.min,p.dataMin),b.max=G(p.max,p.dataMax),n.type!==b.linkedParent.options.type&&a.error(11,1,c)):(!J&&u(k)&&(b.dataMin>=k?(p=k,E=0):
b.dataMax<=k&&(v=k,z=0)),b.min=G(t,p,b.dataMin),b.max=G(C,v,b.dataMax));g&&(b.positiveValuesOnly&&!h&&0>=Math.min(b.min,G(b.dataMin,b.min))&&a.error(10,1,c),b.min=q(b.log2lin(b.min),15),b.max=q(b.log2lin(b.max),15));b.range&&u(b.max)&&(b.userMin=b.min=t=Math.max(b.dataMin,b.minFromRange()),b.userMax=C=b.max,b.range=null);e(b,"foundExtremes");b.beforePadding&&b.beforePadding();b.adjustForMinRange();!(B||b.axisPointRange||b.usePercentage||w)&&u(b.min)&&u(b.max)&&(c=b.max-b.min)&&(!u(t)&&E&&(b.min-=
c*E),!u(C)&&z&&(b.max+=c*z));f(n.softMin)&&!f(b.userMin)&&n.softMin<b.min&&(b.min=t=n.softMin);f(n.softMax)&&!f(b.userMax)&&n.softMax>b.max&&(b.max=C=n.softMax);f(n.floor)&&(b.min=Math.min(Math.max(b.min,n.floor),Number.MAX_VALUE));f(n.ceiling)&&(b.max=Math.max(Math.min(b.max,n.ceiling),G(b.userMax,-Number.MAX_VALUE)));J&&u(b.dataMin)&&(k=k||0,!u(t)&&b.min<k&&b.dataMin>=k?b.min=b.options.minRange?Math.min(k,b.max-b.minRange):k:!u(C)&&b.max>k&&b.dataMax<=k&&(b.max=b.options.minRange?Math.max(k,b.min+
b.minRange):k));b.tickInterval=b.min===b.max||void 0===b.min||void 0===b.max?1:w&&!D&&A===b.linkedParent.options.tickPixelInterval?D=b.linkedParent.tickInterval:G(D,this.tickAmount?(b.max-b.min)/Math.max(this.tickAmount-1,1):void 0,B?1:(b.max-b.min)*A/Math.max(b.len,A));m&&!h&&b.series.forEach(function(a){a.processData(b.min!==b.oldMin||b.max!==b.oldMax)});b.setAxisTranslation(!0);b.beforeSetTickPositions&&b.beforeSetTickPositions();b.postProcessTickInterval&&(b.tickInterval=b.postProcessTickInterval(b.tickInterval));
b.pointRange&&!D&&(b.tickInterval=Math.max(b.pointRange,b.tickInterval));h=G(n.minTickInterval,b.isDatetimeAxis&&b.closestPointRange);!D&&b.tickInterval<h&&(b.tickInterval=h);d||g||D||(b.tickInterval=r(b.tickInterval,null,l(b.tickInterval),G(n.allowDecimals,!(.5<b.tickInterval&&5>b.tickInterval&&1E3<b.max&&9999>b.max)),!!this.tickAmount));this.tickAmount||(b.tickInterval=b.unsquish());this.setTickPositions()},setTickPositions:function(){var b=this.options,c,f=b.tickPositions;c=this.getMinorTickInterval();
var n=b.tickPositioner,l=b.startOnTick,g=b.endOnTick;this.tickmarkOffset=this.categories&&"between"===b.tickmarkPlacement&&1===this.tickInterval?.5:0;this.minorTickInterval="auto"===c&&this.tickInterval?this.tickInterval/5:c;this.single=this.min===this.max&&u(this.min)&&!this.tickAmount&&(parseInt(this.min,10)===this.min||!1!==b.allowDecimals);this.tickPositions=c=f&&f.slice();!c&&(!this.ordinalPositions&&(this.max-this.min)/this.tickInterval>Math.max(2*this.len,200)?(c=[this.min,this.max],a.error(19,
!1,this.chart)):c=this.isDatetimeAxis?this.getTimeTicks(this.normalizeTimeTickInterval(this.tickInterval,b.units),this.min,this.max,b.startOfWeek,this.ordinalPositions,this.closestPointRange,!0):this.isLog?this.getLogTickPositions(this.tickInterval,this.min,this.max):this.getLinearTickPositions(this.tickInterval,this.min,this.max),c.length>this.len&&(c=[c[0],c.pop()],c[0]===c[1]&&(c.length=1)),this.tickPositions=c,n&&(n=n.apply(this,[this.min,this.max])))&&(this.tickPositions=c=n);this.paddedTicks=
c.slice(0);this.trimTicks(c,l,g);this.isLinked||(this.single&&2>c.length&&!this.categories&&(this.min-=.5,this.max+=.5),f||n||this.adjustTickAmount());e(this,"afterSetTickPositions")},trimTicks:function(a,b,c){var h=a[0],f=a[a.length-1],n=this.minPointOffset||0;e(this,"trimTicks");if(!this.isLinked){if(b&&-Infinity!==h)this.min=h;else for(;this.min-n>a[0];)a.shift();if(c)this.max=f;else for(;this.max+n<a[a.length-1];)a.pop();0===a.length&&u(h)&&!this.options.tickPositions&&a.push((f+h)/2)}},alignToOthers:function(){var a=
{},b,c=this.options;!1===this.chart.options.chart.alignTicks||!1===c.alignTicks||!1===c.startOnTick||!1===c.endOnTick||this.isLog||this.chart[this.coll].forEach(function(h){var c=h.options,c=[h.horiz?c.left:c.top,c.width,c.height,c.pane].join();h.series.length&&(a[c]?b=!0:a[c]=1)});return b},getTickAmount:function(){var a=this.options,b=a.tickAmount,c=a.tickPixelInterval;!u(a.tickInterval)&&this.len<c&&!this.isRadial&&!this.isLog&&a.startOnTick&&a.endOnTick&&(b=2);!b&&this.alignToOthers()&&(b=Math.ceil(this.len/
c)+1);4>b&&(this.finalTickAmt=b,b=5);this.tickAmount=b},adjustTickAmount:function(){var a=this.options,b=this.tickInterval,c=this.tickPositions,f=this.tickAmount,e=this.finalTickAmt,n=c&&c.length,l=G(this.threshold,this.softThreshold?0:null),g;if(this.hasData()){if(n<f){for(g=this.min;c.length<f;)c.length%2||g===l?c.push(q(c[c.length-1]+b)):c.unshift(q(c[0]-b));this.transA*=(n-1)/(f-1);this.min=a.startOnTick?c[0]:Math.min(this.min,c[0]);this.max=a.endOnTick?c[c.length-1]:Math.max(this.max,c[c.length-
1])}else n>f&&(this.tickInterval*=2,this.setTickPositions());if(u(e)){for(b=a=c.length;b--;)(3===e&&1===b%2||2>=e&&0<b&&b<a-1)&&c.splice(b,1);this.finalTickAmt=void 0}}},setScale:function(){var a=this.series.some(function(a){return a.isDirtyData||a.isDirty||a.xAxis.isDirty}),b;this.oldMin=this.min;this.oldMax=this.max;this.oldAxisLength=this.len;this.setAxisSize();(b=this.len!==this.oldAxisLength)||a||this.isLinked||this.forceRedraw||this.userMin!==this.oldUserMin||this.userMax!==this.oldUserMax||
this.alignToOthers()?(this.resetStacks&&this.resetStacks(),this.forceRedraw=!1,this.getSeriesExtremes(),this.setTickInterval(),this.oldUserMin=this.userMin,this.oldUserMax=this.userMax,this.isDirty||(this.isDirty=b||this.min!==this.oldMin||this.max!==this.oldMax)):this.cleanStacks&&this.cleanStacks();e(this,"afterSetScale")},setExtremes:function(a,b,c,f,n){var h=this,l=h.chart;c=G(c,!0);h.series.forEach(function(a){delete a.kdTree});n=g(n,{min:a,max:b});e(h,"setExtremes",n,function(){h.userMin=a;
h.userMax=b;h.eventArgs=n;c&&l.redraw(f)})},zoom:function(a,b){var h=this.dataMin,c=this.dataMax,f=this.options,n=Math.min(h,G(f.min,h)),l=Math.max(c,G(f.max,c));a={newMin:a,newMax:b};e(this,"zoom",a,function(a){var b=a.newMin,f=a.newMax;if(b!==this.min||f!==this.max)this.allowZoomOutside||(u(h)&&(b<n&&(b=n),b>l&&(b=l)),u(c)&&(f<n&&(f=n),f>l&&(f=l))),this.displayBtn=void 0!==b||void 0!==f,this.setExtremes(b,f,!1,void 0,{trigger:"zoom"});a.zoomed=!0});return a.zoomed},setAxisSize:function(){var b=
this.chart,c=this.options,f=c.offsets||[0,0,0,0],e=this.horiz,n=this.width=Math.round(a.relativeLength(G(c.width,b.plotWidth-f[3]+f[1]),b.plotWidth)),l=this.height=Math.round(a.relativeLength(G(c.height,b.plotHeight-f[0]+f[2]),b.plotHeight)),g=this.top=Math.round(a.relativeLength(G(c.top,b.plotTop+f[0]),b.plotHeight,b.plotTop)),c=this.left=Math.round(a.relativeLength(G(c.left,b.plotLeft+f[3]),b.plotWidth,b.plotLeft));this.bottom=b.chartHeight-l-g;this.right=b.chartWidth-n-c;this.len=Math.max(e?n:
l,0);this.pos=e?c:g},getExtremes:function(){var a=this.isLog;return{min:a?q(this.lin2log(this.min)):this.min,max:a?q(this.lin2log(this.max)):this.max,dataMin:this.dataMin,dataMax:this.dataMax,userMin:this.userMin,userMax:this.userMax}},getThreshold:function(a){var b=this.isLog,h=b?this.lin2log(this.min):this.min,b=b?this.lin2log(this.max):this.max;null===a||-Infinity===a?a=h:Infinity===a?a=b:h>a?a=h:b<a&&(a=b);return this.translate(a,0,1,0,1)},autoLabelAlign:function(a){var b=(G(a,0)-90*this.side+
720)%360;a={align:"center"};e(this,"autoLabelAlign",a,function(a){15<b&&165>b?a.align="right":195<b&&345>b&&(a.align="left")});return a.align},tickSize:function(a){var b=this.options,h=b[a+"Length"],c=G(b[a+"Width"],"tick"===a&&this.isXAxis&&!this.categories?1:0),f;c&&h&&("inside"===b[a+"Position"]&&(h=-h),f=[h,c]);a={tickSize:f};e(this,"afterTickSize",a);return a.tickSize},labelMetrics:function(){var a=this.tickPositions&&this.tickPositions[0]||0;return this.chart.renderer.fontMetrics(this.options.labels.style&&
this.options.labels.style.fontSize,this.ticks[a]&&this.ticks[a].label)},unsquish:function(){var a=this.options.labels,b=this.horiz,c=this.tickInterval,f=c,e=this.len/(((this.categories?1:0)+this.max-this.min)/c),n,l=a.rotation,g=this.labelMetrics(),d,r=Number.MAX_VALUE,m,w=this.max-this.min,z=function(a){var b=a/(e||1),b=1<b?Math.ceil(b):1;b*c>w&&Infinity!==a&&Infinity!==e&&(b=Math.ceil(w/c));return q(b*c)};b?(m=!a.staggerLines&&!a.step&&(u(l)?[l]:e<G(a.autoRotationLimit,80)&&a.autoRotation))&&m.forEach(function(a){var b;
if(a===l||a&&-90<=a&&90>=a)d=z(Math.abs(g.h/Math.sin(v*a))),b=d+Math.abs(a/360),b<r&&(r=b,n=a,f=d)}):a.step||(f=z(g.h));this.autoRotation=m;this.labelRotation=G(n,l);return f},getSlotWidth:function(a){var b=this.chart,c=this.horiz,h=this.options.labels,f=Math.max(this.tickPositions.length-(this.categories?0:1),1),e=b.margin[3];return a&&a.slotWidth||c&&2>(h.step||0)&&!h.rotation&&(this.staggerLines||1)*this.len/f||!c&&(h.style&&parseInt(h.style.width,10)||e&&e-b.spacing[3]||.33*b.chartWidth)},renderUnsquish:function(){var a=
this.chart,b=a.renderer,f=this.tickPositions,e=this.ticks,n=this.options.labels,l=n&&n.style||{},g=this.horiz,d=this.getSlotWidth(),r=Math.max(1,Math.round(d-2*(n.padding||5))),m={},w=this.labelMetrics(),z=n.style&&n.style.textOverflow,E,p,D=0,A;c(n.rotation)||(m.rotation=n.rotation||0);f.forEach(function(a){(a=e[a])&&a.label&&a.label.textPxLength>D&&(D=a.label.textPxLength)});this.maxLabelLength=D;if(this.autoRotation)D>r&&D>w.h?m.rotation=this.labelRotation:this.labelRotation=0;else if(d&&(E=r,
!z))for(p="clip",r=f.length;!g&&r--;)if(A=f[r],A=e[A].label)A.styles&&"ellipsis"===A.styles.textOverflow?A.css({textOverflow:"clip"}):A.textPxLength>d&&A.css({width:d+"px"}),A.getBBox().height>this.len/f.length-(w.h-w.f)&&(A.specificTextOverflow="ellipsis");m.rotation&&(E=D>.5*a.chartHeight?.33*a.chartHeight:D,z||(p="ellipsis"));if(this.labelAlign=n.align||this.autoLabelAlign(this.labelRotation))m.align=this.labelAlign;f.forEach(function(a){var b=(a=e[a])&&a.label,c=l.width,h={};b&&(b.attr(m),a.shortenLabel?
a.shortenLabel():E&&!c&&"nowrap"!==l.whiteSpace&&(E<b.textPxLength||"SPAN"===b.element.tagName)?(h.width=E,z||(h.textOverflow=b.specificTextOverflow||p),b.css(h)):b.styles&&b.styles.width&&!h.width&&!c&&b.css({width:null}),delete b.specificTextOverflow,a.rotation=m.rotation)},this);this.tickRotCorr=b.rotCorr(w.b,this.labelRotation||0,0!==this.side)},hasData:function(){return this.series.some(function(a){return a.hasData()})||this.options.showEmpty&&u(this.min)&&u(this.max)},addTitle:function(a){var b=
this.chart.renderer,c=this.horiz,h=this.opposite,f=this.options.title,e,n=this.chart.styledMode;this.axisTitle||((e=f.textAlign)||(e=(c?{low:"left",middle:"center",high:"right"}:{low:h?"right":"left",middle:"center",high:h?"left":"right"})[f.align]),this.axisTitle=b.text(f.text,0,0,f.useHTML).attr({zIndex:7,rotation:f.rotation||0,align:e}).addClass("highcharts-axis-title"),n||this.axisTitle.css(w(f.style)),this.axisTitle.add(this.axisGroup),this.axisTitle.isNew=!0);n||f.style.width||this.isRadial||
this.axisTitle.css({width:this.len});this.axisTitle[a?"show":"hide"](!0)},generateTick:function(a){var b=this.ticks;b[a]?b[a].addLabel():b[a]=new A(this,a)},getOffset:function(){var a=this,b=a.chart,c=b.renderer,f=a.options,n=a.tickPositions,l=a.ticks,g=a.horiz,d=a.side,r=b.inverted&&!a.isZAxis?[1,0,3,2][d]:d,m,w,z=0,E,p=0,D=f.title,A=f.labels,k=0,B=b.axisOffset,b=b.clipOffset,q=[-1,1,1,-1][d],v=f.className,t=a.axisParent;m=a.hasData();a.showAxis=w=m||G(f.showEmpty,!0);a.staggerLines=a.horiz&&A.staggerLines;
a.axisGroup||(a.gridGroup=c.g("grid").attr({zIndex:f.gridZIndex||1}).addClass("highcharts-"+this.coll.toLowerCase()+"-grid "+(v||"")).add(t),a.axisGroup=c.g("axis").attr({zIndex:f.zIndex||2}).addClass("highcharts-"+this.coll.toLowerCase()+" "+(v||"")).add(t),a.labelGroup=c.g("axis-labels").attr({zIndex:A.zIndex||7}).addClass("highcharts-"+a.coll.toLowerCase()+"-labels "+(v||"")).add(t));m||a.isLinked?(n.forEach(function(b,c){a.generateTick(b,c)}),a.renderUnsquish(),a.reserveSpaceDefault=0===d||2===
d||{1:"left",3:"right"}[d]===a.labelAlign,G(A.reserveSpace,"center"===a.labelAlign?!0:null,a.reserveSpaceDefault)&&n.forEach(function(a){k=Math.max(l[a].getLabelSize(),k)}),a.staggerLines&&(k*=a.staggerLines),a.labelOffset=k*(a.opposite?-1:1)):J(l,function(a,b){a.destroy();delete l[b]});D&&D.text&&!1!==D.enabled&&(a.addTitle(w),w&&!1!==D.reserveSpace&&(a.titleOffset=z=a.axisTitle.getBBox()[g?"height":"width"],E=D.offset,p=u(E)?0:G(D.margin,g?5:10)));a.renderLine();a.offset=q*G(f.offset,B[d]?B[d]+
(f.margin||0):0);a.tickRotCorr=a.tickRotCorr||{x:0,y:0};c=0===d?-a.labelMetrics().h:2===d?a.tickRotCorr.y:0;p=Math.abs(k)+p;k&&(p=p-c+q*(g?G(A.y,a.tickRotCorr.y+8*q):A.x));a.axisTitleMargin=G(E,p);a.getMaxLabelDimensions&&(a.maxLabelDimensions=a.getMaxLabelDimensions(l,n));g=this.tickSize("tick");B[d]=Math.max(B[d],a.axisTitleMargin+z+q*a.offset,p,n&&n.length&&g?g[0]+q*a.offset:0);f=f.offset?0:2*Math.floor(a.axisLine.strokeWidth()/2);b[r]=Math.max(b[r],f);e(this,"afterGetOffset")},getLinePath:function(a){var b=
this.chart,c=this.opposite,h=this.offset,f=this.horiz,e=this.left+(c?this.width:0)+h,h=b.chartHeight-this.bottom-(c?this.height:0)+h;c&&(a*=-1);return b.renderer.crispLine(["M",f?this.left:e,f?h:this.top,"L",f?b.chartWidth-this.right:e,f?h:b.chartHeight-this.bottom],a)},renderLine:function(){this.axisLine||(this.axisLine=this.chart.renderer.path().addClass("highcharts-axis-line").add(this.axisGroup),this.chart.styledMode||this.axisLine.attr({stroke:this.options.lineColor,"stroke-width":this.options.lineWidth,
zIndex:7}))},getTitlePosition:function(){var a=this.horiz,b=this.left,c=this.top,f=this.len,n=this.options.title,l=a?b:c,g=this.opposite,d=this.offset,r=n.x||0,m=n.y||0,w=this.axisTitle,z=this.chart.renderer.fontMetrics(n.style&&n.style.fontSize,w),w=Math.max(w.getBBox(null,0).height-z.h-1,0),f={low:l+(a?0:f),middle:l+f/2,high:l+(a?f:0)}[n.align],b=(a?c+this.height:b)+(a?1:-1)*(g?-1:1)*this.axisTitleMargin+[-w,w,z.f,-w][this.side],a={x:a?f+r:b+(g?this.width:0)+d+r,y:a?b+m-(g?this.height:0)+d:f+m};
e(this,"afterGetTitlePosition",{titlePosition:a});return a},renderMinorTick:function(a){var b=this.chart.hasRendered&&f(this.oldMin),c=this.minorTicks;c[a]||(c[a]=new A(this,a,"minor"));b&&c[a].isNew&&c[a].render(null,!0);c[a].render(null,!1,1)},renderTick:function(a,b){var c=this.isLinked,h=this.ticks,e=this.chart.hasRendered&&f(this.oldMin);if(!c||a>=this.min&&a<=this.max)h[a]||(h[a]=new A(this,a)),e&&h[a].isNew&&h[a].render(b,!0,-1),h[a].render(b)},render:function(){var b=this,c=b.chart,n=b.options,
l=b.isLog,g=b.isLinked,d=b.tickPositions,r=b.axisTitle,m=b.ticks,w=b.minorTicks,E=b.alternateBands,p=n.stackLabels,D=n.alternateGridColor,k=b.tickmarkOffset,B=b.axisLine,G=b.showAxis,q=I(c.renderer.globalAnimation),v,t;b.labelEdge.length=0;b.overlap=!1;[m,w,E].forEach(function(a){J(a,function(a){a.isActive=!1})});if(b.hasData()||g)b.minorTickInterval&&!b.categories&&b.getMinorTickPositions().forEach(function(a){b.renderMinorTick(a)}),d.length&&(d.forEach(function(a,c){b.renderTick(a,c)}),k&&(0===
b.min||b.single)&&(m[-1]||(m[-1]=new A(b,-1,null,!0)),m[-1].render(-1))),D&&d.forEach(function(h,f){t=void 0!==d[f+1]?d[f+1]+k:b.max-k;0===f%2&&h<b.max&&t<=b.max+(c.polar?-k:k)&&(E[h]||(E[h]=new a.PlotLineOrBand(b)),v=h+k,E[h].options={from:l?b.lin2log(v):v,to:l?b.lin2log(t):t,color:D},E[h].render(),E[h].isActive=!0)}),b._addedPlotLB||((n.plotLines||[]).concat(n.plotBands||[]).forEach(function(a){b.addPlotBandOrLine(a)}),b._addedPlotLB=!0);[m,w,E].forEach(function(a){var b,h=[],f=q.duration;J(a,function(a,
b){a.isActive||(a.render(b,!1,0),a.isActive=!1,h.push(b))});z(function(){for(b=h.length;b--;)a[h[b]]&&!a[h[b]].isActive&&(a[h[b]].destroy(),delete a[h[b]])},a!==E&&c.hasRendered&&f?f:0)});B&&(B[B.isPlaced?"animate":"attr"]({d:this.getLinePath(B.strokeWidth())}),B.isPlaced=!0,B[G?"show":"hide"](!0));r&&G&&(n=b.getTitlePosition(),f(n.y)?(r[r.isNew?"attr":"animate"](n),r.isNew=!1):(r.attr("y",-9999),r.isNew=!0));p&&p.enabled&&b.renderStackTotals();b.isDirty=!1;e(this,"afterRender")},redraw:function(){this.visible&&
(this.render(),this.plotLinesAndBands.forEach(function(a){a.render()}));this.series.forEach(function(a){a.isDirty=!0})},keepProps:"extKey hcEvents names series userMax userMin".split(" "),destroy:function(a){var b=this,c=b.stacks,f=b.plotLinesAndBands,h;e(this,"destroy",{keepEvents:a});a||B(b);J(c,function(a,b){p(a);c[b]=null});[b.ticks,b.minorTicks,b.alternateBands].forEach(function(a){p(a)});if(f)for(a=f.length;a--;)f[a].destroy();"stackTotalGroup axisLine axisTitle axisGroup gridGroup labelGroup cross scrollbar".split(" ").forEach(function(a){b[a]&&
(b[a]=b[a].destroy())});for(h in b.plotLinesAndBandsGroups)b.plotLinesAndBandsGroups[h]=b.plotLinesAndBandsGroups[h].destroy();J(b,function(a,c){-1===b.keepProps.indexOf(c)&&delete b[c]})},drawCrosshair:function(a,b){var c,f=this.crosshair,h=G(f.snap,!0),n,l=this.cross;e(this,"drawCrosshair",{e:a,point:b});a||(a=this.cross&&this.cross.e);if(this.crosshair&&!1!==(u(b)||!h)){h?u(b)&&(n=G(b.crosshairPos,this.isXAxis?b.plotX:this.len-b.plotY)):n=a&&(this.horiz?a.chartX-this.pos:this.len-a.chartY+this.pos);
u(n)&&(c=this.getPlotLinePath(b&&(this.isXAxis?b.x:G(b.stackY,b.y)),null,null,null,n)||null);if(!u(c)){this.hideCrosshair();return}h=this.categories&&!this.isRadial;l||(this.cross=l=this.chart.renderer.path().addClass("highcharts-crosshair highcharts-crosshair-"+(h?"category ":"thin ")+f.className).attr({zIndex:G(f.zIndex,2)}).add(),this.chart.styledMode||(l.attr({stroke:f.color||(h?d("#ccd6eb").setOpacity(.25).get():"#cccccc"),"stroke-width":G(f.width,1)}).css({"pointer-events":"none"}),f.dashStyle&&
l.attr({dashstyle:f.dashStyle})));l.show().attr({d:c});h&&!f.width&&l.attr({"stroke-width":this.transA});this.cross.e=a}else this.hideCrosshair();e(this,"afterDrawCrosshair",{e:a,point:b})},hideCrosshair:function(){this.cross&&this.cross.hide();e(this,"afterHideCrosshair")}});return a.Axis=D});K(F,"parts/DateTimeAxis.js",[F["parts/Globals.js"]],function(a){var C=a.Axis,I=a.getMagnitude,H=a.normalizeTickInterval,k=a.timeUnits;C.prototype.getTimeTicks=function(){return this.chart.time.getTimeTicks.apply(this.chart.time,
arguments)};C.prototype.normalizeTimeTickInterval=function(a,q){var d=q||[["millisecond",[1,2,5,10,20,25,50,100,200,500]],["second",[1,2,5,10,15,30]],["minute",[1,2,5,10,15,30]],["hour",[1,2,3,4,6,8,12]],["day",[1,2]],["week",[1,2]],["month",[1,2,3,4,6]],["year",null]];q=d[d.length-1];var u=k[q[0]],v=q[1],p;for(p=0;p<d.length&&!(q=d[p],u=k[q[0]],v=q[1],d[p+1]&&a<=(u*v[v.length-1]+k[d[p+1][0]])/2);p++);u===k.year&&a<5*u&&(v=[1,2,5]);a=H(a/u,v,"year"===q[0]?Math.max(I(a/u),1):1);return{unitRange:u,
count:a,unitName:q[0]}}});K(F,"parts/LogarithmicAxis.js",[F["parts/Globals.js"]],function(a){var C=a.Axis,I=a.getMagnitude,H=a.normalizeTickInterval,k=a.pick;C.prototype.getLogTickPositions=function(a,q,t,u){var d=this.options,p=this.len,g=[];u||(this._minorAutoInterval=null);if(.5<=a)a=Math.round(a),g=this.getLinearTickPositions(a,q,t);else if(.08<=a)for(var p=Math.floor(q),e,m,l,b,f,d=.3<a?[1,2,4]:.15<a?[1,2,4,6,8]:[1,2,3,4,5,6,7,8,9];p<t+1&&!f;p++)for(m=d.length,e=0;e<m&&!f;e++)l=this.log2lin(this.lin2log(p)*
d[e]),l>q&&(!u||b<=t)&&void 0!==b&&g.push(b),b>t&&(f=!0),b=l;else q=this.lin2log(q),t=this.lin2log(t),a=u?this.getMinorTickInterval():d.tickInterval,a=k("auto"===a?null:a,this._minorAutoInterval,d.tickPixelInterval/(u?5:1)*(t-q)/((u?p/this.tickPositions.length:p)||1)),a=H(a,null,I(a)),g=this.getLinearTickPositions(a,q,t).map(this.log2lin),u||(this._minorAutoInterval=a/5);u||(this.tickInterval=a);return g};C.prototype.log2lin=function(a){return Math.log(a)/Math.LN10};C.prototype.lin2log=function(a){return Math.pow(10,
a)}});K(F,"parts/PlotLineOrBand.js",[F["parts/Globals.js"],F["parts/Axis.js"]],function(a,C){var I=a.arrayMax,H=a.arrayMin,k=a.defined,d=a.destroyObjectProperties,q=a.erase,t=a.merge,u=a.pick;a.PlotLineOrBand=function(a,d){this.axis=a;d&&(this.options=d,this.id=d.id)};a.PlotLineOrBand.prototype={render:function(){a.fireEvent(this,"render");var d=this,p=d.axis,g=p.horiz,e=d.options,m=e.label,l=d.label,b=e.to,f=e.from,c=e.value,w=k(f)&&k(b),r=k(c),q=d.svgElem,G=!q,B=[],n=e.color,E=u(e.zIndex,0),z=e.events,
B={"class":"highcharts-plot-"+(w?"band ":"line ")+(e.className||"")},A={},D=p.chart.renderer,h=w?"bands":"lines";p.isLog&&(f=p.log2lin(f),b=p.log2lin(b),c=p.log2lin(c));p.chart.styledMode||(r?(B.stroke=n,B["stroke-width"]=e.width,e.dashStyle&&(B.dashstyle=e.dashStyle)):w&&(n&&(B.fill=n),e.borderWidth&&(B.stroke=e.borderColor,B["stroke-width"]=e.borderWidth)));A.zIndex=E;h+="-"+E;(n=p.plotLinesAndBandsGroups[h])||(p.plotLinesAndBandsGroups[h]=n=D.g("plot-"+h).attr(A).add());G&&(d.svgElem=q=D.path().attr(B).add(n));
if(r)B=p.getPlotLinePath(c,q.strokeWidth());else if(w)B=p.getPlotBandPath(f,b,e);else return;(G||!q.d)&&B&&B.length?(q.attr({d:B}),z&&a.objectEach(z,function(a,b){q.on(b,function(a){z[b].apply(d,[a])})})):q&&(B?(q.show(!0),q.animate({d:B})):q.d&&(q.hide(),l&&(d.label=l=l.destroy())));m&&k(m.text)&&B&&B.length&&0<p.width&&0<p.height&&!B.isFlat?(m=t({align:g&&w&&"center",x:g?!w&&4:10,verticalAlign:!g&&w&&"middle",y:g?w?16:10:w?6:-4,rotation:g&&!w&&90},m),this.renderLabel(m,B,w,E)):l&&l.hide();return d},
renderLabel:function(a,d,g,e){var m=this.label,l=this.axis.chart.renderer;m||(m={align:a.textAlign||a.align,rotation:a.rotation,"class":"highcharts-plot-"+(g?"band":"line")+"-label "+(a.className||"")},m.zIndex=e,this.label=m=l.text(a.text,0,0,a.useHTML).attr(m).add(),this.axis.chart.styledMode||m.css(a.style));e=d.xBounds||[d[1],d[4],g?d[6]:d[1]];d=d.yBounds||[d[2],d[5],g?d[7]:d[2]];g=H(e);l=H(d);m.align(a,!1,{x:g,y:l,width:I(e)-g,height:I(d)-l});m.show(!0)},destroy:function(){q(this.axis.plotLinesAndBands,
this);delete this.axis;d(this)}};a.extend(C.prototype,{getPlotBandPath:function(a,d){var g=this.getPlotLinePath(d,null,null,!0),e=this.getPlotLinePath(a,null,null,!0),m=[],l=this.horiz,b=1,f;a=a<this.min&&d<this.min||a>this.max&&d>this.max;if(e&&g)for(a&&(f=e.toString()===g.toString(),b=0),a=0;a<e.length;a+=6)l&&g[a+1]===e[a+1]?(g[a+1]+=b,g[a+4]+=b):l||g[a+2]!==e[a+2]||(g[a+2]+=b,g[a+5]+=b),m.push("M",e[a+1],e[a+2],"L",e[a+4],e[a+5],g[a+4],g[a+5],g[a+1],g[a+2],"z"),m.isFlat=f;return m},addPlotBand:function(a){return this.addPlotBandOrLine(a,
"plotBands")},addPlotLine:function(a){return this.addPlotBandOrLine(a,"plotLines")},addPlotBandOrLine:function(d,p){var g=(new a.PlotLineOrBand(this,d)).render(),e=this.userOptions;g&&(p&&(e[p]=e[p]||[],e[p].push(d)),this.plotLinesAndBands.push(g));return g},removePlotBandOrLine:function(a){for(var d=this.plotLinesAndBands,g=this.options,e=this.userOptions,m=d.length;m--;)d[m].id===a&&d[m].destroy();[g.plotLines||[],e.plotLines||[],g.plotBands||[],e.plotBands||[]].forEach(function(e){for(m=e.length;m--;)e[m].id===
a&&q(e,e[m])})},removePlotBand:function(a){this.removePlotBandOrLine(a)},removePlotLine:function(a){this.removePlotBandOrLine(a)}})});K(F,"parts/Tooltip.js",[F["parts/Globals.js"]],function(a){var C=a.doc,I=a.extend,H=a.format,k=a.isNumber,d=a.merge,q=a.pick,t=a.splat,u=a.syncTimeout,v=a.timeUnits;a.Tooltip=function(){this.init.apply(this,arguments)};a.Tooltip.prototype={init:function(a,d){this.chart=a;this.options=d;this.crosshairs=[];this.now={x:0,y:0};this.isHidden=!0;this.split=d.split&&!a.inverted;
this.shared=d.shared||this.split;this.outside=d.outside&&!this.split},cleanSplit:function(a){this.chart.series.forEach(function(d){var e=d&&d.tt;e&&(!e.isActive||a?d.tt=e.destroy():e.isActive=!1)})},applyFilter:function(){var a=this.chart;a.renderer.definition({tagName:"filter",id:"drop-shadow-"+a.index,opacity:.5,children:[{tagName:"feGaussianBlur","in":"SourceAlpha",stdDeviation:1},{tagName:"feOffset",dx:1,dy:1},{tagName:"feComponentTransfer",children:[{tagName:"feFuncA",type:"linear",slope:.3}]},
{tagName:"feMerge",children:[{tagName:"feMergeNode"},{tagName:"feMergeNode","in":"SourceGraphic"}]}]});a.renderer.definition({tagName:"style",textContent:".highcharts-tooltip-"+a.index+"{filter:url(#drop-shadow-"+a.index+")}"})},getLabel:function(){var d=this,g=this.chart.renderer,e=this.chart.styledMode,m=this.options,l,b;this.label||(this.outside&&(this.container=l=a.doc.createElement("div"),l.className="highcharts-tooltip-container",a.css(l,{position:"absolute",top:"1px",pointerEvents:m.style&&
m.style.pointerEvents}),a.doc.body.appendChild(l),this.renderer=g=new a.Renderer(l,0,0)),this.split?this.label=g.g("tooltip"):(this.label=g.label("",0,0,m.shape||"callout",null,null,m.useHTML,null,"tooltip").attr({padding:m.padding,r:m.borderRadius}),e||this.label.attr({fill:m.backgroundColor,"stroke-width":m.borderWidth}).css(m.style).shadow(m.shadow)),e&&(this.applyFilter(),this.label.addClass("highcharts-tooltip-"+this.chart.index)),this.outside&&(b={x:this.label.xSetter,y:this.label.ySetter},
this.label.xSetter=function(a,c){b[c].call(this.label,d.distance);l.style.left=a+"px"},this.label.ySetter=function(a,c){b[c].call(this.label,d.distance);l.style.top=a+"px"}),this.label.attr({zIndex:8}).add());return this.label},update:function(a){this.destroy();d(!0,this.chart.options.tooltip.userOptions,a);this.init(this.chart,d(!0,this.options,a))},destroy:function(){this.label&&(this.label=this.label.destroy());this.split&&this.tt&&(this.cleanSplit(this.chart,!0),this.tt=this.tt.destroy());this.renderer&&
(this.renderer=this.renderer.destroy(),a.discardElement(this.container));a.clearTimeout(this.hideTimer);a.clearTimeout(this.tooltipTimeout)},move:function(d,g,e,m){var l=this,b=l.now,f=!1!==l.options.animation&&!l.isHidden&&(1<Math.abs(d-b.x)||1<Math.abs(g-b.y)),c=l.followPointer||1<l.len;I(b,{x:f?(2*b.x+d)/3:d,y:f?(b.y+g)/2:g,anchorX:c?void 0:f?(2*b.anchorX+e)/3:e,anchorY:c?void 0:f?(b.anchorY+m)/2:m});l.getLabel().attr(b);f&&(a.clearTimeout(this.tooltipTimeout),this.tooltipTimeout=setTimeout(function(){l&&
l.move(d,g,e,m)},32))},hide:function(d){var g=this;a.clearTimeout(this.hideTimer);d=q(d,this.options.hideDelay,500);this.isHidden||(this.hideTimer=u(function(){g.getLabel()[d?"fadeOut":"hide"]();g.isHidden=!0},d))},getAnchor:function(a,d){var e=this.chart,g=e.pointer,l=e.inverted,b=e.plotTop,f=e.plotLeft,c=0,w=0,r,k;a=t(a);this.followPointer&&d?(void 0===d.chartX&&(d=g.normalize(d)),a=[d.chartX-e.plotLeft,d.chartY-b]):a[0].tooltipPos?a=a[0].tooltipPos:(a.forEach(function(a){r=a.series.yAxis;k=a.series.xAxis;
c+=a.plotX+(!l&&k?k.left-f:0);w+=(a.plotLow?(a.plotLow+a.plotHigh)/2:a.plotY)+(!l&&r?r.top-b:0)}),c/=a.length,w/=a.length,a=[l?e.plotWidth-w:c,this.shared&&!l&&1<a.length&&d?d.chartY-b:l?e.plotHeight-c:w]);return a.map(Math.round)},getPosition:function(a,d,e){var g=this.chart,l=this.distance,b={},f=g.inverted&&e.h||0,c,w=this.outside,r=w?C.documentElement.clientWidth-2*l:g.chartWidth,k=w?Math.max(C.body.scrollHeight,C.documentElement.scrollHeight,C.body.offsetHeight,C.documentElement.offsetHeight,
C.documentElement.clientHeight):g.chartHeight,p=g.pointer.chartPosition,B=["y",k,d,(w?p.top-l:0)+e.plotY+g.plotTop,w?0:g.plotTop,w?k:g.plotTop+g.plotHeight],n=["x",r,a,(w?p.left-l:0)+e.plotX+g.plotLeft,w?0:g.plotLeft,w?r:g.plotLeft+g.plotWidth],E=!this.followPointer&&q(e.ttBelow,!g.inverted===!!e.negative),z=function(a,c,h,e,n,d){var g=h<e-l,r=e+l+h<c,m=e-l-h;e+=l;if(E&&r)b[a]=e;else if(!E&&g)b[a]=m;else if(g)b[a]=Math.min(d-h,0>m-f?m:m-f);else if(r)b[a]=Math.max(n,e+f+h>c?e:e+f);else return!1},A=
function(a,c,f,h){var e;h<l||h>c-l?e=!1:b[a]=h<f/2?1:h>c-f/2?c-f-2:h-f/2;return e},D=function(a){var b=B;B=n;n=b;c=a},h=function(){!1!==z.apply(0,B)?!1!==A.apply(0,n)||c||(D(!0),h()):c?b.x=b.y=0:(D(!0),h())};(g.inverted||1<this.len)&&D();h();return b},defaultFormatter:function(a){var d=this.points||t(this),e;e=[a.tooltipFooterHeaderFormatter(d[0])];e=e.concat(a.bodyFormatter(d));e.push(a.tooltipFooterHeaderFormatter(d[0],!0));return e},refresh:function(d,g){var e=this.chart,m=this.options,l,b=d,f,
c={},w,r=[];w=m.formatter||this.defaultFormatter;var c=this.shared,k=e.styledMode,p=[];m.enabled&&(a.clearTimeout(this.hideTimer),this.followPointer=t(b)[0].series.tooltipOptions.followPointer,f=this.getAnchor(b,g),g=f[0],l=f[1],!c||b.series&&b.series.noSharedTooltip?c=b.getLabelConfig():(p=e.pointer.getActiveSeries(b),e.series.forEach(function(a){(a.options.inactiveOtherPoints||-1===p.indexOf(a))&&a.setState("inactive",!0)}),b.forEach(function(a){a.setState("hover");r.push(a.getLabelConfig())}),
c={x:b[0].category,y:b[0].y},c.points=r,b=b[0]),this.len=r.length,w=w.call(c,this),c=b.series,this.distance=q(c.tooltipOptions.distance,16),!1===w?this.hide():(e=this.getLabel(),this.isHidden&&e.attr({opacity:1}).show(),this.split?this.renderSplit(w,t(d)):(m.style.width&&!k||e.css({width:this.chart.spacingBox.width}),e.attr({text:w&&w.join?w.join(""):w}),e.removeClass(/highcharts-color-[\d]+/g).addClass("highcharts-color-"+q(b.colorIndex,c.colorIndex)),k||e.attr({stroke:m.borderColor||b.color||c.color||
"#666666"}),this.updatePosition({plotX:g,plotY:l,negative:b.negative,ttBelow:b.ttBelow,h:f[2]||0})),this.isHidden=!1),a.fireEvent(this,"refresh"))},renderSplit:function(d,g){var e=this,m=[],l=this.chart,b=l.renderer,f=!0,c=this.options,w=0,r,k=this.getLabel(),p=l.plotTop;a.isString(d)&&(d=[!1,d]);d.slice(0,g.length+1).forEach(function(a,n){if(!1!==a&&""!==a){n=g[n-1]||{isHeader:!0,plotX:g[0].plotX,plotY:l.plotHeight};var d=n.series||e,z=d.tt,A=n.series||{},D="highcharts-color-"+q(n.colorIndex,A.colorIndex,
"none");z||(z={padding:c.padding,r:c.borderRadius},l.styledMode||(z.fill=c.backgroundColor,z.stroke=c.borderColor||n.color||A.color||"#333333",z["stroke-width"]=c.borderWidth),d.tt=z=b.label(null,null,null,(n.isHeader?c.headerShape:c.shape)||"callout",null,null,c.useHTML).addClass("highcharts-tooltip-box "+D).attr(z).add(k));z.isActive=!0;z.attr({text:a});l.styledMode||z.css(c.style).shadow(c.shadow);a=z.getBBox();A=a.width+z.strokeWidth();n.isHeader?(w=a.height,l.xAxis[0].opposite&&(r=!0,p-=w),A=
Math.max(0,Math.min(n.plotX+l.plotLeft-A/2,l.chartWidth+(l.scrollablePixels?l.scrollablePixels-l.marginRight:0)-A))):A=n.plotX+l.plotLeft-q(c.distance,16)-A;0>A&&(f=!1);a=(n.series&&n.series.yAxis&&n.series.yAxis.pos)+(n.plotY||0);a-=p;n.isHeader&&(a=r?-w:l.plotHeight+w);m.push({target:a,rank:n.isHeader?1:0,size:d.tt.getBBox().height+1,point:n,x:A,tt:z})}});this.cleanSplit();c.positioner&&m.forEach(function(a){var b=c.positioner.call(e,a.tt.getBBox().width,a.size,a.point);a.x=b.x;a.align=0;a.target=
b.y;a.rank=q(b.rank,a.rank)});a.distribute(m,l.plotHeight+w);m.forEach(function(a){var b=a.point,d=b.series;a.tt.attr({visibility:void 0===a.pos?"hidden":"inherit",x:f||b.isHeader||c.positioner?a.x:b.plotX+l.plotLeft+e.distance,y:a.pos+p,anchorX:b.isHeader?b.plotX+l.plotLeft:b.plotX+d.xAxis.pos,anchorY:b.isHeader?l.plotTop+l.plotHeight/2:b.plotY+d.yAxis.pos})})},updatePosition:function(a){var d=this.chart,e=this.getLabel(),m=(this.options.positioner||this.getPosition).call(this,e.width,e.height,a),
l=a.plotX+d.plotLeft;a=a.plotY+d.plotTop;var b;this.outside&&(b=(this.options.borderWidth||0)+2*this.distance,this.renderer.setSize(e.width+b,e.height+b,!1),l+=d.pointer.chartPosition.left-m.x,a+=d.pointer.chartPosition.top-m.y);this.move(Math.round(m.x),Math.round(m.y||0),l,a)},getDateFormat:function(a,d,e,m){var l=this.chart.time,b=l.dateFormat("%m-%d %H:%M:%S.%L",d),f,c,g={millisecond:15,second:12,minute:9,hour:6,day:3},r="millisecond";for(c in v){if(a===v.week&&+l.dateFormat("%w",d)===e&&"00:00:00.000"===
b.substr(6)){c="week";break}if(v[c]>a){c=r;break}if(g[c]&&b.substr(g[c])!=="01-01 00:00:00.000".substr(g[c]))break;"week"!==c&&(r=c)}c&&(f=l.resolveDTLFormat(m[c]).main);return f},getXDateFormat:function(a,d,e){d=d.dateTimeLabelFormats;var g=e&&e.closestPointRange;return(g?this.getDateFormat(g,a.x,e.options.startOfWeek,d):d.day)||d.year},tooltipFooterHeaderFormatter:function(d,g){var e=g?"footer":"header",m=d.series,l=m.tooltipOptions,b=l.xDateFormat,f=m.xAxis,c=f&&"datetime"===f.options.type&&k(d.key),
w=l[e+"Format"];g={isFooter:g,labelConfig:d};a.fireEvent(this,"headerFormatter",g,function(a){c&&!b&&(b=this.getXDateFormat(d,l,f));c&&b&&(d.point&&d.point.tooltipDateKeys||["key"]).forEach(function(a){w=w.replace("{point."+a+"}","{point."+a+":"+b+"}")});m.chart.styledMode&&(w=this.styledModeFormat(w));a.text=H(w,{point:d,series:m},this.chart.time)});return g.text},bodyFormatter:function(a){return a.map(function(a){var e=a.series.tooltipOptions;return(e[(a.point.formatPrefix||"point")+"Formatter"]||
a.point.tooltipFormatter).call(a.point,e[(a.point.formatPrefix||"point")+"Format"]||"")})},styledModeFormat:function(a){return a.replace('style\x3d"font-size: 10px"','class\x3d"highcharts-header"').replace(/style="color:{(point|series)\.color}"/g,'class\x3d"highcharts-color-{$1.colorIndex}"')}}});K(F,"parts/Pointer.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.attr,H=a.charts,k=a.color,d=a.css,q=a.defined,t=a.extend,u=a.find,v=a.fireEvent,p=a.isNumber,g=a.isObject,e=a.offset,m=a.pick,
l=a.splat,b=a.Tooltip;a.Pointer=function(a,b){this.init(a,b)};a.Pointer.prototype={init:function(a,c){this.options=c;this.chart=a;this.runChartClick=c.chart.events&&!!c.chart.events.click;this.pinchDown=[];this.lastValidTouch={};b&&(a.tooltip=new b(a,c.tooltip),this.followTouchMove=m(c.tooltip.followTouchMove,!0));this.setDOMEvents()},zoomOption:function(a){var b=this.chart,f=b.options.chart,e=f.zoomType||"",b=b.inverted;/touch/.test(a.type)&&(e=m(f.pinchType,e));this.zoomX=a=/x/.test(e);this.zoomY=
e=/y/.test(e);this.zoomHor=a&&!b||e&&b;this.zoomVert=e&&!b||a&&b;this.hasZoom=a||e},normalize:function(a,b){var c;c=a.touches?a.touches.length?a.touches.item(0):a.changedTouches[0]:a;b||(this.chartPosition=b=e(this.chart.container));return t(a,{chartX:Math.round(c.pageX-b.left),chartY:Math.round(c.pageY-b.top)})},getCoordinates:function(a){var b={xAxis:[],yAxis:[]};this.chart.axes.forEach(function(c){b[c.isXAxis?"xAxis":"yAxis"].push({axis:c,value:c.toValue(a[c.horiz?"chartX":"chartY"])})});return b},
findNearestKDPoint:function(a,b,e){var c;a.forEach(function(a){var f=!(a.noSharedTooltip&&b)&&0>a.options.findNearestPointBy.indexOf("y");a=a.searchPoint(e,f);if((f=g(a,!0))&&!(f=!g(c,!0)))var f=c.distX-a.distX,d=c.dist-a.dist,n=(a.series.group&&a.series.group.zIndex)-(c.series.group&&c.series.group.zIndex),f=0<(0!==f&&b?f:0!==d?d:0!==n?n:c.series.index>a.series.index?-1:1);f&&(c=a)});return c},getPointFromEvent:function(a){a=a.target;for(var b;a&&!b;)b=a.point,a=a.parentNode;return b},getChartCoordinatesFromPoint:function(a,
b){var c=a.series,f=c.xAxis,c=c.yAxis,e=m(a.clientX,a.plotX),d=a.shapeArgs;if(f&&c)return b?{chartX:f.len+f.pos-e,chartY:c.len+c.pos-a.plotY}:{chartX:e+f.pos,chartY:a.plotY+c.pos};if(d&&d.x&&d.y)return{chartX:d.x,chartY:d.y}},getHoverData:function(a,b,e,d,l,k){var c,f=[];d=!(!d||!a);var r=b&&!b.stickyTracking?[b]:e.filter(function(a){return a.visible&&!(!l&&a.directTouch)&&m(a.options.enableMouseTracking,!0)&&a.stickyTracking});b=(c=d?a:this.findNearestKDPoint(r,l,k))&&c.series;c&&(l&&!b.noSharedTooltip?
(r=e.filter(function(a){return a.visible&&!(!l&&a.directTouch)&&m(a.options.enableMouseTracking,!0)&&!a.noSharedTooltip}),r.forEach(function(a){var b=u(a.points,function(a){return a.x===c.x&&!a.isNull});g(b)&&(a.chart.isBoosting&&(b=a.getPoint(b)),f.push(b))})):f.push(c));return{hoverPoint:c,hoverSeries:b,hoverPoints:f}},runPointActions:function(b,c){var f=this.chart,e=f.tooltip&&f.tooltip.options.enabled?f.tooltip:void 0,d=e?e.shared:!1,l=c||f.hoverPoint,g=l&&l.series||f.hoverSeries,g=this.getHoverData(l,
g,f.series,"touchmove"!==b.type&&(!!c||g&&g.directTouch&&this.isDirectTouch),d,b),n=[],E,l=g.hoverPoint;E=g.hoverPoints;c=(g=g.hoverSeries)&&g.tooltipOptions.followPointer;d=d&&g&&!g.noSharedTooltip;if(l&&(l!==f.hoverPoint||e&&e.isHidden)){(f.hoverPoints||[]).forEach(function(a){-1===E.indexOf(a)&&a.setState()});if(f.hoverSeries!==g)g.onMouseOver();n=this.getActiveSeries(E);f.series.forEach(function(a){(a.options.inactiveOtherPoints||-1===n.indexOf(a))&&a.setState("inactive",!0)});(E||[]).forEach(function(a){a.setState("hover")});
f.hoverPoint&&f.hoverPoint.firePointEvent("mouseOut");if(!l.series)return;l.firePointEvent("mouseOver");f.hoverPoints=E;f.hoverPoint=l;e&&e.refresh(d?E:l,b)}else c&&e&&!e.isHidden&&(l=e.getAnchor([{}],b),e.updatePosition({plotX:l[0],plotY:l[1]}));this.unDocMouseMove||(this.unDocMouseMove=C(f.container.ownerDocument,"mousemove",function(b){var c=H[a.hoverChartIndex];if(c)c.pointer.onDocumentMouseMove(b)}));f.axes.forEach(function(c){var f=m(c.crosshair.snap,!0),e=f?a.find(E,function(a){return a.series[c.coll]===
c}):void 0;e||!f?c.drawCrosshair(b,e):c.hideCrosshair()})},getActiveSeries:function(a){var b=[],f;(a||[]).forEach(function(a){f=a.series;b.push(f);f.linkedParent&&b.push(f.linkedParent);f.linkedSeries&&(b=b.concat(f.linkedSeries));f.navigatorSeries&&b.push(f.navigatorSeries)});return b},reset:function(a,b){var c=this.chart,f=c.hoverSeries,e=c.hoverPoint,d=c.hoverPoints,g=c.tooltip,n=g&&g.shared?d:e;a&&n&&l(n).forEach(function(b){b.series.isCartesian&&void 0===b.plotX&&(a=!1)});if(a)g&&n&&l(n).length&&
(g.refresh(n),g.shared&&d?d.forEach(function(a){a.setState(a.state,!0);a.series.isCartesian&&(a.series.xAxis.crosshair&&a.series.xAxis.drawCrosshair(null,a),a.series.yAxis.crosshair&&a.series.yAxis.drawCrosshair(null,a))}):e&&(e.setState(e.state,!0),c.axes.forEach(function(a){a.crosshair&&a.drawCrosshair(null,e)})));else{if(e)e.onMouseOut();d&&d.forEach(function(a){a.setState()});if(f)f.onMouseOut();g&&g.hide(b);this.unDocMouseMove&&(this.unDocMouseMove=this.unDocMouseMove());c.axes.forEach(function(a){a.hideCrosshair()});
this.hoverX=c.hoverPoints=c.hoverPoint=null}},scaleGroups:function(a,b){var c=this.chart,f;c.series.forEach(function(e){f=a||e.getPlotBox();e.xAxis&&e.xAxis.zoomEnabled&&e.group&&(e.group.attr(f),e.markerGroup&&(e.markerGroup.attr(f),e.markerGroup.clip(b?c.clipRect:null)),e.dataLabelsGroup&&e.dataLabelsGroup.attr(f))});c.clipRect.attr(b||c.clipBox)},dragStart:function(a){var b=this.chart;b.mouseIsDown=a.type;b.cancelClick=!1;b.mouseDownX=this.mouseDownX=a.chartX;b.mouseDownY=this.mouseDownY=a.chartY},
drag:function(a){var b=this.chart,f=b.options.chart,e=a.chartX,d=a.chartY,l=this.zoomHor,g=this.zoomVert,n=b.plotLeft,m=b.plotTop,z=b.plotWidth,A=b.plotHeight,D,h=this.selectionMarker,p=this.mouseDownX,q=this.mouseDownY,t=f.panKey&&a[f.panKey+"Key"];h&&h.touch||(e<n?e=n:e>n+z&&(e=n+z),d<m?d=m:d>m+A&&(d=m+A),this.hasDragged=Math.sqrt(Math.pow(p-e,2)+Math.pow(q-d,2)),10<this.hasDragged&&(D=b.isInsidePlot(p-n,q-m),b.hasCartesianSeries&&(this.zoomX||this.zoomY)&&D&&!t&&!h&&(this.selectionMarker=h=b.renderer.rect(n,
m,l?1:z,g?1:A,0).attr({"class":"highcharts-selection-marker",zIndex:7}).add(),b.styledMode||h.attr({fill:f.selectionMarkerFill||k("#335cad").setOpacity(.25).get()})),h&&l&&(e-=p,h.attr({width:Math.abs(e),x:(0<e?0:e)+p})),h&&g&&(e=d-q,h.attr({height:Math.abs(e),y:(0<e?0:e)+q})),D&&!h&&f.panning&&b.pan(a,f.panning)))},drop:function(a){var b=this,f=this.chart,e=this.hasPinched;if(this.selectionMarker){var l={originalEvent:a,xAxis:[],yAxis:[]},g=this.selectionMarker,m=g.attr?g.attr("x"):g.x,n=g.attr?
g.attr("y"):g.y,E=g.attr?g.attr("width"):g.width,z=g.attr?g.attr("height"):g.height,k;if(this.hasDragged||e)f.axes.forEach(function(c){if(c.zoomEnabled&&q(c.min)&&(e||b[{xAxis:"zoomX",yAxis:"zoomY"}[c.coll]])){var f=c.horiz,d="touchend"===a.type?c.minPixelPadding:0,g=c.toValue((f?m:n)+d),f=c.toValue((f?m+E:n+z)-d);l[c.coll].push({axis:c,min:Math.min(g,f),max:Math.max(g,f)});k=!0}}),k&&v(f,"selection",l,function(a){f.zoom(t(a,e?{animation:!1}:null))});p(f.index)&&(this.selectionMarker=this.selectionMarker.destroy());
e&&this.scaleGroups()}f&&p(f.index)&&(d(f.container,{cursor:f._cursor}),f.cancelClick=10<this.hasDragged,f.mouseIsDown=this.hasDragged=this.hasPinched=!1,this.pinchDown=[])},onContainerMouseDown:function(a){a=this.normalize(a);2!==a.button&&(this.zoomOption(a),a.preventDefault&&a.preventDefault(),this.dragStart(a))},onDocumentMouseUp:function(b){H[a.hoverChartIndex]&&H[a.hoverChartIndex].pointer.drop(b)},onDocumentMouseMove:function(a){var b=this.chart,f=this.chartPosition;a=this.normalize(a,f);!f||
this.inClass(a.target,"highcharts-tracker")||b.isInsidePlot(a.chartX-b.plotLeft,a.chartY-b.plotTop)||this.reset()},onContainerMouseLeave:function(b){var c=H[a.hoverChartIndex];c&&(b.relatedTarget||b.toElement)&&(c.pointer.reset(),c.pointer.chartPosition=null)},onContainerMouseMove:function(b){var c=this.chart;q(a.hoverChartIndex)&&H[a.hoverChartIndex]&&H[a.hoverChartIndex].mouseIsDown||(a.hoverChartIndex=c.index);b=this.normalize(b);b.preventDefault||(b.returnValue=!1);"mousedown"===c.mouseIsDown&&
this.drag(b);!this.inClass(b.target,"highcharts-tracker")&&!c.isInsidePlot(b.chartX-c.plotLeft,b.chartY-c.plotTop)||c.openMenu||this.runPointActions(b)},inClass:function(a,b){for(var c;a;){if(c=I(a,"class")){if(-1!==c.indexOf(b))return!0;if(-1!==c.indexOf("highcharts-container"))return!1}a=a.parentNode}},onTrackerMouseOut:function(a){var b=this.chart.hoverSeries;a=a.relatedTarget||a.toElement;this.isDirectTouch=!1;if(!(!b||!a||b.stickyTracking||this.inClass(a,"highcharts-tooltip")||this.inClass(a,
"highcharts-series-"+b.index)&&this.inClass(a,"highcharts-tracker")))b.onMouseOut()},onContainerClick:function(a){var b=this.chart,f=b.hoverPoint,e=b.plotLeft,d=b.plotTop;a=this.normalize(a);b.cancelClick||(f&&this.inClass(a.target,"highcharts-tracker")?(v(f.series,"click",t(a,{point:f})),b.hoverPoint&&f.firePointEvent("click",a)):(t(a,this.getCoordinates(a)),b.isInsidePlot(a.chartX-e,a.chartY-d)&&v(b,"click",a)))},setDOMEvents:function(){var b=this,c=b.chart.container,e=c.ownerDocument;c.onmousedown=
function(a){b.onContainerMouseDown(a)};c.onmousemove=function(a){b.onContainerMouseMove(a)};c.onclick=function(a){b.onContainerClick(a)};this.unbindContainerMouseLeave=C(c,"mouseleave",b.onContainerMouseLeave);a.unbindDocumentMouseUp||(a.unbindDocumentMouseUp=C(e,"mouseup",b.onDocumentMouseUp));a.hasTouch&&(c.ontouchstart=function(a){b.onContainerTouchStart(a)},c.ontouchmove=function(a){b.onContainerTouchMove(a)},a.unbindDocumentTouchEnd||(a.unbindDocumentTouchEnd=C(e,"touchend",b.onDocumentTouchEnd)))},
destroy:function(){var b=this;b.unDocMouseMove&&b.unDocMouseMove();this.unbindContainerMouseLeave();a.chartCount||(a.unbindDocumentMouseUp&&(a.unbindDocumentMouseUp=a.unbindDocumentMouseUp()),a.unbindDocumentTouchEnd&&(a.unbindDocumentTouchEnd=a.unbindDocumentTouchEnd()));clearInterval(b.tooltipTimeout);a.objectEach(b,function(a,f){b[f]=null})}}});K(F,"parts/TouchPointer.js",[F["parts/Globals.js"]],function(a){var C=a.charts,I=a.extend,H=a.noop,k=a.pick;I(a.Pointer.prototype,{pinchTranslate:function(a,
k,t,u,v,p){this.zoomHor&&this.pinchTranslateDirection(!0,a,k,t,u,v,p);this.zoomVert&&this.pinchTranslateDirection(!1,a,k,t,u,v,p)},pinchTranslateDirection:function(a,k,t,u,v,p,g,e){var d=this.chart,l=a?"x":"y",b=a?"X":"Y",f="chart"+b,c=a?"width":"height",w=d["plot"+(a?"Left":"Top")],r,q,G=e||1,B=d.inverted,n=d.bounds[a?"h":"v"],E=1===k.length,z=k[0][f],A=t[0][f],D=!E&&k[1][f],h=!E&&t[1][f],y;t=function(){!E&&20<Math.abs(z-D)&&(G=e||Math.abs(A-h)/Math.abs(z-D));q=(w-A)/G+z;r=d["plot"+(a?"Width":"Height")]/
G};t();k=q;k<n.min?(k=n.min,y=!0):k+r>n.max&&(k=n.max-r,y=!0);y?(A-=.8*(A-g[l][0]),E||(h-=.8*(h-g[l][1])),t()):g[l]=[A,h];B||(p[l]=q-w,p[c]=r);p=B?1/G:G;v[c]=r;v[l]=k;u[B?a?"scaleY":"scaleX":"scale"+b]=G;u["translate"+b]=p*w+(A-p*z)},pinch:function(a){var d=this,t=d.chart,u=d.pinchDown,v=a.touches,p=v.length,g=d.lastValidTouch,e=d.hasZoom,m=d.selectionMarker,l={},b=1===p&&(d.inClass(a.target,"highcharts-tracker")&&t.runTrackerClick||d.runChartClick),f={};1<p&&(d.initiated=!0);e&&d.initiated&&!b&&
a.preventDefault();[].map.call(v,function(a){return d.normalize(a)});"touchstart"===a.type?([].forEach.call(v,function(a,b){u[b]={chartX:a.chartX,chartY:a.chartY}}),g.x=[u[0].chartX,u[1]&&u[1].chartX],g.y=[u[0].chartY,u[1]&&u[1].chartY],t.axes.forEach(function(a){if(a.zoomEnabled){var b=t.bounds[a.horiz?"h":"v"],c=a.minPixelPadding,f=a.toPixels(k(a.options.min,a.dataMin)),e=a.toPixels(k(a.options.max,a.dataMax)),d=Math.max(f,e);b.min=Math.min(a.pos,Math.min(f,e)-c);b.max=Math.max(a.pos+a.len,d+c)}}),
d.res=!0):d.followTouchMove&&1===p?this.runPointActions(d.normalize(a)):u.length&&(m||(d.selectionMarker=m=I({destroy:H,touch:!0},t.plotBox)),d.pinchTranslate(u,v,l,m,f,g),d.hasPinched=e,d.scaleGroups(l,f),d.res&&(d.res=!1,this.reset(!1,0)))},touch:function(d,q){var t=this.chart,u,v;if(t.index!==a.hoverChartIndex)this.onContainerMouseLeave({relatedTarget:!0});a.hoverChartIndex=t.index;1===d.touches.length?(d=this.normalize(d),(v=t.isInsidePlot(d.chartX-t.plotLeft,d.chartY-t.plotTop))&&!t.openMenu?
(q&&this.runPointActions(d),"touchmove"===d.type&&(q=this.pinchDown,u=q[0]?4<=Math.sqrt(Math.pow(q[0].chartX-d.chartX,2)+Math.pow(q[0].chartY-d.chartY,2)):!1),k(u,!0)&&this.pinch(d)):q&&this.reset()):2===d.touches.length&&this.pinch(d)},onContainerTouchStart:function(a){this.zoomOption(a);this.touch(a,!0)},onContainerTouchMove:function(a){this.touch(a)},onDocumentTouchEnd:function(d){C[a.hoverChartIndex]&&C[a.hoverChartIndex].pointer.drop(d)}})});K(F,"parts/MSPointer.js",[F["parts/Globals.js"]],function(a){var C=
a.addEvent,I=a.charts,H=a.css,k=a.doc,d=a.extend,q=a.noop,t=a.Pointer,u=a.removeEvent,v=a.win,p=a.wrap;if(!a.hasTouch&&(v.PointerEvent||v.MSPointerEvent)){var g={},e=!!v.PointerEvent,m=function(){var b=[];b.item=function(a){return this[a]};a.objectEach(g,function(a){b.push({pageX:a.pageX,pageY:a.pageY,target:a.target})});return b},l=function(b,e,c,d){"touch"!==b.pointerType&&b.pointerType!==b.MSPOINTER_TYPE_TOUCH||!I[a.hoverChartIndex]||(d(b),d=I[a.hoverChartIndex].pointer,d[e]({type:c,target:b.currentTarget,
preventDefault:q,touches:m()}))};d(t.prototype,{onContainerPointerDown:function(a){l(a,"onContainerTouchStart","touchstart",function(a){g[a.pointerId]={pageX:a.pageX,pageY:a.pageY,target:a.currentTarget}})},onContainerPointerMove:function(a){l(a,"onContainerTouchMove","touchmove",function(a){g[a.pointerId]={pageX:a.pageX,pageY:a.pageY};g[a.pointerId].target||(g[a.pointerId].target=a.currentTarget)})},onDocumentPointerUp:function(a){l(a,"onDocumentTouchEnd","touchend",function(a){delete g[a.pointerId]})},
batchMSEvents:function(a){a(this.chart.container,e?"pointerdown":"MSPointerDown",this.onContainerPointerDown);a(this.chart.container,e?"pointermove":"MSPointerMove",this.onContainerPointerMove);a(k,e?"pointerup":"MSPointerUp",this.onDocumentPointerUp)}});p(t.prototype,"init",function(a,e,c){a.call(this,e,c);this.hasZoom&&H(e.container,{"-ms-touch-action":"none","touch-action":"none"})});p(t.prototype,"setDOMEvents",function(a){a.apply(this);(this.hasZoom||this.followTouchMove)&&this.batchMSEvents(C)});
p(t.prototype,"destroy",function(a){this.batchMSEvents(u);a.call(this)})}});K(F,"parts/Legend.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.css,H=a.discardElement,k=a.defined,d=a.fireEvent,q=a.isFirefox,t=a.marginNames,u=a.merge,v=a.pick,p=a.setAnimation,g=a.stableSort,e=a.win,m=a.wrap;a.Legend=function(a,b){this.init(a,b)};a.Legend.prototype={init:function(a,b){this.chart=a;this.setOptions(b);b.enabled&&(this.render(),C(this.chart,"endResize",function(){this.legend.positionCheckboxes()}),
this.proximate?this.unchartrender=C(this.chart,"render",function(){this.legend.proximatePositions();this.legend.positionItems()}):this.unchartrender&&this.unchartrender())},setOptions:function(a){var b=v(a.padding,8);this.options=a;this.chart.styledMode||(this.itemStyle=a.itemStyle,this.itemHiddenStyle=u(this.itemStyle,a.itemHiddenStyle));this.itemMarginTop=a.itemMarginTop||0;this.padding=b;this.initialItemY=b-5;this.symbolWidth=v(a.symbolWidth,16);this.pages=[];this.proximate="proximate"===a.layout&&
!this.chart.inverted},update:function(a,b){var e=this.chart;this.setOptions(u(!0,this.options,a));this.destroy();e.isDirtyLegend=e.isDirtyBox=!0;v(b,!0)&&e.redraw();d(this,"afterUpdate")},colorizeItem:function(a,b){a.legendGroup[b?"removeClass":"addClass"]("highcharts-legend-item-hidden");if(!this.chart.styledMode){var e=this.options,c=a.legendItem,l=a.legendLine,g=a.legendSymbol,m=this.itemHiddenStyle.color,e=b?e.itemStyle.color:m,k=b?a.color||m:m,p=a.options&&a.options.marker,n={fill:k};c&&c.css({fill:e,
color:e});l&&l.attr({stroke:k});g&&(p&&g.isMarker&&(n=a.pointAttribs(),b||(n.stroke=n.fill=m)),g.attr(n))}d(this,"afterColorizeItem",{item:a,visible:b})},positionItems:function(){this.allItems.forEach(this.positionItem,this);this.chart.isResizing||this.positionCheckboxes()},positionItem:function(a){var b=this.options,e=b.symbolPadding,b=!b.rtl,c=a._legendItemPos,d=c[0],c=c[1],l=a.checkbox;if((a=a.legendGroup)&&a.element)a[k(a.translateY)?"animate":"attr"]({translateX:b?d:this.legendWidth-d-2*e-4,
translateY:c});l&&(l.x=d,l.y=c)},destroyItem:function(a){var b=a.checkbox;["legendItem","legendLine","legendSymbol","legendGroup"].forEach(function(b){a[b]&&(a[b]=a[b].destroy())});b&&H(a.checkbox)},destroy:function(){function a(a){this[a]&&(this[a]=this[a].destroy())}this.getAllItems().forEach(function(b){["legendItem","legendGroup"].forEach(a,b)});"clipRect up down pager nav box title group".split(" ").forEach(a,this);this.display=null},positionCheckboxes:function(){var a=this.group&&this.group.alignAttr,
b,e=this.clipHeight||this.legendHeight,c=this.titleHeight;a&&(b=a.translateY,this.allItems.forEach(function(f){var d=f.checkbox,g;d&&(g=b+c+d.y+(this.scrollOffset||0)+3,I(d,{left:a.translateX+f.checkboxOffset+d.x-20+"px",top:g+"px",display:this.proximate||g>b-6&&g<b+e-6?"":"none"}))},this))},renderTitle:function(){var a=this.options,b=this.padding,e=a.title,c=0;e.text&&(this.title||(this.title=this.chart.renderer.label(e.text,b-3,b-4,null,null,null,a.useHTML,null,"legend-title").attr({zIndex:1}),
this.chart.styledMode||this.title.css(e.style),this.title.add(this.group)),e.width||this.title.css({width:this.maxLegendWidth+"px"}),a=this.title.getBBox(),c=a.height,this.offsetWidth=a.width,this.contentGroup.attr({translateY:c}));this.titleHeight=c},setText:function(e){var b=this.options;e.legendItem.attr({text:b.labelFormat?a.format(b.labelFormat,e,this.chart.time):b.labelFormatter.call(e)})},renderItem:function(a){var b=this.chart,e=b.renderer,c=this.options,d=this.symbolWidth,g=c.symbolPadding,
l=this.itemStyle,m=this.itemHiddenStyle,k="horizontal"===c.layout?v(c.itemDistance,20):0,n=!c.rtl,E=a.legendItem,z=!a.series,A=!z&&a.series.drawLegendSymbol?a.series:a,D=A.options,D=this.createCheckboxForItem&&D&&D.showCheckbox,k=d+g+k+(D?20:0),h=c.useHTML,p=a.options.className;E||(a.legendGroup=e.g("legend-item").addClass("highcharts-"+A.type+"-series highcharts-color-"+a.colorIndex+(p?" "+p:"")+(z?" highcharts-series-"+a.index:"")).attr({zIndex:1}).add(this.scrollGroup),a.legendItem=E=e.text("",
n?d+g:-g,this.baseline||0,h),b.styledMode||E.css(u(a.visible?l:m)),E.attr({align:n?"left":"right",zIndex:2}).add(a.legendGroup),this.baseline||(this.fontMetrics=e.fontMetrics(b.styledMode?12:l.fontSize,E),this.baseline=this.fontMetrics.f+3+this.itemMarginTop,E.attr("y",this.baseline)),this.symbolHeight=c.symbolHeight||this.fontMetrics.f,A.drawLegendSymbol(this,a),this.setItemEvents&&this.setItemEvents(a,E,h));D&&!a.checkbox&&this.createCheckboxForItem(a);this.colorizeItem(a,a.visible);!b.styledMode&&
l.width||E.css({width:(c.itemWidth||this.widthOption||b.spacingBox.width)-k});this.setText(a);b=E.getBBox();a.itemWidth=a.checkboxOffset=c.itemWidth||a.legendItemWidth||b.width+k;this.maxItemWidth=Math.max(this.maxItemWidth,a.itemWidth);this.totalItemWidth+=a.itemWidth;this.itemHeight=a.itemHeight=Math.round(a.legendItemHeight||b.height||this.symbolHeight)},layoutItem:function(a){var b=this.options,e=this.padding,c="horizontal"===b.layout,d=a.itemHeight,g=b.itemMarginBottom||0,l=this.itemMarginTop,
m=c?v(b.itemDistance,20):0,k=this.maxLegendWidth,b=b.alignColumns&&this.totalItemWidth>k?this.maxItemWidth:a.itemWidth;c&&this.itemX-e+b>k&&(this.itemX=e,this.lastLineHeight&&(this.itemY+=l+this.lastLineHeight+g),this.lastLineHeight=0);this.lastItemY=l+this.itemY+g;this.lastLineHeight=Math.max(d,this.lastLineHeight);a._legendItemPos=[this.itemX,this.itemY];c?this.itemX+=b:(this.itemY+=l+d+g,this.lastLineHeight=d);this.offsetWidth=this.widthOption||Math.max((c?this.itemX-e-(a.checkbox?0:m):b)+e,this.offsetWidth)},
getAllItems:function(){var a=[];this.chart.series.forEach(function(b){var e=b&&b.options;b&&v(e.showInLegend,k(e.linkedTo)?!1:void 0,!0)&&(a=a.concat(b.legendItems||("point"===e.legendType?b.data:b)))});d(this,"afterGetAllItems",{allItems:a});return a},getAlignment:function(){var a=this.options;return this.proximate?a.align.charAt(0)+"tv":a.floating?"":a.align.charAt(0)+a.verticalAlign.charAt(0)+a.layout.charAt(0)},adjustMargins:function(a,b){var e=this.chart,c=this.options,d=this.getAlignment(),
g=void 0!==e.options.title.margin?e.titleOffset+e.options.title.margin:0;d&&[/(lth|ct|rth)/,/(rtv|rm|rbv)/,/(rbh|cb|lbh)/,/(lbv|lm|ltv)/].forEach(function(f,l){f.test(d)&&!k(a[l])&&(e[t[l]]=Math.max(e[t[l]],e.legend[(l+1)%2?"legendHeight":"legendWidth"]+[1,-1,-1,1][l]*c[l%2?"x":"y"]+v(c.margin,12)+b[l]+(0===l&&(0===e.titleOffset?0:g))))})},proximatePositions:function(){var e=this.chart,b=[],f="left"===this.options.align;this.allItems.forEach(function(c){var d,g;g=f;var l;c.yAxis&&c.points&&(c.xAxis.options.reversed&&
(g=!g),d=a.find(g?c.points:c.points.slice(0).reverse(),function(b){return a.isNumber(b.plotY)}),g=c.legendGroup.getBBox().height,l=c.yAxis.top-e.plotTop,c.visible?(d=d?d.plotY:c.yAxis.height,d+=l-.3*g):d=l+c.yAxis.height,b.push({target:d,size:g,item:c}))},this);a.distribute(b,e.plotHeight);b.forEach(function(a){a.item._legendItemPos[1]=e.plotTop-e.spacing[0]+a.pos})},render:function(){var e=this.chart,b=e.renderer,f=this.group,c,m,r,k=this.box,p=this.options,B=this.padding;this.itemX=B;this.itemY=
this.initialItemY;this.lastItemY=this.offsetWidth=0;this.widthOption=a.relativeLength(p.width,e.spacingBox.width-B);c=e.spacingBox.width-2*B-p.x;-1<["rm","lm"].indexOf(this.getAlignment().substring(0,2))&&(c/=2);this.maxLegendWidth=this.widthOption||c;f||(this.group=f=b.g("legend").attr({zIndex:7}).add(),this.contentGroup=b.g().attr({zIndex:1}).add(f),this.scrollGroup=b.g().add(this.contentGroup));this.renderTitle();c=this.getAllItems();g(c,function(a,b){return(a.options&&a.options.legendIndex||0)-
(b.options&&b.options.legendIndex||0)});p.reversed&&c.reverse();this.allItems=c;this.display=m=!!c.length;this.itemHeight=this.totalItemWidth=this.maxItemWidth=this.lastLineHeight=0;c.forEach(this.renderItem,this);c.forEach(this.layoutItem,this);c=(this.widthOption||this.offsetWidth)+B;r=this.lastItemY+this.lastLineHeight+this.titleHeight;r=this.handleOverflow(r);r+=B;k||(this.box=k=b.rect().addClass("highcharts-legend-box").attr({r:p.borderRadius}).add(f),k.isNew=!0);e.styledMode||k.attr({stroke:p.borderColor,
"stroke-width":p.borderWidth||0,fill:p.backgroundColor||"none"}).shadow(p.shadow);0<c&&0<r&&(k[k.isNew?"attr":"animate"](k.crisp.call({},{x:0,y:0,width:c,height:r},k.strokeWidth())),k.isNew=!1);k[m?"show":"hide"]();e.styledMode&&"none"===f.getStyle("display")&&(c=r=0);this.legendWidth=c;this.legendHeight=r;m&&(b=e.spacingBox,/(lth|ct|rth)/.test(this.getAlignment())&&(k=b.y+e.titleOffset,b=u(b,{y:0<e.titleOffset?k+=e.options.title.margin:k})),f.align(u(p,{width:c,height:r,verticalAlign:this.proximate?
"top":p.verticalAlign}),!0,b));this.proximate||this.positionItems();d(this,"afterRender")},handleOverflow:function(a){var b=this,e=this.chart,c=e.renderer,d=this.options,g=d.y,l=this.padding,g=e.spacingBox.height+("top"===d.verticalAlign?-g:g)-l,m=d.maxHeight,k,n=this.clipRect,E=d.navigation,z=v(E.animation,!0),A=E.arrowSize||12,D=this.nav,h=this.pages,p,q=this.allItems,t=function(a){"number"===typeof a?n.attr({height:a}):n&&(b.clipRect=n.destroy(),b.contentGroup.clip());b.contentGroup.div&&(b.contentGroup.div.style.clip=
a?"rect("+l+"px,9999px,"+(l+a)+"px,0)":"auto")},L=function(a){b[a]=c.circle(0,0,1.3*A).translate(A/2,A/2).add(D);e.styledMode||b[a].attr("fill","rgba(0,0,0,0.0001)");return b[a]};"horizontal"!==d.layout||"middle"===d.verticalAlign||d.floating||(g/=2);m&&(g=Math.min(g,m));h.length=0;a>g&&!1!==E.enabled?(this.clipHeight=k=Math.max(g-20-this.titleHeight-l,0),this.currentPage=v(this.currentPage,1),this.fullHeight=a,q.forEach(function(a,b){var c=a._legendItemPos[1],e=Math.round(a.legendItem.getBBox().height),
f=h.length;if(!f||c-h[f-1]>k&&(p||c)!==h[f-1])h.push(p||c),f++;a.pageIx=f-1;p&&(q[b-1].pageIx=f-1);b===q.length-1&&c+e-h[f-1]>k&&c!==p&&(h.push(c),a.pageIx=f);c!==p&&(p=c)}),n||(n=b.clipRect=c.clipRect(0,l,9999,0),b.contentGroup.clip(n)),t(k),D||(this.nav=D=c.g().attr({zIndex:1}).add(this.group),this.up=c.symbol("triangle",0,0,A,A).add(D),L("upTracker").on("click",function(){b.scroll(-1,z)}),this.pager=c.text("",15,10).addClass("highcharts-legend-navigation"),e.styledMode||this.pager.css(E.style),
this.pager.add(D),this.down=c.symbol("triangle-down",0,0,A,A).add(D),L("downTracker").on("click",function(){b.scroll(1,z)})),b.scroll(0),a=g):D&&(t(),this.nav=D.destroy(),this.scrollGroup.attr({translateY:1}),this.clipHeight=0);return a},scroll:function(a,b){var e=this.pages,c=e.length,d=this.currentPage+a;a=this.clipHeight;var g=this.options.navigation,l=this.pager,m=this.padding;d>c&&(d=c);0<d&&(void 0!==b&&p(b,this.chart),this.nav.attr({translateX:m,translateY:a+this.padding+7+this.titleHeight,
visibility:"visible"}),[this.up,this.upTracker].forEach(function(a){a.attr({"class":1===d?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"})}),l.attr({text:d+"/"+c}),[this.down,this.downTracker].forEach(function(a){a.attr({x:18+this.pager.getBBox().width,"class":d===c?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"})},this),this.chart.styledMode||(this.up.attr({fill:1===d?g.inactiveColor:g.activeColor}),this.upTracker.css({cursor:1===d?"default":"pointer"}),this.down.attr({fill:d===
c?g.inactiveColor:g.activeColor}),this.downTracker.css({cursor:d===c?"default":"pointer"})),this.scrollOffset=-e[d-1]+this.initialItemY,this.scrollGroup.animate({translateY:this.scrollOffset}),this.currentPage=d,this.positionCheckboxes())}};a.LegendSymbolMixin={drawRectangle:function(a,b){var e=a.symbolHeight,c=a.options.squareSymbol;b.legendSymbol=this.chart.renderer.rect(c?(a.symbolWidth-e)/2:0,a.baseline-e+1,c?e:a.symbolWidth,e,v(a.options.symbolRadius,e/2)).addClass("highcharts-point").attr({zIndex:3}).add(b.legendGroup)},
drawLineMarker:function(a){var b=this.options,e=b.marker,c=a.symbolWidth,d=a.symbolHeight,g=d/2,m=this.chart.renderer,l=this.legendGroup;a=a.baseline-Math.round(.3*a.fontMetrics.b);var k={};this.chart.styledMode||(k={"stroke-width":b.lineWidth||0},b.dashStyle&&(k.dashstyle=b.dashStyle));this.legendLine=m.path(["M",0,a,"L",c,a]).addClass("highcharts-graph").attr(k).add(l);e&&!1!==e.enabled&&c&&(b=Math.min(v(e.radius,g),g),0===this.symbol.indexOf("url")&&(e=u(e,{width:d,height:d}),b=0),this.legendSymbol=
e=m.symbol(this.symbol,c/2-b,a-b,2*b,2*b,e).addClass("highcharts-point").add(l),e.isMarker=!0)}};(/Trident\/7\.0/.test(e.navigator&&e.navigator.userAgent)||q)&&m(a.Legend.prototype,"positionItem",function(a,b){var e=this,c=function(){b._legendItemPos&&a.call(e,b)};c();e.bubbleLegend||setTimeout(c)})});K(F,"parts/Chart.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.animate,H=a.animObject,k=a.attr,d=a.doc,q=a.Axis,t=a.createElement,u=a.defaultOptions,v=a.discardElement,p=a.charts,g=a.css,
e=a.defined,m=a.extend,l=a.find,b=a.fireEvent,f=a.isNumber,c=a.isObject,w=a.isString,r=a.Legend,J=a.marginNames,G=a.merge,B=a.objectEach,n=a.Pointer,E=a.pick,z=a.pInt,A=a.removeEvent,D=a.seriesTypes,h=a.splat,y=a.syncTimeout,M=a.win,R=a.Chart=function(){this.getArgs.apply(this,arguments)};a.chart=function(a,b,c){return new R(a,b,c)};m(R.prototype,{callbacks:[],getArgs:function(){var a=[].slice.call(arguments);if(w(a[0])||a[0].nodeName)this.renderTo=a.shift();this.init(a[0],a[1])},init:function(e,
h){var d,f=e.series,n=e.plotOptions||{};b(this,"init",{args:arguments},function(){e.series=null;d=G(u,e);B(d.plotOptions,function(a,b){c(a)&&(a.tooltip=n[b]&&G(n[b].tooltip)||void 0)});d.tooltip.userOptions=e.chart&&e.chart.forExport&&e.tooltip.userOptions||e.tooltip;d.series=e.series=f;this.userOptions=e;var g=d.chart,m=g.events;this.margin=[];this.spacing=[];this.bounds={h:{},v:{}};this.labelCollectors=[];this.callback=h;this.isResizing=0;this.options=d;this.axes=[];this.series=[];this.time=e.time&&
Object.keys(e.time).length?new a.Time(e.time):a.time;this.styledMode=g.styledMode;this.hasCartesianSeries=g.showAxes;var l=this;l.index=p.length;p.push(l);a.chartCount++;m&&B(m,function(a,b){C(l,b,a)});l.xAxis=[];l.yAxis=[];l.pointCount=l.colorCounter=l.symbolCounter=0;b(l,"afterInit");l.firstRender()})},initSeries:function(b){var c=this.options.chart;(c=D[b.type||c.type||c.defaultSeriesType])||a.error(17,!0,this);c=new c;c.init(this,b);return c},orderSeries:function(a){var b=this.series;for(a=a||
0;a<b.length;a++)b[a]&&(b[a].index=a,b[a].name=b[a].getName())},isInsidePlot:function(a,b,c){var e=c?b:a;a=c?a:b;return 0<=e&&e<=this.plotWidth&&0<=a&&a<=this.plotHeight},redraw:function(c){b(this,"beforeRedraw");var e=this.axes,h=this.series,d=this.pointer,f=this.legend,n=this.userOptions.legend,g=this.isDirtyLegend,l,z,k=this.hasCartesianSeries,E=this.isDirtyBox,r,D=this.renderer,A=D.isHidden(),p=[];this.setResponsive&&this.setResponsive(!1);a.setAnimation(c,this);A&&this.temporaryDisplay();this.layOutTitles();
for(c=h.length;c--;)if(r=h[c],r.options.stacking&&(l=!0,r.isDirty)){z=!0;break}if(z)for(c=h.length;c--;)r=h[c],r.options.stacking&&(r.isDirty=!0);h.forEach(function(a){a.isDirty&&("point"===a.options.legendType?(a.updateTotals&&a.updateTotals(),g=!0):n&&(n.labelFormatter||n.labelFormat)&&(g=!0));a.isDirtyData&&b(a,"updatedData")});g&&f&&f.options.enabled&&(f.render(),this.isDirtyLegend=!1);l&&this.getStacks();k&&e.forEach(function(a){a.updateNames();a.setScale()});this.getMargins();k&&(e.forEach(function(a){a.isDirty&&
(E=!0)}),e.forEach(function(a){var c=a.min+","+a.max;a.extKey!==c&&(a.extKey=c,p.push(function(){b(a,"afterSetExtremes",m(a.eventArgs,a.getExtremes()));delete a.eventArgs}));(E||l)&&a.redraw()}));E&&this.drawChartBox();b(this,"predraw");h.forEach(function(a){(E||a.isDirty)&&a.visible&&a.redraw();a.isDirtyData=!1});d&&d.reset(!0);D.draw();b(this,"redraw");b(this,"render");A&&this.temporaryDisplay(!0);p.forEach(function(a){a.call()})},get:function(a){function b(b){return b.id===a||b.options&&b.options.id===
a}var c,e=this.series,h;c=l(this.axes,b)||l(this.series,b);for(h=0;!c&&h<e.length;h++)c=l(e[h].points||[],b);return c},getAxes:function(){var a=this,c=this.options,e=c.xAxis=h(c.xAxis||{}),c=c.yAxis=h(c.yAxis||{});b(this,"getAxes");e.forEach(function(a,b){a.index=b;a.isX=!0});c.forEach(function(a,b){a.index=b});e.concat(c).forEach(function(b){new q(a,b)});b(this,"afterGetAxes")},getSelectedPoints:function(){var a=[];this.series.forEach(function(b){a=a.concat((b[b.hasGroupedData?"points":"data"]||
[]).filter(function(a){return a.selected}))});return a},getSelectedSeries:function(){return this.series.filter(function(a){return a.selected})},setTitle:function(a,b,c){var e=this,h=e.options,d=e.styledMode,f;f=h.title=G(!d&&{style:{color:"#333333",fontSize:h.isStock?"16px":"18px"}},h.title,a);h=h.subtitle=G(!d&&{style:{color:"#666666"}},h.subtitle,b);[["title",a,f],["subtitle",b,h]].forEach(function(a,b){var c=a[0],h=e[c],f=a[1];a=a[2];h&&f&&(e[c]=h=h.destroy());a&&!h&&(e[c]=e.renderer.text(a.text,
0,0,a.useHTML).attr({align:a.align,"class":"highcharts-"+c,zIndex:a.zIndex||4}).add(),e[c].update=function(a){e.setTitle(!b&&a,b&&a)},d||e[c].css(a.style))});e.layOutTitles(c)},layOutTitles:function(a){var b=0,c,e=this.renderer,h=this.spacingBox;["title","subtitle"].forEach(function(a){var c=this[a],d=this.options[a];a="title"===a?-3:d.verticalAlign?0:b+2;var f;c&&(this.styledMode||(f=d.style.fontSize),f=e.fontMetrics(f,c).b,c.css({width:(d.width||h.width+d.widthAdjust)+"px"}).align(m({y:a+f},d),
!1,"spacingBox"),d.floating||d.verticalAlign||(b=Math.ceil(b+c.getBBox(d.useHTML).height)))},this);c=this.titleOffset!==b;this.titleOffset=b;!this.isDirtyBox&&c&&(this.isDirtyBox=this.isDirtyLegend=c,this.hasRendered&&E(a,!0)&&this.isDirtyBox&&this.redraw())},getChartSize:function(){var b=this.options.chart,c=b.width,b=b.height,h=this.renderTo;e(c)||(this.containerWidth=a.getStyle(h,"width"));e(b)||(this.containerHeight=a.getStyle(h,"height"));this.chartWidth=Math.max(0,c||this.containerWidth||600);
this.chartHeight=Math.max(0,a.relativeLength(b,this.chartWidth)||(1<this.containerHeight?this.containerHeight:400))},temporaryDisplay:function(b){var c=this.renderTo;if(b)for(;c&&c.style;)c.hcOrigStyle&&(a.css(c,c.hcOrigStyle),delete c.hcOrigStyle),c.hcOrigDetached&&(d.body.removeChild(c),c.hcOrigDetached=!1),c=c.parentNode;else for(;c&&c.style;){d.body.contains(c)||c.parentNode||(c.hcOrigDetached=!0,d.body.appendChild(c));if("none"===a.getStyle(c,"display",!1)||c.hcOricDetached)c.hcOrigStyle={display:c.style.display,
height:c.style.height,overflow:c.style.overflow},b={display:"block",overflow:"hidden"},c!==this.renderTo&&(b.height=0),a.css(c,b),c.offsetWidth||c.style.setProperty("display","block","important");c=c.parentNode;if(c===d.body)break}},setClassName:function(a){this.container.className="highcharts-container "+(a||"")},getContainer:function(){var c,e=this.options,h=e.chart,n,l;c=this.renderTo;var E=a.uniqueKey(),r,D;c||(this.renderTo=c=h.renderTo);w(c)&&(this.renderTo=c=d.getElementById(c));c||a.error(13,
!0,this);n=z(k(c,"data-highcharts-chart"));f(n)&&p[n]&&p[n].hasRendered&&p[n].destroy();k(c,"data-highcharts-chart",this.index);c.innerHTML="";h.skipClone||c.offsetWidth||this.temporaryDisplay();this.getChartSize();n=this.chartWidth;l=this.chartHeight;g(c,{overflow:"hidden"});this.styledMode||(r=m({position:"relative",overflow:"hidden",width:n+"px",height:l+"px",textAlign:"left",lineHeight:"normal",zIndex:0,"-webkit-tap-highlight-color":"rgba(0,0,0,0)"},h.style));this.container=c=t("div",{id:E},r,
c);this._cursor=c.style.cursor;this.renderer=new (a[h.renderer]||a.Renderer)(c,n,l,null,h.forExport,e.exporting&&e.exporting.allowHTML,this.styledMode);this.setClassName(h.className);if(this.styledMode)for(D in e.defs)this.renderer.definition(e.defs[D]);else this.renderer.setStyle(h.style);this.renderer.chartIndex=this.index;b(this,"afterGetContainer")},getMargins:function(a){var c=this.spacing,h=this.margin,d=this.titleOffset;this.resetMargins();d&&!e(h[0])&&(this.plotTop=Math.max(this.plotTop,d+
this.options.title.margin+c[0]));this.legend&&this.legend.display&&this.legend.adjustMargins(h,c);b(this,"getMargins");a||this.getAxisMargins()},getAxisMargins:function(){var a=this,b=a.axisOffset=[0,0,0,0],c=a.margin;a.hasCartesianSeries&&a.axes.forEach(function(a){a.visible&&a.getOffset()});J.forEach(function(h,d){e(c[d])||(a[h]+=b[d])});a.setChartSize()},reflow:function(b){var c=this,h=c.options.chart,f=c.renderTo,n=e(h.width)&&e(h.height),g=h.width||a.getStyle(f,"width"),h=h.height||a.getStyle(f,
"height"),f=b?b.target:M;if(!n&&!c.isPrinting&&g&&h&&(f===M||f===d)){if(g!==c.containerWidth||h!==c.containerHeight)a.clearTimeout(c.reflowTimeout),c.reflowTimeout=y(function(){c.container&&c.setSize(void 0,void 0,!1)},b?100:0);c.containerWidth=g;c.containerHeight=h}},setReflow:function(a){var b=this;!1===a||this.unbindReflow?!1===a&&this.unbindReflow&&(this.unbindReflow=this.unbindReflow()):(this.unbindReflow=C(M,"resize",function(a){b.reflow(a)}),C(this,"destroy",this.unbindReflow))},setSize:function(c,
e,h){var d=this,f=d.renderer,n;d.isResizing+=1;a.setAnimation(h,d);d.oldChartHeight=d.chartHeight;d.oldChartWidth=d.chartWidth;void 0!==c&&(d.options.chart.width=c);void 0!==e&&(d.options.chart.height=e);d.getChartSize();d.styledMode||(n=f.globalAnimation,(n?I:g)(d.container,{width:d.chartWidth+"px",height:d.chartHeight+"px"},n));d.setChartSize(!0);f.setSize(d.chartWidth,d.chartHeight,h);d.axes.forEach(function(a){a.isDirty=!0;a.setScale()});d.isDirtyLegend=!0;d.isDirtyBox=!0;d.layOutTitles();d.getMargins();
d.redraw(h);d.oldChartHeight=null;b(d,"resize");y(function(){d&&b(d,"endResize",null,function(){--d.isResizing})},H(n).duration)},setChartSize:function(a){var c=this.inverted,e=this.renderer,h=this.chartWidth,d=this.chartHeight,f=this.options.chart,n=this.spacing,g=this.clipOffset,l,m,z,k;this.plotLeft=l=Math.round(this.plotLeft);this.plotTop=m=Math.round(this.plotTop);this.plotWidth=z=Math.max(0,Math.round(h-l-this.marginRight));this.plotHeight=k=Math.max(0,Math.round(d-m-this.marginBottom));this.plotSizeX=
c?k:z;this.plotSizeY=c?z:k;this.plotBorderWidth=f.plotBorderWidth||0;this.spacingBox=e.spacingBox={x:n[3],y:n[0],width:h-n[3]-n[1],height:d-n[0]-n[2]};this.plotBox=e.plotBox={x:l,y:m,width:z,height:k};h=2*Math.floor(this.plotBorderWidth/2);c=Math.ceil(Math.max(h,g[3])/2);e=Math.ceil(Math.max(h,g[0])/2);this.clipBox={x:c,y:e,width:Math.floor(this.plotSizeX-Math.max(h,g[1])/2-c),height:Math.max(0,Math.floor(this.plotSizeY-Math.max(h,g[2])/2-e))};a||this.axes.forEach(function(a){a.setAxisSize();a.setAxisTranslation()});
b(this,"afterSetChartSize",{skipAxes:a})},resetMargins:function(){b(this,"resetMargins");var a=this,e=a.options.chart;["margin","spacing"].forEach(function(b){var h=e[b],d=c(h)?h:[h,h,h,h];["Top","Right","Bottom","Left"].forEach(function(c,h){a[b][h]=E(e[b+c],d[h])})});J.forEach(function(b,c){a[b]=E(a.margin[c],a.spacing[c])});a.axisOffset=[0,0,0,0];a.clipOffset=[0,0,0,0]},drawChartBox:function(){var a=this.options.chart,c=this.renderer,e=this.chartWidth,h=this.chartHeight,d=this.chartBackground,
f=this.plotBackground,n=this.plotBorder,g,l=this.styledMode,m=this.plotBGImage,z=a.backgroundColor,k=a.plotBackgroundColor,E=a.plotBackgroundImage,r,D=this.plotLeft,A=this.plotTop,p=this.plotWidth,w=this.plotHeight,y=this.plotBox,B=this.clipRect,q=this.clipBox,t="animate";d||(this.chartBackground=d=c.rect().addClass("highcharts-background").add(),t="attr");if(l)g=r=d.strokeWidth();else{g=a.borderWidth||0;r=g+(a.shadow?8:0);z={fill:z||"none"};if(g||d["stroke-width"])z.stroke=a.borderColor,z["stroke-width"]=
g;d.attr(z).shadow(a.shadow)}d[t]({x:r/2,y:r/2,width:e-r-g%2,height:h-r-g%2,r:a.borderRadius});t="animate";f||(t="attr",this.plotBackground=f=c.rect().addClass("highcharts-plot-background").add());f[t](y);l||(f.attr({fill:k||"none"}).shadow(a.plotShadow),E&&(m?m.animate(y):this.plotBGImage=c.image(E,D,A,p,w).add()));B?B.animate({width:q.width,height:q.height}):this.clipRect=c.clipRect(q);t="animate";n||(t="attr",this.plotBorder=n=c.rect().addClass("highcharts-plot-border").attr({zIndex:1}).add());
l||n.attr({stroke:a.plotBorderColor,"stroke-width":a.plotBorderWidth||0,fill:"none"});n[t](n.crisp({x:D,y:A,width:p,height:w},-n.strokeWidth()));this.isDirtyBox=!1;b(this,"afterDrawChartBox")},propFromSeries:function(){var a=this,b=a.options.chart,c,e=a.options.series,h,d;["inverted","angular","polar"].forEach(function(f){c=D[b.type||b.defaultSeriesType];d=b[f]||c&&c.prototype[f];for(h=e&&e.length;!d&&h--;)(c=D[e[h].type])&&c.prototype[f]&&(d=!0);a[f]=d})},linkSeries:function(){var a=this,c=a.series;
c.forEach(function(a){a.linkedSeries.length=0});c.forEach(function(b){var c=b.options.linkedTo;w(c)&&(c=":previous"===c?a.series[b.index-1]:a.get(c))&&c.linkedParent!==b&&(c.linkedSeries.push(b),b.linkedParent=c,b.visible=E(b.options.visible,c.options.visible,b.visible))});b(this,"afterLinkSeries")},renderSeries:function(){this.series.forEach(function(a){a.translate();a.render()})},renderLabels:function(){var a=this,b=a.options.labels;b.items&&b.items.forEach(function(c){var e=m(b.style,c.style),
h=z(e.left)+a.plotLeft,d=z(e.top)+a.plotTop+12;delete e.left;delete e.top;a.renderer.text(c.html,h,d).attr({zIndex:2}).css(e).add()})},render:function(){var a=this.axes,b=this.renderer,c=this.options,e=0,h,d,f;this.setTitle();this.legend=new r(this,c.legend);this.getStacks&&this.getStacks();this.getMargins(!0);this.setChartSize();c=this.plotWidth;a.some(function(a){if(a.horiz&&a.visible&&a.options.labels.enabled&&a.series.length)return e=21,!0});h=this.plotHeight=Math.max(this.plotHeight-e,0);a.forEach(function(a){a.setScale()});
this.getAxisMargins();d=1.1<c/this.plotWidth;f=1.05<h/this.plotHeight;if(d||f)a.forEach(function(a){(a.horiz&&d||!a.horiz&&f)&&a.setTickInterval(!0)}),this.getMargins();this.drawChartBox();this.hasCartesianSeries&&a.forEach(function(a){a.visible&&a.render()});this.seriesGroup||(this.seriesGroup=b.g("series-group").attr({zIndex:3}).add());this.renderSeries();this.renderLabels();this.addCredits();this.setResponsive&&this.setResponsive();this.hasRendered=!0},addCredits:function(a){var b=this;a=G(!0,
this.options.credits,a);a.enabled&&!this.credits&&(this.credits=this.renderer.text(a.text+(this.mapCredits||""),0,0).addClass("highcharts-credits").on("click",function(){a.href&&(M.location.href=a.href)}).attr({align:a.position.align,zIndex:8}),b.styledMode||this.credits.css(a.style),this.credits.add().align(a.position),this.credits.update=function(a){b.credits=b.credits.destroy();b.addCredits(a)})},destroy:function(){var c=this,e=c.axes,h=c.series,d=c.container,f,n=d&&d.parentNode;b(c,"destroy");
c.renderer.forExport?a.erase(p,c):p[c.index]=void 0;a.chartCount--;c.renderTo.removeAttribute("data-highcharts-chart");A(c);for(f=e.length;f--;)e[f]=e[f].destroy();this.scroller&&this.scroller.destroy&&this.scroller.destroy();for(f=h.length;f--;)h[f]=h[f].destroy();"title subtitle chartBackground plotBackground plotBGImage plotBorder seriesGroup clipRect credits pointer rangeSelector legend resetZoomButton tooltip renderer".split(" ").forEach(function(a){var b=c[a];b&&b.destroy&&(c[a]=b.destroy())});
d&&(d.innerHTML="",A(d),n&&v(d));B(c,function(a,b){delete c[b]})},firstRender:function(){var c=this,e=c.options;if(!c.isReadyToRender||c.isReadyToRender()){c.getContainer();c.resetMargins();c.setChartSize();c.propFromSeries();c.getAxes();(a.isArray(e.series)?e.series:[]).forEach(function(a){c.initSeries(a)});c.linkSeries();b(c,"beforeRender");n&&(c.pointer=new n(c,e));c.render();if(!c.renderer.imgCount&&c.onload)c.onload();c.temporaryDisplay(!0)}},onload:function(){[this.callback].concat(this.callbacks).forEach(function(a){a&&
void 0!==this.index&&a.apply(this,[this])},this);b(this,"load");b(this,"render");e(this.index)&&this.setReflow(this.options.chart.reflow);this.onload=null}})});K(F,"parts/ScrollablePlotArea.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.Chart;C(I,"afterSetChartSize",function(C){var k=this.options.chart.scrollablePlotArea;(k=k&&k.minWidth)&&!this.renderer.forExport&&(this.scrollablePixels=k=Math.max(0,k-this.chartWidth))&&(this.plotWidth+=k,this.clipBox.width+=k,C.skipAxes||this.axes.forEach(function(d){1===
d.side?d.getPlotLinePath=function(){var k=this.right,t;this.right=k-d.chart.scrollablePixels;t=a.Axis.prototype.getPlotLinePath.apply(this,arguments);this.right=k;return t}:(d.setAxisSize(),d.setAxisTranslation())}))});C(I,"render",function(){this.scrollablePixels?(this.setUpScrolling&&this.setUpScrolling(),this.applyFixed()):this.fixedDiv&&this.applyFixed()});I.prototype.setUpScrolling=function(){this.scrollingContainer=a.createElement("div",{className:"highcharts-scrolling"},{overflowX:"auto",WebkitOverflowScrolling:"touch"},
this.renderTo);this.innerContainer=a.createElement("div",{className:"highcharts-inner-container"},null,this.scrollingContainer);this.innerContainer.appendChild(this.container);this.setUpScrolling=null};I.prototype.applyFixed=function(){var C=this.container,k,d,q=!this.fixedDiv;q&&(this.fixedDiv=a.createElement("div",{className:"highcharts-fixed"},{position:"absolute",overflow:"hidden",pointerEvents:"none",zIndex:2},null,!0),this.renderTo.insertBefore(this.fixedDiv,this.renderTo.firstChild),this.renderTo.style.overflow=
"visible",this.fixedRenderer=k=new a.Renderer(this.fixedDiv,0,0),this.scrollableMask=k.path().attr({fill:a.color(this.options.chart.backgroundColor||"#fff").setOpacity(.85).get(),zIndex:-1}).addClass("highcharts-scrollable-mask").add(),[this.inverted?".highcharts-xaxis":".highcharts-yaxis",this.inverted?".highcharts-xaxis-labels":".highcharts-yaxis-labels",".highcharts-contextbutton",".highcharts-credits",".highcharts-legend",".highcharts-subtitle",".highcharts-title",".highcharts-legend-checkbox"].forEach(function(a){[].forEach.call(C.querySelectorAll(a),
function(a){(a.namespaceURI===k.SVG_NS?k.box:k.box.parentNode).appendChild(a);a.style.pointerEvents="auto"})}));this.fixedRenderer.setSize(this.chartWidth,this.chartHeight);d=this.chartWidth+this.scrollablePixels;a.stop(this.container);this.container.style.width=d+"px";this.renderer.boxWrapper.attr({width:d,height:this.chartHeight,viewBox:[0,0,d,this.chartHeight].join(" ")});this.chartBackground.attr({width:d});q&&(d=this.options.chart.scrollablePlotArea,d.scrollPositionX&&(this.scrollingContainer.scrollLeft=
this.scrollablePixels*d.scrollPositionX));q=this.axisOffset;d=this.plotTop-q[0]-1;var q=this.plotTop+this.plotHeight+q[2],t=this.plotLeft+this.plotWidth-this.scrollablePixels;this.scrollableMask.attr({d:this.scrollablePixels?["M",0,d,"L",this.plotLeft-1,d,"L",this.plotLeft-1,q,"L",0,q,"Z","M",t,d,"L",this.chartWidth,d,"L",this.chartWidth,q,"L",t,q,"Z"]:["M",0,0]})}});K(F,"parts/Point.js",[F["parts/Globals.js"]],function(a){var C,I=a.extend,H=a.erase,k=a.fireEvent,d=a.format,q=a.isArray,t=a.isNumber,
u=a.pick,v=a.uniqueKey,p=a.defined,g=a.removeEvent;a.Point=C=function(){};a.Point.prototype={init:function(a,d,g){this.series=a;this.applyOptions(d,g);this.id=p(this.id)?this.id:v();this.resolveColor();a.chart.pointCount++;k(this,"afterInit");return this},resolveColor:function(){var a=this.series,d;d=a.chart.options.chart.colorCount;var g=a.chart.styledMode;g||this.options.color||(this.color=a.color);a.options.colorByPoint?(g||(d=a.options.colors||a.chart.options.colors,this.color=this.color||d[a.colorCounter],
d=d.length),g=a.colorCounter,a.colorCounter++,a.colorCounter===d&&(a.colorCounter=0)):g=a.colorIndex;this.colorIndex=u(this.colorIndex,g)},applyOptions:function(a,d){var e=this.series,b=e.options.pointValKey||e.pointValKey;a=C.prototype.optionsToObject.call(this,a);I(this,a);this.options=this.options?I(this.options,a):a;a.group&&delete this.group;a.dataLabels&&delete this.dataLabels;b&&(this.y=this[b]);if(this.isNull=u(this.isValid&&!this.isValid(),null===this.x||!t(this.y,!0)))this.formatPrefix=
"null";this.selected&&(this.state="select");"name"in this&&void 0===d&&e.xAxis&&e.xAxis.hasNames&&(this.x=e.xAxis.nameToX(this));void 0===this.x&&e&&(this.x=void 0===d?e.autoIncrement(this):d);return this},setNestedProperty:function(e,d,g){g.split(".").reduce(function(b,e,c,g){b[e]=g.length-1===c?d:a.isObject(b[e],!0)?b[e]:{};return b[e]},e);return e},optionsToObject:function(e){var d={},g=this.series,b=g.options.keys,f=b||g.pointArrayMap||["y"],c=f.length,k=0,r=0;if(t(e)||null===e)d[f[0]]=e;else if(q(e))for(!b&&
e.length>c&&(g=typeof e[0],"string"===g?d.name=e[0]:"number"===g&&(d.x=e[0]),k++);r<c;)b&&void 0===e[k]||(0<f[r].indexOf(".")?a.Point.prototype.setNestedProperty(d,e[k],f[r]):d[f[r]]=e[k]),k++,r++;else"object"===typeof e&&(d=e,e.dataLabels&&(g._hasPointLabels=!0),e.marker&&(g._hasPointMarkers=!0));return d},getClassName:function(){return"highcharts-point"+(this.selected?" highcharts-point-select":"")+(this.negative?" highcharts-negative":"")+(this.isNull?" highcharts-null-point":"")+(void 0!==this.colorIndex?
" highcharts-color-"+this.colorIndex:"")+(this.options.className?" "+this.options.className:"")+(this.zone&&this.zone.className?" "+this.zone.className.replace("highcharts-negative",""):"")},getZone:function(){var a=this.series,d=a.zones,a=a.zoneAxis||"y",g=0,b;for(b=d[g];this[a]>=b.value;)b=d[++g];this.nonZonedColor||(this.nonZonedColor=this.color);this.color=b&&b.color&&!this.options.color?b.color:this.nonZonedColor;return b},destroy:function(){var a=this.series.chart,d=a.hoverPoints,l;a.pointCount--;
d&&(this.setState(),H(d,this),d.length||(a.hoverPoints=null));if(this===a.hoverPoint)this.onMouseOut();if(this.graphic||this.dataLabel||this.dataLabels)g(this),this.destroyElements();this.legendItem&&a.legend.destroyItem(this);for(l in this)this[l]=null},destroyElements:function(a){var e=this,d=[],b,f;a=a||{graphic:1,dataLabel:1};a.graphic&&d.push("graphic","shadowGroup");a.dataLabel&&d.push("dataLabel","dataLabelUpper","connector");for(f=d.length;f--;)b=d[f],e[b]&&(e[b]=e[b].destroy());["dataLabel",
"connector"].forEach(function(b){var c=b+"s";a[b]&&e[c]&&(e[c].forEach(function(a){a.element&&a.destroy()}),delete e[c])})},getLabelConfig:function(){return{x:this.category,y:this.y,color:this.color,colorIndex:this.colorIndex,key:this.name||this.category,series:this.series,point:this,percentage:this.percentage,total:this.total||this.stackTotal}},tooltipFormatter:function(a){var e=this.series,g=e.tooltipOptions,b=u(g.valueDecimals,""),f=g.valuePrefix||"",c=g.valueSuffix||"";e.chart.styledMode&&(a=
e.chart.tooltip.styledModeFormat(a));(e.pointArrayMap||["y"]).forEach(function(e){e="{point."+e;if(f||c)a=a.replace(RegExp(e+"}","g"),f+e+"}"+c);a=a.replace(RegExp(e+"}","g"),e+":,."+b+"f}")});return d(a,{point:this,series:this.series},e.chart.time)},firePointEvent:function(a,d,g){var b=this,e=this.series.options;(e.point.events[a]||b.options&&b.options.events&&b.options.events[a])&&this.importEvents();"click"===a&&e.allowPointSelect&&(g=function(a){b.select&&b.select(null,a.ctrlKey||a.metaKey||a.shiftKey)});
k(this,a,d,g)},visible:!0}});K(F,"parts/Series.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.animObject,H=a.arrayMax,k=a.arrayMin,d=a.correctFloat,q=a.defaultOptions,t=a.defaultPlotOptions,u=a.defined,v=a.erase,p=a.extend,g=a.fireEvent,e=a.isArray,m=a.isNumber,l=a.isString,b=a.merge,f=a.objectEach,c=a.pick,w=a.removeEvent,r=a.splat,J=a.SVGElement,G=a.syncTimeout,B=a.win;a.Series=a.seriesType("line",null,{lineWidth:2,allowPointSelect:!1,showCheckbox:!1,animation:{duration:1E3},events:{},
marker:{lineWidth:0,lineColor:"#ffffff",enabledThreshold:2,radius:4,states:{normal:{animation:!0},hover:{animation:{duration:50},enabled:!0,radiusPlus:2,lineWidthPlus:1},select:{fillColor:"#cccccc",lineColor:"#000000",lineWidth:2}}},point:{events:{}},dataLabels:{align:"center",formatter:function(){return null===this.y?"":a.numberFormat(this.y,-1)},padding:5,style:{fontSize:"11px",fontWeight:"bold",color:"contrast",textOutline:"1px contrast"},verticalAlign:"bottom",x:0,y:0},cropThreshold:300,opacity:1,
pointRange:0,softThreshold:!0,states:{normal:{animation:!0},hover:{animation:{duration:50},lineWidthPlus:1,marker:{},halo:{size:10,opacity:.25}},select:{animation:{duration:0}},inactive:{animation:{duration:50},opacity:.2}},stickyTracking:!0,turboThreshold:1E3,findNearestPointBy:"x"},{isCartesian:!0,pointClass:a.Point,sorted:!0,requireSorting:!0,directTouch:!1,axisTypes:["xAxis","yAxis"],colorCounter:0,parallelArrays:["x","y"],coll:"series",cropShoulder:1,init:function(a,b){g(this,"init",{options:b});
var e=this,d,n=a.series,h;e.chart=a;e.options=b=e.setOptions(b);e.linkedSeries=[];e.bindAxes();p(e,{name:b.name,state:"",visible:!1!==b.visible,selected:!0===b.selected});d=b.events;f(d,function(a,b){e.hcEvents&&e.hcEvents[b]&&-1!==e.hcEvents[b].indexOf(a)||C(e,b,a)});if(d&&d.click||b.point&&b.point.events&&b.point.events.click||b.allowPointSelect)a.runTrackerClick=!0;e.getColor();e.getSymbol();e.parallelArrays.forEach(function(a){e[a+"Data"]||(e[a+"Data"]=[])});e.points||e.setData(b.data,!1);e.isCartesian&&
(a.hasCartesianSeries=!0);n.length&&(h=n[n.length-1]);e._i=c(h&&h._i,-1)+1;a.orderSeries(this.insert(n));g(this,"afterInit")},insert:function(a){var b=this.options.index,e;if(m(b)){for(e=a.length;e--;)if(b>=c(a[e].options.index,a[e]._i)){a.splice(e+1,0,this);break}-1===e&&a.unshift(this);e+=1}else a.push(this);return c(e,a.length-1)},bindAxes:function(){var b=this,c=b.options,e=b.chart,d;g(this,"bindAxes",null,function(){(b.axisTypes||[]).forEach(function(f){e[f].forEach(function(a){d=a.options;if(c[f]===
d.index||void 0!==c[f]&&c[f]===d.id||void 0===c[f]&&0===d.index)b.insert(a.series),b[f]=a,a.isDirty=!0});b[f]||b.optionalAxis===f||a.error(18,!0,e)})})},updateParallelArrays:function(a,b){var c=a.series,e=arguments,d=m(b)?function(e){var h="y"===e&&c.toYData?c.toYData(a):a[e];c[e+"Data"][b]=h}:function(a){Array.prototype[b].apply(c[a+"Data"],Array.prototype.slice.call(e,2))};c.parallelArrays.forEach(d)},hasData:function(){return this.visible&&void 0!==this.dataMax&&void 0!==this.dataMin||this.visible&&
this.yData&&0<this.yData.length},autoIncrement:function(){var a=this.options,b=this.xIncrement,e,d=a.pointIntervalUnit,f=this.chart.time,b=c(b,a.pointStart,0);this.pointInterval=e=c(this.pointInterval,a.pointInterval,1);d&&(a=new f.Date(b),"day"===d?f.set("Date",a,f.get("Date",a)+e):"month"===d?f.set("Month",a,f.get("Month",a)+e):"year"===d&&f.set("FullYear",a,f.get("FullYear",a)+e),e=a.getTime()-b);this.xIncrement=b+e;return b},setOptions:function(a){var e=this.chart,d=e.options,f=d.plotOptions,
n=(e.userOptions||{}).plotOptions||{},h=f[this.type],l=b(a);a=e.styledMode;g(this,"setOptions",{userOptions:l});this.userOptions=l;e=b(h,f.series,l);this.tooltipOptions=b(q.tooltip,q.plotOptions.series&&q.plotOptions.series.tooltip,q.plotOptions[this.type].tooltip,d.tooltip.userOptions,f.series&&f.series.tooltip,f[this.type].tooltip,l.tooltip);this.stickyTracking=c(l.stickyTracking,n[this.type]&&n[this.type].stickyTracking,n.series&&n.series.stickyTracking,this.tooltipOptions.shared&&!this.noSharedTooltip?
!0:e.stickyTracking);null===h.marker&&delete e.marker;this.zoneAxis=e.zoneAxis;d=this.zones=(e.zones||[]).slice();!e.negativeColor&&!e.negativeFillColor||e.zones||(f={value:e[this.zoneAxis+"Threshold"]||e.threshold||0,className:"highcharts-negative"},a||(f.color=e.negativeColor,f.fillColor=e.negativeFillColor),d.push(f));d.length&&u(d[d.length-1].value)&&d.push(a?{}:{color:this.color,fillColor:this.fillColor});g(this,"afterSetOptions",{options:e});return e},getName:function(){return c(this.options.name,
"Series "+(this.index+1))},getCyclic:function(a,b,e){var d,f=this.chart,h=this.userOptions,g=a+"Index",n=a+"Counter",l=e?e.length:c(f.options.chart[a+"Count"],f[a+"Count"]);b||(d=c(h[g],h["_"+g]),u(d)||(f.series.length||(f[n]=0),h["_"+g]=d=f[n]%l,f[n]+=1),e&&(b=e[d]));void 0!==d&&(this[g]=d);this[a]=b},getColor:function(){this.chart.styledMode?this.getCyclic("color"):this.options.colorByPoint?this.options.color=null:this.getCyclic("color",this.options.color||t[this.type].color,this.chart.options.colors)},
getSymbol:function(){this.getCyclic("symbol",this.options.marker.symbol,this.chart.options.symbols)},findPointIndex:function(a,b){var c=a.id;a=a.x;var e=this.points,d,h;c&&(h=(c=this.chart.get(c))&&c.index,void 0!==h&&(d=!0));void 0===h&&m(a)&&(h=this.xData.indexOf(a,b));-1!==h&&void 0!==h&&this.cropped&&(h=h>=this.cropStart?h-this.cropStart:h);!d&&e[h]&&e[h].touched&&(h=void 0);return h},drawLegendSymbol:a.LegendSymbolMixin.drawLineMarker,updateData:function(b){var c=this.options,e=this.points,d=
[],f,h,g,n=this.requireSorting,l=b.length===e.length,k=!0;this.xIncrement=null;b.forEach(function(b,h){var k,r=a.defined(b)&&this.pointClass.prototype.optionsToObject.call({series:this},b)||{};k=r.x;if(r.id||m(k))if(k=this.findPointIndex(r,g),-1===k||void 0===k?d.push(b):e[k]&&b!==c.data[k]?(e[k].update(b,!1,null,!1),e[k].touched=!0,n&&(g=k+1)):e[k]&&(e[k].touched=!0),!l||h!==k||this.hasDerivedData)f=!0},this);if(f)for(b=e.length;b--;)(h=e[b])&&!h.touched&&h.remove(!1);else l?b.forEach(function(a,
b){e[b].update&&a!==e[b].y&&e[b].update(a,!1,null,!1)}):k=!1;e.forEach(function(a){a&&(a.touched=!1)});if(!k)return!1;d.forEach(function(a){this.addPoint(a,!1,null,null,!1)},this);return!0},setData:function(b,d,f,g){var n=this,h=n.points,k=h&&h.length||0,r,E=n.options,p=n.chart,z=null,A=n.xAxis,w=E.turboThreshold,B=this.xData,q=this.yData,t=(r=n.pointArrayMap)&&r.length,u=E.keys,G=0,v=1,J;b=b||[];r=b.length;d=c(d,!0);!1!==g&&r&&k&&!n.cropped&&!n.hasGroupedData&&n.visible&&!n.isSeriesBoosting&&(J=
this.updateData(b));if(!J){n.xIncrement=null;n.colorCounter=0;this.parallelArrays.forEach(function(a){n[a+"Data"].length=0});if(w&&r>w){for(f=0;null===z&&f<r;)z=b[f],f++;if(m(z))for(f=0;f<r;f++)B[f]=this.autoIncrement(),q[f]=b[f];else if(e(z))if(t)for(f=0;f<r;f++)z=b[f],B[f]=z[0],q[f]=z.slice(1,t+1);else for(u&&(G=u.indexOf("x"),v=u.indexOf("y"),G=0<=G?G:0,v=0<=v?v:1),f=0;f<r;f++)z=b[f],B[f]=z[G],q[f]=z[v];else a.error(12,!1,p)}else for(f=0;f<r;f++)void 0!==b[f]&&(z={series:n},n.pointClass.prototype.applyOptions.apply(z,
[b[f]]),n.updateParallelArrays(z,f));q&&l(q[0])&&a.error(14,!0,p);n.data=[];n.options.data=n.userOptions.data=b;for(f=k;f--;)h[f]&&h[f].destroy&&h[f].destroy();A&&(A.minRange=A.userMinRange);n.isDirty=p.isDirtyBox=!0;n.isDirtyData=!!h;f=!1}"point"===E.legendType&&(this.processData(),this.generatePoints());d&&p.redraw(f)},processData:function(b){var c=this.xData,e=this.yData,d=c.length,f;f=0;var h,g,n=this.xAxis,l,m=this.options;l=m.cropThreshold;var k=this.getExtremesFromAll||m.getExtremesFromAll,
r=this.isCartesian,m=n&&n.val2lin,p=n&&n.isLog,w=this.requireSorting,B,q;if(r&&!this.isDirty&&!n.isDirty&&!this.yAxis.isDirty&&!b)return!1;n&&(b=n.getExtremes(),B=b.min,q=b.max);r&&this.sorted&&!k&&(!l||d>l||this.forceCrop)&&(c[d-1]<B||c[0]>q?(c=[],e=[]):this.yData&&(c[0]<B||c[d-1]>q)&&(f=this.cropData(this.xData,this.yData,B,q),c=f.xData,e=f.yData,f=f.start,h=!0));for(l=c.length||1;--l;)d=p?m(c[l])-m(c[l-1]):c[l]-c[l-1],0<d&&(void 0===g||d<g)?g=d:0>d&&w&&(a.error(15,!1,this.chart),w=!1);this.cropped=
h;this.cropStart=f;this.processedXData=c;this.processedYData=e;this.closestPointRange=g},cropData:function(a,b,e,d,f){var h=a.length,g=0,n=h,l;f=c(f,this.cropShoulder);for(l=0;l<h;l++)if(a[l]>=e){g=Math.max(0,l-f);break}for(e=l;e<h;e++)if(a[e]>d){n=e+f;break}return{xData:a.slice(g,n),yData:b.slice(g,n),start:g,end:n}},generatePoints:function(){var a=this.options,b=a.data,c=this.data,e,d=this.processedXData,h=this.processedYData,f=this.pointClass,l=d.length,m=this.cropStart||0,k,w=this.hasGroupedData,
a=a.keys,B,q=[],t;c||w||(c=[],c.length=b.length,c=this.data=c);a&&w&&(this.options.keys=!1);for(t=0;t<l;t++)k=m+t,w?(B=(new f).init(this,[d[t]].concat(r(h[t]))),B.dataGroup=this.groupMap[t],B.dataGroup.options&&(B.options=B.dataGroup.options,p(B,B.dataGroup.options),delete B.dataLabels)):(B=c[k])||void 0===b[k]||(c[k]=B=(new f).init(this,b[k],d[t])),B&&(B.index=k,q[t]=B);this.options.keys=a;if(c&&(l!==(e=c.length)||w))for(t=0;t<e;t++)t!==m||w||(t+=l),c[t]&&(c[t].destroyElements(),c[t].plotX=void 0);
this.data=c;this.points=q;g(this,"afterGeneratePoints")},getXExtremes:function(a){return{min:k(a),max:H(a)}},getExtremes:function(a){var b=this.yAxis,c=this.processedXData,d,f=[],h=0;d=this.xAxis.getExtremes();var n=d.min,l=d.max,r,p,w=this.requireSorting?this.cropShoulder:0,B,q;a=a||this.stackedYData||this.processedYData||[];d=a.length;for(q=0;q<d;q++)if(p=c[q],B=a[q],r=(m(B,!0)||e(B))&&(!b.positiveValuesOnly||B.length||0<B),p=this.getExtremesFromAll||this.options.getExtremesFromAll||this.cropped||
(c[q+w]||p)>=n&&(c[q-w]||p)<=l,r&&p)if(r=B.length)for(;r--;)"number"===typeof B[r]&&(f[h++]=B[r]);else f[h++]=B;this.dataMin=k(f);this.dataMax=H(f);g(this,"afterGetExtremes")},translate:function(){this.processedXData||this.processData();this.generatePoints();var a=this.options,b=a.stacking,f=this.xAxis,l=f.categories,k=this.yAxis,h=this.points,r=h.length,p=!!this.modifyValue,w,B=this.pointPlacementToXValue(),q=m(B),t=a.threshold,x=a.startFromThreshold?t:0,G,v,J,C,H=this.zoneAxis||"y",I=Number.MAX_VALUE;
for(w=0;w<r;w++){var F=h[w],K=F.x;v=F.y;var V=F.low,N=b&&k.stacks[(this.negStacks&&v<(x?0:t)?"-":"")+this.stackKey],W,Y;k.positiveValuesOnly&&null!==v&&0>=v&&(F.isNull=!0);F.plotX=G=d(Math.min(Math.max(-1E5,f.translate(K,0,0,0,1,B,"flags"===this.type)),1E5));b&&this.visible&&!F.isNull&&N&&N[K]&&(C=this.getStackIndicator(C,K,this.index),W=N[K],Y=W.points[C.key]);e(Y)&&(V=Y[0],v=Y[1],V===x&&C.key===N[K].base&&(V=c(m(t)&&t,k.min)),k.positiveValuesOnly&&0>=V&&(V=null),F.total=F.stackTotal=W.total,F.percentage=
W.total&&F.y/W.total*100,F.stackY=v,W.setOffset(this.pointXOffset||0,this.barW||0));F.yBottom=u(V)?Math.min(Math.max(-1E5,k.translate(V,0,1,0,1)),1E5):null;p&&(v=this.modifyValue(v,F));F.plotY=v="number"===typeof v&&Infinity!==v?Math.min(Math.max(-1E5,k.translate(v,0,1,0,1)),1E5):void 0;F.isInside=void 0!==v&&0<=v&&v<=k.len&&0<=G&&G<=f.len;F.clientX=q?d(f.translate(K,0,0,0,1,B)):G;F.negative=F[H]<(a[H+"Threshold"]||t||0);F.category=l&&void 0!==l[F.x]?l[F.x]:F.x;F.isNull||(void 0!==J&&(I=Math.min(I,
Math.abs(G-J))),J=G);F.zone=this.zones.length&&F.getZone()}this.closestPointRangePx=I;g(this,"afterTranslate")},getValidPoints:function(a,b,c){var e=this.chart;return(a||this.points||[]).filter(function(a){return b&&!e.isInsidePlot(a.plotX,a.plotY,e.inverted)?!1:c||!a.isNull})},setClip:function(a){var b=this.chart,c=this.options,e=b.renderer,d=b.inverted,h=this.clipBox,f=h||b.clipBox,g=this.sharedClipKey||["_sharedClip",a&&a.duration,a&&a.easing,f.height,c.xAxis,c.yAxis].join(),n=b[g],l=b[g+"m"];
n||(a&&(f.width=0,d&&(f.x=b.plotSizeX),b[g+"m"]=l=e.clipRect(d?b.plotSizeX+99:-99,d?-b.plotLeft:-b.plotTop,99,d?b.chartWidth:b.chartHeight)),b[g]=n=e.clipRect(f),n.count={length:0});a&&!n.count[this.index]&&(n.count[this.index]=!0,n.count.length+=1);!1!==c.clip&&(this.group.clip(a||h?n:b.clipRect),this.markerGroup.clip(l),this.sharedClipKey=g);a||(n.count[this.index]&&(delete n.count[this.index],--n.count.length),0===n.count.length&&g&&b[g]&&(h||(b[g]=b[g].destroy()),b[g+"m"]&&(b[g+"m"]=b[g+"m"].destroy())))},
animate:function(a){var b=this.chart,c=I(this.options.animation),e;a?this.setClip(c):(e=this.sharedClipKey,(a=b[e])&&a.animate({width:b.plotSizeX,x:0},c),b[e+"m"]&&b[e+"m"].animate({width:b.plotSizeX+99,x:b.inverted?0:-99},c),this.animate=null)},afterAnimate:function(){this.setClip();g(this,"afterAnimate");this.finishedAnimating=!0},drawPoints:function(){var a=this.points,b=this.chart,e,d,f,h,g,l=this.options.marker,m,k,r,p=this[this.specialGroup]||this.markerGroup;e=this.xAxis;var w,B=c(l.enabled,
!e||e.isRadial?!0:null,this.closestPointRangePx>=l.enabledThreshold*l.radius);if(!1!==l.enabled||this._hasPointMarkers)for(e=0;e<a.length;e++)if(d=a[e],g=(h=d.graphic)?"animate":"attr",m=d.marker||{},k=!!d.marker,f=B&&void 0===m.enabled||m.enabled,r=!1!==d.isInside,f&&!d.isNull){f=c(m.symbol,this.symbol);w=this.markerAttribs(d,d.selected&&"select");h?h[r?"show":"hide"](!0).animate(w):r&&(0<w.width||d.hasImage)&&(d.graphic=h=b.renderer.symbol(f,w.x,w.y,w.width,w.height,k?m:l).add(p));if(h&&!b.styledMode)h[g](this.pointAttribs(d,
d.selected&&"select"));h&&h.addClass(d.getClassName(),!0)}else h&&(d.graphic=h.destroy())},markerAttribs:function(a,b){var e=this.options.marker,d=a.marker||{},f=d.symbol||e.symbol,h=c(d.radius,e.radius);b&&(e=e.states[b],b=d.states&&d.states[b],h=c(b&&b.radius,e&&e.radius,h+(e&&e.radiusPlus||0)));a.hasImage=f&&0===f.indexOf("url");a.hasImage&&(h=0);a={x:Math.floor(a.plotX)-h,y:a.plotY-h};h&&(a.width=a.height=2*h);return a},pointAttribs:function(a,b){var e=this.options.marker,d=a&&a.options,f=d&&
d.marker||{},h=this.color,g=d&&d.color,n=a&&a.color,d=c(f.lineWidth,e.lineWidth),l=a&&a.zone&&a.zone.color;a=1;h=g||l||n||h;g=f.fillColor||e.fillColor||h;h=f.lineColor||e.lineColor||h;b&&(e=e.states[b],b=f.states&&f.states[b]||{},d=c(b.lineWidth,e.lineWidth,d+c(b.lineWidthPlus,e.lineWidthPlus,0)),g=b.fillColor||e.fillColor||g,h=b.lineColor||e.lineColor||h,a=c(b.opacity,e.opacity,a));return{stroke:h,"stroke-width":d,fill:g,opacity:a}},destroy:function(b){var c=this,e=c.chart,d=/AppleWebKit\/533/.test(B.navigator.userAgent),
n,h,l=c.data||[],m,k;g(c,"destroy");b||w(c);(c.axisTypes||[]).forEach(function(a){(k=c[a])&&k.series&&(v(k.series,c),k.isDirty=k.forceRedraw=!0)});c.legendItem&&c.chart.legend.destroyItem(c);for(h=l.length;h--;)(m=l[h])&&m.destroy&&m.destroy();c.points=null;a.clearTimeout(c.animationTimeout);f(c,function(a,b){a instanceof J&&!a.survive&&(n=d&&"group"===b?"hide":"destroy",a[n]())});e.hoverSeries===c&&(e.hoverSeries=null);v(e.series,c);e.orderSeries();f(c,function(a,e){b&&"hcEvents"===e||delete c[e]})},
getGraphPath:function(a,b,c){var e=this,d=e.options,h=d.step,f,g=[],n=[],l;a=a||e.points;(f=a.reversed)&&a.reverse();(h={right:1,center:2}[h]||h&&3)&&f&&(h=4-h);!d.connectNulls||b||c||(a=this.getValidPoints(a));a.forEach(function(f,m){var k=f.plotX,r=f.plotY,p=a[m-1];(f.leftCliff||p&&p.rightCliff)&&!c&&(l=!0);f.isNull&&!u(b)&&0<m?l=!d.connectNulls:f.isNull&&!b?l=!0:(0===m||l?m=["M",f.plotX,f.plotY]:e.getPointSpline?m=e.getPointSpline(a,f,m):h?(m=1===h?["L",p.plotX,r]:2===h?["L",(p.plotX+k)/2,p.plotY,
"L",(p.plotX+k)/2,r]:["L",k,p.plotY],m.push("L",k,r)):m=["L",k,r],n.push(f.x),h&&(n.push(f.x),2===h&&n.push(f.x)),g.push.apply(g,m),l=!1)});g.xMap=n;return e.graphPath=g},drawGraph:function(){var a=this,b=this.options,c=(this.gappedPath||this.getGraphPath).call(this),e=this.chart.styledMode,d=[["graph","highcharts-graph"]];e||d[0].push(b.lineColor||this.color||"#cccccc",b.dashStyle);d=a.getZonesGraphs(d);d.forEach(function(d,f){var h=d[0],g=a[h],n=g?"animate":"attr";g?(g.endX=a.preventGraphAnimation?
null:c.xMap,g.animate({d:c})):c.length&&(a[h]=g=a.chart.renderer.path(c).addClass(d[1]).attr({zIndex:1}).add(a.group));g&&!e&&(h={stroke:d[2],"stroke-width":b.lineWidth,fill:a.fillGraph&&a.color||"none"},d[3]?h.dashstyle=d[3]:"square"!==b.linecap&&(h["stroke-linecap"]=h["stroke-linejoin"]="round"),g[n](h).shadow(2>f&&b.shadow));g&&(g.startX=c.xMap,g.isArea=c.isArea)})},getZonesGraphs:function(a){this.zones.forEach(function(b,c){c=["zone-graph-"+c,"highcharts-graph highcharts-zone-graph-"+c+" "+(b.className||
"")];this.chart.styledMode||c.push(b.color||this.color,b.dashStyle||this.options.dashStyle);a.push(c)},this);return a},applyZones:function(){var a=this,b=this.chart,e=b.renderer,d=this.zones,f,h,g=this.clips||[],l,m=this.graph,k=this.area,r=Math.max(b.chartWidth,b.chartHeight),p=this[(this.zoneAxis||"y")+"Axis"],w,B,q=b.inverted,t,u,G,v,J=!1;d.length&&(m||k)&&p&&void 0!==p.min&&(B=p.reversed,t=p.horiz,m&&!this.showLine&&m.hide(),k&&k.hide(),w=p.getExtremes(),d.forEach(function(d,n){f=B?t?b.plotWidth:
0:t?0:p.toPixels(w.min)||0;f=Math.min(Math.max(c(h,f),0),r);h=Math.min(Math.max(Math.round(p.toPixels(c(d.value,w.max),!0)||0),0),r);J&&(f=h=p.toPixels(w.max));u=Math.abs(f-h);G=Math.min(f,h);v=Math.max(f,h);p.isXAxis?(l={x:q?v:G,y:0,width:u,height:r},t||(l.x=b.plotHeight-l.x)):(l={x:0,y:q?v:G,width:r,height:u},t&&(l.y=b.plotWidth-l.y));q&&e.isVML&&(l=p.isXAxis?{x:0,y:B?G:v,height:l.width,width:b.chartWidth}:{x:l.y-b.plotLeft-b.spacingBox.x,y:0,width:l.height,height:b.chartHeight});g[n]?g[n].animate(l):
(g[n]=e.clipRect(l),m&&a["zone-graph-"+n].clip(g[n]),k&&a["zone-area-"+n].clip(g[n]));J=d.value>w.max;a.resetZones&&0===h&&(h=void 0)}),this.clips=g)},invertGroups:function(a){function b(){["group","markerGroup"].forEach(function(b){c[b]&&(e.renderer.isVML&&c[b].attr({width:c.yAxis.len,height:c.xAxis.len}),c[b].width=c.yAxis.len,c[b].height=c.xAxis.len,c[b].invert(a))})}var c=this,e=c.chart,d;c.xAxis&&(d=C(e,"resize",b),C(c,"destroy",d),b(a),c.invertGroups=b)},plotGroup:function(a,b,c,e,d){var h=
this[a],f=!h;f&&(this[a]=h=this.chart.renderer.g().attr({zIndex:e||.1}).add(d));h.addClass("highcharts-"+b+" highcharts-series-"+this.index+" highcharts-"+this.type+"-series "+(u(this.colorIndex)?"highcharts-color-"+this.colorIndex+" ":"")+(this.options.className||"")+(h.hasClass("highcharts-tracker")?" highcharts-tracker":""),!0);h.attr({visibility:c})[f?"attr":"animate"](this.getPlotBox());return h},getPlotBox:function(){var a=this.chart,b=this.xAxis,c=this.yAxis;a.inverted&&(b=c,c=this.xAxis);
return{translateX:b?b.left:a.plotLeft,translateY:c?c.top:a.plotTop,scaleX:1,scaleY:1}},render:function(){var a=this,b=a.chart,c,e=a.options,d=!!a.animate&&b.renderer.isSVG&&I(e.animation).duration,h=a.visible?"inherit":"hidden",f=e.zIndex,l=a.hasRendered,m=b.seriesGroup,k=b.inverted;g(this,"render");c=a.plotGroup("group","series",h,f,m);a.markerGroup=a.plotGroup("markerGroup","markers",h,f,m);d&&a.animate(!0);c.inverted=a.isCartesian||a.invertable?k:!1;a.drawGraph&&(a.drawGraph(),a.applyZones());
a.visible&&a.drawPoints();a.drawDataLabels&&a.drawDataLabels();a.redrawPoints&&a.redrawPoints();a.drawTracker&&!1!==a.options.enableMouseTracking&&a.drawTracker();a.invertGroups(k);!1===e.clip||a.sharedClipKey||l||c.clip(b.clipRect);d&&a.animate();l||(a.animationTimeout=G(function(){a.afterAnimate()},d));a.isDirty=!1;a.hasRendered=!0;g(a,"afterRender")},redraw:function(){var a=this.chart,b=this.isDirty||this.isDirtyData,e=this.group,d=this.xAxis,f=this.yAxis;e&&(a.inverted&&e.attr({width:a.plotWidth,
height:a.plotHeight}),e.animate({translateX:c(d&&d.left,a.plotLeft),translateY:c(f&&f.top,a.plotTop)}));this.translate();this.render();b&&delete this.kdTree},kdAxisArray:["clientX","plotY"],searchPoint:function(a,b){var c=this.xAxis,e=this.yAxis,d=this.chart.inverted;return this.searchKDTree({clientX:d?c.len-a.chartY+c.pos:a.chartX-c.pos,plotY:d?e.len-a.chartX+e.pos:a.chartY-e.pos},b,a)},buildKDTree:function(a){function b(a,e,d){var f,h;if(h=a&&a.length)return f=c.kdAxisArray[e%d],a.sort(function(a,
b){return a[f]-b[f]}),h=Math.floor(h/2),{point:a[h],left:b(a.slice(0,h),e+1,d),right:b(a.slice(h+1),e+1,d)}}this.buildingKdTree=!0;var c=this,e=-1<c.options.findNearestPointBy.indexOf("y")?2:1;delete c.kdTree;G(function(){c.kdTree=b(c.getValidPoints(null,!c.directTouch),e,e);c.buildingKdTree=!1},c.options.kdNow||a&&"touchstart"===a.type?0:1)},searchKDTree:function(a,b,c){function e(a,b,c,h){var n=b.point,m=d.kdAxisArray[c%h],k,r,p=n;r=u(a[f])&&u(n[f])?Math.pow(a[f]-n[f],2):null;k=u(a[g])&&u(n[g])?
Math.pow(a[g]-n[g],2):null;k=(r||0)+(k||0);n.dist=u(k)?Math.sqrt(k):Number.MAX_VALUE;n.distX=u(r)?Math.sqrt(r):Number.MAX_VALUE;m=a[m]-n[m];k=0>m?"left":"right";r=0>m?"right":"left";b[k]&&(k=e(a,b[k],c+1,h),p=k[l]<p[l]?k:n);b[r]&&Math.sqrt(m*m)<p[l]&&(a=e(a,b[r],c+1,h),p=a[l]<p[l]?a:p);return p}var d=this,f=this.kdAxisArray[0],g=this.kdAxisArray[1],l=b?"distX":"dist";b=-1<d.options.findNearestPointBy.indexOf("y")?2:1;this.kdTree||this.buildingKdTree||this.buildKDTree(c);if(this.kdTree)return e(a,
this.kdTree,b,b)},pointPlacementToXValue:function(){var a=this.options.pointPlacement;"between"===a&&(a=.5);m(a)&&(a*=c(this.options.pointRange||this.xAxis.pointRange));return a}})});K(F,"parts/Stacking.js",[F["parts/Globals.js"]],function(a){var C=a.Axis,I=a.Chart,H=a.correctFloat,k=a.defined,d=a.destroyObjectProperties,q=a.format,t=a.objectEach,u=a.pick,v=a.Series;a.StackItem=function(a,d,e,m,l){var b=a.chart.inverted;this.axis=a;this.isNegative=e;this.options=d;this.x=m;this.total=null;this.points=
{};this.stack=l;this.rightCliff=this.leftCliff=0;this.alignOptions={align:d.align||(b?e?"left":"right":"center"),verticalAlign:d.verticalAlign||(b?"middle":e?"bottom":"top"),y:u(d.y,b?4:e?14:-6),x:u(d.x,b?e?-6:6:0)};this.textAlign=d.textAlign||(b?e?"right":"left":"center")};a.StackItem.prototype={destroy:function(){d(this,this.axis)},render:function(a){var d=this.axis.chart,e=this.options,m=e.format,m=m?q(m,this,d.time):e.formatter.call(this);this.label?this.label.attr({text:m,visibility:"hidden"}):
this.label=d.renderer.text(m,null,null,e.useHTML).css(e.style).attr({align:this.textAlign,rotation:e.rotation,visibility:"hidden"}).add(a);this.label.labelrank=d.plotHeight},setOffset:function(a,d){var e=this.axis,g=e.chart,l=e.translate(e.usePercentage?100:this.total,0,0,0,1),b=e.translate(0),b=k(l)&&Math.abs(l-b);a=g.xAxis[0].translate(this.x)+a;e=k(l)&&this.getStackBox(g,this,a,l,d,b,e);(d=this.label)&&e&&(d.align(this.alignOptions,null,e),e=d.alignAttr,d[!1===this.options.crop||g.isInsidePlot(e.x,
e.y)?"show":"hide"](!0))},getStackBox:function(a,d,e,m,l,b,f){var c=d.axis.reversed,g=a.inverted;a=f.height+f.pos-(g?a.plotLeft:a.plotTop);d=d.isNegative&&!c||!d.isNegative&&c;return{x:g?d?m:m-b:e,y:g?a-e-l:d?a-m-b:a-m,width:g?b:l,height:g?l:b}}};I.prototype.getStacks=function(){var a=this;a.yAxis.forEach(function(a){a.stacks&&a.hasVisibleSeries&&(a.oldStacks=a.stacks)});a.series.forEach(function(d){!d.options.stacking||!0!==d.visible&&!1!==a.options.chart.ignoreHiddenSeries||(d.stackKey=d.type+u(d.options.stack,
""))})};C.prototype.buildStacks=function(){var a=this.series,d=u(this.options.reversedStacks,!0),e=a.length,m;if(!this.isXAxis){this.usePercentage=!1;for(m=e;m--;)a[d?m:e-m-1].setStackedPoints();for(m=0;m<e;m++)a[m].modifyStacks()}};C.prototype.renderStackTotals=function(){var a=this.chart,d=a.renderer,e=this.stacks,m=this.stackTotalGroup;m||(this.stackTotalGroup=m=d.g("stack-labels").attr({visibility:"visible",zIndex:6}).add());m.translate(a.plotLeft,a.plotTop);t(e,function(a){t(a,function(a){a.render(m)})})};
C.prototype.resetStacks=function(){var a=this,d=a.stacks;a.isXAxis||t(d,function(e){t(e,function(d,g){d.touched<a.stacksTouched?(d.destroy(),delete e[g]):(d.total=null,d.cumulative=null)})})};C.prototype.cleanStacks=function(){var a;this.isXAxis||(this.oldStacks&&(a=this.stacks=this.oldStacks),t(a,function(a){t(a,function(a){a.cumulative=a.total})}))};v.prototype.setStackedPoints=function(){if(this.options.stacking&&(!0===this.visible||!1===this.chart.options.chart.ignoreHiddenSeries)){var d=this.processedXData,
g=this.processedYData,e=[],m=g.length,l=this.options,b=l.threshold,f=u(l.startFromThreshold&&b,0),c=l.stack,l=l.stacking,w=this.stackKey,r="-"+w,q=this.negStacks,t=this.yAxis,B=t.stacks,n=t.oldStacks,E,z,A,D,h,y,v;t.stacksTouched+=1;for(h=0;h<m;h++)y=d[h],v=g[h],E=this.getStackIndicator(E,y,this.index),D=E.key,A=(z=q&&v<(f?0:b))?r:w,B[A]||(B[A]={}),B[A][y]||(n[A]&&n[A][y]?(B[A][y]=n[A][y],B[A][y].total=null):B[A][y]=new a.StackItem(t,t.options.stackLabels,z,y,c)),A=B[A][y],null!==v?(A.points[D]=A.points[this.index]=
[u(A.cumulative,f)],k(A.cumulative)||(A.base=D),A.touched=t.stacksTouched,0<E.index&&!1===this.singleStacks&&(A.points[D][0]=A.points[this.index+","+y+",0"][0])):A.points[D]=A.points[this.index]=null,"percent"===l?(z=z?w:r,q&&B[z]&&B[z][y]?(z=B[z][y],A.total=z.total=Math.max(z.total,A.total)+Math.abs(v)||0):A.total=H(A.total+(Math.abs(v)||0))):A.total=H(A.total+(v||0)),A.cumulative=u(A.cumulative,f)+(v||0),null!==v&&(A.points[D].push(A.cumulative),e[h]=A.cumulative);"percent"===l&&(t.usePercentage=
!0);this.stackedYData=e;t.oldStacks={}}};v.prototype.modifyStacks=function(){var a=this,d=a.stackKey,e=a.yAxis.stacks,m=a.processedXData,l,b=a.options.stacking;a[b+"Stacker"]&&[d,"-"+d].forEach(function(d){for(var c=m.length,f,g;c--;)if(f=m[c],l=a.getStackIndicator(l,f,a.index,d),g=(f=e[d]&&e[d][f])&&f.points[l.key])a[b+"Stacker"](g,f,c)})};v.prototype.percentStacker=function(a,d,e){d=d.total?100/d.total:0;a[0]=H(a[0]*d);a[1]=H(a[1]*d);this.stackedYData[e]=a[1]};v.prototype.getStackIndicator=function(a,
d,e,m){!k(a)||a.x!==d||m&&a.key!==m?a={x:d,index:0,key:m}:a.index++;a.key=[e,d,a.index].join();return a}});K(F,"parts/Dynamics.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,I=a.animate,H=a.Axis,k=a.Chart,d=a.createElement,q=a.css,t=a.defined,u=a.erase,v=a.extend,p=a.fireEvent,g=a.isNumber,e=a.isObject,m=a.isArray,l=a.merge,b=a.objectEach,f=a.pick,c=a.Point,w=a.Series,r=a.seriesTypes,J=a.setAnimation,G=a.splat;a.cleanRecursively=function(c,d){var f={};b(c,function(b,g){if(e(c[g],!0)&&d[g])b=
a.cleanRecursively(c[g],d[g]),Object.keys(b).length&&(f[g]=b);else if(e(c[g])||c[g]!==d[g])f[g]=c[g]});return f};v(k.prototype,{addSeries:function(a,b,c){var e,d=this;a&&(b=f(b,!0),p(d,"addSeries",{options:a},function(){e=d.initSeries(a);d.isDirtyLegend=!0;d.linkSeries();p(d,"afterAddSeries",{series:e});b&&d.redraw(c)}));return e},addAxis:function(a,b,c,e){var d=b?"xAxis":"yAxis",g=this.options;a=l(a,{index:this[d].length,isX:b});b=new H(this,a);g[d]=G(g[d]||{});g[d].push(a);f(c,!0)&&this.redraw(e);
return b},showLoading:function(a){var b=this,c=b.options,e=b.loadingDiv,f=c.loading,g=function(){e&&q(e,{left:b.plotLeft+"px",top:b.plotTop+"px",width:b.plotWidth+"px",height:b.plotHeight+"px"})};e||(b.loadingDiv=e=d("div",{className:"highcharts-loading highcharts-loading-hidden"},null,b.container),b.loadingSpan=d("span",{className:"highcharts-loading-inner"},null,e),C(b,"redraw",g));e.className="highcharts-loading";b.loadingSpan.innerHTML=a||c.lang.loading;b.styledMode||(q(e,v(f.style,{zIndex:10})),
q(b.loadingSpan,f.labelStyle),b.loadingShown||(q(e,{opacity:0,display:""}),I(e,{opacity:f.style.opacity||.5},{duration:f.showDuration||0})));b.loadingShown=!0;g()},hideLoading:function(){var a=this.options,b=this.loadingDiv;b&&(b.className="highcharts-loading highcharts-loading-hidden",this.styledMode||I(b,{opacity:0},{duration:a.loading.hideDuration||100,complete:function(){q(b,{display:"none"})}}));this.loadingShown=!1},propsRequireDirtyBox:"backgroundColor borderColor borderWidth margin marginTop marginRight marginBottom marginLeft spacing spacingTop spacingRight spacingBottom spacingLeft borderRadius plotBackgroundColor plotBackgroundImage plotBorderColor plotBorderWidth plotShadow shadow".split(" "),
propsRequireUpdateSeries:"chart.inverted chart.polar chart.ignoreHiddenSeries chart.type colors plotOptions time tooltip".split(" "),collectionsWithUpdate:"xAxis yAxis zAxis series colorAxis pane".split(" "),update:function(c,e,d,m){var n=this,k={credits:"addCredits",title:"setTitle",subtitle:"setSubtitle"},h,r,w,q=[];p(n,"update",{options:c});c.isResponsiveOptions||n.setResponsive(!1,!0);c=a.cleanRecursively(c,n.options);if(h=c.chart){l(!0,n.options.chart,h);"className"in h&&n.setClassName(h.className);
"reflow"in h&&n.setReflow(h.reflow);if("inverted"in h||"polar"in h||"type"in h)n.propFromSeries(),r=!0;"alignTicks"in h&&(r=!0);b(h,function(a,b){-1!==n.propsRequireUpdateSeries.indexOf("chart."+b)&&(w=!0);-1!==n.propsRequireDirtyBox.indexOf(b)&&(n.isDirtyBox=!0)});!n.styledMode&&"style"in h&&n.renderer.setStyle(h.style)}!n.styledMode&&c.colors&&(this.options.colors=c.colors);c.plotOptions&&l(!0,this.options.plotOptions,c.plotOptions);b(c,function(a,b){if(n[b]&&"function"===typeof n[b].update)n[b].update(a,
!1);else if("function"===typeof n[k[b]])n[k[b]](a);"chart"!==b&&-1!==n.propsRequireUpdateSeries.indexOf(b)&&(w=!0)});this.collectionsWithUpdate.forEach(function(a){var b;c[a]&&("series"===a&&(b=[],n[a].forEach(function(a,c){a.options.isInternal||b.push(f(a.options.index,c))})),G(c[a]).forEach(function(c,e){(e=t(c.id)&&n.get(c.id)||n[a][b?b[e]:e])&&e.coll===a&&(e.update(c,!1),d&&(e.touched=!0));if(!e&&d)if("series"===a)n.addSeries(c,!1).touched=!0;else if("xAxis"===a||"yAxis"===a)n.addAxis(c,"xAxis"===
a,!1).touched=!0}),d&&n[a].forEach(function(a){a.touched||a.options.isInternal?delete a.touched:q.push(a)}))});q.forEach(function(a){a.remove&&a.remove(!1)});r&&n.axes.forEach(function(a){a.update({},!1)});w&&n.series.forEach(function(a){a.update({},!1)});c.loading&&l(!0,n.options.loading,c.loading);r=h&&h.width;h=h&&h.height;a.isString(h)&&(h=a.relativeLength(h,r||n.chartWidth));g(r)&&r!==n.chartWidth||g(h)&&h!==n.chartHeight?n.setSize(r,h,m):f(e,!0)&&n.redraw(m);p(n,"afterUpdate",{options:c,redraw:e,
animation:m})},setSubtitle:function(a){this.setTitle(void 0,a)}});v(c.prototype,{update:function(a,b,c,d){function g(){l.applyOptions(a);null===l.y&&n&&(l.graphic=n.destroy());e(a,!0)&&(n&&n.element&&a&&a.marker&&void 0!==a.marker.symbol&&(l.graphic=n.destroy()),a&&a.dataLabels&&l.dataLabel&&(l.dataLabel=l.dataLabel.destroy()),l.connector&&(l.connector=l.connector.destroy()));m=l.index;h.updateParallelArrays(l,m);r.data[m]=e(r.data[m],!0)||e(a,!0)?l.options:f(a,r.data[m]);h.isDirty=h.isDirtyData=
!0;!h.fixedBox&&h.hasCartesianSeries&&(k.isDirtyBox=!0);"point"===r.legendType&&(k.isDirtyLegend=!0);b&&k.redraw(c)}var l=this,h=l.series,n=l.graphic,m,k=h.chart,r=h.options;b=f(b,!0);!1===d?g():l.firePointEvent("update",{options:a},g)},remove:function(a,b){this.series.removePoint(this.series.data.indexOf(this),a,b)}});v(w.prototype,{addPoint:function(a,b,c,e,d){var g=this.options,h=this.data,l=this.chart,n=this.xAxis,n=n&&n.hasNames&&n.names,m=g.data,k,r,w=this.xData,q,t;b=f(b,!0);k={series:this};
this.pointClass.prototype.applyOptions.apply(k,[a]);t=k.x;q=w.length;if(this.requireSorting&&t<w[q-1])for(r=!0;q&&w[q-1]>t;)q--;this.updateParallelArrays(k,"splice",q,0,0);this.updateParallelArrays(k,q);n&&k.name&&(n[t]=k.name);m.splice(q,0,a);r&&(this.data.splice(q,0,null),this.processData());"point"===g.legendType&&this.generatePoints();c&&(h[0]&&h[0].remove?h[0].remove(!1):(h.shift(),this.updateParallelArrays(k,"shift"),m.shift()));!1!==d&&p(this,"addPoint",{point:k});this.isDirtyData=this.isDirty=
!0;b&&l.redraw(e)},removePoint:function(a,b,c){var e=this,d=e.data,g=d[a],h=e.points,l=e.chart,n=function(){h&&h.length===d.length&&h.splice(a,1);d.splice(a,1);e.options.data.splice(a,1);e.updateParallelArrays(g||{series:e},"splice",a,1);g&&g.destroy();e.isDirty=!0;e.isDirtyData=!0;b&&l.redraw()};J(c,l);b=f(b,!0);g?g.firePointEvent("remove",null,n):n()},remove:function(a,b,c,e){function d(){g.destroy(e);g.remove=null;h.isDirtyLegend=h.isDirtyBox=!0;h.linkSeries();f(a,!0)&&h.redraw(b)}var g=this,h=
g.chart;!1!==c?p(g,"remove",null,d):d()},update:function(b,c){b=a.cleanRecursively(b,this.userOptions);p(this,"update",{options:b});var e=this,d=e.chart,g=e.userOptions,n,h=e.initialType||e.type,m=b.type||g.type||d.options.chart.type,k=!(this.hasDerivedData||b.dataGrouping||m&&m!==this.type||void 0!==b.pointStart||b.pointInterval||b.pointIntervalUnit||b.keys),w=r[h].prototype,q,t=["group","markerGroup","dataLabelsGroup"],B=["navigatorSeries","baseSeries"],u=e.finishedAnimating&&{animation:!1},G={};
k&&(B.push("data","isDirtyData","points","processedXData","processedYData","xIncrement"),!1!==b.visible&&B.push("area","graph"),e.parallelArrays.forEach(function(a){B.push(a+"Data")}),b.data&&this.setData(b.data,!1));b=l(g,u,{index:void 0===g.index?e.index:g.index,pointStart:f(g.pointStart,e.xData[0])},!k&&{data:e.options.data},b);B=t.concat(B);B.forEach(function(a){B[a]=e[a];delete e[a]});e.remove(!1,null,!1,!0);for(q in w)e[q]=void 0;r[m||h]?v(e,r[m||h].prototype):a.error(17,!0,d);B.forEach(function(a){e[a]=
B[a]});e.init(d,b);k&&this.points&&(n=e.options,!1===n.visible?(G.graphic=1,G.dataLabel=1):(n.marker&&!1===n.marker.enabled&&(G.graphic=1),n.dataLabels&&!1===n.dataLabels.enabled&&(G.dataLabel=1)),this.points.forEach(function(a){a&&a.series&&(a.resolveColor(),Object.keys(G).length&&a.destroyElements(G),!1===n.showInLegend&&a.legendItem&&d.legend.destroyItem(a))},this));b.zIndex!==g.zIndex&&t.forEach(function(a){e[a]&&e[a].attr({zIndex:b.zIndex})});e.initialType=h;d.linkSeries();p(this,"afterUpdate");
f(c,!0)&&d.redraw(k?void 0:!1)},setName:function(a){this.name=this.options.name=this.userOptions.name=a;this.chart.isDirtyLegend=!0}});v(H.prototype,{update:function(a,c){var e=this.chart,d=a&&a.events||{};a=l(this.userOptions,a);e.options[this.coll].indexOf&&(e.options[this.coll][e.options[this.coll].indexOf(this.userOptions)]=a);b(e.options[this.coll].events,function(a,b){"undefined"===typeof d[b]&&(d[b]=void 0)});this.destroy(!0);this.init(e,v(a,{events:d}));e.isDirtyBox=!0;f(c,!0)&&e.redraw()},
remove:function(a){for(var b=this.chart,c=this.coll,e=this.series,d=e.length;d--;)e[d]&&e[d].remove(!1);u(b.axes,this);u(b[c],this);m(b.options[c])?b.options[c].splice(this.options.index,1):delete b.options[c];b[c].forEach(function(a,b){a.options.index=a.userOptions.index=b});this.destroy();b.isDirtyBox=!0;f(a,!0)&&b.redraw()},setTitle:function(a,b){this.update({title:a},b)},setCategories:function(a,b){this.update({categories:a},b)}})});K(F,"parts/AreaSeries.js",[F["parts/Globals.js"]],function(a){var C=
a.color,I=a.pick,H=a.Series,k=a.seriesType;k("area","line",{softThreshold:!1,threshold:0},{singleStacks:!1,getStackPoints:function(d){var k=[],t=[],u=this.xAxis,v=this.yAxis,p=v.stacks[this.stackKey],g={},e=this.index,m=v.series,l=m.length,b,f=I(v.options.reversedStacks,!0)?1:-1,c;d=d||this.points;if(this.options.stacking){for(c=0;c<d.length;c++)d[c].leftNull=d[c].rightNull=null,g[d[c].x]=d[c];a.objectEach(p,function(a,b){null!==a.total&&t.push(b)});t.sort(function(a,b){return a-b});b=m.map(function(a){return a.visible});
t.forEach(function(a,d){var m=0,r,w;if(g[a]&&!g[a].isNull)k.push(g[a]),[-1,1].forEach(function(n){var m=1===n?"rightNull":"leftNull",k=0,q=p[t[d+n]];if(q)for(c=e;0<=c&&c<l;)r=q.points[c],r||(c===e?g[a][m]=!0:b[c]&&(w=p[a].points[c])&&(k-=w[1]-w[0])),c+=f;g[a][1===n?"rightCliff":"leftCliff"]=k});else{for(c=e;0<=c&&c<l;){if(r=p[a].points[c]){m=r[1];break}c+=f}m=v.translate(m,0,1,0,1);k.push({isNull:!0,plotX:u.translate(a,0,0,0,1),x:a,plotY:m,yBottom:m})}})}return k},getGraphPath:function(a){var d=H.prototype.getGraphPath,
k=this.options,u=k.stacking,v=this.yAxis,p,g,e=[],m=[],l=this.index,b,f=v.stacks[this.stackKey],c=k.threshold,w=v.getThreshold(k.threshold),r,k=k.connectNulls||"percent"===u,J=function(d,g,n){var k=a[d];d=u&&f[k.x].points[l];var r=k[n+"Null"]||0;n=k[n+"Cliff"]||0;var p,q,k=!0;n||r?(p=(r?d[0]:d[1])+n,q=d[0]+n,k=!!r):!u&&a[g]&&a[g].isNull&&(p=q=c);void 0!==p&&(m.push({plotX:b,plotY:null===p?w:v.getThreshold(p),isNull:k,isCliff:!0}),e.push({plotX:b,plotY:null===q?w:v.getThreshold(q),doCurve:!1}))};a=
a||this.points;u&&(a=this.getStackPoints(a));for(p=0;p<a.length;p++)if(g=a[p].isNull,b=I(a[p].rectPlotX,a[p].plotX),r=I(a[p].yBottom,w),!g||k)k||J(p,p-1,"left"),g&&!u&&k||(m.push(a[p]),e.push({x:p,plotX:b,plotY:r})),k||J(p,p+1,"right");p=d.call(this,m,!0,!0);e.reversed=!0;g=d.call(this,e,!0,!0);g.length&&(g[0]="L");g=p.concat(g);d=d.call(this,m,!1,k);g.xMap=p.xMap;this.areaPath=g;return d},drawGraph:function(){this.areaPath=[];H.prototype.drawGraph.apply(this);var a=this,k=this.areaPath,t=this.options,
u=[["area","highcharts-area",this.color,t.fillColor]];this.zones.forEach(function(d,k){u.push(["zone-area-"+k,"highcharts-area highcharts-zone-area-"+k+" "+d.className,d.color||a.color,d.fillColor||t.fillColor])});u.forEach(function(d){var p=d[0],g=a[p],e=g?"animate":"attr",m={};g?(g.endX=a.preventGraphAnimation?null:k.xMap,g.animate({d:k})):(m.zIndex=0,g=a[p]=a.chart.renderer.path(k).addClass(d[1]).add(a.group),g.isArea=!0);a.chart.styledMode||(m.fill=I(d[3],C(d[2]).setOpacity(I(t.fillOpacity,.75)).get()));
g[e](m);g.startX=k.xMap;g.shiftUnit=t.step?2:1})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})});K(F,"parts/SplineSeries.js",[F["parts/Globals.js"]],function(a){var C=a.pick;a=a.seriesType;a("spline","line",{},{getPointSpline:function(a,H,k){var d=H.plotX,q=H.plotY,t=a[k-1];k=a[k+1];var u,v,p,g;if(t&&!t.isNull&&!1!==t.doCurve&&!H.isCliff&&k&&!k.isNull&&!1!==k.doCurve&&!H.isCliff){a=t.plotY;p=k.plotX;k=k.plotY;var e=0;u=(1.5*d+t.plotX)/2.5;v=(1.5*q+a)/2.5;p=(1.5*d+p)/2.5;g=(1.5*q+k)/2.5;p!==
u&&(e=(g-v)*(p-d)/(p-u)+q-g);v+=e;g+=e;v>a&&v>q?(v=Math.max(a,q),g=2*q-v):v<a&&v<q&&(v=Math.min(a,q),g=2*q-v);g>k&&g>q?(g=Math.max(k,q),v=2*q-g):g<k&&g<q&&(g=Math.min(k,q),v=2*q-g);H.rightContX=p;H.rightContY=g}H=["C",C(t.rightContX,t.plotX),C(t.rightContY,t.plotY),C(u,d),C(v,q),d,q];t.rightContX=t.rightContY=null;return H}})});K(F,"parts/AreaSplineSeries.js",[F["parts/Globals.js"]],function(a){var C=a.seriesTypes.area.prototype,F=a.seriesType;F("areaspline","spline",a.defaultPlotOptions.area,{getStackPoints:C.getStackPoints,
getGraphPath:C.getGraphPath,drawGraph:C.drawGraph,drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})});K(F,"parts/ColumnSeries.js",[F["parts/Globals.js"]],function(a){var C=a.animObject,F=a.color,H=a.extend,k=a.defined,d=a.isNumber,q=a.merge,t=a.pick,u=a.Series,v=a.seriesType,p=a.svg;v("column","line",{borderRadius:0,crisp:!0,groupPadding:.2,marker:null,pointPadding:.1,minPointLength:0,cropThreshold:50,pointRange:null,states:{hover:{halo:!1,brightness:.1},select:{color:"#cccccc",borderColor:"#000000"}},
dataLabels:{align:null,verticalAlign:null,y:null},softThreshold:!1,startFromThreshold:!0,stickyTracking:!1,tooltip:{distance:6},threshold:0,borderColor:"#ffffff"},{cropShoulder:0,directTouch:!0,trackerGroups:["group","dataLabelsGroup"],negStacks:!0,init:function(){u.prototype.init.apply(this,arguments);var a=this,e=a.chart;e.hasRendered&&e.series.forEach(function(e){e.type===a.type&&(e.isDirty=!0)})},getColumnMetrics:function(){var a=this,e=a.options,d=a.xAxis,l=a.yAxis,b=d.options.reversedStacks,
b=d.reversed&&!b||!d.reversed&&b,f,c={},k=0;!1===e.grouping?k=1:a.chart.series.forEach(function(b){var e=b.options,d=b.yAxis,g;b.type!==a.type||!b.visible&&a.chart.options.chart.ignoreHiddenSeries||l.len!==d.len||l.pos!==d.pos||(e.stacking?(f=b.stackKey,void 0===c[f]&&(c[f]=k++),g=c[f]):!1!==e.grouping&&(g=k++),b.columnIndex=g)});var r=Math.min(Math.abs(d.transA)*(d.ordinalSlope||e.pointRange||d.closestPointRange||d.tickInterval||1),d.len),p=r*e.groupPadding,q=(r-2*p)/(k||1),e=Math.min(e.maxPointWidth||
d.len,t(e.pointWidth,q*(1-2*e.pointPadding)));a.columnMetrics={width:e,offset:(q-e)/2+(p+((a.columnIndex||0)+(b?1:0))*q-r/2)*(b?-1:1)};return a.columnMetrics},crispCol:function(a,e,d,l){var b=this.chart,f=this.borderWidth,c=-(f%2?.5:0),f=f%2?.5:1;b.inverted&&b.renderer.isVML&&(f+=1);this.options.crisp&&(d=Math.round(a+d)+c,a=Math.round(a)+c,d-=a);l=Math.round(e+l)+f;c=.5>=Math.abs(e)&&.5<l;e=Math.round(e)+f;l-=e;c&&l&&(--e,l+=1);return{x:a,y:e,width:d,height:l}},translate:function(){var a=this,e=
a.chart,d=a.options,l=a.dense=2>a.closestPointRange*a.xAxis.transA,l=a.borderWidth=t(d.borderWidth,l?0:1),b=a.yAxis,f=d.threshold,c=a.translatedThreshold=b.getThreshold(f),p=t(d.minPointLength,5),r=a.getColumnMetrics(),q=r.width,G=a.barW=Math.max(q,1+2*l),B=a.pointXOffset=r.offset;e.inverted&&(c-=.5);d.pointPadding&&(G=Math.ceil(G));u.prototype.translate.apply(a);a.points.forEach(function(d){var g=t(d.yBottom,c),l=999+Math.abs(g),n=q,l=Math.min(Math.max(-l,d.plotY),b.len+l),m=d.plotX+B,h=G,r=Math.min(l,
g),w,u=Math.max(l,g)-r;p&&Math.abs(u)<p&&(u=p,w=!b.reversed&&!d.negative||b.reversed&&d.negative,d.y===f&&a.dataMax<=f&&b.min<f&&(w=!w),r=Math.abs(r-c)>p?g-p:c-(w?p:0));k(d.options.pointWidth)&&(n=h=Math.ceil(d.options.pointWidth),m-=Math.round((n-q)/2));d.barX=m;d.pointWidth=n;d.tooltipPos=e.inverted?[b.len+b.pos-e.plotLeft-l,a.xAxis.len-m-h/2,u]:[m+h/2,l+b.pos-e.plotTop,u];d.shapeType=a.pointClass.prototype.shapeType||"rect";d.shapeArgs=a.crispCol.apply(a,d.isNull?[m,c,h,0]:[m,r,h,u])})},getSymbol:a.noop,
drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,drawGraph:function(){this.group[this.dense?"addClass":"removeClass"]("highcharts-dense-data")},pointAttribs:function(a,e){var d=this.options,g,b=this.pointAttrToOptions||{};g=b.stroke||"borderColor";var f=b["stroke-width"]||"borderWidth",c=a&&a.color||this.color,k=a&&a[g]||d[g]||this.color||c,r=a&&a[f]||d[f]||this[f]||0,b=a&&a.dashStyle||d.dashStyle,p=t(d.opacity,1),u;a&&this.zones.length&&(u=a.getZone(),c=a.options.color||u&&u.color||this.color,
u&&(k=u.borderColor||k,b=u.dashStyle||b,r=u.borderWidth||r));e&&(a=q(d.states[e],a.options.states&&a.options.states[e]||{}),e=a.brightness,c=a.color||void 0!==e&&F(c).brighten(a.brightness).get()||c,k=a[g]||k,r=a[f]||r,b=a.dashStyle||b,p=t(a.opacity,p));g={fill:c,stroke:k,"stroke-width":r,opacity:p};b&&(g.dashstyle=b);return g},drawPoints:function(){var a=this,e=this.chart,k=a.options,l=e.renderer,b=k.animationLimit||250,f;a.points.forEach(function(c){var g=c.graphic,m=g&&e.pointCount<b?"animate":
"attr";if(d(c.plotY)&&null!==c.y){f=c.shapeArgs;g&&g.element.nodeName!==c.shapeType&&(g=g.destroy());if(g)g[m](q(f));else c.graphic=g=l[c.shapeType](f).add(c.group||a.group);if(k.borderRadius)g[m]({r:k.borderRadius});e.styledMode||g[m](a.pointAttribs(c,c.selected&&"select")).shadow(!1!==c.allowShadow&&k.shadow,null,k.stacking&&!k.borderRadius);g.addClass(c.getClassName(),!0)}else g&&(c.graphic=g.destroy())})},animate:function(a){var e=this,d=this.yAxis,g=e.options,b=this.chart.inverted,f={},c=b?"translateX":
"translateY",k;p&&(a?(f.scaleY=.001,a=Math.min(d.pos+d.len,Math.max(d.pos,d.toPixels(g.threshold))),b?f.translateX=a-d.len:f.translateY=a,e.clipBox&&e.setClip(),e.group.attr(f)):(k=e.group.attr(c),e.group.animate({scaleY:1},H(C(e.options.animation),{step:function(a,b){f[c]=k+b.pos*(d.pos-k);e.group.attr(f)}})),e.animate=null))},remove:function(){var a=this,e=a.chart;e.hasRendered&&e.series.forEach(function(e){e.type===a.type&&(e.isDirty=!0)});u.prototype.remove.apply(a,arguments)}})});K(F,"parts/BarSeries.js",
[F["parts/Globals.js"]],function(a){a=a.seriesType;a("bar","column",null,{inverted:!0})});K(F,"parts/ScatterSeries.js",[F["parts/Globals.js"]],function(a){var C=a.Series,F=a.seriesType;F("scatter","line",{lineWidth:0,findNearestPointBy:"xy",jitter:{x:0,y:0},marker:{enabled:!0},tooltip:{headerFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e \x3cspan style\x3d"font-size: 10px"\x3e {series.name}\x3c/span\x3e\x3cbr/\x3e',pointFormat:"x: \x3cb\x3e{point.x}\x3c/b\x3e\x3cbr/\x3ey: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e"}},
{sorted:!1,requireSorting:!1,noSharedTooltip:!0,trackerGroups:["group","markerGroup","dataLabelsGroup"],takeOrdinalPosition:!1,drawGraph:function(){this.options.lineWidth&&C.prototype.drawGraph.call(this)},applyJitter:function(){var a=this,k=this.options.jitter,d=this.points.length;k&&this.points.forEach(function(q,t){["x","y"].forEach(function(u,v){var p,g="plot"+u.toUpperCase(),e,m;k[u]&&!q.isNull&&(p=a[u+"Axis"],m=k[u]*p.transA,p&&!p.isLog&&(e=Math.max(0,q[g]-m),p=Math.min(p.len,q[g]+m),v=1E4*
Math.sin(t+v*d),q[g]=e+(p-e)*(v-Math.floor(v)),"x"===u&&(q.clientX=q.plotX)))})})}});a.addEvent(C,"afterTranslate",function(){this.applyJitter&&this.applyJitter()})});K(F,"mixins/centered-series.js",[F["parts/Globals.js"]],function(a){var C=a.deg2rad,F=a.isNumber,H=a.pick,k=a.relativeLength;a.CenteredSeriesMixin={getCenter:function(){var a=this.options,q=this.chart,t=2*(a.slicedOffset||0),u=q.plotWidth-2*t,q=q.plotHeight-2*t,v=a.center,v=[H(v[0],"50%"),H(v[1],"50%"),a.size||"100%",a.innerSize||0],
p=Math.min(u,q),g,e;for(g=0;4>g;++g)e=v[g],a=2>g||2===g&&/%$/.test(e),v[g]=k(e,[u,q,p,v[2]][g])+(a?t:0);v[3]>v[2]&&(v[3]=v[2]);return v},getStartAndEndRadians:function(a,k){a=F(a)?a:0;k=F(k)&&k>a&&360>k-a?k:a+360;return{start:C*(a+-90),end:C*(k+-90)}}}});K(F,"parts/PieSeries.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,F=a.CenteredSeriesMixin,H=a.defined,k=F.getStartAndEndRadians,d=a.merge,q=a.noop,t=a.pick,u=a.Point,v=a.Series,p=a.seriesType,g=a.setAnimation;p("pie","line",{center:[null,
null],clip:!1,colorByPoint:!0,dataLabels:{allowOverlap:!0,connectorPadding:5,distance:30,enabled:!0,formatter:function(){return this.point.isNull?void 0:this.point.name},softConnector:!0,x:0,connectorShape:"fixedOffset",crookDistance:"70%"},ignoreHiddenPoint:!0,inactiveOtherPoints:!0,legendType:"point",marker:null,size:null,showInLegend:!1,slicedOffset:10,stickyTracking:!1,tooltip:{followPointer:!0},borderColor:"#ffffff",borderWidth:1,states:{hover:{brightness:.1}}},{isCartesian:!1,requireSorting:!1,
directTouch:!0,noSharedTooltip:!0,trackerGroups:["group","dataLabelsGroup"],axisTypes:[],pointAttribs:a.seriesTypes.column.prototype.pointAttribs,animate:function(a){var e=this,d=e.points,b=e.startAngleRad;a||(d.forEach(function(a){var c=a.graphic,d=a.shapeArgs;c&&(c.attr({r:a.startR||e.center[3]/2,start:b,end:b}),c.animate({r:d.r,start:d.start,end:d.end},e.options.animation))}),e.animate=null)},hasData:function(){return!!this.processedXData.length},updateTotals:function(){var a,d=0,g=this.points,
b=g.length,f,c=this.options.ignoreHiddenPoint;for(a=0;a<b;a++)f=g[a],d+=c&&!f.visible?0:f.isNull?0:f.y;this.total=d;for(a=0;a<b;a++)f=g[a],f.percentage=0<d&&(f.visible||!c)?f.y/d*100:0,f.total=d},generatePoints:function(){v.prototype.generatePoints.call(this);this.updateTotals()},getX:function(a,d,g){var b=this.center,e=this.radii?this.radii[g.index]:b[2]/2;return b[0]+(d?-1:1)*Math.cos(Math.asin(Math.max(Math.min((a-b[1])/(e+g.labelDistance),1),-1)))*(e+g.labelDistance)+(0<g.labelDistance?(d?-1:
1)*this.options.dataLabels.padding:0)},translate:function(a){this.generatePoints();var e=0,d=this.options,b=d.slicedOffset,f=b+(d.borderWidth||0),c,g,r=k(d.startAngle,d.endAngle),p=this.startAngleRad=r.start,r=(this.endAngleRad=r.end)-p,q=this.points,u,n,v=d.dataLabels.distance,d=d.ignoreHiddenPoint,z,A=q.length,D;a||(this.center=a=this.getCenter());for(z=0;z<A;z++){D=q[z];D.labelDistance=t(D.options.dataLabels&&D.options.dataLabels.distance,v);this.maxLabelDistance=Math.max(this.maxLabelDistance||
0,D.labelDistance);c=p+e*r;if(!d||D.visible)e+=D.percentage/100;g=p+e*r;D.shapeType="arc";D.shapeArgs={x:a[0],y:a[1],r:a[2]/2,innerR:a[3]/2,start:Math.round(1E3*c)/1E3,end:Math.round(1E3*g)/1E3};g=(g+c)/2;g>1.5*Math.PI?g-=2*Math.PI:g<-Math.PI/2&&(g+=2*Math.PI);D.slicedTranslation={translateX:Math.round(Math.cos(g)*b),translateY:Math.round(Math.sin(g)*b)};u=Math.cos(g)*a[2]/2;n=Math.sin(g)*a[2]/2;D.tooltipPos=[a[0]+.7*u,a[1]+.7*n];D.half=g<-Math.PI/2||g>Math.PI/2?1:0;D.angle=g;c=Math.min(f,D.labelDistance/
5);D.labelPosition={natural:{x:a[0]+u+Math.cos(g)*D.labelDistance,y:a[1]+n+Math.sin(g)*D.labelDistance},"final":{},alignment:0>D.labelDistance?"center":D.half?"right":"left",connectorPosition:{breakAt:{x:a[0]+u+Math.cos(g)*c,y:a[1]+n+Math.sin(g)*c},touchingSliceAt:{x:a[0]+u,y:a[1]+n}}}}},drawGraph:null,redrawPoints:function(){var a=this,g=a.chart,k=g.renderer,b,f,c,p,r=a.options.shadow;!r||a.shadowGroup||g.styledMode||(a.shadowGroup=k.g("shadow").attr({zIndex:-1}).add(a.group));a.points.forEach(function(e){var l=
{};f=e.graphic;if(!e.isNull&&f){p=e.shapeArgs;b=e.getTranslate();if(!g.styledMode){var m=e.shadowGroup;r&&!m&&(m=e.shadowGroup=k.g("shadow").add(a.shadowGroup));m&&m.attr(b);c=a.pointAttribs(e,e.selected&&"select")}e.delayedRendering?(f.setRadialReference(a.center).attr(p).attr(b),g.styledMode||f.attr(c).attr({"stroke-linejoin":"round"}).shadow(r,m),e.delayRendering=!1):(f.setRadialReference(a.center),g.styledMode||d(!0,l,c),d(!0,l,p,b),f.animate(l));f.attr({visibility:e.visible?"inherit":"hidden"});
f.addClass(e.getClassName())}else f&&(e.graphic=f.destroy())})},drawPoints:function(){var a=this.chart.renderer;this.points.forEach(function(e){e.graphic||(e.graphic=a[e.shapeType](e.shapeArgs).add(e.series.group),e.delayedRendering=!0)})},searchPoint:q,sortByAngle:function(a,d){a.sort(function(a,b){return void 0!==a.angle&&(b.angle-a.angle)*d})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,getCenter:F.getCenter,getSymbol:q},{init:function(){u.prototype.init.apply(this,arguments);var a=this,
d;a.name=t(a.name,"Slice");d=function(e){a.slice("select"===e.type)};C(a,"select",d);C(a,"unselect",d);return a},isValid:function(){return a.isNumber(this.y,!0)&&0<=this.y},setVisible:function(a,d){var e=this,b=e.series,f=b.chart,c=b.options.ignoreHiddenPoint;d=t(d,c);a!==e.visible&&(e.visible=e.options.visible=a=void 0===a?!e.visible:a,b.options.data[b.data.indexOf(e)]=e.options,["graphic","dataLabel","connector","shadowGroup"].forEach(function(b){if(e[b])e[b][a?"show":"hide"](!0)}),e.legendItem&&
f.legend.colorizeItem(e,a),a||"hover"!==e.state||e.setState(""),c&&(b.isDirty=!0),d&&f.redraw())},slice:function(a,d,k){var b=this.series;g(k,b.chart);t(d,!0);this.sliced=this.options.sliced=H(a)?a:!this.sliced;b.options.data[b.data.indexOf(this)]=this.options;this.graphic.animate(this.getTranslate());this.shadowGroup&&this.shadowGroup.animate(this.getTranslate())},getTranslate:function(){return this.sliced?this.slicedTranslation:{translateX:0,translateY:0}},haloPath:function(a){var e=this.shapeArgs;
return this.sliced||!this.visible?[]:this.series.chart.renderer.symbols.arc(e.x,e.y,e.r+a,e.r+a,{innerR:this.shapeArgs.r-1,start:e.start,end:e.end})},connectorShapes:{fixedOffset:function(a,d,g){var b=d.breakAt;d=d.touchingSliceAt;return["M",a.x,a.y].concat(g.softConnector?["C",a.x+("left"===a.alignment?-5:5),a.y,2*b.x-d.x,2*b.y-d.y,b.x,b.y]:["L",b.x,b.y]).concat(["L",d.x,d.y])},straight:function(a,d){d=d.touchingSliceAt;return["M",a.x,a.y,"L",d.x,d.y]},crookedLine:function(d,g,k){g=g.touchingSliceAt;
var b=this.series,e=b.center[0],c=b.chart.plotWidth,l=b.chart.plotLeft,b=d.alignment,r=this.shapeArgs.r;k=a.relativeLength(k.crookDistance,1);k="left"===b?e+r+(c+l-e-r)*(1-k):l+(e-r)*k;e=["L",k,d.y];if("left"===b?k>d.x||k<g.x:k<d.x||k>g.x)e=[];return["M",d.x,d.y].concat(e).concat(["L",g.x,g.y])}},getConnectorPath:function(){var a=this.labelPosition,d=this.series.options.dataLabels,g=d.connectorShape,b=this.connectorShapes;b[g]&&(g=b[g]);return g.call(this,{x:a.final.x,y:a.final.y,alignment:a.alignment},
a.connectorPosition,d)}})});K(F,"parts/DataLabels.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,F=a.arrayMax,H=a.defined,k=a.extend,d=a.format,q=a.merge,t=a.noop,u=a.pick,v=a.relativeLength,p=a.Series,g=a.seriesTypes,e=a.stableSort,m=a.isArray,l=a.splat;a.distribute=function(b,d,c){function f(a,b){return a.target-b.target}var g,k=!0,l=b,m=[],n;n=0;var p=l.reducedLen||d;for(g=b.length;g--;)n+=b[g].size;if(n>p){e(b,function(a,b){return(b.rank||0)-(a.rank||0)});for(n=g=0;n<=p;)n+=b[g].size,
g++;m=b.splice(g-1,b.length)}e(b,f);for(b=b.map(function(a){return{size:a.size,targets:[a.target],align:u(a.align,.5)}});k;){for(g=b.length;g--;)k=b[g],n=(Math.min.apply(0,k.targets)+Math.max.apply(0,k.targets))/2,k.pos=Math.min(Math.max(0,n-k.size*k.align),d-k.size);g=b.length;for(k=!1;g--;)0<g&&b[g-1].pos+b[g-1].size>b[g].pos&&(b[g-1].size+=b[g].size,b[g-1].targets=b[g-1].targets.concat(b[g].targets),b[g-1].align=.5,b[g-1].pos+b[g-1].size>d&&(b[g-1].pos=d-b[g-1].size),b.splice(g,1),k=!0)}l.push.apply(l,
m);g=0;b.some(function(b){var e=0;if(b.targets.some(function(){l[g].pos=b.pos+e;if(Math.abs(l[g].pos-l[g].target)>c)return l.slice(0,g+1).forEach(function(a){delete a.pos}),l.reducedLen=(l.reducedLen||d)-.1*d,l.reducedLen>.1*d&&a.distribute(l,d,c),!0;e+=l[g].size;g++}))return!0});e(l,f)};p.prototype.drawDataLabels=function(){function b(a,b){var c=b.filter;return c?(b=c.operator,a=a[c.property],c=c.value,"\x3e"===b&&a>c||"\x3c"===b&&a<c||"\x3e\x3d"===b&&a>=c||"\x3c\x3d"===b&&a<=c||"\x3d\x3d"===b&&
a==c||"\x3d\x3d\x3d"===b&&a===c?!0:!1):!0}function e(a,b){var c=[],d;if(m(a)&&!m(b))c=a.map(function(a){return q(a,b)});else if(m(b)&&!m(a))c=b.map(function(b){return q(a,b)});else if(m(a)||m(b))for(d=Math.max(a.length,b.length);d--;)c[d]=q(a[d],b[d]);else c=q(a,b);return c}var c=this,g=c.chart,k=c.options,p=k.dataLabels,t=c.points,B,n=c.hasRendered||0,v,z=u(p.defer,!!k.animation),A=g.renderer,p=e(e(g.options.plotOptions&&g.options.plotOptions.series&&g.options.plotOptions.series.dataLabels,g.options.plotOptions&&
g.options.plotOptions[c.type]&&g.options.plotOptions[c.type].dataLabels),p);a.fireEvent(this,"drawDataLabels");if(m(p)||p.enabled||c._hasPointLabels)v=c.plotGroup("dataLabelsGroup","data-labels",z&&!n?"hidden":"inherit",p.zIndex||6),z&&(v.attr({opacity:+n}),n||C(c,"afterAnimate",function(){c.visible&&v.show(!0);v[k.animation?"animate":"attr"]({opacity:1},{duration:200})})),t.forEach(function(f){B=l(e(p,f.dlOptions||f.options&&f.options.dataLabels));B.forEach(function(e,l){var h=e.enabled&&(!f.isNull||
f.dataLabelOnNull)&&b(f,e),n,m,r,p,q=f.dataLabels?f.dataLabels[l]:f.dataLabel,t=f.connectors?f.connectors[l]:f.connector,w=!q;h&&(n=f.getLabelConfig(),m=u(e[f.formatPrefix+"Format"],e.format),n=H(m)?d(m,n,g.time):(e[f.formatPrefix+"Formatter"]||e.formatter).call(n,e),m=e.style,r=e.rotation,g.styledMode||(m.color=u(e.color,m.color,c.color,"#000000"),"contrast"===m.color&&(f.contrastColor=A.getContrast(f.color||c.color),m.color=e.inside||0>u(e.distance,f.labelDistance)||k.stacking?f.contrastColor:"#000000"),
k.cursor&&(m.cursor=k.cursor)),p={r:e.borderRadius||0,rotation:r,padding:e.padding,zIndex:1},g.styledMode||(p.fill=e.backgroundColor,p.stroke=e.borderColor,p["stroke-width"]=e.borderWidth),a.objectEach(p,function(a,b){void 0===a&&delete p[b]}));!q||h&&H(n)?h&&H(n)&&(q?p.text=n:(f.dataLabels=f.dataLabels||[],q=f.dataLabels[l]=r?A.text(n,0,-9999).addClass("highcharts-data-label"):A.label(n,0,-9999,e.shape,null,null,e.useHTML,null,"data-label"),l||(f.dataLabel=q),q.addClass(" highcharts-data-label-color-"+
f.colorIndex+" "+(e.className||"")+(e.useHTML?" highcharts-tracker":""))),q.options=e,q.attr(p),g.styledMode||q.css(m).shadow(e.shadow),q.added||q.add(v),e.textPath&&q.setTextPath(f.getDataLabelPath&&f.getDataLabelPath(q)||f.graphic,e.textPath),c.alignDataLabel(f,q,e,null,w)):(f.dataLabel=f.dataLabel&&f.dataLabel.destroy(),f.dataLabels&&(1===f.dataLabels.length?delete f.dataLabels:delete f.dataLabels[l]),l||delete f.dataLabel,t&&(f.connector=f.connector.destroy(),f.connectors&&(1===f.connectors.length?
delete f.connectors:delete f.connectors[l])))})});a.fireEvent(this,"afterDrawDataLabels")};p.prototype.alignDataLabel=function(a,d,c,e,g){var b=this.chart,f=this.isCartesian&&b.inverted,l=u(a.dlBox&&a.dlBox.centerX,a.plotX,-9999),n=u(a.plotY,-9999),m=d.getBBox(),r,p=c.rotation,q=c.align,h=this.visible&&(a.series.forceDL||b.isInsidePlot(l,Math.round(n),f)||e&&b.isInsidePlot(l,f?e.x+1:e.y+e.height-1,f)),t="justify"===u(c.overflow,"justify");if(h&&(r=b.renderer.fontMetrics(b.styledMode?void 0:c.style.fontSize,
d).b,e=k({x:f?this.yAxis.len-n:l,y:Math.round(f?this.xAxis.len-l:n),width:0,height:0},e),k(c,{width:m.width,height:m.height}),p?(t=!1,l=b.renderer.rotCorr(r,p),l={x:e.x+c.x+e.width/2+l.x,y:e.y+c.y+{top:0,middle:.5,bottom:1}[c.verticalAlign]*e.height},d[g?"attr":"animate"](l).attr({align:q}),n=(p+720)%360,n=180<n&&360>n,"left"===q?l.y-=n?m.height:0:"center"===q?(l.x-=m.width/2,l.y-=m.height/2):"right"===q&&(l.x-=m.width,l.y-=n?0:m.height),d.placed=!0,d.alignAttr=l):(d.align(c,null,e),l=d.alignAttr),
t&&0<=e.height?a.isLabelJustified=this.justifyDataLabel(d,c,l,m,e,g):u(c.crop,!0)&&(h=b.isInsidePlot(l.x,l.y)&&b.isInsidePlot(l.x+m.width,l.y+m.height)),c.shape&&!p))d[g?"attr":"animate"]({anchorX:f?b.plotWidth-a.plotY:a.plotX,anchorY:f?b.plotHeight-a.plotX:a.plotY});h||(d.attr({y:-9999}),d.placed=!1)};p.prototype.justifyDataLabel=function(a,d,c,e,g,k){var b=this.chart,f=d.align,l=d.verticalAlign,m,r,p=a.box?0:a.padding||0;m=c.x+p;0>m&&("right"===f?d.align="left":d.x=-m,r=!0);m=c.x+e.width-p;m>b.plotWidth&&
("left"===f?d.align="right":d.x=b.plotWidth-m,r=!0);m=c.y+p;0>m&&("bottom"===l?d.verticalAlign="top":d.y=-m,r=!0);m=c.y+e.height-p;m>b.plotHeight&&("top"===l?d.verticalAlign="bottom":d.y=b.plotHeight-m,r=!0);r&&(a.placed=!k,a.align(d,null,g));return r};g.pie&&(g.pie.prototype.dataLabelPositioners={radialDistributionY:function(a){return a.top+a.distributeBox.pos},radialDistributionX:function(a,d,c,e){return a.getX(c<d.top+2||c>d.bottom-2?e:c,d.half,d)},justify:function(a,d,c){return c[0]+(a.half?-1:
1)*(d+a.labelDistance)},alignToPlotEdges:function(a,d,c,e){a=a.getBBox().width;return d?a+e:c-a-e},alignToConnectors:function(a,d,c,e){var b=0,f;a.forEach(function(a){f=a.dataLabel.getBBox().width;f>b&&(b=f)});return d?b+e:c-b-e}},g.pie.prototype.drawDataLabels=function(){var b=this,d=b.data,c,e=b.chart,g=b.options.dataLabels,k=g.connectorPadding,l,m=e.plotWidth,n=e.plotHeight,t=e.plotLeft,v=Math.round(e.chartWidth/3),A,D=b.center,h=D[2]/2,y=D[1],C,I,L,K,P=[[],[]],x,Q,N,T,O=[0,0,0,0],X=b.dataLabelPositioners,
Z;b.visible&&(g.enabled||b._hasPointLabels)&&(d.forEach(function(a){a.dataLabel&&a.visible&&a.dataLabel.shortened&&(a.dataLabel.attr({width:"auto"}).css({width:"auto",textOverflow:"clip"}),a.dataLabel.shortened=!1)}),p.prototype.drawDataLabels.apply(b),d.forEach(function(a){a.dataLabel&&(a.visible?(P[a.half].push(a),a.dataLabel._pos=null,!H(g.style.width)&&!H(a.options.dataLabels&&a.options.dataLabels.style&&a.options.dataLabels.style.width)&&a.dataLabel.getBBox().width>v&&(a.dataLabel.css({width:.7*
v}),a.dataLabel.shortened=!0)):(a.dataLabel=a.dataLabel.destroy(),a.dataLabels&&1===a.dataLabels.length&&delete a.dataLabels))}),P.forEach(function(d,f){var l,r,p=d.length,q=[],w;if(p)for(b.sortByAngle(d,f-.5),0<b.maxLabelDistance&&(l=Math.max(0,y-h-b.maxLabelDistance),r=Math.min(y+h+b.maxLabelDistance,e.plotHeight),d.forEach(function(a){0<a.labelDistance&&a.dataLabel&&(a.top=Math.max(0,y-h-a.labelDistance),a.bottom=Math.min(y+h+a.labelDistance,e.plotHeight),w=a.dataLabel.getBBox().height||21,a.distributeBox=
{target:a.labelPosition.natural.y-a.top+w/2,size:w,rank:a.y},q.push(a.distributeBox))}),l=r+w-l,a.distribute(q,l,l/5)),T=0;T<p;T++){c=d[T];L=c.labelPosition;C=c.dataLabel;N=!1===c.visible?"hidden":"inherit";Q=l=L.natural.y;q&&H(c.distributeBox)&&(void 0===c.distributeBox.pos?N="hidden":(K=c.distributeBox.size,Q=X.radialDistributionY(c)));delete c.positionIndex;if(g.justify)x=X.justify(c,h,D);else switch(g.alignTo){case "connectors":x=X.alignToConnectors(d,f,m,t);break;case "plotEdges":x=X.alignToPlotEdges(C,
f,m,t);break;default:x=X.radialDistributionX(b,c,Q,l)}C._attr={visibility:N,align:L.alignment};C._pos={x:x+g.x+({left:k,right:-k}[L.alignment]||0),y:Q+g.y-10};L.final.x=x;L.final.y=Q;u(g.crop,!0)&&(I=C.getBBox().width,l=null,x-I<k&&1===f?(l=Math.round(I-x+k),O[3]=Math.max(l,O[3])):x+I>m-k&&0===f&&(l=Math.round(x+I-m+k),O[1]=Math.max(l,O[1])),0>Q-K/2?O[0]=Math.max(Math.round(-Q+K/2),O[0]):Q+K/2>n&&(O[2]=Math.max(Math.round(Q+K/2-n),O[2])),C.sideOverflow=l)}}),0===F(O)||this.verifyDataLabelOverflow(O))&&
(this.placeDataLabels(),this.points.forEach(function(a){Z=q(g,a.options.dataLabels);if(l=u(Z.connectorWidth,1)){var c;A=a.connector;if((C=a.dataLabel)&&C._pos&&a.visible&&0<a.labelDistance){N=C._attr.visibility;if(c=!A)a.connector=A=e.renderer.path().addClass("highcharts-data-label-connector  highcharts-color-"+a.colorIndex+(a.className?" "+a.className:"")).add(b.dataLabelsGroup),e.styledMode||A.attr({"stroke-width":l,stroke:Z.connectorColor||a.color||"#666666"});A[c?"attr":"animate"]({d:a.getConnectorPath()});
A.attr("visibility",N)}else A&&(a.connector=A.destroy())}}))},g.pie.prototype.placeDataLabels=function(){this.points.forEach(function(a){var b=a.dataLabel,c;b&&a.visible&&((c=b._pos)?(b.sideOverflow&&(b._attr.width=Math.max(b.getBBox().width-b.sideOverflow,0),b.css({width:b._attr.width+"px",textOverflow:(this.options.dataLabels.style||{}).textOverflow||"ellipsis"}),b.shortened=!0),b.attr(b._attr),b[b.moved?"animate":"attr"](c),b.moved=!0):b&&b.attr({y:-9999}));delete a.distributeBox},this)},g.pie.prototype.alignDataLabel=
t,g.pie.prototype.verifyDataLabelOverflow=function(a){var b=this.center,c=this.options,d=c.center,e=c.minSize||80,g,k=null!==c.size;k||(null!==d[0]?g=Math.max(b[2]-Math.max(a[1],a[3]),e):(g=Math.max(b[2]-a[1]-a[3],e),b[0]+=(a[3]-a[1])/2),null!==d[1]?g=Math.max(Math.min(g,b[2]-Math.max(a[0],a[2])),e):(g=Math.max(Math.min(g,b[2]-a[0]-a[2]),e),b[1]+=(a[0]-a[2])/2),g<b[2]?(b[2]=g,b[3]=Math.min(v(c.innerSize||0,g),g),this.translate(b),this.drawDataLabels&&this.drawDataLabels()):k=!0);return k});g.column&&
(g.column.prototype.alignDataLabel=function(a,d,c,e,g){var b=this.chart.inverted,f=a.series,k=a.dlBox||a.shapeArgs,l=u(a.below,a.plotY>u(this.translatedThreshold,f.yAxis.len)),m=u(c.inside,!!this.options.stacking);k&&(e=q(k),0>e.y&&(e.height+=e.y,e.y=0),k=e.y+e.height-f.yAxis.len,0<k&&(e.height-=k),b&&(e={x:f.yAxis.len-e.y-e.height,y:f.xAxis.len-e.x-e.width,width:e.height,height:e.width}),m||(b?(e.x+=l?0:e.width,e.width=0):(e.y+=l?e.height:0,e.height=0)));c.align=u(c.align,!b||m?"center":l?"right":
"left");c.verticalAlign=u(c.verticalAlign,b||m?"middle":l?"top":"bottom");p.prototype.alignDataLabel.call(this,a,d,c,e,g);a.isLabelJustified&&a.contrastColor&&d.css({color:a.contrastColor})})});K(F,"modules/overlapping-datalabels.src.js",[F["parts/Globals.js"]],function(a){var C=a.Chart,F=a.isArray,H=a.objectEach,k=a.pick,d=a.addEvent,q=a.fireEvent;d(C,"render",function(){var a=[];(this.labelCollectors||[]).forEach(function(d){a=a.concat(d())});(this.yAxis||[]).forEach(function(d){d.options.stackLabels&&
!d.options.stackLabels.allowOverlap&&H(d.stacks,function(d){H(d,function(d){a.push(d.label)})})});(this.series||[]).forEach(function(d){var q=d.options.dataLabels;d.visible&&(!1!==q.enabled||d._hasPointLabels)&&d.points.forEach(function(d){d.visible&&(F(d.dataLabels)?d.dataLabels:d.dataLabel?[d.dataLabel]:[]).forEach(function(g){var e=g.options;g.labelrank=k(e.labelrank,d.labelrank,d.shapeArgs&&d.shapeArgs.height);e.allowOverlap||a.push(g)})})});this.hideOverlappingLabels(a)});C.prototype.hideOverlappingLabels=
function(a){var d=this,k=a.length,p=d.renderer,g,e,m,l,b,f,c=function(a,b,c,d,e,f,g,k){return!(e>a+c||e+g<a||f>b+d||f+k<b)};m=function(a){var b,c,d,e=a.box?0:a.padding||0;d=0;if(a&&(!a.alignAttr||a.placed))return b=a.alignAttr||{x:a.attr("x"),y:a.attr("y")},c=a.parentGroup,a.width||(d=a.getBBox(),a.width=d.width,a.height=d.height,d=p.fontMetrics(null,a.element).h),{x:b.x+(c.translateX||0)+e,y:b.y+(c.translateY||0)+e-d,width:a.width-2*e,height:a.height-2*e}};for(e=0;e<k;e++)if(g=a[e])g.oldOpacity=
g.opacity,g.newOpacity=1,g.absoluteBox=m(g);a.sort(function(a,b){return(b.labelrank||0)-(a.labelrank||0)});for(e=0;e<k;e++)for(f=(m=a[e])&&m.absoluteBox,g=e+1;g<k;++g)if(b=(l=a[g])&&l.absoluteBox,f&&b&&m!==l&&0!==m.newOpacity&&0!==l.newOpacity&&(b=c(f.x,f.y,f.width,f.height,b.x,b.y,b.width,b.height)))(m.labelrank<l.labelrank?m:l).newOpacity=0;a.forEach(function(a){var b,c;a&&(c=a.newOpacity,a.oldOpacity!==c&&(a.alignAttr&&a.placed?(c?a.show(!0):b=function(){a.hide()},a.alignAttr.opacity=c,a[a.isOld?
"animate":"attr"](a.alignAttr,null,b),q(d,"afterHideOverlappingLabels")):a.attr({opacity:c})),a.isOld=!0)})}});K(F,"parts/Interaction.js",[F["parts/Globals.js"]],function(a){var C=a.addEvent,F=a.Chart,H=a.createElement,k=a.css,d=a.defaultOptions,q=a.defaultPlotOptions,t=a.extend,u=a.fireEvent,v=a.hasTouch,p=a.isObject,g=a.Legend,e=a.merge,m=a.pick,l=a.Point,b=a.Series,f=a.seriesTypes,c=a.svg,w;w=a.TrackerMixin={drawTrackerPoint:function(){var a=this,b=a.chart,c=b.pointer,d=function(a){var b=c.getPointFromEvent(a);
void 0!==b&&(c.isDirectTouch=!0,b.onMouseOver(a))};a.points.forEach(function(a){a.graphic&&(a.graphic.element.point=a);a.dataLabel&&(a.dataLabel.div?a.dataLabel.div.point=a:a.dataLabel.element.point=a)});a._hasTracking||(a.trackerGroups.forEach(function(e){if(a[e]){a[e].addClass("highcharts-tracker").on("mouseover",d).on("mouseout",function(a){c.onTrackerMouseOut(a)});if(v)a[e].on("touchstart",d);!b.styledMode&&a.options.cursor&&a[e].css(k).css({cursor:a.options.cursor})}}),a._hasTracking=!0);u(this,
"afterDrawTracker")},drawTrackerGraph:function(){var a=this,b=a.options,d=b.trackByArea,e=[].concat(d?a.areaPath:a.graphPath),f=e.length,g=a.chart,k=g.pointer,l=g.renderer,m=g.options.tooltip.snap,h=a.tracker,p,q=function(){if(g.hoverSeries!==a)a.onMouseOver()},t="rgba(192,192,192,"+(c?.0001:.002)+")";if(f&&!d)for(p=f+1;p--;)"M"===e[p]&&e.splice(p+1,0,e[p+1]-m,e[p+2],"L"),(p&&"M"===e[p]||p===f)&&e.splice(p,0,"L",e[p-2]+m,e[p-1]);h?h.attr({d:e}):a.graph&&(a.tracker=l.path(e).attr({visibility:a.visible?
"visible":"hidden",zIndex:2}).addClass(d?"highcharts-tracker-area":"highcharts-tracker-line").add(a.group),g.styledMode||a.tracker.attr({"stroke-linejoin":"round",stroke:t,fill:d?t:"none","stroke-width":a.graph.strokeWidth()+(d?0:2*m)}),[a.tracker,a.markerGroup].forEach(function(a){a.addClass("highcharts-tracker").on("mouseover",q).on("mouseout",function(a){k.onTrackerMouseOut(a)});b.cursor&&!g.styledMode&&a.css({cursor:b.cursor});if(v)a.on("touchstart",q)}));u(this,"afterDrawTracker")}};f.column&&
(f.column.prototype.drawTracker=w.drawTrackerPoint);f.pie&&(f.pie.prototype.drawTracker=w.drawTrackerPoint);f.scatter&&(f.scatter.prototype.drawTracker=w.drawTrackerPoint);t(g.prototype,{setItemEvents:function(a,b,c){var d=this,f=d.chart.renderer.boxWrapper,g=a instanceof l,k="highcharts-legend-"+(g?"point":"series")+"-active",m=d.chart.styledMode;(c?b:a.legendGroup).on("mouseover",function(){d.allItems.forEach(function(b){a!==b&&b.setState("inactive",!g)});a.setState("hover");a.visible&&f.addClass(k);
m||b.css(d.options.itemHoverStyle)}).on("mouseout",function(){d.styledMode||b.css(e(a.visible?d.itemStyle:d.itemHiddenStyle));d.allItems.forEach(function(b){a!==b&&b.setState("",!g)});f.removeClass(k);a.setState()}).on("click",function(b){var c=function(){a.setVisible&&a.setVisible()};f.removeClass(k);b={browserEvent:b};a.firePointEvent?a.firePointEvent("legendItemClick",b,c):u(a,"legendItemClick",b,c)})},createCheckboxForItem:function(a){a.checkbox=H("input",{type:"checkbox",className:"highcharts-legend-checkbox",
checked:a.selected,defaultChecked:a.selected},this.options.itemCheckboxStyle,this.chart.container);C(a.checkbox,"click",function(b){u(a.series||a,"checkboxClick",{checked:b.target.checked,item:a},function(){a.select()})})}});t(F.prototype,{showResetZoom:function(){function a(){b.zoomOut()}var b=this,c=d.lang,e=b.options.chart.resetZoomButton,f=e.theme,g=f.states,k="chart"===e.relativeTo||"spaceBox"===e.relativeTo?null:"plotBox";u(this,"beforeShowResetZoom",null,function(){b.resetZoomButton=b.renderer.button(c.resetZoom,
null,null,a,f,g&&g.hover).attr({align:e.position.align,title:c.resetZoomTitle}).addClass("highcharts-reset-zoom").add().align(e.position,!1,k)});u(this,"afterShowResetZoom")},zoomOut:function(){u(this,"selection",{resetSelection:!0},this.zoom)},zoom:function(b){var c=this,d,e=c.pointer,f=!1,g=c.inverted?e.mouseDownX:e.mouseDownY,k;!b||b.resetSelection?(c.axes.forEach(function(a){d=a.zoom()}),e.initiated=!1):b.xAxis.concat(b.yAxis).forEach(function(b){var k=b.axis,h=c.inverted?k.left:k.top,l=c.inverted?
h+k.width:h+k.height,n=k.isXAxis,m=!1;if(!n&&g>=h&&g<=l||n||!a.defined(g))m=!0;e[n?"zoomX":"zoomY"]&&m&&(d=k.zoom(b.min,b.max),k.displayBtn&&(f=!0))});k=c.resetZoomButton;f&&!k?c.showResetZoom():!f&&p(k)&&(c.resetZoomButton=k.destroy());d&&c.redraw(m(c.options.chart.animation,b&&b.animation,100>c.pointCount))},pan:function(a,b){var c=this,d=c.hoverPoints,e;u(this,"pan",{originalEvent:a},function(){d&&d.forEach(function(a){a.setState()});("xy"===b?[1,0]:[1]).forEach(function(b){b=c[b?"xAxis":"yAxis"][0];
var d=b.horiz,f=a[d?"chartX":"chartY"],d=d?"mouseDownX":"mouseDownY",g=c[d],h=(b.pointRange||0)/2,k=b.reversed&&!c.inverted||!b.reversed&&c.inverted?-1:1,l=b.getExtremes(),n=b.toValue(g-f,!0)+h*k,k=b.toValue(g+b.len-f,!0)-h*k,m=k<n,g=m?k:n,n=m?n:k,k=Math.min(l.dataMin,h?l.min:b.toValue(b.toPixels(l.min)-b.minPixelPadding)),h=Math.max(l.dataMax,h?l.max:b.toValue(b.toPixels(l.max)+b.minPixelPadding)),m=k-g;0<m&&(n+=m,g=k);m=n-h;0<m&&(n=h,g-=m);b.series.length&&g!==l.min&&n!==l.max&&(b.setExtremes(g,
n,!1,!1,{trigger:"pan"}),e=!0);c[d]=f});e&&c.redraw(!1);k(c.container,{cursor:"move"})})}});t(l.prototype,{select:function(a,b){var c=this,d=c.series,e=d.chart;a=m(a,!c.selected);c.firePointEvent(a?"select":"unselect",{accumulate:b},function(){c.selected=c.options.selected=a;d.options.data[d.data.indexOf(c)]=c.options;c.setState(a&&"select");b||e.getSelectedPoints().forEach(function(a){a.selected&&a!==c&&(a.selected=a.options.selected=!1,d.options.data[d.data.indexOf(a)]=a.options,a.setState(e.hoverPoints?
"inactive":""),a.firePointEvent("unselect"))})})},onMouseOver:function(a){var b=this.series.chart,c=b.pointer;a=a?c.normalize(a):c.getChartCoordinatesFromPoint(this,b.inverted);c.runPointActions(a,this)},onMouseOut:function(){var a=this.series.chart;this.firePointEvent("mouseOut");this.series.options.inactiveOtherPoints||(a.hoverPoints||[]).forEach(function(a){a.setState()});a.hoverPoints=a.hoverPoint=null},importEvents:function(){if(!this.hasImportedEvents){var b=this,c=e(b.series.options.point,
b.options).events;b.events=c;a.objectEach(c,function(a,c){C(b,c,a)});this.hasImportedEvents=!0}},setState:function(a,b){var c=Math.floor(this.plotX),d=this.plotY,e=this.series,f=this.state,g=e.options.states[a||"normal"]||{},k=q[e.type].marker&&e.options.marker,l=k&&!1===k.enabled,h=k&&k.states&&k.states[a||"normal"]||{},p=!1===h.enabled,r=e.stateMarkerGraphic,v=this.marker||{},w=e.chart,C=e.halo,F,x,H,I=k&&e.markerAttribs;a=a||"";if(!(a===this.state&&!b||this.selected&&"select"!==a||!1===g.enabled||
a&&(p||l&&!1===h.enabled)||a&&v.states&&v.states[a]&&!1===v.states[a].enabled)){this.state=a;I&&(F=e.markerAttribs(this,a));if(this.graphic)f&&this.graphic.removeClass("highcharts-point-"+f),a&&this.graphic.addClass("highcharts-point-"+a),w.styledMode||(x=e.pointAttribs(this,a),H=m(w.options.chart.animation,g.animation),e.options.inactiveOtherPoints&&((this.dataLabels||[]).forEach(function(a){a&&a.animate({opacity:x.opacity},H)}),this.connector&&this.connector.animate({opacity:x.opacity},H)),this.graphic.animate(x,
H)),F&&this.graphic.animate(F,m(w.options.chart.animation,h.animation,k.animation)),r&&r.hide();else{if(a&&h){f=v.symbol||e.symbol;r&&r.currentSymbol!==f&&(r=r.destroy());if(r)r[b?"animate":"attr"]({x:F.x,y:F.y});else f&&(e.stateMarkerGraphic=r=w.renderer.symbol(f,F.x,F.y,F.width,F.height).add(e.markerGroup),r.currentSymbol=f);!w.styledMode&&r&&r.attr(e.pointAttribs(this,a))}r&&(r[a&&w.isInsidePlot(c,d,w.inverted)?"show":"hide"](),r.element.point=this)}(a=g.halo)&&a.size?(C||(e.halo=C=w.renderer.path().add((this.graphic||
r).parentGroup)),C.show()[b?"animate":"attr"]({d:this.haloPath(a.size)}),C.attr({"class":"highcharts-halo highcharts-color-"+m(this.colorIndex,e.colorIndex)+(this.className?" "+this.className:""),zIndex:-1}),C.point=this,w.styledMode||C.attr(t({fill:this.color||e.color,"fill-opacity":a.opacity},a.attributes))):C&&C.point&&C.point.haloPath&&C.animate({d:C.point.haloPath(0)},null,C.hide);u(this,"afterSetState")}},haloPath:function(a){return this.series.chart.renderer.symbols.circle(Math.floor(this.plotX)-
a,this.plotY-a,2*a,2*a)}});t(b.prototype,{onMouseOver:function(){var a=this.chart,b=a.hoverSeries;if(b&&b!==this)b.onMouseOut();this.options.events.mouseOver&&u(this,"mouseOver");this.setState("hover");a.hoverSeries=this},onMouseOut:function(){var a=this.options,b=this.chart,c=b.tooltip,d=b.hoverPoint;b.hoverSeries=null;if(d)d.onMouseOut();this&&a.events.mouseOut&&u(this,"mouseOut");!c||this.stickyTracking||c.shared&&!this.noSharedTooltip||c.hide();b.series.forEach(function(a){a.setState("",!0)})},
setState:function(a,b){var c=this,d=c.options,e=c.graph,f=d.inactiveOtherPoints,g=d.states,k=d.lineWidth,l=d.opacity,h=m(g[a||"normal"]&&g[a||"normal"].animation,c.chart.options.chart.animation),d=0;a=a||"";if(c.state!==a&&([c.group,c.markerGroup,c.dataLabelsGroup].forEach(function(b){b&&(c.state&&b.removeClass("highcharts-series-"+c.state),a&&b.addClass("highcharts-series-"+a))}),c.state=a,!c.chart.styledMode)){if(g[a]&&!1===g[a].enabled)return;a&&(k=g[a].lineWidth||k+(g[a].lineWidthPlus||0),l=m(g[a].opacity,
l));if(e&&!e.dashstyle)for(g={"stroke-width":k},e.animate(g,h);c["zone-graph-"+d];)c["zone-graph-"+d].attr(g),d+=1;f||[c.group,c.markerGroup,c.dataLabelsGroup,c.labelBySeries].forEach(function(a){a&&a.animate({opacity:l},h)})}b&&f&&c.points&&c.points.forEach(function(b){b.setState&&b.setState(a)})},setVisible:function(a,b){var c=this,d=c.chart,e=c.legendItem,f,g=d.options.chart.ignoreHiddenSeries,k=c.visible;f=(c.visible=a=c.options.visible=c.userOptions.visible=void 0===a?!k:a)?"show":"hide";["group",
"dataLabelsGroup","markerGroup","tracker","tt"].forEach(function(a){if(c[a])c[a][f]()});if(d.hoverSeries===c||(d.hoverPoint&&d.hoverPoint.series)===c)c.onMouseOut();e&&d.legend.colorizeItem(c,a);c.isDirty=!0;c.options.stacking&&d.series.forEach(function(a){a.options.stacking&&a.visible&&(a.isDirty=!0)});c.linkedSeries.forEach(function(b){b.setVisible(a,!1)});g&&(d.isDirtyBox=!0);u(c,f);!1!==b&&d.redraw()},show:function(){this.setVisible(!0)},hide:function(){this.setVisible(!1)},select:function(a){this.selected=
a=this.options.selected=void 0===a?!this.selected:a;this.checkbox&&(this.checkbox.checked=a);u(this,a?"select":"unselect")},drawTracker:w.drawTrackerGraph})});K(F,"parts/Responsive.js",[F["parts/Globals.js"]],function(a){var C=a.Chart,F=a.isArray,H=a.isObject,k=a.pick,d=a.splat;C.prototype.setResponsive=function(d,k){var q=this.options.responsive,t=[],p=this.currentResponsive;!k&&q&&q.rules&&q.rules.forEach(function(g){void 0===g._id&&(g._id=a.uniqueKey());this.matchResponsiveRule(g,t,d)},this);k=
a.merge.apply(0,t.map(function(d){return a.find(q.rules,function(a){return a._id===d}).chartOptions}));k.isResponsiveOptions=!0;t=t.toString()||void 0;t!==(p&&p.ruleIds)&&(p&&this.update(p.undoOptions,d),t?(p=this.currentOptions(k),p.isResponsiveOptions=!0,this.currentResponsive={ruleIds:t,mergedOptions:k,undoOptions:p},this.update(k,d)):this.currentResponsive=void 0)};C.prototype.matchResponsiveRule=function(a,d){var q=a.condition;(q.callback||function(){return this.chartWidth<=k(q.maxWidth,Number.MAX_VALUE)&&
this.chartHeight<=k(q.maxHeight,Number.MAX_VALUE)&&this.chartWidth>=k(q.minWidth,0)&&this.chartHeight>=k(q.minHeight,0)}).call(this)&&d.push(a._id)};C.prototype.currentOptions=function(q){function t(q,p,g,e){var m;a.objectEach(q,function(a,b){if(!e&&-1<["series","xAxis","yAxis"].indexOf(b))for(a=d(a),g[b]=[],m=0;m<a.length;m++)p[b][m]&&(g[b][m]={},t(a[m],p[b][m],g[b][m],e+1));else H(a)?(g[b]=F(a)?[]:{},t(a,p[b]||{},g[b],e+1)):g[b]=k(p[b],null)})}var u={};t(q,this.options,u,0);return u}});K(F,"masters/highcharts.src.js",
[F["parts/Globals.js"]],function(a){return a});F["masters/highcharts.src.js"]._modules=F;return F["masters/highcharts.src.js"]});
//# sourceMappingURL=highcharts.js.map

/*
 Highcharts JS v7.1.2 (2019-06-03)

 Highcharts Drilldown module

 Author: Torstein Honsi
 License: www.highcharts.com/license

*/
(function(f){"object"===typeof module&&module.exports?(f["default"]=f,module.exports=f):"function"===typeof define&&define.amd?define("highcharts/modules/drilldown",["highcharts"],function(n){f(n);f.Highcharts=n;return f}):f("undefined"!==typeof Highcharts?Highcharts:void 0)})(function(f){function n(d,f,n,u){d.hasOwnProperty(f)||(d[f]=u.apply(null,n))}f=f?f._modules:{};n(f,"modules/drilldown.src.js",[f["parts/Globals.js"]],function(d){var f=d.animObject,n=d.noop,u=d.color,x=d.defaultOptions,q=d.extend,
C=d.format,y=d.objectEach,t=d.pick,m=d.Chart,p=d.seriesTypes,z=p.pie,p=p.column,A=d.Tick,v=d.fireEvent,B=1;q(x.lang,{drillUpText:"\u25c1 Back to {series.name}"});x.drilldown={activeAxisLabelStyle:{cursor:"pointer",color:"#003399",fontWeight:"bold",textDecoration:"underline"},activeDataLabelStyle:{cursor:"pointer",color:"#003399",fontWeight:"bold",textDecoration:"underline"},animation:{duration:500},drillUpButton:{position:{align:"right",x:-10,y:10}}};d.SVGRenderer.prototype.Element.prototype.fadeIn=
function(a){this.attr({opacity:.1,visibility:"inherit"}).animate({opacity:t(this.newOpacity,1)},a||{duration:250})};m.prototype.addSeriesAsDrilldown=function(a,b){this.addSingleSeriesAsDrilldown(a,b);this.applyDrilldown()};m.prototype.addSingleSeriesAsDrilldown=function(a,b){var c=a.series,g=c.xAxis,e=c.yAxis,k,h=[],r=[],l,f,m;m=this.styledMode?{colorIndex:t(a.colorIndex,c.colorIndex)}:{color:a.color||c.color};this.drilldownLevels||(this.drilldownLevels=[]);l=c.options._levelNumber||0;(f=this.drilldownLevels[this.drilldownLevels.length-
1])&&f.levelNumber!==l&&(f=void 0);b=q(q({_ddSeriesId:B++},m),b);k=c.points.indexOf(a);c.chart.series.forEach(function(a){a.xAxis!==g||a.isDrilling||(a.options._ddSeriesId=a.options._ddSeriesId||B++,a.options._colorIndex=a.userOptions._colorIndex,a.options._levelNumber=a.options._levelNumber||l,f?(h=f.levelSeries,r=f.levelSeriesOptions):(h.push(a),r.push(a.options)))});a=q({levelNumber:l,seriesOptions:c.options,levelSeriesOptions:r,levelSeries:h,shapeArgs:a.shapeArgs,bBox:a.graphic?a.graphic.getBBox():
{},color:a.isNull?(new d.Color(u)).setOpacity(0).get():u,lowerSeriesOptions:b,pointOptions:c.options.data[k],pointIndex:k,oldExtremes:{xMin:g&&g.userMin,xMax:g&&g.userMax,yMin:e&&e.userMin,yMax:e&&e.userMax},resetZoomButton:this.resetZoomButton},m);this.drilldownLevels.push(a);g&&g.names&&(g.names.length=0);b=a.lowerSeries=this.addSeries(b,!1);b.options._levelNumber=l+1;g&&(g.oldPos=g.pos,g.userMin=g.userMax=null,e.userMin=e.userMax=null);c.type===b.type&&(b.animate=b.animateDrilldown||n,b.options.animation=
!0)};m.prototype.applyDrilldown=function(){var a=this.drilldownLevels,b;a&&0<a.length&&(b=a[a.length-1].levelNumber,this.drilldownLevels.forEach(function(a){a.levelNumber===b&&a.levelSeries.forEach(function(a){a.options&&a.options._levelNumber===b&&a.remove(!1)})}));this.resetZoomButton&&(this.resetZoomButton.hide(),delete this.resetZoomButton);this.pointer.reset();this.redraw();this.showDrillUpButton();v(this,"afterDrilldown")};m.prototype.getDrilldownBackText=function(){var a=this.drilldownLevels;
if(a&&0<a.length)return a=a[a.length-1],a.series=a.seriesOptions,C(this.options.lang.drillUpText,a)};m.prototype.showDrillUpButton=function(){var a=this,b=this.getDrilldownBackText(),c=a.options.drilldown.drillUpButton,g,e;this.drillUpButton?this.drillUpButton.attr({text:b}).align():(e=(g=c.theme)&&g.states,this.drillUpButton=this.renderer.button(b,null,null,function(){a.drillUp()},g,e&&e.hover,e&&e.select).addClass("highcharts-drillup-button").attr({align:c.position.align,zIndex:7}).add().align(c.position,
!1,c.relativeTo||"plotBox"))};m.prototype.drillUp=function(){if(this.drilldownLevels&&0!==this.drilldownLevels.length){for(var a=this,b=a.drilldownLevels,c=b[b.length-1].levelNumber,g=b.length,e=a.series,k,h,d,l,f=function(b){var c;e.forEach(function(a){a.options._ddSeriesId===b._ddSeriesId&&(c=a)});c=c||a.addSeries(b,!1);c.type===d.type&&c.animateDrillupTo&&(c.animate=c.animateDrillupTo);b===h.seriesOptions&&(l=c)};g--;)if(h=b[g],h.levelNumber===c){b.pop();d=h.lowerSeries;if(!d.chart)for(k=e.length;k--;)if(e[k].options.id===
h.lowerSeriesOptions.id&&e[k].options._levelNumber===c+1){d=e[k];break}d.xData=[];h.levelSeriesOptions.forEach(f);v(a,"drillup",{seriesOptions:h.seriesOptions});l.type===d.type&&(l.drilldownLevel=h,l.options.animation=a.options.drilldown.animation,d.animateDrillupFrom&&d.chart&&d.animateDrillupFrom(h));l.options._levelNumber=c;d.remove(!1);l.xAxis&&(k=h.oldExtremes,l.xAxis.setExtremes(k.xMin,k.xMax,!1),l.yAxis.setExtremes(k.yMin,k.yMax,!1));h.resetZoomButton&&(a.resetZoomButton=h.resetZoomButton,
a.resetZoomButton.show())}this.redraw();0===this.drilldownLevels.length?this.drillUpButton=this.drillUpButton.destroy():this.drillUpButton.attr({text:this.getDrilldownBackText()}).align();this.ddDupes.length=[];v(a,"drillupall")}};m.prototype.callbacks.push(function(){var a=this;a.drilldown={update:function(b,c){d.merge(!0,a.options.drilldown,b);t(c,!0)&&a.redraw()}}});d.addEvent(m,"beforeShowResetZoom",function(){if(this.drillUpButton)return!1});d.addEvent(m,"render",function(){(this.xAxis||[]).forEach(function(a){a.ddPoints=
{};a.series.forEach(function(b){var c,g=b.xData||[],e=b.points,d;for(c=0;c<g.length;c++)d=b.options.data[c],"number"!==typeof d&&(d=b.pointClass.prototype.optionsToObject.call({series:b},d),d.drilldown&&(a.ddPoints[g[c]]||(a.ddPoints[g[c]]=[]),a.ddPoints[g[c]].push(e?e[c]:!0)))});y(a.ticks,A.prototype.drillable)})});p.prototype.animateDrillupTo=function(a){if(!a){var b=this,c=b.drilldownLevel;this.points.forEach(function(a){var b=a.dataLabel;a.graphic&&a.graphic.hide();b&&(b.hidden="hidden"===b.attr("visibility"),
b.hidden||(b.hide(),a.connector&&a.connector.hide()))});d.syncTimeout(function(){b.points&&b.points.forEach(function(a,b){b=b===(c&&c.pointIndex)?"show":"fadeIn";var g="show"===b?!0:void 0,d=a.dataLabel;if(a.graphic)a.graphic[b](g);d&&!d.hidden&&(d.fadeIn(),a.connector&&a.connector.fadeIn())})},Math.max(this.chart.options.drilldown.animation.duration-50,0));this.animate=n}};p.prototype.animateDrilldown=function(a){var b=this,c=this.chart,d=c.drilldownLevels,e,k=f(c.options.drilldown.animation),h=
this.xAxis,r=c.styledMode;a||(d.forEach(function(a){b.options._ddSeriesId===a.lowerSeriesOptions._ddSeriesId&&(e=a.shapeArgs,r||(e.fill=a.color))}),e.x+=t(h.oldPos,h.pos)-h.pos,this.points.forEach(function(a){var c=a.shapeArgs;r||(c.fill=a.color);a.graphic&&a.graphic.attr(e).animate(q(a.shapeArgs,{fill:a.color||b.color}),k);a.dataLabel&&a.dataLabel.fadeIn(k)}),this.animate=null)};p.prototype.animateDrillupFrom=function(a){var b=f(this.chart.options.drilldown.animation),c=this.group,g=c!==this.chart.columnGroup,
e=this;e.trackerGroups.forEach(function(a){if(e[a])e[a].on("mouseover")});g&&delete this.group;this.points.forEach(function(k){var h=k.graphic,f=a.shapeArgs,l=function(){h.destroy();c&&g&&(c=c.destroy())};h&&(delete k.graphic,e.chart.styledMode||(f.fill=a.color),b.duration?h.animate(f,d.merge(b,{complete:l})):(h.attr(f),l()))})};z&&q(z.prototype,{animateDrillupTo:p.prototype.animateDrillupTo,animateDrillupFrom:p.prototype.animateDrillupFrom,animateDrilldown:function(a){var b=this.chart.drilldownLevels[this.chart.drilldownLevels.length-
1],c=this.chart.options.drilldown.animation,g=b.shapeArgs,e=g.start,k=(g.end-e)/this.points.length,f=this.chart.styledMode;a||(this.points.forEach(function(a,h){var l=a.shapeArgs;f||(g.fill=b.color,l.fill=a.color);if(a.graphic)a.graphic.attr(d.merge(g,{start:e+h*k,end:e+(h+1)*k}))[c?"animate":"attr"](l,c)}),this.animate=null)}});d.Point.prototype.doDrilldown=function(a,b,c){var d=this.series.chart,e=d.options.drilldown,f=(e.series||[]).length,h;d.ddDupes||(d.ddDupes=[]);for(;f--&&!h;)e.series[f].id===
this.drilldown&&-1===d.ddDupes.indexOf(this.drilldown)&&(h=e.series[f],d.ddDupes.push(this.drilldown));v(d,"drilldown",{point:this,seriesOptions:h,category:b,originalEvent:c,points:void 0!==b&&this.series.xAxis.getDDPoints(b).slice(0)},function(b){var c=b.point.series&&b.point.series.chart,d=b.seriesOptions;c&&d&&(a?c.addSingleSeriesAsDrilldown(b.point,d):c.addSeriesAsDrilldown(b.point,d))})};d.Axis.prototype.drilldownCategory=function(a,b){y(this.getDDPoints(a),function(c){c&&c.series&&c.series.visible&&
c.doDrilldown&&c.doDrilldown(!0,a,b)});this.chart.applyDrilldown()};d.Axis.prototype.getDDPoints=function(a){return this.ddPoints&&this.ddPoints[a]};A.prototype.drillable=function(){var a=this.pos,b=this.label,c=this.axis,g="xAxis"===c.coll&&c.getDDPoints,e=g&&c.getDDPoints(a),f=c.chart.styledMode;g&&(b&&e&&e.length?(b.drillable=!0,b.basicStyles||f||(b.basicStyles=d.merge(b.styles)),b.addClass("highcharts-drilldown-axis-label").on("click",function(b){c.drilldownCategory(a,b)}),f||b.css(c.chart.options.drilldown.activeAxisLabelStyle)):
b&&b.drillable&&(f||(b.styles={},b.css(b.basicStyles)),b.on("click",null),b.removeClass("highcharts-drilldown-axis-label")))};d.addEvent(d.Point,"afterInit",function(){var a=this,b=a.series;a.drilldown&&d.addEvent(a,"click",function(c){b.xAxis&&!1===b.chart.options.drilldown.allowPointDrilldown?b.xAxis.drilldownCategory(a.x,c):a.doDrilldown(void 0,void 0,c)});return a});d.addEvent(d.Series,"afterDrawDataLabels",function(){var a=this.chart.options.drilldown.activeDataLabelStyle,b=this.chart.renderer,
c=this.chart.styledMode;this.points.forEach(function(d){var e=d.options.dataLabels,f=t(d.dlOptions,e&&e.style,{});d.drilldown&&d.dataLabel&&("contrast"!==a.color||c||(f.color=b.getContrast(d.color||this.color)),e&&e.color&&(f.color=e.color),d.dataLabel.addClass("highcharts-drilldown-data-label"),c||d.dataLabel.css(a).css(f))},this)});var w=function(a,b,c,d){a[c?"addClass":"removeClass"]("highcharts-drilldown-point");d||a.css({cursor:b})};d.addEvent(d.Series,"afterDrawTracker",function(){var a=this.chart.styledMode;
this.points.forEach(function(b){b.drilldown&&b.graphic&&w(b.graphic,"pointer",!0,a)})});d.addEvent(d.Point,"afterSetState",function(){var a=this.series.chart.styledMode;this.drilldown&&this.series.halo&&"hover"===this.state?w(this.series.halo,"pointer",!0,a):this.series.halo&&w(this.series.halo,"auto",!1,a)})});n(f,"masters/modules/drilldown.src.js",[],function(){})});
//# sourceMappingURL=drilldown.js.map

/*
  Highcharts JS v7.1.2 (2019-06-03)

 Variable Pie module for Highcharts

 (c) 2010-2019 Grzegorz Blachliski

 License: www.highcharts.com/license
*/
(function(a){"object"===typeof module&&module.exports?(a["default"]=a,module.exports=a):"function"===typeof define&&define.amd?define("highcharts/modules/variable-pie",["highcharts"],function(g){a(g);a.Highcharts=g;return a}):a("undefined"!==typeof Highcharts?Highcharts:void 0)})(function(a){function g(a,r,g,p){a.hasOwnProperty(r)||(a[r]=p.apply(null,g))}a=a?a._modules:{};g(a,"modules/variable-pie.src.js",[a["parts/Globals.js"]],function(a){var g=a.pick,u=a.arrayMin,p=a.arrayMax,v=a.seriesType,w=
a.seriesTypes.pie.prototype;v("variablepie","pie",{minPointSize:"10%",maxPointSize:"100%",zMin:void 0,zMax:void 0,sizeBy:"area",tooltip:{pointFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e {series.name}\x3cbr/\x3eValue: {point.y}\x3cbr/\x3eSize: {point.z}\x3cbr/\x3e'}},{pointArrayMap:["y","z"],parallelArrays:["x","y","z"],redraw:function(){this.center=null;w.redraw.call(this,arguments)},zValEval:function(b){return"number"!==typeof b||isNaN(b)?null:!0},calculateExtremes:function(){var b=
this.chart,a=this.options,d;d=this.zData;var t=Math.min(b.plotWidth,b.plotHeight)-2*(a.slicedOffset||0),h={},b=this.center||this.getCenter();["minPointSize","maxPointSize"].forEach(function(b){var c=a[b],d=/%$/.test(c),c=parseInt(c,10);h[b]=d?t*c/100:2*c});this.minPxSize=b[3]+h.minPointSize;this.maxPxSize=Math.max(Math.min(b[2],h.maxPointSize),b[3]+h.minPointSize);d.length&&(b=g(a.zMin,u(d.filter(this.zValEval))),d=g(a.zMax,p(d.filter(this.zValEval))),this.getRadii(b,d,this.minPxSize,this.maxPxSize))},
getRadii:function(b,a,d,g){var h=0,e,c=this.zData,l=c.length,m=[],q="radius"!==this.options.sizeBy,k=a-b;for(h;h<l;h++)e=this.zValEval(c[h])?c[h]:b,e<=b?e=d/2:e>=a?e=g/2:(e=0<k?(e-b)/k:.5,q&&(e=Math.sqrt(e)),e=Math.ceil(d+e*(g-d))/2),m.push(e);this.radii=m},translate:function(b){this.generatePoints();var a=0,d=this.options,t=d.slicedOffset,h=t+(d.borderWidth||0),e,c,l,m=d.startAngle||0,q=Math.PI/180*(m-90),k=Math.PI/180*(g(d.endAngle,m+360)-90),m=k-q,p=this.points,r,u=d.dataLabels.distance,d=d.ignoreHiddenPoint,
v=p.length,f,n;this.startAngleRad=q;this.endAngleRad=k;this.calculateExtremes();b||(this.center=b=this.getCenter());for(k=0;k<v;k++){f=p[k];n=this.radii[k];f.labelDistance=g(f.options.dataLabels&&f.options.dataLabels.distance,u);this.maxLabelDistance=Math.max(this.maxLabelDistance||0,f.labelDistance);c=q+a*m;if(!d||f.visible)a+=f.percentage/100;l=q+a*m;f.shapeType="arc";f.shapeArgs={x:b[0],y:b[1],r:n,innerR:b[3]/2,start:Math.round(1E3*c)/1E3,end:Math.round(1E3*l)/1E3};c=(l+c)/2;c>1.5*Math.PI?c-=2*
Math.PI:c<-Math.PI/2&&(c+=2*Math.PI);f.slicedTranslation={translateX:Math.round(Math.cos(c)*t),translateY:Math.round(Math.sin(c)*t)};e=Math.cos(c)*b[2]/2;r=Math.sin(c)*b[2]/2;l=Math.cos(c)*n;n*=Math.sin(c);f.tooltipPos=[b[0]+.7*e,b[1]+.7*r];f.half=c<-Math.PI/2||c>Math.PI/2?1:0;f.angle=c;e=Math.min(h,f.labelDistance/5);f.labelPosition={natural:{x:b[0]+l+Math.cos(c)*f.labelDistance,y:b[1]+n+Math.sin(c)*f.labelDistance},"final":{},alignment:f.half?"right":"left",connectorPosition:{breakAt:{x:b[0]+l+
Math.cos(c)*e,y:b[1]+n+Math.sin(c)*e},touchingSliceAt:{x:b[0]+l,y:b[1]+n}}}}}})});g(a,"masters/modules/variable-pie.src.js",[],function(){})});
//# sourceMappingURL=variable-pie.js.map

/*! http://mths.be/placeholder v2.0.7 by @mathias */
; (function (h, j, e) { var a = "placeholder" in j.createElement("input"); var f = "placeholder" in j.createElement("textarea"); var k = e.fn; var d = e.valHooks; var b = e.propHooks; var m; var l; if (a && f) { l = k.placeholder = function () { return this }; l.input = l.textarea = true } else { l = k.placeholder = function () { var n = this; n.filter((a ? "textarea" : ":input") + "[placeholder]").not(".placeholder").bind({ "focus.placeholder": c, "blur.placeholder": g }).data("placeholder-enabled", true).trigger("blur.placeholder"); return n }; l.input = a; l.textarea = f; m = { get: function (o) { var n = e(o); var p = n.data("placeholder-password"); if (p) { return p[0].value } return n.data("placeholder-enabled") && n.hasClass("placeholder") ? "" : o.value }, set: function (o, q) { var n = e(o); var p = n.data("placeholder-password"); if (p) { return p[0].value = q } if (!n.data("placeholder-enabled")) { return o.value = q } if (q == "") { o.value = q; if (o != j.activeElement) { g.call(o) } } else { if (n.hasClass("placeholder")) { c.call(o, true, q) || (o.value = q) } else { o.value = q } } return n } }; if (!a) { d.input = m; b.value = m } if (!f) { d.textarea = m; b.value = m } e(function () { e(j).delegate("form", "submit.placeholder", function () { var n = e(".placeholder", this).each(c); setTimeout(function () { n.each(g) }, 10) }) }); e(h).bind("beforeunload.placeholder", function () { e(".placeholder").each(function () { this.value = "" }) }) } function i(o) { var n = {}; var p = /^jQuery\d+$/; e.each(o.attributes, function (r, q) { if (q.specified && !p.test(q.name)) { n[q.name] = q.value } }); return n } function c(o, p) { var n = this; var q = e(n); if (n.value == q.attr("placeholder") && q.hasClass("placeholder")) { if (q.data("placeholder-password")) { q = q.hide().next().show().attr("id", q.removeAttr("id").data("placeholder-id")); if (o === true) { return q[0].value = p } q.focus() } else { n.value = ""; q.removeClass("placeholder"); n == j.activeElement && n.select() } } } function g() { var r; var n = this; var q = e(n); var p = this.id; if (n.value == "") { if (n.type == "password") { if (!q.data("placeholder-textinput")) { try { r = q.clone().attr({ type: "text" }) } catch (o) { r = e("<input>").attr(e.extend(i(this), { type: "text" })) } r.removeAttr("name").data({ "placeholder-password": q, "placeholder-id": p }).bind("focus.placeholder", c); q.data({ "placeholder-textinput": r, "placeholder-id": p }).before(r) } q = q.removeAttr("id").hide().prev().attr("id", p).show() } q.addClass("placeholder"); q[0].value = q.attr("placeholder") } else { q.removeClass("placeholder") } } }(this, document, jQuery));



$(function () {
	var $win = $(window), $doc = $(document), $body = $(document.body);

	$.ajaxSetup({ cache: false });

	//for file upload with ui style
	// var filesToUpload = [];
	// var files1Uploader = $("#fileinputWrap").fileUploader(filesToUpload, "fileinputWrap");
	//end

	$('input[placeholder], textarea[placeholder]').placeholder();

	// function truncate(input, length) {
	//    if (input.length > length){
	//       return input.substring(0,length) + '...';
	//    }else{
	//       return input;
	//    }
	// }

	// file upload
	//$( '.inputfile' ).fileUpload();

	// display modal on top of modal
	$doc.on('show.bs.modal', '.modal', function (event) {
		var zIndex = 1040 + (10 * $('.modal:visible').length);
		$(this).css('z-index', zIndex);
		setTimeout(function () {
			$('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
		}, 0);
	});


	$('#quick_taklet_actions_ul').on('click', function(evt){
		evt &&  evt.preventDefault();
		var $item = $(evt.originalEvent.target)
		var $li = $item.parent('li')
		var target = $item.attr('href')
		var hasSubMenu = $li.hasClass('has-submenu')
		if (hasSubMenu) {
			$li.toggleClass('active')
			return
		}
		//$(target).show(100)
		//target && window.scrollTo({ top: $(target).offset().top - 10, behavior: 'smooth'});
	});

	// $('.close_section').on('click', function(evt){
	// 	evt && evt.preventDefault();
	// 	var target = $(this).data('target');
	// 	//$('#' + target).css('display', 'none');
	// 	$('#' + target).hide(100);
	// });

	$doc.on('click', '.close_section', function(evt){
		evt && evt.preventDefault();
		//var target = $(this).data('target');
		var $target = $(this).parents('#partialContainer');
		//$('#' + target).css('display', 'none');
		$target.empty()
		//$('#' + target).hide(100);
	});


	$(".basic-table").delegate("tr", "click", function(){
        $(".hidden-morasla").show();
    });

	$('#change_status').click(function () {
		$('.hidden-status').toggle();
	});



	$(document).ready(function () {

		///////////////////////// wizard /////////////////////////

		var current_fs, next_fs, previous_fs; //fieldsets
		var opacity;

		$(".next").click(function () {

			current_fs = $(this).closest('fieldset');
			next_fs = $(this).closest('fieldset').next();

			//Add Class Active , Done
			$("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");
			$("#progressbar li").eq($("fieldset").index(current_fs)).addClass("done");

			//show the next fieldset
			next_fs.show();
			//hide the current fieldset with style
			current_fs.animate({ opacity: 0 }, {
				step: function (now) {
					// for making fielset appear animation
					opacity = 1 - now;

					current_fs.css({
						'display': 'none',
						'position': 'relative'
					});
					next_fs.css({ 'opacity': opacity });
				},
				duration: 600
			});
		});

		$(".previous").click(function () {

			current_fs = $(this).closest('fieldset');
			previous_fs = $(this).closest('fieldset').prev();

			//Remove class active
			$("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");

			//show the previous fieldset
			previous_fs.show();

			//hide the current fieldset with style
			current_fs.animate({ opacity: 0 }, {
				step: function (now) {
					// for making fielset appear animation
					opacity = 1 - now;

					current_fs.css({
						'display': 'none',
						'position': 'relative'
					});
					previous_fs.css({ 'opacity': opacity });
				},
				duration: 600
			});
		});

		/////////// tabs ///////////

		$("div.as-vertical-tab-menu>div.list-group>a").click(function (e) {
			e.preventDefault();
			$(this).siblings('a.active').removeClass("active");
			$(this).addClass("active");
			var index = $(this).index();
			$("div.as-vertical-tab>div.as-vertical-tab-content").removeClass("active");
			$("div.as-vertical-tab>div.as-vertical-tab-content").eq(index).addClass("active");
		});
	});




	// ANIMATEDLY DISPLAY THE NOTIFICATION COUNTER.
	// $('#noti_Counter')
	//     .css({ opacity: 0 })
	//     .css({ top: '-10px' })
	//     .animate({ top: '-2px', opacity: 1 }, 500);

	$('#noti_Button').click(function () {
		// TOGGLE (SHOW OR HIDE) NOTIFICATION WINDOW.
		$('#notifications').fadeToggle('fast', 'linear');
		//$('#noti_Counter').fadeOut('slow');     // HIDE THE COUNTER.
		return false;
	});
	// HIDE NOTIFICATIONS WHEN CLICKED ANYWHERE ON THE PAGE.
	$doc.click(function () {
		$('#notifications').hide();
	});
	$('#notifications').click(function () {
		return false;   // DO NOTHING WHEN CONTAINER IS CLICKED.
	});
	// end it

	function spinner () {
		return '<div class="spinner dark"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
	}


	function modalTemp(modalId, modalSize, modalTitle) {
		return [
			'<div class="modal" tabindex="-1" role="dialog" id="' + modalId + '">',

			'<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ' + modalSize + '" role="document">',
			'<div class="modal-content">',

			'<div class="modal-header">',
			'<h5 class="modal-title">' + modalTitle + '</h5>',
			'<button type="button" class="close" data-dismiss="modal" aria-label="Close">',
			'<span aria-hidden="true">&times;</span>',
			'</button>',
			'</div>',

			'<div class="modal-body" id="modalBody"></div>',

			'</div>',
			'</div>',

			'</div>'
		].join('')
	}


	// ajax modals
	// $doc.on( 'click', '[data-toggle="ajaxModal"]', function(e){
	//    e && e.preventDefault();

	//    var $this = $(this), 
	//    	$remote =  $this.attr('href'),
	//    	$modalTitle = $this.data('modal-title'),
	//    	modalSize = $this.data('modal-size'),
	//    	$modalId = $remote.split('.')[0],
	//    	$modal = $(modalTemp($modalId, modalSize, $modalTitle));

	//    $body.append($modal);

	//    $modal
	//    .modal({
	//    	backdrop: 'static',
	//    	keyboard: false,
	//    	show: true
	//    })
	//    .on('hide.bs.modal', function(event){ $('#'+$modalId).remove(); })
	//    .find('#modalBody')
	//    .append('<div class="spinner dark"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>')
	//    .load($remote + " #mainContent", function(responseTxt, statusTxt, xhr){
	//    	//$('.taflefat-tabs .nav').tab();
	//       if(statusTxt == "error"){

	//       	$('#'+$modalId).modal('hide').remove();
	//       } 

	//       var filesToUpload = [];
	// var files1Uploader = $("#fileinputWrap").fileUploader(filesToUpload, "fileinputWrap");
	//    //    $("[data-input='tags']").autocomplete({
	//    //   source: availableTags,
	//    //   appendTo: '#autocomplete-parent'
	//    // })

	//    //////////// js-select2
	// $('.js-select2').each(function(index, item){
	// 	var $item = $(item), option = $item.data('select');
	// 	$item.select2(option)
	// });
	//    });

	//    $this.off('click');
	// });


	//ajax partial
	$doc.on( 'click', '[data-toggle="ajaxpartial"]', function(e){
	   e && e.preventDefault();

	   var $this = $(this), 
	   	$remote =  $this.attr('href') || $this.data('partial'),
	   	$partialContainer = $('#partialContainer'),
	   	spinner = $('<div class="ptlg pblg mtlg mbmd b_all"><div class="spinner dark"><div class="double-bounce1"></div><div class="double-bounce2"></div></div></div>')

   	$partialContainer.empty().append(spinner);

	   $.ajax({
	   	url: $remote,
	   	dataType: "html"
	   }).done(function(data){
			$partialContainer.html(data)
			window.scrollTo({ top: $partialContainer.offset().top - 10, behavior: 'smooth'});
   		//var filesToUpload = [];
			//var files1Uploader = $("#fileinputWrap").fileUploader(filesToUpload, "fileinputWrap");
   		$('.js-select2').each(function(index, item){
				var $item = $(item), option = $item.data('select');
				$item.select2(option)
			});
		}).fail(function() { 
			/* Do error.. */
			var $error = $('<div class="alert alert-danger mtlg" role="alert">حدث خطأ ما، برجاء التحقق من اتصالك بالانترنت</div>')
			$partialContainer.html($error)
		});
	});


	$doc.on("click", ".modal-body .nav .nav-link", function () {
		tab = $(this).attr("href");
		$(".modal-body .tab-pane").each(function () {
			$(this).removeClass("show active");
		});
		$(".modal-body .tab-content " + tab).addClass("show active");
	});


	//// search
	// add class focused to expend search input
	$('.global-search .search_input').on('focus', function () {
		$(this).parent().addClass('focused');
	}).on('blur', function () {
		var $inputVal = $(this).val();
		if (!$inputVal.length || $inputVal == '') {
			$(this).parent().removeClass('focused');
		}
	});


	//////////// js-select2
	$('.js-select2').each(function (index, item) {
		var $item = $(item), option = $item.data('select');
		$item.select2(option)
	});



	//////////////////////////////////////////////////
	/////////////////////// define highchart defaults
	//////////////////////////////////////////////////
	Highcharts.setOptions({
		chart: {
			borderWidth: 0,
			backgroundColor: 'transparent',
			style: {
				//direction: 'rtl',
				fontFamily: 'DIN Next LT Arabic'
			}
		},
		credits: {
			enabled: false
		},
		title: {
			text: null
		},
		exporting: { enabled: false },
		colors: ['#46d1c2', '#feb37a', '#fe7975', '#46D1C1', '#FF7C5C', '#FFE597', '#DF6727', '#662640', '#c0c0c0'],
		mapNavigation: {
			enabled: false
		},
		navigation: {
			buttonOptions: {
				//x: -540
			}
		},
		plotOptions: {
			pie: {
				showInLegend: true,
				useHTML: true,
				allowPointSelect: true,
				cursor: 'pointer',
				dataLabels: {
					enabled: true,
					useHTML: true,
					style: {
						color: '#B2B2B2',
						fill: '#B2B2B2'
					},
					className: 'drilldown-link'
					//format: '{point.y:.1f}%'
				}
			},
			useHTML: true,
			series: {
				borderColor: '#FFFFFF',
				marker: { enabled: false },
				nullColor: '#eee',
				borderWidth: 2,
				states: {
					hover: {
						marker: {
							enabled: false
						}
					}
				}
			}
		},
		lang: {
			drillUpText: 'رجوع',
			downloadJPEG: "JPEG تحميل صورة",
			downloadPDF: "PDF تحميل صورة",
			downloadPNG: "PNG تحميل صورة",
			downloadSVG: "SVF تحميل صورة",
			printChart: "طباعة صورة",
			viewFullscreen: "عرض شاشة كبيرة",
			months: ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو',
				'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر'],
			weekdays: ["الاحد", "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة", "السبت"],
			loading: "جاري التحميل",
			noData: "لا يوجد بيانات"
		}
	});


	(function (H) {
		//DATALABELS
		H.wrap(H.Series.prototype, 'drawDataLabels', function (proceed) {
			var css = this.chart.options.drilldown.activeDataLabelStyle;
			proceed.call(this);

			css.textDecoration = 'none';
			css.fontWeight = 'normal';
			css.color = '#B2B2B2';

			H.each(this.points, function (point) {

				if (point.dataLabel) { // <-- remove 'point.drilldown &&' 
					point.dataLabel
						.css(css)
						.on('click', function () {
							return false;
						});
				}
			});
		});
	})(Highcharts);


	if ($('#taklf-source').length) {
		Highcharts.chart('taklf-source', {
			chart: { type: 'column', plotShadow: false },
			xAxis: {
				tickInterval: 1,
				labels: {
					enabled: true,
					formatter: function () {
						var data = $('#taklf-source').data('chart')
						var categories = [];
						if (data[this.value]['name'] === 'True') {
							categories.push('داخلي')
						} else {
							categories.push('خارجي')
						}
						return categories
					},
				}
			},
			yAxis: {
				title: true,
				gridLineWidth: 0
			},
			plotOptions: {
				column: {
					dataLabels: {
						formatter: function () {
							return this.point.name
						}
					}
				},
				series: {
					data: $('#taklf-source').data('chart'),
					borderWidth: 0,
					dataLabels: {
						style: {
							textShadow: false,
							textOutline: false
						},
						enabled: true,
						formatter: function () {
							return this.point.y
						}
					}
				}
			},
			tooltip: {
				enabled: false,
			},
			legend: {
				enabled: false
			},
			series: [{
				name: 'التكليفات حسب المصدر',
				colorByPoint: true
			}]
		})
	}

	if ($('#taklf-status-chart').length) {
		Highcharts.chart('taklf-status-chart', {
			chart: { type: 'pie', plotShadow: false },
			plotOptions: {
				pie: {
					showInLegend: true,
					center: ['50%', '50%'],
					colorByPoint: true,
					allowPointSelect: true,
					cursor: 'pointer',
					//data: $('#container_one').data('chart'),
					dataLabels: {
						formatter: function () {
							return this.point.name + ' : ' + this.point.y
						}
					},
					size: 130
				}
			},
			tooltip: {
				enabled: true,
				useHTML: true,
				formatter: function () {
					return '<span>' + this.point.name + '</span>:' + this.point.y
				}
			},
			legend: {
				enabled: false
			},
			series: [{
				name: 'حالة التكليفات',
				colorByPoint: true,
				data: $('#taklf-status-chart').data('chart'),
				useHTML: true,
				formatter: function () {
					return '<div>' + this.point.name + ':<b>' + this.y + '</b></div>'
				}
			}]
		})
	}

	if ($('#taklf-monster-chart').length) {
		Highcharts.chart('taklf-monster-chart', {
			chart: { type: 'pie', plotShadow: false },
			plotOptions: {
				pie: {
					showInLegend: true,
					center: ['50%', '50%'],
					colorByPoint: true,
					allowPointSelect: true,
					innerSize: '70%',
					cursor: 'pointer',
					//data: $('#container_one').data('chart'),
					dataLabels: {
						//format: '{point.y:.1f}%'
						formatter: function () {
							return this.point.name + ' : ' + this.point.y
						}
					},
					size: 130
				}
			},
			tooltip: {
				enabled: true,
				useHTML: true,
				formatter: function () {
					return '<span>' + this.point.name + '</span>:' + this.point.y
				}
			},
			legend: {
				enabled: false
			},
			series: [{
				name: 'حالة التكليفات',
				colorByPoint: true,
				data: $('#taklf-monster-chart').data('chart'),
				useHTML: true,
				formatter: function () {
					return '<div>' + this.point.name + ':<b>' + this.y + '</b></div>'
				}
			}]
		})
	}

	if ($('#taklf-mahafez-chart').length) {
		Highcharts.chart('taklf-mahafez-chart', {
			chart: {
				type: 'column',
				backgroundColor: 'transparent'
			},
			xAxis: {
				type: 'category'
			},
			yAxis: {
				title: false,
				gridLineWidth: 0
			},
			legend: {
				enabled: false
			},
			plotOptions: {
				column: {
					zones: [{
						value: 4, // Values up to 4 (not including) ...
						color: '#A4A4A4' // ... have the color blue.
					}, {
						value: 9,
						color: '#1F78B4' // Values from 10 (including) and up have the color red
					}, {
						value: 10,
						color: '#1CA0B0' // Values from 10 (including) and up have the color red
					}, {
						color: '#0F7267' // Values from 10 (including) and up have the color red
					}]
				},
				series: {
					borderWidth: 0,
					dataLabels: {
						style: {
							textShadow: false,
							textOutline: false
						},
						enabled: true,
						formatter: function () {
							return this.point.y
						}
					}
				}
			},
			tooltip: {
				formatter: function () {
					return [
						'<div>',
						'<div><span style="color:' + this.point.color + '">' + this.point.name + '</span></div><br />',
						'<div style="float:right;display:flex;"><span>بنسبة</span><span>' + this.point.y + '%</span><span> من المجموع الكلي </span></div>',
						'</div>'
					].join("");
				},
				// headerFormat: '<span style="font-size:11px;">&nbsp;</span><br>',
				// pointFormat: '<div><span style="color:{point.color}">{point.name}</span> <div><b>{point.y:.2f}%</b> of total</div></div>'
			},
			series: [
				{
					colorByPoint: true,
					data: $('#taklf-mahafez-chart').data('chart')
				}
			],
		});
	}

	// if($('#container_one').length) {
	// 	Highcharts.chart('container_one', {
	// 		chart: {  type: 'pie' },
	// 		plotOptions: {
	// 			pie: {
	// 				showInLegend: true,
	// 				center: ['50%', '50%'],
	// 				minPointSize: 10,
	// 				colorByPoint: true,
	// 				allowPointSelect: true,
	// 				innerSize: '30%',
	// 				size: '80%',
	// 				cursor: 'pointer',
	// 				data: $('#container_one').data('chart'),
	// 				dataLabels: {
	// 					//format: '{point.y:.1f}%'
	// 					formatter: function(){
	// 						if(this.point.positive === false){
	// 							return '-' + this.point.y
	// 						}
	// 						return this.point.y
	// 					}
	//             },
	//             size:130
	// 			}
	//      	},
	// 		tooltip: {
	// 			enabled:true,
	// 			useHTML:true,
	// 			formatter: function(){
	// 				if(this.point.finshedProjects){
	// 					return ['<div>',
	// 					'<div>عدد المشاريع: ' + this.point.finshedProjects + '</div>',
	// 					'</div>'].join('');
	// 				}else{
	// 					if(this.point.delayreason){
	// 						return '<span>' + this.point.name + '</span>: <br />' + this.point.delayreason +'<br/>';
	// 					}else{
	// 						if(this.point.positive === false){
	// 							return '<span style="color:' + this.color + '">' + this.point.name + '</span> <br /> -' + this.point.y +'<br/>';
	// 						}
	// 						return '<span style="color:' + this.color + '">' + this.point.name + '</span> <br />' + this.point.y +'<br/>';
	// 					}
	// 				}
	// 			}
	// 		},
	// 		legend: {
	// 			enabled:true,
	// 			symbolHeight: 8,
	// 			symbolWidth: 8,
	// 			symbolRadius: 0,
	// 			y:20,
	// 			itemStyle: {
	// 				color: '#B2B2B2',
	// 				fontSize:'14px',
	// 				fontWeight:'normal'
	// 			},
	// 			maxHeight:45,
	// 			minHeight:45
	// 		},
	// 		series: [{
	// 			colorByPoint: true,
	// 			allowPointSelect: true,
	// 			dataLabels: {
	//            verticalAlign: 'top',
	//            enabled: true,
	//            connectorWidth: 1,
	//            distance: -20,
	//            legend:{
	//            	enabled:false
	//            },
	//            formatter: function() {
	//                return '<div style="color:#FFFFFF">'+ this.point.finshedProjects + '</div>';
	//            }
	//        	}
	// 		},{
	// 			type: 'pie',
	// 			showInLegend: false,
	// 			colorByPoint: true,
	// 			allowPointSelect: true,
	// 			dataLabels: {
	// 				enabled: true,
	// 				color: '#FFFFFF',
	// 				connectorWidth: 1,
	// 				distance: 25,
	// 				//connectorColor: '#000000',
	// 				colorByPoint: true,
	// 				formatter: function() {
	//                return [
	//                '<div>',
	//                	'<div>( <b>'+Math.round(this.percentage)+' %</b> )</div>',
	//                	this.point.finshedProjects +' :<b>مشاريع</b>',
	//                '</div>'
	//                ].join('')
	// 				}
	// 			}
	//       }],
	// 		drilldown: {
	// 			series: $('#container_one').data('drilldown')
	// 		}
	// 	});
	// }

	// if($('#container_two').length) {
	// 	Highcharts.chart('container_two', {
	// 		chart: {  type: 'pie' },
	// 		plotOptions: {
	// 			pie: {
	// 				minPointSize: 10,
	// 				colorByPoint: true,
	// 				showInLegend: true,
	// 				allowPointSelect: true,
	// 				innerSize: '30%',
	// 				size: '80%',
	// 				cursor: 'pointer',
	// 				data: $('#container_two').data('chart'),
	// 				dataLabels: {
	// 					//format: '{point.y:.1f}%'
	// 					formatter: function(){
	// 						if(this.point.positive === false){
	// 							return '-' + this.point.y
	// 						}
	// 						return this.point.y
	// 					}
	//             },
	//             	size:130
	// 			}
	// 		},
	// 		tooltip: {
	// 			enabled:true,
	// 			useHTML:true,
	// 			formatter: function(){
	// 				if(this.point.finshedProjects){
	// 					return ['<div>',
	// 					'<div>عدد المشاريع: ' + this.point.finshedProjects + '</div>',
	// 					'</div>'].join('');
	// 				}else{
	// 					if(this.point.delayreason){
	// 						return '<span>' + this.point.name + '</span>: <br />' + this.point.delayreason +'<br/>';
	// 					}else{
	// 						if(this.point.positive === false){
	// 							return '<span style="color:' + this.color + '">' + this.point.name + '</span> <br /> -' + this.point.y +'<br/>';
	// 						}
	// 						return '<span style="color:' + this.color + '">' + this.point.name + '</span> <br />' + this.point.y +'<br/>';
	// 					}
	// 				}
	// 			}
	// 		},
	// 		legend: {
	// 			symbolHeight: 8,
	// 			symbolWidth: 8,
	// 			symbolRadius: 0,
	// 			y:20,
	// 			itemStyle: {
	// 				color: '#B2B2B2',
	// 				fontSize:'14px',
	// 				fontWeight:'normal'
	// 			},
	// 			maxHeight:45,
	// 			minHeight:45
	// 		},
	// 		series: [{
	// 			colorByPoint: true,
	// 			allowPointSelect: true,
	// 			dataLabels: {
	//            verticalAlign: 'top',
	//            enabled: true,
	//            connectorWidth: 1,
	//            distance: -20,
	//            formatter: function() {
	//                return '<div style="color:#FFFFFF">'+ this.point.finshedProjects + '</div>';
	//            }
	//        	}
	// 		},{
	// 			type: 'pie',
	// 			colorByPoint: true,
	// 			showInLegend: false,
	// 			allowPointSelect: true,
	// 			dataLabels: {
	// 				enabled: true,
	// 				color: '#FFFFFF',
	// 				connectorWidth: 1,
	// 				distance: 25,
	// 				//connectorColor: '#000000',
	// 				colorByPoint: true,
	// 				formatter: function() {
	//                return [
	//                '<div>',
	//                	'<div>( <b>'+Math.round(this.percentage)+' %</b> )</div>',
	//                	this.point.finshedProjects +' :<b>مشاريع</b>',
	//                '</div>'
	//                ].join('')
	// 				}
	// 			}
	//       }],
	// 		drilldown: {
	// 			series: $('#container_two').data('drilldown')
	// 		}
	// 	});
	// }

});
