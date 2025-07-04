(function (exports) {
  'use strict';

  function _defineProperty(e, r, t) {
    return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function (r) {
        _defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }
  function _objectWithoutProperties(e, t) {
    if (null == e) return {};
    var o,
      r,
      i = _objectWithoutPropertiesLoose(e, t);
    if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);
      for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
    }
    return i;
  }
  function _objectWithoutPropertiesLoose(r, e) {
    if (null == r) return {};
    var t = {};
    for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
      if (-1 !== e.indexOf(n)) continue;
      t[n] = r[n];
    }
    return t;
  }
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r);
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }

  const instanceOfAny = (object, constructors) => constructors.some(c => object instanceof c);
  let idbProxyableTypes;
  let cursorAdvanceMethods;
  // This is a function to prevent it throwing up in node environments.
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction]);
  }
  // This is a function to prevent it throwing up in node environments.
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [IDBCursor.prototype.advance, IDBCursor.prototype.continue, IDBCursor.prototype.continuePrimaryKey]);
  }
  const cursorRequestMap = new WeakMap();
  const transactionDoneMap = new WeakMap();
  const transactionStoreNamesMap = new WeakMap();
  const transformCache = new WeakMap();
  const reverseTransformCache = new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener('success', success);
        request.removeEventListener('error', error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener('success', success);
      request.addEventListener('error', error);
    });
    promise.then(value => {
      // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
      // (see wrapFunction).
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
      // Catching to avoid "Uncaught Promise exceptions"
    }).catch(() => {});
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx)) return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener('complete', complete);
        tx.removeEventListener('error', error);
        tx.removeEventListener('abort', error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException('AbortError', 'AbortError'));
        unlisten();
      };
      tx.addEventListener('complete', complete);
      tx.addEventListener('error', error);
      tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        // Special handling for transaction.done.
        if (prop === 'done') return transactionDoneMap.get(target);
        // Polyfill for objectStoreNames because of Edge.
        if (prop === 'objectStoreNames') {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        }
        // Make tx.store return the only store in the transaction, or undefined if there are many.
        if (prop === 'store') {
          return receiver.objectStoreNames[1] ? undefined : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      // Else transform whatever we get back.
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === 'done' || prop === 'store')) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction && !('objectStoreNames' in IDBTransaction.prototype)) {
      return function (storeNames) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
      return function () {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
      // the original object.
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === 'function') return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction) cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes())) return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
  }
  function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest) return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value)) return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  const unwrap = value => reverseTransformCache.get(value);

  /**
   * Open a database.
   *
   * @param name Name of the database.
   * @param version Schema version.
   * @param callbacks Additional callbacks.
   */
  function openDB(name, version) {
    let {
      blocked,
      upgrade,
      blocking,
      terminated
    } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener('upgradeneeded', event => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener('blocked', event => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion, event.newVersion, event));
    }
    openPromise.then(db => {
      if (terminated) db.addEventListener('close', () => terminated());
      if (blocking) {
        db.addEventListener('versionchange', event => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {});
    return openPromise;
  }
  const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
  const writeMethods = ['put', 'add', 'delete', 'clear'];
  const cachedMethods = new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === 'string')) {
      return;
    }
    if (cachedMethods.get(prop)) return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))) {
      return;
    }
    const method = async function (storeName) {
      // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
      const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
      let target = tx.store;
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      if (useIndex) target = target.index(args.shift());
      // Must reject if op rejects.
      // If it's a write operation, must reject if tx.done rejects.
      // Must reject with op rejection first.
      // Must resolve with op value.
      // Must handle both promises (no unhandled rejections)
      return (await Promise.all([target[targetFuncName](...args), isWrite && tx.done]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps(oldTraps => _objectSpread2(_objectSpread2({}, oldTraps), {}, {
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
   */

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const stringToByteArray$1 = function (str) {
    // TODO(user): Use native implementations if/when available
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 0xfc00) === 0xd800 && i + 1 < str.length && (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
        // Surrogate Pair
        c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return out;
  };
  /**
   * Turns an array of numbers into the string given by the concatenation of the
   * characters to which the numbers correspond.
   * @param bytes Array of numbers representing characters.
   * @return Stringification of the array.
   */
  const byteArrayToString = function (bytes) {
    // TODO(user): Use native implementations if/when available
    const out = [];
    let pos = 0,
      c = 0;
    while (pos < bytes.length) {
      const c1 = bytes[pos++];
      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        const c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        // Surrogate Pair
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        const c4 = bytes[pos++];
        const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
        out[c++] = String.fromCharCode(0xd800 + (u >> 10));
        out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
      } else {
        const c2 = bytes[pos++];
        const c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      }
    }
    return out.join('');
  };
  // We define it as an object literal instead of a class because a class compiled down to es5 can't
  // be treeshaked. https://github.com/rollup/rollup/issues/1691
  // Static lookup maps, lazily populated by init_()
  const base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
      return this.ENCODED_VALS_BASE + '+/=';
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
      return this.ENCODED_VALS_BASE + '-_.';
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === 'function',
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error('encodeByteArray takes an array as a parameter');
      }
      this.init_();
      const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      const output = [];
      for (let i = 0; i < input.length; i += 3) {
        const byte1 = input[i];
        const haveByte2 = i + 1 < input.length;
        const byte2 = haveByte2 ? input[i + 1] : 0;
        const haveByte3 = i + 2 < input.length;
        const byte3 = haveByte3 ? input[i + 2] : 0;
        const outByte1 = byte1 >> 2;
        const outByte2 = (byte1 & 0x03) << 4 | byte2 >> 4;
        let outByte3 = (byte2 & 0x0f) << 2 | byte3 >> 6;
        let outByte4 = byte3 & 0x3f;
        if (!haveByte3) {
          outByte4 = 64;
          if (!haveByte2) {
            outByte3 = 64;
          }
        }
        output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
      }
      return output.join('');
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
      // Shortcut for Mozilla browsers that implement
      // a native base64 encoder in the form of "btoa/atob"
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return btoa(input);
      }
      return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
      // Shortcut for Mozilla browsers that implement
      // a native base64 encoder in the form of "btoa/atob"
      if (this.HAS_NATIVE_SUPPORT && !webSafe) {
        return atob(input);
      }
      return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
      this.init_();
      const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      const output = [];
      for (let i = 0; i < input.length;) {
        const byte1 = charToByteMap[input.charAt(i++)];
        const haveByte2 = i < input.length;
        const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        const haveByte3 = i < input.length;
        const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        const haveByte4 = i < input.length;
        const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw new DecodeBase64StringError();
        }
        const outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);
        if (byte3 !== 64) {
          const outByte2 = byte2 << 4 & 0xf0 | byte3 >> 2;
          output.push(outByte2);
          if (byte4 !== 64) {
            const outByte3 = byte3 << 6 & 0xc0 | byte4;
            output.push(outByte3);
          }
        }
      }
      return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {};
        // We want quick mappings back and forth, so we precompute two maps.
        for (let i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
          // Be forgiving when decoding and correctly decode both encodings.
          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  /**
   * An error encountered while decoding base64 string.
   */
  class DecodeBase64StringError extends Error {
    constructor() {
      super(...arguments);
      this.name = 'DecodeBase64StringError';
    }
  }
  /**
   * URL-safe base64 encoding
   */
  const base64Encode = function (str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  /**
   * URL-safe base64 encoding (without "." padding in the end).
   * e.g. Used in JSON Web Token (JWT) parts.
   */
  const base64urlEncodeWithoutPadding = function (str) {
    // Use base64url encoding and remove padding in the end (dot characters).
    return base64Encode(str).replace(/\./g, '');
  };
  /**
   * URL-safe base64 decoding
   *
   * NOTE: DO NOT use the global atob() function - it does NOT support the
   * base64Url variant encoding.
   *
   * @param str To be decoded
   * @return Decoded result, if possible
   */
  const base64Decode = function (str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error('base64Decode failed: ', e);
    }
    return null;
  };

  /**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Polyfill for `globalThis` object.
   * @returns the `globalThis` object for the given environment.
   * @public
   */
  function getGlobal() {
    if (typeof self !== 'undefined') {
      return self;
    }
    if (typeof window !== 'undefined') {
      return window;
    }
    if (typeof global !== 'undefined') {
      return global;
    }
    throw new Error('Unable to locate global object.');
  }

  /**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
  /**
   * Attempt to read defaults from a JSON string provided to
   * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
   * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
   * The dots are in parens because certain compilers (Vite?) cannot
   * handle seeing that variable in comments.
   * See https://github.com/firebase/firebase-js-sdk/issues/6838
   */
  const getDefaultsFromEnvVariable = () => {
    if (typeof process === 'undefined' || typeof process.env === 'undefined') {
      return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
      return JSON.parse(defaultsJsonString);
    }
  };
  const getDefaultsFromCookie = () => {
    if (typeof document === 'undefined') {
      return;
    }
    let match;
    try {
      match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    } catch (e) {
      // Some environments such as Angular Universal SSR have a
      // `document` object but error on accessing `document.cookie`.
      return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
  };
  /**
   * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
   * (1) if such an object exists as a property of `globalThis`
   * (2) if such an object was provided on a shell environment variable
   * (3) if such an object exists in a cookie
   * @public
   */
  const getDefaults = () => {
    try {
      return getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
    } catch (e) {
      /**
       * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
       * to any environment case we have not accounted for. Log to
       * info instead of swallowing so we can find these unknown cases
       * and add paths for them if needed.
       */
      console.info("Unable to get __FIREBASE_DEFAULTS__ due to: ".concat(e));
      return;
    }
  };
  /**
   * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
   * for the given product.
   * @returns a URL host formatted like `127.0.0.1:9999` or `[::1]:4000` if available
   * @public
   */
  const getDefaultEmulatorHost = productName => {
    var _a, _b;
    return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName];
  };
  /**
   * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
   * @public
   */
  const getDefaultAppConfig = () => {
    var _a;
    return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config;
  };
  /**
   * Returns an experimental setting on the __FIREBASE_DEFAULTS__ object (properties
   * prefixed by "_")
   * @public
   */
  const getExperimentalSetting = name => {
    var _a;
    return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a["_".concat(name)];
  };

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class Deferred {
    constructor() {
      this.reject = () => {};
      this.resolve = () => {};
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
      return (error, value) => {
        if (error) {
          this.reject(error);
        } else {
          this.resolve(value);
        }
        if (typeof callback === 'function') {
          // Attaching noop handler just in case developer wasn't expecting
          // promises
          this.promise.catch(() => {});
          // Some of our callbacks don't expect a value and our own tests
          // assert that the parameter length is 1
          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    }
  }

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Returns navigator.userAgent string or '' if it's not defined.
   * @return user agent string
   */
  function getUA() {
    if (typeof navigator !== 'undefined' && typeof navigator['userAgent'] === 'string') {
      return navigator['userAgent'];
    } else {
      return '';
    }
  }
  /**
   * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
   *
   * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
   * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
   * wait for a callback.
   */
  function isMobileCordova() {
    return typeof window !== 'undefined' &&
    // @ts-ignore Setting up an broadly applicable index signature for Window
    // just to deal with this case would probably be a bad idea.
    !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
  }
  function isBrowserExtension() {
    const runtime = typeof chrome === 'object' ? chrome.runtime : typeof browser === 'object' ? browser.runtime : undefined;
    return typeof runtime === 'object' && runtime.id !== undefined;
  }
  /**
   * Detect React Native.
   *
   * @return true if ReactNative environment is detected.
   */
  function isReactNative() {
    return typeof navigator === 'object' && navigator['product'] === 'ReactNative';
  }
  /** Detects Internet Explorer. */
  function isIE() {
    const ua = getUA();
    return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
  }
  /**
   * This method checks if indexedDB is supported by current browser/service worker context
   * @return true if indexedDB is supported by current browser/service worker context
   */
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === 'object';
    } catch (e) {
      return false;
    }
  }
  /**
   * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
   * if errors occur during the database open operation.
   *
   * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
   * private browsing)
   */
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          // delete database only when it doesn't pre-exist
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          var _a;
          reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || '');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * @fileoverview Standardized Firebase Error.
   *
   * Usage:
   *
   *   // Typescript string literals for type-safe codes
   *   type Err =
   *     'unknown' |
   *     'object-not-found'
   *     ;
   *
   *   // Closure enum for type-safe error codes
   *   // at-enum {string}
   *   var Err = {
   *     UNKNOWN: 'unknown',
   *     OBJECT_NOT_FOUND: 'object-not-found',
   *   }
   *
   *   let errors: Map<Err, string> = {
   *     'generic-error': "Unknown error",
   *     'file-not-found': "Could not find file: {$file}",
   *   };
   *
   *   // Type-safe function - must pass a valid error code as param.
   *   let error = new ErrorFactory<Err>('service', 'Service', errors);
   *
   *   ...
   *   throw error.create(Err.GENERIC);
   *   ...
   *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
   *   ...
   *   // Service: Could not file file: foo.txt (service/file-not-found).
   *
   *   catch (e) {
   *     assert(e.message === "Could not find file: foo.txt.");
   *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
   *       console.log("Could not read file: " + e['file']);
   *     }
   *   }
   */
  const ERROR_NAME = 'FirebaseError';
  // Based on code from:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  class FirebaseError extends Error {
    constructor(/** The error code for this error. */
    code, message, /** Custom data for this error. */
    customData) {
      super(message);
      this.code = code;
      this.customData = customData;
      /** The custom name for all FirebaseErrors. */
      this.name = ERROR_NAME;
      // Fix For ES5
      // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
      Object.setPrototypeOf(this, FirebaseError.prototype);
      // Maintains proper stack trace for where our error was thrown.
      // Only available on V8.
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorFactory.prototype.create);
      }
    }
  }
  class ErrorFactory {
    constructor(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }
    create(code) {
      const customData = (arguments.length <= 1 ? undefined : arguments[1]) || {};
      const fullCode = "".concat(this.service, "/").concat(code);
      const template = this.errors[code];
      const message = template ? replaceTemplate(template, customData) : 'Error';
      // Service Name: Error message (service/code).
      const fullMessage = "".concat(this.serviceName, ": ").concat(message, " (").concat(fullCode, ").");
      const error = new FirebaseError(fullCode, fullMessage, customData);
      return error;
    }
  }
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
      const value = data[key];
      return value != null ? String(value) : "<".concat(key, "?>");
    });
  }
  const PATTERN = /\{\$([^}]+)}/g;
  function isEmpty(obj) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Deep equal two objects. Support Arrays and Objects.
   */
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === 'object';
  }

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
   * params object (e.g. {arg: 'val', arg2: 'val2'})
   * Note: You must prepend it with ? when adding it to a URL.
   */
  function querystring(querystringParams) {
    const params = [];
    for (const [key, value] of Object.entries(querystringParams)) {
      if (Array.isArray(value)) {
        value.forEach(arrayVal => {
          params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
        });
      } else {
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      }
    }
    return params.length ? '&' + params.join('&') : '';
  }

  /**
   * Helper to make a Subscribe function (just like Promise helps make a
   * Thenable).
   *
   * @param executor Function which can make calls to a single Observer
   *     as a proxy.
   * @param onNoObservers Callback when count of Observers goes to zero.
   */
  function createSubscribe(executor, onNoObservers) {
    const proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
  }
  /**
   * Implement fan-out for any number of Observers attached via a subscribe
   * function.
   */
  class ObserverProxy {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    constructor(executor, onNoObservers) {
      this.observers = [];
      this.unsubscribes = [];
      this.observerCount = 0;
      // Micro-task scheduling by calling task.then().
      this.task = Promise.resolve();
      this.finalized = false;
      this.onNoObservers = onNoObservers;
      // Call the executor asynchronously so subscribers that are called
      // synchronously after the creation of the subscribe function
      // can still receive the very first value generated in the executor.
      this.task.then(() => {
        executor(this);
      }).catch(e => {
        this.error(e);
      });
    }
    next(value) {
      this.forEachObserver(observer => {
        observer.next(value);
      });
    }
    error(error) {
      this.forEachObserver(observer => {
        observer.error(error);
      });
      this.close(error);
    }
    complete() {
      this.forEachObserver(observer => {
        observer.complete();
      });
      this.close();
    }
    /**
     * Subscribe function that can be used to add an Observer to the fan-out list.
     *
     * - We require that no event is sent to a subscriber sychronously to their
     *   call to subscribe().
     */
    subscribe(nextOrObserver, error, complete) {
      let observer;
      if (nextOrObserver === undefined && error === undefined && complete === undefined) {
        throw new Error('Missing Observer.');
      }
      // Assemble an Observer object when passed as callback functions.
      if (implementsAnyMethods(nextOrObserver, ['next', 'error', 'complete'])) {
        observer = nextOrObserver;
      } else {
        observer = {
          next: nextOrObserver,
          error,
          complete
        };
      }
      if (observer.next === undefined) {
        observer.next = noop;
      }
      if (observer.error === undefined) {
        observer.error = noop;
      }
      if (observer.complete === undefined) {
        observer.complete = noop;
      }
      const unsub = this.unsubscribeOne.bind(this, this.observers.length);
      // Attempt to subscribe to a terminated Observable - we
      // just respond to the Observer with the final error or complete
      // event.
      if (this.finalized) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(() => {
          try {
            if (this.finalError) {
              observer.error(this.finalError);
            } else {
              observer.complete();
            }
          } catch (e) {
            // nothing
          }
          return;
        });
      }
      this.observers.push(observer);
      return unsub;
    }
    // Unsubscribe is synchronous - we guarantee that no events are sent to
    // any unsubscribed Observer.
    unsubscribeOne(i) {
      if (this.observers === undefined || this.observers[i] === undefined) {
        return;
      }
      delete this.observers[i];
      this.observerCount -= 1;
      if (this.observerCount === 0 && this.onNoObservers !== undefined) {
        this.onNoObservers(this);
      }
    }
    forEachObserver(fn) {
      if (this.finalized) {
        // Already closed by previous event....just eat the additional values.
        return;
      }
      // Since sendOne calls asynchronously - there is no chance that
      // this.observers will become undefined.
      for (let i = 0; i < this.observers.length; i++) {
        this.sendOne(i, fn);
      }
    }
    // Call the Observer via one of it's callback function. We are careful to
    // confirm that the observe has not been unsubscribed since this asynchronous
    // function had been queued.
    sendOne(i, fn) {
      // Execute the callback asynchronously
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.task.then(() => {
        if (this.observers !== undefined && this.observers[i] !== undefined) {
          try {
            fn(this.observers[i]);
          } catch (e) {
            // Ignore exceptions raised in Observers or missing methods of an
            // Observer.
            // Log error to console. b/31404806
            if (typeof console !== 'undefined' && console.error) {
              console.error(e);
            }
          }
        }
      });
    }
    close(err) {
      if (this.finalized) {
        return;
      }
      this.finalized = true;
      if (err !== undefined) {
        this.finalError = err;
      }
      // Proxy is no longer needed - garbage collect references
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.task.then(() => {
        this.observers = undefined;
        this.onNoObservers = undefined;
      });
    }
  }
  /**
   * Return true if the object passed in implements any of the named methods.
   */
  function implementsAnyMethods(obj, methods) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    for (const method of methods) {
      if (method in obj && typeof obj[method] === 'function') {
        return true;
      }
    }
    return false;
  }
  function noop() {
    // do nothing
  }

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }

  /**
   * Component for service name T, e.g. `auth`, `auth-internal`
   */
  class Component {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name, instanceFactory, type) {
      this.name = name;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      /**
       * Properties to be added to the service namespace
       */
      this.serviceProps = {};
      this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
      this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
      this.instantiationMode = mode;
      return this;
    }
    setMultipleInstances(multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    }
    setServiceProps(props) {
      this.serviceProps = props;
      return this;
    }
    setInstanceCreatedCallback(callback) {
      this.onInstanceCreated = callback;
      return this;
    }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
   * NameServiceMapping[T] is an alias for the type of the instance
   */
  class Provider {
    constructor(name, container) {
      this.name = name;
      this.container = container;
      this.component = null;
      this.instances = new Map();
      this.instancesDeferred = new Map();
      this.instancesOptions = new Map();
      this.onInitCallbacks = new Map();
    }
    /**
     * @param identifier A provider can provide mulitple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
      // if multipleInstances is not supported, use the default name
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        const deferred = new Deferred();
        this.instancesDeferred.set(normalizedIdentifier, deferred);
        if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
          // initialize the service if it can be auto-initialized
          try {
            const instance = this.getOrInitializeService({
              instanceIdentifier: normalizedIdentifier
            });
            if (instance) {
              deferred.resolve(instance);
            }
          } catch (e) {
            // when the instance factory throws an exception during get(), it should not cause
            // a fatal error. We just return the unresolved promise in this case.
          }
        }
      }
      return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
      var _a;
      // if multipleInstances is not supported, use the default name
      const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
      const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          return this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
        } catch (e) {
          if (optional) {
            return null;
          } else {
            throw e;
          }
        }
      } else {
        // In case a component is not initialized and should/can not be auto-initialized at the moment, return null if the optional flag is set, or throw
        if (optional) {
          return null;
        } else {
          throw Error("Service ".concat(this.name, " is not available"));
        }
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(component) {
      if (component.name !== this.name) {
        throw Error("Mismatching Component ".concat(component.name, " for Provider ").concat(this.name, "."));
      }
      if (this.component) {
        throw Error("Component for ".concat(this.name, " has already been provided"));
      }
      this.component = component;
      // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
      if (!this.shouldAutoInitialize()) {
        return;
      }
      // if the service is eager, initialize the default instance
      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService({
            instanceIdentifier: DEFAULT_ENTRY_NAME$1
          });
        } catch (e) {
          // when the instance factory for an eager Component throws an exception during the eager
          // initialization, it should not cause a fatal error.
          // TODO: Investigate if we need to make it configurable, because some component may want to cause
          // a fatal error in this case?
        }
      }
      // Create service instances for the pending promises and resolve them
      // NOTE: if this.multipleInstances is false, only the default instance will be created
      // and all promises with resolve with it regardless of the identifier.
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        try {
          // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          instanceDeferred.resolve(instance);
        } catch (e) {
          // when the instance factory throws an exception, it should not cause
          // a fatal error. We just leave the promise unresolved.
        }
      }
    }
    clearInstance() {
      let identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
      this.instancesDeferred.delete(identifier);
      this.instancesOptions.delete(identifier);
      this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    async delete() {
      const services = Array.from(this.instances.values());
      await Promise.all([...services.filter(service => 'INTERNAL' in service) // legacy services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(service => service.INTERNAL.delete()), ...services.filter(service => '_delete' in service) // modularized services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(service => service._delete())]);
    }
    isComponentSet() {
      return this.component != null;
    }
    isInitialized() {
      let identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
      return this.instances.has(identifier);
    }
    getOptions() {
      let identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
      return this.instancesOptions.get(identifier) || {};
    }
    initialize() {
      let opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      const {
        options = {}
      } = opts;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
      if (this.isInitialized(normalizedIdentifier)) {
        throw Error("".concat(this.name, "(").concat(normalizedIdentifier, ") has already been initialized"));
      }
      if (!this.isComponentSet()) {
        throw Error("Component ".concat(this.name, " has not been registered yet"));
      }
      const instance = this.getOrInitializeService({
        instanceIdentifier: normalizedIdentifier,
        options
      });
      // resolve any pending promise waiting for the service instance
      for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
        const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
        if (normalizedIdentifier === normalizedDeferredIdentifier) {
          instanceDeferred.resolve(instance);
        }
      }
      return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
      var _a;
      const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
      const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
      existingCallbacks.add(callback);
      this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
      const existingInstance = this.instances.get(normalizedIdentifier);
      if (existingInstance) {
        callback(existingInstance, normalizedIdentifier);
      }
      return () => {
        existingCallbacks.delete(callback);
      };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
      const callbacks = this.onInitCallbacks.get(identifier);
      if (!callbacks) {
        return;
      }
      for (const callback of callbacks) {
        try {
          callback(instance, identifier);
        } catch (_a) {
          // ignore errors in the onInit callback
        }
      }
    }
    getOrInitializeService(_ref) {
      let {
        instanceIdentifier,
        options = {}
      } = _ref;
      let instance = this.instances.get(instanceIdentifier);
      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, {
          instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
          options
        });
        this.instances.set(instanceIdentifier, instance);
        this.instancesOptions.set(instanceIdentifier, options);
        /**
         * Invoke onInit listeners.
         * Note this.component.onInstanceCreated is different, which is used by the component creator,
         * while onInit listeners are registered by consumers of the provider.
         */
        this.invokeOnInitCallbacks(instance, instanceIdentifier);
        /**
         * Order is important
         * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
         * makes `isInitialized()` return true.
         */
        if (this.component.onInstanceCreated) {
          try {
            this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
          } catch (_a) {
            // ignore errors in the onInstanceCreatedCallback
          }
        }
      }
      return instance || null;
    }
    normalizeInstanceIdentifier() {
      let identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
      } else {
        return identifier; // assume multiple instances are supported before the component is provided.
      }
    }
    shouldAutoInitialize() {
      return !!this.component && this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */;
    }
  }
  // undefined should be passed to the service factory for the default instance
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
   */
  class ComponentContainer {
    constructor(name) {
      this.name = name;
      this.providers = new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        throw new Error("Component ".concat(component.name, " has already been registered with ").concat(this.name));
      }
      provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
      const provider = this.getProvider(component.name);
      if (provider.isComponentSet()) {
        // delete the existing provider from the container, so we can register the new component
        this.providers.delete(component.name);
      }
      this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name) {
      if (this.providers.has(name)) {
        return this.providers.get(name);
      }
      // create a Provider for a service that hasn't registered with Firebase
      const provider = new Provider(name, this);
      this.providers.set(name, provider);
      return provider;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  }

  /**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * A container for all of the Logger instances
   */
  /**
   * The JS SDK supports 5 log levels and also allows a user the ability to
   * silence the logs altogether.
   *
   * The order is a follows:
   * DEBUG < VERBOSE < INFO < WARN < ERROR
   *
   * All of the log types above the current log level will be captured (i.e. if
   * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
   * `VERBOSE` logs will not)
   */
  var LogLevel;
  (function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));
  const levelStringToEnum = {
    'debug': LogLevel.DEBUG,
    'verbose': LogLevel.VERBOSE,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR,
    'silent': LogLevel.SILENT
  };
  /**
   * The default log level
   */
  const defaultLogLevel = LogLevel.INFO;
  /**
   * By default, `console.debug` is not displayed in the developer console (in
   * chrome). To avoid forcing users to have to opt-in to these logs twice
   * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
   * logs to the `console.log` function.
   */
  const ConsoleMethod = {
    [LogLevel.DEBUG]: 'log',
    [LogLevel.VERBOSE]: 'log',
    [LogLevel.INFO]: 'info',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error'
  };
  /**
   * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
   * messages on to their corresponding console counterparts (if the log method
   * is supported by the current log level)
   */
  const defaultLogHandler = function (instance, logType) {
    if (logType < instance.logLevel) {
      return;
    }
    const now = new Date().toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      console[method]("[".concat(now, "]  ").concat(instance.name, ":"), ...args);
    } else {
      throw new Error("Attempted to log a message with an invalid logType (value: ".concat(logType, ")"));
    }
  };
  class Logger {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name) {
      this.name = name;
      /**
       * The log level of the given Logger instance.
       */
      this._logLevel = defaultLogLevel;
      /**
       * The main (internal) log handler for the Logger instance.
       * Can be set to a new function in internal package code but not by user.
       */
      this._logHandler = defaultLogHandler;
      /**
       * The optional, additional, user-defined log handler for the Logger instance.
       */
      this._userLogHandler = null;
    }
    get logLevel() {
      return this._logLevel;
    }
    set logLevel(val) {
      if (!(val in LogLevel)) {
        throw new TypeError("Invalid value \"".concat(val, "\" assigned to `logLevel`"));
      }
      this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
      this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
    }
    get logHandler() {
      return this._logHandler;
    }
    set logHandler(val) {
      if (typeof val !== 'function') {
        throw new TypeError('Value assigned to `logHandler` must be a function');
      }
      this._logHandler = val;
    }
    get userLogHandler() {
      return this._userLogHandler;
    }
    set userLogHandler(val) {
      this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }
      this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
      this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log() {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
      this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info() {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
      this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn() {
      for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        args[_key5] = arguments[_key5];
      }
      this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
      this._logHandler(this, LogLevel.WARN, ...args);
    }
    error() {
      for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        args[_key6] = arguments[_key6];
      }
      this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
      this._logHandler(this, LogLevel.ERROR, ...args);
    }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class PlatformLoggerServiceImpl {
    constructor(container) {
      this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
      const providers = this.container.getProviders();
      // Loop through providers and get library/version pairs from any that are
      // version components.
      return providers.map(provider => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate();
          return "".concat(service.library, "/").concat(service.version);
        } else {
          return null;
        }
      }).filter(logString => logString).join(' ');
    }
  }
  /**
   *
   * @param provider check if this provider provides a VersionService
   *
   * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
   * provides VersionService. The provider is not necessarily a 'app-version'
   * provider.
   */
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* ComponentType.VERSION */;
  }
  const name$o = "@firebase/app";
  const version$1$1 = "0.9.13";

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const logger = new Logger('@firebase/app');
  const name$n = "@firebase/app-compat";
  const name$m = "@firebase/analytics-compat";
  const name$l = "@firebase/analytics";
  const name$k = "@firebase/app-check-compat";
  const name$j = "@firebase/app-check";
  const name$i = "@firebase/auth";
  const name$h = "@firebase/auth-compat";
  const name$g = "@firebase/database";
  const name$f = "@firebase/database-compat";
  const name$e = "@firebase/functions";
  const name$d = "@firebase/functions-compat";
  const name$c = "@firebase/installations";
  const name$b = "@firebase/installations-compat";
  const name$a = "@firebase/messaging";
  const name$9 = "@firebase/messaging-compat";
  const name$8 = "@firebase/performance";
  const name$7 = "@firebase/performance-compat";
  const name$6 = "@firebase/remote-config";
  const name$5 = "@firebase/remote-config-compat";
  const name$4 = "@firebase/storage";
  const name$3 = "@firebase/storage-compat";
  const name$2 = "@firebase/firestore";
  const name$1$1 = "@firebase/firestore-compat";
  const name$p = "firebase";
  const version$2 = "9.23.0";

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * The default app name
   *
   * @internal
   */
  const DEFAULT_ENTRY_NAME = '[DEFAULT]';
  const PLATFORM_LOG_STRING = {
    [name$o]: 'fire-core',
    [name$n]: 'fire-core-compat',
    [name$l]: 'fire-analytics',
    [name$m]: 'fire-analytics-compat',
    [name$j]: 'fire-app-check',
    [name$k]: 'fire-app-check-compat',
    [name$i]: 'fire-auth',
    [name$h]: 'fire-auth-compat',
    [name$g]: 'fire-rtdb',
    [name$f]: 'fire-rtdb-compat',
    [name$e]: 'fire-fn',
    [name$d]: 'fire-fn-compat',
    [name$c]: 'fire-iid',
    [name$b]: 'fire-iid-compat',
    [name$a]: 'fire-fcm',
    [name$9]: 'fire-fcm-compat',
    [name$8]: 'fire-perf',
    [name$7]: 'fire-perf-compat',
    [name$6]: 'fire-rc',
    [name$5]: 'fire-rc-compat',
    [name$4]: 'fire-gcs',
    [name$3]: 'fire-gcs-compat',
    [name$2]: 'fire-fst',
    [name$1$1]: 'fire-fst-compat',
    'fire-js': 'fire-js',
    [name$p]: 'fire-js-all'
  };

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * @internal
   */
  const _apps = new Map();
  /**
   * Registered components.
   *
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _components = new Map();
  /**
   * @param component - the component being added to this app's container
   *
   * @internal
   */
  function _addComponent(app, component) {
    try {
      app.container.addComponent(component);
    } catch (e) {
      logger.debug("Component ".concat(component.name, " failed to register with FirebaseApp ").concat(app.name), e);
    }
  }
  /**
   *
   * @param component - the component to register
   * @returns whether or not the component is registered successfully
   *
   * @internal
   */
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger.debug("There were multiple attempts to register component ".concat(componentName, "."));
      return false;
    }
    _components.set(componentName, component);
    // add the component to existing app instances
    for (const app of _apps.values()) {
      _addComponent(app, component);
    }
    return true;
  }
  /**
   *
   * @param app - FirebaseApp instance
   * @param name - service name
   *
   * @returns the provider for the service with the matching name
   *
   * @internal
   */
  function _getProvider(app, name) {
    const heartbeatController = app.container.getProvider('heartbeat').getImmediate({
      optional: true
    });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app.container.getProvider(name);
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const ERRORS = {
    ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " + 'call initializeApp() first',
    ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}",
    ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different options or config",
    ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
    ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
    ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' + 'Firebase App instance.',
    ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
    ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.'
  };
  const ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class FirebaseAppImpl {
    constructor(options, config, container) {
      this._isDeleted = false;
      this._options = Object.assign({}, options);
      this._config = Object.assign({}, config);
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
    }
    get automaticDataCollectionEnabled() {
      this.checkDestroyed();
      return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
      this.checkDestroyed();
      this._automaticDataCollectionEnabled = val;
    }
    get name() {
      this.checkDestroyed();
      return this._name;
    }
    get options() {
      this.checkDestroyed();
      return this._options;
    }
    get config() {
      this.checkDestroyed();
      return this._config;
    }
    get container() {
      return this._container;
    }
    get isDeleted() {
      return this._isDeleted;
    }
    set isDeleted(val) {
      this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
      if (this.isDeleted) {
        throw ERROR_FACTORY.create("app-deleted" /* AppError.APP_DELETED */, {
          appName: this._name
        });
      }
    }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * The current SDK version.
   *
   * @public
   */
  const SDK_VERSION = version$2;
  function initializeApp(_options) {
    let rawConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let options = _options;
    if (typeof rawConfig !== 'object') {
      const name = rawConfig;
      rawConfig = {
        name
      };
    }
    const config = Object.assign({
      name: DEFAULT_ENTRY_NAME,
      automaticDataCollectionEnabled: false
    }, rawConfig);
    const name = config.name;
    if (typeof name !== 'string' || !name) {
      throw ERROR_FACTORY.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
        appName: String(name)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY.create("no-options" /* AppError.NO_OPTIONS */);
    }
    const existingApp = _apps.get(name);
    if (existingApp) {
      // return the existing app if options and config deep equal the ones in the existing app.
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, {
          appName: name
        });
      }
    }
    const container = new ComponentContainer(name);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name, newApp);
    return newApp;
  }
  /**
   * Retrieves a {@link @firebase/app#FirebaseApp} instance.
   *
   * When called with no arguments, the default app is returned. When an app name
   * is provided, the app corresponding to that name is returned.
   *
   * An exception is thrown if the app being retrieved has not yet been
   * initialized.
   *
   * @example
   * ```javascript
   * // Return the default app
   * const app = getApp();
   * ```
   *
   * @example
   * ```javascript
   * // Return a named app
   * const otherApp = getApp("otherApp");
   * ```
   *
   * @param name - Optional name of the app to return. If no name is
   *   provided, the default is `"[DEFAULT]"`.
   *
   * @returns The app corresponding to the provided app name.
   *   If no app name is provided, the default app is returned.
   *
   * @public
   */
  function getApp() {
    let name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME;
    const app = _apps.get(name);
    if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app) {
      throw ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, {
        appName: name
      });
    }
    return app;
  }
  /**
   * Registers a library's name and version for platform logging purposes.
   * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
   * @param version - Current version of that library.
   * @param variant - Bundle variant, e.g., node, rn, etc.
   *
   * @public
   */
  function registerVersion(libraryKeyOrName, version, variant) {
    var _a;
    // TODO: We can use this check to whitelist strings when/if we set up
    // a good whitelist system.
    let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
    if (variant) {
      library += "-".concat(variant);
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = ["Unable to register library \"".concat(library, "\" with version \"").concat(version, "\":")];
      if (libraryMismatch) {
        warning.push("library name \"".concat(library, "\" contains illegal characters (whitespace or \"/\")"));
      }
      if (libraryMismatch && versionMismatch) {
        warning.push('and');
      }
      if (versionMismatch) {
        warning.push("version name \"".concat(version, "\" contains illegal characters (whitespace or \"/\")"));
      }
      logger.warn(warning.join(' '));
      return;
    }
    _registerComponent(new Component("".concat(library, "-version"), () => ({
      library,
      version
    }), "VERSION" /* ComponentType.VERSION */));
  }

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const DB_NAME$1 = 'firebase-heartbeat-database';
  const DB_VERSION$1 = 1;
  const STORE_NAME = 'firebase-heartbeat-store';
  let dbPromise = null;
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME$1, DB_VERSION$1, {
        upgrade: (db, oldVersion) => {
          // We don't use 'break' in this switch statement, the fall-through
          // behavior is what we want, because if there are multiple versions between
          // the old version and the current version, we want ALL the migrations
          // that correspond to those versions to run, not only the last one.
          // eslint-disable-next-line default-case
          switch (oldVersion) {
            case 0:
              db.createObjectStore(STORE_NAME);
          }
        }
      }).catch(e => {
        throw ERROR_FACTORY.create("idb-open" /* AppError.IDB_OPEN */, {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise;
  }
  async function readHeartbeatsFromIndexedDB(app) {
    try {
      const db = await getDbPromise();
      const result = await db.transaction(STORE_NAME).objectStore(STORE_NAME).get(computeKey(app));
      return result;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-get" /* AppError.IDB_GET */, {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const objectStore = tx.objectStore(STORE_NAME);
      await objectStore.put(heartbeatObject, computeKey(app));
      await tx.done;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-set" /* AppError.IDB_WRITE */, {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  function computeKey(app) {
    return "".concat(app.name, "!").concat(app.options.appId);
  }

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const MAX_HEADER_BYTES = 1024;
  // 30 days
  const STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1000;
  class HeartbeatServiceImpl {
    constructor(container) {
      this.container = container;
      /**
       * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
       * the header string.
       * Stores one record per date. This will be consolidated into the standard
       * format of one record per user agent string before being sent as a header.
       * Populated from indexedDB when the controller is instantiated and should
       * be kept in sync with indexedDB.
       * Leave public for easier testing.
       */
      this._heartbeatsCache = null;
      const app = this.container.getProvider('app').getImmediate();
      this._storage = new HeartbeatStorageImpl(app);
      this._heartbeatsCachePromise = this._storage.read().then(result => {
        this._heartbeatsCache = result;
        return result;
      });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    async triggerHeartbeat() {
      const platformLogger = this.container.getProvider('platform-logger').getImmediate();
      // This is the "Firebase user agent" string from the platform logger
      // service, not the browser user agent.
      const agent = platformLogger.getPlatformInfoString();
      const date = getUTCDateString();
      if (this._heartbeatsCache === null) {
        this._heartbeatsCache = await this._heartbeatsCachePromise;
      }
      // Do not store a heartbeat if one is already stored for this day
      // or if a header has already been sent today.
      if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
        return;
      } else {
        // There is no entry for this date. Create one.
        this._heartbeatsCache.heartbeats.push({
          date,
          agent
        });
      }
      // Remove entries older than 30 days.
      this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter(singleDateHeartbeat => {
        const hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
        const now = Date.now();
        return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
      });
      return this._storage.overwrite(this._heartbeatsCache);
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    async getHeartbeatsHeader() {
      if (this._heartbeatsCache === null) {
        await this._heartbeatsCachePromise;
      }
      // If it's still null or the array is empty, there is no data to send.
      if (this._heartbeatsCache === null || this._heartbeatsCache.heartbeats.length === 0) {
        return '';
      }
      const date = getUTCDateString();
      // Extract as many heartbeats from the cache as will fit under the size limit.
      const {
        heartbeatsToSend,
        unsentEntries
      } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
      const headerString = base64urlEncodeWithoutPadding(JSON.stringify({
        version: 2,
        heartbeats: heartbeatsToSend
      }));
      // Store last sent date to prevent another being logged/sent for the same day.
      this._heartbeatsCache.lastSentHeartbeatDate = date;
      if (unsentEntries.length > 0) {
        // Store any unsent entries if they exist.
        this._heartbeatsCache.heartbeats = unsentEntries;
        // This seems more likely than emptying the array (below) to lead to some odd state
        // since the cache isn't empty and this will be called again on the next request,
        // and is probably safest if we await it.
        await this._storage.overwrite(this._heartbeatsCache);
      } else {
        this._heartbeatsCache.heartbeats = [];
        // Do not wait for this, to reduce latency.
        void this._storage.overwrite(this._heartbeatsCache);
      }
      return headerString;
    }
  }
  function getUTCDateString() {
    const today = new Date();
    // Returns date format 'YYYY-MM-DD'
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache) {
    let maxSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MAX_HEADER_BYTES;
    // Heartbeats grouped by user agent in the standard format to be sent in
    // the header.
    const heartbeatsToSend = [];
    // Single date format heartbeats that are not sent.
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      // Look for an existing entry with the same user agent.
      const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        // If no entry for this user agent exists, create one.
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          // If the header would exceed max size, remove the added heartbeat
          // entry and stop adding to the header.
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        // If the header would exceed max size, remove the added date
        // and stop adding to the header.
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      // Pop unsent entry from queue. (Skipped if adding the entry exceeded
      // quota and the loop breaks early.)
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  class HeartbeatStorageImpl {
    constructor(app) {
      this.app = app;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    async runIndexedDBEnvironmentCheck() {
      if (!isIndexedDBAvailable()) {
        return false;
      } else {
        return validateIndexedDBOpenable().then(() => true).catch(() => false);
      }
    }
    /**
     * Read all heartbeats.
     */
    async read() {
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return {
          heartbeats: []
        };
      } else {
        const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
        return idbHeartbeatObject || {
          heartbeats: []
        };
      }
    }
    // overwrite the storage with the provided heartbeats
    async overwrite(heartbeatsObject) {
      var _a;
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: heartbeatsObject.heartbeats
        });
      }
    }
    // add heartbeats
    async add(heartbeatsObject) {
      var _a;
      const canUseIndexedDB = await this._canUseIndexedDBPromise;
      if (!canUseIndexedDB) {
        return;
      } else {
        const existingHeartbeatsObject = await this.read();
        return writeHeartbeatsToIndexedDB(this.app, {
          lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
          heartbeats: [...existingHeartbeatsObject.heartbeats, ...heartbeatsObject.heartbeats]
        });
      }
    }
  }
  /**
   * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
   * in a platform logging header JSON object, stringified, and converted
   * to base 64.
   */
  function countBytes(heartbeatsCache) {
    // base64 has a restricted set of characters, all of which should be 1 byte.
    return base64urlEncodeWithoutPadding(
    // heartbeatsCache wrapper properties
    JSON.stringify({
      version: 2,
      heartbeats: heartbeatsCache
    })).length;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function registerCoreComponents(variant) {
    _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
    _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
    // Register `app` package.
    registerVersion(name$o, version$1$1, variant);
    // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
    registerVersion(name$o, version$1$1, 'esm2017');
    // Register platform SDK identifier (no version).
    registerVersion('fire-js', '');
  }

  /**
   * Firebase App
   *
   * @remarks This package coordinates the communication between the different Firebase components
   * @packageDocumentation
   */
  registerCoreComponents('');

  /******************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */
  /* global Reflect, Promise, SuppressedError, Symbol, Iterator */

  function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
    }
    return t;
  }
  typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
  };

  function _prodErrorMap() {
    // We will include this one message in the prod error map since by the very
    // nature of this error, developers will never be able to see the message
    // using the debugErrorMap (which is installed during auth initialization).
    return {
      ["dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */]: 'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' + 'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' + 'starting any other Firebase SDK.'
    };
  }
  /**
   * A minimal error map with all verbose error messages stripped.
   *
   * See discussion at {@link AuthErrorMap}
   *
   * @public
   */
  const prodErrorMap = _prodErrorMap;
  const _DEFAULT_AUTH_ERROR_FACTORY = new ErrorFactory('auth', 'Firebase', _prodErrorMap());

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const logClient = new Logger('@firebase/auth');
  function _logWarn(msg) {
    if (logClient.logLevel <= LogLevel.WARN) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key2 = 1; _key2 < _len; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      logClient.warn("Auth (".concat(SDK_VERSION, "): ").concat(msg), ...args);
    }
  }
  function _logError(msg) {
    if (logClient.logLevel <= LogLevel.ERROR) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key3 = 1; _key3 < _len2; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      logClient.error("Auth (".concat(SDK_VERSION, "): ").concat(msg), ...args);
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _fail(authOrCode) {
    for (var _len3 = arguments.length, rest = new Array(_len3 > 1 ? _len3 - 1 : 0), _key4 = 1; _key4 < _len3; _key4++) {
      rest[_key4 - 1] = arguments[_key4];
    }
    throw createErrorInternal(authOrCode, ...rest);
  }
  function _createError(authOrCode) {
    for (var _len4 = arguments.length, rest = new Array(_len4 > 1 ? _len4 - 1 : 0), _key5 = 1; _key5 < _len4; _key5++) {
      rest[_key5 - 1] = arguments[_key5];
    }
    return createErrorInternal(authOrCode, ...rest);
  }
  function _errorWithCustomMessage(auth, code, message) {
    const errorMap = Object.assign(Object.assign({}, prodErrorMap()), {
      [code]: message
    });
    const factory = new ErrorFactory('auth', 'Firebase', errorMap);
    return factory.create(code, {
      appName: auth.name
    });
  }
  function createErrorInternal(authOrCode) {
    for (var _len5 = arguments.length, rest = new Array(_len5 > 1 ? _len5 - 1 : 0), _key6 = 1; _key6 < _len5; _key6++) {
      rest[_key6 - 1] = arguments[_key6];
    }
    if (typeof authOrCode !== 'string') {
      const code = rest[0];
      const fullParams = [...rest.slice(1)];
      if (fullParams[0]) {
        fullParams[0].appName = authOrCode.name;
      }
      return authOrCode._errorFactory.create(code, ...fullParams);
    }
    return _DEFAULT_AUTH_ERROR_FACTORY.create(authOrCode, ...rest);
  }
  function _assert(assertion, authOrCode) {
    if (!assertion) {
      for (var _len6 = arguments.length, rest = new Array(_len6 > 2 ? _len6 - 2 : 0), _key7 = 2; _key7 < _len6; _key7++) {
        rest[_key7 - 2] = arguments[_key7];
      }
      throw createErrorInternal(authOrCode, ...rest);
    }
  }
  /**
   * Unconditionally fails, throwing an internal error with the given message.
   *
   * @param failure type of failure encountered
   * @throws Error
   */
  function debugFail(failure) {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    const message = "INTERNAL ASSERTION FAILED: " + failure;
    _logError(message);
    // NOTE: We don't use FirebaseError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw new Error(message);
  }
  /**
   * Fails if the given assertion condition is false, throwing an Error with the
   * given message if it did.
   *
   * @param assertion
   * @param message
   */
  function debugAssert(assertion, message) {
    if (!assertion) {
      debugFail(message);
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _getCurrentUrl() {
    var _a;
    return typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.href) || '';
  }
  function _isHttpOrHttps() {
    return _getCurrentScheme() === 'http:' || _getCurrentScheme() === 'https:';
  }
  function _getCurrentScheme() {
    var _a;
    return typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.protocol) || null;
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Determine whether the browser is working online
   */
  function _isOnline() {
    if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && typeof navigator.onLine === 'boolean' && (
    // Apply only for traditional web apps and Chrome extensions.
    // This is especially true for Cordova apps which have unreliable
    // navigator.onLine behavior unless cordova-plugin-network-information is
    // installed which overwrites the native navigator.onLine value and
    // defines navigator.connection.
    _isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)) {
      return navigator.onLine;
    }
    // If we can't determine the state, assume it is online.
    return true;
  }
  function _getUserLanguage() {
    if (typeof navigator === 'undefined') {
      return null;
    }
    const navigatorLanguage = navigator;
    return (
      // Most reliable, but only supported in Chrome/Firefox.
      navigatorLanguage.languages && navigatorLanguage.languages[0] ||
      // Supported in most browsers, but returns the language of the browser
      // UI, not the language set in browser settings.
      navigatorLanguage.language ||
      // Couldn't determine language.
      null
    );
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * A structure to help pick between a range of long and short delay durations
   * depending on the current environment. In general, the long delay is used for
   * mobile environments whereas short delays are used for desktop environments.
   */
  class Delay {
    constructor(shortDelay, longDelay) {
      this.shortDelay = shortDelay;
      this.longDelay = longDelay;
      // Internal error when improperly initialized.
      debugAssert(longDelay > shortDelay, 'Short delay should be less than long delay!');
      this.isMobile = isMobileCordova() || isReactNative();
    }
    get() {
      if (!_isOnline()) {
        // Pick the shorter timeout.
        return Math.min(5000 /* DelayMin.OFFLINE */, this.shortDelay);
      }
      // If running in a mobile environment, return the long delay, otherwise
      // return the short delay.
      // This could be improved in the future to dynamically change based on other
      // variables instead of just reading the current environment.
      return this.isMobile ? this.longDelay : this.shortDelay;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _emulatorUrl(config, path) {
    debugAssert(config.emulator, 'Emulator should always be set here');
    const {
      url
    } = config.emulator;
    if (!path) {
      return url;
    }
    return "".concat(url).concat(path.startsWith('/') ? path.slice(1) : path);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class FetchProvider {
    static initialize(fetchImpl, headersImpl, responseImpl) {
      this.fetchImpl = fetchImpl;
      if (headersImpl) {
        this.headersImpl = headersImpl;
      }
      if (responseImpl) {
        this.responseImpl = responseImpl;
      }
    }
    static fetch() {
      if (this.fetchImpl) {
        return this.fetchImpl;
      }
      if (typeof self !== 'undefined' && 'fetch' in self) {
        return self.fetch;
      }
      debugFail('Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    }
    static headers() {
      if (this.headersImpl) {
        return this.headersImpl;
      }
      if (typeof self !== 'undefined' && 'Headers' in self) {
        return self.Headers;
      }
      debugFail('Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    }
    static response() {
      if (this.responseImpl) {
        return this.responseImpl;
      }
      if (typeof self !== 'undefined' && 'Response' in self) {
        return self.Response;
      }
      debugFail('Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Map from errors returned by the server to errors to developer visible errors
   */
  const SERVER_ERROR_MAP = {
    // Custom token errors.
    ["CREDENTIAL_MISMATCH" /* ServerError.CREDENTIAL_MISMATCH */]: "custom-token-mismatch" /* AuthErrorCode.CREDENTIAL_MISMATCH */,

    // This can only happen if the SDK sends a bad request.
    ["MISSING_CUSTOM_TOKEN" /* ServerError.MISSING_CUSTOM_TOKEN */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,

    // Create Auth URI errors.
    ["INVALID_IDENTIFIER" /* ServerError.INVALID_IDENTIFIER */]: "invalid-email" /* AuthErrorCode.INVALID_EMAIL */,

    // This can only happen if the SDK sends a bad request.
    ["MISSING_CONTINUE_URI" /* ServerError.MISSING_CONTINUE_URI */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,

    // Sign in with email and password errors (some apply to sign up too).
    ["INVALID_PASSWORD" /* ServerError.INVALID_PASSWORD */]: "wrong-password" /* AuthErrorCode.INVALID_PASSWORD */,

    // This can only happen if the SDK sends a bad request.
    ["MISSING_PASSWORD" /* ServerError.MISSING_PASSWORD */]: "missing-password" /* AuthErrorCode.MISSING_PASSWORD */,

    // Sign up with email and password errors.
    ["EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */]: "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */,
    ["PASSWORD_LOGIN_DISABLED" /* ServerError.PASSWORD_LOGIN_DISABLED */]: "operation-not-allowed" /* AuthErrorCode.OPERATION_NOT_ALLOWED */,

    // Verify assertion for sign in with credential errors:
    ["INVALID_IDP_RESPONSE" /* ServerError.INVALID_IDP_RESPONSE */]: "invalid-credential" /* AuthErrorCode.INVALID_IDP_RESPONSE */,
    ["INVALID_PENDING_TOKEN" /* ServerError.INVALID_PENDING_TOKEN */]: "invalid-credential" /* AuthErrorCode.INVALID_IDP_RESPONSE */,
    ["FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */]: "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */,

    // This can only happen if the SDK sends a bad request.
    ["MISSING_REQ_TYPE" /* ServerError.MISSING_REQ_TYPE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,

    // Send Password reset email errors:
    ["EMAIL_NOT_FOUND" /* ServerError.EMAIL_NOT_FOUND */]: "user-not-found" /* AuthErrorCode.USER_DELETED */,
    ["RESET_PASSWORD_EXCEED_LIMIT" /* ServerError.RESET_PASSWORD_EXCEED_LIMIT */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,
    ["EXPIRED_OOB_CODE" /* ServerError.EXPIRED_OOB_CODE */]: "expired-action-code" /* AuthErrorCode.EXPIRED_OOB_CODE */,
    ["INVALID_OOB_CODE" /* ServerError.INVALID_OOB_CODE */]: "invalid-action-code" /* AuthErrorCode.INVALID_OOB_CODE */,

    // This can only happen if the SDK sends a bad request.
    ["MISSING_OOB_CODE" /* ServerError.MISSING_OOB_CODE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,

    // Operations that require ID token in request:
    ["CREDENTIAL_TOO_OLD_LOGIN_AGAIN" /* ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */]: "requires-recent-login" /* AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */,
    ["INVALID_ID_TOKEN" /* ServerError.INVALID_ID_TOKEN */]: "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */,
    ["TOKEN_EXPIRED" /* ServerError.TOKEN_EXPIRED */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,
    ["USER_NOT_FOUND" /* ServerError.USER_NOT_FOUND */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,

    // Other errors.
    ["TOO_MANY_ATTEMPTS_TRY_LATER" /* ServerError.TOO_MANY_ATTEMPTS_TRY_LATER */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,

    // Phone Auth related errors.
    ["INVALID_CODE" /* ServerError.INVALID_CODE */]: "invalid-verification-code" /* AuthErrorCode.INVALID_CODE */,
    ["INVALID_SESSION_INFO" /* ServerError.INVALID_SESSION_INFO */]: "invalid-verification-id" /* AuthErrorCode.INVALID_SESSION_INFO */,
    ["INVALID_TEMPORARY_PROOF" /* ServerError.INVALID_TEMPORARY_PROOF */]: "invalid-credential" /* AuthErrorCode.INVALID_IDP_RESPONSE */,
    ["MISSING_SESSION_INFO" /* ServerError.MISSING_SESSION_INFO */]: "missing-verification-id" /* AuthErrorCode.MISSING_SESSION_INFO */,
    ["SESSION_EXPIRED" /* ServerError.SESSION_EXPIRED */]: "code-expired" /* AuthErrorCode.CODE_EXPIRED */,

    // Other action code errors when additional settings passed.
    // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
    // This is OK as this error will be caught by client side validation.
    ["MISSING_ANDROID_PACKAGE_NAME" /* ServerError.MISSING_ANDROID_PACKAGE_NAME */]: "missing-android-pkg-name" /* AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME */,
    ["UNAUTHORIZED_DOMAIN" /* ServerError.UNAUTHORIZED_DOMAIN */]: "unauthorized-continue-uri" /* AuthErrorCode.UNAUTHORIZED_DOMAIN */,

    // getProjectConfig errors when clientId is passed.
    ["INVALID_OAUTH_CLIENT_ID" /* ServerError.INVALID_OAUTH_CLIENT_ID */]: "invalid-oauth-client-id" /* AuthErrorCode.INVALID_OAUTH_CLIENT_ID */,

    // User actions (sign-up or deletion) disabled errors.
    ["ADMIN_ONLY_OPERATION" /* ServerError.ADMIN_ONLY_OPERATION */]: "admin-restricted-operation" /* AuthErrorCode.ADMIN_ONLY_OPERATION */,

    // Multi factor related errors.
    ["INVALID_MFA_PENDING_CREDENTIAL" /* ServerError.INVALID_MFA_PENDING_CREDENTIAL */]: "invalid-multi-factor-session" /* AuthErrorCode.INVALID_MFA_SESSION */,
    ["MFA_ENROLLMENT_NOT_FOUND" /* ServerError.MFA_ENROLLMENT_NOT_FOUND */]: "multi-factor-info-not-found" /* AuthErrorCode.MFA_INFO_NOT_FOUND */,
    ["MISSING_MFA_ENROLLMENT_ID" /* ServerError.MISSING_MFA_ENROLLMENT_ID */]: "missing-multi-factor-info" /* AuthErrorCode.MISSING_MFA_INFO */,
    ["MISSING_MFA_PENDING_CREDENTIAL" /* ServerError.MISSING_MFA_PENDING_CREDENTIAL */]: "missing-multi-factor-session" /* AuthErrorCode.MISSING_MFA_SESSION */,
    ["SECOND_FACTOR_EXISTS" /* ServerError.SECOND_FACTOR_EXISTS */]: "second-factor-already-in-use" /* AuthErrorCode.SECOND_FACTOR_ALREADY_ENROLLED */,
    ["SECOND_FACTOR_LIMIT_EXCEEDED" /* ServerError.SECOND_FACTOR_LIMIT_EXCEEDED */]: "maximum-second-factor-count-exceeded" /* AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED */,

    // Blocking functions related errors.
    ["BLOCKING_FUNCTION_ERROR_RESPONSE" /* ServerError.BLOCKING_FUNCTION_ERROR_RESPONSE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,

    // Recaptcha related errors.
    ["RECAPTCHA_NOT_ENABLED" /* ServerError.RECAPTCHA_NOT_ENABLED */]: "recaptcha-not-enabled" /* AuthErrorCode.RECAPTCHA_NOT_ENABLED */,
    ["MISSING_RECAPTCHA_TOKEN" /* ServerError.MISSING_RECAPTCHA_TOKEN */]: "missing-recaptcha-token" /* AuthErrorCode.MISSING_RECAPTCHA_TOKEN */,
    ["INVALID_RECAPTCHA_TOKEN" /* ServerError.INVALID_RECAPTCHA_TOKEN */]: "invalid-recaptcha-token" /* AuthErrorCode.INVALID_RECAPTCHA_TOKEN */,
    ["INVALID_RECAPTCHA_ACTION" /* ServerError.INVALID_RECAPTCHA_ACTION */]: "invalid-recaptcha-action" /* AuthErrorCode.INVALID_RECAPTCHA_ACTION */,
    ["MISSING_CLIENT_TYPE" /* ServerError.MISSING_CLIENT_TYPE */]: "missing-client-type" /* AuthErrorCode.MISSING_CLIENT_TYPE */,
    ["MISSING_RECAPTCHA_VERSION" /* ServerError.MISSING_RECAPTCHA_VERSION */]: "missing-recaptcha-version" /* AuthErrorCode.MISSING_RECAPTCHA_VERSION */,
    ["INVALID_RECAPTCHA_VERSION" /* ServerError.INVALID_RECAPTCHA_VERSION */]: "invalid-recaptcha-version" /* AuthErrorCode.INVALID_RECAPTCHA_VERSION */,
    ["INVALID_REQ_TYPE" /* ServerError.INVALID_REQ_TYPE */]: "invalid-req-type" /* AuthErrorCode.INVALID_REQ_TYPE */
  };

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const DEFAULT_API_TIMEOUT_MS = new Delay(30000, 60000);
  function _addTidIfNecessary(auth, request) {
    if (auth.tenantId && !request.tenantId) {
      return Object.assign(Object.assign({}, request), {
        tenantId: auth.tenantId
      });
    }
    return request;
  }
  async function _performApiRequest(auth, method, path, request) {
    let customErrorMap = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    return _performFetchWithErrorHandling(auth, customErrorMap, async () => {
      let body = {};
      let params = {};
      if (request) {
        if (method === "GET" /* HttpMethod.GET */) {
          params = request;
        } else {
          body = {
            body: JSON.stringify(request)
          };
        }
      }
      const query = querystring(Object.assign({
        key: auth.config.apiKey
      }, params)).slice(1);
      const headers = await auth._getAdditionalHeaders();
      headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/json';
      if (auth.languageCode) {
        headers["X-Firebase-Locale" /* HttpHeader.X_FIREBASE_LOCALE */] = auth.languageCode;
      }
      return FetchProvider.fetch()(_getFinalTarget(auth, auth.config.apiHost, path, query), Object.assign({
        method,
        headers,
        referrerPolicy: 'no-referrer'
      }, body));
    });
  }
  async function _performFetchWithErrorHandling(auth, customErrorMap, fetchFn) {
    auth._canInitEmulator = false;
    const errorMap = Object.assign(Object.assign({}, SERVER_ERROR_MAP), customErrorMap);
    try {
      const networkTimeout = new NetworkTimeout(auth);
      const response = await Promise.race([fetchFn(), networkTimeout.promise]);
      // If we've reached this point, the fetch succeeded and the networkTimeout
      // didn't throw; clear the network timeout delay so that Node won't hang
      networkTimeout.clearNetworkTimeout();
      const json = await response.json();
      if ('needConfirmation' in json) {
        throw _makeTaggedError(auth, "account-exists-with-different-credential" /* AuthErrorCode.NEED_CONFIRMATION */, json);
      }
      if (response.ok && !('errorMessage' in json)) {
        return json;
      } else {
        const errorMessage = response.ok ? json.errorMessage : json.error.message;
        const [serverErrorCode, serverErrorMessage] = errorMessage.split(' : ');
        if (serverErrorCode === "FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */) {
          throw _makeTaggedError(auth, "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */, json);
        } else if (serverErrorCode === "EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */) {
          throw _makeTaggedError(auth, "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */, json);
        } else if (serverErrorCode === "USER_DISABLED" /* ServerError.USER_DISABLED */) {
          throw _makeTaggedError(auth, "user-disabled" /* AuthErrorCode.USER_DISABLED */, json);
        }
        const authError = errorMap[serverErrorCode] || serverErrorCode.toLowerCase().replace(/[_\s]+/g, '-');
        if (serverErrorMessage) {
          throw _errorWithCustomMessage(auth, authError, serverErrorMessage);
        } else {
          _fail(auth, authError);
        }
      }
    } catch (e) {
      if (e instanceof FirebaseError) {
        throw e;
      }
      // Changing this to a different error code will log user out when there is a network error
      // because we treat any error other than NETWORK_REQUEST_FAILED as token is invalid.
      // https://github.com/firebase/firebase-js-sdk/blob/4fbc73610d70be4e0852e7de63a39cb7897e8546/packages/auth/src/core/auth/auth_impl.ts#L309-L316
      _fail(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */, {
        'message': String(e)
      });
    }
  }
  async function _performSignInRequest(auth, method, path, request) {
    let customErrorMap = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    const serverResponse = await _performApiRequest(auth, method, path, request, customErrorMap);
    if ('mfaPendingCredential' in serverResponse) {
      _fail(auth, "multi-factor-auth-required" /* AuthErrorCode.MFA_REQUIRED */, {
        _serverResponse: serverResponse
      });
    }
    return serverResponse;
  }
  function _getFinalTarget(auth, host, path, query) {
    const base = "".concat(host).concat(path, "?").concat(query);
    if (!auth.config.emulator) {
      return "".concat(auth.config.apiScheme, "://").concat(base);
    }
    return _emulatorUrl(auth.config, base);
  }
  class NetworkTimeout {
    constructor(auth) {
      this.auth = auth;
      // Node timers and browser timers are fundamentally incompatible, but we
      // don't care about the value here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.timer = null;
      this.promise = new Promise((_, reject) => {
        this.timer = setTimeout(() => {
          return reject(_createError(this.auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
        }, DEFAULT_API_TIMEOUT_MS.get());
      });
    }
    clearNetworkTimeout() {
      clearTimeout(this.timer);
    }
  }
  function _makeTaggedError(auth, code, response) {
    const errorParams = {
      appName: auth.name
    };
    if (response.email) {
      errorParams.email = response.email;
    }
    if (response.phoneNumber) {
      errorParams.phoneNumber = response.phoneNumber;
    }
    const error = _createError(auth, code, errorParams);
    // We know customData is defined on error because errorParams is defined
    error.customData._tokenResponse = response;
    return error;
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function deleteAccount(auth, request) {
    return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:delete" /* Endpoint.DELETE_ACCOUNT */, request);
  }
  async function getAccountInfo(auth, request) {
    return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:lookup" /* Endpoint.GET_ACCOUNT_INFO */, request);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function utcTimestampToDateString(utcTimestamp) {
    if (!utcTimestamp) {
      return undefined;
    }
    try {
      // Convert to date object.
      const date = new Date(Number(utcTimestamp));
      // Test date is valid.
      if (!isNaN(date.getTime())) {
        // Convert to UTC date string.
        return date.toUTCString();
      }
    } catch (e) {
      // Do nothing. undefined will be returned.
    }
    return undefined;
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Returns a JSON Web Token (JWT) used to identify the user to a Firebase service.
   *
   * @remarks
   * Returns the current token if it has not expired or if it will not expire in the next five
   * minutes. Otherwise, this will refresh the token and return a new one.
   *
   * @param user - The user.
   * @param forceRefresh - Force refresh regardless of token expiration.
   *
   * @public
   */
  function getIdToken(user) {
    let forceRefresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return getModularInstance(user).getIdToken(forceRefresh);
  }
  /**
   * Returns a deserialized JSON Web Token (JWT) used to identify the user to a Firebase service.
   *
   * @remarks
   * Returns the current token if it has not expired or if it will not expire in the next five
   * minutes. Otherwise, this will refresh the token and return a new one.
   *
   * @param user - The user.
   * @param forceRefresh - Force refresh regardless of token expiration.
   *
   * @public
   */
  async function getIdTokenResult(user) {
    let forceRefresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    const userInternal = getModularInstance(user);
    const token = await userInternal.getIdToken(forceRefresh);
    const claims = _parseToken(token);
    _assert(claims && claims.exp && claims.auth_time && claims.iat, userInternal.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    const firebase = typeof claims.firebase === 'object' ? claims.firebase : undefined;
    const signInProvider = firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_provider'];
    return {
      claims,
      token,
      authTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.auth_time)),
      issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.iat)),
      expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.exp)),
      signInProvider: signInProvider || null,
      signInSecondFactor: (firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_second_factor']) || null
    };
  }
  function secondsStringToMilliseconds(seconds) {
    return Number(seconds) * 1000;
  }
  function _parseToken(token) {
    const [algorithm, payload, signature] = token.split('.');
    if (algorithm === undefined || payload === undefined || signature === undefined) {
      _logError('JWT malformed, contained fewer than 3 sections');
      return null;
    }
    try {
      const decoded = base64Decode(payload);
      if (!decoded) {
        _logError('Failed to decode base64 JWT payload');
        return null;
      }
      return JSON.parse(decoded);
    } catch (e) {
      _logError('Caught error parsing JWT payload as JSON', e === null || e === void 0 ? void 0 : e.toString());
      return null;
    }
  }
  /**
   * Extract expiresIn TTL from a token by subtracting the expiration from the issuance.
   */
  function _tokenExpiresIn(token) {
    const parsedToken = _parseToken(token);
    _assert(parsedToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    _assert(typeof parsedToken.exp !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    _assert(typeof parsedToken.iat !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    return Number(parsedToken.exp) - Number(parsedToken.iat);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function _logoutIfInvalidated(user, promise) {
    let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    if (bypassAuthState) {
      return promise;
    }
    try {
      return await promise;
    } catch (e) {
      if (e instanceof FirebaseError && isUserInvalidated(e)) {
        if (user.auth.currentUser === user) {
          await user.auth.signOut();
        }
      }
      throw e;
    }
  }
  function isUserInvalidated(_ref) {
    let {
      code
    } = _ref;
    return code === "auth/".concat("user-disabled" /* AuthErrorCode.USER_DISABLED */) || code === "auth/".concat("user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class ProactiveRefresh {
    constructor(user) {
      this.user = user;
      this.isRunning = false;
      // Node timers and browser timers return fundamentally different types.
      // We don't actually care what the value is but TS won't accept unknown and
      // we can't cast properly in both environments.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.timerId = null;
      this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
    }
    _start() {
      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      this.schedule();
    }
    _stop() {
      if (!this.isRunning) {
        return;
      }
      this.isRunning = false;
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
      }
    }
    getInterval(wasError) {
      var _a;
      if (wasError) {
        const interval = this.errorBackoff;
        this.errorBackoff = Math.min(this.errorBackoff * 2, 960000 /* Duration.RETRY_BACKOFF_MAX */);
        return interval;
      } else {
        // Reset the error backoff
        this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
        const expTime = (_a = this.user.stsTokenManager.expirationTime) !== null && _a !== void 0 ? _a : 0;
        const interval = expTime - Date.now() - 300000 /* Duration.OFFSET */;
        return Math.max(0, interval);
      }
    }
    schedule() {
      let wasError = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      if (!this.isRunning) {
        // Just in case...
        return;
      }
      const interval = this.getInterval(wasError);
      this.timerId = setTimeout(async () => {
        await this.iteration();
      }, interval);
    }
    async iteration() {
      try {
        await this.user.getIdToken(true);
      } catch (e) {
        // Only retry on network errors
        if ((e === null || e === void 0 ? void 0 : e.code) === "auth/".concat("network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */)) {
          this.schedule(/* wasError */true);
        }
        return;
      }
      this.schedule();
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class UserMetadata {
    constructor(createdAt, lastLoginAt) {
      this.createdAt = createdAt;
      this.lastLoginAt = lastLoginAt;
      this._initializeTime();
    }
    _initializeTime() {
      this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt);
      this.creationTime = utcTimestampToDateString(this.createdAt);
    }
    _copy(metadata) {
      this.createdAt = metadata.createdAt;
      this.lastLoginAt = metadata.lastLoginAt;
      this._initializeTime();
    }
    toJSON() {
      return {
        createdAt: this.createdAt,
        lastLoginAt: this.lastLoginAt
      };
    }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function _reloadWithoutSaving(user) {
    var _a;
    const auth = user.auth;
    const idToken = await user.getIdToken();
    const response = await _logoutIfInvalidated(user, getAccountInfo(auth, {
      idToken
    }));
    _assert(response === null || response === void 0 ? void 0 : response.users.length, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    const coreAccount = response.users[0];
    user._notifyReloadListener(coreAccount);
    const newProviderData = ((_a = coreAccount.providerUserInfo) === null || _a === void 0 ? void 0 : _a.length) ? extractProviderData(coreAccount.providerUserInfo) : [];
    const providerData = mergeProviderData(user.providerData, newProviderData);
    // Preserves the non-nonymous status of the stored user, even if no more
    // credentials (federated or email/password) are linked to the user. If
    // the user was previously anonymous, then use provider data to update.
    // On the other hand, if it was not anonymous before, it should never be
    // considered anonymous now.
    const oldIsAnonymous = user.isAnonymous;
    const newIsAnonymous = !(user.email && coreAccount.passwordHash) && !(providerData === null || providerData === void 0 ? void 0 : providerData.length);
    const isAnonymous = !oldIsAnonymous ? false : newIsAnonymous;
    const updates = {
      uid: coreAccount.localId,
      displayName: coreAccount.displayName || null,
      photoURL: coreAccount.photoUrl || null,
      email: coreAccount.email || null,
      emailVerified: coreAccount.emailVerified || false,
      phoneNumber: coreAccount.phoneNumber || null,
      tenantId: coreAccount.tenantId || null,
      providerData,
      metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
      isAnonymous
    };
    Object.assign(user, updates);
  }
  /**
   * Reloads user account data, if signed in.
   *
   * @param user - The user.
   *
   * @public
   */
  async function reload(user) {
    const userInternal = getModularInstance(user);
    await _reloadWithoutSaving(userInternal);
    // Even though the current user hasn't changed, update
    // current user will trigger a persistence update w/ the
    // new info.
    await userInternal.auth._persistUserIfCurrent(userInternal);
    userInternal.auth._notifyListenersIfCurrent(userInternal);
  }
  function mergeProviderData(original, newData) {
    const deduped = original.filter(o => !newData.some(n => n.providerId === o.providerId));
    return [...deduped, ...newData];
  }
  function extractProviderData(providers) {
    return providers.map(_a => {
      var {
          providerId
        } = _a,
        provider = __rest(_a, ["providerId"]);
      return {
        providerId,
        uid: provider.rawId || '',
        displayName: provider.displayName || null,
        email: provider.email || null,
        phoneNumber: provider.phoneNumber || null,
        photoURL: provider.photoUrl || null
      };
    });
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function requestStsToken(auth, refreshToken) {
    const response = await _performFetchWithErrorHandling(auth, {}, async () => {
      const body = querystring({
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
      }).slice(1);
      const {
        tokenApiHost,
        apiKey
      } = auth.config;
      const url = _getFinalTarget(auth, tokenApiHost, "/v1/token" /* Endpoint.TOKEN */, "key=".concat(apiKey));
      const headers = await auth._getAdditionalHeaders();
      headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/x-www-form-urlencoded';
      return FetchProvider.fetch()(url, {
        method: "POST" /* HttpMethod.POST */,
        headers,
        body
      });
    });
    // The response comes back in snake_case. Convert to camel:
    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      refreshToken: response.refresh_token
    };
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * We need to mark this class as internal explicitly to exclude it in the public typings, because
   * it references AuthInternal which has a circular dependency with UserInternal.
   *
   * @internal
   */
  class StsTokenManager {
    constructor() {
      this.refreshToken = null;
      this.accessToken = null;
      this.expirationTime = null;
    }
    get isExpired() {
      return !this.expirationTime || Date.now() > this.expirationTime - 30000 /* Buffer.TOKEN_REFRESH */;
    }
    updateFromServerResponse(response) {
      _assert(response.idToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      _assert(typeof response.idToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      _assert(typeof response.refreshToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      const expiresIn = 'expiresIn' in response && typeof response.expiresIn !== 'undefined' ? Number(response.expiresIn) : _tokenExpiresIn(response.idToken);
      this.updateTokensAndExpiration(response.idToken, response.refreshToken, expiresIn);
    }
    async getToken(auth) {
      let forceRefresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      _assert(!this.accessToken || this.refreshToken, auth, "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */);
      if (!forceRefresh && this.accessToken && !this.isExpired) {
        return this.accessToken;
      }
      if (this.refreshToken) {
        await this.refresh(auth, this.refreshToken);
        return this.accessToken;
      }
      return null;
    }
    clearRefreshToken() {
      this.refreshToken = null;
    }
    async refresh(auth, oldToken) {
      const {
        accessToken,
        refreshToken,
        expiresIn
      } = await requestStsToken(auth, oldToken);
      this.updateTokensAndExpiration(accessToken, refreshToken, Number(expiresIn));
    }
    updateTokensAndExpiration(accessToken, refreshToken, expiresInSec) {
      this.refreshToken = refreshToken || null;
      this.accessToken = accessToken || null;
      this.expirationTime = Date.now() + expiresInSec * 1000;
    }
    static fromJSON(appName, object) {
      const {
        refreshToken,
        accessToken,
        expirationTime
      } = object;
      const manager = new StsTokenManager();
      if (refreshToken) {
        _assert(typeof refreshToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
          appName
        });
        manager.refreshToken = refreshToken;
      }
      if (accessToken) {
        _assert(typeof accessToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
          appName
        });
        manager.accessToken = accessToken;
      }
      if (expirationTime) {
        _assert(typeof expirationTime === 'number', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
          appName
        });
        manager.expirationTime = expirationTime;
      }
      return manager;
    }
    toJSON() {
      return {
        refreshToken: this.refreshToken,
        accessToken: this.accessToken,
        expirationTime: this.expirationTime
      };
    }
    _assign(stsTokenManager) {
      this.accessToken = stsTokenManager.accessToken;
      this.refreshToken = stsTokenManager.refreshToken;
      this.expirationTime = stsTokenManager.expirationTime;
    }
    _clone() {
      return Object.assign(new StsTokenManager(), this.toJSON());
    }
    _performRefresh() {
      return debugFail('not implemented');
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function assertStringOrUndefined(assertion, appName) {
    _assert(typeof assertion === 'string' || typeof assertion === 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
      appName
    });
  }
  class UserImpl {
    constructor(_a) {
      var {
          uid,
          auth,
          stsTokenManager
        } = _a,
        opt = __rest(_a, ["uid", "auth", "stsTokenManager"]);
      // For the user object, provider is always Firebase.
      this.providerId = "firebase" /* ProviderId.FIREBASE */;
      this.proactiveRefresh = new ProactiveRefresh(this);
      this.reloadUserInfo = null;
      this.reloadListener = null;
      this.uid = uid;
      this.auth = auth;
      this.stsTokenManager = stsTokenManager;
      this.accessToken = stsTokenManager.accessToken;
      this.displayName = opt.displayName || null;
      this.email = opt.email || null;
      this.emailVerified = opt.emailVerified || false;
      this.phoneNumber = opt.phoneNumber || null;
      this.photoURL = opt.photoURL || null;
      this.isAnonymous = opt.isAnonymous || false;
      this.tenantId = opt.tenantId || null;
      this.providerData = opt.providerData ? [...opt.providerData] : [];
      this.metadata = new UserMetadata(opt.createdAt || undefined, opt.lastLoginAt || undefined);
    }
    async getIdToken(forceRefresh) {
      const accessToken = await _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, forceRefresh));
      _assert(accessToken, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      if (this.accessToken !== accessToken) {
        this.accessToken = accessToken;
        await this.auth._persistUserIfCurrent(this);
        this.auth._notifyListenersIfCurrent(this);
      }
      return accessToken;
    }
    getIdTokenResult(forceRefresh) {
      return getIdTokenResult(this, forceRefresh);
    }
    reload() {
      return reload(this);
    }
    _assign(user) {
      if (this === user) {
        return;
      }
      _assert(this.uid === user.uid, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      this.displayName = user.displayName;
      this.photoURL = user.photoURL;
      this.email = user.email;
      this.emailVerified = user.emailVerified;
      this.phoneNumber = user.phoneNumber;
      this.isAnonymous = user.isAnonymous;
      this.tenantId = user.tenantId;
      this.providerData = user.providerData.map(userInfo => Object.assign({}, userInfo));
      this.metadata._copy(user.metadata);
      this.stsTokenManager._assign(user.stsTokenManager);
    }
    _clone(auth) {
      const newUser = new UserImpl(Object.assign(Object.assign({}, this), {
        auth,
        stsTokenManager: this.stsTokenManager._clone()
      }));
      newUser.metadata._copy(this.metadata);
      return newUser;
    }
    _onReload(callback) {
      // There should only ever be one listener, and that is a single instance of MultiFactorUser
      _assert(!this.reloadListener, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      this.reloadListener = callback;
      if (this.reloadUserInfo) {
        this._notifyReloadListener(this.reloadUserInfo);
        this.reloadUserInfo = null;
      }
    }
    _notifyReloadListener(userInfo) {
      if (this.reloadListener) {
        this.reloadListener(userInfo);
      } else {
        // If no listener is subscribed yet, save the result so it's available when they do subscribe
        this.reloadUserInfo = userInfo;
      }
    }
    _startProactiveRefresh() {
      this.proactiveRefresh._start();
    }
    _stopProactiveRefresh() {
      this.proactiveRefresh._stop();
    }
    async _updateTokensIfNecessary(response) {
      let reload = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      let tokensRefreshed = false;
      if (response.idToken && response.idToken !== this.stsTokenManager.accessToken) {
        this.stsTokenManager.updateFromServerResponse(response);
        tokensRefreshed = true;
      }
      if (reload) {
        await _reloadWithoutSaving(this);
      }
      await this.auth._persistUserIfCurrent(this);
      if (tokensRefreshed) {
        this.auth._notifyListenersIfCurrent(this);
      }
    }
    async delete() {
      const idToken = await this.getIdToken();
      await _logoutIfInvalidated(this, deleteAccount(this.auth, {
        idToken
      }));
      this.stsTokenManager.clearRefreshToken();
      // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
      //       cancels pending actions...
      return this.auth.signOut();
    }
    toJSON() {
      return Object.assign(Object.assign({
        uid: this.uid,
        email: this.email || undefined,
        emailVerified: this.emailVerified,
        displayName: this.displayName || undefined,
        isAnonymous: this.isAnonymous,
        photoURL: this.photoURL || undefined,
        phoneNumber: this.phoneNumber || undefined,
        tenantId: this.tenantId || undefined,
        providerData: this.providerData.map(userInfo => Object.assign({}, userInfo)),
        stsTokenManager: this.stsTokenManager.toJSON(),
        // Redirect event ID must be maintained in case there is a pending
        // redirect event.
        _redirectEventId: this._redirectEventId
      }, this.metadata.toJSON()), {
        // Required for compatibility with the legacy SDK (go/firebase-auth-sdk-persistence-parsing):
        apiKey: this.auth.config.apiKey,
        appName: this.auth.name
      });
    }
    get refreshToken() {
      return this.stsTokenManager.refreshToken || '';
    }
    static _fromJSON(auth, object) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const displayName = (_a = object.displayName) !== null && _a !== void 0 ? _a : undefined;
      const email = (_b = object.email) !== null && _b !== void 0 ? _b : undefined;
      const phoneNumber = (_c = object.phoneNumber) !== null && _c !== void 0 ? _c : undefined;
      const photoURL = (_d = object.photoURL) !== null && _d !== void 0 ? _d : undefined;
      const tenantId = (_e = object.tenantId) !== null && _e !== void 0 ? _e : undefined;
      const _redirectEventId = (_f = object._redirectEventId) !== null && _f !== void 0 ? _f : undefined;
      const createdAt = (_g = object.createdAt) !== null && _g !== void 0 ? _g : undefined;
      const lastLoginAt = (_h = object.lastLoginAt) !== null && _h !== void 0 ? _h : undefined;
      const {
        uid,
        emailVerified,
        isAnonymous,
        providerData,
        stsTokenManager: plainObjectTokenManager
      } = object;
      _assert(uid && plainObjectTokenManager, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      const stsTokenManager = StsTokenManager.fromJSON(this.name, plainObjectTokenManager);
      _assert(typeof uid === 'string', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      assertStringOrUndefined(displayName, auth.name);
      assertStringOrUndefined(email, auth.name);
      _assert(typeof emailVerified === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      _assert(typeof isAnonymous === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      assertStringOrUndefined(phoneNumber, auth.name);
      assertStringOrUndefined(photoURL, auth.name);
      assertStringOrUndefined(tenantId, auth.name);
      assertStringOrUndefined(_redirectEventId, auth.name);
      assertStringOrUndefined(createdAt, auth.name);
      assertStringOrUndefined(lastLoginAt, auth.name);
      const user = new UserImpl({
        uid,
        auth,
        email,
        emailVerified,
        displayName,
        isAnonymous,
        photoURL,
        phoneNumber,
        tenantId,
        stsTokenManager,
        createdAt,
        lastLoginAt
      });
      if (providerData && Array.isArray(providerData)) {
        user.providerData = providerData.map(userInfo => Object.assign({}, userInfo));
      }
      if (_redirectEventId) {
        user._redirectEventId = _redirectEventId;
      }
      return user;
    }
    /**
     * Initialize a User from an idToken server response
     * @param auth
     * @param idTokenResponse
     */
    static async _fromIdTokenResponse(auth, idTokenResponse) {
      let isAnonymous = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      const stsTokenManager = new StsTokenManager();
      stsTokenManager.updateFromServerResponse(idTokenResponse);
      // Initialize the Firebase Auth user.
      const user = new UserImpl({
        uid: idTokenResponse.localId,
        auth,
        stsTokenManager,
        isAnonymous
      });
      // Updates the user info and data and resolves with a user instance.
      await _reloadWithoutSaving(user);
      return user;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const instanceCache = new Map();
  function _getInstance(cls) {
    debugAssert(cls instanceof Function, 'Expected a class definition');
    let instance = instanceCache.get(cls);
    if (instance) {
      debugAssert(instance instanceof cls, 'Instance stored in cache mismatched with class');
      return instance;
    }
    instance = new cls();
    instanceCache.set(cls, instance);
    return instance;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class InMemoryPersistence {
    constructor() {
      this.type = "NONE" /* PersistenceType.NONE */;
      this.storage = {};
    }
    async _isAvailable() {
      return true;
    }
    async _set(key, value) {
      this.storage[key] = value;
    }
    async _get(key) {
      const value = this.storage[key];
      return value === undefined ? null : value;
    }
    async _remove(key) {
      delete this.storage[key];
    }
    _addListener(_key, _listener) {
      // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
      return;
    }
    _removeListener(_key, _listener) {
      // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
      return;
    }
  }
  InMemoryPersistence.type = 'NONE';
  /**
   * An implementation of {@link Persistence} of type 'NONE'.
   *
   * @public
   */
  const inMemoryPersistence = InMemoryPersistence;

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _persistenceKeyName(key, apiKey, appName) {
    return "firebase" /* Namespace.PERSISTENCE */.concat(":", key, ":").concat(apiKey, ":").concat(appName);
  }
  class PersistenceUserManager {
    constructor(persistence, auth, userKey) {
      this.persistence = persistence;
      this.auth = auth;
      this.userKey = userKey;
      const {
        config,
        name
      } = this.auth;
      this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
      this.fullPersistenceKey = _persistenceKeyName("persistence" /* KeyName.PERSISTENCE_USER */, config.apiKey, name);
      this.boundEventHandler = auth._onStorageEvent.bind(auth);
      this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
    }
    setCurrentUser(user) {
      return this.persistence._set(this.fullUserKey, user.toJSON());
    }
    async getCurrentUser() {
      const blob = await this.persistence._get(this.fullUserKey);
      return blob ? UserImpl._fromJSON(this.auth, blob) : null;
    }
    removeCurrentUser() {
      return this.persistence._remove(this.fullUserKey);
    }
    savePersistenceForRedirect() {
      return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
    }
    async setPersistence(newPersistence) {
      if (this.persistence === newPersistence) {
        return;
      }
      const currentUser = await this.getCurrentUser();
      await this.removeCurrentUser();
      this.persistence = newPersistence;
      if (currentUser) {
        return this.setCurrentUser(currentUser);
      }
    }
    delete() {
      this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
    }
    static async create(auth, persistenceHierarchy) {
      let userKey = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "authUser";
      if (!persistenceHierarchy.length) {
        return new PersistenceUserManager(_getInstance(inMemoryPersistence), auth, userKey);
      }
      // Eliminate any persistences that are not available
      const availablePersistences = (await Promise.all(persistenceHierarchy.map(async persistence => {
        if (await persistence._isAvailable()) {
          return persistence;
        }
        return undefined;
      }))).filter(persistence => persistence);
      // Fall back to the first persistence listed, or in memory if none available
      let selectedPersistence = availablePersistences[0] || _getInstance(inMemoryPersistence);
      const key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);
      // Pull out the existing user, setting the chosen persistence to that
      // persistence if the user exists.
      let userToMigrate = null;
      // Note, here we check for a user in _all_ persistences, not just the
      // ones deemed available. If we can migrate a user out of a broken
      // persistence, we will (but only if that persistence supports migration).
      for (const persistence of persistenceHierarchy) {
        try {
          const blob = await persistence._get(key);
          if (blob) {
            const user = UserImpl._fromJSON(auth, blob); // throws for unparsable blob (wrong format)
            if (persistence !== selectedPersistence) {
              userToMigrate = user;
            }
            selectedPersistence = persistence;
            break;
          }
        } catch (_a) {}
      }
      // If we find the user in a persistence that does support migration, use
      // that migration path (of only persistences that support migration)
      const migrationHierarchy = availablePersistences.filter(p => p._shouldAllowMigration);
      // If the persistence does _not_ allow migration, just finish off here
      if (!selectedPersistence._shouldAllowMigration || !migrationHierarchy.length) {
        return new PersistenceUserManager(selectedPersistence, auth, userKey);
      }
      selectedPersistence = migrationHierarchy[0];
      if (userToMigrate) {
        // This normally shouldn't throw since chosenPersistence.isAvailable() is true, but if it does
        // we'll just let it bubble to surface the error.
        await selectedPersistence._set(key, userToMigrate.toJSON());
      }
      // Attempt to clear the key in other persistences but ignore errors. This helps prevent issues
      // such as users getting stuck with a previous account after signing out and refreshing the tab.
      await Promise.all(persistenceHierarchy.map(async persistence => {
        if (persistence !== selectedPersistence) {
          try {
            await persistence._remove(key);
          } catch (_a) {}
        }
      }));
      return new PersistenceUserManager(selectedPersistence, auth, userKey);
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Determine the browser for the purposes of reporting usage to the API
   */
  function _getBrowserName(userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
      return "Opera" /* BrowserName.OPERA */;
    } else if (_isIEMobile(ua)) {
      // Windows phone IEMobile browser.
      return "IEMobile" /* BrowserName.IEMOBILE */;
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      return "IE" /* BrowserName.IE */;
    } else if (ua.includes('edge/')) {
      return "Edge" /* BrowserName.EDGE */;
    } else if (_isFirefox(ua)) {
      return "Firefox" /* BrowserName.FIREFOX */;
    } else if (ua.includes('silk/')) {
      return "Silk" /* BrowserName.SILK */;
    } else if (_isBlackBerry(ua)) {
      // Blackberry browser.
      return "Blackberry" /* BrowserName.BLACKBERRY */;
    } else if (_isWebOS(ua)) {
      // WebOS default browser.
      return "Webos" /* BrowserName.WEBOS */;
    } else if (_isSafari(ua)) {
      return "Safari" /* BrowserName.SAFARI */;
    } else if ((ua.includes('chrome/') || _isChromeIOS(ua)) && !ua.includes('edge/')) {
      return "Chrome" /* BrowserName.CHROME */;
    } else if (_isAndroid(ua)) {
      // Android stock browser.
      return "Android" /* BrowserName.ANDROID */;
    } else {
      // Most modern browsers have name/version at end of user agent string.
      const re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
      const matches = userAgent.match(re);
      if ((matches === null || matches === void 0 ? void 0 : matches.length) === 2) {
        return matches[1];
      }
    }
    return "Other" /* BrowserName.OTHER */;
  }
  function _isFirefox() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /firefox\//i.test(ua);
  }
  function _isSafari() {
    let userAgent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    const ua = userAgent.toLowerCase();
    return ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('crios/') && !ua.includes('android');
  }
  function _isChromeIOS() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /crios\//i.test(ua);
  }
  function _isIEMobile() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /iemobile/i.test(ua);
  }
  function _isAndroid() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /android/i.test(ua);
  }
  function _isBlackBerry() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /blackberry/i.test(ua);
  }
  function _isWebOS() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /webos/i.test(ua);
  }
  function _isIOS() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /iphone|ipad|ipod/i.test(ua) || /macintosh/i.test(ua) && /mobile/i.test(ua);
  }
  function _isIOSStandalone() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    var _a;
    return _isIOS(ua) && !!((_a = window.navigator) === null || _a === void 0 ? void 0 : _a.standalone);
  }
  function _isIE10() {
    return isIE() && document.documentMode === 10;
  }
  function _isMobileBrowser() {
    let ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    // TODO: implement getBrowserName equivalent for OS.
    return _isIOS(ua) || _isAndroid(ua) || _isWebOS(ua) || _isBlackBerry(ua) || /windows phone/i.test(ua) || _isIEMobile(ua);
  }
  function _isIframe() {
    try {
      // Check that the current window is not the top window.
      // If so, return true.
      return !!(window && window !== window.top);
    } catch (e) {
      return false;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /*
   * Determine the SDK version string
   */
  function _getClientVersion(clientPlatform) {
    let frameworks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    let reportedPlatform;
    switch (clientPlatform) {
      case "Browser" /* ClientPlatform.BROWSER */:
        // In a browser environment, report the browser name.
        reportedPlatform = _getBrowserName(getUA());
        break;
      case "Worker" /* ClientPlatform.WORKER */:
        // Technically a worker runs from a browser but we need to differentiate a
        // worker from a browser.
        // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
        reportedPlatform = "".concat(_getBrowserName(getUA()), "-").concat(clientPlatform);
        break;
      default:
        reportedPlatform = clientPlatform;
    }
    const reportedFrameworks = frameworks.length ? frameworks.join(',') : 'FirebaseCore-web'; /* default value if no other framework is used */
    return "".concat(reportedPlatform, "/", "JsCore" /* ClientImplementation.CORE */, "/").concat(SDK_VERSION, "/").concat(reportedFrameworks);
  }
  async function getRecaptchaConfig(auth, request) {
    return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v2/recaptchaConfig" /* Endpoint.GET_RECAPTCHA_CONFIG */, _addTidIfNecessary(auth, request));
  }
  function isEnterprise(grecaptcha) {
    return grecaptcha !== undefined && grecaptcha.enterprise !== undefined;
  }
  class RecaptchaConfig {
    constructor(response) {
      /**
       * The reCAPTCHA site key.
       */
      this.siteKey = '';
      /**
       * The reCAPTCHA enablement status of the {@link EmailAuthProvider} for the current tenant.
       */
      this.emailPasswordEnabled = false;
      if (response.recaptchaKey === undefined) {
        throw new Error('recaptchaKey undefined');
      }
      // Example response.recaptchaKey: "projects/proj123/keys/sitekey123"
      this.siteKey = response.recaptchaKey.split('/')[3];
      this.emailPasswordEnabled = response.recaptchaEnforcementState.some(enforcementState => enforcementState.provider === 'EMAIL_PASSWORD_PROVIDER' && enforcementState.enforcementState !== 'OFF');
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function getScriptParentElement() {
    var _a, _b;
    return (_b = (_a = document.getElementsByTagName('head')) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : document;
  }
  function _loadJS(url) {
    // TODO: consider adding timeout support & cancellation
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.setAttribute('src', url);
      el.onload = resolve;
      el.onerror = e => {
        const error = _createError("internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        error.customData = e;
        reject(error);
      };
      el.type = 'text/javascript';
      el.charset = 'UTF-8';
      getScriptParentElement().appendChild(el);
    });
  }
  function _generateCallbackName(prefix) {
    return "__".concat(prefix).concat(Math.floor(Math.random() * 1000000));
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const RECAPTCHA_ENTERPRISE_URL = 'https://www.google.com/recaptcha/enterprise.js?render=';
  const RECAPTCHA_ENTERPRISE_VERIFIER_TYPE = 'recaptcha-enterprise';
  const FAKE_TOKEN = 'NO_RECAPTCHA';
  class RecaptchaEnterpriseVerifier {
    /**
     *
     * @param authExtern - The corresponding Firebase {@link Auth} instance.
     *
     */
    constructor(authExtern) {
      /**
       * Identifies the type of application verifier (e.g. "recaptcha-enterprise").
       */
      this.type = RECAPTCHA_ENTERPRISE_VERIFIER_TYPE;
      this.auth = _castAuth(authExtern);
    }
    /**
     * Executes the verification process.
     *
     * @returns A Promise for a token that can be used to assert the validity of a request.
     */
    async verify() {
      let action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'verify';
      let forceRefresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      async function retrieveSiteKey(auth) {
        if (!forceRefresh) {
          if (auth.tenantId == null && auth._agentRecaptchaConfig != null) {
            return auth._agentRecaptchaConfig.siteKey;
          }
          if (auth.tenantId != null && auth._tenantRecaptchaConfigs[auth.tenantId] !== undefined) {
            return auth._tenantRecaptchaConfigs[auth.tenantId].siteKey;
          }
        }
        return new Promise(async (resolve, reject) => {
          getRecaptchaConfig(auth, {
            clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */,
            version: "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
          }).then(response => {
            if (response.recaptchaKey === undefined) {
              reject(new Error('recaptcha Enterprise site key undefined'));
            } else {
              const config = new RecaptchaConfig(response);
              if (auth.tenantId == null) {
                auth._agentRecaptchaConfig = config;
              } else {
                auth._tenantRecaptchaConfigs[auth.tenantId] = config;
              }
              return resolve(config.siteKey);
            }
          }).catch(error => {
            reject(error);
          });
        });
      }
      function retrieveRecaptchaToken(siteKey, resolve, reject) {
        const grecaptcha = window.grecaptcha;
        if (isEnterprise(grecaptcha)) {
          grecaptcha.enterprise.ready(() => {
            grecaptcha.enterprise.execute(siteKey, {
              action
            }).then(token => {
              resolve(token);
            }).catch(() => {
              resolve(FAKE_TOKEN);
            });
          });
        } else {
          reject(Error('No reCAPTCHA enterprise script loaded.'));
        }
      }
      return new Promise((resolve, reject) => {
        retrieveSiteKey(this.auth).then(siteKey => {
          if (!forceRefresh && isEnterprise(window.grecaptcha)) {
            retrieveRecaptchaToken(siteKey, resolve, reject);
          } else {
            if (typeof window === 'undefined') {
              reject(new Error('RecaptchaVerifier is only supported in browser'));
              return;
            }
            _loadJS(RECAPTCHA_ENTERPRISE_URL + siteKey).then(() => {
              retrieveRecaptchaToken(siteKey, resolve, reject);
            }).catch(error => {
              reject(error);
            });
          }
        }).catch(error => {
          reject(error);
        });
      });
    }
  }

  /**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class AuthMiddlewareQueue {
    constructor(auth) {
      this.auth = auth;
      this.queue = [];
    }
    pushCallback(callback, onAbort) {
      // The callback could be sync or async. Wrap it into a
      // function that is always async.
      const wrappedCallback = user => new Promise((resolve, reject) => {
        try {
          const result = callback(user);
          // Either resolve with existing promise or wrap a non-promise
          // return value into a promise.
          resolve(result);
        } catch (e) {
          // Sync callback throws.
          reject(e);
        }
      });
      // Attach the onAbort if present
      wrappedCallback.onAbort = onAbort;
      this.queue.push(wrappedCallback);
      const index = this.queue.length - 1;
      return () => {
        // Unsubscribe. Replace with no-op. Do not remove from array, or it will disturb
        // indexing of other elements.
        this.queue[index] = () => Promise.resolve();
      };
    }
    async runMiddleware(nextUser) {
      if (this.auth.currentUser === nextUser) {
        return;
      }
      // While running the middleware, build a temporary stack of onAbort
      // callbacks to call if one middleware callback rejects.
      const onAbortStack = [];
      try {
        for (const beforeStateCallback of this.queue) {
          await beforeStateCallback(nextUser);
          // Only push the onAbort if the callback succeeds
          if (beforeStateCallback.onAbort) {
            onAbortStack.push(beforeStateCallback.onAbort);
          }
        }
      } catch (e) {
        // Run all onAbort, with separate try/catch to ignore any errors and
        // continue
        onAbortStack.reverse();
        for (const onAbort of onAbortStack) {
          try {
            onAbort();
          } catch (_) {
            /* swallow error */
          }
        }
        throw this.auth._errorFactory.create("login-blocked" /* AuthErrorCode.LOGIN_BLOCKED */, {
          originalMessage: e === null || e === void 0 ? void 0 : e.message
        });
      }
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class AuthImpl {
    constructor(app, heartbeatServiceProvider, appCheckServiceProvider, config) {
      this.app = app;
      this.heartbeatServiceProvider = heartbeatServiceProvider;
      this.appCheckServiceProvider = appCheckServiceProvider;
      this.config = config;
      this.currentUser = null;
      this.emulatorConfig = null;
      this.operations = Promise.resolve();
      this.authStateSubscription = new Subscription(this);
      this.idTokenSubscription = new Subscription(this);
      this.beforeStateQueue = new AuthMiddlewareQueue(this);
      this.redirectUser = null;
      this.isProactiveRefreshEnabled = false;
      // Any network calls will set this to true and prevent subsequent emulator
      // initialization
      this._canInitEmulator = true;
      this._isInitialized = false;
      this._deleted = false;
      this._initializationPromise = null;
      this._popupRedirectResolver = null;
      this._errorFactory = _DEFAULT_AUTH_ERROR_FACTORY;
      this._agentRecaptchaConfig = null;
      this._tenantRecaptchaConfigs = {};
      // Tracks the last notified UID for state change listeners to prevent
      // repeated calls to the callbacks. Undefined means it's never been
      // called, whereas null means it's been called with a signed out user
      this.lastNotifiedUid = undefined;
      this.languageCode = null;
      this.tenantId = null;
      this.settings = {
        appVerificationDisabledForTesting: false
      };
      this.frameworks = [];
      this.name = app.name;
      this.clientVersion = config.sdkClientVersion;
    }
    _initializeWithPersistence(persistenceHierarchy, popupRedirectResolver) {
      if (popupRedirectResolver) {
        this._popupRedirectResolver = _getInstance(popupRedirectResolver);
      }
      // Have to check for app deletion throughout initialization (after each
      // promise resolution)
      this._initializationPromise = this.queue(async () => {
        var _a, _b;
        if (this._deleted) {
          return;
        }
        this.persistenceManager = await PersistenceUserManager.create(this, persistenceHierarchy);
        if (this._deleted) {
          return;
        }
        // Initialize the resolver early if necessary (only applicable to web:
        // this will cause the iframe to load immediately in certain cases)
        if ((_a = this._popupRedirectResolver) === null || _a === void 0 ? void 0 : _a._shouldInitProactively) {
          // If this fails, don't halt auth loading
          try {
            await this._popupRedirectResolver._initialize(this);
          } catch (e) {
            /* Ignore the error */
          }
        }
        await this.initializeCurrentUser(popupRedirectResolver);
        this.lastNotifiedUid = ((_b = this.currentUser) === null || _b === void 0 ? void 0 : _b.uid) || null;
        if (this._deleted) {
          return;
        }
        this._isInitialized = true;
      });
      return this._initializationPromise;
    }
    /**
     * If the persistence is changed in another window, the user manager will let us know
     */
    async _onStorageEvent() {
      if (this._deleted) {
        return;
      }
      const user = await this.assertedPersistence.getCurrentUser();
      if (!this.currentUser && !user) {
        // No change, do nothing (was signed out and remained signed out).
        return;
      }
      // If the same user is to be synchronized.
      if (this.currentUser && user && this.currentUser.uid === user.uid) {
        // Data update, simply copy data changes.
        this._currentUser._assign(user);
        // If tokens changed from previous user tokens, this will trigger
        // notifyAuthListeners_.
        await this.currentUser.getIdToken();
        return;
      }
      // Update current Auth state. Either a new login or logout.
      // Skip blocking callbacks, they should not apply to a change in another tab.
      await this._updateCurrentUser(user, /* skipBeforeStateCallbacks */true);
    }
    async initializeCurrentUser(popupRedirectResolver) {
      var _a;
      // First check to see if we have a pending redirect event.
      const previouslyStoredUser = await this.assertedPersistence.getCurrentUser();
      let futureCurrentUser = previouslyStoredUser;
      let needsTocheckMiddleware = false;
      if (popupRedirectResolver && this.config.authDomain) {
        await this.getOrInitRedirectPersistenceManager();
        const redirectUserEventId = (_a = this.redirectUser) === null || _a === void 0 ? void 0 : _a._redirectEventId;
        const storedUserEventId = futureCurrentUser === null || futureCurrentUser === void 0 ? void 0 : futureCurrentUser._redirectEventId;
        const result = await this.tryRedirectSignIn(popupRedirectResolver);
        // If the stored user (i.e. the old "currentUser") has a redirectId that
        // matches the redirect user, then we want to initially sign in with the
        // new user object from result.
        // TODO(samgho): More thoroughly test all of this
        if ((!redirectUserEventId || redirectUserEventId === storedUserEventId) && (result === null || result === void 0 ? void 0 : result.user)) {
          futureCurrentUser = result.user;
          needsTocheckMiddleware = true;
        }
      }
      // If no user in persistence, there is no current user. Set to null.
      if (!futureCurrentUser) {
        return this.directlySetCurrentUser(null);
      }
      if (!futureCurrentUser._redirectEventId) {
        // This isn't a redirect link operation, we can reload and bail.
        // First though, ensure that we check the middleware is happy.
        if (needsTocheckMiddleware) {
          try {
            await this.beforeStateQueue.runMiddleware(futureCurrentUser);
          } catch (e) {
            futureCurrentUser = previouslyStoredUser;
            // We know this is available since the bit is only set when the
            // resolver is available
            this._popupRedirectResolver._overrideRedirectResult(this, () => Promise.reject(e));
          }
        }
        if (futureCurrentUser) {
          return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
        } else {
          return this.directlySetCurrentUser(null);
        }
      }
      _assert(this._popupRedirectResolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
      await this.getOrInitRedirectPersistenceManager();
      // If the redirect user's event ID matches the current user's event ID,
      // DO NOT reload the current user, otherwise they'll be cleared from storage.
      // This is important for the reauthenticateWithRedirect() flow.
      if (this.redirectUser && this.redirectUser._redirectEventId === futureCurrentUser._redirectEventId) {
        return this.directlySetCurrentUser(futureCurrentUser);
      }
      return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
    }
    async tryRedirectSignIn(redirectResolver) {
      // The redirect user needs to be checked (and signed in if available)
      // during auth initialization. All of the normal sign in and link/reauth
      // flows call back into auth and push things onto the promise queue. We
      // need to await the result of the redirect sign in *inside the promise
      // queue*. This presents a problem: we run into deadlock. See:
      //    ┌> [Initialization] ─────┐
      //    ┌> [<other queue tasks>] │
      //    └─ [getRedirectResult] <─┘
      //    where [] are tasks on the queue and arrows denote awaits
      // Initialization will never complete because it's waiting on something
      // that's waiting for initialization to complete!
      //
      // Instead, this method calls getRedirectResult() (stored in
      // _completeRedirectFn) with an optional parameter that instructs all of
      // the underlying auth operations to skip anything that mutates auth state.
      let result = null;
      try {
        // We know this._popupRedirectResolver is set since redirectResolver
        // is passed in. The _completeRedirectFn expects the unwrapped extern.
        result = await this._popupRedirectResolver._completeRedirectFn(this, redirectResolver, true);
      } catch (e) {
        // Swallow any errors here; the code can retrieve them in
        // getRedirectResult().
        await this._setRedirectUser(null);
      }
      return result;
    }
    async reloadAndSetCurrentUserOrClear(user) {
      try {
        await _reloadWithoutSaving(user);
      } catch (e) {
        if ((e === null || e === void 0 ? void 0 : e.code) !== "auth/".concat("network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */)) {
          // Something's wrong with the user's token. Log them out and remove
          // them from storage
          return this.directlySetCurrentUser(null);
        }
      }
      return this.directlySetCurrentUser(user);
    }
    useDeviceLanguage() {
      this.languageCode = _getUserLanguage();
    }
    async _delete() {
      this._deleted = true;
    }
    async updateCurrentUser(userExtern) {
      // The public updateCurrentUser method needs to make a copy of the user,
      // and also check that the project matches
      const user = userExtern ? getModularInstance(userExtern) : null;
      if (user) {
        _assert(user.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */);
      }
      return this._updateCurrentUser(user && user._clone(this));
    }
    async _updateCurrentUser(user) {
      let skipBeforeStateCallbacks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (this._deleted) {
        return;
      }
      if (user) {
        _assert(this.tenantId === user.tenantId, this, "tenant-id-mismatch" /* AuthErrorCode.TENANT_ID_MISMATCH */);
      }
      if (!skipBeforeStateCallbacks) {
        await this.beforeStateQueue.runMiddleware(user);
      }
      return this.queue(async () => {
        await this.directlySetCurrentUser(user);
        this.notifyAuthListeners();
      });
    }
    async signOut() {
      // Run first, to block _setRedirectUser() if any callbacks fail.
      await this.beforeStateQueue.runMiddleware(null);
      // Clear the redirect user when signOut is called
      if (this.redirectPersistenceManager || this._popupRedirectResolver) {
        await this._setRedirectUser(null);
      }
      // Prevent callbacks from being called again in _updateCurrentUser, as
      // they were already called in the first line.
      return this._updateCurrentUser(null, /* skipBeforeStateCallbacks */true);
    }
    setPersistence(persistence) {
      return this.queue(async () => {
        await this.assertedPersistence.setPersistence(_getInstance(persistence));
      });
    }
    async initializeRecaptchaConfig() {
      const response = await getRecaptchaConfig(this, {
        clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */,
        version: "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
      });
      const config = new RecaptchaConfig(response);
      if (this.tenantId == null) {
        this._agentRecaptchaConfig = config;
      } else {
        this._tenantRecaptchaConfigs[this.tenantId] = config;
      }
      if (config.emailPasswordEnabled) {
        const verifier = new RecaptchaEnterpriseVerifier(this);
        void verifier.verify();
      }
    }
    _getRecaptchaConfig() {
      if (this.tenantId == null) {
        return this._agentRecaptchaConfig;
      } else {
        return this._tenantRecaptchaConfigs[this.tenantId];
      }
    }
    _getPersistence() {
      return this.assertedPersistence.persistence.type;
    }
    _updateErrorMap(errorMap) {
      this._errorFactory = new ErrorFactory('auth', 'Firebase', errorMap());
    }
    onAuthStateChanged(nextOrObserver, error, completed) {
      return this.registerStateListener(this.authStateSubscription, nextOrObserver, error, completed);
    }
    beforeAuthStateChanged(callback, onAbort) {
      return this.beforeStateQueue.pushCallback(callback, onAbort);
    }
    onIdTokenChanged(nextOrObserver, error, completed) {
      return this.registerStateListener(this.idTokenSubscription, nextOrObserver, error, completed);
    }
    toJSON() {
      var _a;
      return {
        apiKey: this.config.apiKey,
        authDomain: this.config.authDomain,
        appName: this.name,
        currentUser: (_a = this._currentUser) === null || _a === void 0 ? void 0 : _a.toJSON()
      };
    }
    async _setRedirectUser(user, popupRedirectResolver) {
      const redirectManager = await this.getOrInitRedirectPersistenceManager(popupRedirectResolver);
      return user === null ? redirectManager.removeCurrentUser() : redirectManager.setCurrentUser(user);
    }
    async getOrInitRedirectPersistenceManager(popupRedirectResolver) {
      if (!this.redirectPersistenceManager) {
        const resolver = popupRedirectResolver && _getInstance(popupRedirectResolver) || this._popupRedirectResolver;
        _assert(resolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
        this.redirectPersistenceManager = await PersistenceUserManager.create(this, [_getInstance(resolver._redirectPersistence)], "redirectUser" /* KeyName.REDIRECT_USER */);
        this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
      }
      return this.redirectPersistenceManager;
    }
    async _redirectUserForId(id) {
      var _a, _b;
      // Make sure we've cleared any pending persistence actions if we're not in
      // the initializer
      if (this._isInitialized) {
        await this.queue(async () => {});
      }
      if (((_a = this._currentUser) === null || _a === void 0 ? void 0 : _a._redirectEventId) === id) {
        return this._currentUser;
      }
      if (((_b = this.redirectUser) === null || _b === void 0 ? void 0 : _b._redirectEventId) === id) {
        return this.redirectUser;
      }
      return null;
    }
    async _persistUserIfCurrent(user) {
      if (user === this.currentUser) {
        return this.queue(async () => this.directlySetCurrentUser(user));
      }
    }
    /** Notifies listeners only if the user is current */
    _notifyListenersIfCurrent(user) {
      if (user === this.currentUser) {
        this.notifyAuthListeners();
      }
    }
    _key() {
      return "".concat(this.config.authDomain, ":").concat(this.config.apiKey, ":").concat(this.name);
    }
    _startProactiveRefresh() {
      this.isProactiveRefreshEnabled = true;
      if (this.currentUser) {
        this._currentUser._startProactiveRefresh();
      }
    }
    _stopProactiveRefresh() {
      this.isProactiveRefreshEnabled = false;
      if (this.currentUser) {
        this._currentUser._stopProactiveRefresh();
      }
    }
    /** Returns the current user cast as the internal type */
    get _currentUser() {
      return this.currentUser;
    }
    notifyAuthListeners() {
      var _a, _b;
      if (!this._isInitialized) {
        return;
      }
      this.idTokenSubscription.next(this.currentUser);
      const currentUid = (_b = (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null;
      if (this.lastNotifiedUid !== currentUid) {
        this.lastNotifiedUid = currentUid;
        this.authStateSubscription.next(this.currentUser);
      }
    }
    registerStateListener(subscription, nextOrObserver, error, completed) {
      if (this._deleted) {
        return () => {};
      }
      const cb = typeof nextOrObserver === 'function' ? nextOrObserver : nextOrObserver.next.bind(nextOrObserver);
      const promise = this._isInitialized ? Promise.resolve() : this._initializationPromise;
      _assert(promise, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      // The callback needs to be called asynchronously per the spec.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      promise.then(() => cb(this.currentUser));
      if (typeof nextOrObserver === 'function') {
        return subscription.addObserver(nextOrObserver, error, completed);
      } else {
        return subscription.addObserver(nextOrObserver);
      }
    }
    /**
     * Unprotected (from race conditions) method to set the current user. This
     * should only be called from within a queued callback. This is necessary
     * because the queue shouldn't rely on another queued callback.
     */
    async directlySetCurrentUser(user) {
      if (this.currentUser && this.currentUser !== user) {
        this._currentUser._stopProactiveRefresh();
      }
      if (user && this.isProactiveRefreshEnabled) {
        user._startProactiveRefresh();
      }
      this.currentUser = user;
      if (user) {
        await this.assertedPersistence.setCurrentUser(user);
      } else {
        await this.assertedPersistence.removeCurrentUser();
      }
    }
    queue(action) {
      // In case something errors, the callback still should be called in order
      // to keep the promise chain alive
      this.operations = this.operations.then(action, action);
      return this.operations;
    }
    get assertedPersistence() {
      _assert(this.persistenceManager, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      return this.persistenceManager;
    }
    _logFramework(framework) {
      if (!framework || this.frameworks.includes(framework)) {
        return;
      }
      this.frameworks.push(framework);
      // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
      // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.
      this.frameworks.sort();
      this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks());
    }
    _getFrameworks() {
      return this.frameworks;
    }
    async _getAdditionalHeaders() {
      var _a;
      // Additional headers on every request
      const headers = {
        ["X-Client-Version" /* HttpHeader.X_CLIENT_VERSION */]: this.clientVersion
      };
      if (this.app.options.appId) {
        headers["X-Firebase-gmpid" /* HttpHeader.X_FIREBASE_GMPID */] = this.app.options.appId;
      }
      // If the heartbeat service exists, add the heartbeat string
      const heartbeatsHeader = await ((_a = this.heartbeatServiceProvider.getImmediate({
        optional: true
      })) === null || _a === void 0 ? void 0 : _a.getHeartbeatsHeader());
      if (heartbeatsHeader) {
        headers["X-Firebase-Client" /* HttpHeader.X_FIREBASE_CLIENT */] = heartbeatsHeader;
      }
      // If the App Check service exists, add the App Check token in the headers
      const appCheckToken = await this._getAppCheckToken();
      if (appCheckToken) {
        headers["X-Firebase-AppCheck" /* HttpHeader.X_FIREBASE_APP_CHECK */] = appCheckToken;
      }
      return headers;
    }
    async _getAppCheckToken() {
      var _a;
      const appCheckTokenResult = await ((_a = this.appCheckServiceProvider.getImmediate({
        optional: true
      })) === null || _a === void 0 ? void 0 : _a.getToken());
      if (appCheckTokenResult === null || appCheckTokenResult === void 0 ? void 0 : appCheckTokenResult.error) {
        // Context: appCheck.getToken() will never throw even if an error happened.
        // In the error case, a dummy token will be returned along with an error field describing
        // the error. In general, we shouldn't care about the error condition and just use
        // the token (actual or dummy) to send requests.
        _logWarn("Error while retrieving App Check token: ".concat(appCheckTokenResult.error));
      }
      return appCheckTokenResult === null || appCheckTokenResult === void 0 ? void 0 : appCheckTokenResult.token;
    }
  }
  /**
   * Method to be used to cast down to our private implmentation of Auth.
   * It will also handle unwrapping from the compat type if necessary
   *
   * @param auth Auth object passed in from developer
   */
  function _castAuth(auth) {
    return getModularInstance(auth);
  }
  /** Helper class to wrap subscriber logic */
  class Subscription {
    constructor(auth) {
      this.auth = auth;
      this.observer = null;
      this.addObserver = createSubscribe(observer => this.observer = observer);
    }
    get next() {
      _assert(this.observer, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      return this.observer.next.bind(this.observer);
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Initializes an {@link Auth} instance with fine-grained control over
   * {@link Dependencies}.
   *
   * @remarks
   *
   * This function allows more control over the {@link Auth} instance than
   * {@link getAuth}. `getAuth` uses platform-specific defaults to supply
   * the {@link Dependencies}. In general, `getAuth` is the easiest way to
   * initialize Auth and works for most use cases. Use `initializeAuth` if you
   * need control over which persistence layer is used, or to minimize bundle
   * size if you're not using either `signInWithPopup` or `signInWithRedirect`.
   *
   * For example, if your app only uses anonymous accounts and you only want
   * accounts saved for the current session, initialize `Auth` with:
   *
   * ```js
   * const auth = initializeAuth(app, {
   *   persistence: browserSessionPersistence,
   *   popupRedirectResolver: undefined,
   * });
   * ```
   *
   * @public
   */
  function initializeAuth(app, deps) {
    const provider = _getProvider(app, 'auth');
    if (provider.isInitialized()) {
      const auth = provider.getImmediate();
      const initialOptions = provider.getOptions();
      if (deepEqual(initialOptions, deps !== null && deps !== void 0 ? deps : {})) {
        return auth;
      } else {
        _fail(auth, "already-initialized" /* AuthErrorCode.ALREADY_INITIALIZED */);
      }
    }
    const auth = provider.initialize({
      options: deps
    });
    return auth;
  }
  function _initializeAuthInstance(auth, deps) {
    const persistence = (deps === null || deps === void 0 ? void 0 : deps.persistence) || [];
    const hierarchy = (Array.isArray(persistence) ? persistence : [persistence]).map(_getInstance);
    if (deps === null || deps === void 0 ? void 0 : deps.errorMap) {
      auth._updateErrorMap(deps.errorMap);
    }
    // This promise is intended to float; auth initialization happens in the
    // background, meanwhile the auth object may be used by the app.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    auth._initializeWithPersistence(hierarchy, deps === null || deps === void 0 ? void 0 : deps.popupRedirectResolver);
  }

  /**
   * Changes the {@link Auth} instance to communicate with the Firebase Auth Emulator, instead of production
   * Firebase Auth services.
   *
   * @remarks
   * This must be called synchronously immediately following the first call to
   * {@link initializeAuth}.  Do not use with production credentials as emulator
   * traffic is not encrypted.
   *
   *
   * @example
   * ```javascript
   * connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
   * ```
   *
   * @param auth - The {@link Auth} instance.
   * @param url - The URL at which the emulator is running (eg, 'http://localhost:9099').
   * @param options - Optional. `options.disableWarnings` defaults to `false`. Set it to
   * `true` to disable the warning banner attached to the DOM.
   *
   * @public
   */
  function connectAuthEmulator(auth, url, options) {
    const authInternal = _castAuth(auth);
    _assert(authInternal._canInitEmulator, authInternal, "emulator-config-failed" /* AuthErrorCode.EMULATOR_CONFIG_FAILED */);
    _assert(/^https?:\/\//.test(url), authInternal, "invalid-emulator-scheme" /* AuthErrorCode.INVALID_EMULATOR_SCHEME */);
    const disableWarnings = false;
    const protocol = extractProtocol(url);
    const {
      host,
      port
    } = extractHostAndPort(url);
    const portStr = port === null ? '' : ":".concat(port);
    // Always replace path with "/" (even if input url had no path at all, or had a different one).
    authInternal.config.emulator = {
      url: "".concat(protocol, "//").concat(host).concat(portStr, "/")
    };
    authInternal.settings.appVerificationDisabledForTesting = true;
    authInternal.emulatorConfig = Object.freeze({
      host,
      port,
      protocol: protocol.replace(':', ''),
      options: Object.freeze({
        disableWarnings
      })
    });
    {
      emitEmulatorWarning();
    }
  }
  function extractProtocol(url) {
    const protocolEnd = url.indexOf(':');
    return protocolEnd < 0 ? '' : url.substr(0, protocolEnd + 1);
  }
  function extractHostAndPort(url) {
    const protocol = extractProtocol(url);
    const authority = /(\/\/)?([^?#/]+)/.exec(url.substr(protocol.length)); // Between // and /, ? or #.
    if (!authority) {
      return {
        host: '',
        port: null
      };
    }
    const hostAndPort = authority[2].split('@').pop() || ''; // Strip out "username:password@".
    const bracketedIPv6 = /^(\[[^\]]+\])(:|$)/.exec(hostAndPort);
    if (bracketedIPv6) {
      const host = bracketedIPv6[1];
      return {
        host,
        port: parsePort(hostAndPort.substr(host.length + 1))
      };
    } else {
      const [host, port] = hostAndPort.split(':');
      return {
        host,
        port: parsePort(port)
      };
    }
  }
  function parsePort(portStr) {
    if (!portStr) {
      return null;
    }
    const port = Number(portStr);
    if (isNaN(port)) {
      return null;
    }
    return port;
  }
  function emitEmulatorWarning() {
    function attachBanner() {
      const el = document.createElement('p');
      const sty = el.style;
      el.innerText = 'Running in emulator mode. Do not use with production credentials.';
      sty.position = 'fixed';
      sty.width = '100%';
      sty.backgroundColor = '#ffffff';
      sty.border = '.1em solid #000000';
      sty.color = '#b50000';
      sty.bottom = '0px';
      sty.left = '0px';
      sty.margin = '0px';
      sty.zIndex = '10000';
      sty.textAlign = 'center';
      el.classList.add('firebase-emulator-warning');
      document.body.appendChild(el);
    }
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
      console.info('WARNING: You are using the Auth Emulator,' + ' which is intended for local testing only.  Do not use with' + ' production credentials.');
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', attachBanner);
      } else {
        attachBanner();
      }
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Interface that represents the credentials returned by an {@link AuthProvider}.
   *
   * @remarks
   * Implementations specify the details about each auth provider's credential requirements.
   *
   * @public
   */
  class AuthCredential {
    /** @internal */
    constructor(
    /**
     * The authentication provider ID for the credential.
     *
     * @remarks
     * For example, 'facebook.com', or 'google.com'.
     */
    providerId,
    /**
     * The authentication sign in method for the credential.
     *
     * @remarks
     * For example, {@link SignInMethod}.EMAIL_PASSWORD, or
     * {@link SignInMethod}.EMAIL_LINK. This corresponds to the sign-in method
     * identifier as returned in {@link fetchSignInMethodsForEmail}.
     */
    signInMethod) {
      this.providerId = providerId;
      this.signInMethod = signInMethod;
    }
    /**
     * Returns a JSON-serializable representation of this object.
     *
     * @returns a JSON-serializable representation of this object.
     */
    toJSON() {
      return debugFail('not implemented');
    }
    /** @internal */
    _getIdTokenResponse(_auth) {
      return debugFail('not implemented');
    }
    /** @internal */
    _linkToIdToken(_auth, _idToken) {
      return debugFail('not implemented');
    }
    /** @internal */
    _getReauthenticationResolver(_auth) {
      return debugFail('not implemented');
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function signInWithIdp(auth, request) {
    return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signInWithIdp" /* Endpoint.SIGN_IN_WITH_IDP */, _addTidIfNecessary(auth, request));
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const IDP_REQUEST_URI$1 = 'http://localhost';
  /**
   * Represents the OAuth credentials returned by an {@link OAuthProvider}.
   *
   * @remarks
   * Implementations specify the details about each auth provider's credential requirements.
   *
   * @public
   */
  class OAuthCredential extends AuthCredential {
    constructor() {
      super(...arguments);
      this.pendingToken = null;
    }
    /** @internal */
    static _fromParams(params) {
      const cred = new OAuthCredential(params.providerId, params.signInMethod);
      if (params.idToken || params.accessToken) {
        // OAuth 2 and either ID token or access token.
        if (params.idToken) {
          cred.idToken = params.idToken;
        }
        if (params.accessToken) {
          cred.accessToken = params.accessToken;
        }
        // Add nonce if available and no pendingToken is present.
        if (params.nonce && !params.pendingToken) {
          cred.nonce = params.nonce;
        }
        if (params.pendingToken) {
          cred.pendingToken = params.pendingToken;
        }
      } else if (params.oauthToken && params.oauthTokenSecret) {
        // OAuth 1 and OAuth token with token secret
        cred.accessToken = params.oauthToken;
        cred.secret = params.oauthTokenSecret;
      } else {
        _fail("argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
      }
      return cred;
    }
    /** {@inheritdoc AuthCredential.toJSON}  */
    toJSON() {
      return {
        idToken: this.idToken,
        accessToken: this.accessToken,
        secret: this.secret,
        nonce: this.nonce,
        pendingToken: this.pendingToken,
        providerId: this.providerId,
        signInMethod: this.signInMethod
      };
    }
    /**
     * Static method to deserialize a JSON representation of an object into an
     * {@link  AuthCredential}.
     *
     * @param json - Input can be either Object or the stringified representation of the object.
     * When string is provided, JSON.parse would be called first.
     *
     * @returns If the JSON input does not represent an {@link  AuthCredential}, null is returned.
     */
    static fromJSON(json) {
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      const {
          providerId,
          signInMethod
        } = obj,
        rest = __rest(obj, ["providerId", "signInMethod"]);
      if (!providerId || !signInMethod) {
        return null;
      }
      const cred = new OAuthCredential(providerId, signInMethod);
      cred.idToken = rest.idToken || undefined;
      cred.accessToken = rest.accessToken || undefined;
      cred.secret = rest.secret;
      cred.nonce = rest.nonce;
      cred.pendingToken = rest.pendingToken || null;
      return cred;
    }
    /** @internal */
    _getIdTokenResponse(auth) {
      const request = this.buildRequest();
      return signInWithIdp(auth, request);
    }
    /** @internal */
    _linkToIdToken(auth, idToken) {
      const request = this.buildRequest();
      request.idToken = idToken;
      return signInWithIdp(auth, request);
    }
    /** @internal */
    _getReauthenticationResolver(auth) {
      const request = this.buildRequest();
      request.autoCreate = false;
      return signInWithIdp(auth, request);
    }
    buildRequest() {
      const request = {
        requestUri: IDP_REQUEST_URI$1,
        returnSecureToken: true
      };
      if (this.pendingToken) {
        request.pendingToken = this.pendingToken;
      } else {
        const postBody = {};
        if (this.idToken) {
          postBody['id_token'] = this.idToken;
        }
        if (this.accessToken) {
          postBody['access_token'] = this.accessToken;
        }
        if (this.secret) {
          postBody['oauth_token_secret'] = this.secret;
        }
        postBody['providerId'] = this.providerId;
        if (this.nonce && !this.pendingToken) {
          postBody['nonce'] = this.nonce;
        }
        request.postBody = querystring(postBody);
      }
      return request;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * The base class for all Federated providers (OAuth (including OIDC), SAML).
   *
   * This class is not meant to be instantiated directly.
   *
   * @public
   */
  class FederatedAuthProvider {
    /**
     * Constructor for generic OAuth providers.
     *
     * @param providerId - Provider for which credentials should be generated.
     */
    constructor(providerId) {
      this.providerId = providerId;
      /** @internal */
      this.defaultLanguageCode = null;
      /** @internal */
      this.customParameters = {};
    }
    /**
     * Set the language gode.
     *
     * @param languageCode - language code
     */
    setDefaultLanguage(languageCode) {
      this.defaultLanguageCode = languageCode;
    }
    /**
     * Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in
     * operations.
     *
     * @remarks
     * For a detailed list, check the reserved required OAuth 2.0 parameters such as `client_id`,
     * `redirect_uri`, `scope`, `response_type`, and `state` are not allowed and will be ignored.
     *
     * @param customOAuthParameters - The custom OAuth parameters to pass in the OAuth request.
     */
    setCustomParameters(customOAuthParameters) {
      this.customParameters = customOAuthParameters;
      return this;
    }
    /**
     * Retrieve the current list of {@link CustomParameters}.
     */
    getCustomParameters() {
      return this.customParameters;
    }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Common code to all OAuth providers. This is separate from the
   * {@link OAuthProvider} so that child providers (like
   * {@link GoogleAuthProvider}) don't inherit the `credential` instance method.
   * Instead, they rely on a static `credential` method.
   */
  class BaseOAuthProvider extends FederatedAuthProvider {
    constructor() {
      super(...arguments);
      /** @internal */
      this.scopes = [];
    }
    /**
     * Add an OAuth scope to the credential.
     *
     * @param scope - Provider OAuth scope to add.
     */
    addScope(scope) {
      // If not already added, add scope to list.
      if (!this.scopes.includes(scope)) {
        this.scopes.push(scope);
      }
      return this;
    }
    /**
     * Retrieve the current list of OAuth scopes.
     */
    getScopes() {
      return [...this.scopes];
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.FACEBOOK.
   *
   * @example
   * ```javascript
   * // Sign in using a redirect.
   * const provider = new FacebookAuthProvider();
   * // Start a sign in process for an unauthenticated user.
   * provider.addScope('user_birthday');
   * await signInWithRedirect(auth, provider);
   * // This will trigger a full page redirect away from your app
   *
   * // After returning from the redirect when your app initializes you can obtain the result
   * const result = await getRedirectResult(auth);
   * if (result) {
   *   // This is the signed-in user
   *   const user = result.user;
   *   // This gives you a Facebook Access Token.
   *   const credential = FacebookAuthProvider.credentialFromResult(result);
   *   const token = credential.accessToken;
   * }
   * ```
   *
   * @example
   * ```javascript
   * // Sign in using a popup.
   * const provider = new FacebookAuthProvider();
   * provider.addScope('user_birthday');
   * const result = await signInWithPopup(auth, provider);
   *
   * // The signed-in user info.
   * const user = result.user;
   * // This gives you a Facebook Access Token.
   * const credential = FacebookAuthProvider.credentialFromResult(result);
   * const token = credential.accessToken;
   * ```
   *
   * @public
   */
  class FacebookAuthProvider extends BaseOAuthProvider {
    constructor() {
      super("facebook.com" /* ProviderId.FACEBOOK */);
    }
    /**
     * Creates a credential for Facebook.
     *
     * @example
     * ```javascript
     * // `event` from the Facebook auth.authResponseChange callback.
     * const credential = FacebookAuthProvider.credential(event.authResponse.accessToken);
     * const result = await signInWithCredential(credential);
     * ```
     *
     * @param accessToken - Facebook access token.
     */
    static credential(accessToken) {
      return OAuthCredential._fromParams({
        providerId: FacebookAuthProvider.PROVIDER_ID,
        signInMethod: FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD,
        accessToken
      });
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromResult(userCredential) {
      return FacebookAuthProvider.credentialFromTaggedObject(userCredential);
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
     * thrown during a sign-in, link, or reauthenticate operation.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromError(error) {
      return FacebookAuthProvider.credentialFromTaggedObject(error.customData || {});
    }
    static credentialFromTaggedObject(_ref3) {
      let {
        _tokenResponse: tokenResponse
      } = _ref3;
      if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
        return null;
      }
      if (!tokenResponse.oauthAccessToken) {
        return null;
      }
      try {
        return FacebookAuthProvider.credential(tokenResponse.oauthAccessToken);
      } catch (_a) {
        return null;
      }
    }
  }
  /** Always set to {@link SignInMethod}.FACEBOOK. */
  FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD = "facebook.com" /* SignInMethod.FACEBOOK */;
  /** Always set to {@link ProviderId}.FACEBOOK. */
  FacebookAuthProvider.PROVIDER_ID = "facebook.com" /* ProviderId.FACEBOOK */;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Provider for generating an an {@link OAuthCredential} for {@link ProviderId}.GOOGLE.
   *
   * @example
   * ```javascript
   * // Sign in using a redirect.
   * const provider = new GoogleAuthProvider();
   * // Start a sign in process for an unauthenticated user.
   * provider.addScope('profile');
   * provider.addScope('email');
   * await signInWithRedirect(auth, provider);
   * // This will trigger a full page redirect away from your app
   *
   * // After returning from the redirect when your app initializes you can obtain the result
   * const result = await getRedirectResult(auth);
   * if (result) {
   *   // This is the signed-in user
   *   const user = result.user;
   *   // This gives you a Google Access Token.
   *   const credential = GoogleAuthProvider.credentialFromResult(result);
   *   const token = credential.accessToken;
   * }
   * ```
   *
   * @example
   * ```javascript
   * // Sign in using a popup.
   * const provider = new GoogleAuthProvider();
   * provider.addScope('profile');
   * provider.addScope('email');
   * const result = await signInWithPopup(auth, provider);
   *
   * // The signed-in user info.
   * const user = result.user;
   * // This gives you a Google Access Token.
   * const credential = GoogleAuthProvider.credentialFromResult(result);
   * const token = credential.accessToken;
   * ```
   *
   * @public
   */
  class GoogleAuthProvider extends BaseOAuthProvider {
    constructor() {
      super("google.com" /* ProviderId.GOOGLE */);
      this.addScope('profile');
    }
    /**
     * Creates a credential for Google. At least one of ID token and access token is required.
     *
     * @example
     * ```javascript
     * // \`googleUser\` from the onsuccess Google Sign In callback.
     * const credential = GoogleAuthProvider.credential(googleUser.getAuthResponse().id_token);
     * const result = await signInWithCredential(credential);
     * ```
     *
     * @param idToken - Google ID token.
     * @param accessToken - Google access token.
     */
    static credential(idToken, accessToken) {
      return OAuthCredential._fromParams({
        providerId: GoogleAuthProvider.PROVIDER_ID,
        signInMethod: GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD,
        idToken,
        accessToken
      });
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromResult(userCredential) {
      return GoogleAuthProvider.credentialFromTaggedObject(userCredential);
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
     * thrown during a sign-in, link, or reauthenticate operation.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromError(error) {
      return GoogleAuthProvider.credentialFromTaggedObject(error.customData || {});
    }
    static credentialFromTaggedObject(_ref4) {
      let {
        _tokenResponse: tokenResponse
      } = _ref4;
      if (!tokenResponse) {
        return null;
      }
      const {
        oauthIdToken,
        oauthAccessToken
      } = tokenResponse;
      if (!oauthIdToken && !oauthAccessToken) {
        // This could be an oauth 1 credential or a phone credential
        return null;
      }
      try {
        return GoogleAuthProvider.credential(oauthIdToken, oauthAccessToken);
      } catch (_a) {
        return null;
      }
    }
  }
  /** Always set to {@link SignInMethod}.GOOGLE. */
  GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD = "google.com" /* SignInMethod.GOOGLE */;
  /** Always set to {@link ProviderId}.GOOGLE. */
  GoogleAuthProvider.PROVIDER_ID = "google.com" /* ProviderId.GOOGLE */;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.GITHUB.
   *
   * @remarks
   * GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect directly, or use
   * the {@link signInWithPopup} handler:
   *
   * @example
   * ```javascript
   * // Sign in using a redirect.
   * const provider = new GithubAuthProvider();
   * // Start a sign in process for an unauthenticated user.
   * provider.addScope('repo');
   * await signInWithRedirect(auth, provider);
   * // This will trigger a full page redirect away from your app
   *
   * // After returning from the redirect when your app initializes you can obtain the result
   * const result = await getRedirectResult(auth);
   * if (result) {
   *   // This is the signed-in user
   *   const user = result.user;
   *   // This gives you a Github Access Token.
   *   const credential = GithubAuthProvider.credentialFromResult(result);
   *   const token = credential.accessToken;
   * }
   * ```
   *
   * @example
   * ```javascript
   * // Sign in using a popup.
   * const provider = new GithubAuthProvider();
   * provider.addScope('repo');
   * const result = await signInWithPopup(auth, provider);
   *
   * // The signed-in user info.
   * const user = result.user;
   * // This gives you a Github Access Token.
   * const credential = GithubAuthProvider.credentialFromResult(result);
   * const token = credential.accessToken;
   * ```
   * @public
   */
  class GithubAuthProvider extends BaseOAuthProvider {
    constructor() {
      super("github.com" /* ProviderId.GITHUB */);
    }
    /**
     * Creates a credential for Github.
     *
     * @param accessToken - Github access token.
     */
    static credential(accessToken) {
      return OAuthCredential._fromParams({
        providerId: GithubAuthProvider.PROVIDER_ID,
        signInMethod: GithubAuthProvider.GITHUB_SIGN_IN_METHOD,
        accessToken
      });
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromResult(userCredential) {
      return GithubAuthProvider.credentialFromTaggedObject(userCredential);
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
     * thrown during a sign-in, link, or reauthenticate operation.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromError(error) {
      return GithubAuthProvider.credentialFromTaggedObject(error.customData || {});
    }
    static credentialFromTaggedObject(_ref5) {
      let {
        _tokenResponse: tokenResponse
      } = _ref5;
      if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
        return null;
      }
      if (!tokenResponse.oauthAccessToken) {
        return null;
      }
      try {
        return GithubAuthProvider.credential(tokenResponse.oauthAccessToken);
      } catch (_a) {
        return null;
      }
    }
  }
  /** Always set to {@link SignInMethod}.GITHUB. */
  GithubAuthProvider.GITHUB_SIGN_IN_METHOD = "github.com" /* SignInMethod.GITHUB */;
  /** Always set to {@link ProviderId}.GITHUB. */
  GithubAuthProvider.PROVIDER_ID = "github.com" /* ProviderId.GITHUB */;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.TWITTER.
   *
   * @example
   * ```javascript
   * // Sign in using a redirect.
   * const provider = new TwitterAuthProvider();
   * // Start a sign in process for an unauthenticated user.
   * await signInWithRedirect(auth, provider);
   * // This will trigger a full page redirect away from your app
   *
   * // After returning from the redirect when your app initializes you can obtain the result
   * const result = await getRedirectResult(auth);
   * if (result) {
   *   // This is the signed-in user
   *   const user = result.user;
   *   // This gives you a Twitter Access Token and Secret.
   *   const credential = TwitterAuthProvider.credentialFromResult(result);
   *   const token = credential.accessToken;
   *   const secret = credential.secret;
   * }
   * ```
   *
   * @example
   * ```javascript
   * // Sign in using a popup.
   * const provider = new TwitterAuthProvider();
   * const result = await signInWithPopup(auth, provider);
   *
   * // The signed-in user info.
   * const user = result.user;
   * // This gives you a Twitter Access Token and Secret.
   * const credential = TwitterAuthProvider.credentialFromResult(result);
   * const token = credential.accessToken;
   * const secret = credential.secret;
   * ```
   *
   * @public
   */
  class TwitterAuthProvider extends BaseOAuthProvider {
    constructor() {
      super("twitter.com" /* ProviderId.TWITTER */);
    }
    /**
     * Creates a credential for Twitter.
     *
     * @param token - Twitter access token.
     * @param secret - Twitter secret.
     */
    static credential(token, secret) {
      return OAuthCredential._fromParams({
        providerId: TwitterAuthProvider.PROVIDER_ID,
        signInMethod: TwitterAuthProvider.TWITTER_SIGN_IN_METHOD,
        oauthToken: token,
        oauthTokenSecret: secret
      });
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromResult(userCredential) {
      return TwitterAuthProvider.credentialFromTaggedObject(userCredential);
    }
    /**
     * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
     * thrown during a sign-in, link, or reauthenticate operation.
     *
     * @param userCredential - The user credential.
     */
    static credentialFromError(error) {
      return TwitterAuthProvider.credentialFromTaggedObject(error.customData || {});
    }
    static credentialFromTaggedObject(_ref7) {
      let {
        _tokenResponse: tokenResponse
      } = _ref7;
      if (!tokenResponse) {
        return null;
      }
      const {
        oauthAccessToken,
        oauthTokenSecret
      } = tokenResponse;
      if (!oauthAccessToken || !oauthTokenSecret) {
        return null;
      }
      try {
        return TwitterAuthProvider.credential(oauthAccessToken, oauthTokenSecret);
      } catch (_a) {
        return null;
      }
    }
  }
  /** Always set to {@link SignInMethod}.TWITTER. */
  TwitterAuthProvider.TWITTER_SIGN_IN_METHOD = "twitter.com" /* SignInMethod.TWITTER */;
  /** Always set to {@link ProviderId}.TWITTER. */
  TwitterAuthProvider.PROVIDER_ID = "twitter.com" /* ProviderId.TWITTER */;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class UserCredentialImpl {
    constructor(params) {
      this.user = params.user;
      this.providerId = params.providerId;
      this._tokenResponse = params._tokenResponse;
      this.operationType = params.operationType;
    }
    static async _fromIdTokenResponse(auth, operationType, idTokenResponse) {
      let isAnonymous = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
      const user = await UserImpl._fromIdTokenResponse(auth, idTokenResponse, isAnonymous);
      const providerId = providerIdForResponse(idTokenResponse);
      const userCred = new UserCredentialImpl({
        user,
        providerId,
        _tokenResponse: idTokenResponse,
        operationType
      });
      return userCred;
    }
    static async _forOperation(user, operationType, response) {
      await user._updateTokensIfNecessary(response, /* reload */true);
      const providerId = providerIdForResponse(response);
      return new UserCredentialImpl({
        user,
        providerId,
        _tokenResponse: response,
        operationType
      });
    }
  }
  function providerIdForResponse(response) {
    if (response.providerId) {
      return response.providerId;
    }
    if ('phoneNumber' in response) {
      return "phone" /* ProviderId.PHONE */;
    }
    return null;
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class MultiFactorError extends FirebaseError {
    constructor(auth, error, operationType, user) {
      var _a;
      super(error.code, error.message);
      this.operationType = operationType;
      this.user = user;
      // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
      Object.setPrototypeOf(this, MultiFactorError.prototype);
      this.customData = {
        appName: auth.name,
        tenantId: (_a = auth.tenantId) !== null && _a !== void 0 ? _a : undefined,
        _serverResponse: error.customData._serverResponse,
        operationType
      };
    }
    static _fromErrorAndOperation(auth, error, operationType, user) {
      return new MultiFactorError(auth, error, operationType, user);
    }
  }
  function _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user) {
    const idTokenProvider = operationType === "reauthenticate" /* OperationType.REAUTHENTICATE */ ? credential._getReauthenticationResolver(auth) : credential._getIdTokenResponse(auth);
    return idTokenProvider.catch(error => {
      if (error.code === "auth/".concat("multi-factor-auth-required" /* AuthErrorCode.MFA_REQUIRED */)) {
        throw MultiFactorError._fromErrorAndOperation(auth, error, operationType, user);
      }
      throw error;
    });
  }
  async function _link$1(user, credential) {
    let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const response = await _logoutIfInvalidated(user, credential._linkToIdToken(user.auth, await user.getIdToken()), bypassAuthState);
    return UserCredentialImpl._forOperation(user, "link" /* OperationType.LINK */, response);
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function _reauthenticate(user, credential) {
    let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const {
      auth
    } = user;
    const operationType = "reauthenticate" /* OperationType.REAUTHENTICATE */;
    try {
      const response = await _logoutIfInvalidated(user, _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user), bypassAuthState);
      _assert(response.idToken, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      const parsed = _parseToken(response.idToken);
      _assert(parsed, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      const {
        sub: localId
      } = parsed;
      _assert(user.uid === localId, auth, "user-mismatch" /* AuthErrorCode.USER_MISMATCH */);
      return UserCredentialImpl._forOperation(user, operationType, response);
    } catch (e) {
      // Convert user deleted error into user mismatch
      if ((e === null || e === void 0 ? void 0 : e.code) === "auth/".concat("user-not-found" /* AuthErrorCode.USER_DELETED */)) {
        _fail(auth, "user-mismatch" /* AuthErrorCode.USER_MISMATCH */);
      }
      throw e;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function _signInWithCredential(auth, credential) {
    let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const operationType = "signIn" /* OperationType.SIGN_IN */;
    const response = await _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential);
    const userCredential = await UserCredentialImpl._fromIdTokenResponse(auth, operationType, response);
    if (!bypassAuthState) {
      await auth._updateCurrentUser(userCredential.user);
    }
    return userCredential;
  }
  /**
   * Adds an observer for changes to the signed-in user's ID token.
   *
   * @remarks
   * This includes sign-in, sign-out, and token refresh events.
   * This will not be triggered automatically upon ID token expiration. Use {@link User.getIdToken} to refresh the ID token.
   *
   * @param auth - The {@link Auth} instance.
   * @param nextOrObserver - callback triggered on change.
   * @param error - Deprecated. This callback is never triggered. Errors
   * on signing in/out can be caught in promises returned from
   * sign-in/sign-out functions.
   * @param completed - Deprecated. This callback is never triggered.
   *
   * @public
   */
  function onIdTokenChanged(auth, nextOrObserver, error, completed) {
    return getModularInstance(auth).onIdTokenChanged(nextOrObserver, error, completed);
  }
  /**
   * Adds a blocking callback that runs before an auth state change
   * sets a new user.
   *
   * @param auth - The {@link Auth} instance.
   * @param callback - callback triggered before new user value is set.
   *   If this throws, it blocks the user from being set.
   * @param onAbort - callback triggered if a later `beforeAuthStateChanged()`
   *   callback throws, allowing you to undo any side effects.
   */
  function beforeAuthStateChanged(auth, callback, onAbort) {
    return getModularInstance(auth).beforeAuthStateChanged(callback, onAbort);
  }
  /**
   * Adds an observer for changes to the user's sign-in state.
   *
   * @remarks
   * To keep the old behavior, see {@link onIdTokenChanged}.
   *
   * @param auth - The {@link Auth} instance.
   * @param nextOrObserver - callback triggered on change.
   * @param error - Deprecated. This callback is never triggered. Errors
   * on signing in/out can be caught in promises returned from
   * sign-in/sign-out functions.
   * @param completed - Deprecated. This callback is never triggered.
   *
   * @public
   */
  function onAuthStateChanged(auth, nextOrObserver, error, completed) {
    return getModularInstance(auth).onAuthStateChanged(nextOrObserver, error, completed);
  }
  const STORAGE_AVAILABLE_KEY = '__sak';

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  // There are two different browser persistence types: local and session.
  // Both have the same implementation but use a different underlying storage
  // object.
  class BrowserPersistenceClass {
    constructor(storageRetriever, type) {
      this.storageRetriever = storageRetriever;
      this.type = type;
    }
    _isAvailable() {
      try {
        if (!this.storage) {
          return Promise.resolve(false);
        }
        this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
        this.storage.removeItem(STORAGE_AVAILABLE_KEY);
        return Promise.resolve(true);
      } catch (_a) {
        return Promise.resolve(false);
      }
    }
    _set(key, value) {
      this.storage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    }
    _get(key) {
      const json = this.storage.getItem(key);
      return Promise.resolve(json ? JSON.parse(json) : null);
    }
    _remove(key) {
      this.storage.removeItem(key);
      return Promise.resolve();
    }
    get storage() {
      return this.storageRetriever();
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _iframeCannotSyncWebStorage() {
    const ua = getUA();
    return _isSafari(ua) || _isIOS(ua);
  }
  // The polling period in case events are not supported
  const _POLLING_INTERVAL_MS$1 = 1000;
  // The IE 10 localStorage cross tab synchronization delay in milliseconds
  const IE10_LOCAL_STORAGE_SYNC_DELAY = 10;
  class BrowserLocalPersistence extends BrowserPersistenceClass {
    constructor() {
      super(() => window.localStorage, "LOCAL" /* PersistenceType.LOCAL */);
      this.boundEventHandler = (event, poll) => this.onStorageEvent(event, poll);
      this.listeners = {};
      this.localCache = {};
      // setTimeout return value is platform specific
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pollTimer = null;
      // Safari or iOS browser and embedded in an iframe.
      this.safariLocalStorageNotSynced = _iframeCannotSyncWebStorage() && _isIframe();
      // Whether to use polling instead of depending on window events
      this.fallbackToPolling = _isMobileBrowser();
      this._shouldAllowMigration = true;
    }
    forAllChangedKeys(cb) {
      // Check all keys with listeners on them.
      for (const key of Object.keys(this.listeners)) {
        // Get value from localStorage.
        const newValue = this.storage.getItem(key);
        const oldValue = this.localCache[key];
        // If local map value does not match, trigger listener with storage event.
        // Differentiate this simulated event from the real storage event.
        if (newValue !== oldValue) {
          cb(key, oldValue, newValue);
        }
      }
    }
    onStorageEvent(event) {
      let poll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      // Key would be null in some situations, like when localStorage is cleared
      if (!event.key) {
        this.forAllChangedKeys((key, _oldValue, newValue) => {
          this.notifyListeners(key, newValue);
        });
        return;
      }
      const key = event.key;
      // Check the mechanism how this event was detected.
      // The first event will dictate the mechanism to be used.
      if (poll) {
        // Environment detects storage changes via polling.
        // Remove storage event listener to prevent possible event duplication.
        this.detachListener();
      } else {
        // Environment detects storage changes via storage event listener.
        // Remove polling listener to prevent possible event duplication.
        this.stopPolling();
      }
      // Safari embedded iframe. Storage event will trigger with the delta
      // changes but no changes will be applied to the iframe localStorage.
      if (this.safariLocalStorageNotSynced) {
        // Get current iframe page value.
        const storedValue = this.storage.getItem(key);
        // Value not synchronized, synchronize manually.
        if (event.newValue !== storedValue) {
          if (event.newValue !== null) {
            // Value changed from current value.
            this.storage.setItem(key, event.newValue);
          } else {
            // Current value deleted.
            this.storage.removeItem(key);
          }
        } else if (this.localCache[key] === event.newValue && !poll) {
          // Already detected and processed, do not trigger listeners again.
          return;
        }
      }
      const triggerListeners = () => {
        // Keep local map up to date in case storage event is triggered before
        // poll.
        const storedValue = this.storage.getItem(key);
        if (!poll && this.localCache[key] === storedValue) {
          // Real storage event which has already been detected, do nothing.
          // This seems to trigger in some IE browsers for some reason.
          return;
        }
        this.notifyListeners(key, storedValue);
      };
      const storedValue = this.storage.getItem(key);
      if (_isIE10() && storedValue !== event.newValue && event.newValue !== event.oldValue) {
        // IE 10 has this weird bug where a storage event would trigger with the
        // correct key, oldValue and newValue but localStorage.getItem(key) does
        // not yield the updated value until a few milliseconds. This ensures
        // this recovers from that situation.
        setTimeout(triggerListeners, IE10_LOCAL_STORAGE_SYNC_DELAY);
      } else {
        triggerListeners();
      }
    }
    notifyListeners(key, value) {
      this.localCache[key] = value;
      const listeners = this.listeners[key];
      if (listeners) {
        for (const listener of Array.from(listeners)) {
          listener(value ? JSON.parse(value) : value);
        }
      }
    }
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => {
        this.forAllChangedKeys((key, oldValue, newValue) => {
          this.onStorageEvent(new StorageEvent('storage', {
            key,
            oldValue,
            newValue
          }), /* poll */true);
        });
      }, _POLLING_INTERVAL_MS$1);
    }
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }
    attachListener() {
      window.addEventListener('storage', this.boundEventHandler);
    }
    detachListener() {
      window.removeEventListener('storage', this.boundEventHandler);
    }
    _addListener(key, listener) {
      if (Object.keys(this.listeners).length === 0) {
        // Whether browser can detect storage event when it had already been pushed to the background.
        // This may happen in some mobile browsers. A localStorage change in the foreground window
        // will not be detected in the background window via the storage event.
        // This was detected in iOS 7.x mobile browsers
        if (this.fallbackToPolling) {
          this.startPolling();
        } else {
          this.attachListener();
        }
      }
      if (!this.listeners[key]) {
        this.listeners[key] = new Set();
        // Populate the cache to avoid spuriously triggering on first poll.
        this.localCache[key] = this.storage.getItem(key);
      }
      this.listeners[key].add(listener);
    }
    _removeListener(key, listener) {
      if (this.listeners[key]) {
        this.listeners[key].delete(listener);
        if (this.listeners[key].size === 0) {
          delete this.listeners[key];
        }
      }
      if (Object.keys(this.listeners).length === 0) {
        this.detachListener();
        this.stopPolling();
      }
    }
    // Update local cache on base operations:
    async _set(key, value) {
      await super._set(key, value);
      this.localCache[key] = JSON.stringify(value);
    }
    async _get(key) {
      const value = await super._get(key);
      this.localCache[key] = JSON.stringify(value);
      return value;
    }
    async _remove(key) {
      await super._remove(key);
      delete this.localCache[key];
    }
  }
  BrowserLocalPersistence.type = 'LOCAL';
  /**
   * An implementation of {@link Persistence} of type `LOCAL` using `localStorage`
   * for the underlying storage.
   *
   * @public
   */
  const browserLocalPersistence = BrowserLocalPersistence;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class BrowserSessionPersistence extends BrowserPersistenceClass {
    constructor() {
      super(() => window.sessionStorage, "SESSION" /* PersistenceType.SESSION */);
    }
    _addListener(_key, _listener) {
      // Listeners are not supported for session storage since it cannot be shared across windows
      return;
    }
    _removeListener(_key, _listener) {
      // Listeners are not supported for session storage since it cannot be shared across windows
      return;
    }
  }
  BrowserSessionPersistence.type = 'SESSION';
  /**
   * An implementation of {@link Persistence} of `SESSION` using `sessionStorage`
   * for the underlying storage.
   *
   * @public
   */
  const browserSessionPersistence = BrowserSessionPersistence;

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Shim for Promise.allSettled, note the slightly different format of `fulfilled` vs `status`.
   *
   * @param promises - Array of promises to wait on.
   */
  function _allSettled(promises) {
    return Promise.all(promises.map(async promise => {
      try {
        const value = await promise;
        return {
          fulfilled: true,
          value
        };
      } catch (reason) {
        return {
          fulfilled: false,
          reason
        };
      }
    }));
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Interface class for receiving messages.
   *
   */
  class Receiver {
    constructor(eventTarget) {
      this.eventTarget = eventTarget;
      this.handlersMap = {};
      this.boundEventHandler = this.handleEvent.bind(this);
    }
    /**
     * Obtain an instance of a Receiver for a given event target, if none exists it will be created.
     *
     * @param eventTarget - An event target (such as window or self) through which the underlying
     * messages will be received.
     */
    static _getInstance(eventTarget) {
      // The results are stored in an array since objects can't be keys for other
      // objects. In addition, setting a unique property on an event target as a
      // hash map key may not be allowed due to CORS restrictions.
      const existingInstance = this.receivers.find(receiver => receiver.isListeningto(eventTarget));
      if (existingInstance) {
        return existingInstance;
      }
      const newInstance = new Receiver(eventTarget);
      this.receivers.push(newInstance);
      return newInstance;
    }
    isListeningto(eventTarget) {
      return this.eventTarget === eventTarget;
    }
    /**
     * Fans out a MessageEvent to the appropriate listeners.
     *
     * @remarks
     * Sends an {@link Status.ACK} upon receipt and a {@link Status.DONE} once all handlers have
     * finished processing.
     *
     * @param event - The MessageEvent.
     *
     */
    async handleEvent(event) {
      const messageEvent = event;
      const {
        eventId,
        eventType,
        data
      } = messageEvent.data;
      const handlers = this.handlersMap[eventType];
      if (!(handlers === null || handlers === void 0 ? void 0 : handlers.size)) {
        return;
      }
      messageEvent.ports[0].postMessage({
        status: "ack" /* _Status.ACK */,
        eventId,
        eventType
      });
      const promises = Array.from(handlers).map(async handler => handler(messageEvent.origin, data));
      const response = await _allSettled(promises);
      messageEvent.ports[0].postMessage({
        status: "done" /* _Status.DONE */,
        eventId,
        eventType,
        response
      });
    }
    /**
     * Subscribe an event handler for a particular event.
     *
     * @param eventType - Event name to subscribe to.
     * @param eventHandler - The event handler which should receive the events.
     *
     */
    _subscribe(eventType, eventHandler) {
      if (Object.keys(this.handlersMap).length === 0) {
        this.eventTarget.addEventListener('message', this.boundEventHandler);
      }
      if (!this.handlersMap[eventType]) {
        this.handlersMap[eventType] = new Set();
      }
      this.handlersMap[eventType].add(eventHandler);
    }
    /**
     * Unsubscribe an event handler from a particular event.
     *
     * @param eventType - Event name to unsubscribe from.
     * @param eventHandler - Optinoal event handler, if none provided, unsubscribe all handlers on this event.
     *
     */
    _unsubscribe(eventType, eventHandler) {
      if (this.handlersMap[eventType] && eventHandler) {
        this.handlersMap[eventType].delete(eventHandler);
      }
      if (!eventHandler || this.handlersMap[eventType].size === 0) {
        delete this.handlersMap[eventType];
      }
      if (Object.keys(this.handlersMap).length === 0) {
        this.eventTarget.removeEventListener('message', this.boundEventHandler);
      }
    }
  }
  Receiver.receivers = [];

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _generateEventId() {
    let prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let digits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    let random = '';
    for (let i = 0; i < digits; i++) {
      random += Math.floor(Math.random() * 10);
    }
    return prefix + random;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Interface for sending messages and waiting for a completion response.
   *
   */
  class Sender {
    constructor(target) {
      this.target = target;
      this.handlers = new Set();
    }
    /**
     * Unsubscribe the handler and remove it from our tracking Set.
     *
     * @param handler - The handler to unsubscribe.
     */
    removeMessageHandler(handler) {
      if (handler.messageChannel) {
        handler.messageChannel.port1.removeEventListener('message', handler.onMessage);
        handler.messageChannel.port1.close();
      }
      this.handlers.delete(handler);
    }
    /**
     * Send a message to the Receiver located at {@link target}.
     *
     * @remarks
     * We'll first wait a bit for an ACK , if we get one we will wait significantly longer until the
     * receiver has had a chance to fully process the event.
     *
     * @param eventType - Type of event to send.
     * @param data - The payload of the event.
     * @param timeout - Timeout for waiting on an ACK from the receiver.
     *
     * @returns An array of settled promises from all the handlers that were listening on the receiver.
     */
    async _send(eventType, data) {
      let timeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 50;
      const messageChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
      if (!messageChannel) {
        throw new Error("connection_unavailable" /* _MessageError.CONNECTION_UNAVAILABLE */);
      }
      // Node timers and browser timers return fundamentally different types.
      // We don't actually care what the value is but TS won't accept unknown and
      // we can't cast properly in both environments.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let completionTimer;
      let handler;
      return new Promise((resolve, reject) => {
        const eventId = _generateEventId('', 20);
        messageChannel.port1.start();
        const ackTimer = setTimeout(() => {
          reject(new Error("unsupported_event" /* _MessageError.UNSUPPORTED_EVENT */));
        }, timeout);
        handler = {
          messageChannel,
          onMessage(event) {
            const messageEvent = event;
            if (messageEvent.data.eventId !== eventId) {
              return;
            }
            switch (messageEvent.data.status) {
              case "ack" /* _Status.ACK */:
                // The receiver should ACK first.
                clearTimeout(ackTimer);
                completionTimer = setTimeout(() => {
                  reject(new Error("timeout" /* _MessageError.TIMEOUT */));
                }, 3000 /* _TimeoutDuration.COMPLETION */);
                break;
              case "done" /* _Status.DONE */:
                // Once the receiver's handlers are finished we will get the results.
                clearTimeout(completionTimer);
                resolve(messageEvent.data.response);
                break;
              default:
                clearTimeout(ackTimer);
                clearTimeout(completionTimer);
                reject(new Error("invalid_response" /* _MessageError.INVALID_RESPONSE */));
                break;
            }
          }
        };
        this.handlers.add(handler);
        messageChannel.port1.addEventListener('message', handler.onMessage);
        this.target.postMessage({
          eventType,
          eventId,
          data
        }, [messageChannel.port2]);
      }).finally(() => {
        if (handler) {
          this.removeMessageHandler(handler);
        }
      });
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Lazy accessor for window, since the compat layer won't tree shake this out,
   * we need to make sure not to mess with window unless we have to
   */
  function _window() {
    return window;
  }
  function _setWindowLocation(url) {
    _window().location.href = url;
  }

  /**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function _isWorker() {
    return typeof _window()['WorkerGlobalScope'] !== 'undefined' && typeof _window()['importScripts'] === 'function';
  }
  async function _getActiveServiceWorker() {
    if (!(navigator === null || navigator === void 0 ? void 0 : navigator.serviceWorker)) {
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      return registration.active;
    } catch (_a) {
      return null;
    }
  }
  function _getServiceWorkerController() {
    var _a;
    return ((_a = navigator === null || navigator === void 0 ? void 0 : navigator.serviceWorker) === null || _a === void 0 ? void 0 : _a.controller) || null;
  }
  function _getWorkerGlobalScope() {
    return _isWorker() ? self : null;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const DB_NAME = 'firebaseLocalStorageDb';
  const DB_VERSION = 1;
  const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
  const DB_DATA_KEYPATH = 'fbase_key';
  /**
   * Promise wrapper for IDBRequest
   *
   * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
   *
   */
  class DBPromise {
    constructor(request) {
      this.request = request;
    }
    toPromise() {
      return new Promise((resolve, reject) => {
        this.request.addEventListener('success', () => {
          resolve(this.request.result);
        });
        this.request.addEventListener('error', () => {
          reject(this.request.error);
        });
      });
    }
  }
  function getObjectStore(db, isReadWrite) {
    return db.transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly').objectStore(DB_OBJECTSTORE_NAME);
  }
  function _deleteDatabase() {
    const request = indexedDB.deleteDatabase(DB_NAME);
    return new DBPromise(request).toPromise();
  }
  function _openDatabase() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    return new Promise((resolve, reject) => {
      request.addEventListener('error', () => {
        reject(request.error);
      });
      request.addEventListener('upgradeneeded', () => {
        const db = request.result;
        try {
          db.createObjectStore(DB_OBJECTSTORE_NAME, {
            keyPath: DB_DATA_KEYPATH
          });
        } catch (e) {
          reject(e);
        }
      });
      request.addEventListener('success', async () => {
        const db = request.result;
        // Strange bug that occurs in Firefox when multiple tabs are opened at the
        // same time. The only way to recover seems to be deleting the database
        // and re-initializing it.
        // https://github.com/firebase/firebase-js-sdk/issues/634
        if (!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
          // Need to close the database or else you get a `blocked` event
          db.close();
          await _deleteDatabase();
          resolve(await _openDatabase());
        } else {
          resolve(db);
        }
      });
    });
  }
  async function _putObject(db, key, value) {
    const request = getObjectStore(db, true).put({
      [DB_DATA_KEYPATH]: key,
      value
    });
    return new DBPromise(request).toPromise();
  }
  async function getObject(db, key) {
    const request = getObjectStore(db, false).get(key);
    const data = await new DBPromise(request).toPromise();
    return data === undefined ? null : data.value;
  }
  function _deleteObject(db, key) {
    const request = getObjectStore(db, true).delete(key);
    return new DBPromise(request).toPromise();
  }
  const _POLLING_INTERVAL_MS = 800;
  const _TRANSACTION_RETRY_COUNT = 3;
  class IndexedDBLocalPersistence {
    constructor() {
      this.type = "LOCAL" /* PersistenceType.LOCAL */;
      this._shouldAllowMigration = true;
      this.listeners = {};
      this.localCache = {};
      // setTimeout return value is platform specific
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pollTimer = null;
      this.pendingWrites = 0;
      this.receiver = null;
      this.sender = null;
      this.serviceWorkerReceiverAvailable = false;
      this.activeServiceWorker = null;
      // Fire & forget the service worker registration as it may never resolve
      this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then(() => {}, () => {});
    }
    async _openDb() {
      if (this.db) {
        return this.db;
      }
      this.db = await _openDatabase();
      return this.db;
    }
    async _withRetries(op) {
      let numAttempts = 0;
      while (true) {
        try {
          const db = await this._openDb();
          return await op(db);
        } catch (e) {
          if (numAttempts++ > _TRANSACTION_RETRY_COUNT) {
            throw e;
          }
          if (this.db) {
            this.db.close();
            this.db = undefined;
          }
          // TODO: consider adding exponential backoff
        }
      }
    }
    /**
     * IndexedDB events do not propagate from the main window to the worker context.  We rely on a
     * postMessage interface to send these events to the worker ourselves.
     */
    async initializeServiceWorkerMessaging() {
      return _isWorker() ? this.initializeReceiver() : this.initializeSender();
    }
    /**
     * As the worker we should listen to events from the main window.
     */
    async initializeReceiver() {
      this.receiver = Receiver._getInstance(_getWorkerGlobalScope());
      // Refresh from persistence if we receive a KeyChanged message.
      this.receiver._subscribe("keyChanged" /* _EventType.KEY_CHANGED */, async (_origin, data) => {
        const keys = await this._poll();
        return {
          keyProcessed: keys.includes(data.key)
        };
      });
      // Let the sender know that we are listening so they give us more timeout.
      this.receiver._subscribe("ping" /* _EventType.PING */, async (_origin, _data) => {
        return ["keyChanged" /* _EventType.KEY_CHANGED */];
      });
    }
    /**
     * As the main window, we should let the worker know when keys change (set and remove).
     *
     * @remarks
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready | ServiceWorkerContainer.ready}
     * may not resolve.
     */
    async initializeSender() {
      var _a, _b;
      // Check to see if there's an active service worker.
      this.activeServiceWorker = await _getActiveServiceWorker();
      if (!this.activeServiceWorker) {
        return;
      }
      this.sender = new Sender(this.activeServiceWorker);
      // Ping the service worker to check what events they can handle.
      const results = await this.sender._send("ping" /* _EventType.PING */, {}, 800 /* _TimeoutDuration.LONG_ACK */);
      if (!results) {
        return;
      }
      if (((_a = results[0]) === null || _a === void 0 ? void 0 : _a.fulfilled) && ((_b = results[0]) === null || _b === void 0 ? void 0 : _b.value.includes("keyChanged" /* _EventType.KEY_CHANGED */))) {
        this.serviceWorkerReceiverAvailable = true;
      }
    }
    /**
     * Let the worker know about a changed key, the exact key doesn't technically matter since the
     * worker will just trigger a full sync anyway.
     *
     * @remarks
     * For now, we only support one service worker per page.
     *
     * @param key - Storage key which changed.
     */
    async notifyServiceWorker(key) {
      if (!this.sender || !this.activeServiceWorker || _getServiceWorkerController() !== this.activeServiceWorker) {
        return;
      }
      try {
        await this.sender._send("keyChanged" /* _EventType.KEY_CHANGED */, {
          key
        },
        // Use long timeout if receiver has previously responded to a ping from us.
        this.serviceWorkerReceiverAvailable ? 800 /* _TimeoutDuration.LONG_ACK */ : 50 /* _TimeoutDuration.ACK */);
      } catch (_a) {
        // This is a best effort approach. Ignore errors.
      }
    }
    async _isAvailable() {
      try {
        if (!indexedDB) {
          return false;
        }
        const db = await _openDatabase();
        await _putObject(db, STORAGE_AVAILABLE_KEY, '1');
        await _deleteObject(db, STORAGE_AVAILABLE_KEY);
        return true;
      } catch (_a) {}
      return false;
    }
    async _withPendingWrite(write) {
      this.pendingWrites++;
      try {
        await write();
      } finally {
        this.pendingWrites--;
      }
    }
    async _set(key, value) {
      return this._withPendingWrite(async () => {
        await this._withRetries(db => _putObject(db, key, value));
        this.localCache[key] = value;
        return this.notifyServiceWorker(key);
      });
    }
    async _get(key) {
      const obj = await this._withRetries(db => getObject(db, key));
      this.localCache[key] = obj;
      return obj;
    }
    async _remove(key) {
      return this._withPendingWrite(async () => {
        await this._withRetries(db => _deleteObject(db, key));
        delete this.localCache[key];
        return this.notifyServiceWorker(key);
      });
    }
    async _poll() {
      // TODO: check if we need to fallback if getAll is not supported
      const result = await this._withRetries(db => {
        const getAllRequest = getObjectStore(db, false).getAll();
        return new DBPromise(getAllRequest).toPromise();
      });
      if (!result) {
        return [];
      }
      // If we have pending writes in progress abort, we'll get picked up on the next poll
      if (this.pendingWrites !== 0) {
        return [];
      }
      const keys = [];
      const keysInResult = new Set();
      for (const {
        fbase_key: key,
        value
      } of result) {
        keysInResult.add(key);
        if (JSON.stringify(this.localCache[key]) !== JSON.stringify(value)) {
          this.notifyListeners(key, value);
          keys.push(key);
        }
      }
      for (const localKey of Object.keys(this.localCache)) {
        if (this.localCache[localKey] && !keysInResult.has(localKey)) {
          // Deleted
          this.notifyListeners(localKey, null);
          keys.push(localKey);
        }
      }
      return keys;
    }
    notifyListeners(key, newValue) {
      this.localCache[key] = newValue;
      const listeners = this.listeners[key];
      if (listeners) {
        for (const listener of Array.from(listeners)) {
          listener(newValue);
        }
      }
    }
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(async () => this._poll(), _POLLING_INTERVAL_MS);
    }
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }
    _addListener(key, listener) {
      if (Object.keys(this.listeners).length === 0) {
        this.startPolling();
      }
      if (!this.listeners[key]) {
        this.listeners[key] = new Set();
        // Populate the cache to avoid spuriously triggering on first poll.
        void this._get(key); // This can happen in the background async and we can return immediately.
      }
      this.listeners[key].add(listener);
    }
    _removeListener(key, listener) {
      if (this.listeners[key]) {
        this.listeners[key].delete(listener);
        if (this.listeners[key].size === 0) {
          delete this.listeners[key];
        }
      }
      if (Object.keys(this.listeners).length === 0) {
        this.stopPolling();
      }
    }
  }
  IndexedDBLocalPersistence.type = 'LOCAL';
  /**
   * An implementation of {@link Persistence} of type `LOCAL` using `indexedDB`
   * for the underlying storage.
   *
   * @public
   */
  const indexedDBLocalPersistence = IndexedDBLocalPersistence;
  new Delay(30000, 60000);

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Chooses a popup/redirect resolver to use. This prefers the override (which
   * is directly passed in), and falls back to the property set on the auth
   * object. If neither are available, this function errors w/ an argument error.
   */
  function _withDefaultResolver(auth, resolverOverride) {
    if (resolverOverride) {
      return _getInstance(resolverOverride);
    }
    _assert(auth._popupRedirectResolver, auth, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
    return auth._popupRedirectResolver;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class IdpCredential extends AuthCredential {
    constructor(params) {
      super("custom" /* ProviderId.CUSTOM */, "custom" /* ProviderId.CUSTOM */);
      this.params = params;
    }
    _getIdTokenResponse(auth) {
      return signInWithIdp(auth, this._buildIdpRequest());
    }
    _linkToIdToken(auth, idToken) {
      return signInWithIdp(auth, this._buildIdpRequest(idToken));
    }
    _getReauthenticationResolver(auth) {
      return signInWithIdp(auth, this._buildIdpRequest());
    }
    _buildIdpRequest(idToken) {
      const request = {
        requestUri: this.params.requestUri,
        sessionId: this.params.sessionId,
        postBody: this.params.postBody,
        tenantId: this.params.tenantId,
        pendingToken: this.params.pendingToken,
        returnSecureToken: true,
        returnIdpCredential: true
      };
      if (idToken) {
        request.idToken = idToken;
      }
      return request;
    }
  }
  function _signIn(params) {
    return _signInWithCredential(params.auth, new IdpCredential(params), params.bypassAuthState);
  }
  function _reauth(params) {
    const {
      auth,
      user
    } = params;
    _assert(user, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    return _reauthenticate(user, new IdpCredential(params), params.bypassAuthState);
  }
  async function _link(params) {
    const {
      auth,
      user
    } = params;
    _assert(user, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    return _link$1(user, new IdpCredential(params), params.bypassAuthState);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Popup event manager. Handles the popup's entire lifecycle; listens to auth
   * events
   */
  class AbstractPopupRedirectOperation {
    constructor(auth, filter, resolver, user) {
      let bypassAuthState = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
      this.auth = auth;
      this.resolver = resolver;
      this.user = user;
      this.bypassAuthState = bypassAuthState;
      this.pendingPromise = null;
      this.eventManager = null;
      this.filter = Array.isArray(filter) ? filter : [filter];
    }
    execute() {
      return new Promise(async (resolve, reject) => {
        this.pendingPromise = {
          resolve,
          reject
        };
        try {
          this.eventManager = await this.resolver._initialize(this.auth);
          await this.onExecution();
          this.eventManager.registerConsumer(this);
        } catch (e) {
          this.reject(e);
        }
      });
    }
    async onAuthEvent(event) {
      const {
        urlResponse,
        sessionId,
        postBody,
        tenantId,
        error,
        type
      } = event;
      if (error) {
        this.reject(error);
        return;
      }
      const params = {
        auth: this.auth,
        requestUri: urlResponse,
        sessionId: sessionId,
        tenantId: tenantId || undefined,
        postBody: postBody || undefined,
        user: this.user,
        bypassAuthState: this.bypassAuthState
      };
      try {
        this.resolve(await this.getIdpTask(type)(params));
      } catch (e) {
        this.reject(e);
      }
    }
    onError(error) {
      this.reject(error);
    }
    getIdpTask(type) {
      switch (type) {
        case "signInViaPopup" /* AuthEventType.SIGN_IN_VIA_POPUP */:
        case "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */:
          return _signIn;
        case "linkViaPopup" /* AuthEventType.LINK_VIA_POPUP */:
        case "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */:
          return _link;
        case "reauthViaPopup" /* AuthEventType.REAUTH_VIA_POPUP */:
        case "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */:
          return _reauth;
        default:
          _fail(this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      }
    }
    resolve(cred) {
      debugAssert(this.pendingPromise, 'Pending promise was never set');
      this.pendingPromise.resolve(cred);
      this.unregisterAndCleanUp();
    }
    reject(error) {
      debugAssert(this.pendingPromise, 'Pending promise was never set');
      this.pendingPromise.reject(error);
      this.unregisterAndCleanUp();
    }
    unregisterAndCleanUp() {
      if (this.eventManager) {
        this.eventManager.unregisterConsumer(this);
      }
      this.pendingPromise = null;
      this.cleanUp();
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);
  /**
   * Popup event manager. Handles the popup's entire lifecycle; listens to auth
   * events
   *
   */
  class PopupOperation extends AbstractPopupRedirectOperation {
    constructor(auth, filter, provider, resolver, user) {
      super(auth, filter, resolver, user);
      this.provider = provider;
      this.authWindow = null;
      this.pollId = null;
      if (PopupOperation.currentPopupAction) {
        PopupOperation.currentPopupAction.cancel();
      }
      PopupOperation.currentPopupAction = this;
    }
    async executeNotNull() {
      const result = await this.execute();
      _assert(result, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      return result;
    }
    async onExecution() {
      debugAssert(this.filter.length === 1, 'Popup operations only handle one event');
      const eventId = _generateEventId();
      this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0],
      // There's always one, see constructor
      eventId);
      this.authWindow.associatedEvent = eventId;
      // Check for web storage support and origin validation _after_ the popup is
      // loaded. These operations are slow (~1 second or so) Rather than
      // waiting on them before opening the window, optimistically open the popup
      // and check for storage support at the same time. If storage support is
      // not available, this will cause the whole thing to reject properly. It
      // will also close the popup, but since the promise has already rejected,
      // the popup closed by user poll will reject into the void.
      this.resolver._originValidation(this.auth).catch(e => {
        this.reject(e);
      });
      this.resolver._isIframeWebStorageSupported(this.auth, isSupported => {
        if (!isSupported) {
          this.reject(_createError(this.auth, "web-storage-unsupported" /* AuthErrorCode.WEB_STORAGE_UNSUPPORTED */));
        }
      });
      // Handle user closure. Notice this does *not* use await
      this.pollUserCancellation();
    }
    get eventId() {
      var _a;
      return ((_a = this.authWindow) === null || _a === void 0 ? void 0 : _a.associatedEvent) || null;
    }
    cancel() {
      this.reject(_createError(this.auth, "cancelled-popup-request" /* AuthErrorCode.EXPIRED_POPUP_REQUEST */));
    }
    cleanUp() {
      if (this.authWindow) {
        this.authWindow.close();
      }
      if (this.pollId) {
        window.clearTimeout(this.pollId);
      }
      this.authWindow = null;
      this.pollId = null;
      PopupOperation.currentPopupAction = null;
    }
    pollUserCancellation() {
      const poll = () => {
        var _a, _b;
        if ((_b = (_a = this.authWindow) === null || _a === void 0 ? void 0 : _a.window) === null || _b === void 0 ? void 0 : _b.closed) {
          // Make sure that there is sufficient time for whatever action to
          // complete. The window could have closed but the sign in network
          // call could still be in flight. This is specifically true for
          // Firefox or if the opener is in an iframe, in which case the oauth
          // helper closes the popup.
          this.pollId = window.setTimeout(() => {
            this.pollId = null;
            this.reject(_createError(this.auth, "popup-closed-by-user" /* AuthErrorCode.POPUP_CLOSED_BY_USER */));
          }, 8000 /* _Timeout.AUTH_EVENT */);
          return;
        }
        this.pollId = window.setTimeout(poll, _POLL_WINDOW_CLOSE_TIMEOUT.get());
      };
      poll();
    }
  }
  // Only one popup is ever shown at once. The lifecycle of the current popup
  // can be managed / cancelled by the constructor.
  PopupOperation.currentPopupAction = null;

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const PENDING_REDIRECT_KEY = 'pendingRedirect';
  // We only get one redirect outcome for any one auth, so just store it
  // in here.
  const redirectOutcomeMap = new Map();
  class RedirectAction extends AbstractPopupRedirectOperation {
    constructor(auth, resolver) {
      let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      super(auth, ["signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */, "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */, "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */, "unknown" /* AuthEventType.UNKNOWN */], resolver, undefined, bypassAuthState);
      this.eventId = null;
    }
    /**
     * Override the execute function; if we already have a redirect result, then
     * just return it.
     */
    async execute() {
      let readyOutcome = redirectOutcomeMap.get(this.auth._key());
      if (!readyOutcome) {
        try {
          const hasPendingRedirect = await _getAndClearPendingRedirectStatus(this.resolver, this.auth);
          const result = hasPendingRedirect ? await super.execute() : null;
          readyOutcome = () => Promise.resolve(result);
        } catch (e) {
          readyOutcome = () => Promise.reject(e);
        }
        redirectOutcomeMap.set(this.auth._key(), readyOutcome);
      }
      // If we're not bypassing auth state, the ready outcome should be set to
      // null.
      if (!this.bypassAuthState) {
        redirectOutcomeMap.set(this.auth._key(), () => Promise.resolve(null));
      }
      return readyOutcome();
    }
    async onAuthEvent(event) {
      if (event.type === "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */) {
        return super.onAuthEvent(event);
      } else if (event.type === "unknown" /* AuthEventType.UNKNOWN */) {
        // This is a sentinel value indicating there's no pending redirect
        this.resolve(null);
        return;
      }
      if (event.eventId) {
        const user = await this.auth._redirectUserForId(event.eventId);
        if (user) {
          this.user = user;
          return super.onAuthEvent(event);
        } else {
          this.resolve(null);
        }
      }
    }
    async onExecution() {}
    cleanUp() {}
  }
  async function _getAndClearPendingRedirectStatus(resolver, auth) {
    const key = pendingRedirectKey(auth);
    const persistence = resolverPersistence(resolver);
    if (!(await persistence._isAvailable())) {
      return false;
    }
    const hasPendingRedirect = (await persistence._get(key)) === 'true';
    await persistence._remove(key);
    return hasPendingRedirect;
  }
  function _overrideRedirectResult(auth, result) {
    redirectOutcomeMap.set(auth._key(), result);
  }
  function resolverPersistence(resolver) {
    return _getInstance(resolver._redirectPersistence);
  }
  function pendingRedirectKey(auth) {
    return _persistenceKeyName(PENDING_REDIRECT_KEY, auth.config.apiKey, auth.name);
  }
  async function _getRedirectResult(auth, resolverExtern) {
    let bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const authInternal = _castAuth(auth);
    const resolver = _withDefaultResolver(authInternal, resolverExtern);
    const action = new RedirectAction(authInternal, resolver, bypassAuthState);
    const result = await action.execute();
    if (result && !bypassAuthState) {
      delete result.user._redirectEventId;
      await authInternal._persistUserIfCurrent(result.user);
      await authInternal._setRedirectUser(null, resolverExtern);
    }
    return result;
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  // The amount of time to store the UIDs of seen events; this is
  // set to 10 min by default
  const EVENT_DUPLICATION_CACHE_DURATION_MS = 10 * 60 * 1000;
  class AuthEventManager {
    constructor(auth) {
      this.auth = auth;
      this.cachedEventUids = new Set();
      this.consumers = new Set();
      this.queuedRedirectEvent = null;
      this.hasHandledPotentialRedirect = false;
      this.lastProcessedEventTime = Date.now();
    }
    registerConsumer(authEventConsumer) {
      this.consumers.add(authEventConsumer);
      if (this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)) {
        this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
        this.saveEventToCache(this.queuedRedirectEvent);
        this.queuedRedirectEvent = null;
      }
    }
    unregisterConsumer(authEventConsumer) {
      this.consumers.delete(authEventConsumer);
    }
    onEvent(event) {
      // Check if the event has already been handled
      if (this.hasEventBeenHandled(event)) {
        return false;
      }
      let handled = false;
      this.consumers.forEach(consumer => {
        if (this.isEventForConsumer(event, consumer)) {
          handled = true;
          this.sendToConsumer(event, consumer);
          this.saveEventToCache(event);
        }
      });
      if (this.hasHandledPotentialRedirect || !isRedirectEvent(event)) {
        // If we've already seen a redirect before, or this is a popup event,
        // bail now
        return handled;
      }
      this.hasHandledPotentialRedirect = true;
      // If the redirect wasn't handled, hang on to it
      if (!handled) {
        this.queuedRedirectEvent = event;
        handled = true;
      }
      return handled;
    }
    sendToConsumer(event, consumer) {
      var _a;
      if (event.error && !isNullRedirectEvent(event)) {
        const code = ((_a = event.error.code) === null || _a === void 0 ? void 0 : _a.split('auth/')[1]) || "internal-error" /* AuthErrorCode.INTERNAL_ERROR */;
        consumer.onError(_createError(this.auth, code));
      } else {
        consumer.onAuthEvent(event);
      }
    }
    isEventForConsumer(event, consumer) {
      const eventIdMatches = consumer.eventId === null || !!event.eventId && event.eventId === consumer.eventId;
      return consumer.filter.includes(event.type) && eventIdMatches;
    }
    hasEventBeenHandled(event) {
      if (Date.now() - this.lastProcessedEventTime >= EVENT_DUPLICATION_CACHE_DURATION_MS) {
        this.cachedEventUids.clear();
      }
      return this.cachedEventUids.has(eventUid(event));
    }
    saveEventToCache(event) {
      this.cachedEventUids.add(eventUid(event));
      this.lastProcessedEventTime = Date.now();
    }
  }
  function eventUid(e) {
    return [e.type, e.eventId, e.sessionId, e.tenantId].filter(v => v).join('-');
  }
  function isNullRedirectEvent(_ref11) {
    let {
      type,
      error
    } = _ref11;
    return type === "unknown" /* AuthEventType.UNKNOWN */ && (error === null || error === void 0 ? void 0 : error.code) === "auth/".concat("no-auth-event" /* AuthErrorCode.NO_AUTH_EVENT */);
  }
  function isRedirectEvent(event) {
    switch (event.type) {
      case "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */:
      case "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */:
      case "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */:
        return true;
      case "unknown" /* AuthEventType.UNKNOWN */:
        return isNullRedirectEvent(event);
      default:
        return false;
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  async function _getProjectConfig(auth) {
    let request = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v1/projects" /* Endpoint.GET_PROJECT_CONFIG */, request);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const IP_ADDRESS_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const HTTP_REGEX = /^https?/;
  async function _validateOrigin(auth) {
    // Skip origin validation if we are in an emulated environment
    if (auth.config.emulator) {
      return;
    }
    const {
      authorizedDomains
    } = await _getProjectConfig(auth);
    for (const domain of authorizedDomains) {
      try {
        if (matchDomain(domain)) {
          return;
        }
      } catch (_a) {
        // Do nothing if there's a URL error; just continue searching
      }
    }
    // In the old SDK, this error also provides helpful messages.
    _fail(auth, "unauthorized-domain" /* AuthErrorCode.INVALID_ORIGIN */);
  }
  function matchDomain(expected) {
    const currentUrl = _getCurrentUrl();
    const {
      protocol,
      hostname
    } = new URL(currentUrl);
    if (expected.startsWith('chrome-extension://')) {
      const ceUrl = new URL(expected);
      if (ceUrl.hostname === '' && hostname === '') {
        // For some reason we're not parsing chrome URLs properly
        return protocol === 'chrome-extension:' && expected.replace('chrome-extension://', '') === currentUrl.replace('chrome-extension://', '');
      }
      return protocol === 'chrome-extension:' && ceUrl.hostname === hostname;
    }
    if (!HTTP_REGEX.test(protocol)) {
      return false;
    }
    if (IP_ADDRESS_REGEX.test(expected)) {
      // The domain has to be exactly equal to the pattern, as an IP domain will
      // only contain the IP, no extra character.
      return hostname === expected;
    }
    // Dots in pattern should be escaped.
    const escapedDomainPattern = expected.replace(/\./g, '\\.');
    // Non ip address domains.
    // domain.com = *.domain.com OR domain.com
    const re = new RegExp('^(.+\\.' + escapedDomainPattern + '|' + escapedDomainPattern + ')$', 'i');
    return re.test(hostname);
  }

  /**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const NETWORK_TIMEOUT = new Delay(30000, 60000);
  /**
   * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
   * it will stop working after a retrial. This is a hack to fix this issue.
   */
  function resetUnloadedGapiModules() {
    // Clear last failed gapi.load state to force next gapi.load to first
    // load the failed gapi.iframes module.
    // Get gapix.beacon context.
    const beacon = _window().___jsl;
    // Get current hint.
    if (beacon === null || beacon === void 0 ? void 0 : beacon.H) {
      // Get gapi hint.
      for (const hint of Object.keys(beacon.H)) {
        // Requested modules.
        beacon.H[hint].r = beacon.H[hint].r || [];
        // Loaded modules.
        beacon.H[hint].L = beacon.H[hint].L || [];
        // Set requested modules to a copy of the loaded modules.
        beacon.H[hint].r = [...beacon.H[hint].L];
        // Clear pending callbacks.
        if (beacon.CP) {
          for (let i = 0; i < beacon.CP.length; i++) {
            // Remove all failed pending callbacks.
            beacon.CP[i] = null;
          }
        }
      }
    }
  }
  function loadGapi(auth) {
    return new Promise((resolve, reject) => {
      var _a, _b, _c;
      // Function to run when gapi.load is ready.
      function loadGapiIframe() {
        // The developer may have tried to previously run gapi.load and failed.
        // Run this to fix that.
        resetUnloadedGapiModules();
        gapi.load('gapi.iframes', {
          callback: () => {
            resolve(gapi.iframes.getContext());
          },
          ontimeout: () => {
            // The above reset may be sufficient, but having this reset after
            // failure ensures that if the developer calls gapi.load after the
            // connection is re-established and before another attempt to embed
            // the iframe, it would work and would not be broken because of our
            // failed attempt.
            // Timeout when gapi.iframes.Iframe not loaded.
            resetUnloadedGapiModules();
            reject(_createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
          },
          timeout: NETWORK_TIMEOUT.get()
        });
      }
      if ((_b = (_a = _window().gapi) === null || _a === void 0 ? void 0 : _a.iframes) === null || _b === void 0 ? void 0 : _b.Iframe) {
        // If gapi.iframes.Iframe available, resolve.
        resolve(gapi.iframes.getContext());
      } else if (!!((_c = _window().gapi) === null || _c === void 0 ? void 0 : _c.load)) {
        // Gapi loader ready, load gapi.iframes.
        loadGapiIframe();
      } else {
        // Create a new iframe callback when this is called so as not to overwrite
        // any previous defined callback. This happens if this method is called
        // multiple times in parallel and could result in the later callback
        // overwriting the previous one. This would end up with a iframe
        // timeout.
        const cbName = _generateCallbackName('iframefcb');
        // GApi loader not available, dynamically load platform.js.
        _window()[cbName] = () => {
          // GApi loader should be ready.
          if (!!gapi.load) {
            loadGapiIframe();
          } else {
            // Gapi loader failed, throw error.
            reject(_createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
          }
        };
        // Load GApi loader.
        return _loadJS("https://apis.google.com/js/api.js?onload=".concat(cbName)).catch(e => reject(e));
      }
    }).catch(error => {
      // Reset cached promise to allow for retrial.
      cachedGApiLoader = null;
      throw error;
    });
  }
  let cachedGApiLoader = null;
  function _loadGapi(auth) {
    cachedGApiLoader = cachedGApiLoader || loadGapi(auth);
    return cachedGApiLoader;
  }

  /**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const PING_TIMEOUT = new Delay(5000, 15000);
  const IFRAME_PATH = '__/auth/iframe';
  const EMULATED_IFRAME_PATH = 'emulator/auth/iframe';
  const IFRAME_ATTRIBUTES = {
    style: {
      position: 'absolute',
      top: '-100px',
      width: '1px',
      height: '1px'
    },
    'aria-hidden': 'true',
    tabindex: '-1'
  };
  // Map from apiHost to endpoint ID for passing into iframe. In current SDK, apiHost can be set to
  // anything (not from a list of endpoints with IDs as in legacy), so this is the closest we can get.
  const EID_FROM_APIHOST = new Map([["identitytoolkit.googleapis.com" /* DefaultConfig.API_HOST */, 'p'], ['staging-identitytoolkit.sandbox.googleapis.com', 's'], ['test-identitytoolkit.sandbox.googleapis.com', 't'] // test
  ]);
  function getIframeUrl(auth) {
    const config = auth.config;
    _assert(config.authDomain, auth, "auth-domain-config-required" /* AuthErrorCode.MISSING_AUTH_DOMAIN */);
    const url = config.emulator ? _emulatorUrl(config, EMULATED_IFRAME_PATH) : "https://".concat(auth.config.authDomain, "/").concat(IFRAME_PATH);
    const params = {
      apiKey: config.apiKey,
      appName: auth.name,
      v: SDK_VERSION
    };
    const eid = EID_FROM_APIHOST.get(auth.config.apiHost);
    if (eid) {
      params.eid = eid;
    }
    const frameworks = auth._getFrameworks();
    if (frameworks.length) {
      params.fw = frameworks.join(',');
    }
    return "".concat(url, "?").concat(querystring(params).slice(1));
  }
  async function _openIframe(auth) {
    const context = await _loadGapi(auth);
    const gapi = _window().gapi;
    _assert(gapi, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
    return context.open({
      where: document.body,
      url: getIframeUrl(auth),
      messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
      attributes: IFRAME_ATTRIBUTES,
      dontclear: true
    }, iframe => new Promise(async (resolve, reject) => {
      await iframe.restyle({
        // Prevent iframe from closing on mouse out.
        setHideOnLeave: false
      });
      const networkError = _createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */);
      // Confirm iframe is correctly loaded.
      // To fallback on failure, set a timeout.
      const networkErrorTimer = _window().setTimeout(() => {
        reject(networkError);
      }, PING_TIMEOUT.get());
      // Clear timer and resolve pending iframe ready promise.
      function clearTimerAndResolve() {
        _window().clearTimeout(networkErrorTimer);
        resolve(iframe);
      }
      // This returns an IThenable. However the reject part does not call
      // when the iframe is not loaded.
      iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, () => {
        reject(networkError);
      });
    }));
  }

  /**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const BASE_POPUP_OPTIONS = {
    location: 'yes',
    resizable: 'yes',
    statusbar: 'yes',
    toolbar: 'no'
  };
  const DEFAULT_WIDTH = 500;
  const DEFAULT_HEIGHT = 600;
  const TARGET_BLANK = '_blank';
  const FIREFOX_EMPTY_URL = 'http://localhost';
  class AuthPopup {
    constructor(window) {
      this.window = window;
      this.associatedEvent = null;
    }
    close() {
      if (this.window) {
        try {
          this.window.close();
        } catch (e) {}
      }
    }
  }
  function _open(auth, url, name) {
    let width = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : DEFAULT_WIDTH;
    let height = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : DEFAULT_HEIGHT;
    const top = Math.max((window.screen.availHeight - height) / 2, 0).toString();
    const left = Math.max((window.screen.availWidth - width) / 2, 0).toString();
    let target = '';
    const options = Object.assign(Object.assign({}, BASE_POPUP_OPTIONS), {
      width: width.toString(),
      height: height.toString(),
      top,
      left
    });
    // Chrome iOS 7 and 8 is returning an undefined popup win when target is
    // specified, even though the popup is not necessarily blocked.
    const ua = getUA().toLowerCase();
    if (name) {
      target = _isChromeIOS(ua) ? TARGET_BLANK : name;
    }
    if (_isFirefox(ua)) {
      // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
      url = url || FIREFOX_EMPTY_URL;
      // Firefox disables by default scrolling on popup windows, which can create
      // issues when the user has many Google accounts, for instance.
      options.scrollbars = 'yes';
    }
    const optionsString = Object.entries(options).reduce((accum, _ref12) => {
      let [key, value] = _ref12;
      return "".concat(accum).concat(key, "=").concat(value, ",");
    }, '');
    if (_isIOSStandalone(ua) && target !== '_self') {
      openAsNewWindowIOS(url || '', target);
      return new AuthPopup(null);
    }
    // about:blank getting sanitized causing browsers like IE/Edge to display
    // brief error message before redirecting to handler.
    const newWin = window.open(url || '', target, optionsString);
    _assert(newWin, auth, "popup-blocked" /* AuthErrorCode.POPUP_BLOCKED */);
    // Flaky on IE edge, encapsulate with a try and catch.
    try {
      newWin.focus();
    } catch (e) {}
    return new AuthPopup(newWin);
  }
  function openAsNewWindowIOS(url, target) {
    const el = document.createElement('a');
    el.href = url;
    el.target = target;
    const click = document.createEvent('MouseEvent');
    click.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 1, null);
    el.dispatchEvent(click);
  }

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * URL for Authentication widget which will initiate the OAuth handshake
   *
   * @internal
   */
  const WIDGET_PATH = '__/auth/handler';
  /**
   * URL for emulated environment
   *
   * @internal
   */
  const EMULATOR_WIDGET_PATH = 'emulator/auth/handler';
  /**
   * Fragment name for the App Check token that gets passed to the widget
   *
   * @internal
   */
  const FIREBASE_APP_CHECK_FRAGMENT_ID = encodeURIComponent('fac');
  async function _getRedirectUrl(auth, provider, authType, redirectUrl, eventId, additionalParams) {
    _assert(auth.config.authDomain, auth, "auth-domain-config-required" /* AuthErrorCode.MISSING_AUTH_DOMAIN */);
    _assert(auth.config.apiKey, auth, "invalid-api-key" /* AuthErrorCode.INVALID_API_KEY */);
    const params = {
      apiKey: auth.config.apiKey,
      appName: auth.name,
      authType,
      redirectUrl,
      v: SDK_VERSION,
      eventId
    };
    if (provider instanceof FederatedAuthProvider) {
      provider.setDefaultLanguage(auth.languageCode);
      params.providerId = provider.providerId || '';
      if (!isEmpty(provider.getCustomParameters())) {
        params.customParameters = JSON.stringify(provider.getCustomParameters());
      }
      // TODO set additionalParams from the provider as well?
      for (const [key, value] of Object.entries({})) {
        params[key] = value;
      }
    }
    if (provider instanceof BaseOAuthProvider) {
      const scopes = provider.getScopes().filter(scope => scope !== '');
      if (scopes.length > 0) {
        params.scopes = scopes.join(',');
      }
    }
    if (auth.tenantId) {
      params.tid = auth.tenantId;
    }
    // TODO: maybe set eid as endipointId
    // TODO: maybe set fw as Frameworks.join(",")
    const paramsDict = params;
    for (const key of Object.keys(paramsDict)) {
      if (paramsDict[key] === undefined) {
        delete paramsDict[key];
      }
    }
    // Sets the App Check token to pass to the widget
    const appCheckToken = await auth._getAppCheckToken();
    const appCheckTokenFragment = appCheckToken ? "#".concat(FIREBASE_APP_CHECK_FRAGMENT_ID, "=").concat(encodeURIComponent(appCheckToken)) : '';
    // Start at index 1 to skip the leading '&' in the query string
    return "".concat(getHandlerBase(auth), "?").concat(querystring(paramsDict).slice(1)).concat(appCheckTokenFragment);
  }
  function getHandlerBase(_ref13) {
    let {
      config
    } = _ref13;
    if (!config.emulator) {
      return "https://".concat(config.authDomain, "/").concat(WIDGET_PATH);
    }
    return _emulatorUrl(config, EMULATOR_WIDGET_PATH);
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * The special web storage event
   *
   */
  const WEB_STORAGE_SUPPORT_KEY = 'webStorageSupport';
  class BrowserPopupRedirectResolver {
    constructor() {
      this.eventManagers = {};
      this.iframes = {};
      this.originValidationPromises = {};
      this._redirectPersistence = browserSessionPersistence;
      this._completeRedirectFn = _getRedirectResult;
      this._overrideRedirectResult = _overrideRedirectResult;
    }
    // Wrapping in async even though we don't await anywhere in order
    // to make sure errors are raised as promise rejections
    async _openPopup(auth, provider, authType, eventId) {
      var _a;
      debugAssert((_a = this.eventManagers[auth._key()]) === null || _a === void 0 ? void 0 : _a.manager, '_initialize() not called before _openPopup()');
      const url = await _getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId);
      return _open(auth, url, _generateEventId());
    }
    async _openRedirect(auth, provider, authType, eventId) {
      await this._originValidation(auth);
      const url = await _getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId);
      _setWindowLocation(url);
      return new Promise(() => {});
    }
    _initialize(auth) {
      const key = auth._key();
      if (this.eventManagers[key]) {
        const {
          manager,
          promise
        } = this.eventManagers[key];
        if (manager) {
          return Promise.resolve(manager);
        } else {
          debugAssert(promise, 'If manager is not set, promise should be');
          return promise;
        }
      }
      const promise = this.initAndGetManager(auth);
      this.eventManagers[key] = {
        promise
      };
      // If the promise is rejected, the key should be removed so that the
      // operation can be retried later.
      promise.catch(() => {
        delete this.eventManagers[key];
      });
      return promise;
    }
    async initAndGetManager(auth) {
      const iframe = await _openIframe(auth);
      const manager = new AuthEventManager(auth);
      iframe.register('authEvent', iframeEvent => {
        _assert(iframeEvent === null || iframeEvent === void 0 ? void 0 : iframeEvent.authEvent, auth, "invalid-auth-event" /* AuthErrorCode.INVALID_AUTH_EVENT */);
        // TODO: Consider splitting redirect and popup events earlier on
        const handled = manager.onEvent(iframeEvent.authEvent);
        return {
          status: handled ? "ACK" /* GapiOutcome.ACK */ : "ERROR" /* GapiOutcome.ERROR */
        };
      }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
      this.eventManagers[auth._key()] = {
        manager
      };
      this.iframes[auth._key()] = iframe;
      return manager;
    }
    _isIframeWebStorageSupported(auth, cb) {
      const iframe = this.iframes[auth._key()];
      iframe.send(WEB_STORAGE_SUPPORT_KEY, {
        type: WEB_STORAGE_SUPPORT_KEY
      }, result => {
        var _a;
        const isSupported = (_a = result === null || result === void 0 ? void 0 : result[0]) === null || _a === void 0 ? void 0 : _a[WEB_STORAGE_SUPPORT_KEY];
        if (isSupported !== undefined) {
          cb(!!isSupported);
        }
        _fail(auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
      }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
    }
    _originValidation(auth) {
      const key = auth._key();
      if (!this.originValidationPromises[key]) {
        this.originValidationPromises[key] = _validateOrigin(auth);
      }
      return this.originValidationPromises[key];
    }
    get _shouldInitProactively() {
      // Mobile browsers and Safari need to optimistically initialize
      return _isMobileBrowser() || _isSafari() || _isIOS();
    }
  }
  /**
   * An implementation of {@link PopupRedirectResolver} suitable for browser
   * based applications.
   *
   * @public
   */
  const browserPopupRedirectResolver = BrowserPopupRedirectResolver;
  var name$1 = "@firebase/auth";
  var version$1 = "0.23.2";

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class AuthInterop {
    constructor(auth) {
      this.auth = auth;
      this.internalListeners = new Map();
    }
    getUid() {
      var _a;
      this.assertAuthConfigured();
      return ((_a = this.auth.currentUser) === null || _a === void 0 ? void 0 : _a.uid) || null;
    }
    async getToken(forceRefresh) {
      this.assertAuthConfigured();
      await this.auth._initializationPromise;
      if (!this.auth.currentUser) {
        return null;
      }
      const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
      return {
        accessToken
      };
    }
    addAuthTokenListener(listener) {
      this.assertAuthConfigured();
      if (this.internalListeners.has(listener)) {
        return;
      }
      const unsubscribe = this.auth.onIdTokenChanged(user => {
        listener((user === null || user === void 0 ? void 0 : user.stsTokenManager.accessToken) || null);
      });
      this.internalListeners.set(listener, unsubscribe);
      this.updateProactiveRefresh();
    }
    removeAuthTokenListener(listener) {
      this.assertAuthConfigured();
      const unsubscribe = this.internalListeners.get(listener);
      if (!unsubscribe) {
        return;
      }
      this.internalListeners.delete(listener);
      unsubscribe();
      this.updateProactiveRefresh();
    }
    assertAuthConfigured() {
      _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */);
    }
    updateProactiveRefresh() {
      if (this.internalListeners.size > 0) {
        this.auth._startProactiveRefresh();
      } else {
        this.auth._stopProactiveRefresh();
      }
    }
  }

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  function getVersionForPlatform(clientPlatform) {
    switch (clientPlatform) {
      case "Node" /* ClientPlatform.NODE */:
        return 'node';
      case "ReactNative" /* ClientPlatform.REACT_NATIVE */:
        return 'rn';
      case "Worker" /* ClientPlatform.WORKER */:
        return 'webworker';
      case "Cordova" /* ClientPlatform.CORDOVA */:
        return 'cordova';
      default:
        return undefined;
    }
  }
  /** @internal */
  function registerAuth(clientPlatform) {
    _registerComponent(new Component("auth" /* _ComponentName.AUTH */, (container, _ref14) => {
      let {
        options: deps
      } = _ref14;
      const app = container.getProvider('app').getImmediate();
      const heartbeatServiceProvider = container.getProvider('heartbeat');
      const appCheckServiceProvider = container.getProvider('app-check-internal');
      const {
        apiKey,
        authDomain
      } = app.options;
      _assert(apiKey && !apiKey.includes(':'), "invalid-api-key" /* AuthErrorCode.INVALID_API_KEY */, {
        appName: app.name
      });
      const config = {
        apiKey,
        authDomain,
        clientPlatform,
        apiHost: "identitytoolkit.googleapis.com" /* DefaultConfig.API_HOST */,
        tokenApiHost: "securetoken.googleapis.com" /* DefaultConfig.TOKEN_API_HOST */,
        apiScheme: "https" /* DefaultConfig.API_SCHEME */,
        sdkClientVersion: _getClientVersion(clientPlatform)
      };
      const authInstance = new AuthImpl(app, heartbeatServiceProvider, appCheckServiceProvider, config);
      _initializeAuthInstance(authInstance, deps);
      return authInstance;
    }, "PUBLIC" /* ComponentType.PUBLIC */)
    /**
     * Auth can only be initialized by explicitly calling getAuth() or initializeAuth()
     * For why we do this, See go/firebase-next-auth-init
     */.setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */)
    /**
     * Because all firebase products that depend on auth depend on auth-internal directly,
     * we need to initialize auth-internal after auth is initialized to make it available to other firebase products.
     */.setInstanceCreatedCallback((container, _instanceIdentifier, _instance) => {
      const authInternalProvider = container.getProvider("auth-internal" /* _ComponentName.AUTH_INTERNAL */);
      authInternalProvider.initialize();
    }));
    _registerComponent(new Component("auth-internal" /* _ComponentName.AUTH_INTERNAL */, container => {
      const auth = _castAuth(container.getProvider("auth" /* _ComponentName.AUTH */).getImmediate());
      return (auth => new AuthInterop(auth))(auth);
    }, "PRIVATE" /* ComponentType.PRIVATE */).setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */));
    registerVersion(name$1, version$1, getVersionForPlatform(clientPlatform));
    // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
    registerVersion(name$1, version$1, 'esm2017');
  }

  /**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const DEFAULT_ID_TOKEN_MAX_AGE = 5 * 60;
  const authIdTokenMaxAge = getExperimentalSetting('authIdTokenMaxAge') || DEFAULT_ID_TOKEN_MAX_AGE;
  let lastPostedIdToken = null;
  const mintCookieFactory = url => async user => {
    const idTokenResult = user && (await user.getIdTokenResult());
    const idTokenAge = idTokenResult && (new Date().getTime() - Date.parse(idTokenResult.issuedAtTime)) / 1000;
    if (idTokenAge && idTokenAge > authIdTokenMaxAge) {
      return;
    }
    // Specifically trip null => undefined when logged out, to delete any existing cookie
    const idToken = idTokenResult === null || idTokenResult === void 0 ? void 0 : idTokenResult.token;
    if (lastPostedIdToken === idToken) {
      return;
    }
    lastPostedIdToken = idToken;
    await fetch(url, {
      method: idToken ? 'POST' : 'DELETE',
      headers: idToken ? {
        'Authorization': "Bearer ".concat(idToken)
      } : {}
    });
  };
  /**
   * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
   * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
   *
   * @param app - The Firebase App.
   *
   * @public
   */
  function getAuth() {
    let app = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getApp();
    const provider = _getProvider(app, 'auth');
    if (provider.isInitialized()) {
      return provider.getImmediate();
    }
    const auth = initializeAuth(app, {
      popupRedirectResolver: browserPopupRedirectResolver,
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
    });
    const authTokenSyncUrl = getExperimentalSetting('authTokenSyncURL');
    if (authTokenSyncUrl) {
      const mintCookie = mintCookieFactory(authTokenSyncUrl);
      beforeAuthStateChanged(auth, mintCookie, () => mintCookie(auth.currentUser));
      onIdTokenChanged(auth, user => mintCookie(user));
    }
    const authEmulatorHost = getDefaultEmulatorHost('auth');
    if (authEmulatorHost) {
      connectAuthEmulator(auth, "http://".concat(authEmulatorHost));
    }
    return auth;
  }
  registerAuth("Browser" /* ClientPlatform.BROWSER */);

  var name = "firebase";
  var version = "9.23.0";

  /**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  registerVersion(name, version, 'app');

  // Import the functions you need from the SDKs you need
  // Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBkogia4Wk0L8PGBmBUe8nchmnTUCP12So",
    authDomain: "pomodoro-ef5e0.firebaseapp.com",
    projectId: "pomodoro-ef5e0",
    storageBucket: "pomodoro-ef5e0.appspot.com",
    messagingSenderId: "1090399963563",
    appId: "1:1090399963563:web:3770ce113bc93a4443eaee"
  };
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  //export const provider = new GoogleAuthProvider();

  //#region Components/CircularProgressBar/circularProgressBar.jsx
  //#endregion
  //#region URLs
  const ENV = "production"; // Change this to 'production' when deploying
  // const ENV = "development"; // Change this to 'production' when deploying
  const BASE_URLS = {
    development: "http://localhost:3000",
    production: "https://pomodoro-nest-apis.onrender.com"
  };
  const BASE_URL = BASE_URLS[ENV];
  const RESOURCE = {
    USERS: "/users",
    POMODOROS: "/pomodoros",
    TODAY_RECORDS: "/today-records",
    CATEGORIES: "/categories",
    CYCLE_SETTINGS: "/cycle-settings",
    TODOIST: "/todoist"
  };
  const SUB_SET = {
    POMODORO_SETTING: "/pomodoro-setting",
    AUTO_START_SETTING: "/auto-start-setting",
    TIMERS_STATES: "/timers-states",
    DEMO_DATA: "/demo-data",
    IS_UNCATEGORIZED_ON_STAT: "/is-uncategorized-on-stat",
    COLOR_FOR_UNCATEGORIZED: "/color-for-uncategorized",
    CATEGORY_CHANGE_INFO_ARRAY: "/category-change-info-array",
    GOALS: "/goals",
    CURRENT_CYCLE_INFO: "/current-cycle-info",
    OAUTH_START: "/oauth/start",
    OAUTH_REVOKE: "/oauth/revoke",
    OAUTH_REVOKE_SDK: "/oauth/revoke-sdk",
    TASKS: "/tasks",
    CURRENT_TASK_ID: "/current-task-id",
    TASK_CHANGE_INFO_ARRAY: "/task-change-info-array"
  };
  //#endregion
  const cacheVersion = 1;
  const CacheName = "statRelatedCache-".concat(cacheVersion);
  //#endregion
  //#region IndexedDB related
  const IDB_VERSION = 11;

  const _excluded = ["currentCycleInfo"];
  let DB = null;
  let CACHE = null;
  const BC = new BroadcastChannel("pomodoro");
  const SESSION = {
    POMO: 1,
    SHORT_BREAK: 2,
    LAST_POMO: 3,
    LONG_BREAK: 4,
    VERY_LAST_POMO: 5
  };
  const obtainIdToken = () => {
    return new Promise((res, rej) => {
      const unsubscribe = onAuthStateChanged(auth, user => {
        unsubscribe();
        if (user) {
          getIdToken(user).then(idToken => {
            res(idToken);
          }, error => {
            res(null);
          });
        } else {
          res(null);
        }
      });
    });
  };
  self.addEventListener("install", ev => {
    console.log("sw - installed");
    ev.waitUntil(Promise.resolve().then(async () => {
      CACHE = await openCache(CacheName);
    }));
    self.skipWaiting();
  });
  self.addEventListener("activate", ev => {
    console.log("sw - activated");
    ev.waitUntil(Promise.resolve().then(async () => {
      DB = await openIndexedDB();
    }));
  });
  self.addEventListener("message", async ev => {
    CACHE = await openCache(CacheName);
    if (typeof ev.data === "object" && ev.data !== null) {
      const {
        action,
        payload
      } = ev.data;
      switch (action) {
        case "saveStates":
          saveStates(payload);
          break;

        // not used anymore. Instead, we use countDown() in the index.tsx
        case "countDown":
          // countDown(payload, ev.source.id);
          break;
        case "emptyStateStore":
          emptyStateStore(ev.source.id);
          break;
        case "stopCountdown":
          //number로 바꿔야하 하는거 아니야?
          // console.log(payload.idOfSetInterval);
          clearInterval(payload.idOfSetInterval);
          break;
        case "endTimer":
          // console.log("payload at the case endTimer at sw.js", payload);
          await goNext(payload);
          break;
      }
    }
  });
  self.addEventListener("notificationclick", async ev => {
    // console.log("notification from sw is clicked");
    ev.notification.close();
    let pm = Promise.resolve().then(async () => {
      return await self.clients.matchAll();
    }).then(async matchingClients => {
      // console.log("matchingClients", matchingClients);
      await matchingClients[0].focus();
    });
    ev.waitUntil(pm);
  });
  async function openCache(name) {
    // console.log("openCache is called with", name);
    let cache = null;
    try {
      cache = await caches.open(name);
    } catch (err) {
      console.warn(err);
    }
    // console.log("cache opened - ", cache);
    return cache;
  }
  async function openIndexedDB() {
    let db = await openDB("timerRelatedDB", IDB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        console.log("DB updated from version", oldVersion, "to", newVersion);
        if (!db.objectStoreNames.contains("stateStore")) {
          db.createObjectStore("stateStore", {
            keyPath: "name"
          });
        }
        if (!db.objectStoreNames.contains("recOfToday")) {
          db.createObjectStore("recOfToday", {
            keyPath: ["kind", "startTime"]
          });
        }
        if (!db.objectStoreNames.contains("categoryStore")) {
          db.createObjectStore("categoryStore", {
            keyPath: "name"
          });
        }
        if (!db.objectStoreNames.contains("taskDurationTracking")) {
          db.createObjectStore("taskDurationTracking", {
            keyPath: "name"
          });
        }
      },
      blocking(currentVersion, blockedVersion, event) {
        // db.close();
        console.log("blocking", event);
        //TODO: test prompt
        // prompt("Please refresh the current webpage");
      }
    });
    db.onclose = async ev => {
      console.log("The database connection was unexpectedly closed", ev);
      DB = null;
      DB = await openIndexedDB();
    };
    return db;
  }

  //data is like below.
  //{
  //   component: "Timer",
  //   stateArr: [
  //     { name: "startTime", value: action.payload },
  //     { name: "running", value: true },
  //   ],
  // };
  async function saveStates(data) {
    try {
      let db = DB || (await openIndexedDB());
      const store = db.transaction("stateStore", "readwrite").objectStore("stateStore");

      // console.log(data);

      Array.from(data.stateArr).forEach(async obj => {
        await store.put(obj);
      });
    } catch (error) {
      console.warn(error);
    }
  }

  // If the timer was running in the timer page, continue to count down the timer.
  // async function countDown(setIntervalId, clientId) {
  //   try {
  //     let db = DB || (await openIndexedDB());
  //     const store = db.transaction("stateStore").objectStore("stateStore");
  //     let states = (await store.getAll()).reduce((acc, cur) => {
  //       return { ...acc, [cur.name]: cur.value };
  //     }, {});
  //     if (states.running && setIntervalId === null) {
  //       let client = await self.clients.get(clientId);
  //       let idOfSetInterval = setInterval(() => {
  //         let remainingDuration = Math.floor(
  //           (states.duration * 60 * 1000 -
  //             (Date.now() - states.startTime - states.pause.totalLength)) /
  //             1000
  //         );
  //         console.log("count down remaining duration", remainingDuration);
  //         if (remainingDuration <= 0) {
  //           console.log("idOfSetInterval", idOfSetInterval);
  //           clearInterval(idOfSetInterval);
  //           client.postMessage({ timerHasEnded: "clearLocalStorage" });
  //           console.log("states in countDown() - ", states);
  //           goNext(states, clientId);
  //         }
  //       }, 500);

  //       client.postMessage({ idOfSetInterval });
  //     }
  //   } catch (error) {
  //     console.warn(error);
  //   }
  // }

  /**
   * purpose: to make TimerRelatedStates in the index.tsx be assigned an empty object.
   *          why?
   *          if it is {}, states in the PatternTimer and Timer are going to be set using the new pomoSetting
   *          not using the stale states in the indexedDB.
   * @param {*} clientId
   */
  async function emptyStateStore(clientId) {
    try {
      let db = DB || (await openIndexedDB());
      const store = db.transaction("stateStore", "readwrite").objectStore("stateStore");
      await store.clear();
      console.log("stateStore has been cleared");
      let client = await self.clients.get(clientId);
      client.postMessage({}); //TODO: 이거 아직도 필요한가?... -> 딱히 이거 받아다가 뭘 하지를 않는데 그냥 지우지는 말자. (navigator.serviceWorker.addEventListener "message"에서 else)
    } catch (error) {
      console.warn(error);
    }
  }

  //
  /**
   * Purpose: 1. states를 가공 2. 가공된 states를 가지고 wrapUpSession을 호출.
   * @param {*} payload timersStates and pomoSetting of the session that was just finished.
   */
  async function goNext(payload) {
    let {
      pomoSetting,
      timersStatesWithCurrentCycleInfo,
      taskChangeInfoArray
    } = payload; //? autoStartSetting은 왜 빼고 보냈지 payload에..?... -> retrieveAutoStartSettingFromIDB()를 wrapUpSession()에서 call하는데 다 이유가 있을듯.
    // console.log(
    //   "timersStatesWithCurrentCycleInfo at goNext",
    //   timersStatesWithCurrentCycleInfo
    // );
    let {
        currentCycleInfo
      } = timersStatesWithCurrentCycleInfo,
      timersStates = _objectWithoutProperties(timersStatesWithCurrentCycleInfo, _excluded);
    let {
      duration,
      repetitionCount,
      pause,
      startTime
    } = timersStates; //! info about the session just finished

    const sessionData = {
      pause,
      startTime,
      endTime: startTime + pause.totalLength + duration * 60 * 1000,
      timeCountedDown: duration
    };
    wrapUpSession({
      session: identifyPrevSession({
        howManyCountdown: repetitionCount + 1,
        numOfPomo: pomoSetting.numOfPomo,
        numOfCycle: pomoSetting.numOfCycle
      }),
      timersStates,
      currentCycleInfo,
      pomoSetting,
      taskChangeInfoArray,
      sessionData
    });
  }

  /**
   * Purpose
   * 1. 다음 세션을 진행하기 위해 `정보`를 변환 (TimersStatesType - client/src/types/clientStatesType.ts)
   *    1. F. E - 1) 상태를 변환. 2) Indexed DB에 있는 정보 변환.
   *    2. B. E - API를 통해 DB에 있는 데이터 변환 (sync를 맞춘다).
   * 2. 세션을 마무리하면서 생기는 데이터를 persist
   *    1. records of today ( <=> TodayRecords Collection in DB)
   *      1. Database에
   *      2. Indexed DB에 - unlogged-in user도 Timeline기능을 사용할 수 있게 하기 위해.
   *    2. pomodoro records ( <=> Pomodoros Collection in DB)
   *      1. Database에
   *      2. Cache에 - Statistics component에서 불필요하게 HTTP request를 날리지 않게 하기 위해.
   *
   * @param {Object} param0
   * @param {*} param0.session 방금 끝난 세션의 종류 - 맨 위에 `const SESSION = ...` 참고
   * @param {*} param0.timersStates
   * @param {*} param0.pomoSetting
   * @param {*} param0.sessionData {pause: any; startTime: any; endTime: any; timeCountedDown: any;} - today record 계산하는데 필요함.
   */
  async function wrapUpSession(_ref) {
    let {
      session,
      timersStates,
      currentCycleInfo,
      pomoSetting,
      taskChangeInfoArray,
      sessionData
    } = _ref;
    let timersStatesForNextSession = _objectSpread2({}, timersStates);
    // reset TimerState
    timersStatesForNextSession.running = false;
    timersStatesForNextSession.startTime = 0;
    timersStatesForNextSession.pause = {
      totalLength: 0,
      record: []
    };
    // PatternTimerStates - 1. repetitionCount: new cycle의 경우를 제외하고는 모두 1 더하면 되기 때문에 여기에서 미리 처리.
    //                      2. duration: 방금 끝난 세션의 종류에 따라 달라지기 때문에 각 case에서 처리.
    timersStatesForNextSession.repetitionCount++;
    const autoStartSetting = await retrieveAutoStartSettingFromIDB();
    const arrOfStatesOfTimerReset = [{
      name: "running",
      value: false
    }, {
      name: "startTime",
      value: 0
    }, {
      name: "pause",
      value: {
        totalLength: 0,
        record: []
      }
    }];
    BC.postMessage({
      evName: "makeSound",
      payload: null
    });

    //? obtainIdToken() -> error -> res(null) is not what I considered here...
    const idToken = await obtainIdToken();
    let infoArrayBeforeReset = null;
    if (idToken) {
      infoArrayBeforeReset = (await getCategoryChangeInfoArrayFromIDB()).value;

      // create-pomodoro DTO에서 startTime - @IsPositive() 100% 방어하기 위해
      if (infoArrayBeforeReset[0].categoryChangeTimestamp === 0) infoArrayBeforeReset[0].categoryChangeTimestamp = sessionData.startTime;
      if (taskChangeInfoArray[0].taskChangeTimestamp === 0) taskChangeInfoArray[0].taskChangeTimestamp = sessionData.startTime;

      // console.log("sessionData.startTime", sessionData.startTime);
      // console.log("infoArrayBeforeReset[0]", infoArrayBeforeReset[0]);
      // console.log("taskChangeInfoArray[0]", taskChangeInfoArray[0]);

      const infoArrAfterReset = [_objectSpread2(_objectSpread2({}, infoArrayBeforeReset[infoArrayBeforeReset.length - 1]), {}, {
        categoryChangeTimestamp: 0,
        progress: 0
      })];

      // console.log("infoArrAfterReset", infoArrAfterReset);
      // [
      //     {
      //         "categoryName": "ENG",
      //         "categoryChangeTimestamp": 0,
      //         "_uuid": "73315058-5726-4158-a781-5d60d80af94c",
      //         "color": "#6e95bf",
      //         "progress": 0
      //     }
      // ]

      infoArrayBeforeReset[0].categoryChangeTimestamp = sessionData.startTime; // It is 0 before this assignment.

      // const infoArr = [
      //   {
      //     categoryName:
      //       currentCategoryName === null ? "uncategorized" : currentCategoryName,
      //     categoryChangeTimestamp: 0,
      //   },
      // ];

      BC.postMessage({
        evName: "sessionEndBySW",
        payload: infoArrAfterReset
      });
      persistCategoryChangeInfoArrayToIDB(infoArrAfterReset);
      fetchWrapper(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, "PATCH", {
        categoryChangeInfoArray: infoArrAfterReset.map(info => {
          return {
            categoryName: info.categoryName,
            categoryChangeTimestamp: info.categoryChangeTimestamp,
            color: info.color,
            progress: info.progress
          };
        })
      }, idToken);
    }
    const {
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomo,
      numOfCycle
    } = pomoSetting;

    // LongBreak과 VeryLastPomo 모든 케이스에 이 값을 적용할 수 있는가?.
    // 우선 두 경우 이후에 모두 cycle은 reset되는게 자명하기 때문에 결국 default 값으로 돌려야 한다.
    // 그러므로 이 두 값은 그대로 둬도 문제 없다. 그런데, 새롭게 도입하는 두 변수가 문제이다.

    const totalFocusDurationTargeted = 60 * pomoDuration * numOfPomo;
    const cycleDurationTargeted = 60 * (pomoDuration * numOfPomo + shortBreakDuration * (numOfPomo - 1) + longBreakDuration);
    const totalDurationOfSetOfCyclesTargeted = numOfCycle * cycleDurationTargeted;
    switch (session) {
      case SESSION.POMO:
        self.registration.showNotification("shortBreak", {
          body: "Time to take a short break",
          silent: true
        });

        // 1. 정보 변환
        timersStatesForNextSession.duration = shortBreakDuration;
        await persistStatesToIDB([...arrOfStatesOfTimerReset, {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount
        }, {
          name: "duration",
          value: timersStatesForNextSession.duration
        }]);

        // 2. 마무리 하면서 생기는 데이터 persist
        if (sessionData.startTime !== 0) {
          idToken && (await recordPomo(timersStates.startTime, idToken, infoArrayBeforeReset, taskChangeInfoArray, sessionData));
          await persistSessionToIDB("pomo", sessionData);
          persistRecOfTodayToServer(_objectSpread2({
            kind: "pomo"
          }, sessionData), idToken);
        }
        if (autoStartSetting !== undefined) {
          if (autoStartSetting.doesBreakStartAutomatically === false) {
            persistTimersStatesToServer(timersStatesForNextSession, idToken);
          } else {
            const payload = {
              timersStates: timersStatesForNextSession,
              currentCycleInfo,
              pomoSetting: pomoSetting,
              endTime: sessionData.endTime,
              prevSessionType: session
            };
            BC.postMessage({
              evName: "autoStartCurrentSession",
              payload
            });
          }
        } else {
          console.warn("autoStartSetting is undefined");
        }
        break;
      case SESSION.SHORT_BREAK:
        self.registration.showNotification("pomo", {
          body: "Time to focus",
          silent: true
        });
        timersStatesForNextSession.duration = pomoDuration;
        await persistStatesToIDB([...arrOfStatesOfTimerReset, {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount
        }, {
          name: "duration",
          value: timersStatesForNextSession.duration
        }]);
        await persistSessionToIDB("break", sessionData);
        if (autoStartSetting !== undefined) {
          if (autoStartSetting.doesPomoStartAutomatically === false) {
            persistTimersStatesToServer(timersStatesForNextSession, idToken);
          } else {
            const payload = {
              timersStates: timersStatesForNextSession,
              currentCycleInfo,
              pomoSetting: pomoSetting,
              endTime: sessionData.endTime,
              prevSessionType: session
            };
            BC.postMessage({
              evName: "autoStartCurrentSession",
              payload
            });
          }
        } else {
          console.warn("autoStartSetting is undefined");
        }
        sessionData.startTime !== 0 && persistRecOfTodayToServer(_objectSpread2({
          kind: "break"
        }, sessionData), idToken);
        break;
      case SESSION.LAST_POMO:
        self.registration.showNotification("longBreak", {
          body: "Time to take a long break",
          silent: true
        });
        timersStatesForNextSession.duration = longBreakDuration;
        await persistStatesToIDB([...arrOfStatesOfTimerReset, {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount
        }, {
          name: "duration",
          value: timersStatesForNextSession.duration
        }]);
        if (sessionData.startTime !== 0) {
          idToken && (await recordPomo(timersStates.startTime, idToken, infoArrayBeforeReset, taskChangeInfoArray, sessionData));
          persistRecOfTodayToServer(_objectSpread2({
            kind: "pomo"
          }, sessionData), idToken);
          await persistSessionToIDB("pomo", sessionData);
        }
        if (autoStartSetting !== undefined) {
          if (autoStartSetting.doesBreakStartAutomatically === false) {
            persistTimersStatesToServer(timersStatesForNextSession, idToken);
          } else {
            const payload = {
              timersStates: timersStatesForNextSession,
              currentCycleInfo,
              pomoSetting: pomoSetting,
              endTime: sessionData.endTime,
              prevSessionType: session
            };
            BC.postMessage({
              evName: "autoStartCurrentSession",
              payload
            });
          }
        } else {
          console.warn("autoStartSetting is undefined");
        }
        break;
      case SESSION.VERY_LAST_POMO:
        self.registration.showNotification("cyclesCompleted", {
          body: "All cycles of focus durations are done",
          silent: true
        });
        const cycleRecordVeryLastPomo = getCycleRecord(currentCycleInfo.cycleDuration, currentCycleInfo.totalFocusDuration, roundTo_X_DecimalPoints(totalFocusDurationTargeted / cycleDurationTargeted, 2), sessionData.endTime);
        BC.postMessage({
          evName: "endOfCycle",
          payload: cycleRecordVeryLastPomo
        });
        timersStatesForNextSession.repetitionCount = 0;
        timersStatesForNextSession.duration = pomoDuration;
        //? 2)
        await persistStatesToIDB([...arrOfStatesOfTimerReset, {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount
        }, {
          name: "duration",
          value: timersStatesForNextSession.duration
        }, {
          name: "currentCycleInfo",
          value: {
            totalFocusDuration: totalFocusDurationTargeted,
            cycleDuration: cycleDurationTargeted,
            cycleStartTimestamp: 0,
            veryFirstCycleStartTimestamp: 0,
            totalDurationOfSetOfCycles: totalDurationOfSetOfCyclesTargeted
          }
        }]);

        //? 3)
        persistTimersStatesToServer(timersStatesForNextSession, idToken);
        fetchWrapper(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, "PATCH", {
          totalFocusDuration: totalFocusDurationTargeted,
          cycleDuration: cycleDurationTargeted,
          cycleStartTimestamp: 0,
          veryFirstCycleStartTimestamp: 0,
          totalDurationOfSetOfCycles: totalDurationOfSetOfCyclesTargeted
        }, idToken);
        if (sessionData.startTime !== 0) {
          idToken && (await recordPomo(timersStates.startTime, idToken, infoArrayBeforeReset, taskChangeInfoArray, sessionData));
          await persistSessionToIDB("pomo", sessionData);
          persistRecOfTodayToServer(_objectSpread2({
            kind: "pomo"
          }, sessionData), idToken);
        }
        break;

      //* 아직 cycles가 모두 끝나지는 않았다. 그러나 한 cycle은 끝났다.
      //TODO 그러므로, 1) set 1,2 to the targeted ones. 2) set 3 to zero. 3) 4 and 5 are not to be changed.
      case SESSION.LONG_BREAK:
        self.registration.showNotification("nextCycle", {
          body: "time to do the next cycle of pomos",
          silent: true
        });
        const cycleRecordLongBreak = getCycleRecord(currentCycleInfo.cycleDuration, currentCycleInfo.totalFocusDuration, roundTo_X_DecimalPoints(totalFocusDurationTargeted / cycleDurationTargeted, 2), sessionData.endTime);
        BC.postMessage({
          evName: "endOfCycle",
          payload: cycleRecordLongBreak
        });
        timersStatesForNextSession.duration = pomoDuration;
        await persistStatesToIDB([...arrOfStatesOfTimerReset, {
          name: "repetitionCount",
          value: timersStatesForNextSession.repetitionCount
        }, {
          name: "duration",
          value: timersStatesForNextSession.duration
        }, {
          name: "currentCycleInfo",
          value: {
            totalFocusDuration: totalFocusDurationTargeted,
            cycleDuration: cycleDurationTargeted,
            cycleStartTimestamp: 0,
            veryFirstCycleStartTimestamp: currentCycleInfo.veryFirstCycleStartTimestamp,
            totalDurationOfSetOfCycles: currentCycleInfo.totalDurationOfSetOfCycles
          }
        }]);
        await persistSessionToIDB("break", sessionData);

        // console.log("autoStartSetting at wrapUpSession()", autoStartSetting);

        if (autoStartSetting !== undefined) {
          if (autoStartSetting.doesCycleStartAutomatically) {
            const payload = {
              timersStates: timersStatesForNextSession,
              currentCycleInfo: {
                totalFocusDuration: totalFocusDurationTargeted,
                cycleDuration: cycleDurationTargeted,
                cycleStartTimestamp: 0,
                veryFirstCycleStartTimestamp: currentCycleInfo.veryFirstCycleStartTimestamp,
                totalDurationOfSetOfCycles: currentCycleInfo.totalDurationOfSetOfCycles
              },
              pomoSetting: pomoSetting,
              endTime: sessionData.endTime,
              prevSessionType: session
            };
            BC.postMessage({
              evName: "autoStartCurrentSession",
              payload
            });
          } else {
            persistTimersStatesToServer(timersStatesForNextSession, idToken);
            fetchWrapper(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, "PATCH", {
              totalFocusDuration: totalFocusDurationTargeted,
              cycleDuration: cycleDurationTargeted,
              cycleStartTimestamp: 0
            }, idToken);
          }
        } else {
          console.warn("autoStartSetting is undefined");
        }
        sessionData.startTime !== 0 && persistRecOfTodayToServer(_objectSpread2({
          kind: "break"
        }, sessionData), idToken);
        break;
    }
  }

  /**
   *
   * @param {*} cycleDurationInSec to calculate currentRatio
   * @param {*} totalFocusDurationInSec to calculate currentRatio
   * @param {*} ratioTargeted
   * @param {*} end
   *
   * @returns a cycleRecord object
   */
  function getCycleRecord(cycleDurationInSec, totalFocusDurationInSec, ratioTargeted, end) {
    const currentRatio = roundTo_X_DecimalPoints(totalFocusDurationInSec / cycleDurationInSec, 2);
    return {
      ratio: currentRatio,
      cycleAdherenceRate: roundTo_X_DecimalPoints(currentRatio / ratioTargeted, 2),
      start: end - cycleDurationInSec * 1000,
      end,
      date: new Date()
    };
  }

  // same as the one in the src/index.tsx
  async function retrieveAutoStartSettingFromIDB() {
    let db = DB || (await openIndexedDB());
    const store = db.transaction("stateStore", "readonly").objectStore("stateStore");
    let result = await store.get("autoStartSetting");
    if (result !== undefined) {
      return result.value;
    } else {
      // By the time the timer is mounted, stateStore in idb is guaranteed to
      // have at least the default autoStartSetting and pomoSetting.
      return undefined;
    }
  }

  /**
   *
   * @param {*} kind "pomo" | "break"
   * @param {*} sessionData {pause: {totalLength: number; record: {start: number; end: number | undefined;}[]}, startTime: number; endTime: number; timeCountedDown: number}
   */
  async function persistSessionToIDB(kind, sessionData) {
    try {
      let db = DB || (await openIndexedDB());
      const store = db.transaction("recOfToday", "readwrite").objectStore("recOfToday");
      await store.add(_objectSpread2({
        kind
      }, sessionData));
    } catch (error) {
      console.warn(error);
    }
  }
  async function persistStatesToIDB(stateArr) {
    try {
      let db = DB || (await openIndexedDB());
      const store = db.transaction("stateStore", "readwrite").objectStore("stateStore");
      Array.from(stateArr).forEach(async obj => {
        await store.put(obj);
      });
    } catch (error) {
      console.warn(error);
    }
  }
  async function persistCategoryChangeInfoArrayToIDB(infoArr) {
    let db = DB || (await openIndexedDB());
    const store = db.transaction("categoryStore", "readwrite").objectStore("categoryStore");
    try {
      await store.put({
        name: "changeInfoArray",
        value: infoArr
      });
    } catch (error) {
      console.warn(error);
    }
  }
  async function getCategoryChangeInfoArrayFromIDB() {
    let db = DB || (await openIndexedDB());
    const store = db.transaction("categoryStore", "readwrite").objectStore("categoryStore");
    try {
      return store.get("changeInfoArray");
    } catch (error) {
      console.warn(error);
    }
  }
  async function recordPomo(startTime, idToken, categoryChangeInfoArray, taskChangeInfoArray, sessionData) {
    try {
      // console.log("taskChangeInfoArray inside recordPomo", taskChangeInfoArray);

      const timestamps = makeTimestampsFromRawData(categoryChangeInfoArray, taskChangeInfoArray, sessionData.pause.record, sessionData.endTime);
      const segments = makeSegmentsFromTimestamps(timestamps);
      const durations = makeDurationsFromSegmentsByCategoryAndTaskCombination(segments);
      const pomodoroRecordArr = makePomoRecordsFromDurations(durations, startTime);
      // TODO 이거를 global state과 합치는데 이용하려면, index.tsx로 보내야하니까,
      const taskFocusDurationMap = getTaskDurationMapFromSegments(segments);
      const taskTrackingArr = Array.from(taskFocusDurationMap.entries()).map(_ref2 => {
        let [taskId, duration] = _ref2;
        return {
          taskId,
          duration: Math.floor(duration / (60 * 1000))
        };
      });

      //#region
      BC.postMessage({
        evName: "pomoAdded",
        payload: {
          pomodoroRecordArr,
          taskTrackingArr
        }
      });

      //#endregion

      //#region Update cache

      let cache = CACHE || (await openCache(CacheName));
      // console.log("CACHE", CACHE);
      // console.log("cache in recordPomo", cache);

      const cacheUrl = BASE_URL + RESOURCE.POMODOROS;
      // console.log("cache address", cacheUrl);

      let statResponse = await cache.match(cacheUrl); //<------ was a problem. statResponse was undefined. Sol: open cache in the message event handler above.
      // console.log("statResponse", statResponse);

      if (statResponse !== undefined) {
        let statData = await statResponse.json();
        try {
          // Put the updated data back into the cache
          await cache.put(cacheUrl, new Response(JSON.stringify([...statData, ...pomodoroRecordArr]), {
            headers: {
              "Content-Type": "application/json"
            }
          }));
          console.log("Data successfully cached.");
        } catch (error) {
          console.error("Failed to put data in cache", error);
        }
      } else {
        console.warn("No existing cache entry found for ".concat(CacheName, ".")); // name I defined.
        // console.log(await getCacheNames()); // real ones.
      }
      //#endregion

      await fetchWrapper(RESOURCE.POMODOROS, "POST", {
        pomodoroRecordArr,
        taskTrackingArr
      }, idToken);
    } catch (error) {
      console.warn(error);
    }
  }
  async function persistTimersStatesToServer(states, idToken) {
    try {
      if (idToken) {
        // caching
        let cache = CACHE || (await openCache(CacheName));
        let pomoSettingAndTimerStatesResponse = await cache.match(BASE_URL + RESOURCE.USERS);
        if (pomoSettingAndTimerStatesResponse !== undefined) {
          let pomoSettingAndTimersStates = await pomoSettingAndTimerStatesResponse.json();
          pomoSettingAndTimersStates.timersStates = states;
          await cache.put(BASE_URL + RESOURCE.USERS, new Response(JSON.stringify(pomoSettingAndTimersStates)));
        }
        await fetchWrapper(RESOURCE.USERS + SUB_SET.TIMERS_STATES, "PATCH", _objectSpread2({}, states), idToken);
      }
    } catch (error) {
      console.warn(error);
    }
  }
  async function persistRecOfTodayToServer(record, idToken) {
    try {
      if (idToken) {
        //#region caching
        let cache = CACHE || (await openCache(CacheName));
        let resOfRecordOfToday = await cache.match(BASE_URL + RESOURCE.TODAY_RECORDS);
        if (resOfRecordOfToday !== undefined) {
          let recordsOfToday = await resOfRecordOfToday.json();
          recordsOfToday.push({
            record
          });
          await cache.put(BASE_URL + RESOURCE.TODAY_RECORDS, new Response(JSON.stringify(recordsOfToday)));
        }
        //#endregion

        await fetchWrapper(RESOURCE.TODAY_RECORDS, "POST", _objectSpread2({}, record), idToken);
      }
    } catch (error) {
      console.warn(error);
    }
  }
  function identifyPrevSession(_ref3) {
    let {
      howManyCountdown,
      numOfPomo,
      numOfCycle
    } = _ref3;
    if (howManyCountdown === 0) {
      // console.log("1");
      return SESSION.VERY_LAST_POMO;
    }
    if (howManyCountdown === 2 * numOfPomo * numOfCycle - 1) {
      // console.log("2");
      return SESSION.VERY_LAST_POMO;
    }
    if (numOfCycle > 1) {
      if (numOfPomo > 1) {
        // (numOfPomo, numOfCycle) = (3, 2) -> PBPBPL|PBPBP
        //                         = (2, 3) -> PBPL|PBPL|PBP
        if (howManyCountdown % 2 === 0) {
          if (howManyCountdown % (2 * numOfPomo) === 0) {
            // console.log("3");
            return SESSION.LONG_BREAK;
          }
          // console.log("4");
          return SESSION.SHORT_BREAK;
        }
        if (howManyCountdown % 2 === 1) {
          if ((howManyCountdown + 1) % (2 * numOfPomo) === 0) {
            // console.log("5");
            return SESSION.LAST_POMO;
          }
          // console.log("6");
          return SESSION.POMO;
        }
      } else if (numOfPomo === 1) {
        // numOfCycle = 3, 4 -> PL|PL|P, PL|PL|PL|P
        // Short break does not exist
        if (howManyCountdown % 2 === 0) {
          // console.log("7");
          return SESSION.LONG_BREAK;
        }
        if (howManyCountdown % 2 === 1) {
          // console.log("8");
          return SESSION.LAST_POMO;
        }
      }
    } else if (numOfCycle === 1) {
      // Long break does not exist
      if (numOfPomo > 1) {
        // numOfPomo = 2, 5 -> PBP, PBPBPBPBP
        if (howManyCountdown % 2 === 1) {
          // console.log("9");
          return SESSION.POMO;
        }
        if (howManyCountdown % 2 === 0) {
          // console.log("10");
          return SESSION.SHORT_BREAK;
        }
      } else if (numOfPomo === 1) {
        // P
        // console.log("11");
        return SESSION.VERY_LAST_POMO; // 여기까지 안오고 두번째 conditional block에 걸리네 그냥..
      }
    }

    // console.log("12");

    return SESSION.POMO; //dummy
  }

  /**
   *
   * @param {*} URL string that comes after BASE_URL
   * @param {*} METHOD "POST" | "GET" | "PATCH" | "DELETE"
   * @param {*} data this is going to be stringified
   * @param {*} idToken string | null
   * @returns
   */
  async function fetchWrapper(URL, METHOD, data, idToken) {
    //* idToken이 null인지 아닌지를 이곳에서 일관되게 체크하는게 좋을 것 같아서 아래처럼 했는데,
    //* 그렇게 하면, 이전에 만들어 놓은 코드들을 봤을 때, 어차피 이곳에서 반려되는데, 이곳까지 도달하기 까지 불필요하게 실행되는 것들이 너무 많다고 판단되서 기존방식 유지하겠음.
    //* 그래도 혹시 fetchWrapper 호출 시 conditional statement까먹고 안한 것 대비하기 위해 그냥 지우지 않겠음.
    if (idToken === null) return;
    try {
      const response = await fetch(BASE_URL + URL, {
        method: METHOD,
        body: JSON.stringify(data),
        headers: {
          Authorization: "Bearer " + idToken,
          "Content-Type": "application/json"
        }
      });
      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.toLowerCase() === "failed to fetch" && !navigator.onLine) {
        BC.postMessage({
          evName: "fetchCallFailed_Network_Error",
          payload: {
            url: URL,
            method: METHOD,
            data: JSON.stringify(data)
          }
        });
      } else {
        console.warn(error);
      }
    }
  }

  //-------------------------------New After Todoist Integration Feature-----------------------------
  //#region raw data to timestamps
  function makeTimestampsFromRawData(categoryChangeInfoArray, taskChangeInfoArray, pauseRecord, endTime) {
    const categoryChanges = transformCategoryChangeInfoArray(categoryChangeInfoArray);
    const taskChanges = transformTaskChangesArray(taskChangeInfoArray);
    const pauseRecords = transformPauseRecords(pauseRecord);
    const data = [...categoryChanges, ...taskChanges, ...pauseRecords];
    data.sort((a, b) => a.timestamp - b.timestamp);
    data.push({
      kind: "endOfSession",
      timestamp: endTime
    });
    return data;
    function transformCategoryChangeInfoArray(categoryChangeInfoArray) {
      return categoryChangeInfoArray.map(val => ({
        kind: "category",
        subKind: val.categoryName,
        timestamp: val.categoryChangeTimestamp
      }));
    }
    function transformTaskChangesArray(taskChangeInfoArray) {
      return taskChangeInfoArray.map(val => ({
        kind: "task",
        subKind: val.id,
        timestamp: val.taskChangeTimestamp
      }));
    }
    function transformPauseRecords(pauseRecords) {
      return pauseRecords.flatMap(val => [{
        kind: "pause",
        subKind: "start",
        timestamp: val.start
      }, {
        kind: "pause",
        subKind: "end",
        timestamp: val.end
      }]);
    }
  }
  //#endregion

  //#region timestamps to segments - Array<InfoOfSessionStateChange> -> Array<SessionSegment>
  function makeSegmentsFromTimestamps(timestampData) {
    const segArrAndHelper = timestampData.reduce(timestamps_to_segments, {
      segmentDurationArr: [],
      currentType: "focus",
      currentOwner: ["", ""],
      currentStartTime: 0
    });
    return segArrAndHelper.segmentDurationArr;
  }
  function timestamps_to_segments(acc, val, idx, _array) {
    // 로직:
    // 1. currentValue가 이제 Info니까... 우선 그냥 timestamp이용해서 시간 간격을 계산한다.
    // 2. 그리고 이제 currentValue.kind가 무엇이냐에 따라서...
    if (idx === 0) {
      // segments의 첫번째가 pause일리 없기 때문에 index가 0인 경우는 그냥 kind는 category일 것이므로, 바로 name을 owner로 설정한다.
      // kind와 name의 조합이 어떤 의미인지 맨 위의 comment를 보면 이해할 수 있다.
      if (val.kind === "category") {
        acc.currentOwner[0] = val.subKind;
      } else if (val.kind === "task") {
        acc.currentOwner[1] = val.subKind;
      }
      acc.currentStartTime = val.timestamp; // startTime으로 값이 같을테니 idx === 1일때는 할당해주지 않는다.
      return acc;
    }
    if (idx === 1) {
      if (val.kind === "category") {
        acc.currentOwner[0] = val.subKind;
      } else if (val.kind === "task") {
        acc.currentOwner[1] = val.subKind;
      }
      return acc;
    }
    const duration_in_ms = val.timestamp - _array[idx - 1].timestamp;
    // const duration_in_min = Math.floor(duration_in_ms / (60 * 1000));

    // Session의 상태에 변화가 있을 때마다 timestamp가 찍혔었고 (pasue, category change), 그 사이의 duration을 계산한다.
    // duration_in_ms는 방금의 변화에 의해 일단락된 segment의 duration을 의미한다.
    switch (val.kind) {
      case "pause":
        if (val.subKind === "start") {
          acc.segmentDurationArr.push({
            owner: [acc.currentOwner[0], acc.currentOwner[1]],
            duration: duration_in_ms,
            type: acc.currentType,
            startTime: acc.currentStartTime
          });
          acc.currentType = "pause";
          acc.currentStartTime = val.timestamp;
        }
        if (val.subKind === "end") {
          acc.segmentDurationArr.push({
            owner: [acc.currentOwner[0], acc.currentOwner[1]],
            duration: duration_in_ms,
            type: acc.currentType,
            startTime: acc.currentStartTime
          });
          acc.currentType = "focus";
          acc.currentStartTime = val.timestamp;
        }
        break;
      case "category":
        acc.segmentDurationArr.push({
          owner: [acc.currentOwner[0], acc.currentOwner[1]],
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime
        });
        acc.currentOwner[0] = val.subKind; // category가 바뀌었으므로, owner도 바꿔준다.
        acc.currentStartTime = val.timestamp;
        break;
      case "task":
        acc.segmentDurationArr.push({
          owner: [acc.currentOwner[0], acc.currentOwner[1]],
          duration: duration_in_ms,
          type: acc.currentType,
          startTime: acc.currentStartTime
        });
        acc.currentOwner[1] = val.subKind;
        acc.currentStartTime = val.timestamp;
        break;
      case "endOfSession":
        if (duration_in_ms !== 0)
          // A session is forcibly ended by a user during a pause.
          acc.segmentDurationArr.push({
            owner: [acc.currentOwner[0], acc.currentOwner[1]],
            duration: duration_in_ms,
            type: acc.currentType,
            startTime: acc.currentStartTime
          });
        break;
    }
    return acc;
  }
  //#endregion

  //#region segments to durations - aggregate the same session by the same kind
  //#region by task & category combination
  function makeDurationsFromSegmentsByCategoryAndTaskCombination(segmentData) {
    const durationAndHelper = segmentData.reduce(segments_to_durations, {
      durationArrOfCategoryTaskCombination: [],
      currentCategoryTaskCombination: ["", ""]
    });
    return durationAndHelper.durationArrOfCategoryTaskCombination;
  }
  function segments_to_durations(acc, segment, idx) {
    if (idx === 0) {
      acc.durationArrOfCategoryTaskCombination.push({
        categoryName: segment.owner[0],
        taskId: segment.owner[1],
        duration: segment.duration,
        startTime: segment.startTime
      });
      acc.currentCategoryTaskCombination[0] = segment.owner[0];
      acc.currentCategoryTaskCombination[1] = segment.owner[1];
      return acc;
    }

    // Check if this segment has the SAME owner as the current one
    if (segment.owner[0] === acc.currentCategoryTaskCombination[0] && segment.owner[1] === acc.currentCategoryTaskCombination[1]) {
      // Same owner - aggregate the duration if it's a focus type
      if (segment.type === "focus") {
        acc.durationArrOfCategoryTaskCombination[acc.durationArrOfCategoryTaskCombination.length - 1].duration += segment.duration;
      }
    } else {
      // Different owner - create a new entry
      const newDuration = {
        categoryName: segment.owner[0],
        taskId: segment.owner[1],
        duration: segment.type === "focus" ? segment.duration : 0,
        startTime: segment.startTime
      };
      acc.durationArrOfCategoryTaskCombination.push(newDuration);
      acc.currentCategoryTaskCombination = [segment.owner[0], segment.owner[1]];
    }
    return acc;
  }
  //#endregion task & category
  //#region by task
  /**
   * Aggregates focus durations by taskId only (ignores category).
   * Only "focus" segments are counted.
   */
  function getTaskDurationMapFromSegments(segments) {
    const TaskDurationMap = segments.reduce((acc, segment) => {
      const taskId = segment.owner[1];
      if (segment.type !== "focus" || !taskId) return acc;
      if (acc.has(taskId)) {
        // If the taskId already exists, add the duration to the existing value
        acc.set(taskId, acc.get(taskId) + segment.duration);
      } else {
        acc.set(taskId, segment.duration);
      }
      return acc;
    }, new Map());
    return TaskDurationMap;
  }
  function segments_to_task_durations(acc, segment) {
    const taskId = segment.owner[1];
    if (segment.type !== "focus" || !taskId) return acc;
    if (acc.has(taskId)) {
      acc.get(taskId).duration += segment.duration;
    } else {
      acc.set(taskId, {
        duration: segment.duration
      });
    }
    return acc;
  }
  //#endregion by task
  //#endregion

  //#region durations to pomoRecords
  function makePomoRecordsFromDurations(durations, startTime) {
    const today = new Date(startTime);
    let LocaleDateString = "".concat(today.getMonth() + 1, "/").concat(today.getDate(), "/").concat(today.getFullYear());
    return convertMilliSecToMin2(durations).map(val => {
      // 카테고리가 uncategorized인 경우 category field를 넣지 않고,
      // 마찬가지로 taskId가 ""인 경우 task field를 넣지 않는다.

      let pomoRecord = {
        duration: val.duration,
        startTime: val.startTime,
        date: LocaleDateString,
        isDummy: false
      };
      if (val.categoryName !== "uncategorized") {
        pomoRecord = _objectSpread2(_objectSpread2({}, pomoRecord), {}, {
          category: {
            name: val.categoryName
          }
        });
      }

      //! none task is removed
      if (val.taskId !== "") {
        pomoRecord = _objectSpread2(_objectSpread2({}, pomoRecord), {}, {
          task: {
            id: val.taskId
          }
        });
      }
      return pomoRecord;
    });
  }
  function convertMilliSecToMin2(durationArrOfCategoryTaskCombination) {
    return durationArrOfCategoryTaskCombination.map(val => {
      // console.log(
      //   "<-------------------------------convertMilliSecToMin---------------------------------->"
      // );
      // console.log(val);
      return _objectSpread2(_objectSpread2({}, val), {}, {
        duration: Math.floor(val.duration / (60 * 1000))
      });
    });
  }
  //#endregion

  //#region utilities for category change
  function roundTo_X_DecimalPoints(num, X) {
    return Math.round(num * 10 ** X) / 10 ** X;
  }
  //#endregion
  //#endregion

  exports.convertMilliSecToMin2 = convertMilliSecToMin2;
  exports.getTaskDurationMapFromSegments = getTaskDurationMapFromSegments;
  exports.makeDurationsFromSegmentsByCategoryAndTaskCombination = makeDurationsFromSegmentsByCategoryAndTaskCombination;
  exports.makePomoRecordsFromDurations = makePomoRecordsFromDurations;
  exports.makeSegmentsFromTimestamps = makeSegmentsFromTimestamps;
  exports.makeTimestampsFromRawData = makeTimestampsFromRawData;
  exports.segments_to_durations = segments_to_durations;
  exports.segments_to_task_durations = segments_to_task_durations;
  exports.timestamps_to_segments = timestamps_to_segments;

  return exports;

})({});
