(function () {
  'use strict';

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      enumerableOnly && (symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })), keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }

    return target;
  }

  function _regeneratorRuntime() {
    /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */

    _regeneratorRuntime = function () {
      return exports;
    };

    var exports = {},
        Op = Object.prototype,
        hasOwn = Op.hasOwnProperty,
        $Symbol = "function" == typeof Symbol ? Symbol : {},
        iteratorSymbol = $Symbol.iterator || "@@iterator",
        asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
        toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

    function define(obj, key, value) {
      return Object.defineProperty(obj, key, {
        value: value,
        enumerable: !0,
        configurable: !0,
        writable: !0
      }), obj[key];
    }

    try {
      define({}, "");
    } catch (err) {
      define = function (obj, key, value) {
        return obj[key] = value;
      };
    }

    function wrap(innerFn, outerFn, self, tryLocsList) {
      var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
          generator = Object.create(protoGenerator.prototype),
          context = new Context(tryLocsList || []);
      return generator._invoke = function (innerFn, self, context) {
        var state = "suspendedStart";
        return function (method, arg) {
          if ("executing" === state) throw new Error("Generator is already running");

          if ("completed" === state) {
            if ("throw" === method) throw arg;
            return doneResult();
          }

          for (context.method = method, context.arg = arg;;) {
            var delegate = context.delegate;

            if (delegate) {
              var delegateResult = maybeInvokeDelegate(delegate, context);

              if (delegateResult) {
                if (delegateResult === ContinueSentinel) continue;
                return delegateResult;
              }
            }

            if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
              if ("suspendedStart" === state) throw state = "completed", context.arg;
              context.dispatchException(context.arg);
            } else "return" === context.method && context.abrupt("return", context.arg);
            state = "executing";
            var record = tryCatch(innerFn, self, context);

            if ("normal" === record.type) {
              if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
              return {
                value: record.arg,
                done: context.done
              };
            }

            "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
          }
        };
      }(innerFn, self, context), generator;
    }

    function tryCatch(fn, obj, arg) {
      try {
        return {
          type: "normal",
          arg: fn.call(obj, arg)
        };
      } catch (err) {
        return {
          type: "throw",
          arg: err
        };
      }
    }

    exports.wrap = wrap;
    var ContinueSentinel = {};

    function Generator() {}

    function GeneratorFunction() {}

    function GeneratorFunctionPrototype() {}

    var IteratorPrototype = {};
    define(IteratorPrototype, iteratorSymbol, function () {
      return this;
    });
    var getProto = Object.getPrototypeOf,
        NativeIteratorPrototype = getProto && getProto(getProto(values([])));
    NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
    var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);

    function defineIteratorMethods(prototype) {
      ["next", "throw", "return"].forEach(function (method) {
        define(prototype, method, function (arg) {
          return this._invoke(method, arg);
        });
      });
    }

    function AsyncIterator(generator, PromiseImpl) {
      function invoke(method, arg, resolve, reject) {
        var record = tryCatch(generator[method], generator, arg);

        if ("throw" !== record.type) {
          var result = record.arg,
              value = result.value;
          return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
            invoke("next", value, resolve, reject);
          }, function (err) {
            invoke("throw", err, resolve, reject);
          }) : PromiseImpl.resolve(value).then(function (unwrapped) {
            result.value = unwrapped, resolve(result);
          }, function (error) {
            return invoke("throw", error, resolve, reject);
          });
        }

        reject(record.arg);
      }

      var previousPromise;

      this._invoke = function (method, arg) {
        function callInvokeWithMethodAndArg() {
          return new PromiseImpl(function (resolve, reject) {
            invoke(method, arg, resolve, reject);
          });
        }

        return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
      };
    }

    function maybeInvokeDelegate(delegate, context) {
      var method = delegate.iterator[context.method];

      if (undefined === method) {
        if (context.delegate = null, "throw" === context.method) {
          if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
          context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
        }

        return ContinueSentinel;
      }

      var record = tryCatch(method, delegate.iterator, context.arg);
      if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
      var info = record.arg;
      return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
    }

    function pushTryEntry(locs) {
      var entry = {
        tryLoc: locs[0]
      };
      1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
    }

    function resetTryEntry(entry) {
      var record = entry.completion || {};
      record.type = "normal", delete record.arg, entry.completion = record;
    }

    function Context(tryLocsList) {
      this.tryEntries = [{
        tryLoc: "root"
      }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
    }

    function values(iterable) {
      if (iterable) {
        var iteratorMethod = iterable[iteratorSymbol];
        if (iteratorMethod) return iteratorMethod.call(iterable);
        if ("function" == typeof iterable.next) return iterable;

        if (!isNaN(iterable.length)) {
          var i = -1,
              next = function next() {
            for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;

            return next.value = undefined, next.done = !0, next;
          };

          return next.next = next;
        }
      }

      return {
        next: doneResult
      };
    }

    function doneResult() {
      return {
        value: undefined,
        done: !0
      };
    }

    return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
      var ctor = "function" == typeof genFun && genFun.constructor;
      return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
    }, exports.mark = function (genFun) {
      return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
    }, exports.awrap = function (arg) {
      return {
        __await: arg
      };
    }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
      return this;
    }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
      void 0 === PromiseImpl && (PromiseImpl = Promise);
      var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
      return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
        return result.done ? result.value : iter.next();
      });
    }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
      return this;
    }), define(Gp, "toString", function () {
      return "[object Generator]";
    }), exports.keys = function (object) {
      var keys = [];

      for (var key in object) keys.push(key);

      return keys.reverse(), function next() {
        for (; keys.length;) {
          var key = keys.pop();
          if (key in object) return next.value = key, next.done = !1, next;
        }

        return next.done = !0, next;
      };
    }, exports.values = values, Context.prototype = {
      constructor: Context,
      reset: function (skipTempReset) {
        if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
      },
      stop: function () {
        this.done = !0;
        var rootRecord = this.tryEntries[0].completion;
        if ("throw" === rootRecord.type) throw rootRecord.arg;
        return this.rval;
      },
      dispatchException: function (exception) {
        if (this.done) throw exception;
        var context = this;

        function handle(loc, caught) {
          return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
        }

        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i],
              record = entry.completion;
          if ("root" === entry.tryLoc) return handle("end");

          if (entry.tryLoc <= this.prev) {
            var hasCatch = hasOwn.call(entry, "catchLoc"),
                hasFinally = hasOwn.call(entry, "finallyLoc");

            if (hasCatch && hasFinally) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            } else if (hasCatch) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            } else {
              if (!hasFinally) throw new Error("try statement without catch or finally");
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            }
          }
        }
      },
      abrupt: function (type, arg) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];

          if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
            var finallyEntry = entry;
            break;
          }
        }

        finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
        var record = finallyEntry ? finallyEntry.completion : {};
        return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
      },
      complete: function (record, afterLoc) {
        if ("throw" === record.type) throw record.arg;
        return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
      },
      finish: function (finallyLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];
          if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
        }
      },
      catch: function (tryLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];

          if (entry.tryLoc === tryLoc) {
            var record = entry.completion;

            if ("throw" === record.type) {
              var thrown = record.arg;
              resetTryEntry(entry);
            }

            return thrown;
          }
        }

        throw new Error("illegal catch attempt");
      },
      delegateYield: function (iterable, resultName, nextLoc) {
        return this.delegate = {
          iterator: values(iterable),
          resultName: resultName,
          nextLoc: nextLoc
        }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
      }
    }, exports;
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }

    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
          args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }

        _next(undefined);
      });
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

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
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
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

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    Object.defineProperty(subClass, "prototype", {
      writable: false
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
    return _setPrototypeOf(o, p);
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct.bind();
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }

    return _assertThisInitialized(self);
  }

  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();

    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived),
          result;

      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;

        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }

      return _possibleConstructorReturn(this, result);
    };
  }

  function _superPropBase(object, property) {
    while (!Object.prototype.hasOwnProperty.call(object, property)) {
      object = _getPrototypeOf(object);
      if (object === null) break;
    }

    return object;
  }

  function _get() {
    if (typeof Reflect !== "undefined" && Reflect.get) {
      _get = Reflect.get.bind();
    } else {
      _get = function _get(target, property, receiver) {
        var base = _superPropBase(target, property);

        if (!base) return;
        var desc = Object.getOwnPropertyDescriptor(base, property);

        if (desc.get) {
          return desc.get.call(arguments.length < 3 ? target : receiver);
        }

        return desc.value;
      };
    }

    return _get.apply(this, arguments);
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

    if (!it) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = it.call(o);
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  var instanceOfAny$1 = function instanceOfAny(object, constructors) {
    return constructors.some(function (c) {
      return object instanceof c;
    });
  };

  var idbProxyableTypes$1;
  var cursorAdvanceMethods$1; // This is a function to prevent it throwing up in node environments.

  function getIdbProxyableTypes$1() {
    return idbProxyableTypes$1 || (idbProxyableTypes$1 = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction]);
  } // This is a function to prevent it throwing up in node environments.


  function getCursorAdvanceMethods$1() {
    return cursorAdvanceMethods$1 || (cursorAdvanceMethods$1 = [IDBCursor.prototype.advance, IDBCursor.prototype.continue, IDBCursor.prototype.continuePrimaryKey]);
  }

  var cursorRequestMap$1 = new WeakMap();
  var transactionDoneMap$1 = new WeakMap();
  var transactionStoreNamesMap$1 = new WeakMap();
  var transformCache$1 = new WeakMap();
  var reverseTransformCache$1 = new WeakMap();

  function promisifyRequest$1(request) {
    var promise = new Promise(function (resolve, reject) {
      var unlisten = function unlisten() {
        request.removeEventListener('success', success);
        request.removeEventListener('error', error);
      };

      var success = function success() {
        resolve(wrap$1(request.result));
        unlisten();
      };

      var error = function error() {
        reject(request.error);
        unlisten();
      };

      request.addEventListener('success', success);
      request.addEventListener('error', error);
    });
    promise.then(function (value) {
      // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
      // (see wrapFunction).
      if (value instanceof IDBCursor) {
        cursorRequestMap$1.set(value, request);
      } // Catching to avoid "Uncaught Promise exceptions"

    }).catch(function () {}); // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.

    reverseTransformCache$1.set(promise, request);
    return promise;
  }

  function cacheDonePromiseForTransaction$1(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap$1.has(tx)) return;
    var done = new Promise(function (resolve, reject) {
      var unlisten = function unlisten() {
        tx.removeEventListener('complete', complete);
        tx.removeEventListener('error', error);
        tx.removeEventListener('abort', error);
      };

      var complete = function complete() {
        resolve();
        unlisten();
      };

      var error = function error() {
        reject(tx.error || new DOMException('AbortError', 'AbortError'));
        unlisten();
      };

      tx.addEventListener('complete', complete);
      tx.addEventListener('error', error);
      tx.addEventListener('abort', error);
    }); // Cache it for later retrieval.

    transactionDoneMap$1.set(tx, done);
  }

  var idbProxyTraps$1 = {
    get: function get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        // Special handling for transaction.done.
        if (prop === 'done') return transactionDoneMap$1.get(target); // Polyfill for objectStoreNames because of Edge.

        if (prop === 'objectStoreNames') {
          return target.objectStoreNames || transactionStoreNamesMap$1.get(target);
        } // Make tx.store return the only store in the transaction, or undefined if there are many.


        if (prop === 'store') {
          return receiver.objectStoreNames[1] ? undefined : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      } // Else transform whatever we get back.


      return wrap$1(target[prop]);
    },
    set: function set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has: function has(target, prop) {
      if (target instanceof IDBTransaction && (prop === 'done' || prop === 'store')) {
        return true;
      }

      return prop in target;
    }
  };

  function replaceTraps$1(callback) {
    idbProxyTraps$1 = callback(idbProxyTraps$1);
  }

  function wrapFunction$1(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction && !('objectStoreNames' in IDBTransaction.prototype)) {
      return function (storeNames) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        var tx = func.call.apply(func, [unwrap$1(this), storeNames].concat(args));
        transactionStoreNamesMap$1.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap$1(tx);
      };
    } // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.


    if (getCursorAdvanceMethods$1().includes(func)) {
      return function () {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        func.apply(unwrap$1(this), args);
        return wrap$1(cursorRequestMap$1.get(this));
      };
    }

    return function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
      // the original object.
      return wrap$1(func.apply(unwrap$1(this), args));
    };
  }

  function transformCachableValue$1(value) {
    if (typeof value === 'function') return wrapFunction$1(value); // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).

    if (value instanceof IDBTransaction) cacheDonePromiseForTransaction$1(value);
    if (instanceOfAny$1(value, getIdbProxyableTypes$1())) return new Proxy(value, idbProxyTraps$1); // Return the same value back if we're not going to transform it.

    return value;
  }

  function wrap$1(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest) return promisifyRequest$1(value); // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.

    if (transformCache$1.has(value)) return transformCache$1.get(value);
    var newValue = transformCachableValue$1(value); // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.

    if (newValue !== value) {
      transformCache$1.set(value, newValue);
      reverseTransformCache$1.set(newValue, value);
    }

    return newValue;
  }

  var unwrap$1 = function unwrap(value) {
    return reverseTransformCache$1.get(value);
  };

  var readMethods$1 = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
  var writeMethods$1 = ['put', 'add', 'delete', 'clear'];
  var cachedMethods$1 = new Map();

  function getMethod$1(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === 'string')) {
      return;
    }

    if (cachedMethods$1.get(prop)) return cachedMethods$1.get(prop);
    var targetFuncName = prop.replace(/FromIndex$/, '');
    var useIndex = prop !== targetFuncName;
    var isWrite = writeMethods$1.includes(targetFuncName);

    if ( // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods$1.includes(targetFuncName))) {
      return;
    }

    var method = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(storeName) {
        var _target;

        var tx,
            target,
            _len,
            args,
            _key,
            _args = arguments;

        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
                tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
                target = tx.store;

                for (_len = _args.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                  args[_key - 1] = _args[_key];
                }

                if (useIndex) target = target.index(args.shift()); // Must reject if op rejects.
                // If it's a write operation, must reject if tx.done rejects.
                // Must reject with op rejection first.
                // Must resolve with op value.
                // Must handle both promises (no unhandled rejections)

                _context.next = 6;
                return Promise.all([(_target = target)[targetFuncName].apply(_target, args), isWrite && tx.done]);

              case 6:
                return _context.abrupt("return", _context.sent[0]);

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      return function method(_x) {
        return _ref3.apply(this, arguments);
      };
    }();

    cachedMethods$1.set(prop, method);
    return method;
  }

  replaceTraps$1(function (oldTraps) {
    return _objectSpread2(_objectSpread2({}, oldTraps), {}, {
      get: function get(target, prop, receiver) {
        return getMethod$1(target, prop) || oldTraps.get(target, prop, receiver);
      },
      has: function has(target, prop) {
        return !!getMethod$1(target, prop) || oldTraps.has(target, prop);
      }
    });
  });

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


  var stringToByteArray$1 = function stringToByteArray$1(str) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var p = 0;

    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);

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


  var byteArrayToString = function byteArrayToString(bytes) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var pos = 0,
        c = 0;

    while (pos < bytes.length) {
      var c1 = bytes[pos++];

      if (c1 < 128) {
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        var c2 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        // Surrogate Pair
        var _c = bytes[pos++];
        var c3 = bytes[pos++];
        var c4 = bytes[pos++];
        var u = ((c1 & 7) << 18 | (_c & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
        out[c++] = String.fromCharCode(0xd800 + (u >> 10));
        out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
      } else {
        var _c2 = bytes[pos++];
        var _c3 = bytes[pos++];
        out[c++] = String.fromCharCode((c1 & 15) << 12 | (_c2 & 63) << 6 | _c3 & 63);
      }
    }

    return out.join('');
  }; // We define it as an object literal instead of a class because a class compiled down to es5 can't
  // be treeshaked. https://github.com/rollup/rollup/issues/1691
  // Static lookup maps, lazily populated by init_()


  var base64 = {
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
    encodeByteArray: function encodeByteArray(input, webSafe) {
      if (!Array.isArray(input)) {
        throw Error('encodeByteArray takes an array as a parameter');
      }

      this.init_();
      var byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
      var output = [];

      for (var i = 0; i < input.length; i += 3) {
        var byte1 = input[i];
        var haveByte2 = i + 1 < input.length;
        var byte2 = haveByte2 ? input[i + 1] : 0;
        var haveByte3 = i + 2 < input.length;
        var byte3 = haveByte3 ? input[i + 2] : 0;
        var outByte1 = byte1 >> 2;
        var outByte2 = (byte1 & 0x03) << 4 | byte2 >> 4;
        var outByte3 = (byte2 & 0x0f) << 2 | byte3 >> 6;
        var outByte4 = byte3 & 0x3f;

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
    encodeString: function encodeString(input, webSafe) {
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
    decodeString: function decodeString(input, webSafe) {
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
    decodeStringToByteArray: function decodeStringToByteArray(input, webSafe) {
      this.init_();
      var charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
      var output = [];

      for (var i = 0; i < input.length;) {
        var byte1 = charToByteMap[input.charAt(i++)];
        var haveByte2 = i < input.length;
        var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
        ++i;
        var haveByte3 = i < input.length;
        var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
        ++i;
        var haveByte4 = i < input.length;
        var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
        ++i;

        if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
          throw Error();
        }

        var outByte1 = byte1 << 2 | byte2 >> 4;
        output.push(outByte1);

        if (byte3 !== 64) {
          var outByte2 = byte2 << 4 & 0xf0 | byte3 >> 2;
          output.push(outByte2);

          if (byte4 !== 64) {
            var outByte3 = byte3 << 6 & 0xc0 | byte4;
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
    init_: function init_() {
      if (!this.byteToCharMap_) {
        this.byteToCharMap_ = {};
        this.charToByteMap_ = {};
        this.byteToCharMapWebSafe_ = {};
        this.charToByteMapWebSafe_ = {}; // We want quick mappings back and forth, so we precompute two maps.

        for (var i = 0; i < this.ENCODED_VALS.length; i++) {
          this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
          this.charToByteMap_[this.byteToCharMap_[i]] = i;
          this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
          this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i; // Be forgiving when decoding and correctly decode both encodings.

          if (i >= this.ENCODED_VALS_BASE.length) {
            this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
            this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
          }
        }
      }
    }
  };
  /**
   * URL-safe base64 encoding
   */

  var base64Encode = function base64Encode(str) {
    var utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
  };
  /**
   * URL-safe base64 encoding (without "." padding in the end).
   * e.g. Used in JSON Web Token (JWT) parts.
   */


  var base64urlEncodeWithoutPadding = function base64urlEncodeWithoutPadding(str) {
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


  var base64Decode = function base64Decode(str) {
    try {
      return base64.decodeString(str, true);
    } catch (e) {
      console.error('base64Decode failed: ', e);
    }

    return null;
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


  var Deferred = /*#__PURE__*/function () {
    function Deferred() {
      var _this = this;

      _classCallCheck(this, Deferred);

      this.reject = function () {};

      this.resolve = function () {};

      this.promise = new Promise(function (resolve, reject) {
        _this.resolve = resolve;
        _this.reject = reject;
      });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */


    _createClass(Deferred, [{
      key: "wrapCallback",
      value: function wrapCallback(callback) {
        var _this2 = this;

        return function (error, value) {
          if (error) {
            _this2.reject(error);
          } else {
            _this2.resolve(value);
          }

          if (typeof callback === 'function') {
            // Attaching noop handler just in case developer wasn't expecting
            // promises
            _this2.promise.catch(function () {}); // Some of our callbacks don't expect a value and our own tests
            // assert that the parameter length is 1


            if (callback.length === 1) {
              callback(error);
            } else {
              callback(error, value);
            }
          }
        };
      }
    }]);

    return Deferred;
  }();
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
    return typeof window !== 'undefined' && // @ts-ignore Setting up an broadly applicable index signature for Window
    // just to deal with this case would probably be a bad idea.
    !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
  }

  function isBrowserExtension() {
    var runtime = (typeof chrome === "undefined" ? "undefined" : _typeof(chrome)) === 'object' ? chrome.runtime : (typeof browser === "undefined" ? "undefined" : _typeof(browser)) === 'object' ? browser.runtime : undefined;
    return _typeof(runtime) === 'object' && runtime.id !== undefined;
  }
  /**
   * Detect React Native.
   *
   * @return true if ReactNative environment is detected.
   */


  function isReactNative() {
    return (typeof navigator === "undefined" ? "undefined" : _typeof(navigator)) === 'object' && navigator['product'] === 'ReactNative';
  }
  /** Detects Internet Explorer. */


  function isIE() {
    var ua = getUA();
    return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
  }
  /**
   * This method checks if indexedDB is supported by current browser/service worker context
   * @return true if indexedDB is supported by current browser/service worker context
   */


  function isIndexedDBAvailable() {
    return (typeof indexedDB === "undefined" ? "undefined" : _typeof(indexedDB)) === 'object';
  }
  /**
   * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
   * if errors occur during the database open operation.
   *
   * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
   * private browsing)
   */


  function validateIndexedDBOpenable() {
    return new Promise(function (resolve, reject) {
      try {
        var preExist = true;
        var DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
        var request = self.indexedDB.open(DB_CHECK_NAME);

        request.onsuccess = function () {
          request.result.close(); // delete database only when it doesn't pre-exist

          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }

          resolve(true);
        };

        request.onupgradeneeded = function () {
          preExist = false;
        };

        request.onerror = function () {
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


  var ERROR_NAME = 'FirebaseError'; // Based on code from:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types

  var FirebaseError = /*#__PURE__*/function (_Error) {
    _inherits(FirebaseError, _Error);

    var _super = _createSuper(FirebaseError);

    function FirebaseError(
    /** The error code for this error. */
    code, message,
    /** Custom data for this error. */
    customData) {
      var _this3;

      _classCallCheck(this, FirebaseError);

      _this3 = _super.call(this, message);
      _this3.code = code;
      _this3.customData = customData;
      /** The custom name for all FirebaseErrors. */

      _this3.name = ERROR_NAME; // Fix For ES5
      // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

      Object.setPrototypeOf(_assertThisInitialized(_this3), FirebaseError.prototype); // Maintains proper stack trace for where our error was thrown.
      // Only available on V8.

      if (Error.captureStackTrace) {
        Error.captureStackTrace(_assertThisInitialized(_this3), ErrorFactory.prototype.create);
      }

      return _this3;
    }

    return _createClass(FirebaseError);
  }( /*#__PURE__*/_wrapNativeSuper(Error));

  var ErrorFactory = /*#__PURE__*/function () {
    function ErrorFactory(service, serviceName, errors) {
      _classCallCheck(this, ErrorFactory);

      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }

    _createClass(ErrorFactory, [{
      key: "create",
      value: function create(code) {
        var customData = (arguments.length <= 1 ? undefined : arguments[1]) || {};
        var fullCode = "".concat(this.service, "/").concat(code);
        var template = this.errors[code];
        var message = template ? replaceTemplate(template, customData) : 'Error'; // Service Name: Error message (service/code).

        var fullMessage = "".concat(this.serviceName, ": ").concat(message, " (").concat(fullCode, ").");
        var error = new FirebaseError(fullCode, fullMessage, customData);
        return error;
      }
    }]);

    return ErrorFactory;
  }();

  function replaceTemplate(template, data) {
    return template.replace(PATTERN, function (_, key) {
      var value = data[key];
      return value != null ? String(value) : "<".concat(key, "?>");
    });
  }

  var PATTERN = /\{\$([^}]+)}/g;

  function isEmpty(obj) {
    for (var key in obj) {
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

    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    for (var _i = 0, _aKeys = aKeys; _i < _aKeys.length; _i++) {
      var k = _aKeys[_i];

      if (!bKeys.includes(k)) {
        return false;
      }

      var aProp = a[k];
      var bProp = b[k];

      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }

    for (var _i2 = 0, _bKeys = bKeys; _i2 < _bKeys.length; _i2++) {
      var _k = _bKeys[_i2];

      if (!aKeys.includes(_k)) {
        return false;
      }
    }

    return true;
  }

  function isObject(thing) {
    return thing !== null && _typeof(thing) === 'object';
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
    var params = [];

    var _loop = function _loop() {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i3], 2),
          key = _Object$entries$_i[0],
          value = _Object$entries$_i[1];

      if (Array.isArray(value)) {
        value.forEach(function (arrayVal) {
          params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
        });
      } else {
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      }
    };

    for (var _i3 = 0, _Object$entries = Object.entries(querystringParams); _i3 < _Object$entries.length; _i3++) {
      _loop();
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
    var proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
  }
  /**
   * Implement fan-out for any number of Observers attached via a subscribe
   * function.
   */


  var ObserverProxy = /*#__PURE__*/function () {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function ObserverProxy(executor, onNoObservers) {
      var _this4 = this;

      _classCallCheck(this, ObserverProxy);

      this.observers = [];
      this.unsubscribes = [];
      this.observerCount = 0; // Micro-task scheduling by calling task.then().

      this.task = Promise.resolve();
      this.finalized = false;
      this.onNoObservers = onNoObservers; // Call the executor asynchronously so subscribers that are called
      // synchronously after the creation of the subscribe function
      // can still receive the very first value generated in the executor.

      this.task.then(function () {
        executor(_this4);
      }).catch(function (e) {
        _this4.error(e);
      });
    }

    _createClass(ObserverProxy, [{
      key: "next",
      value: function next(value) {
        this.forEachObserver(function (observer) {
          observer.next(value);
        });
      }
    }, {
      key: "error",
      value: function error(_error) {
        this.forEachObserver(function (observer) {
          observer.error(_error);
        });
        this.close(_error);
      }
    }, {
      key: "complete",
      value: function complete() {
        this.forEachObserver(function (observer) {
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

    }, {
      key: "subscribe",
      value: function subscribe(nextOrObserver, error, complete) {
        var _this5 = this;

        var observer;

        if (nextOrObserver === undefined && error === undefined && complete === undefined) {
          throw new Error('Missing Observer.');
        } // Assemble an Observer object when passed as callback functions.


        if (implementsAnyMethods(nextOrObserver, ['next', 'error', 'complete'])) {
          observer = nextOrObserver;
        } else {
          observer = {
            next: nextOrObserver,
            error: error,
            complete: complete
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

        var unsub = this.unsubscribeOne.bind(this, this.observers.length); // Attempt to subscribe to a terminated Observable - we
        // just respond to the Observer with the final error or complete
        // event.

        if (this.finalized) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.task.then(function () {
            try {
              if (_this5.finalError) {
                observer.error(_this5.finalError);
              } else {
                observer.complete();
              }
            } catch (e) {// nothing
            }

            return;
          });
        }

        this.observers.push(observer);
        return unsub;
      } // Unsubscribe is synchronous - we guarantee that no events are sent to
      // any unsubscribed Observer.

    }, {
      key: "unsubscribeOne",
      value: function unsubscribeOne(i) {
        if (this.observers === undefined || this.observers[i] === undefined) {
          return;
        }

        delete this.observers[i];
        this.observerCount -= 1;

        if (this.observerCount === 0 && this.onNoObservers !== undefined) {
          this.onNoObservers(this);
        }
      }
    }, {
      key: "forEachObserver",
      value: function forEachObserver(fn) {
        if (this.finalized) {
          // Already closed by previous event....just eat the additional values.
          return;
        } // Since sendOne calls asynchronously - there is no chance that
        // this.observers will become undefined.


        for (var i = 0; i < this.observers.length; i++) {
          this.sendOne(i, fn);
        }
      } // Call the Observer via one of it's callback function. We are careful to
      // confirm that the observe has not been unsubscribed since this asynchronous
      // function had been queued.

    }, {
      key: "sendOne",
      value: function sendOne(i, fn) {
        var _this6 = this;

        // Execute the callback asynchronously
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
          if (_this6.observers !== undefined && _this6.observers[i] !== undefined) {
            try {
              fn(_this6.observers[i]);
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
    }, {
      key: "close",
      value: function close(err) {
        var _this7 = this;

        if (this.finalized) {
          return;
        }

        this.finalized = true;

        if (err !== undefined) {
          this.finalError = err;
        } // Proxy is no longer needed - garbage collect references
        // eslint-disable-next-line @typescript-eslint/no-floating-promises


        this.task.then(function () {
          _this7.observers = undefined;
          _this7.onNoObservers = undefined;
        });
      }
    }]);

    return ObserverProxy;
  }();
  /**
   * Return true if the object passed in implements any of the named methods.
   */


  function implementsAnyMethods(obj, methods) {
    if (_typeof(obj) !== 'object' || obj === null) {
      return false;
    }

    var _iterator = _createForOfIteratorHelper(methods),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var method = _step.value;

        if (method in obj && typeof obj[method] === 'function') {
          return true;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return false;
  }

  function noop() {// do nothing
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

  var Component = /*#__PURE__*/function () {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    function Component(name, instanceFactory, type) {
      _classCallCheck(this, Component);

      this.name = name;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      /**
       * Properties to be added to the service namespace
       */

      this.serviceProps = {};
      this.instantiationMode = "LAZY"
      /* LAZY */
      ;
      this.onInstanceCreated = null;
    }

    _createClass(Component, [{
      key: "setInstantiationMode",
      value: function setInstantiationMode(mode) {
        this.instantiationMode = mode;
        return this;
      }
    }, {
      key: "setMultipleInstances",
      value: function setMultipleInstances(multipleInstances) {
        this.multipleInstances = multipleInstances;
        return this;
      }
    }, {
      key: "setServiceProps",
      value: function setServiceProps(props) {
        this.serviceProps = props;
        return this;
      }
    }, {
      key: "setInstanceCreatedCallback",
      value: function setInstanceCreatedCallback(callback) {
        this.onInstanceCreated = callback;
        return this;
      }
    }]);

    return Component;
  }();
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


  var DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';
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

  var Provider = /*#__PURE__*/function () {
    function Provider(name, container) {
      _classCallCheck(this, Provider);

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


    _createClass(Provider, [{
      key: "get",
      value: function get(identifier) {
        // if multipleInstances is not supported, use the default name
        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

        if (!this.instancesDeferred.has(normalizedIdentifier)) {
          var deferred = new Deferred();
          this.instancesDeferred.set(normalizedIdentifier, deferred);

          if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
            // initialize the service if it can be auto-initialized
            try {
              var instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });

              if (instance) {
                deferred.resolve(instance);
              }
            } catch (e) {// when the instance factory throws an exception during get(), it should not cause
              // a fatal error. We just return the unresolved promise in this case.
            }
          }
        }

        return this.instancesDeferred.get(normalizedIdentifier).promise;
      }
    }, {
      key: "getImmediate",
      value: function getImmediate(options) {
        var _a; // if multipleInstances is not supported, use the default name


        var normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
        var optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;

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
    }, {
      key: "getComponent",
      value: function getComponent() {
        return this.component;
      }
    }, {
      key: "setComponent",
      value: function setComponent(component) {
        if (component.name !== this.name) {
          throw Error("Mismatching Component ".concat(component.name, " for Provider ").concat(this.name, "."));
        }

        if (this.component) {
          throw Error("Component for ".concat(this.name, " has already been provided"));
        }

        this.component = component; // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)

        if (!this.shouldAutoInitialize()) {
          return;
        } // if the service is eager, initialize the default instance


        if (isComponentEager(component)) {
          try {
            this.getOrInitializeService({
              instanceIdentifier: DEFAULT_ENTRY_NAME$1
            });
          } catch (e) {// when the instance factory for an eager Component throws an exception during the eager
            // initialization, it should not cause a fatal error.
            // TODO: Investigate if we need to make it configurable, because some component may want to cause
            // a fatal error in this case?
          }
        } // Create service instances for the pending promises and resolve them
        // NOTE: if this.multipleInstances is false, only the default instance will be created
        // and all promises with resolve with it regardless of the identifier.


        var _iterator = _createForOfIteratorHelper(this.instancesDeferred.entries()),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var _step$value = _slicedToArray(_step.value, 2),
                instanceIdentifier = _step$value[0],
                instanceDeferred = _step$value[1];

            var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);

            try {
              // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
              var instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
              instanceDeferred.resolve(instance);
            } catch (e) {// when the instance factory throws an exception, it should not cause
              // a fatal error. We just leave the promise unresolved.
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
    }, {
      key: "clearInstance",
      value: function clearInstance() {
        var identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
        this.instancesDeferred.delete(identifier);
        this.instancesOptions.delete(identifier);
        this.instances.delete(identifier);
      } // app.delete() will call this method on every provider to delete the services
      // TODO: should we mark the provider as deleted?

    }, {
      key: "delete",
      value: function () {
        var _delete2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          var services;
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  services = Array.from(this.instances.values());
                  _context.next = 3;
                  return Promise.all([].concat(_toConsumableArray(services.filter(function (service) {
                    return 'INTERNAL' in service;
                  }) // legacy services
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map(function (service) {
                    return service.INTERNAL.delete();
                  })), _toConsumableArray(services.filter(function (service) {
                    return '_delete' in service;
                  }) // modularized services
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map(function (service) {
                    return service._delete();
                  }))));

                case 3:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        function _delete() {
          return _delete2.apply(this, arguments);
        }

        return _delete;
      }()
    }, {
      key: "isComponentSet",
      value: function isComponentSet() {
        return this.component != null;
      }
    }, {
      key: "isInitialized",
      value: function isInitialized() {
        var identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
        return this.instances.has(identifier);
      }
    }, {
      key: "getOptions",
      value: function getOptions() {
        var identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;
        return this.instancesOptions.get(identifier) || {};
      }
    }, {
      key: "initialize",
      value: function initialize() {
        var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var _opts$options = opts.options,
            options = _opts$options === void 0 ? {} : _opts$options;
        var normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);

        if (this.isInitialized(normalizedIdentifier)) {
          throw Error("".concat(this.name, "(").concat(normalizedIdentifier, ") has already been initialized"));
        }

        if (!this.isComponentSet()) {
          throw Error("Component ".concat(this.name, " has not been registered yet"));
        }

        var instance = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier,
          options: options
        }); // resolve any pending promise waiting for the service instance

        var _iterator2 = _createForOfIteratorHelper(this.instancesDeferred.entries()),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var _step2$value = _slicedToArray(_step2.value, 2),
                instanceIdentifier = _step2$value[0],
                instanceDeferred = _step2$value[1];

            var normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);

            if (normalizedIdentifier === normalizedDeferredIdentifier) {
              instanceDeferred.resolve(instance);
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
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

    }, {
      key: "onInit",
      value: function onInit(callback, identifier) {
        var _a;

        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        var existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
        existingCallbacks.add(callback);
        this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
        var existingInstance = this.instances.get(normalizedIdentifier);

        if (existingInstance) {
          callback(existingInstance, normalizedIdentifier);
        }

        return function () {
          existingCallbacks.delete(callback);
        };
      }
      /**
       * Invoke onInit callbacks synchronously
       * @param instance the service instance`
       */

    }, {
      key: "invokeOnInitCallbacks",
      value: function invokeOnInitCallbacks(instance, identifier) {
        var callbacks = this.onInitCallbacks.get(identifier);

        if (!callbacks) {
          return;
        }

        var _iterator3 = _createForOfIteratorHelper(callbacks),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var callback = _step3.value;

            try {
              callback(instance, identifier);
            } catch (_a) {// ignore errors in the onInit callback
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    }, {
      key: "getOrInitializeService",
      value: function getOrInitializeService(_ref) {
        var instanceIdentifier = _ref.instanceIdentifier,
            _ref$options = _ref.options,
            options = _ref$options === void 0 ? {} : _ref$options;
        var instance = this.instances.get(instanceIdentifier);

        if (!instance && this.component) {
          instance = this.component.instanceFactory(this.container, {
            instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
            options: options
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
            } catch (_a) {// ignore errors in the onInstanceCreatedCallback
            }
          }
        }

        return instance || null;
      }
    }, {
      key: "normalizeInstanceIdentifier",
      value: function normalizeInstanceIdentifier() {
        var identifier = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME$1;

        if (this.component) {
          return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
        } else {
          return identifier; // assume multiple instances are supported before the component is provided.
        }
      }
    }, {
      key: "shouldAutoInitialize",
      value: function shouldAutoInitialize() {
        return !!this.component && this.component.instantiationMode !== "EXPLICIT"
        /* EXPLICIT */
        ;
      }
    }]);

    return Provider;
  }(); // undefined should be passed to the service factory for the default instance


  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
  }

  function isComponentEager(component) {
    return component.instantiationMode === "EAGER"
    /* EAGER */
    ;
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


  var ComponentContainer = /*#__PURE__*/function () {
    function ComponentContainer(name) {
      _classCallCheck(this, ComponentContainer);

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


    _createClass(ComponentContainer, [{
      key: "addComponent",
      value: function addComponent(component) {
        var provider = this.getProvider(component.name);

        if (provider.isComponentSet()) {
          throw new Error("Component ".concat(component.name, " has already been registered with ").concat(this.name));
        }

        provider.setComponent(component);
      }
    }, {
      key: "addOrOverwriteComponent",
      value: function addOrOverwriteComponent(component) {
        var provider = this.getProvider(component.name);

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

    }, {
      key: "getProvider",
      value: function getProvider(name) {
        if (this.providers.has(name)) {
          return this.providers.get(name);
        } // create a Provider for a service that hasn't registered with Firebase


        var provider = new Provider(name, this);
        this.providers.set(name, provider);
        return provider;
      }
    }, {
      key: "getProviders",
      value: function getProviders() {
        return Array.from(this.providers.values());
      }
    }]);

    return ComponentContainer;
  }();

  var _ConsoleMethod;
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

  var levelStringToEnum = {
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

  var defaultLogLevel = LogLevel.INFO;
  /**
   * By default, `console.debug` is not displayed in the developer console (in
   * chrome). To avoid forcing users to have to opt-in to these logs twice
   * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
   * logs to the `console.log` function.
   */

  var ConsoleMethod = (_ConsoleMethod = {}, _defineProperty(_ConsoleMethod, LogLevel.DEBUG, 'log'), _defineProperty(_ConsoleMethod, LogLevel.VERBOSE, 'log'), _defineProperty(_ConsoleMethod, LogLevel.INFO, 'info'), _defineProperty(_ConsoleMethod, LogLevel.WARN, 'warn'), _defineProperty(_ConsoleMethod, LogLevel.ERROR, 'error'), _ConsoleMethod);
  /**
   * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
   * messages on to their corresponding console counterparts (if the log method
   * is supported by the current log level)
   */

  var defaultLogHandler = function defaultLogHandler(instance, logType) {
    if (logType < instance.logLevel) {
      return;
    }

    var now = new Date().toISOString();
    var method = ConsoleMethod[logType];

    if (method) {
      var _console;

      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }

      (_console = console)[method].apply(_console, ["[".concat(now, "]  ").concat(instance.name, ":")].concat(args));
    } else {
      throw new Error("Attempted to log a message with an invalid logType (value: ".concat(logType, ")"));
    }
  };

  var Logger = /*#__PURE__*/function () {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    function Logger(name) {
      _classCallCheck(this, Logger);

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

    _createClass(Logger, [{
      key: "logLevel",
      get: function get() {
        return this._logLevel;
      },
      set: function set(val) {
        if (!(val in LogLevel)) {
          throw new TypeError("Invalid value \"".concat(val, "\" assigned to `logLevel`"));
        }

        this._logLevel = val;
      } // Workaround for setter/getter having to be the same type.

    }, {
      key: "setLogLevel",
      value: function setLogLevel(val) {
        this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
      }
    }, {
      key: "logHandler",
      get: function get() {
        return this._logHandler;
      },
      set: function set(val) {
        if (typeof val !== 'function') {
          throw new TypeError('Value assigned to `logHandler` must be a function');
        }

        this._logHandler = val;
      }
    }, {
      key: "userLogHandler",
      get: function get() {
        return this._userLogHandler;
      },
      set: function set(val) {
        this._userLogHandler = val;
      }
      /**
       * The functions below are all based on the `console` interface
       */

    }, {
      key: "debug",
      value: function debug() {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        this._userLogHandler && this._userLogHandler.apply(this, [this, LogLevel.DEBUG].concat(args));

        this._logHandler.apply(this, [this, LogLevel.DEBUG].concat(args));
      }
    }, {
      key: "log",
      value: function log() {
        for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }

        this._userLogHandler && this._userLogHandler.apply(this, [this, LogLevel.VERBOSE].concat(args));

        this._logHandler.apply(this, [this, LogLevel.VERBOSE].concat(args));
      }
    }, {
      key: "info",
      value: function info() {
        for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
          args[_key4] = arguments[_key4];
        }

        this._userLogHandler && this._userLogHandler.apply(this, [this, LogLevel.INFO].concat(args));

        this._logHandler.apply(this, [this, LogLevel.INFO].concat(args));
      }
    }, {
      key: "warn",
      value: function warn() {
        for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
          args[_key5] = arguments[_key5];
        }

        this._userLogHandler && this._userLogHandler.apply(this, [this, LogLevel.WARN].concat(args));

        this._logHandler.apply(this, [this, LogLevel.WARN].concat(args));
      }
    }, {
      key: "error",
      value: function error() {
        for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
          args[_key6] = arguments[_key6];
        }

        this._userLogHandler && this._userLogHandler.apply(this, [this, LogLevel.ERROR].concat(args));

        this._logHandler.apply(this, [this, LogLevel.ERROR].concat(args));
      }
    }]);

    return Logger;
  }();

  var instanceOfAny = function instanceOfAny(object, constructors) {
    return constructors.some(function (c) {
      return object instanceof c;
    });
  };

  var idbProxyableTypes;
  var cursorAdvanceMethods; // This is a function to prevent it throwing up in node environments.

  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction]);
  } // This is a function to prevent it throwing up in node environments.


  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [IDBCursor.prototype.advance, IDBCursor.prototype.continue, IDBCursor.prototype.continuePrimaryKey]);
  }

  var cursorRequestMap = new WeakMap();
  var transactionDoneMap = new WeakMap();
  var transactionStoreNamesMap = new WeakMap();
  var transformCache = new WeakMap();
  var reverseTransformCache = new WeakMap();

  function promisifyRequest(request) {
    var promise = new Promise(function (resolve, reject) {
      var unlisten = function unlisten() {
        request.removeEventListener('success', success);
        request.removeEventListener('error', error);
      };

      var success = function success() {
        resolve(wrap(request.result));
        unlisten();
      };

      var error = function error() {
        reject(request.error);
        unlisten();
      };

      request.addEventListener('success', success);
      request.addEventListener('error', error);
    });
    promise.then(function (value) {
      // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
      // (see wrapFunction).
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      } // Catching to avoid "Uncaught Promise exceptions"

    }).catch(function () {}); // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.

    reverseTransformCache.set(promise, request);
    return promise;
  }

  function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx)) return;
    var done = new Promise(function (resolve, reject) {
      var unlisten = function unlisten() {
        tx.removeEventListener('complete', complete);
        tx.removeEventListener('error', error);
        tx.removeEventListener('abort', error);
      };

      var complete = function complete() {
        resolve();
        unlisten();
      };

      var error = function error() {
        reject(tx.error || new DOMException('AbortError', 'AbortError'));
        unlisten();
      };

      tx.addEventListener('complete', complete);
      tx.addEventListener('error', error);
      tx.addEventListener('abort', error);
    }); // Cache it for later retrieval.

    transactionDoneMap.set(tx, done);
  }

  var idbProxyTraps = {
    get: function get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        // Special handling for transaction.done.
        if (prop === 'done') return transactionDoneMap.get(target); // Polyfill for objectStoreNames because of Edge.

        if (prop === 'objectStoreNames') {
          return target.objectStoreNames || transactionStoreNamesMap.get(target);
        } // Make tx.store return the only store in the transaction, or undefined if there are many.


        if (prop === 'store') {
          return receiver.objectStoreNames[1] ? undefined : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      } // Else transform whatever we get back.


      return wrap(target[prop]);
    },
    set: function set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has: function has(target, prop) {
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

        var tx = func.call.apply(func, [unwrap(this), storeNames].concat(args));
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    } // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
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
    if (typeof value === 'function') return wrapFunction(value); // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).

    if (value instanceof IDBTransaction) cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes())) return new Proxy(value, idbProxyTraps); // Return the same value back if we're not going to transform it.

    return value;
  }

  function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest) return promisifyRequest(value); // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.

    if (transformCache.has(value)) return transformCache.get(value);
    var newValue = transformCachableValue(value); // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.

    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }

    return newValue;
  }

  var unwrap = function unwrap(value) {
    return reverseTransformCache.get(value);
  };

  /**
   * Open a database.
   *
   * @param name Name of the database.
   * @param version Schema version.
   * @param callbacks Additional callbacks.
   */

  function openDB$1(name, version) {
    var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        blocked = _ref.blocked,
        upgrade = _ref.upgrade,
        blocking = _ref.blocking,
        terminated = _ref.terminated;

    var request = indexedDB.open(name, version);
    var openPromise = wrap(request);

    if (upgrade) {
      request.addEventListener('upgradeneeded', function (event) {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction));
      });
    }

    if (blocked) request.addEventListener('blocked', function () {
      return blocked();
    });
    openPromise.then(function (db) {
      if (terminated) db.addEventListener('close', function () {
        return terminated();
      });
      if (blocking) db.addEventListener('versionchange', function () {
        return blocking();
      });
    }).catch(function () {});
    return openPromise;
  }

  var readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
  var writeMethods = ['put', 'add', 'delete', 'clear'];
  var cachedMethods = new Map();

  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === 'string')) {
      return;
    }

    if (cachedMethods.get(prop)) return cachedMethods.get(prop);
    var targetFuncName = prop.replace(/FromIndex$/, '');
    var useIndex = prop !== targetFuncName;
    var isWrite = writeMethods.includes(targetFuncName);

    if ( // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))) {
      return;
    }

    var method = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(storeName) {
        var _target;

        var tx,
            target,
            _len,
            args,
            _key,
            _args = arguments;

        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
                tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
                target = tx.store;

                for (_len = _args.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                  args[_key - 1] = _args[_key];
                }

                if (useIndex) target = target.index(args.shift()); // Must reject if op rejects.
                // If it's a write operation, must reject if tx.done rejects.
                // Must reject with op rejection first.
                // Must resolve with op value.
                // Must handle both promises (no unhandled rejections)

                _context.next = 6;
                return Promise.all([(_target = target)[targetFuncName].apply(_target, args), isWrite && tx.done]);

              case 6:
                return _context.abrupt("return", _context.sent[0]);

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      return function method(_x) {
        return _ref3.apply(this, arguments);
      };
    }();

    cachedMethods.set(prop, method);
    return method;
  }

  replaceTraps(function (oldTraps) {
    return _objectSpread2(_objectSpread2({}, oldTraps), {}, {
      get: function get(target, prop, receiver) {
        return getMethod(target, prop) || oldTraps.get(target, prop, receiver);
      },
      has: function has(target, prop) {
        return !!getMethod(target, prop) || oldTraps.has(target, prop);
      }
    });
  });

  var _PLATFORM_LOG_STRING, _ERRORS;
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

  var PlatformLoggerServiceImpl = /*#__PURE__*/function () {
    function PlatformLoggerServiceImpl(container) {
      _classCallCheck(this, PlatformLoggerServiceImpl);

      this.container = container;
    } // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.


    _createClass(PlatformLoggerServiceImpl, [{
      key: "getPlatformInfoString",
      value: function getPlatformInfoString() {
        var providers = this.container.getProviders(); // Loop through providers and get library/version pairs from any that are
        // version components.

        return providers.map(function (provider) {
          if (isVersionServiceProvider(provider)) {
            var service = provider.getImmediate();
            return "".concat(service.library, "/").concat(service.version);
          } else {
            return null;
          }
        }).filter(function (logString) {
          return logString;
        }).join(' ');
      }
    }]);

    return PlatformLoggerServiceImpl;
  }();
  /**
   *
   * @param provider check if this provider provides a VersionService
   *
   * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
   * provides VersionService. The provider is not necessarily a 'app-version'
   * provider.
   */


  function isVersionServiceProvider(provider) {
    var component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION"
    /* VERSION */
    ;
  }

  var name$o = "@firebase/app";
  var version$1$1 = "0.7.27";
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

  var logger = new Logger('@firebase/app');
  var name$n = "@firebase/app-compat";
  var name$m = "@firebase/analytics-compat";
  var name$l = "@firebase/analytics";
  var name$k = "@firebase/app-check-compat";
  var name$j = "@firebase/app-check";
  var name$i = "@firebase/auth";
  var name$h = "@firebase/auth-compat";
  var name$g = "@firebase/database";
  var name$f = "@firebase/database-compat";
  var name$e = "@firebase/functions";
  var name$d = "@firebase/functions-compat";
  var name$c = "@firebase/installations";
  var name$b = "@firebase/installations-compat";
  var name$a = "@firebase/messaging";
  var name$9 = "@firebase/messaging-compat";
  var name$8 = "@firebase/performance";
  var name$7 = "@firebase/performance-compat";
  var name$6 = "@firebase/remote-config";
  var name$5 = "@firebase/remote-config-compat";
  var name$4 = "@firebase/storage";
  var name$3 = "@firebase/storage-compat";
  var name$2 = "@firebase/firestore";
  var name$1$1 = "@firebase/firestore-compat";
  var name$p = "firebase";
  var version$2 = "9.8.4";
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

  var DEFAULT_ENTRY_NAME = '[DEFAULT]';
  var PLATFORM_LOG_STRING = (_PLATFORM_LOG_STRING = {}, _defineProperty(_PLATFORM_LOG_STRING, name$o, 'fire-core'), _defineProperty(_PLATFORM_LOG_STRING, name$n, 'fire-core-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$l, 'fire-analytics'), _defineProperty(_PLATFORM_LOG_STRING, name$m, 'fire-analytics-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$j, 'fire-app-check'), _defineProperty(_PLATFORM_LOG_STRING, name$k, 'fire-app-check-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$i, 'fire-auth'), _defineProperty(_PLATFORM_LOG_STRING, name$h, 'fire-auth-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$g, 'fire-rtdb'), _defineProperty(_PLATFORM_LOG_STRING, name$f, 'fire-rtdb-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$e, 'fire-fn'), _defineProperty(_PLATFORM_LOG_STRING, name$d, 'fire-fn-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$c, 'fire-iid'), _defineProperty(_PLATFORM_LOG_STRING, name$b, 'fire-iid-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$a, 'fire-fcm'), _defineProperty(_PLATFORM_LOG_STRING, name$9, 'fire-fcm-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$8, 'fire-perf'), _defineProperty(_PLATFORM_LOG_STRING, name$7, 'fire-perf-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$6, 'fire-rc'), _defineProperty(_PLATFORM_LOG_STRING, name$5, 'fire-rc-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$4, 'fire-gcs'), _defineProperty(_PLATFORM_LOG_STRING, name$3, 'fire-gcs-compat'), _defineProperty(_PLATFORM_LOG_STRING, name$2, 'fire-fst'), _defineProperty(_PLATFORM_LOG_STRING, name$1$1, 'fire-fst-compat'), _defineProperty(_PLATFORM_LOG_STRING, 'fire-js', 'fire-js'), _defineProperty(_PLATFORM_LOG_STRING, name$p, 'fire-js-all'), _PLATFORM_LOG_STRING);
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

  var _apps = new Map();
  /**
   * Registered components.
   *
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any


  var _components = new Map();
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
    var componentName = component.name;

    if (_components.has(componentName)) {
      logger.debug("There were multiple attempts to register component ".concat(componentName, "."));
      return false;
    }

    _components.set(componentName, component); // add the component to existing app instances


    var _iterator = _createForOfIteratorHelper(_apps.values()),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var app = _step.value;

        _addComponent(app, component);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
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
    var heartbeatController = app.container.getProvider('heartbeat').getImmediate({
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


  var ERRORS = (_ERRORS = {}, _defineProperty(_ERRORS, "no-app"
  /* NO_APP */
  , "No Firebase App '{$appName}' has been created - " + 'call Firebase App.initializeApp()'), _defineProperty(_ERRORS, "bad-app-name"
  /* BAD_APP_NAME */
  , "Illegal App name: '{$appName}"), _defineProperty(_ERRORS, "duplicate-app"
  /* DUPLICATE_APP */
  , "Firebase App named '{$appName}' already exists with different options or config"), _defineProperty(_ERRORS, "app-deleted"
  /* APP_DELETED */
  , "Firebase App named '{$appName}' already deleted"), _defineProperty(_ERRORS, "invalid-app-argument"
  /* INVALID_APP_ARGUMENT */
  , 'firebase.{$appName}() takes either no argument or a ' + 'Firebase App instance.'), _defineProperty(_ERRORS, "invalid-log-argument"
  /* INVALID_LOG_ARGUMENT */
  , 'First argument to `onLog` must be null or a function.'), _defineProperty(_ERRORS, "storage-open"
  /* STORAGE_OPEN */
  , 'Error thrown when opening storage. Original error: {$originalErrorMessage}.'), _defineProperty(_ERRORS, "storage-get"
  /* STORAGE_GET */
  , 'Error thrown when reading from storage. Original error: {$originalErrorMessage}.'), _defineProperty(_ERRORS, "storage-set"
  /* STORAGE_WRITE */
  , 'Error thrown when writing to storage. Original error: {$originalErrorMessage}.'), _defineProperty(_ERRORS, "storage-delete"
  /* STORAGE_DELETE */
  , 'Error thrown when deleting from storage. Original error: {$originalErrorMessage}.'), _ERRORS);
  var ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);
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

  var FirebaseAppImpl = /*#__PURE__*/function () {
    function FirebaseAppImpl(options, config, container) {
      var _this = this;

      _classCallCheck(this, FirebaseAppImpl);

      this._isDeleted = false;
      this._options = Object.assign({}, options);
      this._config = Object.assign({}, config);
      this._name = config.name;
      this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
      this._container = container;
      this.container.addComponent(new Component('app', function () {
        return _this;
      }, "PUBLIC"
      /* PUBLIC */
      ));
    }

    _createClass(FirebaseAppImpl, [{
      key: "automaticDataCollectionEnabled",
      get: function get() {
        this.checkDestroyed();
        return this._automaticDataCollectionEnabled;
      },
      set: function set(val) {
        this.checkDestroyed();
        this._automaticDataCollectionEnabled = val;
      }
    }, {
      key: "name",
      get: function get() {
        this.checkDestroyed();
        return this._name;
      }
    }, {
      key: "options",
      get: function get() {
        this.checkDestroyed();
        return this._options;
      }
    }, {
      key: "config",
      get: function get() {
        this.checkDestroyed();
        return this._config;
      }
    }, {
      key: "container",
      get: function get() {
        return this._container;
      }
    }, {
      key: "isDeleted",
      get: function get() {
        return this._isDeleted;
      },
      set: function set(val) {
        this._isDeleted = val;
      }
      /**
       * This function will throw an Error if the App has already been deleted -
       * use before performing API actions on the App.
       */

    }, {
      key: "checkDestroyed",
      value: function checkDestroyed() {
        if (this.isDeleted) {
          throw ERROR_FACTORY.create("app-deleted"
          /* APP_DELETED */
          , {
            appName: this._name
          });
        }
      }
    }]);

    return FirebaseAppImpl;
  }();
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


  var SDK_VERSION = version$2;

  function initializeApp(options) {
    var rawConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (_typeof(rawConfig) !== 'object') {
      var _name = rawConfig;
      rawConfig = {
        name: _name
      };
    }

    var config = Object.assign({
      name: DEFAULT_ENTRY_NAME,
      automaticDataCollectionEnabled: false
    }, rawConfig);
    var name = config.name;

    if (typeof name !== 'string' || !name) {
      throw ERROR_FACTORY.create("bad-app-name"
      /* BAD_APP_NAME */
      , {
        appName: String(name)
      });
    }

    var existingApp = _apps.get(name);

    if (existingApp) {
      // return the existing app if options and config deep equal the ones in the existing app.
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app"
        /* DUPLICATE_APP */
        , {
          appName: name
        });
      }
    }

    var container = new ComponentContainer(name);

    var _iterator2 = _createForOfIteratorHelper(_components.values()),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var component = _step2.value;
        container.addComponent(component);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    var newApp = new FirebaseAppImpl(options, config, container);

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
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_ENTRY_NAME;

    var app = _apps.get(name);

    if (!app) {
      throw ERROR_FACTORY.create("no-app"
      /* NO_APP */
      , {
        appName: name
      });
    }

    return app;
  }

  function registerVersion(libraryKeyOrName, version, variant) {
    var _a; // TODO: We can use this check to whitelist strings when/if we set up
    // a good whitelist system.


    var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;

    if (variant) {
      library += "-".concat(variant);
    }

    var libraryMismatch = library.match(/\s|\//);
    var versionMismatch = version.match(/\s|\//);

    if (libraryMismatch || versionMismatch) {
      var warning = ["Unable to register library \"".concat(library, "\" with version \"").concat(version, "\":")];

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

    _registerComponent(new Component("".concat(library, "-version"), function () {
      return {
        library: library,
        version: version
      };
    }, "VERSION"
    /* VERSION */
    ));
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


  var DB_NAME$1 = 'firebase-heartbeat-database';
  var DB_VERSION$1 = 1;
  var STORE_NAME = 'firebase-heartbeat-store';
  var dbPromise = null;

  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB$1(DB_NAME$1, DB_VERSION$1, {
        upgrade: function upgrade(db, oldVersion) {
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
      }).catch(function (e) {
        throw ERROR_FACTORY.create("storage-open"
        /* STORAGE_OPEN */
        , {
          originalErrorMessage: e.message
        });
      });
    }

    return dbPromise;
  }

  function readHeartbeatsFromIndexedDB(_x2) {
    return _readHeartbeatsFromIndexedDB.apply(this, arguments);
  }

  function _readHeartbeatsFromIndexedDB() {
    _readHeartbeatsFromIndexedDB = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(app) {
      var _a, db;

      return _regeneratorRuntime().wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              _context8.prev = 0;
              _context8.next = 3;
              return getDbPromise();

            case 3:
              db = _context8.sent;
              return _context8.abrupt("return", db.transaction(STORE_NAME).objectStore(STORE_NAME).get(computeKey(app)));

            case 7:
              _context8.prev = 7;
              _context8.t0 = _context8["catch"](0);
              throw ERROR_FACTORY.create("storage-get"
              /* STORAGE_GET */
              , {
                originalErrorMessage: (_a = _context8.t0) === null || _a === void 0 ? void 0 : _a.message
              });

            case 10:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8, null, [[0, 7]]);
    }));
    return _readHeartbeatsFromIndexedDB.apply(this, arguments);
  }

  function writeHeartbeatsToIndexedDB(_x3, _x4) {
    return _writeHeartbeatsToIndexedDB.apply(this, arguments);
  }

  function _writeHeartbeatsToIndexedDB() {
    _writeHeartbeatsToIndexedDB = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(app, heartbeatObject) {
      var _a, db, tx, objectStore;

      return _regeneratorRuntime().wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.prev = 0;
              _context9.next = 3;
              return getDbPromise();

            case 3:
              db = _context9.sent;
              tx = db.transaction(STORE_NAME, 'readwrite');
              objectStore = tx.objectStore(STORE_NAME);
              _context9.next = 8;
              return objectStore.put(heartbeatObject, computeKey(app));

            case 8:
              return _context9.abrupt("return", tx.done);

            case 11:
              _context9.prev = 11;
              _context9.t0 = _context9["catch"](0);
              throw ERROR_FACTORY.create("storage-set"
              /* STORAGE_WRITE */
              , {
                originalErrorMessage: (_a = _context9.t0) === null || _a === void 0 ? void 0 : _a.message
              });

            case 14:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, null, [[0, 11]]);
    }));
    return _writeHeartbeatsToIndexedDB.apply(this, arguments);
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


  var MAX_HEADER_BYTES = 1024; // 30 days

  var STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1000;

  var HeartbeatServiceImpl = /*#__PURE__*/function () {
    function HeartbeatServiceImpl(container) {
      var _this2 = this;

      _classCallCheck(this, HeartbeatServiceImpl);

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
      var app = this.container.getProvider('app').getImmediate();
      this._storage = new HeartbeatStorageImpl(app);
      this._heartbeatsCachePromise = this._storage.read().then(function (result) {
        _this2._heartbeatsCache = result;
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


    _createClass(HeartbeatServiceImpl, [{
      key: "triggerHeartbeat",
      value: function () {
        var _triggerHeartbeat = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          var platformLogger, agent, date;
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  platformLogger = this.container.getProvider('platform-logger').getImmediate(); // This is the "Firebase user agent" string from the platform logger
                  // service, not the browser user agent.

                  agent = platformLogger.getPlatformInfoString();
                  date = getUTCDateString();

                  if (!(this._heartbeatsCache === null)) {
                    _context.next = 7;
                    break;
                  }

                  _context.next = 6;
                  return this._heartbeatsCachePromise;

                case 6:
                  this._heartbeatsCache = _context.sent;

                case 7:
                  if (!(this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some(function (singleDateHeartbeat) {
                    return singleDateHeartbeat.date === date;
                  }))) {
                    _context.next = 11;
                    break;
                  }

                  return _context.abrupt("return");

                case 11:
                  // There is no entry for this date. Create one.
                  this._heartbeatsCache.heartbeats.push({
                    date: date,
                    agent: agent
                  });

                case 12:
                  // Remove entries older than 30 days.
                  this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter(function (singleDateHeartbeat) {
                    var hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
                    var now = Date.now();
                    return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
                  });
                  return _context.abrupt("return", this._storage.overwrite(this._heartbeatsCache));

                case 14:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        function triggerHeartbeat() {
          return _triggerHeartbeat.apply(this, arguments);
        }

        return triggerHeartbeat;
      }()
      /**
       * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
       * It also clears all heartbeats from memory as well as in IndexedDB.
       *
       * NOTE: Consuming product SDKs should not send the header if this method
       * returns an empty string.
       */

    }, {
      key: "getHeartbeatsHeader",
      value: function () {
        var _getHeartbeatsHeader = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
          var date, _extractHeartbeatsFor, heartbeatsToSend, unsentEntries, headerString;

          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  if (!(this._heartbeatsCache === null)) {
                    _context2.next = 3;
                    break;
                  }

                  _context2.next = 3;
                  return this._heartbeatsCachePromise;

                case 3:
                  if (!(this._heartbeatsCache === null || this._heartbeatsCache.heartbeats.length === 0)) {
                    _context2.next = 5;
                    break;
                  }

                  return _context2.abrupt("return", '');

                case 5:
                  date = getUTCDateString(); // Extract as many heartbeats from the cache as will fit under the size limit.

                  _extractHeartbeatsFor = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats), heartbeatsToSend = _extractHeartbeatsFor.heartbeatsToSend, unsentEntries = _extractHeartbeatsFor.unsentEntries;
                  headerString = base64urlEncodeWithoutPadding(JSON.stringify({
                    version: 2,
                    heartbeats: heartbeatsToSend
                  })); // Store last sent date to prevent another being logged/sent for the same day.

                  this._heartbeatsCache.lastSentHeartbeatDate = date;

                  if (!(unsentEntries.length > 0)) {
                    _context2.next = 15;
                    break;
                  }

                  // Store any unsent entries if they exist.
                  this._heartbeatsCache.heartbeats = unsentEntries; // This seems more likely than emptying the array (below) to lead to some odd state
                  // since the cache isn't empty and this will be called again on the next request,
                  // and is probably safest if we await it.

                  _context2.next = 13;
                  return this._storage.overwrite(this._heartbeatsCache);

                case 13:
                  _context2.next = 17;
                  break;

                case 15:
                  this._heartbeatsCache.heartbeats = []; // Do not wait for this, to reduce latency.

                  void this._storage.overwrite(this._heartbeatsCache);

                case 17:
                  return _context2.abrupt("return", headerString);

                case 18:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2, this);
        }));

        function getHeartbeatsHeader() {
          return _getHeartbeatsHeader.apply(this, arguments);
        }

        return getHeartbeatsHeader;
      }()
    }]);

    return HeartbeatServiceImpl;
  }();

  function getUTCDateString() {
    var today = new Date(); // Returns date format 'YYYY-MM-DD'

    return today.toISOString().substring(0, 10);
  }

  function extractHeartbeatsForHeader(heartbeatsCache) {
    var maxSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MAX_HEADER_BYTES;
    // Heartbeats grouped by user agent in the standard format to be sent in
    // the header.
    var heartbeatsToSend = []; // Single date format heartbeats that are not sent.

    var unsentEntries = heartbeatsCache.slice();

    var _iterator3 = _createForOfIteratorHelper(heartbeatsCache),
        _step3;

    try {
      var _loop = function _loop() {
        var singleDateHeartbeat = _step3.value;
        // Look for an existing entry with the same user agent.
        var heartbeatEntry = heartbeatsToSend.find(function (hb) {
          return hb.agent === singleDateHeartbeat.agent;
        });

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
            return "break";
          }
        } else {
          heartbeatEntry.dates.push(singleDateHeartbeat.date); // If the header would exceed max size, remove the added date
          // and stop adding to the header.

          if (countBytes(heartbeatsToSend) > maxSize) {
            heartbeatEntry.dates.pop();
            return "break";
          }
        } // Pop unsent entry from queue. (Skipped if adding the entry exceeded
        // quota and the loop breaks early.)


        unsentEntries = unsentEntries.slice(1);
      };

      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _ret = _loop();

        if (_ret === "break") break;
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    return {
      heartbeatsToSend: heartbeatsToSend,
      unsentEntries: unsentEntries
    };
  }

  var HeartbeatStorageImpl = /*#__PURE__*/function () {
    function HeartbeatStorageImpl(app) {
      _classCallCheck(this, HeartbeatStorageImpl);

      this.app = app;
      this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }

    _createClass(HeartbeatStorageImpl, [{
      key: "runIndexedDBEnvironmentCheck",
      value: function () {
        var _runIndexedDBEnvironmentCheck = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  if (isIndexedDBAvailable()) {
                    _context3.next = 4;
                    break;
                  }

                  return _context3.abrupt("return", false);

                case 4:
                  return _context3.abrupt("return", validateIndexedDBOpenable().then(function () {
                    return true;
                  }).catch(function () {
                    return false;
                  }));

                case 5:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        function runIndexedDBEnvironmentCheck() {
          return _runIndexedDBEnvironmentCheck.apply(this, arguments);
        }

        return runIndexedDBEnvironmentCheck;
      }()
      /**
       * Read all heartbeats.
       */

    }, {
      key: "read",
      value: function () {
        var _read = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
          var canUseIndexedDB, idbHeartbeatObject;
          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  _context4.next = 2;
                  return this._canUseIndexedDBPromise;

                case 2:
                  canUseIndexedDB = _context4.sent;

                  if (canUseIndexedDB) {
                    _context4.next = 7;
                    break;
                  }

                  return _context4.abrupt("return", {
                    heartbeats: []
                  });

                case 7:
                  _context4.next = 9;
                  return readHeartbeatsFromIndexedDB(this.app);

                case 9:
                  idbHeartbeatObject = _context4.sent;
                  return _context4.abrupt("return", idbHeartbeatObject || {
                    heartbeats: []
                  });

                case 11:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4, this);
        }));

        function read() {
          return _read.apply(this, arguments);
        }

        return read;
      }() // overwrite the storage with the provided heartbeats

    }, {
      key: "overwrite",
      value: function () {
        var _overwrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(heartbeatsObject) {
          var _a, canUseIndexedDB, existingHeartbeatsObject;

          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  _context5.next = 2;
                  return this._canUseIndexedDBPromise;

                case 2:
                  canUseIndexedDB = _context5.sent;

                  if (canUseIndexedDB) {
                    _context5.next = 7;
                    break;
                  }

                  return _context5.abrupt("return");

                case 7:
                  _context5.next = 9;
                  return this.read();

                case 9:
                  existingHeartbeatsObject = _context5.sent;
                  return _context5.abrupt("return", writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: heartbeatsObject.heartbeats
                  }));

                case 11:
                case "end":
                  return _context5.stop();
              }
            }
          }, _callee5, this);
        }));

        function overwrite(_x5) {
          return _overwrite.apply(this, arguments);
        }

        return overwrite;
      }() // add heartbeats

    }, {
      key: "add",
      value: function () {
        var _add = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(heartbeatsObject) {
          var _a, canUseIndexedDB, existingHeartbeatsObject;

          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
            while (1) {
              switch (_context6.prev = _context6.next) {
                case 0:
                  _context6.next = 2;
                  return this._canUseIndexedDBPromise;

                case 2:
                  canUseIndexedDB = _context6.sent;

                  if (canUseIndexedDB) {
                    _context6.next = 7;
                    break;
                  }

                  return _context6.abrupt("return");

                case 7:
                  _context6.next = 9;
                  return this.read();

                case 9:
                  existingHeartbeatsObject = _context6.sent;
                  return _context6.abrupt("return", writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: [].concat(_toConsumableArray(existingHeartbeatsObject.heartbeats), _toConsumableArray(heartbeatsObject.heartbeats))
                  }));

                case 11:
                case "end":
                  return _context6.stop();
              }
            }
          }, _callee6, this);
        }));

        function add(_x6) {
          return _add.apply(this, arguments);
        }

        return add;
      }()
    }]);

    return HeartbeatStorageImpl;
  }();
  /**
   * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
   * in a platform logging header JSON object, stringified, and converted
   * to base 64.
   */


  function countBytes(heartbeatsCache) {
    // base64 has a restricted set of characters, all of which should be 1 byte.
    return base64urlEncodeWithoutPadding( // heartbeatsCache wrapper properties
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
    _registerComponent(new Component('platform-logger', function (container) {
      return new PlatformLoggerServiceImpl(container);
    }, "PRIVATE"
    /* PRIVATE */
    ));

    _registerComponent(new Component('heartbeat', function (container) {
      return new HeartbeatServiceImpl(container);
    }, "PRIVATE"
    /* PRIVATE */
    )); // Register `app` package.


    registerVersion(name$o, version$1$1, variant); // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation

    registerVersion(name$o, version$1$1, 'esm2017'); // Register platform SDK identifier (no version).

    registerVersion('fire-js', '');
  }
  /**
   * Firebase App
   *
   * @remarks This package coordinates the communication between the different Firebase components
   * @packageDocumentation
   */


  registerCoreComponents('');

  function __rest(s, e) {
    var t = {};

    for (var p in s) {
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    }

    if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
    }
    return t;
  }

  var _SERVER_ERROR_MAP;

  function _prodErrorMap() {
    // We will include this one message in the prod error map since by the very
    // nature of this error, developers will never be able to see the message
    // using the debugErrorMap (which is installed during auth initialization).
    return _defineProperty({}, "dependent-sdk-initialized-before-auth"
    /* DEPENDENT_SDK_INIT_BEFORE_AUTH */
    , 'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' + 'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' + 'starting any other Firebase SDK.');
  }
  /**
   * A minimal error map with all verbose error messages stripped.
   *
   * See discussion at {@link AuthErrorMap}
   *
   * @public
   */

  var prodErrorMap = _prodErrorMap;

  var _DEFAULT_AUTH_ERROR_FACTORY = new ErrorFactory('auth', 'Firebase', _prodErrorMap());
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

  var logClient = new Logger('@firebase/auth');

  function _logError(msg) {
    if (logClient.logLevel <= LogLevel.ERROR) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key2 = 1; _key2 < _len; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      logClient.error.apply(logClient, ["Auth (".concat(SDK_VERSION, "): ").concat(msg)].concat(args));
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
    for (var _len2 = arguments.length, rest = new Array(_len2 > 1 ? _len2 - 1 : 0), _key3 = 1; _key3 < _len2; _key3++) {
      rest[_key3 - 1] = arguments[_key3];
    }

    throw createErrorInternal.apply(void 0, [authOrCode].concat(rest));
  }

  function _createError(authOrCode) {
    for (var _len3 = arguments.length, rest = new Array(_len3 > 1 ? _len3 - 1 : 0), _key4 = 1; _key4 < _len3; _key4++) {
      rest[_key4 - 1] = arguments[_key4];
    }

    return createErrorInternal.apply(void 0, [authOrCode].concat(rest));
  }

  function _errorWithCustomMessage(auth, code, message) {
    var errorMap = Object.assign(Object.assign({}, prodErrorMap()), _defineProperty({}, code, message));
    var factory = new ErrorFactory('auth', 'Firebase', errorMap);
    return factory.create(code, {
      appName: auth.name
    });
  }

  function createErrorInternal(authOrCode) {
    for (var _len4 = arguments.length, rest = new Array(_len4 > 1 ? _len4 - 1 : 0), _key5 = 1; _key5 < _len4; _key5++) {
      rest[_key5 - 1] = arguments[_key5];
    }

    if (typeof authOrCode !== 'string') {
      var _authOrCode$_errorFac;

      var code = rest[0];

      var fullParams = _toConsumableArray(rest.slice(1));

      if (fullParams[0]) {
        fullParams[0].appName = authOrCode.name;
      }

      return (_authOrCode$_errorFac = authOrCode._errorFactory).create.apply(_authOrCode$_errorFac, [code].concat(_toConsumableArray(fullParams)));
    }

    return _DEFAULT_AUTH_ERROR_FACTORY.create.apply(_DEFAULT_AUTH_ERROR_FACTORY, [authOrCode].concat(rest));
  }

  function _assert(assertion, authOrCode) {
    if (!assertion) {
      for (var _len5 = arguments.length, rest = new Array(_len5 > 2 ? _len5 - 2 : 0), _key6 = 2; _key6 < _len5; _key6++) {
        rest[_key6 - 2] = arguments[_key6];
      }

      throw createErrorInternal.apply(void 0, [authOrCode].concat(rest));
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
    var message = "INTERNAL ASSERTION FAILED: " + failure;

    _logError(message); // NOTE: We don't use FirebaseError here because these are internal failures
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


  var instanceCache = new Map();

  function _getInstance(cls) {
    debugAssert(cls instanceof Function, 'Expected a class definition');
    var instance = instanceCache.get(cls);

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
    var provider = _getProvider(app, 'auth');

    if (provider.isInitialized()) {
      var _auth2 = provider.getImmediate();

      var initialOptions = provider.getOptions();

      if (deepEqual(initialOptions, deps !== null && deps !== void 0 ? deps : {})) {
        return _auth2;
      } else {
        _fail(_auth2, "already-initialized"
        /* ALREADY_INITIALIZED */
        );
      }
    }

    var auth = provider.initialize({
      options: deps
    });
    return auth;
  }

  function _initializeAuthInstance(auth, deps) {
    var persistence = (deps === null || deps === void 0 ? void 0 : deps.persistence) || [];
    var hierarchy = (Array.isArray(persistence) ? persistence : [persistence]).map(_getInstance);

    if (deps === null || deps === void 0 ? void 0 : deps.errorMap) {
      auth._updateErrorMap(deps.errorMap);
    } // This promise is intended to float; auth initialization happens in the
    // background, meanwhile the auth object may be used by the app.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises


    auth._initializeWithPersistence(hierarchy, deps === null || deps === void 0 ? void 0 : deps.popupRedirectResolver);
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
    if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && typeof navigator.onLine === 'boolean' && ( // Apply only for traditional web apps and Chrome extensions.
    // This is especially true for Cordova apps which have unreliable
    // navigator.onLine behavior unless cordova-plugin-network-information is
    // installed which overwrites the native navigator.onLine value and
    // defines navigator.connection.
    _isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)) {
      return navigator.onLine;
    } // If we can't determine the state, assume it is online.


    return true;
  }

  function _getUserLanguage() {
    if (typeof navigator === 'undefined') {
      return null;
    }

    var navigatorLanguage = navigator;
    return (// Most reliable, but only supported in Chrome/Firefox.
      navigatorLanguage.languages && navigatorLanguage.languages[0] || // Supported in most browsers, but returns the language of the browser
      // UI, not the language set in browser settings.
      navigatorLanguage.language || // Couldn't determine language.
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


  var Delay = /*#__PURE__*/function () {
    function Delay(shortDelay, longDelay) {
      _classCallCheck(this, Delay);

      this.shortDelay = shortDelay;
      this.longDelay = longDelay; // Internal error when improperly initialized.

      debugAssert(longDelay > shortDelay, 'Short delay should be less than long delay!');
      this.isMobile = isMobileCordova() || isReactNative();
    }

    _createClass(Delay, [{
      key: "get",
      value: function get() {
        if (!_isOnline()) {
          // Pick the shorter timeout.
          return Math.min(5000
          /* OFFLINE */
          , this.shortDelay);
        } // If running in a mobile environment, return the long delay, otherwise
        // return the short delay.
        // This could be improved in the future to dynamically change based on other
        // variables instead of just reading the current environment.


        return this.isMobile ? this.longDelay : this.shortDelay;
      }
    }]);

    return Delay;
  }();
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
    var url = config.emulator.url;

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


  var FetchProvider = /*#__PURE__*/function () {
    function FetchProvider() {
      _classCallCheck(this, FetchProvider);
    }

    _createClass(FetchProvider, null, [{
      key: "initialize",
      value: function initialize(fetchImpl, headersImpl, responseImpl) {
        this.fetchImpl = fetchImpl;

        if (headersImpl) {
          this.headersImpl = headersImpl;
        }

        if (responseImpl) {
          this.responseImpl = responseImpl;
        }
      }
    }, {
      key: "fetch",
      value: function fetch() {
        if (this.fetchImpl) {
          return this.fetchImpl;
        }

        if (typeof self !== 'undefined' && 'fetch' in self) {
          return self.fetch;
        }

        debugFail('Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
      }
    }, {
      key: "headers",
      value: function headers() {
        if (this.headersImpl) {
          return this.headersImpl;
        }

        if (typeof self !== 'undefined' && 'Headers' in self) {
          return self.Headers;
        }

        debugFail('Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
      }
    }, {
      key: "response",
      value: function response() {
        if (this.responseImpl) {
          return this.responseImpl;
        }

        if (typeof self !== 'undefined' && 'Response' in self) {
          return self.Response;
        }

        debugFail('Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
      }
    }]);

    return FetchProvider;
  }();
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


  var SERVER_ERROR_MAP = (_SERVER_ERROR_MAP = {}, _defineProperty(_SERVER_ERROR_MAP, "CREDENTIAL_MISMATCH"
  /* CREDENTIAL_MISMATCH */
  , "custom-token-mismatch"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_CUSTOM_TOKEN"
  /* MISSING_CUSTOM_TOKEN */
  , "internal-error"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_IDENTIFIER"
  /* INVALID_IDENTIFIER */
  , "invalid-email"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_CONTINUE_URI"
  /* MISSING_CONTINUE_URI */
  , "internal-error"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_PASSWORD"
  /* INVALID_PASSWORD */
  , "wrong-password"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_PASSWORD"
  /* MISSING_PASSWORD */
  , "internal-error"), _defineProperty(_SERVER_ERROR_MAP, "EMAIL_EXISTS"
  /* EMAIL_EXISTS */
  , "email-already-in-use"), _defineProperty(_SERVER_ERROR_MAP, "PASSWORD_LOGIN_DISABLED"
  /* PASSWORD_LOGIN_DISABLED */
  , "operation-not-allowed"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_IDP_RESPONSE"
  /* INVALID_IDP_RESPONSE */
  , "invalid-credential"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_PENDING_TOKEN"
  /* INVALID_PENDING_TOKEN */
  , "invalid-credential"), _defineProperty(_SERVER_ERROR_MAP, "FEDERATED_USER_ID_ALREADY_LINKED"
  /* FEDERATED_USER_ID_ALREADY_LINKED */
  , "credential-already-in-use"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_REQ_TYPE"
  /* MISSING_REQ_TYPE */
  , "internal-error"), _defineProperty(_SERVER_ERROR_MAP, "EMAIL_NOT_FOUND"
  /* EMAIL_NOT_FOUND */
  , "user-not-found"), _defineProperty(_SERVER_ERROR_MAP, "RESET_PASSWORD_EXCEED_LIMIT"
  /* RESET_PASSWORD_EXCEED_LIMIT */
  , "too-many-requests"), _defineProperty(_SERVER_ERROR_MAP, "EXPIRED_OOB_CODE"
  /* EXPIRED_OOB_CODE */
  , "expired-action-code"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_OOB_CODE"
  /* INVALID_OOB_CODE */
  , "invalid-action-code"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_OOB_CODE"
  /* MISSING_OOB_CODE */
  , "internal-error"), _defineProperty(_SERVER_ERROR_MAP, "CREDENTIAL_TOO_OLD_LOGIN_AGAIN"
  /* CREDENTIAL_TOO_OLD_LOGIN_AGAIN */
  , "requires-recent-login"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_ID_TOKEN"
  /* INVALID_ID_TOKEN */
  , "invalid-user-token"), _defineProperty(_SERVER_ERROR_MAP, "TOKEN_EXPIRED"
  /* TOKEN_EXPIRED */
  , "user-token-expired"), _defineProperty(_SERVER_ERROR_MAP, "USER_NOT_FOUND"
  /* USER_NOT_FOUND */
  , "user-token-expired"), _defineProperty(_SERVER_ERROR_MAP, "TOO_MANY_ATTEMPTS_TRY_LATER"
  /* TOO_MANY_ATTEMPTS_TRY_LATER */
  , "too-many-requests"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_CODE"
  /* INVALID_CODE */
  , "invalid-verification-code"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_SESSION_INFO"
  /* INVALID_SESSION_INFO */
  , "invalid-verification-id"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_TEMPORARY_PROOF"
  /* INVALID_TEMPORARY_PROOF */
  , "invalid-credential"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_SESSION_INFO"
  /* MISSING_SESSION_INFO */
  , "missing-verification-id"), _defineProperty(_SERVER_ERROR_MAP, "SESSION_EXPIRED"
  /* SESSION_EXPIRED */
  , "code-expired"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_ANDROID_PACKAGE_NAME"
  /* MISSING_ANDROID_PACKAGE_NAME */
  , "missing-android-pkg-name"), _defineProperty(_SERVER_ERROR_MAP, "UNAUTHORIZED_DOMAIN"
  /* UNAUTHORIZED_DOMAIN */
  , "unauthorized-continue-uri"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_OAUTH_CLIENT_ID"
  /* INVALID_OAUTH_CLIENT_ID */
  , "invalid-oauth-client-id"), _defineProperty(_SERVER_ERROR_MAP, "ADMIN_ONLY_OPERATION"
  /* ADMIN_ONLY_OPERATION */
  , "admin-restricted-operation"), _defineProperty(_SERVER_ERROR_MAP, "INVALID_MFA_PENDING_CREDENTIAL"
  /* INVALID_MFA_PENDING_CREDENTIAL */
  , "invalid-multi-factor-session"), _defineProperty(_SERVER_ERROR_MAP, "MFA_ENROLLMENT_NOT_FOUND"
  /* MFA_ENROLLMENT_NOT_FOUND */
  , "multi-factor-info-not-found"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_MFA_ENROLLMENT_ID"
  /* MISSING_MFA_ENROLLMENT_ID */
  , "missing-multi-factor-info"), _defineProperty(_SERVER_ERROR_MAP, "MISSING_MFA_PENDING_CREDENTIAL"
  /* MISSING_MFA_PENDING_CREDENTIAL */
  , "missing-multi-factor-session"), _defineProperty(_SERVER_ERROR_MAP, "SECOND_FACTOR_EXISTS"
  /* SECOND_FACTOR_EXISTS */
  , "second-factor-already-in-use"), _defineProperty(_SERVER_ERROR_MAP, "SECOND_FACTOR_LIMIT_EXCEEDED"
  /* SECOND_FACTOR_LIMIT_EXCEEDED */
  , "maximum-second-factor-count-exceeded"), _defineProperty(_SERVER_ERROR_MAP, "BLOCKING_FUNCTION_ERROR_RESPONSE"
  /* BLOCKING_FUNCTION_ERROR_RESPONSE */
  , "internal-error"), _SERVER_ERROR_MAP);
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

  var DEFAULT_API_TIMEOUT_MS = new Delay(30000, 60000);

  function _addTidIfNecessary(auth, request) {
    if (auth.tenantId && !request.tenantId) {
      return Object.assign(Object.assign({}, request), {
        tenantId: auth.tenantId
      });
    }

    return request;
  }

  function _performApiRequest(_x, _x2, _x3, _x4) {
    return _performApiRequest2.apply(this, arguments);
  }

  function _performApiRequest2() {
    _performApiRequest2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee89(auth, method, path, request) {
      var customErrorMap,
          _args89 = arguments;
      return _regeneratorRuntime().wrap(function _callee89$(_context89) {
        while (1) {
          switch (_context89.prev = _context89.next) {
            case 0:
              customErrorMap = _args89.length > 4 && _args89[4] !== undefined ? _args89[4] : {};
              return _context89.abrupt("return", _performFetchWithErrorHandling(auth, customErrorMap, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee88() {
                var body, params, query, headers;
                return _regeneratorRuntime().wrap(function _callee88$(_context88) {
                  while (1) {
                    switch (_context88.prev = _context88.next) {
                      case 0:
                        body = {};
                        params = {};

                        if (request) {
                          if (method === "GET"
                          /* GET */
                          ) {
                            params = request;
                          } else {
                            body = {
                              body: JSON.stringify(request)
                            };
                          }
                        }

                        query = querystring(Object.assign({
                          key: auth.config.apiKey
                        }, params)).slice(1);
                        _context88.next = 6;
                        return auth._getAdditionalHeaders();

                      case 6:
                        headers = _context88.sent;
                        headers["Content-Type"
                        /* CONTENT_TYPE */
                        ] = 'application/json';

                        if (auth.languageCode) {
                          headers["X-Firebase-Locale"
                          /* X_FIREBASE_LOCALE */
                          ] = auth.languageCode;
                        }

                        return _context88.abrupt("return", FetchProvider.fetch()(_getFinalTarget(auth, auth.config.apiHost, path, query), Object.assign({
                          method: method,
                          headers: headers,
                          referrerPolicy: 'no-referrer'
                        }, body)));

                      case 10:
                      case "end":
                        return _context88.stop();
                    }
                  }
                }, _callee88);
              }))));

            case 2:
            case "end":
              return _context89.stop();
          }
        }
      }, _callee89);
    }));
    return _performApiRequest2.apply(this, arguments);
  }

  function _performFetchWithErrorHandling(_x5, _x6, _x7) {
    return _performFetchWithErrorHandling2.apply(this, arguments);
  }

  function _performFetchWithErrorHandling2() {
    _performFetchWithErrorHandling2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee90(auth, customErrorMap, fetchFn) {
      var errorMap, networkTimeout, response, json, errorMessage, _errorMessage$split, _errorMessage$split2, serverErrorCode, serverErrorMessage, authError;

      return _regeneratorRuntime().wrap(function _callee90$(_context90) {
        while (1) {
          switch (_context90.prev = _context90.next) {
            case 0:
              auth._canInitEmulator = false;
              errorMap = Object.assign(Object.assign({}, SERVER_ERROR_MAP), customErrorMap);
              _context90.prev = 2;
              networkTimeout = new NetworkTimeout(auth);
              _context90.next = 6;
              return Promise.race([fetchFn(), networkTimeout.promise]);

            case 6:
              response = _context90.sent;
              // If we've reached this point, the fetch succeeded and the networkTimeout
              // didn't throw; clear the network timeout delay so that Node won't hang
              networkTimeout.clearNetworkTimeout();
              _context90.next = 10;
              return response.json();

            case 10:
              json = _context90.sent;

              if (!('needConfirmation' in json)) {
                _context90.next = 13;
                break;
              }

              throw _makeTaggedError(auth, "account-exists-with-different-credential"
              /* NEED_CONFIRMATION */
              , json);

            case 13:
              if (!(response.ok && !('errorMessage' in json))) {
                _context90.next = 17;
                break;
              }

              return _context90.abrupt("return", json);

            case 17:
              errorMessage = response.ok ? json.errorMessage : json.error.message;
              _errorMessage$split = errorMessage.split(' : '), _errorMessage$split2 = _slicedToArray(_errorMessage$split, 2), serverErrorCode = _errorMessage$split2[0], serverErrorMessage = _errorMessage$split2[1];

              if (!(serverErrorCode === "FEDERATED_USER_ID_ALREADY_LINKED"
              /* FEDERATED_USER_ID_ALREADY_LINKED */
              )) {
                _context90.next = 23;
                break;
              }

              throw _makeTaggedError(auth, "credential-already-in-use"
              /* CREDENTIAL_ALREADY_IN_USE */
              , json);

            case 23:
              if (!(serverErrorCode === "EMAIL_EXISTS"
              /* EMAIL_EXISTS */
              )) {
                _context90.next = 27;
                break;
              }

              throw _makeTaggedError(auth, "email-already-in-use"
              /* EMAIL_EXISTS */
              , json);

            case 27:
              if (!(serverErrorCode === "USER_DISABLED"
              /* USER_DISABLED */
              )) {
                _context90.next = 29;
                break;
              }

              throw _makeTaggedError(auth, "user-disabled"
              /* USER_DISABLED */
              , json);

            case 29:
              authError = errorMap[serverErrorCode] || serverErrorCode.toLowerCase().replace(/[_\s]+/g, '-');

              if (!serverErrorMessage) {
                _context90.next = 34;
                break;
              }

              throw _errorWithCustomMessage(auth, authError, serverErrorMessage);

            case 34:
              _fail(auth, authError);

            case 35:
              _context90.next = 42;
              break;

            case 37:
              _context90.prev = 37;
              _context90.t0 = _context90["catch"](2);

              if (!(_context90.t0 instanceof FirebaseError)) {
                _context90.next = 41;
                break;
              }

              throw _context90.t0;

            case 41:
              _fail(auth, "network-request-failed"
              /* NETWORK_REQUEST_FAILED */
              );

            case 42:
            case "end":
              return _context90.stop();
          }
        }
      }, _callee90, null, [[2, 37]]);
    }));
    return _performFetchWithErrorHandling2.apply(this, arguments);
  }

  function _performSignInRequest(_x8, _x9, _x10, _x11) {
    return _performSignInRequest2.apply(this, arguments);
  }

  function _performSignInRequest2() {
    _performSignInRequest2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee91(auth, method, path, request) {
      var customErrorMap,
          serverResponse,
          _args91 = arguments;
      return _regeneratorRuntime().wrap(function _callee91$(_context91) {
        while (1) {
          switch (_context91.prev = _context91.next) {
            case 0:
              customErrorMap = _args91.length > 4 && _args91[4] !== undefined ? _args91[4] : {};
              _context91.next = 3;
              return _performApiRequest(auth, method, path, request, customErrorMap);

            case 3:
              serverResponse = _context91.sent;

              if ('mfaPendingCredential' in serverResponse) {
                _fail(auth, "multi-factor-auth-required"
                /* MFA_REQUIRED */
                , {
                  _serverResponse: serverResponse
                });
              }

              return _context91.abrupt("return", serverResponse);

            case 6:
            case "end":
              return _context91.stop();
          }
        }
      }, _callee91);
    }));
    return _performSignInRequest2.apply(this, arguments);
  }

  function _getFinalTarget(auth, host, path, query) {
    var base = "".concat(host).concat(path, "?").concat(query);

    if (!auth.config.emulator) {
      return "".concat(auth.config.apiScheme, "://").concat(base);
    }

    return _emulatorUrl(auth.config, base);
  }

  var NetworkTimeout = /*#__PURE__*/function () {
    function NetworkTimeout(auth) {
      var _this = this;

      _classCallCheck(this, NetworkTimeout);

      this.auth = auth; // Node timers and browser timers are fundamentally incompatible, but we
      // don't care about the value here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any

      this.timer = null;
      this.promise = new Promise(function (_, reject) {
        _this.timer = setTimeout(function () {
          return reject(_createError(_this.auth, "network-request-failed"
          /* NETWORK_REQUEST_FAILED */
          ));
        }, DEFAULT_API_TIMEOUT_MS.get());
      });
    }

    _createClass(NetworkTimeout, [{
      key: "clearNetworkTimeout",
      value: function clearNetworkTimeout() {
        clearTimeout(this.timer);
      }
    }]);

    return NetworkTimeout;
  }();

  function _makeTaggedError(auth, code, response) {
    var errorParams = {
      appName: auth.name
    };

    if (response.email) {
      errorParams.email = response.email;
    }

    if (response.phoneNumber) {
      errorParams.phoneNumber = response.phoneNumber;
    }

    var error = _createError(auth, code, errorParams); // We know customData is defined on error because errorParams is defined


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


  function deleteAccount(_x12, _x13) {
    return _deleteAccount.apply(this, arguments);
  }

  function _deleteAccount() {
    _deleteAccount = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee92(auth, request) {
      return _regeneratorRuntime().wrap(function _callee92$(_context92) {
        while (1) {
          switch (_context92.prev = _context92.next) {
            case 0:
              return _context92.abrupt("return", _performApiRequest(auth, "POST"
              /* POST */
              , "/v1/accounts:delete"
              /* DELETE_ACCOUNT */
              , request));

            case 1:
            case "end":
              return _context92.stop();
          }
        }
      }, _callee92);
    }));
    return _deleteAccount.apply(this, arguments);
  }

  function getAccountInfo(_x16, _x17) {
    return _getAccountInfo.apply(this, arguments);
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


  function _getAccountInfo() {
    _getAccountInfo = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee94(auth, request) {
      return _regeneratorRuntime().wrap(function _callee94$(_context94) {
        while (1) {
          switch (_context94.prev = _context94.next) {
            case 0:
              return _context94.abrupt("return", _performApiRequest(auth, "POST"
              /* POST */
              , "/v1/accounts:lookup"
              /* GET_ACCOUNT_INFO */
              , request));

            case 1:
            case "end":
              return _context94.stop();
          }
        }
      }, _callee94);
    }));
    return _getAccountInfo.apply(this, arguments);
  }

  function utcTimestampToDateString(utcTimestamp) {
    if (!utcTimestamp) {
      return undefined;
    }

    try {
      // Convert to date object.
      var date = new Date(Number(utcTimestamp)); // Test date is valid.

      if (!isNaN(date.getTime())) {
        // Convert to UTC date string.
        return date.toUTCString();
      }
    } catch (e) {// Do nothing. undefined will be returned.
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
    var forceRefresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return getModularInstance(user).getIdToken(forceRefresh);
  }
  /**
   * Returns a deserialized JSON Web Token (JWT) used to identitfy the user to a Firebase service.
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


  function _getIdTokenResult2(_x18) {
    return _getIdTokenResult.apply(this, arguments);
  }

  function _getIdTokenResult() {
    _getIdTokenResult = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee95(user) {
      var forceRefresh,
          userInternal,
          token,
          claims,
          firebase,
          signInProvider,
          _args95 = arguments;
      return _regeneratorRuntime().wrap(function _callee95$(_context95) {
        while (1) {
          switch (_context95.prev = _context95.next) {
            case 0:
              forceRefresh = _args95.length > 1 && _args95[1] !== undefined ? _args95[1] : false;
              userInternal = getModularInstance(user);
              _context95.next = 4;
              return userInternal.getIdToken(forceRefresh);

            case 4:
              token = _context95.sent;
              claims = _parseToken(token);

              _assert(claims && claims.exp && claims.auth_time && claims.iat, userInternal.auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              firebase = _typeof(claims.firebase) === 'object' ? claims.firebase : undefined;
              signInProvider = firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_provider'];
              return _context95.abrupt("return", {
                claims: claims,
                token: token,
                authTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.auth_time)),
                issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.iat)),
                expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.exp)),
                signInProvider: signInProvider || null,
                signInSecondFactor: (firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_second_factor']) || null
              });

            case 10:
            case "end":
              return _context95.stop();
          }
        }
      }, _callee95);
    }));
    return _getIdTokenResult.apply(this, arguments);
  }

  function secondsStringToMilliseconds(seconds) {
    return Number(seconds) * 1000;
  }

  function _parseToken(token) {
    var _a;

    var _token$split = token.split('.'),
        _token$split2 = _slicedToArray(_token$split, 3),
        algorithm = _token$split2[0],
        payload = _token$split2[1],
        signature = _token$split2[2];

    if (algorithm === undefined || payload === undefined || signature === undefined) {
      _logError('JWT malformed, contained fewer than 3 sections');

      return null;
    }

    try {
      var decoded = base64Decode(payload);

      if (!decoded) {
        _logError('Failed to decode base64 JWT payload');

        return null;
      }

      return JSON.parse(decoded);
    } catch (e) {
      _logError('Caught error parsing JWT payload as JSON', (_a = e) === null || _a === void 0 ? void 0 : _a.toString());

      return null;
    }
  }
  /**
   * Extract expiresIn TTL from a token by subtracting the expiration from the issuance.
   */


  function _tokenExpiresIn(token) {
    var parsedToken = _parseToken(token);

    _assert(parsedToken, "internal-error"
    /* INTERNAL_ERROR */
    );

    _assert(typeof parsedToken.exp !== 'undefined', "internal-error"
    /* INTERNAL_ERROR */
    );

    _assert(typeof parsedToken.iat !== 'undefined', "internal-error"
    /* INTERNAL_ERROR */
    );

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


  function _logoutIfInvalidated(_x19, _x20) {
    return _logoutIfInvalidated2.apply(this, arguments);
  }

  function _logoutIfInvalidated2() {
    _logoutIfInvalidated2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee96(user, promise) {
      var bypassAuthState,
          _args96 = arguments;
      return _regeneratorRuntime().wrap(function _callee96$(_context96) {
        while (1) {
          switch (_context96.prev = _context96.next) {
            case 0:
              bypassAuthState = _args96.length > 2 && _args96[2] !== undefined ? _args96[2] : false;

              if (!bypassAuthState) {
                _context96.next = 3;
                break;
              }

              return _context96.abrupt("return", promise);

            case 3:
              _context96.prev = 3;
              _context96.next = 6;
              return promise;

            case 6:
              return _context96.abrupt("return", _context96.sent);

            case 9:
              _context96.prev = 9;
              _context96.t0 = _context96["catch"](3);

              if (!(_context96.t0 instanceof FirebaseError && isUserInvalidated(_context96.t0))) {
                _context96.next = 15;
                break;
              }

              if (!(user.auth.currentUser === user)) {
                _context96.next = 15;
                break;
              }

              _context96.next = 15;
              return user.auth.signOut();

            case 15:
              throw _context96.t0;

            case 16:
            case "end":
              return _context96.stop();
          }
        }
      }, _callee96, null, [[3, 9]]);
    }));
    return _logoutIfInvalidated2.apply(this, arguments);
  }

  function isUserInvalidated(_ref3) {
    var code = _ref3.code;
    return code === "auth/".concat("user-disabled"
    /* USER_DISABLED */
    ) || code === "auth/".concat("user-token-expired"
    /* TOKEN_EXPIRED */
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


  var ProactiveRefresh = /*#__PURE__*/function () {
    function ProactiveRefresh(user) {
      _classCallCheck(this, ProactiveRefresh);

      this.user = user;
      this.isRunning = false; // Node timers and browser timers return fundamentally different types.
      // We don't actually care what the value is but TS won't accept unknown and
      // we can't cast properly in both environments.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any

      this.timerId = null;
      this.errorBackoff = 30000
      /* RETRY_BACKOFF_MIN */
      ;
    }

    _createClass(ProactiveRefresh, [{
      key: "_start",
      value: function _start() {
        if (this.isRunning) {
          return;
        }

        this.isRunning = true;
        this.schedule();
      }
    }, {
      key: "_stop",
      value: function _stop() {
        if (!this.isRunning) {
          return;
        }

        this.isRunning = false;

        if (this.timerId !== null) {
          clearTimeout(this.timerId);
        }
      }
    }, {
      key: "getInterval",
      value: function getInterval(wasError) {
        var _a;

        if (wasError) {
          var interval = this.errorBackoff;
          this.errorBackoff = Math.min(this.errorBackoff * 2, 960000
          /* RETRY_BACKOFF_MAX */
          );
          return interval;
        } else {
          // Reset the error backoff
          this.errorBackoff = 30000
          /* RETRY_BACKOFF_MIN */
          ;
          var expTime = (_a = this.user.stsTokenManager.expirationTime) !== null && _a !== void 0 ? _a : 0;

          var _interval = expTime - Date.now() - 300000
          /* OFFSET */
          ;

          return Math.max(0, _interval);
        }
      }
    }, {
      key: "schedule",
      value: function schedule() {
        var _this2 = this;

        var wasError = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        if (!this.isRunning) {
          // Just in case...
          return;
        }

        var interval = this.getInterval(wasError);
        this.timerId = setTimeout( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return _this2.iteration();

                case 2:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        })), interval);
      }
    }, {
      key: "iteration",
      value: function () {
        var _iteration = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
          var _a;

          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.prev = 0;
                  _context2.next = 3;
                  return this.user.getIdToken(true);

                case 3:
                  _context2.next = 9;
                  break;

                case 5:
                  _context2.prev = 5;
                  _context2.t0 = _context2["catch"](0);

                  // Only retry on network errors
                  if (((_a = _context2.t0) === null || _a === void 0 ? void 0 : _a.code) === "auth/".concat("network-request-failed"
                  /* NETWORK_REQUEST_FAILED */
                  )) {
                    this.schedule(
                    /* wasError */
                    true);
                  }

                  return _context2.abrupt("return");

                case 9:
                  this.schedule();

                case 10:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2, this, [[0, 5]]);
        }));

        function iteration() {
          return _iteration.apply(this, arguments);
        }

        return iteration;
      }()
    }]);

    return ProactiveRefresh;
  }();
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


  var UserMetadata = /*#__PURE__*/function () {
    function UserMetadata(createdAt, lastLoginAt) {
      _classCallCheck(this, UserMetadata);

      this.createdAt = createdAt;
      this.lastLoginAt = lastLoginAt;

      this._initializeTime();
    }

    _createClass(UserMetadata, [{
      key: "_initializeTime",
      value: function _initializeTime() {
        this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt);
        this.creationTime = utcTimestampToDateString(this.createdAt);
      }
    }, {
      key: "_copy",
      value: function _copy(metadata) {
        this.createdAt = metadata.createdAt;
        this.lastLoginAt = metadata.lastLoginAt;

        this._initializeTime();
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        return {
          createdAt: this.createdAt,
          lastLoginAt: this.lastLoginAt
        };
      }
    }]);

    return UserMetadata;
  }();
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


  function _reloadWithoutSaving(_x21) {
    return _reloadWithoutSaving2.apply(this, arguments);
  }
  /**
   * Reloads user account data, if signed in.
   *
   * @param user - The user.
   *
   * @public
   */


  function _reloadWithoutSaving2() {
    _reloadWithoutSaving2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee97(user) {
      var _a, auth, idToken, response, coreAccount, newProviderData, providerData, oldIsAnonymous, newIsAnonymous, isAnonymous, updates;

      return _regeneratorRuntime().wrap(function _callee97$(_context97) {
        while (1) {
          switch (_context97.prev = _context97.next) {
            case 0:
              auth = user.auth;
              _context97.next = 3;
              return user.getIdToken();

            case 3:
              idToken = _context97.sent;
              _context97.next = 6;
              return _logoutIfInvalidated(user, getAccountInfo(auth, {
                idToken: idToken
              }));

            case 6:
              response = _context97.sent;

              _assert(response === null || response === void 0 ? void 0 : response.users.length, auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              coreAccount = response.users[0];

              user._notifyReloadListener(coreAccount);

              newProviderData = ((_a = coreAccount.providerUserInfo) === null || _a === void 0 ? void 0 : _a.length) ? extractProviderData(coreAccount.providerUserInfo) : [];
              providerData = mergeProviderData(user.providerData, newProviderData); // Preserves the non-nonymous status of the stored user, even if no more
              // credentials (federated or email/password) are linked to the user. If
              // the user was previously anonymous, then use provider data to update.
              // On the other hand, if it was not anonymous before, it should never be
              // considered anonymous now.

              oldIsAnonymous = user.isAnonymous;
              newIsAnonymous = !(user.email && coreAccount.passwordHash) && !(providerData === null || providerData === void 0 ? void 0 : providerData.length);
              isAnonymous = !oldIsAnonymous ? false : newIsAnonymous;
              updates = {
                uid: coreAccount.localId,
                displayName: coreAccount.displayName || null,
                photoURL: coreAccount.photoUrl || null,
                email: coreAccount.email || null,
                emailVerified: coreAccount.emailVerified || false,
                phoneNumber: coreAccount.phoneNumber || null,
                tenantId: coreAccount.tenantId || null,
                providerData: providerData,
                metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
                isAnonymous: isAnonymous
              };
              Object.assign(user, updates);

            case 17:
            case "end":
              return _context97.stop();
          }
        }
      }, _callee97);
    }));
    return _reloadWithoutSaving2.apply(this, arguments);
  }

  function _reload2(_x22) {
    return _reload.apply(this, arguments);
  }

  function _reload() {
    _reload = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee98(user) {
      var userInternal;
      return _regeneratorRuntime().wrap(function _callee98$(_context98) {
        while (1) {
          switch (_context98.prev = _context98.next) {
            case 0:
              userInternal = getModularInstance(user);
              _context98.next = 3;
              return _reloadWithoutSaving(userInternal);

            case 3:
              _context98.next = 5;
              return userInternal.auth._persistUserIfCurrent(userInternal);

            case 5:
              userInternal.auth._notifyListenersIfCurrent(userInternal);

            case 6:
            case "end":
              return _context98.stop();
          }
        }
      }, _callee98);
    }));
    return _reload.apply(this, arguments);
  }

  function mergeProviderData(original, newData) {
    var deduped = original.filter(function (o) {
      return !newData.some(function (n) {
        return n.providerId === o.providerId;
      });
    });
    return [].concat(_toConsumableArray(deduped), _toConsumableArray(newData));
  }

  function extractProviderData(providers) {
    return providers.map(function (_a) {
      var providerId = _a.providerId,
          provider = __rest(_a, ["providerId"]);

      return {
        providerId: providerId,
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


  function requestStsToken(_x23, _x24) {
    return _requestStsToken.apply(this, arguments);
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


  function _requestStsToken() {
    _requestStsToken = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee100(auth, refreshToken) {
      var response;
      return _regeneratorRuntime().wrap(function _callee100$(_context100) {
        while (1) {
          switch (_context100.prev = _context100.next) {
            case 0:
              _context100.next = 2;
              return _performFetchWithErrorHandling(auth, {}, /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee99() {
                var body, _auth$config, tokenApiHost, apiKey, url, headers;

                return _regeneratorRuntime().wrap(function _callee99$(_context99) {
                  while (1) {
                    switch (_context99.prev = _context99.next) {
                      case 0:
                        body = querystring({
                          'grant_type': 'refresh_token',
                          'refresh_token': refreshToken
                        }).slice(1);
                        _auth$config = auth.config, tokenApiHost = _auth$config.tokenApiHost, apiKey = _auth$config.apiKey;
                        url = _getFinalTarget(auth, tokenApiHost, "/v1/token"
                        /* TOKEN */
                        , "key=".concat(apiKey));
                        _context99.next = 5;
                        return auth._getAdditionalHeaders();

                      case 5:
                        headers = _context99.sent;
                        headers["Content-Type"
                        /* CONTENT_TYPE */
                        ] = 'application/x-www-form-urlencoded';
                        return _context99.abrupt("return", FetchProvider.fetch()(url, {
                          method: "POST"
                          /* POST */
                          ,
                          headers: headers,
                          body: body
                        }));

                      case 8:
                      case "end":
                        return _context99.stop();
                    }
                  }
                }, _callee99);
              })));

            case 2:
              response = _context100.sent;
              return _context100.abrupt("return", {
                accessToken: response.access_token,
                expiresIn: response.expires_in,
                refreshToken: response.refresh_token
              });

            case 4:
            case "end":
              return _context100.stop();
          }
        }
      }, _callee100);
    }));
    return _requestStsToken.apply(this, arguments);
  }

  var StsTokenManager = /*#__PURE__*/function () {
    function StsTokenManager() {
      _classCallCheck(this, StsTokenManager);

      this.refreshToken = null;
      this.accessToken = null;
      this.expirationTime = null;
    }

    _createClass(StsTokenManager, [{
      key: "isExpired",
      get: function get() {
        return !this.expirationTime || Date.now() > this.expirationTime - 30000
        /* TOKEN_REFRESH */
        ;
      }
    }, {
      key: "updateFromServerResponse",
      value: function updateFromServerResponse(response) {
        _assert(response.idToken, "internal-error"
        /* INTERNAL_ERROR */
        );

        _assert(typeof response.idToken !== 'undefined', "internal-error"
        /* INTERNAL_ERROR */
        );

        _assert(typeof response.refreshToken !== 'undefined', "internal-error"
        /* INTERNAL_ERROR */
        );

        var expiresIn = 'expiresIn' in response && typeof response.expiresIn !== 'undefined' ? Number(response.expiresIn) : _tokenExpiresIn(response.idToken);
        this.updateTokensAndExpiration(response.idToken, response.refreshToken, expiresIn);
      }
    }, {
      key: "getToken",
      value: function () {
        var _getToken = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(auth) {
          var forceRefresh,
              _args3 = arguments;
          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  forceRefresh = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : false;

                  _assert(!this.accessToken || this.refreshToken, auth, "user-token-expired"
                  /* TOKEN_EXPIRED */
                  );

                  if (!(!forceRefresh && this.accessToken && !this.isExpired)) {
                    _context3.next = 4;
                    break;
                  }

                  return _context3.abrupt("return", this.accessToken);

                case 4:
                  if (!this.refreshToken) {
                    _context3.next = 8;
                    break;
                  }

                  _context3.next = 7;
                  return this.refresh(auth, this.refreshToken);

                case 7:
                  return _context3.abrupt("return", this.accessToken);

                case 8:
                  return _context3.abrupt("return", null);

                case 9:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3, this);
        }));

        function getToken(_x25) {
          return _getToken.apply(this, arguments);
        }

        return getToken;
      }()
    }, {
      key: "clearRefreshToken",
      value: function clearRefreshToken() {
        this.refreshToken = null;
      }
    }, {
      key: "refresh",
      value: function () {
        var _refresh = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(auth, oldToken) {
          var _yield$requestStsToke, accessToken, refreshToken, expiresIn;

          return _regeneratorRuntime().wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  _context4.next = 2;
                  return requestStsToken(auth, oldToken);

                case 2:
                  _yield$requestStsToke = _context4.sent;
                  accessToken = _yield$requestStsToke.accessToken;
                  refreshToken = _yield$requestStsToke.refreshToken;
                  expiresIn = _yield$requestStsToke.expiresIn;
                  this.updateTokensAndExpiration(accessToken, refreshToken, Number(expiresIn));

                case 7:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4, this);
        }));

        function refresh(_x26, _x27) {
          return _refresh.apply(this, arguments);
        }

        return refresh;
      }()
    }, {
      key: "updateTokensAndExpiration",
      value: function updateTokensAndExpiration(accessToken, refreshToken, expiresInSec) {
        this.refreshToken = refreshToken || null;
        this.accessToken = accessToken || null;
        this.expirationTime = Date.now() + expiresInSec * 1000;
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        return {
          refreshToken: this.refreshToken,
          accessToken: this.accessToken,
          expirationTime: this.expirationTime
        };
      }
    }, {
      key: "_assign",
      value: function _assign(stsTokenManager) {
        this.accessToken = stsTokenManager.accessToken;
        this.refreshToken = stsTokenManager.refreshToken;
        this.expirationTime = stsTokenManager.expirationTime;
      }
    }, {
      key: "_clone",
      value: function _clone() {
        return Object.assign(new StsTokenManager(), this.toJSON());
      }
    }, {
      key: "_performRefresh",
      value: function _performRefresh() {
        return debugFail('not implemented');
      }
    }], [{
      key: "fromJSON",
      value: function fromJSON(appName, object) {
        var refreshToken = object.refreshToken,
            accessToken = object.accessToken,
            expirationTime = object.expirationTime;
        var manager = new StsTokenManager();

        if (refreshToken) {
          _assert(typeof refreshToken === 'string', "internal-error"
          /* INTERNAL_ERROR */
          , {
            appName: appName
          });

          manager.refreshToken = refreshToken;
        }

        if (accessToken) {
          _assert(typeof accessToken === 'string', "internal-error"
          /* INTERNAL_ERROR */
          , {
            appName: appName
          });

          manager.accessToken = accessToken;
        }

        if (expirationTime) {
          _assert(typeof expirationTime === 'number', "internal-error"
          /* INTERNAL_ERROR */
          , {
            appName: appName
          });

          manager.expirationTime = expirationTime;
        }

        return manager;
      }
    }]);

    return StsTokenManager;
  }();
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
    _assert(typeof assertion === 'string' || typeof assertion === 'undefined', "internal-error"
    /* INTERNAL_ERROR */
    , {
      appName: appName
    });
  }

  var UserImpl = /*#__PURE__*/function () {
    function UserImpl(_a) {
      _classCallCheck(this, UserImpl);

      var uid = _a.uid,
          auth = _a.auth,
          stsTokenManager = _a.stsTokenManager,
          opt = __rest(_a, ["uid", "auth", "stsTokenManager"]); // For the user object, provider is always Firebase.


      this.providerId = "firebase"
      /* FIREBASE */
      ;
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
      this.providerData = opt.providerData ? _toConsumableArray(opt.providerData) : [];
      this.metadata = new UserMetadata(opt.createdAt || undefined, opt.lastLoginAt || undefined);
    }

    _createClass(UserImpl, [{
      key: "getIdToken",
      value: function () {
        var _getIdToken = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(forceRefresh) {
          var accessToken;
          return _regeneratorRuntime().wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  _context5.next = 2;
                  return _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, forceRefresh));

                case 2:
                  accessToken = _context5.sent;

                  _assert(accessToken, this.auth, "internal-error"
                  /* INTERNAL_ERROR */
                  );

                  if (!(this.accessToken !== accessToken)) {
                    _context5.next = 9;
                    break;
                  }

                  this.accessToken = accessToken;
                  _context5.next = 8;
                  return this.auth._persistUserIfCurrent(this);

                case 8:
                  this.auth._notifyListenersIfCurrent(this);

                case 9:
                  return _context5.abrupt("return", accessToken);

                case 10:
                case "end":
                  return _context5.stop();
              }
            }
          }, _callee5, this);
        }));

        function getIdToken(_x28) {
          return _getIdToken.apply(this, arguments);
        }

        return getIdToken;
      }()
    }, {
      key: "getIdTokenResult",
      value: function getIdTokenResult(forceRefresh) {
        return _getIdTokenResult2(this, forceRefresh);
      }
    }, {
      key: "reload",
      value: function reload() {
        return _reload2(this);
      }
    }, {
      key: "_assign",
      value: function _assign(user) {
        if (this === user) {
          return;
        }

        _assert(this.uid === user.uid, this.auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        this.displayName = user.displayName;
        this.photoURL = user.photoURL;
        this.email = user.email;
        this.emailVerified = user.emailVerified;
        this.phoneNumber = user.phoneNumber;
        this.isAnonymous = user.isAnonymous;
        this.tenantId = user.tenantId;
        this.providerData = user.providerData.map(function (userInfo) {
          return Object.assign({}, userInfo);
        });

        this.metadata._copy(user.metadata);

        this.stsTokenManager._assign(user.stsTokenManager);
      }
    }, {
      key: "_clone",
      value: function _clone(auth) {
        return new UserImpl(Object.assign(Object.assign({}, this), {
          auth: auth,
          stsTokenManager: this.stsTokenManager._clone()
        }));
      }
    }, {
      key: "_onReload",
      value: function _onReload(callback) {
        // There should only ever be one listener, and that is a single instance of MultiFactorUser
        _assert(!this.reloadListener, this.auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        this.reloadListener = callback;

        if (this.reloadUserInfo) {
          this._notifyReloadListener(this.reloadUserInfo);

          this.reloadUserInfo = null;
        }
      }
    }, {
      key: "_notifyReloadListener",
      value: function _notifyReloadListener(userInfo) {
        if (this.reloadListener) {
          this.reloadListener(userInfo);
        } else {
          // If no listener is subscribed yet, save the result so it's available when they do subscribe
          this.reloadUserInfo = userInfo;
        }
      }
    }, {
      key: "_startProactiveRefresh",
      value: function _startProactiveRefresh() {
        this.proactiveRefresh._start();
      }
    }, {
      key: "_stopProactiveRefresh",
      value: function _stopProactiveRefresh() {
        this.proactiveRefresh._stop();
      }
    }, {
      key: "_updateTokensIfNecessary",
      value: function () {
        var _updateTokensIfNecessary2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(response) {
          var reload,
              tokensRefreshed,
              _args6 = arguments;
          return _regeneratorRuntime().wrap(function _callee6$(_context6) {
            while (1) {
              switch (_context6.prev = _context6.next) {
                case 0:
                  reload = _args6.length > 1 && _args6[1] !== undefined ? _args6[1] : false;
                  tokensRefreshed = false;

                  if (response.idToken && response.idToken !== this.stsTokenManager.accessToken) {
                    this.stsTokenManager.updateFromServerResponse(response);
                    tokensRefreshed = true;
                  }

                  if (!reload) {
                    _context6.next = 6;
                    break;
                  }

                  _context6.next = 6;
                  return _reloadWithoutSaving(this);

                case 6:
                  _context6.next = 8;
                  return this.auth._persistUserIfCurrent(this);

                case 8:
                  if (tokensRefreshed) {
                    this.auth._notifyListenersIfCurrent(this);
                  }

                case 9:
                case "end":
                  return _context6.stop();
              }
            }
          }, _callee6, this);
        }));

        function _updateTokensIfNecessary(_x29) {
          return _updateTokensIfNecessary2.apply(this, arguments);
        }

        return _updateTokensIfNecessary;
      }()
    }, {
      key: "delete",
      value: function () {
        var _delete2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
          var idToken;
          return _regeneratorRuntime().wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  _context7.next = 2;
                  return this.getIdToken();

                case 2:
                  idToken = _context7.sent;
                  _context7.next = 5;
                  return _logoutIfInvalidated(this, deleteAccount(this.auth, {
                    idToken: idToken
                  }));

                case 5:
                  this.stsTokenManager.clearRefreshToken(); // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
                  //       cancels pending actions...

                  return _context7.abrupt("return", this.auth.signOut());

                case 7:
                case "end":
                  return _context7.stop();
              }
            }
          }, _callee7, this);
        }));

        function _delete() {
          return _delete2.apply(this, arguments);
        }

        return _delete;
      }()
    }, {
      key: "toJSON",
      value: function toJSON() {
        return Object.assign(Object.assign({
          uid: this.uid,
          email: this.email || undefined,
          emailVerified: this.emailVerified,
          displayName: this.displayName || undefined,
          isAnonymous: this.isAnonymous,
          photoURL: this.photoURL || undefined,
          phoneNumber: this.phoneNumber || undefined,
          tenantId: this.tenantId || undefined,
          providerData: this.providerData.map(function (userInfo) {
            return Object.assign({}, userInfo);
          }),
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
    }, {
      key: "refreshToken",
      get: function get() {
        return this.stsTokenManager.refreshToken || '';
      }
    }], [{
      key: "_fromJSON",
      value: function _fromJSON(auth, object) {
        var _a, _b, _c, _d, _e, _f, _g, _h;

        var displayName = (_a = object.displayName) !== null && _a !== void 0 ? _a : undefined;
        var email = (_b = object.email) !== null && _b !== void 0 ? _b : undefined;
        var phoneNumber = (_c = object.phoneNumber) !== null && _c !== void 0 ? _c : undefined;
        var photoURL = (_d = object.photoURL) !== null && _d !== void 0 ? _d : undefined;
        var tenantId = (_e = object.tenantId) !== null && _e !== void 0 ? _e : undefined;

        var _redirectEventId = (_f = object._redirectEventId) !== null && _f !== void 0 ? _f : undefined;

        var createdAt = (_g = object.createdAt) !== null && _g !== void 0 ? _g : undefined;
        var lastLoginAt = (_h = object.lastLoginAt) !== null && _h !== void 0 ? _h : undefined;
        var uid = object.uid,
            emailVerified = object.emailVerified,
            isAnonymous = object.isAnonymous,
            providerData = object.providerData,
            plainObjectTokenManager = object.stsTokenManager;

        _assert(uid && plainObjectTokenManager, auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        var stsTokenManager = StsTokenManager.fromJSON(this.name, plainObjectTokenManager);

        _assert(typeof uid === 'string', auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        assertStringOrUndefined(displayName, auth.name);
        assertStringOrUndefined(email, auth.name);

        _assert(typeof emailVerified === 'boolean', auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        _assert(typeof isAnonymous === 'boolean', auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        assertStringOrUndefined(phoneNumber, auth.name);
        assertStringOrUndefined(photoURL, auth.name);
        assertStringOrUndefined(tenantId, auth.name);
        assertStringOrUndefined(_redirectEventId, auth.name);
        assertStringOrUndefined(createdAt, auth.name);
        assertStringOrUndefined(lastLoginAt, auth.name);
        var user = new UserImpl({
          uid: uid,
          auth: auth,
          email: email,
          emailVerified: emailVerified,
          displayName: displayName,
          isAnonymous: isAnonymous,
          photoURL: photoURL,
          phoneNumber: phoneNumber,
          tenantId: tenantId,
          stsTokenManager: stsTokenManager,
          createdAt: createdAt,
          lastLoginAt: lastLoginAt
        });

        if (providerData && Array.isArray(providerData)) {
          user.providerData = providerData.map(function (userInfo) {
            return Object.assign({}, userInfo);
          });
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

    }, {
      key: "_fromIdTokenResponse",
      value: function () {
        var _fromIdTokenResponse2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(auth, idTokenResponse) {
          var isAnonymous,
              stsTokenManager,
              user,
              _args8 = arguments;
          return _regeneratorRuntime().wrap(function _callee8$(_context8) {
            while (1) {
              switch (_context8.prev = _context8.next) {
                case 0:
                  isAnonymous = _args8.length > 2 && _args8[2] !== undefined ? _args8[2] : false;
                  stsTokenManager = new StsTokenManager();
                  stsTokenManager.updateFromServerResponse(idTokenResponse); // Initialize the Firebase Auth user.

                  user = new UserImpl({
                    uid: idTokenResponse.localId,
                    auth: auth,
                    stsTokenManager: stsTokenManager,
                    isAnonymous: isAnonymous
                  }); // Updates the user info and data and resolves with a user instance.

                  _context8.next = 6;
                  return _reloadWithoutSaving(user);

                case 6:
                  return _context8.abrupt("return", user);

                case 7:
                case "end":
                  return _context8.stop();
              }
            }
          }, _callee8);
        }));

        function _fromIdTokenResponse(_x30, _x31) {
          return _fromIdTokenResponse2.apply(this, arguments);
        }

        return _fromIdTokenResponse;
      }()
    }]);

    return UserImpl;
  }();
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


  var InMemoryPersistence = /*#__PURE__*/function () {
    function InMemoryPersistence() {
      _classCallCheck(this, InMemoryPersistence);

      this.type = "NONE"
      /* NONE */
      ;
      this.storage = {};
    }

    _createClass(InMemoryPersistence, [{
      key: "_isAvailable",
      value: function () {
        var _isAvailable2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
          return _regeneratorRuntime().wrap(function _callee9$(_context9) {
            while (1) {
              switch (_context9.prev = _context9.next) {
                case 0:
                  return _context9.abrupt("return", true);

                case 1:
                case "end":
                  return _context9.stop();
              }
            }
          }, _callee9);
        }));

        function _isAvailable() {
          return _isAvailable2.apply(this, arguments);
        }

        return _isAvailable;
      }()
    }, {
      key: "_set",
      value: function () {
        var _set2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(key, value) {
          return _regeneratorRuntime().wrap(function _callee10$(_context10) {
            while (1) {
              switch (_context10.prev = _context10.next) {
                case 0:
                  this.storage[key] = value;

                case 1:
                case "end":
                  return _context10.stop();
              }
            }
          }, _callee10, this);
        }));

        function _set(_x32, _x33) {
          return _set2.apply(this, arguments);
        }

        return _set;
      }()
    }, {
      key: "_get",
      value: function () {
        var _get2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(key) {
          var value;
          return _regeneratorRuntime().wrap(function _callee11$(_context11) {
            while (1) {
              switch (_context11.prev = _context11.next) {
                case 0:
                  value = this.storage[key];
                  return _context11.abrupt("return", value === undefined ? null : value);

                case 2:
                case "end":
                  return _context11.stop();
              }
            }
          }, _callee11, this);
        }));

        function _get(_x34) {
          return _get2.apply(this, arguments);
        }

        return _get;
      }()
    }, {
      key: "_remove",
      value: function () {
        var _remove2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(key) {
          return _regeneratorRuntime().wrap(function _callee12$(_context12) {
            while (1) {
              switch (_context12.prev = _context12.next) {
                case 0:
                  delete this.storage[key];

                case 1:
                case "end":
                  return _context12.stop();
              }
            }
          }, _callee12, this);
        }));

        function _remove(_x35) {
          return _remove2.apply(this, arguments);
        }

        return _remove;
      }()
    }, {
      key: "_addListener",
      value: function _addListener(_key, _listener) {
        // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
        return;
      }
    }, {
      key: "_removeListener",
      value: function _removeListener(_key, _listener) {
        // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
        return;
      }
    }]);

    return InMemoryPersistence;
  }();

  InMemoryPersistence.type = 'NONE';
  /**
   * An implementation of {@link Persistence} of type 'NONE'.
   *
   * @public
   */

  var inMemoryPersistence = InMemoryPersistence;
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
    return "firebase"
    /* PERSISTENCE */
    .concat(":", key, ":").concat(apiKey, ":").concat(appName);
  }

  var PersistenceUserManager = /*#__PURE__*/function () {
    function PersistenceUserManager(persistence, auth, userKey) {
      _classCallCheck(this, PersistenceUserManager);

      this.persistence = persistence;
      this.auth = auth;
      this.userKey = userKey;
      var _this$auth = this.auth,
          config = _this$auth.config,
          name = _this$auth.name;
      this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
      this.fullPersistenceKey = _persistenceKeyName("persistence"
      /* PERSISTENCE_USER */
      , config.apiKey, name);
      this.boundEventHandler = auth._onStorageEvent.bind(auth);

      this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
    }

    _createClass(PersistenceUserManager, [{
      key: "setCurrentUser",
      value: function setCurrentUser(user) {
        return this.persistence._set(this.fullUserKey, user.toJSON());
      }
    }, {
      key: "getCurrentUser",
      value: function () {
        var _getCurrentUser = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
          var blob;
          return _regeneratorRuntime().wrap(function _callee13$(_context13) {
            while (1) {
              switch (_context13.prev = _context13.next) {
                case 0:
                  _context13.next = 2;
                  return this.persistence._get(this.fullUserKey);

                case 2:
                  blob = _context13.sent;
                  return _context13.abrupt("return", blob ? UserImpl._fromJSON(this.auth, blob) : null);

                case 4:
                case "end":
                  return _context13.stop();
              }
            }
          }, _callee13, this);
        }));

        function getCurrentUser() {
          return _getCurrentUser.apply(this, arguments);
        }

        return getCurrentUser;
      }()
    }, {
      key: "removeCurrentUser",
      value: function removeCurrentUser() {
        return this.persistence._remove(this.fullUserKey);
      }
    }, {
      key: "savePersistenceForRedirect",
      value: function savePersistenceForRedirect() {
        return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
      }
    }, {
      key: "setPersistence",
      value: function () {
        var _setPersistence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14(newPersistence) {
          var currentUser;
          return _regeneratorRuntime().wrap(function _callee14$(_context14) {
            while (1) {
              switch (_context14.prev = _context14.next) {
                case 0:
                  if (!(this.persistence === newPersistence)) {
                    _context14.next = 2;
                    break;
                  }

                  return _context14.abrupt("return");

                case 2:
                  _context14.next = 4;
                  return this.getCurrentUser();

                case 4:
                  currentUser = _context14.sent;
                  _context14.next = 7;
                  return this.removeCurrentUser();

                case 7:
                  this.persistence = newPersistence;

                  if (!currentUser) {
                    _context14.next = 10;
                    break;
                  }

                  return _context14.abrupt("return", this.setCurrentUser(currentUser));

                case 10:
                case "end":
                  return _context14.stop();
              }
            }
          }, _callee14, this);
        }));

        function setPersistence(_x36) {
          return _setPersistence.apply(this, arguments);
        }

        return setPersistence;
      }()
    }, {
      key: "delete",
      value: function _delete() {
        this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
      }
    }], [{
      key: "create",
      value: function () {
        var _create = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17(auth, persistenceHierarchy) {
          var userKey,
              availablePersistences,
              selectedPersistence,
              key,
              userToMigrate,
              _iterator,
              _step,
              persistence,
              blob,
              user,
              migrationHierarchy,
              _args17 = arguments;

          return _regeneratorRuntime().wrap(function _callee17$(_context17) {
            while (1) {
              switch (_context17.prev = _context17.next) {
                case 0:
                  userKey = _args17.length > 2 && _args17[2] !== undefined ? _args17[2] : "authUser";

                  if (persistenceHierarchy.length) {
                    _context17.next = 3;
                    break;
                  }

                  return _context17.abrupt("return", new PersistenceUserManager(_getInstance(inMemoryPersistence), auth, userKey));

                case 3:
                  _context17.next = 5;
                  return Promise.all(persistenceHierarchy.map( /*#__PURE__*/function () {
                    var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15(persistence) {
                      return _regeneratorRuntime().wrap(function _callee15$(_context15) {
                        while (1) {
                          switch (_context15.prev = _context15.next) {
                            case 0:
                              _context15.next = 2;
                              return persistence._isAvailable();

                            case 2:
                              if (!_context15.sent) {
                                _context15.next = 4;
                                break;
                              }

                              return _context15.abrupt("return", persistence);

                            case 4:
                              return _context15.abrupt("return", undefined);

                            case 5:
                            case "end":
                              return _context15.stop();
                          }
                        }
                      }, _callee15);
                    }));

                    return function (_x39) {
                      return _ref5.apply(this, arguments);
                    };
                  }()));

                case 5:
                  availablePersistences = _context17.sent.filter(function (persistence) {
                    return persistence;
                  });
                  // Fall back to the first persistence listed, or in memory if none available
                  selectedPersistence = availablePersistences[0] || _getInstance(inMemoryPersistence);
                  key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name); // Pull out the existing user, setting the chosen persistence to that
                  // persistence if the user exists.

                  userToMigrate = null; // Note, here we check for a user in _all_ persistences, not just the
                  // ones deemed available. If we can migrate a user out of a broken
                  // persistence, we will (but only if that persistence supports migration).

                  _iterator = _createForOfIteratorHelper(persistenceHierarchy);
                  _context17.prev = 10;

                  _iterator.s();

                case 12:
                  if ((_step = _iterator.n()).done) {
                    _context17.next = 29;
                    break;
                  }

                  persistence = _step.value;
                  _context17.prev = 14;
                  _context17.next = 17;
                  return persistence._get(key);

                case 17:
                  blob = _context17.sent;

                  if (!blob) {
                    _context17.next = 23;
                    break;
                  }

                  user = UserImpl._fromJSON(auth, blob); // throws for unparsable blob (wrong format)

                  if (persistence !== selectedPersistence) {
                    userToMigrate = user;
                  }

                  selectedPersistence = persistence;
                  return _context17.abrupt("break", 29);

                case 23:
                  _context17.next = 27;
                  break;

                case 25:
                  _context17.prev = 25;
                  _context17.t0 = _context17["catch"](14);

                case 27:
                  _context17.next = 12;
                  break;

                case 29:
                  _context17.next = 34;
                  break;

                case 31:
                  _context17.prev = 31;
                  _context17.t1 = _context17["catch"](10);

                  _iterator.e(_context17.t1);

                case 34:
                  _context17.prev = 34;

                  _iterator.f();

                  return _context17.finish(34);

                case 37:
                  // If we find the user in a persistence that does support migration, use
                  // that migration path (of only persistences that support migration)
                  migrationHierarchy = availablePersistences.filter(function (p) {
                    return p._shouldAllowMigration;
                  }); // If the persistence does _not_ allow migration, just finish off here

                  if (!(!selectedPersistence._shouldAllowMigration || !migrationHierarchy.length)) {
                    _context17.next = 40;
                    break;
                  }

                  return _context17.abrupt("return", new PersistenceUserManager(selectedPersistence, auth, userKey));

                case 40:
                  selectedPersistence = migrationHierarchy[0];

                  if (!userToMigrate) {
                    _context17.next = 44;
                    break;
                  }

                  _context17.next = 44;
                  return selectedPersistence._set(key, userToMigrate.toJSON());

                case 44:
                  _context17.next = 46;
                  return Promise.all(persistenceHierarchy.map( /*#__PURE__*/function () {
                    var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16(persistence) {
                      return _regeneratorRuntime().wrap(function _callee16$(_context16) {
                        while (1) {
                          switch (_context16.prev = _context16.next) {
                            case 0:
                              if (!(persistence !== selectedPersistence)) {
                                _context16.next = 8;
                                break;
                              }

                              _context16.prev = 1;
                              _context16.next = 4;
                              return persistence._remove(key);

                            case 4:
                              _context16.next = 8;
                              break;

                            case 6:
                              _context16.prev = 6;
                              _context16.t0 = _context16["catch"](1);

                            case 8:
                            case "end":
                              return _context16.stop();
                          }
                        }
                      }, _callee16, null, [[1, 6]]);
                    }));

                    return function (_x40) {
                      return _ref6.apply(this, arguments);
                    };
                  }()));

                case 46:
                  return _context17.abrupt("return", new PersistenceUserManager(selectedPersistence, auth, userKey));

                case 47:
                case "end":
                  return _context17.stop();
              }
            }
          }, _callee17, null, [[10, 31, 34, 37], [14, 25]]);
        }));

        function create(_x37, _x38) {
          return _create.apply(this, arguments);
        }

        return create;
      }()
    }]);

    return PersistenceUserManager;
  }();
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
    var ua = userAgent.toLowerCase();

    if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
      return "Opera"
      /* OPERA */
      ;
    } else if (_isIEMobile(ua)) {
      // Windows phone IEMobile browser.
      return "IEMobile"
      /* IEMOBILE */
      ;
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      return "IE"
      /* IE */
      ;
    } else if (ua.includes('edge/')) {
      return "Edge"
      /* EDGE */
      ;
    } else if (_isFirefox(ua)) {
      return "Firefox"
      /* FIREFOX */
      ;
    } else if (ua.includes('silk/')) {
      return "Silk"
      /* SILK */
      ;
    } else if (_isBlackBerry(ua)) {
      // Blackberry browser.
      return "Blackberry"
      /* BLACKBERRY */
      ;
    } else if (_isWebOS(ua)) {
      // WebOS default browser.
      return "Webos"
      /* WEBOS */
      ;
    } else if (_isSafari(ua)) {
      return "Safari"
      /* SAFARI */
      ;
    } else if ((ua.includes('chrome/') || _isChromeIOS(ua)) && !ua.includes('edge/')) {
      return "Chrome"
      /* CHROME */
      ;
    } else if (_isAndroid(ua)) {
      // Android stock browser.
      return "Android"
      /* ANDROID */
      ;
    } else {
      // Most modern browsers have name/version at end of user agent string.
      var re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
      var matches = userAgent.match(re);

      if ((matches === null || matches === void 0 ? void 0 : matches.length) === 2) {
        return matches[1];
      }
    }

    return "Other"
    /* OTHER */
    ;
  }

  function _isFirefox() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /firefox\//i.test(ua);
  }

  function _isSafari() {
    var userAgent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    var ua = userAgent.toLowerCase();
    return ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('crios/') && !ua.includes('android');
  }

  function _isChromeIOS() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /crios\//i.test(ua);
  }

  function _isIEMobile() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /iemobile/i.test(ua);
  }

  function _isAndroid() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /android/i.test(ua);
  }

  function _isBlackBerry() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /blackberry/i.test(ua);
  }

  function _isWebOS() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /webos/i.test(ua);
  }

  function _isIOS() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
    return /iphone|ipad|ipod/i.test(ua);
  }

  function _isIOSStandalone() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();

    var _a;

    return _isIOS(ua) && !!((_a = window.navigator) === null || _a === void 0 ? void 0 : _a.standalone);
  }

  function _isIE10() {
    return isIE() && document.documentMode === 10;
  }

  function _isMobileBrowser() {
    var ua = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getUA();
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
    var frameworks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var reportedPlatform;

    switch (clientPlatform) {
      case "Browser"
      /* BROWSER */
      :
        // In a browser environment, report the browser name.
        reportedPlatform = _getBrowserName(getUA());
        break;

      case "Worker"
      /* WORKER */
      :
        // Technically a worker runs from a browser but we need to differentiate a
        // worker from a browser.
        // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
        reportedPlatform = "".concat(_getBrowserName(getUA()), "-").concat(clientPlatform);
        break;

      default:
        reportedPlatform = clientPlatform;
    }

    var reportedFrameworks = frameworks.length ? frameworks.join(',') : 'FirebaseCore-web';
    /* default value if no other framework is used */

    return "".concat(reportedPlatform, "/", "JsCore"
    /* CORE */
    , "/").concat(SDK_VERSION, "/").concat(reportedFrameworks);
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


  var AuthMiddlewareQueue = /*#__PURE__*/function () {
    function AuthMiddlewareQueue(auth) {
      _classCallCheck(this, AuthMiddlewareQueue);

      this.auth = auth;
      this.queue = [];
    }

    _createClass(AuthMiddlewareQueue, [{
      key: "pushCallback",
      value: function pushCallback(callback, onAbort) {
        var _this3 = this;

        // The callback could be sync or async. Wrap it into a
        // function that is always async.
        var wrappedCallback = function wrappedCallback(user) {
          return new Promise(function (resolve, reject) {
            try {
              var result = callback(user); // Either resolve with existing promise or wrap a non-promise
              // return value into a promise.

              resolve(result);
            } catch (e) {
              // Sync callback throws.
              reject(e);
            }
          });
        }; // Attach the onAbort if present


        wrappedCallback.onAbort = onAbort;
        this.queue.push(wrappedCallback);
        var index = this.queue.length - 1;
        return function () {
          // Unsubscribe. Replace with no-op. Do not remove from array, or it will disturb
          // indexing of other elements.
          _this3.queue[index] = function () {
            return Promise.resolve();
          };
        };
      }
    }, {
      key: "runMiddleware",
      value: function () {
        var _runMiddleware = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18(nextUser) {
          var _a, onAbortStack, _iterator2, _step2, beforeStateCallback, _iterator3, _step3, onAbort;

          return _regeneratorRuntime().wrap(function _callee18$(_context18) {
            while (1) {
              switch (_context18.prev = _context18.next) {
                case 0:
                  if (!(this.auth.currentUser === nextUser)) {
                    _context18.next = 2;
                    break;
                  }

                  return _context18.abrupt("return");

                case 2:
                  // While running the middleware, build a temporary stack of onAbort
                  // callbacks to call if one middleware callback rejects.
                  onAbortStack = [];
                  _context18.prev = 3;
                  _iterator2 = _createForOfIteratorHelper(this.queue);
                  _context18.prev = 5;

                  _iterator2.s();

                case 7:
                  if ((_step2 = _iterator2.n()).done) {
                    _context18.next = 14;
                    break;
                  }

                  beforeStateCallback = _step2.value;
                  _context18.next = 11;
                  return beforeStateCallback(nextUser);

                case 11:
                  // Only push the onAbort if the callback succeeds
                  if (beforeStateCallback.onAbort) {
                    onAbortStack.push(beforeStateCallback.onAbort);
                  }

                case 12:
                  _context18.next = 7;
                  break;

                case 14:
                  _context18.next = 19;
                  break;

                case 16:
                  _context18.prev = 16;
                  _context18.t0 = _context18["catch"](5);

                  _iterator2.e(_context18.t0);

                case 19:
                  _context18.prev = 19;

                  _iterator2.f();

                  return _context18.finish(19);

                case 22:
                  _context18.next = 30;
                  break;

                case 24:
                  _context18.prev = 24;
                  _context18.t1 = _context18["catch"](3);
                  // Run all onAbort, with separate try/catch to ignore any errors and
                  // continue
                  onAbortStack.reverse();
                  _iterator3 = _createForOfIteratorHelper(onAbortStack);

                  try {
                    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                      onAbort = _step3.value;

                      try {
                        onAbort();
                      } catch (_) {
                        /* swallow error */
                      }
                    }
                  } catch (err) {
                    _iterator3.e(err);
                  } finally {
                    _iterator3.f();
                  }

                  throw this.auth._errorFactory.create("login-blocked"
                  /* LOGIN_BLOCKED */
                  , {
                    originalMessage: (_a = _context18.t1) === null || _a === void 0 ? void 0 : _a.message
                  });

                case 30:
                case "end":
                  return _context18.stop();
              }
            }
          }, _callee18, this, [[3, 24], [5, 16, 19, 22]]);
        }));

        function runMiddleware(_x41) {
          return _runMiddleware.apply(this, arguments);
        }

        return runMiddleware;
      }()
    }]);

    return AuthMiddlewareQueue;
  }();
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


  var AuthImpl = /*#__PURE__*/function () {
    function AuthImpl(app, heartbeatServiceProvider, config) {
      _classCallCheck(this, AuthImpl);

      this.app = app;
      this.heartbeatServiceProvider = heartbeatServiceProvider;
      this.config = config;
      this.currentUser = null;
      this.emulatorConfig = null;
      this.operations = Promise.resolve();
      this.authStateSubscription = new Subscription(this);
      this.idTokenSubscription = new Subscription(this);
      this.beforeStateQueue = new AuthMiddlewareQueue(this);
      this.redirectUser = null;
      this.isProactiveRefreshEnabled = false; // Any network calls will set this to true and prevent subsequent emulator
      // initialization

      this._canInitEmulator = true;
      this._isInitialized = false;
      this._deleted = false;
      this._initializationPromise = null;
      this._popupRedirectResolver = null;
      this._errorFactory = _DEFAULT_AUTH_ERROR_FACTORY; // Tracks the last notified UID for state change listeners to prevent
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

    _createClass(AuthImpl, [{
      key: "_initializeWithPersistence",
      value: function _initializeWithPersistence(persistenceHierarchy, popupRedirectResolver) {
        var _this4 = this;

        if (popupRedirectResolver) {
          this._popupRedirectResolver = _getInstance(popupRedirectResolver);
        } // Have to check for app deletion throughout initialization (after each
        // promise resolution)


        this._initializationPromise = this.queue( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
          var _a, _b;

          return _regeneratorRuntime().wrap(function _callee19$(_context19) {
            while (1) {
              switch (_context19.prev = _context19.next) {
                case 0:
                  if (!_this4._deleted) {
                    _context19.next = 2;
                    break;
                  }

                  return _context19.abrupt("return");

                case 2:
                  _context19.next = 4;
                  return PersistenceUserManager.create(_this4, persistenceHierarchy);

                case 4:
                  _this4.persistenceManager = _context19.sent;

                  if (!_this4._deleted) {
                    _context19.next = 7;
                    break;
                  }

                  return _context19.abrupt("return");

                case 7:
                  if (!((_a = _this4._popupRedirectResolver) === null || _a === void 0 ? void 0 : _a._shouldInitProactively)) {
                    _context19.next = 15;
                    break;
                  }

                  _context19.prev = 8;
                  _context19.next = 11;
                  return _this4._popupRedirectResolver._initialize(_this4);

                case 11:
                  _context19.next = 15;
                  break;

                case 13:
                  _context19.prev = 13;
                  _context19.t0 = _context19["catch"](8);

                case 15:
                  _context19.next = 17;
                  return _this4.initializeCurrentUser(popupRedirectResolver);

                case 17:
                  _this4.lastNotifiedUid = ((_b = _this4.currentUser) === null || _b === void 0 ? void 0 : _b.uid) || null;

                  if (!_this4._deleted) {
                    _context19.next = 20;
                    break;
                  }

                  return _context19.abrupt("return");

                case 20:
                  _this4._isInitialized = true;

                case 21:
                case "end":
                  return _context19.stop();
              }
            }
          }, _callee19, null, [[8, 13]]);
        })));
        return this._initializationPromise;
      }
      /**
       * If the persistence is changed in another window, the user manager will let us know
       */

    }, {
      key: "_onStorageEvent",
      value: function () {
        var _onStorageEvent2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
          var user;
          return _regeneratorRuntime().wrap(function _callee20$(_context20) {
            while (1) {
              switch (_context20.prev = _context20.next) {
                case 0:
                  if (!this._deleted) {
                    _context20.next = 2;
                    break;
                  }

                  return _context20.abrupt("return");

                case 2:
                  _context20.next = 4;
                  return this.assertedPersistence.getCurrentUser();

                case 4:
                  user = _context20.sent;

                  if (!(!this.currentUser && !user)) {
                    _context20.next = 7;
                    break;
                  }

                  return _context20.abrupt("return");

                case 7:
                  if (!(this.currentUser && user && this.currentUser.uid === user.uid)) {
                    _context20.next = 12;
                    break;
                  }

                  // Data update, simply copy data changes.
                  this._currentUser._assign(user); // If tokens changed from previous user tokens, this will trigger
                  // notifyAuthListeners_.


                  _context20.next = 11;
                  return this.currentUser.getIdToken();

                case 11:
                  return _context20.abrupt("return");

                case 12:
                  _context20.next = 14;
                  return this._updateCurrentUser(user,
                  /* skipBeforeStateCallbacks */
                  true);

                case 14:
                case "end":
                  return _context20.stop();
              }
            }
          }, _callee20, this);
        }));

        function _onStorageEvent() {
          return _onStorageEvent2.apply(this, arguments);
        }

        return _onStorageEvent;
      }()
    }, {
      key: "initializeCurrentUser",
      value: function () {
        var _initializeCurrentUser = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee21(popupRedirectResolver) {
          var _a, previouslyStoredUser, futureCurrentUser, needsTocheckMiddleware, redirectUserEventId, storedUserEventId, result;

          return _regeneratorRuntime().wrap(function _callee21$(_context21) {
            while (1) {
              switch (_context21.prev = _context21.next) {
                case 0:
                  _context21.next = 2;
                  return this.assertedPersistence.getCurrentUser();

                case 2:
                  previouslyStoredUser = _context21.sent;
                  futureCurrentUser = previouslyStoredUser;
                  needsTocheckMiddleware = false;

                  if (!(popupRedirectResolver && this.config.authDomain)) {
                    _context21.next = 14;
                    break;
                  }

                  _context21.next = 8;
                  return this.getOrInitRedirectPersistenceManager();

                case 8:
                  redirectUserEventId = (_a = this.redirectUser) === null || _a === void 0 ? void 0 : _a._redirectEventId;
                  storedUserEventId = futureCurrentUser === null || futureCurrentUser === void 0 ? void 0 : futureCurrentUser._redirectEventId;
                  _context21.next = 12;
                  return this.tryRedirectSignIn(popupRedirectResolver);

                case 12:
                  result = _context21.sent;

                  // If the stored user (i.e. the old "currentUser") has a redirectId that
                  // matches the redirect user, then we want to initially sign in with the
                  // new user object from result.
                  // TODO(samgho): More thoroughly test all of this
                  if ((!redirectUserEventId || redirectUserEventId === storedUserEventId) && (result === null || result === void 0 ? void 0 : result.user)) {
                    futureCurrentUser = result.user;
                    needsTocheckMiddleware = true;
                  }

                case 14:
                  if (futureCurrentUser) {
                    _context21.next = 16;
                    break;
                  }

                  return _context21.abrupt("return", this.directlySetCurrentUser(null));

                case 16:
                  if (futureCurrentUser._redirectEventId) {
                    _context21.next = 32;
                    break;
                  }

                  if (!needsTocheckMiddleware) {
                    _context21.next = 27;
                    break;
                  }

                  _context21.prev = 18;
                  _context21.next = 21;
                  return this.beforeStateQueue.runMiddleware(futureCurrentUser);

                case 21:
                  _context21.next = 27;
                  break;

                case 23:
                  _context21.prev = 23;
                  _context21.t0 = _context21["catch"](18);
                  futureCurrentUser = previouslyStoredUser; // We know this is available since the bit is only set when the
                  // resolver is available

                  this._popupRedirectResolver._overrideRedirectResult(this, function () {
                    return Promise.reject(_context21.t0);
                  });

                case 27:
                  if (!futureCurrentUser) {
                    _context21.next = 31;
                    break;
                  }

                  return _context21.abrupt("return", this.reloadAndSetCurrentUserOrClear(futureCurrentUser));

                case 31:
                  return _context21.abrupt("return", this.directlySetCurrentUser(null));

                case 32:
                  _assert(this._popupRedirectResolver, this, "argument-error"
                  /* ARGUMENT_ERROR */
                  );

                  _context21.next = 35;
                  return this.getOrInitRedirectPersistenceManager();

                case 35:
                  if (!(this.redirectUser && this.redirectUser._redirectEventId === futureCurrentUser._redirectEventId)) {
                    _context21.next = 37;
                    break;
                  }

                  return _context21.abrupt("return", this.directlySetCurrentUser(futureCurrentUser));

                case 37:
                  return _context21.abrupt("return", this.reloadAndSetCurrentUserOrClear(futureCurrentUser));

                case 38:
                case "end":
                  return _context21.stop();
              }
            }
          }, _callee21, this, [[18, 23]]);
        }));

        function initializeCurrentUser(_x42) {
          return _initializeCurrentUser.apply(this, arguments);
        }

        return initializeCurrentUser;
      }()
    }, {
      key: "tryRedirectSignIn",
      value: function () {
        var _tryRedirectSignIn = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee22(redirectResolver) {
          var result;
          return _regeneratorRuntime().wrap(function _callee22$(_context22) {
            while (1) {
              switch (_context22.prev = _context22.next) {
                case 0:
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
                  result = null;
                  _context22.prev = 1;
                  _context22.next = 4;
                  return this._popupRedirectResolver._completeRedirectFn(this, redirectResolver, true);

                case 4:
                  result = _context22.sent;
                  _context22.next = 11;
                  break;

                case 7:
                  _context22.prev = 7;
                  _context22.t0 = _context22["catch"](1);
                  _context22.next = 11;
                  return this._setRedirectUser(null);

                case 11:
                  return _context22.abrupt("return", result);

                case 12:
                case "end":
                  return _context22.stop();
              }
            }
          }, _callee22, this, [[1, 7]]);
        }));

        function tryRedirectSignIn(_x43) {
          return _tryRedirectSignIn.apply(this, arguments);
        }

        return tryRedirectSignIn;
      }()
    }, {
      key: "reloadAndSetCurrentUserOrClear",
      value: function () {
        var _reloadAndSetCurrentUserOrClear = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee23(user) {
          var _a;

          return _regeneratorRuntime().wrap(function _callee23$(_context23) {
            while (1) {
              switch (_context23.prev = _context23.next) {
                case 0:
                  _context23.prev = 0;
                  _context23.next = 3;
                  return _reloadWithoutSaving(user);

                case 3:
                  _context23.next = 9;
                  break;

                case 5:
                  _context23.prev = 5;
                  _context23.t0 = _context23["catch"](0);

                  if (!(((_a = _context23.t0) === null || _a === void 0 ? void 0 : _a.code) !== "auth/".concat("network-request-failed"
                  /* NETWORK_REQUEST_FAILED */
                  ))) {
                    _context23.next = 9;
                    break;
                  }

                  return _context23.abrupt("return", this.directlySetCurrentUser(null));

                case 9:
                  return _context23.abrupt("return", this.directlySetCurrentUser(user));

                case 10:
                case "end":
                  return _context23.stop();
              }
            }
          }, _callee23, this, [[0, 5]]);
        }));

        function reloadAndSetCurrentUserOrClear(_x44) {
          return _reloadAndSetCurrentUserOrClear.apply(this, arguments);
        }

        return reloadAndSetCurrentUserOrClear;
      }()
    }, {
      key: "useDeviceLanguage",
      value: function useDeviceLanguage() {
        this.languageCode = _getUserLanguage();
      }
    }, {
      key: "_delete",
      value: function () {
        var _delete3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee24() {
          return _regeneratorRuntime().wrap(function _callee24$(_context24) {
            while (1) {
              switch (_context24.prev = _context24.next) {
                case 0:
                  this._deleted = true;

                case 1:
                case "end":
                  return _context24.stop();
              }
            }
          }, _callee24, this);
        }));

        function _delete() {
          return _delete3.apply(this, arguments);
        }

        return _delete;
      }()
    }, {
      key: "updateCurrentUser",
      value: function () {
        var _updateCurrentUser2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee25(userExtern) {
          var user;
          return _regeneratorRuntime().wrap(function _callee25$(_context25) {
            while (1) {
              switch (_context25.prev = _context25.next) {
                case 0:
                  // The public updateCurrentUser method needs to make a copy of the user,
                  // and also check that the project matches
                  user = userExtern ? getModularInstance(userExtern) : null;

                  if (user) {
                    _assert(user.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"
                    /* INVALID_AUTH */
                    );
                  }

                  return _context25.abrupt("return", this._updateCurrentUser(user && user._clone(this)));

                case 3:
                case "end":
                  return _context25.stop();
              }
            }
          }, _callee25, this);
        }));

        function updateCurrentUser(_x45) {
          return _updateCurrentUser2.apply(this, arguments);
        }

        return updateCurrentUser;
      }()
    }, {
      key: "_updateCurrentUser",
      value: function () {
        var _updateCurrentUser3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee27(user) {
          var _this5 = this;

          var skipBeforeStateCallbacks,
              _args27 = arguments;
          return _regeneratorRuntime().wrap(function _callee27$(_context27) {
            while (1) {
              switch (_context27.prev = _context27.next) {
                case 0:
                  skipBeforeStateCallbacks = _args27.length > 1 && _args27[1] !== undefined ? _args27[1] : false;

                  if (!this._deleted) {
                    _context27.next = 3;
                    break;
                  }

                  return _context27.abrupt("return");

                case 3:
                  if (user) {
                    _assert(this.tenantId === user.tenantId, this, "tenant-id-mismatch"
                    /* TENANT_ID_MISMATCH */
                    );
                  }

                  if (skipBeforeStateCallbacks) {
                    _context27.next = 7;
                    break;
                  }

                  _context27.next = 7;
                  return this.beforeStateQueue.runMiddleware(user);

                case 7:
                  return _context27.abrupt("return", this.queue( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee26() {
                    return _regeneratorRuntime().wrap(function _callee26$(_context26) {
                      while (1) {
                        switch (_context26.prev = _context26.next) {
                          case 0:
                            _context26.next = 2;
                            return _this5.directlySetCurrentUser(user);

                          case 2:
                            _this5.notifyAuthListeners();

                          case 3:
                          case "end":
                            return _context26.stop();
                        }
                      }
                    }, _callee26);
                  }))));

                case 8:
                case "end":
                  return _context27.stop();
              }
            }
          }, _callee27, this);
        }));

        function _updateCurrentUser(_x46) {
          return _updateCurrentUser3.apply(this, arguments);
        }

        return _updateCurrentUser;
      }()
    }, {
      key: "signOut",
      value: function () {
        var _signOut = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee28() {
          return _regeneratorRuntime().wrap(function _callee28$(_context28) {
            while (1) {
              switch (_context28.prev = _context28.next) {
                case 0:
                  _context28.next = 2;
                  return this.beforeStateQueue.runMiddleware(null);

                case 2:
                  if (!(this.redirectPersistenceManager || this._popupRedirectResolver)) {
                    _context28.next = 5;
                    break;
                  }

                  _context28.next = 5;
                  return this._setRedirectUser(null);

                case 5:
                  return _context28.abrupt("return", this._updateCurrentUser(null,
                  /* skipBeforeStateCallbacks */
                  true));

                case 6:
                case "end":
                  return _context28.stop();
              }
            }
          }, _callee28, this);
        }));

        function signOut() {
          return _signOut.apply(this, arguments);
        }

        return signOut;
      }()
    }, {
      key: "setPersistence",
      value: function setPersistence(persistence) {
        var _this6 = this;

        return this.queue( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee29() {
          return _regeneratorRuntime().wrap(function _callee29$(_context29) {
            while (1) {
              switch (_context29.prev = _context29.next) {
                case 0:
                  _context29.next = 2;
                  return _this6.assertedPersistence.setPersistence(_getInstance(persistence));

                case 2:
                case "end":
                  return _context29.stop();
              }
            }
          }, _callee29);
        })));
      }
    }, {
      key: "_getPersistence",
      value: function _getPersistence() {
        return this.assertedPersistence.persistence.type;
      }
    }, {
      key: "_updateErrorMap",
      value: function _updateErrorMap(errorMap) {
        this._errorFactory = new ErrorFactory('auth', 'Firebase', errorMap());
      }
    }, {
      key: "onAuthStateChanged",
      value: function onAuthStateChanged(nextOrObserver, error, completed) {
        return this.registerStateListener(this.authStateSubscription, nextOrObserver, error, completed);
      }
    }, {
      key: "beforeAuthStateChanged",
      value: function beforeAuthStateChanged(callback, onAbort) {
        return this.beforeStateQueue.pushCallback(callback, onAbort);
      }
    }, {
      key: "onIdTokenChanged",
      value: function onIdTokenChanged(nextOrObserver, error, completed) {
        return this.registerStateListener(this.idTokenSubscription, nextOrObserver, error, completed);
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        var _a;

        return {
          apiKey: this.config.apiKey,
          authDomain: this.config.authDomain,
          appName: this.name,
          currentUser: (_a = this._currentUser) === null || _a === void 0 ? void 0 : _a.toJSON()
        };
      }
    }, {
      key: "_setRedirectUser",
      value: function () {
        var _setRedirectUser2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee30(user, popupRedirectResolver) {
          var redirectManager;
          return _regeneratorRuntime().wrap(function _callee30$(_context30) {
            while (1) {
              switch (_context30.prev = _context30.next) {
                case 0:
                  _context30.next = 2;
                  return this.getOrInitRedirectPersistenceManager(popupRedirectResolver);

                case 2:
                  redirectManager = _context30.sent;
                  return _context30.abrupt("return", user === null ? redirectManager.removeCurrentUser() : redirectManager.setCurrentUser(user));

                case 4:
                case "end":
                  return _context30.stop();
              }
            }
          }, _callee30, this);
        }));

        function _setRedirectUser(_x47, _x48) {
          return _setRedirectUser2.apply(this, arguments);
        }

        return _setRedirectUser;
      }()
    }, {
      key: "getOrInitRedirectPersistenceManager",
      value: function () {
        var _getOrInitRedirectPersistenceManager = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee31(popupRedirectResolver) {
          var resolver;
          return _regeneratorRuntime().wrap(function _callee31$(_context31) {
            while (1) {
              switch (_context31.prev = _context31.next) {
                case 0:
                  if (this.redirectPersistenceManager) {
                    _context31.next = 9;
                    break;
                  }

                  resolver = popupRedirectResolver && _getInstance(popupRedirectResolver) || this._popupRedirectResolver;

                  _assert(resolver, this, "argument-error"
                  /* ARGUMENT_ERROR */
                  );

                  _context31.next = 5;
                  return PersistenceUserManager.create(this, [_getInstance(resolver._redirectPersistence)], "redirectUser"
                  /* REDIRECT_USER */
                  );

                case 5:
                  this.redirectPersistenceManager = _context31.sent;
                  _context31.next = 8;
                  return this.redirectPersistenceManager.getCurrentUser();

                case 8:
                  this.redirectUser = _context31.sent;

                case 9:
                  return _context31.abrupt("return", this.redirectPersistenceManager);

                case 10:
                case "end":
                  return _context31.stop();
              }
            }
          }, _callee31, this);
        }));

        function getOrInitRedirectPersistenceManager(_x49) {
          return _getOrInitRedirectPersistenceManager.apply(this, arguments);
        }

        return getOrInitRedirectPersistenceManager;
      }()
    }, {
      key: "_redirectUserForId",
      value: function () {
        var _redirectUserForId2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee33(id) {
          var _a, _b;

          return _regeneratorRuntime().wrap(function _callee33$(_context33) {
            while (1) {
              switch (_context33.prev = _context33.next) {
                case 0:
                  if (!this._isInitialized) {
                    _context33.next = 3;
                    break;
                  }

                  _context33.next = 3;
                  return this.queue( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee32() {
                    return _regeneratorRuntime().wrap(function _callee32$(_context32) {
                      while (1) {
                        switch (_context32.prev = _context32.next) {
                          case 0:
                          case "end":
                            return _context32.stop();
                        }
                      }
                    }, _callee32);
                  })));

                case 3:
                  if (!(((_a = this._currentUser) === null || _a === void 0 ? void 0 : _a._redirectEventId) === id)) {
                    _context33.next = 5;
                    break;
                  }

                  return _context33.abrupt("return", this._currentUser);

                case 5:
                  if (!(((_b = this.redirectUser) === null || _b === void 0 ? void 0 : _b._redirectEventId) === id)) {
                    _context33.next = 7;
                    break;
                  }

                  return _context33.abrupt("return", this.redirectUser);

                case 7:
                  return _context33.abrupt("return", null);

                case 8:
                case "end":
                  return _context33.stop();
              }
            }
          }, _callee33, this);
        }));

        function _redirectUserForId(_x50) {
          return _redirectUserForId2.apply(this, arguments);
        }

        return _redirectUserForId;
      }()
    }, {
      key: "_persistUserIfCurrent",
      value: function () {
        var _persistUserIfCurrent2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee35(user) {
          var _this7 = this;

          return _regeneratorRuntime().wrap(function _callee35$(_context35) {
            while (1) {
              switch (_context35.prev = _context35.next) {
                case 0:
                  if (!(user === this.currentUser)) {
                    _context35.next = 2;
                    break;
                  }

                  return _context35.abrupt("return", this.queue( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee34() {
                    return _regeneratorRuntime().wrap(function _callee34$(_context34) {
                      while (1) {
                        switch (_context34.prev = _context34.next) {
                          case 0:
                            return _context34.abrupt("return", _this7.directlySetCurrentUser(user));

                          case 1:
                          case "end":
                            return _context34.stop();
                        }
                      }
                    }, _callee34);
                  }))));

                case 2:
                case "end":
                  return _context35.stop();
              }
            }
          }, _callee35, this);
        }));

        function _persistUserIfCurrent(_x51) {
          return _persistUserIfCurrent2.apply(this, arguments);
        }

        return _persistUserIfCurrent;
      }()
      /** Notifies listeners only if the user is current */

    }, {
      key: "_notifyListenersIfCurrent",
      value: function _notifyListenersIfCurrent(user) {
        if (user === this.currentUser) {
          this.notifyAuthListeners();
        }
      }
    }, {
      key: "_key",
      value: function _key() {
        return "".concat(this.config.authDomain, ":").concat(this.config.apiKey, ":").concat(this.name);
      }
    }, {
      key: "_startProactiveRefresh",
      value: function _startProactiveRefresh() {
        this.isProactiveRefreshEnabled = true;

        if (this.currentUser) {
          this._currentUser._startProactiveRefresh();
        }
      }
    }, {
      key: "_stopProactiveRefresh",
      value: function _stopProactiveRefresh() {
        this.isProactiveRefreshEnabled = false;

        if (this.currentUser) {
          this._currentUser._stopProactiveRefresh();
        }
      }
      /** Returns the current user cast as the internal type */

    }, {
      key: "_currentUser",
      get: function get() {
        return this.currentUser;
      }
    }, {
      key: "notifyAuthListeners",
      value: function notifyAuthListeners() {
        var _a, _b;

        if (!this._isInitialized) {
          return;
        }

        this.idTokenSubscription.next(this.currentUser);
        var currentUid = (_b = (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null;

        if (this.lastNotifiedUid !== currentUid) {
          this.lastNotifiedUid = currentUid;
          this.authStateSubscription.next(this.currentUser);
        }
      }
    }, {
      key: "registerStateListener",
      value: function registerStateListener(subscription, nextOrObserver, error, completed) {
        var _this8 = this;

        if (this._deleted) {
          return function () {};
        }

        var cb = typeof nextOrObserver === 'function' ? nextOrObserver : nextOrObserver.next.bind(nextOrObserver);
        var promise = this._isInitialized ? Promise.resolve() : this._initializationPromise;

        _assert(promise, this, "internal-error"
        /* INTERNAL_ERROR */
        ); // The callback needs to be called asynchronously per the spec.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises


        promise.then(function () {
          return cb(_this8.currentUser);
        });

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

    }, {
      key: "directlySetCurrentUser",
      value: function () {
        var _directlySetCurrentUser = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee36(user) {
          return _regeneratorRuntime().wrap(function _callee36$(_context36) {
            while (1) {
              switch (_context36.prev = _context36.next) {
                case 0:
                  if (this.currentUser && this.currentUser !== user) {
                    this._currentUser._stopProactiveRefresh();

                    if (user && this.isProactiveRefreshEnabled) {
                      user._startProactiveRefresh();
                    }
                  }

                  this.currentUser = user;

                  if (!user) {
                    _context36.next = 7;
                    break;
                  }

                  _context36.next = 5;
                  return this.assertedPersistence.setCurrentUser(user);

                case 5:
                  _context36.next = 9;
                  break;

                case 7:
                  _context36.next = 9;
                  return this.assertedPersistence.removeCurrentUser();

                case 9:
                case "end":
                  return _context36.stop();
              }
            }
          }, _callee36, this);
        }));

        function directlySetCurrentUser(_x52) {
          return _directlySetCurrentUser.apply(this, arguments);
        }

        return directlySetCurrentUser;
      }()
    }, {
      key: "queue",
      value: function queue(action) {
        // In case something errors, the callback still should be called in order
        // to keep the promise chain alive
        this.operations = this.operations.then(action, action);
        return this.operations;
      }
    }, {
      key: "assertedPersistence",
      get: function get() {
        _assert(this.persistenceManager, this, "internal-error"
        /* INTERNAL_ERROR */
        );

        return this.persistenceManager;
      }
    }, {
      key: "_logFramework",
      value: function _logFramework(framework) {
        if (!framework || this.frameworks.includes(framework)) {
          return;
        }

        this.frameworks.push(framework); // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
        // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.

        this.frameworks.sort();
        this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks());
      }
    }, {
      key: "_getFrameworks",
      value: function _getFrameworks() {
        return this.frameworks;
      }
    }, {
      key: "_getAdditionalHeaders",
      value: function () {
        var _getAdditionalHeaders2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee37() {
          var _a, headers, heartbeatsHeader;

          return _regeneratorRuntime().wrap(function _callee37$(_context37) {
            while (1) {
              switch (_context37.prev = _context37.next) {
                case 0:
                  // Additional headers on every request
                  headers = _defineProperty({}, "X-Client-Version"
                  /* X_CLIENT_VERSION */
                  , this.clientVersion);

                  if (this.app.options.appId) {
                    headers["X-Firebase-gmpid"
                    /* X_FIREBASE_GMPID */
                    ] = this.app.options.appId;
                  } // If the heartbeat service exists, add the heartbeat string


                  _context37.next = 4;
                  return (_a = this.heartbeatServiceProvider.getImmediate({
                    optional: true
                  })) === null || _a === void 0 ? void 0 : _a.getHeartbeatsHeader();

                case 4:
                  heartbeatsHeader = _context37.sent;

                  if (heartbeatsHeader) {
                    headers["X-Firebase-Client"
                    /* X_FIREBASE_CLIENT */
                    ] = heartbeatsHeader;
                  }

                  return _context37.abrupt("return", headers);

                case 7:
                case "end":
                  return _context37.stop();
              }
            }
          }, _callee37, this);
        }));

        function _getAdditionalHeaders() {
          return _getAdditionalHeaders2.apply(this, arguments);
        }

        return _getAdditionalHeaders;
      }()
    }]);

    return AuthImpl;
  }();
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


  var Subscription = /*#__PURE__*/function () {
    function Subscription(auth) {
      var _this9 = this;

      _classCallCheck(this, Subscription);

      this.auth = auth;
      this.observer = null;
      this.addObserver = createSubscribe(function (observer) {
        return _this9.observer = observer;
      });
    }

    _createClass(Subscription, [{
      key: "next",
      get: function get() {
        _assert(this.observer, this.auth, "internal-error"
        /* INTERNAL_ERROR */
        );

        return this.observer.next.bind(this.observer);
      }
    }]);

    return Subscription;
  }();
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


  var AuthCredential = /*#__PURE__*/function () {
    /** @internal */
    function AuthCredential(
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
      _classCallCheck(this, AuthCredential);

      this.providerId = providerId;
      this.signInMethod = signInMethod;
    }
    /**
     * Returns a JSON-serializable representation of this object.
     *
     * @returns a JSON-serializable representation of this object.
     */


    _createClass(AuthCredential, [{
      key: "toJSON",
      value: function toJSON() {
        return debugFail('not implemented');
      }
      /** @internal */

    }, {
      key: "_getIdTokenResponse",
      value: function _getIdTokenResponse(_auth) {
        return debugFail('not implemented');
      }
      /** @internal */

    }, {
      key: "_linkToIdToken",
      value: function _linkToIdToken(_auth, _idToken) {
        return debugFail('not implemented');
      }
      /** @internal */

    }, {
      key: "_getReauthenticationResolver",
      value: function _getReauthenticationResolver(_auth) {
        return debugFail('not implemented');
      }
    }]);

    return AuthCredential;
  }();
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


  function signInWithIdp(_x78, _x79) {
    return _signInWithIdp.apply(this, arguments);
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


  function _signInWithIdp() {
    _signInWithIdp = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee112(auth, request) {
      return _regeneratorRuntime().wrap(function _callee112$(_context112) {
        while (1) {
          switch (_context112.prev = _context112.next) {
            case 0:
              return _context112.abrupt("return", _performSignInRequest(auth, "POST"
              /* POST */
              , "/v1/accounts:signInWithIdp"
              /* SIGN_IN_WITH_IDP */
              , _addTidIfNecessary(auth, request)));

            case 1:
            case "end":
              return _context112.stop();
          }
        }
      }, _callee112);
    }));
    return _signInWithIdp.apply(this, arguments);
  }

  _defineProperty({}, "USER_NOT_FOUND"
  /* USER_NOT_FOUND */
  , "user-not-found");
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

  var FederatedAuthProvider = /*#__PURE__*/function () {
    /**
     * Constructor for generic OAuth providers.
     *
     * @param providerId - Provider for which credentials should be generated.
     */
    function FederatedAuthProvider(providerId) {
      _classCallCheck(this, FederatedAuthProvider);

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


    _createClass(FederatedAuthProvider, [{
      key: "setDefaultLanguage",
      value: function setDefaultLanguage(languageCode) {
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

    }, {
      key: "setCustomParameters",
      value: function setCustomParameters(customOAuthParameters) {
        this.customParameters = customOAuthParameters;
        return this;
      }
      /**
       * Retrieve the current list of {@link CustomParameters}.
       */

    }, {
      key: "getCustomParameters",
      value: function getCustomParameters() {
        return this.customParameters;
      }
    }]);

    return FederatedAuthProvider;
  }();
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


  var BaseOAuthProvider = /*#__PURE__*/function (_FederatedAuthProvide) {
    _inherits(BaseOAuthProvider, _FederatedAuthProvide);

    var _super4 = _createSuper(BaseOAuthProvider);

    function BaseOAuthProvider() {
      var _this13;

      _classCallCheck(this, BaseOAuthProvider);

      _this13 = _super4.apply(this, arguments);
      /** @internal */

      _this13.scopes = [];
      return _this13;
    }
    /**
     * Add an OAuth scope to the credential.
     *
     * @param scope - Provider OAuth scope to add.
     */


    _createClass(BaseOAuthProvider, [{
      key: "addScope",
      value: function addScope(scope) {
        // If not already added, add scope to list.
        if (!this.scopes.includes(scope)) {
          this.scopes.push(scope);
        }

        return this;
      }
      /**
       * Retrieve the current list of OAuth scopes.
       */

    }, {
      key: "getScopes",
      value: function getScopes() {
        return _toConsumableArray(this.scopes);
      }
    }]);

    return BaseOAuthProvider;
  }(FederatedAuthProvider);

  var UserCredentialImpl = /*#__PURE__*/function () {
    function UserCredentialImpl(params) {
      _classCallCheck(this, UserCredentialImpl);

      this.user = params.user;
      this.providerId = params.providerId;
      this._tokenResponse = params._tokenResponse;
      this.operationType = params.operationType;
    }

    _createClass(UserCredentialImpl, null, [{
      key: "_fromIdTokenResponse",
      value: function () {
        var _fromIdTokenResponse3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee40(auth, operationType, idTokenResponse) {
          var isAnonymous,
              user,
              providerId,
              userCred,
              _args40 = arguments;
          return _regeneratorRuntime().wrap(function _callee40$(_context40) {
            while (1) {
              switch (_context40.prev = _context40.next) {
                case 0:
                  isAnonymous = _args40.length > 3 && _args40[3] !== undefined ? _args40[3] : false;
                  _context40.next = 3;
                  return UserImpl._fromIdTokenResponse(auth, idTokenResponse, isAnonymous);

                case 3:
                  user = _context40.sent;
                  providerId = providerIdForResponse(idTokenResponse);
                  userCred = new UserCredentialImpl({
                    user: user,
                    providerId: providerId,
                    _tokenResponse: idTokenResponse,
                    operationType: operationType
                  });
                  return _context40.abrupt("return", userCred);

                case 7:
                case "end":
                  return _context40.stop();
              }
            }
          }, _callee40);
        }));

        function _fromIdTokenResponse(_x90, _x91, _x92) {
          return _fromIdTokenResponse3.apply(this, arguments);
        }

        return _fromIdTokenResponse;
      }()
    }, {
      key: "_forOperation",
      value: function () {
        var _forOperation2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee41(user, operationType, response) {
          var providerId;
          return _regeneratorRuntime().wrap(function _callee41$(_context41) {
            while (1) {
              switch (_context41.prev = _context41.next) {
                case 0:
                  _context41.next = 2;
                  return user._updateTokensIfNecessary(response,
                  /* reload */
                  true);

                case 2:
                  providerId = providerIdForResponse(response);
                  return _context41.abrupt("return", new UserCredentialImpl({
                    user: user,
                    providerId: providerId,
                    _tokenResponse: response,
                    operationType: operationType
                  }));

                case 4:
                case "end":
                  return _context41.stop();
              }
            }
          }, _callee41);
        }));

        function _forOperation(_x93, _x94, _x95) {
          return _forOperation2.apply(this, arguments);
        }

        return _forOperation;
      }()
    }]);

    return UserCredentialImpl;
  }();

  function providerIdForResponse(response) {
    if (response.providerId) {
      return response.providerId;
    }

    if ('phoneNumber' in response) {
      return "phone"
      /* PHONE */
      ;
    }

    return null;
  }

  var MultiFactorError = /*#__PURE__*/function (_FirebaseError) {
    _inherits(MultiFactorError, _FirebaseError);

    var _super12 = _createSuper(MultiFactorError);

    function MultiFactorError(auth, error, operationType, user) {
      var _this16;

      _classCallCheck(this, MultiFactorError);

      var _a;

      _this16 = _super12.call(this, error.code, error.message);
      _this16.operationType = operationType;
      _this16.user = user; // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

      Object.setPrototypeOf(_assertThisInitialized(_this16), MultiFactorError.prototype);
      _this16.customData = {
        appName: auth.name,
        tenantId: (_a = auth.tenantId) !== null && _a !== void 0 ? _a : undefined,
        _serverResponse: error.customData._serverResponse,
        operationType: operationType
      };
      return _this16;
    }

    _createClass(MultiFactorError, null, [{
      key: "_fromErrorAndOperation",
      value: function _fromErrorAndOperation(auth, error, operationType, user) {
        return new MultiFactorError(auth, error, operationType, user);
      }
    }]);

    return MultiFactorError;
  }(FirebaseError);

  function _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user) {
    var idTokenProvider = operationType === "reauthenticate"
    /* REAUTHENTICATE */
    ? credential._getReauthenticationResolver(auth) : credential._getIdTokenResponse(auth);
    return idTokenProvider.catch(function (error) {
      if (error.code === "auth/".concat("multi-factor-auth-required"
      /* MFA_REQUIRED */
      )) {
        throw MultiFactorError._fromErrorAndOperation(auth, error, operationType, user);
      }

      throw error;
    });
  }

  function _link$1(_x99, _x100) {
    return _link$.apply(this, arguments);
  }

  function _link$() {
    _link$ = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee120(user, credential) {
      var bypassAuthState,
          response,
          _args120 = arguments;
      return _regeneratorRuntime().wrap(function _callee120$(_context120) {
        while (1) {
          switch (_context120.prev = _context120.next) {
            case 0:
              bypassAuthState = _args120.length > 2 && _args120[2] !== undefined ? _args120[2] : false;
              _context120.t0 = _logoutIfInvalidated;
              _context120.t1 = user;
              _context120.t2 = credential;
              _context120.t3 = user.auth;
              _context120.next = 7;
              return user.getIdToken();

            case 7:
              _context120.t4 = _context120.sent;
              _context120.t5 = _context120.t2._linkToIdToken.call(_context120.t2, _context120.t3, _context120.t4);
              _context120.t6 = bypassAuthState;
              _context120.next = 12;
              return (0, _context120.t0)(_context120.t1, _context120.t5, _context120.t6);

            case 12:
              response = _context120.sent;
              return _context120.abrupt("return", UserCredentialImpl._forOperation(user, "link"
              /* LINK */
              , response));

            case 14:
            case "end":
              return _context120.stop();
          }
        }
      }, _callee120);
    }));
    return _link$.apply(this, arguments);
  }

  function _reauthenticate(_x104, _x105) {
    return _reauthenticate2.apply(this, arguments);
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


  function _reauthenticate2() {
    _reauthenticate2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee122(user, credential) {
      var bypassAuthState,
          _a,
          auth,
          operationType,
          response,
          parsed,
          localId,
          _args122 = arguments;

      return _regeneratorRuntime().wrap(function _callee122$(_context122) {
        while (1) {
          switch (_context122.prev = _context122.next) {
            case 0:
              bypassAuthState = _args122.length > 2 && _args122[2] !== undefined ? _args122[2] : false;
              auth = user.auth;
              operationType = "reauthenticate";
              _context122.prev = 3;
              _context122.next = 6;
              return _logoutIfInvalidated(user, _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user), bypassAuthState);

            case 6:
              response = _context122.sent;

              _assert(response.idToken, auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              parsed = _parseToken(response.idToken);

              _assert(parsed, auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              localId = parsed.sub;

              _assert(user.uid === localId, auth, "user-mismatch"
              /* USER_MISMATCH */
              );

              return _context122.abrupt("return", UserCredentialImpl._forOperation(user, operationType, response));

            case 15:
              _context122.prev = 15;
              _context122.t0 = _context122["catch"](3);

              // Convert user deleted error into user mismatch
              if (((_a = _context122.t0) === null || _a === void 0 ? void 0 : _a.code) === "auth/".concat("user-not-found"
              /* USER_DELETED */
              )) {
                _fail(auth, "user-mismatch"
                /* USER_MISMATCH */
                );
              }

              throw _context122.t0;

            case 19:
            case "end":
              return _context122.stop();
          }
        }
      }, _callee122, null, [[3, 15]]);
    }));
    return _reauthenticate2.apply(this, arguments);
  }

  function _signInWithCredential(_x106, _x107) {
    return _signInWithCredential2.apply(this, arguments);
  }
  /**
   * Asynchronously signs in with the given credentials.
   *
   * @remarks
   * An {@link AuthProvider} can be used to generate the credential.
   *
   * @param auth - The {@link Auth} instance.
   * @param credential - The auth credential.
   *
   * @public
   */


  function _signInWithCredential2() {
    _signInWithCredential2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee123(auth, credential) {
      var bypassAuthState,
          operationType,
          response,
          userCredential,
          _args123 = arguments;
      return _regeneratorRuntime().wrap(function _callee123$(_context123) {
        while (1) {
          switch (_context123.prev = _context123.next) {
            case 0:
              bypassAuthState = _args123.length > 2 && _args123[2] !== undefined ? _args123[2] : false;
              operationType = "signIn";
              _context123.next = 4;
              return _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential);

            case 4:
              response = _context123.sent;
              _context123.next = 7;
              return UserCredentialImpl._fromIdTokenResponse(auth, operationType, response);

            case 7:
              userCredential = _context123.sent;

              if (bypassAuthState) {
                _context123.next = 11;
                break;
              }

              _context123.next = 11;
              return auth._updateCurrentUser(userCredential.user);

            case 11:
              return _context123.abrupt("return", userCredential);

            case 12:
            case "end":
              return _context123.stop();
          }
        }
      }, _callee123);
    }));
    return _signInWithCredential2.apply(this, arguments);
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

  var STORAGE_AVAILABLE_KEY = '__sak';
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

  var BrowserPersistenceClass = /*#__PURE__*/function () {
    function BrowserPersistenceClass(storageRetriever, type) {
      _classCallCheck(this, BrowserPersistenceClass);

      this.storageRetriever = storageRetriever;
      this.type = type;
    }

    _createClass(BrowserPersistenceClass, [{
      key: "_isAvailable",
      value: function _isAvailable() {
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
    }, {
      key: "_set",
      value: function _set(key, value) {
        this.storage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
      }
    }, {
      key: "_get",
      value: function _get(key) {
        var json = this.storage.getItem(key);
        return Promise.resolve(json ? JSON.parse(json) : null);
      }
    }, {
      key: "_remove",
      value: function _remove(key) {
        this.storage.removeItem(key);
        return Promise.resolve();
      }
    }, {
      key: "storage",
      get: function get() {
        return this.storageRetriever();
      }
    }]);

    return BrowserPersistenceClass;
  }();
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
    var ua = getUA();
    return _isSafari(ua) || _isIOS(ua);
  } // The polling period in case events are not supported


  var _POLLING_INTERVAL_MS$1 = 1000; // The IE 10 localStorage cross tab synchronization delay in milliseconds

  var IE10_LOCAL_STORAGE_SYNC_DELAY = 10;

  var BrowserLocalPersistence = /*#__PURE__*/function (_BrowserPersistenceCl) {
    _inherits(BrowserLocalPersistence, _BrowserPersistenceCl);

    var _super19 = _createSuper(BrowserLocalPersistence);

    function BrowserLocalPersistence() {
      var _this20;

      _classCallCheck(this, BrowserLocalPersistence);

      _this20 = _super19.call(this, function () {
        return window.localStorage;
      }, "LOCAL"
      /* LOCAL */
      );

      _this20.boundEventHandler = function (event, poll) {
        return _this20.onStorageEvent(event, poll);
      };

      _this20.listeners = {};
      _this20.localCache = {}; // setTimeout return value is platform specific
      // eslint-disable-next-line @typescript-eslint/no-explicit-any

      _this20.pollTimer = null; // Safari or iOS browser and embedded in an iframe.

      _this20.safariLocalStorageNotSynced = _iframeCannotSyncWebStorage() && _isIframe(); // Whether to use polling instead of depending on window events

      _this20.fallbackToPolling = _isMobileBrowser();
      _this20._shouldAllowMigration = true;
      return _this20;
    }

    _createClass(BrowserLocalPersistence, [{
      key: "forAllChangedKeys",
      value: function forAllChangedKeys(cb) {
        // Check all keys with listeners on them.
        for (var _i = 0, _Object$keys = Object.keys(this.listeners); _i < _Object$keys.length; _i++) {
          var key = _Object$keys[_i];
          // Get value from localStorage.
          var newValue = this.storage.getItem(key);
          var oldValue = this.localCache[key]; // If local map value does not match, trigger listener with storage event.
          // Differentiate this simulated event from the real storage event.

          if (newValue !== oldValue) {
            cb(key, oldValue, newValue);
          }
        }
      }
    }, {
      key: "onStorageEvent",
      value: function onStorageEvent(event) {
        var _this21 = this;

        var poll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        // Key would be null in some situations, like when localStorage is cleared
        if (!event.key) {
          this.forAllChangedKeys(function (key, _oldValue, newValue) {
            _this21.notifyListeners(key, newValue);
          });
          return;
        }

        var key = event.key; // Check the mechanism how this event was detected.
        // The first event will dictate the mechanism to be used.

        if (poll) {
          // Environment detects storage changes via polling.
          // Remove storage event listener to prevent possible event duplication.
          this.detachListener();
        } else {
          // Environment detects storage changes via storage event listener.
          // Remove polling listener to prevent possible event duplication.
          this.stopPolling();
        } // Safari embedded iframe. Storage event will trigger with the delta
        // changes but no changes will be applied to the iframe localStorage.


        if (this.safariLocalStorageNotSynced) {
          // Get current iframe page value.
          var _storedValue = this.storage.getItem(key); // Value not synchronized, synchronize manually.


          if (event.newValue !== _storedValue) {
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

        var triggerListeners = function triggerListeners() {
          // Keep local map up to date in case storage event is triggered before
          // poll.
          var storedValue = _this21.storage.getItem(key);

          if (!poll && _this21.localCache[key] === storedValue) {
            // Real storage event which has already been detected, do nothing.
            // This seems to trigger in some IE browsers for some reason.
            return;
          }

          _this21.notifyListeners(key, storedValue);
        };

        var storedValue = this.storage.getItem(key);

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
    }, {
      key: "notifyListeners",
      value: function notifyListeners(key, value) {
        this.localCache[key] = value;
        var listeners = this.listeners[key];

        if (listeners) {
          for (var _i2 = 0, _Array$from = Array.from(listeners); _i2 < _Array$from.length; _i2++) {
            var listener = _Array$from[_i2];
            listener(value ? JSON.parse(value) : value);
          }
        }
      }
    }, {
      key: "startPolling",
      value: function startPolling() {
        var _this22 = this;

        this.stopPolling();
        this.pollTimer = setInterval(function () {
          _this22.forAllChangedKeys(function (key, oldValue, newValue) {
            _this22.onStorageEvent(new StorageEvent('storage', {
              key: key,
              oldValue: oldValue,
              newValue: newValue
            }),
            /* poll */
            true);
          });
        }, _POLLING_INTERVAL_MS$1);
      }
    }, {
      key: "stopPolling",
      value: function stopPolling() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      }
    }, {
      key: "attachListener",
      value: function attachListener() {
        window.addEventListener('storage', this.boundEventHandler);
      }
    }, {
      key: "detachListener",
      value: function detachListener() {
        window.removeEventListener('storage', this.boundEventHandler);
      }
    }, {
      key: "_addListener",
      value: function _addListener(key, listener) {
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
          this.listeners[key] = new Set(); // Populate the cache to avoid spuriously triggering on first poll.

          this.localCache[key] = this.storage.getItem(key);
        }

        this.listeners[key].add(listener);
      }
    }, {
      key: "_removeListener",
      value: function _removeListener(key, listener) {
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
      } // Update local cache on base operations:

    }, {
      key: "_set",
      value: function () {
        var _set3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee47(key, value) {
          return _regeneratorRuntime().wrap(function _callee47$(_context47) {
            while (1) {
              switch (_context47.prev = _context47.next) {
                case 0:
                  _context47.next = 2;
                  return _get(_getPrototypeOf(BrowserLocalPersistence.prototype), "_set", this).call(this, key, value);

                case 2:
                  this.localCache[key] = JSON.stringify(value);

                case 3:
                case "end":
                  return _context47.stop();
              }
            }
          }, _callee47, this);
        }));

        function _set(_x161, _x162) {
          return _set3.apply(this, arguments);
        }

        return _set;
      }()
    }, {
      key: "_get",
      value: function () {
        var _get4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee48(key) {
          var value;
          return _regeneratorRuntime().wrap(function _callee48$(_context48) {
            while (1) {
              switch (_context48.prev = _context48.next) {
                case 0:
                  _context48.next = 2;
                  return _get(_getPrototypeOf(BrowserLocalPersistence.prototype), "_get", this).call(this, key);

                case 2:
                  value = _context48.sent;
                  this.localCache[key] = JSON.stringify(value);
                  return _context48.abrupt("return", value);

                case 5:
                case "end":
                  return _context48.stop();
              }
            }
          }, _callee48, this);
        }));

        function _get$1(_x163) {
          return _get4.apply(this, arguments);
        }

        return _get$1;
      }()
    }, {
      key: "_remove",
      value: function () {
        var _remove3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee49(key) {
          return _regeneratorRuntime().wrap(function _callee49$(_context49) {
            while (1) {
              switch (_context49.prev = _context49.next) {
                case 0:
                  _context49.next = 2;
                  return _get(_getPrototypeOf(BrowserLocalPersistence.prototype), "_remove", this).call(this, key);

                case 2:
                  delete this.localCache[key];

                case 3:
                case "end":
                  return _context49.stop();
              }
            }
          }, _callee49, this);
        }));

        function _remove(_x164) {
          return _remove3.apply(this, arguments);
        }

        return _remove;
      }()
    }]);

    return BrowserLocalPersistence;
  }(BrowserPersistenceClass);

  BrowserLocalPersistence.type = 'LOCAL';
  /**
   * An implementation of {@link Persistence} of type `LOCAL` using `localStorage`
   * for the underlying storage.
   *
   * @public
   */

  var browserLocalPersistence = BrowserLocalPersistence;
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

  var BrowserSessionPersistence = /*#__PURE__*/function (_BrowserPersistenceCl2) {
    _inherits(BrowserSessionPersistence, _BrowserPersistenceCl2);

    var _super20 = _createSuper(BrowserSessionPersistence);

    function BrowserSessionPersistence() {
      _classCallCheck(this, BrowserSessionPersistence);

      return _super20.call(this, function () {
        return window.sessionStorage;
      }, "SESSION"
      /* SESSION */
      );
    }

    _createClass(BrowserSessionPersistence, [{
      key: "_addListener",
      value: function _addListener(_key, _listener) {
        // Listeners are not supported for session storage since it cannot be shared across windows
        return;
      }
    }, {
      key: "_removeListener",
      value: function _removeListener(_key, _listener) {
        // Listeners are not supported for session storage since it cannot be shared across windows
        return;
      }
    }]);

    return BrowserSessionPersistence;
  }(BrowserPersistenceClass);

  BrowserSessionPersistence.type = 'SESSION';
  /**
   * An implementation of {@link Persistence} of `SESSION` using `sessionStorage`
   * for the underlying storage.
   *
   * @public
   */

  var browserSessionPersistence = BrowserSessionPersistence;
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
    return Promise.all(promises.map( /*#__PURE__*/function () {
      var _ref22 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee50(promise) {
        var value;
        return _regeneratorRuntime().wrap(function _callee50$(_context50) {
          while (1) {
            switch (_context50.prev = _context50.next) {
              case 0:
                _context50.prev = 0;
                _context50.next = 3;
                return promise;

              case 3:
                value = _context50.sent;
                return _context50.abrupt("return", {
                  fulfilled: true,
                  value: value
                });

              case 7:
                _context50.prev = 7;
                _context50.t0 = _context50["catch"](0);
                return _context50.abrupt("return", {
                  fulfilled: false,
                  reason: _context50.t0
                });

              case 10:
              case "end":
                return _context50.stop();
            }
          }
        }, _callee50, null, [[0, 7]]);
      }));

      return function (_x165) {
        return _ref22.apply(this, arguments);
      };
    }()));
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


  var Receiver = /*#__PURE__*/function () {
    function Receiver(eventTarget) {
      _classCallCheck(this, Receiver);

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


    _createClass(Receiver, [{
      key: "isListeningto",
      value: function isListeningto(eventTarget) {
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

    }, {
      key: "handleEvent",
      value: function () {
        var _handleEvent = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee52(event) {
          var messageEvent, _messageEvent$data, eventId, eventType, data, handlers, promises, response;

          return _regeneratorRuntime().wrap(function _callee52$(_context52) {
            while (1) {
              switch (_context52.prev = _context52.next) {
                case 0:
                  messageEvent = event;
                  _messageEvent$data = messageEvent.data, eventId = _messageEvent$data.eventId, eventType = _messageEvent$data.eventType, data = _messageEvent$data.data;
                  handlers = this.handlersMap[eventType];

                  if (handlers === null || handlers === void 0 ? void 0 : handlers.size) {
                    _context52.next = 5;
                    break;
                  }

                  return _context52.abrupt("return");

                case 5:
                  messageEvent.ports[0].postMessage({
                    status: "ack"
                    /* ACK */
                    ,
                    eventId: eventId,
                    eventType: eventType
                  });
                  promises = Array.from(handlers).map( /*#__PURE__*/function () {
                    var _ref23 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee51(handler) {
                      return _regeneratorRuntime().wrap(function _callee51$(_context51) {
                        while (1) {
                          switch (_context51.prev = _context51.next) {
                            case 0:
                              return _context51.abrupt("return", handler(messageEvent.origin, data));

                            case 1:
                            case "end":
                              return _context51.stop();
                          }
                        }
                      }, _callee51);
                    }));

                    return function (_x167) {
                      return _ref23.apply(this, arguments);
                    };
                  }());
                  _context52.next = 9;
                  return _allSettled(promises);

                case 9:
                  response = _context52.sent;
                  messageEvent.ports[0].postMessage({
                    status: "done"
                    /* DONE */
                    ,
                    eventId: eventId,
                    eventType: eventType,
                    response: response
                  });

                case 11:
                case "end":
                  return _context52.stop();
              }
            }
          }, _callee52, this);
        }));

        function handleEvent(_x166) {
          return _handleEvent.apply(this, arguments);
        }

        return handleEvent;
      }()
      /**
       * Subscribe an event handler for a particular event.
       *
       * @param eventType - Event name to subscribe to.
       * @param eventHandler - The event handler which should receive the events.
       *
       */

    }, {
      key: "_subscribe",
      value: function _subscribe(eventType, eventHandler) {
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

    }, {
      key: "_unsubscribe",
      value: function _unsubscribe(eventType, eventHandler) {
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
    }], [{
      key: "_getInstance",
      value: function _getInstance(eventTarget) {
        // The results are stored in an array since objects can't be keys for other
        // objects. In addition, setting a unique property on an event target as a
        // hash map key may not be allowed due to CORS restrictions.
        var existingInstance = this.receivers.find(function (receiver) {
          return receiver.isListeningto(eventTarget);
        });

        if (existingInstance) {
          return existingInstance;
        }

        var newInstance = new Receiver(eventTarget);
        this.receivers.push(newInstance);
        return newInstance;
      }
    }]);

    return Receiver;
  }();

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
    var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var digits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
    var random = '';

    for (var i = 0; i < digits; i++) {
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


  var Sender = /*#__PURE__*/function () {
    function Sender(target) {
      _classCallCheck(this, Sender);

      this.target = target;
      this.handlers = new Set();
    }
    /**
     * Unsubscribe the handler and remove it from our tracking Set.
     *
     * @param handler - The handler to unsubscribe.
     */


    _createClass(Sender, [{
      key: "removeMessageHandler",
      value: function removeMessageHandler(handler) {
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

    }, {
      key: "_send",
      value: function () {
        var _send2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee53(eventType, data) {
          var _this23 = this;

          var timeout,
              messageChannel,
              completionTimer,
              handler,
              _args53 = arguments;
          return _regeneratorRuntime().wrap(function _callee53$(_context53) {
            while (1) {
              switch (_context53.prev = _context53.next) {
                case 0:
                  timeout = _args53.length > 2 && _args53[2] !== undefined ? _args53[2] : 50;
                  messageChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;

                  if (messageChannel) {
                    _context53.next = 4;
                    break;
                  }

                  throw new Error("connection_unavailable"
                  /* CONNECTION_UNAVAILABLE */
                  );

                case 4:
                  return _context53.abrupt("return", new Promise(function (resolve, reject) {
                    var eventId = _generateEventId('', 20);

                    messageChannel.port1.start();
                    var ackTimer = setTimeout(function () {
                      reject(new Error("unsupported_event"
                      /* UNSUPPORTED_EVENT */
                      ));
                    }, timeout);
                    handler = {
                      messageChannel: messageChannel,
                      onMessage: function onMessage(event) {
                        var messageEvent = event;

                        if (messageEvent.data.eventId !== eventId) {
                          return;
                        }

                        switch (messageEvent.data.status) {
                          case "ack"
                          /* ACK */
                          :
                            // The receiver should ACK first.
                            clearTimeout(ackTimer);
                            completionTimer = setTimeout(function () {
                              reject(new Error("timeout"
                              /* TIMEOUT */
                              ));
                            }, 3000
                            /* COMPLETION */
                            );
                            break;

                          case "done"
                          /* DONE */
                          :
                            // Once the receiver's handlers are finished we will get the results.
                            clearTimeout(completionTimer);
                            resolve(messageEvent.data.response);
                            break;

                          default:
                            clearTimeout(ackTimer);
                            clearTimeout(completionTimer);
                            reject(new Error("invalid_response"
                            /* INVALID_RESPONSE */
                            ));
                            break;
                        }
                      }
                    };

                    _this23.handlers.add(handler);

                    messageChannel.port1.addEventListener('message', handler.onMessage);

                    _this23.target.postMessage({
                      eventType: eventType,
                      eventId: eventId,
                      data: data
                    }, [messageChannel.port2]);
                  }).finally(function () {
                    if (handler) {
                      _this23.removeMessageHandler(handler);
                    }
                  }));

                case 5:
                case "end":
                  return _context53.stop();
              }
            }
          }, _callee53);
        }));

        function _send(_x168, _x169) {
          return _send2.apply(this, arguments);
        }

        return _send;
      }()
    }]);

    return Sender;
  }();
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

  function _getActiveServiceWorker() {
    return _getActiveServiceWorker2.apply(this, arguments);
  }

  function _getActiveServiceWorker2() {
    _getActiveServiceWorker2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee145() {
      var registration;
      return _regeneratorRuntime().wrap(function _callee145$(_context145) {
        while (1) {
          switch (_context145.prev = _context145.next) {
            case 0:
              if (navigator === null || navigator === void 0 ? void 0 : navigator.serviceWorker) {
                _context145.next = 2;
                break;
              }

              return _context145.abrupt("return", null);

            case 2:
              _context145.prev = 2;
              _context145.next = 5;
              return navigator.serviceWorker.ready;

            case 5:
              registration = _context145.sent;
              return _context145.abrupt("return", registration.active);

            case 9:
              _context145.prev = 9;
              _context145.t0 = _context145["catch"](2);
              return _context145.abrupt("return", null);

            case 12:
            case "end":
              return _context145.stop();
          }
        }
      }, _callee145, null, [[2, 9]]);
    }));
    return _getActiveServiceWorker2.apply(this, arguments);
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


  var DB_NAME = 'firebaseLocalStorageDb';
  var DB_VERSION = 1;
  var DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
  var DB_DATA_KEYPATH = 'fbase_key';
  /**
   * Promise wrapper for IDBRequest
   *
   * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
   *
   */

  var DBPromise = /*#__PURE__*/function () {
    function DBPromise(request) {
      _classCallCheck(this, DBPromise);

      this.request = request;
    }

    _createClass(DBPromise, [{
      key: "toPromise",
      value: function toPromise() {
        var _this24 = this;

        return new Promise(function (resolve, reject) {
          _this24.request.addEventListener('success', function () {
            resolve(_this24.request.result);
          });

          _this24.request.addEventListener('error', function () {
            reject(_this24.request.error);
          });
        });
      }
    }]);

    return DBPromise;
  }();

  function getObjectStore(db, isReadWrite) {
    return db.transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly').objectStore(DB_OBJECTSTORE_NAME);
  }

  function _deleteDatabase() {
    var request = indexedDB.deleteDatabase(DB_NAME);
    return new DBPromise(request).toPromise();
  }

  function _openDatabase() {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    return new Promise(function (resolve, reject) {
      request.addEventListener('error', function () {
        reject(request.error);
      });
      request.addEventListener('upgradeneeded', function () {
        var db = request.result;

        try {
          db.createObjectStore(DB_OBJECTSTORE_NAME, {
            keyPath: DB_DATA_KEYPATH
          });
        } catch (e) {
          reject(e);
        }
      });
      request.addEventListener('success', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee54() {
        var db;
        return _regeneratorRuntime().wrap(function _callee54$(_context54) {
          while (1) {
            switch (_context54.prev = _context54.next) {
              case 0:
                db = request.result; // Strange bug that occurs in Firefox when multiple tabs are opened at the
                // same time. The only way to recover seems to be deleting the database
                // and re-initializing it.
                // https://github.com/firebase/firebase-js-sdk/issues/634

                if (db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
                  _context54.next = 12;
                  break;
                }

                // Need to close the database or else you get a `blocked` event
                db.close();
                _context54.next = 5;
                return _deleteDatabase();

              case 5:
                _context54.t0 = resolve;
                _context54.next = 8;
                return _openDatabase();

              case 8:
                _context54.t1 = _context54.sent;
                (0, _context54.t0)(_context54.t1);
                _context54.next = 13;
                break;

              case 12:
                resolve(db);

              case 13:
              case "end":
                return _context54.stop();
            }
          }
        }, _callee54);
      })));
    });
  }

  function _putObject(_x170, _x171, _x172) {
    return _putObject2.apply(this, arguments);
  }

  function _putObject2() {
    _putObject2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee146(db, key, value) {
      var _getObjectStore$put;

      var request;
      return _regeneratorRuntime().wrap(function _callee146$(_context146) {
        while (1) {
          switch (_context146.prev = _context146.next) {
            case 0:
              request = getObjectStore(db, true).put((_getObjectStore$put = {}, _defineProperty(_getObjectStore$put, DB_DATA_KEYPATH, key), _defineProperty(_getObjectStore$put, "value", value), _getObjectStore$put));
              return _context146.abrupt("return", new DBPromise(request).toPromise());

            case 2:
            case "end":
              return _context146.stop();
          }
        }
      }, _callee146);
    }));
    return _putObject2.apply(this, arguments);
  }

  function getObject(_x173, _x174) {
    return _getObject.apply(this, arguments);
  }

  function _getObject() {
    _getObject = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee147(db, key) {
      var request, data;
      return _regeneratorRuntime().wrap(function _callee147$(_context147) {
        while (1) {
          switch (_context147.prev = _context147.next) {
            case 0:
              request = getObjectStore(db, false).get(key);
              _context147.next = 3;
              return new DBPromise(request).toPromise();

            case 3:
              data = _context147.sent;
              return _context147.abrupt("return", data === undefined ? null : data.value);

            case 5:
            case "end":
              return _context147.stop();
          }
        }
      }, _callee147);
    }));
    return _getObject.apply(this, arguments);
  }

  function _deleteObject(db, key) {
    var request = getObjectStore(db, true).delete(key);
    return new DBPromise(request).toPromise();
  }

  var _POLLING_INTERVAL_MS = 800;
  var _TRANSACTION_RETRY_COUNT = 3;

  var IndexedDBLocalPersistence = /*#__PURE__*/function () {
    function IndexedDBLocalPersistence() {
      _classCallCheck(this, IndexedDBLocalPersistence);

      this.type = "LOCAL"
      /* LOCAL */
      ;
      this._shouldAllowMigration = true;
      this.listeners = {};
      this.localCache = {}; // setTimeout return value is platform specific
      // eslint-disable-next-line @typescript-eslint/no-explicit-any

      this.pollTimer = null;
      this.pendingWrites = 0;
      this.receiver = null;
      this.sender = null;
      this.serviceWorkerReceiverAvailable = false;
      this.activeServiceWorker = null; // Fire & forget the service worker registration as it may never resolve

      this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then(function () {}, function () {});
    }

    _createClass(IndexedDBLocalPersistence, [{
      key: "_openDb",
      value: function () {
        var _openDb2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee55() {
          return _regeneratorRuntime().wrap(function _callee55$(_context55) {
            while (1) {
              switch (_context55.prev = _context55.next) {
                case 0:
                  if (!this.db) {
                    _context55.next = 2;
                    break;
                  }

                  return _context55.abrupt("return", this.db);

                case 2:
                  _context55.next = 4;
                  return _openDatabase();

                case 4:
                  this.db = _context55.sent;
                  return _context55.abrupt("return", this.db);

                case 6:
                case "end":
                  return _context55.stop();
              }
            }
          }, _callee55, this);
        }));

        function _openDb() {
          return _openDb2.apply(this, arguments);
        }

        return _openDb;
      }()
    }, {
      key: "_withRetries",
      value: function () {
        var _withRetries2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee56(op) {
          var numAttempts, db;
          return _regeneratorRuntime().wrap(function _callee56$(_context56) {
            while (1) {
              switch (_context56.prev = _context56.next) {
                case 0:
                  numAttempts = 0;

                case 1:

                  _context56.prev = 2;
                  _context56.next = 5;
                  return this._openDb();

                case 5:
                  db = _context56.sent;
                  _context56.next = 8;
                  return op(db);

                case 8:
                  return _context56.abrupt("return", _context56.sent);

                case 11:
                  _context56.prev = 11;
                  _context56.t0 = _context56["catch"](2);

                  if (!(numAttempts++ > _TRANSACTION_RETRY_COUNT)) {
                    _context56.next = 15;
                    break;
                  }

                  throw _context56.t0;

                case 15:
                  if (this.db) {
                    this.db.close();
                    this.db = undefined;
                  } // TODO: consider adding exponential backoff


                case 16:
                  _context56.next = 1;
                  break;

                case 18:
                case "end":
                  return _context56.stop();
              }
            }
          }, _callee56, this, [[2, 11]]);
        }));

        function _withRetries(_x175) {
          return _withRetries2.apply(this, arguments);
        }

        return _withRetries;
      }()
      /**
       * IndexedDB events do not propagate from the main window to the worker context.  We rely on a
       * postMessage interface to send these events to the worker ourselves.
       */

    }, {
      key: "initializeServiceWorkerMessaging",
      value: function () {
        var _initializeServiceWorkerMessaging = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee57() {
          return _regeneratorRuntime().wrap(function _callee57$(_context57) {
            while (1) {
              switch (_context57.prev = _context57.next) {
                case 0:
                  return _context57.abrupt("return", _isWorker() ? this.initializeReceiver() : this.initializeSender());

                case 1:
                case "end":
                  return _context57.stop();
              }
            }
          }, _callee57, this);
        }));

        function initializeServiceWorkerMessaging() {
          return _initializeServiceWorkerMessaging.apply(this, arguments);
        }

        return initializeServiceWorkerMessaging;
      }()
      /**
       * As the worker we should listen to events from the main window.
       */

    }, {
      key: "initializeReceiver",
      value: function () {
        var _initializeReceiver = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee60() {
          var _this25 = this;

          return _regeneratorRuntime().wrap(function _callee60$(_context60) {
            while (1) {
              switch (_context60.prev = _context60.next) {
                case 0:
                  this.receiver = Receiver._getInstance(_getWorkerGlobalScope()); // Refresh from persistence if we receive a KeyChanged message.

                  this.receiver._subscribe("keyChanged"
                  /* KEY_CHANGED */
                  , /*#__PURE__*/function () {
                    var _ref25 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee58(_origin, data) {
                      var keys;
                      return _regeneratorRuntime().wrap(function _callee58$(_context58) {
                        while (1) {
                          switch (_context58.prev = _context58.next) {
                            case 0:
                              _context58.next = 2;
                              return _this25._poll();

                            case 2:
                              keys = _context58.sent;
                              return _context58.abrupt("return", {
                                keyProcessed: keys.includes(data.key)
                              });

                            case 4:
                            case "end":
                              return _context58.stop();
                          }
                        }
                      }, _callee58);
                    }));

                    return function (_x176, _x177) {
                      return _ref25.apply(this, arguments);
                    };
                  }()); // Let the sender know that we are listening so they give us more timeout.


                  this.receiver._subscribe("ping"
                  /* PING */
                  , /*#__PURE__*/function () {
                    var _ref26 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee59(_origin, _data) {
                      return _regeneratorRuntime().wrap(function _callee59$(_context59) {
                        while (1) {
                          switch (_context59.prev = _context59.next) {
                            case 0:
                              return _context59.abrupt("return", ["keyChanged"
                              /* KEY_CHANGED */
                              ]);

                            case 1:
                            case "end":
                              return _context59.stop();
                          }
                        }
                      }, _callee59);
                    }));

                    return function (_x178, _x179) {
                      return _ref26.apply(this, arguments);
                    };
                  }());

                case 3:
                case "end":
                  return _context60.stop();
              }
            }
          }, _callee60, this);
        }));

        function initializeReceiver() {
          return _initializeReceiver.apply(this, arguments);
        }

        return initializeReceiver;
      }()
      /**
       * As the main window, we should let the worker know when keys change (set and remove).
       *
       * @remarks
       * {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready | ServiceWorkerContainer.ready}
       * may not resolve.
       */

    }, {
      key: "initializeSender",
      value: function () {
        var _initializeSender = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee61() {
          var _a, _b, results;

          return _regeneratorRuntime().wrap(function _callee61$(_context61) {
            while (1) {
              switch (_context61.prev = _context61.next) {
                case 0:
                  _context61.next = 2;
                  return _getActiveServiceWorker();

                case 2:
                  this.activeServiceWorker = _context61.sent;

                  if (this.activeServiceWorker) {
                    _context61.next = 5;
                    break;
                  }

                  return _context61.abrupt("return");

                case 5:
                  this.sender = new Sender(this.activeServiceWorker); // Ping the service worker to check what events they can handle.

                  _context61.next = 8;
                  return this.sender._send("ping"
                  /* PING */
                  , {}, 800
                  /* LONG_ACK */
                  );

                case 8:
                  results = _context61.sent;

                  if (results) {
                    _context61.next = 11;
                    break;
                  }

                  return _context61.abrupt("return");

                case 11:
                  if (((_a = results[0]) === null || _a === void 0 ? void 0 : _a.fulfilled) && ((_b = results[0]) === null || _b === void 0 ? void 0 : _b.value.includes("keyChanged"
                  /* KEY_CHANGED */
                  ))) {
                    this.serviceWorkerReceiverAvailable = true;
                  }

                case 12:
                case "end":
                  return _context61.stop();
              }
            }
          }, _callee61, this);
        }));

        function initializeSender() {
          return _initializeSender.apply(this, arguments);
        }

        return initializeSender;
      }()
      /**
       * Let the worker know about a changed key, the exact key doesn't technically matter since the
       * worker will just trigger a full sync anyway.
       *
       * @remarks
       * For now, we only support one service worker per page.
       *
       * @param key - Storage key which changed.
       */

    }, {
      key: "notifyServiceWorker",
      value: function () {
        var _notifyServiceWorker = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee62(key) {
          return _regeneratorRuntime().wrap(function _callee62$(_context62) {
            while (1) {
              switch (_context62.prev = _context62.next) {
                case 0:
                  if (!(!this.sender || !this.activeServiceWorker || _getServiceWorkerController() !== this.activeServiceWorker)) {
                    _context62.next = 2;
                    break;
                  }

                  return _context62.abrupt("return");

                case 2:
                  _context62.prev = 2;
                  _context62.next = 5;
                  return this.sender._send("keyChanged"
                  /* KEY_CHANGED */
                  , {
                    key: key
                  }, // Use long timeout if receiver has previously responded to a ping from us.
                  this.serviceWorkerReceiverAvailable ? 800
                  /* LONG_ACK */
                  : 50
                  /* ACK */
                  );

                case 5:
                  _context62.next = 9;
                  break;

                case 7:
                  _context62.prev = 7;
                  _context62.t0 = _context62["catch"](2);

                case 9:
                case "end":
                  return _context62.stop();
              }
            }
          }, _callee62, this, [[2, 7]]);
        }));

        function notifyServiceWorker(_x180) {
          return _notifyServiceWorker.apply(this, arguments);
        }

        return notifyServiceWorker;
      }()
    }, {
      key: "_isAvailable",
      value: function () {
        var _isAvailable3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee63() {
          var db;
          return _regeneratorRuntime().wrap(function _callee63$(_context63) {
            while (1) {
              switch (_context63.prev = _context63.next) {
                case 0:
                  _context63.prev = 0;

                  if (indexedDB) {
                    _context63.next = 3;
                    break;
                  }

                  return _context63.abrupt("return", false);

                case 3:
                  _context63.next = 5;
                  return _openDatabase();

                case 5:
                  db = _context63.sent;
                  _context63.next = 8;
                  return _putObject(db, STORAGE_AVAILABLE_KEY, '1');

                case 8:
                  _context63.next = 10;
                  return _deleteObject(db, STORAGE_AVAILABLE_KEY);

                case 10:
                  return _context63.abrupt("return", true);

                case 13:
                  _context63.prev = 13;
                  _context63.t0 = _context63["catch"](0);

                case 15:
                  return _context63.abrupt("return", false);

                case 16:
                case "end":
                  return _context63.stop();
              }
            }
          }, _callee63, null, [[0, 13]]);
        }));

        function _isAvailable() {
          return _isAvailable3.apply(this, arguments);
        }

        return _isAvailable;
      }()
    }, {
      key: "_withPendingWrite",
      value: function () {
        var _withPendingWrite2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee64(write) {
          return _regeneratorRuntime().wrap(function _callee64$(_context64) {
            while (1) {
              switch (_context64.prev = _context64.next) {
                case 0:
                  this.pendingWrites++;
                  _context64.prev = 1;
                  _context64.next = 4;
                  return write();

                case 4:
                  _context64.prev = 4;
                  this.pendingWrites--;
                  return _context64.finish(4);

                case 7:
                case "end":
                  return _context64.stop();
              }
            }
          }, _callee64, this, [[1,, 4, 7]]);
        }));

        function _withPendingWrite(_x181) {
          return _withPendingWrite2.apply(this, arguments);
        }

        return _withPendingWrite;
      }()
    }, {
      key: "_set",
      value: function () {
        var _set4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee66(key, value) {
          var _this26 = this;

          return _regeneratorRuntime().wrap(function _callee66$(_context66) {
            while (1) {
              switch (_context66.prev = _context66.next) {
                case 0:
                  return _context66.abrupt("return", this._withPendingWrite( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee65() {
                    return _regeneratorRuntime().wrap(function _callee65$(_context65) {
                      while (1) {
                        switch (_context65.prev = _context65.next) {
                          case 0:
                            _context65.next = 2;
                            return _this26._withRetries(function (db) {
                              return _putObject(db, key, value);
                            });

                          case 2:
                            _this26.localCache[key] = value;
                            return _context65.abrupt("return", _this26.notifyServiceWorker(key));

                          case 4:
                          case "end":
                            return _context65.stop();
                        }
                      }
                    }, _callee65);
                  }))));

                case 1:
                case "end":
                  return _context66.stop();
              }
            }
          }, _callee66, this);
        }));

        function _set(_x182, _x183) {
          return _set4.apply(this, arguments);
        }

        return _set;
      }()
    }, {
      key: "_get",
      value: function () {
        var _get5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee67(key) {
          var obj;
          return _regeneratorRuntime().wrap(function _callee67$(_context67) {
            while (1) {
              switch (_context67.prev = _context67.next) {
                case 0:
                  _context67.next = 2;
                  return this._withRetries(function (db) {
                    return getObject(db, key);
                  });

                case 2:
                  obj = _context67.sent;
                  this.localCache[key] = obj;
                  return _context67.abrupt("return", obj);

                case 5:
                case "end":
                  return _context67.stop();
              }
            }
          }, _callee67, this);
        }));

        function _get(_x184) {
          return _get5.apply(this, arguments);
        }

        return _get;
      }()
    }, {
      key: "_remove",
      value: function () {
        var _remove4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee69(key) {
          var _this27 = this;

          return _regeneratorRuntime().wrap(function _callee69$(_context69) {
            while (1) {
              switch (_context69.prev = _context69.next) {
                case 0:
                  return _context69.abrupt("return", this._withPendingWrite( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee68() {
                    return _regeneratorRuntime().wrap(function _callee68$(_context68) {
                      while (1) {
                        switch (_context68.prev = _context68.next) {
                          case 0:
                            _context68.next = 2;
                            return _this27._withRetries(function (db) {
                              return _deleteObject(db, key);
                            });

                          case 2:
                            delete _this27.localCache[key];
                            return _context68.abrupt("return", _this27.notifyServiceWorker(key));

                          case 4:
                          case "end":
                            return _context68.stop();
                        }
                      }
                    }, _callee68);
                  }))));

                case 1:
                case "end":
                  return _context69.stop();
              }
            }
          }, _callee69, this);
        }));

        function _remove(_x185) {
          return _remove4.apply(this, arguments);
        }

        return _remove;
      }()
    }, {
      key: "_poll",
      value: function () {
        var _poll2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee70() {
          var result, keys, keysInResult, _iterator4, _step4, _step4$value, key, value, _i3, _Object$keys2, localKey;

          return _regeneratorRuntime().wrap(function _callee70$(_context70) {
            while (1) {
              switch (_context70.prev = _context70.next) {
                case 0:
                  _context70.next = 2;
                  return this._withRetries(function (db) {
                    var getAllRequest = getObjectStore(db, false).getAll();
                    return new DBPromise(getAllRequest).toPromise();
                  });

                case 2:
                  result = _context70.sent;

                  if (result) {
                    _context70.next = 5;
                    break;
                  }

                  return _context70.abrupt("return", []);

                case 5:
                  if (!(this.pendingWrites !== 0)) {
                    _context70.next = 7;
                    break;
                  }

                  return _context70.abrupt("return", []);

                case 7:
                  keys = [];
                  keysInResult = new Set();
                  _iterator4 = _createForOfIteratorHelper(result);

                  try {
                    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                      _step4$value = _step4.value, key = _step4$value.fbase_key, value = _step4$value.value;
                      keysInResult.add(key);

                      if (JSON.stringify(this.localCache[key]) !== JSON.stringify(value)) {
                        this.notifyListeners(key, value);
                        keys.push(key);
                      }
                    }
                  } catch (err) {
                    _iterator4.e(err);
                  } finally {
                    _iterator4.f();
                  }

                  for (_i3 = 0, _Object$keys2 = Object.keys(this.localCache); _i3 < _Object$keys2.length; _i3++) {
                    localKey = _Object$keys2[_i3];

                    if (this.localCache[localKey] && !keysInResult.has(localKey)) {
                      // Deleted
                      this.notifyListeners(localKey, null);
                      keys.push(localKey);
                    }
                  }

                  return _context70.abrupt("return", keys);

                case 13:
                case "end":
                  return _context70.stop();
              }
            }
          }, _callee70, this);
        }));

        function _poll() {
          return _poll2.apply(this, arguments);
        }

        return _poll;
      }()
    }, {
      key: "notifyListeners",
      value: function notifyListeners(key, newValue) {
        this.localCache[key] = newValue;
        var listeners = this.listeners[key];

        if (listeners) {
          for (var _i4 = 0, _Array$from2 = Array.from(listeners); _i4 < _Array$from2.length; _i4++) {
            var listener = _Array$from2[_i4];
            listener(newValue);
          }
        }
      }
    }, {
      key: "startPolling",
      value: function startPolling() {
        var _this28 = this;

        this.stopPolling();
        this.pollTimer = setInterval( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee71() {
          return _regeneratorRuntime().wrap(function _callee71$(_context71) {
            while (1) {
              switch (_context71.prev = _context71.next) {
                case 0:
                  return _context71.abrupt("return", _this28._poll());

                case 1:
                case "end":
                  return _context71.stop();
              }
            }
          }, _callee71);
        })), _POLLING_INTERVAL_MS);
      }
    }, {
      key: "stopPolling",
      value: function stopPolling() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      }
    }, {
      key: "_addListener",
      value: function _addListener(key, listener) {
        if (Object.keys(this.listeners).length === 0) {
          this.startPolling();
        }

        if (!this.listeners[key]) {
          this.listeners[key] = new Set(); // Populate the cache to avoid spuriously triggering on first poll.

          void this._get(key); // This can happen in the background async and we can return immediately.
        }

        this.listeners[key].add(listener);
      }
    }, {
      key: "_removeListener",
      value: function _removeListener(key, listener) {
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
    }]);

    return IndexedDBLocalPersistence;
  }();

  IndexedDBLocalPersistence.type = 'LOCAL';
  /**
   * An implementation of {@link Persistence} of type `LOCAL` using `indexedDB`
   * for the underlying storage.
   *
   * @public
   */

  var indexedDBLocalPersistence = IndexedDBLocalPersistence;

  function getScriptParentElement() {
    var _a, _b;

    return (_b = (_a = document.getElementsByTagName('head')) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : document;
  }

  function _loadJS(url) {
    // TODO: consider adding timeout support & cancellation
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.setAttribute('src', url);
      el.onload = resolve;

      el.onerror = function (e) {
        var error = _createError("internal-error"
        /* INTERNAL_ERROR */
        );

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

    _assert(auth._popupRedirectResolver, auth, "argument-error"
    /* ARGUMENT_ERROR */
    );

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


  var IdpCredential = /*#__PURE__*/function (_AuthCredential5) {
    _inherits(IdpCredential, _AuthCredential5);

    var _super21 = _createSuper(IdpCredential);

    function IdpCredential(params) {
      var _this36;

      _classCallCheck(this, IdpCredential);

      _this36 = _super21.call(this, "custom"
      /* CUSTOM */
      , "custom"
      /* CUSTOM */
      );
      _this36.params = params;
      return _this36;
    }

    _createClass(IdpCredential, [{
      key: "_getIdTokenResponse",
      value: function _getIdTokenResponse(auth) {
        return signInWithIdp(auth, this._buildIdpRequest());
      }
    }, {
      key: "_linkToIdToken",
      value: function _linkToIdToken(auth, idToken) {
        return signInWithIdp(auth, this._buildIdpRequest(idToken));
      }
    }, {
      key: "_getReauthenticationResolver",
      value: function _getReauthenticationResolver(auth) {
        return signInWithIdp(auth, this._buildIdpRequest());
      }
    }, {
      key: "_buildIdpRequest",
      value: function _buildIdpRequest(idToken) {
        var request = {
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
    }]);

    return IdpCredential;
  }(AuthCredential);

  function _signIn(params) {
    return _signInWithCredential(params.auth, new IdpCredential(params), params.bypassAuthState);
  }

  function _reauth(params) {
    var auth = params.auth,
        user = params.user;

    _assert(user, auth, "internal-error"
    /* INTERNAL_ERROR */
    );

    return _reauthenticate(user, new IdpCredential(params), params.bypassAuthState);
  }

  function _link(_x203) {
    return _link2.apply(this, arguments);
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


  function _link2() {
    _link2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee154(params) {
      var auth, user;
      return _regeneratorRuntime().wrap(function _callee154$(_context154) {
        while (1) {
          switch (_context154.prev = _context154.next) {
            case 0:
              auth = params.auth, user = params.user;

              _assert(user, auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              return _context154.abrupt("return", _link$1(user, new IdpCredential(params), params.bypassAuthState));

            case 3:
            case "end":
              return _context154.stop();
          }
        }
      }, _callee154);
    }));
    return _link2.apply(this, arguments);
  }

  var AbstractPopupRedirectOperation = /*#__PURE__*/function () {
    function AbstractPopupRedirectOperation(auth, filter, resolver, user) {
      var bypassAuthState = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      _classCallCheck(this, AbstractPopupRedirectOperation);

      this.auth = auth;
      this.resolver = resolver;
      this.user = user;
      this.bypassAuthState = bypassAuthState;
      this.pendingPromise = null;
      this.eventManager = null;
      this.filter = Array.isArray(filter) ? filter : [filter];
    }

    _createClass(AbstractPopupRedirectOperation, [{
      key: "execute",
      value: function execute() {
        var _this37 = this;

        return new Promise( /*#__PURE__*/function () {
          var _ref31 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee77(resolve, reject) {
            return _regeneratorRuntime().wrap(function _callee77$(_context77) {
              while (1) {
                switch (_context77.prev = _context77.next) {
                  case 0:
                    _this37.pendingPromise = {
                      resolve: resolve,
                      reject: reject
                    };
                    _context77.prev = 1;
                    _context77.next = 4;
                    return _this37.resolver._initialize(_this37.auth);

                  case 4:
                    _this37.eventManager = _context77.sent;
                    _context77.next = 7;
                    return _this37.onExecution();

                  case 7:
                    _this37.eventManager.registerConsumer(_this37);

                    _context77.next = 13;
                    break;

                  case 10:
                    _context77.prev = 10;
                    _context77.t0 = _context77["catch"](1);

                    _this37.reject(_context77.t0);

                  case 13:
                  case "end":
                    return _context77.stop();
                }
              }
            }, _callee77, null, [[1, 10]]);
          }));

          return function (_x204, _x205) {
            return _ref31.apply(this, arguments);
          };
        }());
      }
    }, {
      key: "onAuthEvent",
      value: function () {
        var _onAuthEvent = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee78(event) {
          var urlResponse, sessionId, postBody, tenantId, error, type, params;
          return _regeneratorRuntime().wrap(function _callee78$(_context78) {
            while (1) {
              switch (_context78.prev = _context78.next) {
                case 0:
                  urlResponse = event.urlResponse, sessionId = event.sessionId, postBody = event.postBody, tenantId = event.tenantId, error = event.error, type = event.type;

                  if (!error) {
                    _context78.next = 4;
                    break;
                  }

                  this.reject(error);
                  return _context78.abrupt("return");

                case 4:
                  params = {
                    auth: this.auth,
                    requestUri: urlResponse,
                    sessionId: sessionId,
                    tenantId: tenantId || undefined,
                    postBody: postBody || undefined,
                    user: this.user,
                    bypassAuthState: this.bypassAuthState
                  };
                  _context78.prev = 5;
                  _context78.t0 = this;
                  _context78.next = 9;
                  return this.getIdpTask(type)(params);

                case 9:
                  _context78.t1 = _context78.sent;

                  _context78.t0.resolve.call(_context78.t0, _context78.t1);

                  _context78.next = 16;
                  break;

                case 13:
                  _context78.prev = 13;
                  _context78.t2 = _context78["catch"](5);
                  this.reject(_context78.t2);

                case 16:
                case "end":
                  return _context78.stop();
              }
            }
          }, _callee78, this, [[5, 13]]);
        }));

        function onAuthEvent(_x206) {
          return _onAuthEvent.apply(this, arguments);
        }

        return onAuthEvent;
      }()
    }, {
      key: "onError",
      value: function onError(error) {
        this.reject(error);
      }
    }, {
      key: "getIdpTask",
      value: function getIdpTask(type) {
        switch (type) {
          case "signInViaPopup"
          /* SIGN_IN_VIA_POPUP */
          :
          case "signInViaRedirect"
          /* SIGN_IN_VIA_REDIRECT */
          :
            return _signIn;

          case "linkViaPopup"
          /* LINK_VIA_POPUP */
          :
          case "linkViaRedirect"
          /* LINK_VIA_REDIRECT */
          :
            return _link;

          case "reauthViaPopup"
          /* REAUTH_VIA_POPUP */
          :
          case "reauthViaRedirect"
          /* REAUTH_VIA_REDIRECT */
          :
            return _reauth;

          default:
            _fail(this.auth, "internal-error"
            /* INTERNAL_ERROR */
            );

        }
      }
    }, {
      key: "resolve",
      value: function resolve(cred) {
        debugAssert(this.pendingPromise, 'Pending promise was never set');
        this.pendingPromise.resolve(cred);
        this.unregisterAndCleanUp();
      }
    }, {
      key: "reject",
      value: function reject(error) {
        debugAssert(this.pendingPromise, 'Pending promise was never set');
        this.pendingPromise.reject(error);
        this.unregisterAndCleanUp();
      }
    }, {
      key: "unregisterAndCleanUp",
      value: function unregisterAndCleanUp() {
        if (this.eventManager) {
          this.eventManager.unregisterConsumer(this);
        }

        this.pendingPromise = null;
        this.cleanUp();
      }
    }]);

    return AbstractPopupRedirectOperation;
  }();
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


  new Delay(2000, 10000);
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

  var PENDING_REDIRECT_KEY = 'pendingRedirect'; // We only get one redirect outcome for any one auth, so just store it
  // in here.

  var redirectOutcomeMap = new Map();

  var RedirectAction = /*#__PURE__*/function (_AbstractPopupRedirec2) {
    _inherits(RedirectAction, _AbstractPopupRedirec2);

    var _super23 = _createSuper(RedirectAction);

    function RedirectAction(auth, resolver) {
      var _this41;

      var bypassAuthState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      _classCallCheck(this, RedirectAction);

      _this41 = _super23.call(this, auth, ["signInViaRedirect"
      /* SIGN_IN_VIA_REDIRECT */
      , "linkViaRedirect"
      /* LINK_VIA_REDIRECT */
      , "reauthViaRedirect"
      /* REAUTH_VIA_REDIRECT */
      , "unknown"
      /* UNKNOWN */
      ], resolver, undefined, bypassAuthState);
      _this41.eventId = null;
      return _this41;
    }
    /**
     * Override the execute function; if we already have a redirect result, then
     * just return it.
     */


    _createClass(RedirectAction, [{
      key: "execute",
      value: function () {
        var _execute2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee81() {
          var readyOutcome, hasPendingRedirect, result;
          return _regeneratorRuntime().wrap(function _callee81$(_context81) {
            while (1) {
              switch (_context81.prev = _context81.next) {
                case 0:
                  readyOutcome = redirectOutcomeMap.get(this.auth._key());

                  if (readyOutcome) {
                    _context81.next = 21;
                    break;
                  }

                  _context81.prev = 2;
                  _context81.next = 5;
                  return _getAndClearPendingRedirectStatus(this.resolver, this.auth);

                case 5:
                  hasPendingRedirect = _context81.sent;

                  if (!hasPendingRedirect) {
                    _context81.next = 12;
                    break;
                  }

                  _context81.next = 9;
                  return _get(_getPrototypeOf(RedirectAction.prototype), "execute", this).call(this);

                case 9:
                  _context81.t0 = _context81.sent;
                  _context81.next = 13;
                  break;

                case 12:
                  _context81.t0 = null;

                case 13:
                  result = _context81.t0;

                  readyOutcome = function readyOutcome() {
                    return Promise.resolve(result);
                  };

                  _context81.next = 20;
                  break;

                case 17:
                  _context81.prev = 17;
                  _context81.t1 = _context81["catch"](2);

                  readyOutcome = function readyOutcome() {
                    return Promise.reject(_context81.t1);
                  };

                case 20:
                  redirectOutcomeMap.set(this.auth._key(), readyOutcome);

                case 21:
                  // If we're not bypassing auth state, the ready outcome should be set to
                  // null.
                  if (!this.bypassAuthState) {
                    redirectOutcomeMap.set(this.auth._key(), function () {
                      return Promise.resolve(null);
                    });
                  }

                  return _context81.abrupt("return", readyOutcome());

                case 23:
                case "end":
                  return _context81.stop();
              }
            }
          }, _callee81, this, [[2, 17]]);
        }));

        function execute() {
          return _execute2.apply(this, arguments);
        }

        return execute;
      }()
    }, {
      key: "onAuthEvent",
      value: function () {
        var _onAuthEvent2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee82(event) {
          var user;
          return _regeneratorRuntime().wrap(function _callee82$(_context82) {
            while (1) {
              switch (_context82.prev = _context82.next) {
                case 0:
                  if (!(event.type === "signInViaRedirect"
                  /* SIGN_IN_VIA_REDIRECT */
                  )) {
                    _context82.next = 4;
                    break;
                  }

                  return _context82.abrupt("return", _get(_getPrototypeOf(RedirectAction.prototype), "onAuthEvent", this).call(this, event));

                case 4:
                  if (!(event.type === "unknown"
                  /* UNKNOWN */
                  )) {
                    _context82.next = 7;
                    break;
                  }

                  // This is a sentinel value indicating there's no pending redirect
                  this.resolve(null);
                  return _context82.abrupt("return");

                case 7:
                  if (!event.eventId) {
                    _context82.next = 17;
                    break;
                  }

                  _context82.next = 10;
                  return this.auth._redirectUserForId(event.eventId);

                case 10:
                  user = _context82.sent;

                  if (!user) {
                    _context82.next = 16;
                    break;
                  }

                  this.user = user;
                  return _context82.abrupt("return", _get(_getPrototypeOf(RedirectAction.prototype), "onAuthEvent", this).call(this, event));

                case 16:
                  this.resolve(null);

                case 17:
                case "end":
                  return _context82.stop();
              }
            }
          }, _callee82, this);
        }));

        function onAuthEvent(_x216) {
          return _onAuthEvent2.apply(this, arguments);
        }

        return onAuthEvent;
      }()
    }, {
      key: "onExecution",
      value: function () {
        var _onExecution2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee83() {
          return _regeneratorRuntime().wrap(function _callee83$(_context83) {
            while (1) {
              switch (_context83.prev = _context83.next) {
                case 0:
                case "end":
                  return _context83.stop();
              }
            }
          }, _callee83);
        }));

        function onExecution() {
          return _onExecution2.apply(this, arguments);
        }

        return onExecution;
      }()
    }, {
      key: "cleanUp",
      value: function cleanUp() {}
    }]);

    return RedirectAction;
  }(AbstractPopupRedirectOperation);

  function _getAndClearPendingRedirectStatus(_x217, _x218) {
    return _getAndClearPendingRedirectStatus2.apply(this, arguments);
  }

  function _getAndClearPendingRedirectStatus2() {
    _getAndClearPendingRedirectStatus2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee158(resolver, auth) {
      var key, persistence, hasPendingRedirect;
      return _regeneratorRuntime().wrap(function _callee158$(_context158) {
        while (1) {
          switch (_context158.prev = _context158.next) {
            case 0:
              key = pendingRedirectKey(auth);
              persistence = resolverPersistence(resolver);
              _context158.next = 4;
              return persistence._isAvailable();

            case 4:
              if (_context158.sent) {
                _context158.next = 6;
                break;
              }

              return _context158.abrupt("return", false);

            case 6:
              _context158.next = 8;
              return persistence._get(key);

            case 8:
              _context158.t0 = _context158.sent;
              hasPendingRedirect = _context158.t0 === 'true';
              _context158.next = 12;
              return persistence._remove(key);

            case 12:
              return _context158.abrupt("return", hasPendingRedirect);

            case 13:
            case "end":
              return _context158.stop();
          }
        }
      }, _callee158);
    }));
    return _getAndClearPendingRedirectStatus2.apply(this, arguments);
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

  function _getRedirectResult(_x232, _x233) {
    return _getRedirectResult3.apply(this, arguments);
  }

  function _getRedirectResult3() {
    _getRedirectResult3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee164(auth, resolverExtern) {
      var bypassAuthState,
          authInternal,
          resolver,
          action,
          result,
          _args164 = arguments;
      return _regeneratorRuntime().wrap(function _callee164$(_context164) {
        while (1) {
          switch (_context164.prev = _context164.next) {
            case 0:
              bypassAuthState = _args164.length > 2 && _args164[2] !== undefined ? _args164[2] : false;
              authInternal = _castAuth(auth);
              resolver = _withDefaultResolver(authInternal, resolverExtern);
              action = new RedirectAction(authInternal, resolver, bypassAuthState);
              _context164.next = 6;
              return action.execute();

            case 6:
              result = _context164.sent;

              if (!(result && !bypassAuthState)) {
                _context164.next = 13;
                break;
              }

              delete result.user._redirectEventId;
              _context164.next = 11;
              return authInternal._persistUserIfCurrent(result.user);

            case 11:
              _context164.next = 13;
              return authInternal._setRedirectUser(null, resolverExtern);

            case 13:
              return _context164.abrupt("return", result);

            case 14:
            case "end":
              return _context164.stop();
          }
        }
      }, _callee164);
    }));
    return _getRedirectResult3.apply(this, arguments);
  }

  var EVENT_DUPLICATION_CACHE_DURATION_MS = 10 * 60 * 1000;

  var AuthEventManager = /*#__PURE__*/function () {
    function AuthEventManager(auth) {
      _classCallCheck(this, AuthEventManager);

      this.auth = auth;
      this.cachedEventUids = new Set();
      this.consumers = new Set();
      this.queuedRedirectEvent = null;
      this.hasHandledPotentialRedirect = false;
      this.lastProcessedEventTime = Date.now();
    }

    _createClass(AuthEventManager, [{
      key: "registerConsumer",
      value: function registerConsumer(authEventConsumer) {
        this.consumers.add(authEventConsumer);

        if (this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)) {
          this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
          this.saveEventToCache(this.queuedRedirectEvent);
          this.queuedRedirectEvent = null;
        }
      }
    }, {
      key: "unregisterConsumer",
      value: function unregisterConsumer(authEventConsumer) {
        this.consumers.delete(authEventConsumer);
      }
    }, {
      key: "onEvent",
      value: function onEvent(event) {
        var _this42 = this;

        // Check if the event has already been handled
        if (this.hasEventBeenHandled(event)) {
          return false;
        }

        var handled = false;
        this.consumers.forEach(function (consumer) {
          if (_this42.isEventForConsumer(event, consumer)) {
            handled = true;

            _this42.sendToConsumer(event, consumer);

            _this42.saveEventToCache(event);
          }
        });

        if (this.hasHandledPotentialRedirect || !isRedirectEvent(event)) {
          // If we've already seen a redirect before, or this is a popup event,
          // bail now
          return handled;
        }

        this.hasHandledPotentialRedirect = true; // If the redirect wasn't handled, hang on to it

        if (!handled) {
          this.queuedRedirectEvent = event;
          handled = true;
        }

        return handled;
      }
    }, {
      key: "sendToConsumer",
      value: function sendToConsumer(event, consumer) {
        var _a;

        if (event.error && !isNullRedirectEvent(event)) {
          var code = ((_a = event.error.code) === null || _a === void 0 ? void 0 : _a.split('auth/')[1]) || "internal-error"
          /* INTERNAL_ERROR */
          ;
          consumer.onError(_createError(this.auth, code));
        } else {
          consumer.onAuthEvent(event);
        }
      }
    }, {
      key: "isEventForConsumer",
      value: function isEventForConsumer(event, consumer) {
        var eventIdMatches = consumer.eventId === null || !!event.eventId && event.eventId === consumer.eventId;
        return consumer.filter.includes(event.type) && eventIdMatches;
      }
    }, {
      key: "hasEventBeenHandled",
      value: function hasEventBeenHandled(event) {
        if (Date.now() - this.lastProcessedEventTime >= EVENT_DUPLICATION_CACHE_DURATION_MS) {
          this.cachedEventUids.clear();
        }

        return this.cachedEventUids.has(eventUid(event));
      }
    }, {
      key: "saveEventToCache",
      value: function saveEventToCache(event) {
        this.cachedEventUids.add(eventUid(event));
        this.lastProcessedEventTime = Date.now();
      }
    }]);

    return AuthEventManager;
  }();

  function eventUid(e) {
    return [e.type, e.eventId, e.sessionId, e.tenantId].filter(function (v) {
      return v;
    }).join('-');
  }

  function isNullRedirectEvent(_ref32) {
    var type = _ref32.type,
        error = _ref32.error;
    return type === "unknown"
    /* UNKNOWN */
    && (error === null || error === void 0 ? void 0 : error.code) === "auth/".concat("no-auth-event"
    /* NO_AUTH_EVENT */
    );
  }

  function isRedirectEvent(event) {
    switch (event.type) {
      case "signInViaRedirect"
      /* SIGN_IN_VIA_REDIRECT */
      :
      case "linkViaRedirect"
      /* LINK_VIA_REDIRECT */
      :
      case "reauthViaRedirect"
      /* REAUTH_VIA_REDIRECT */
      :
        return true;

      case "unknown"
      /* UNKNOWN */
      :
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


  function _getProjectConfig(_x235) {
    return _getProjectConfig2.apply(this, arguments);
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


  function _getProjectConfig2() {
    _getProjectConfig2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee166(auth) {
      var request,
          _args166 = arguments;
      return _regeneratorRuntime().wrap(function _callee166$(_context166) {
        while (1) {
          switch (_context166.prev = _context166.next) {
            case 0:
              request = _args166.length > 1 && _args166[1] !== undefined ? _args166[1] : {};
              return _context166.abrupt("return", _performApiRequest(auth, "GET"
              /* GET */
              , "/v1/projects"
              /* GET_PROJECT_CONFIG */
              , request));

            case 2:
            case "end":
              return _context166.stop();
          }
        }
      }, _callee166);
    }));
    return _getProjectConfig2.apply(this, arguments);
  }

  var IP_ADDRESS_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  var HTTP_REGEX = /^https?/;

  function _validateOrigin(_x236) {
    return _validateOrigin2.apply(this, arguments);
  }

  function _validateOrigin2() {
    _validateOrigin2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee167(auth) {
      var _yield$_getProjectCon, authorizedDomains, _iterator5, _step5, domain;

      return _regeneratorRuntime().wrap(function _callee167$(_context167) {
        while (1) {
          switch (_context167.prev = _context167.next) {
            case 0:
              if (!auth.config.emulator) {
                _context167.next = 2;
                break;
              }

              return _context167.abrupt("return");

            case 2:
              _context167.next = 4;
              return _getProjectConfig(auth);

            case 4:
              _yield$_getProjectCon = _context167.sent;
              authorizedDomains = _yield$_getProjectCon.authorizedDomains;
              _iterator5 = _createForOfIteratorHelper(authorizedDomains);
              _context167.prev = 7;

              _iterator5.s();

            case 9:
              if ((_step5 = _iterator5.n()).done) {
                _context167.next = 20;
                break;
              }

              domain = _step5.value;
              _context167.prev = 11;

              if (!matchDomain(domain)) {
                _context167.next = 14;
                break;
              }

              return _context167.abrupt("return");

            case 14:
              _context167.next = 18;
              break;

            case 16:
              _context167.prev = 16;
              _context167.t0 = _context167["catch"](11);

            case 18:
              _context167.next = 9;
              break;

            case 20:
              _context167.next = 25;
              break;

            case 22:
              _context167.prev = 22;
              _context167.t1 = _context167["catch"](7);

              _iterator5.e(_context167.t1);

            case 25:
              _context167.prev = 25;

              _iterator5.f();

              return _context167.finish(25);

            case 28:
              // In the old SDK, this error also provides helpful messages.
              _fail(auth, "unauthorized-domain"
              /* INVALID_ORIGIN */
              );

            case 29:
            case "end":
              return _context167.stop();
          }
        }
      }, _callee167, null, [[7, 22, 25, 28], [11, 16]]);
    }));
    return _validateOrigin2.apply(this, arguments);
  }

  function matchDomain(expected) {
    var currentUrl = _getCurrentUrl();

    var _URL = new URL(currentUrl),
        protocol = _URL.protocol,
        hostname = _URL.hostname;

    if (expected.startsWith('chrome-extension://')) {
      var ceUrl = new URL(expected);

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
    } // Dots in pattern should be escaped.


    var escapedDomainPattern = expected.replace(/\./g, '\\.'); // Non ip address domains.
    // domain.com = *.domain.com OR domain.com

    var re = new RegExp('^(.+\\.' + escapedDomainPattern + '|' + escapedDomainPattern + ')$', 'i');
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


  var NETWORK_TIMEOUT = new Delay(30000, 60000);
  /**
   * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
   * it will stop working after a retrial. This is a hack to fix this issue.
   */

  function resetUnloadedGapiModules() {
    // Clear last failed gapi.load state to force next gapi.load to first
    // load the failed gapi.iframes module.
    // Get gapix.beacon context.
    var beacon = _window().___jsl; // Get current hint.


    if (beacon === null || beacon === void 0 ? void 0 : beacon.H) {
      // Get gapi hint.
      for (var _i5 = 0, _Object$keys3 = Object.keys(beacon.H); _i5 < _Object$keys3.length; _i5++) {
        var hint = _Object$keys3[_i5];
        // Requested modules.
        beacon.H[hint].r = beacon.H[hint].r || []; // Loaded modules.

        beacon.H[hint].L = beacon.H[hint].L || []; // Set requested modules to a copy of the loaded modules.

        beacon.H[hint].r = _toConsumableArray(beacon.H[hint].L); // Clear pending callbacks.

        if (beacon.CP) {
          for (var i = 0; i < beacon.CP.length; i++) {
            // Remove all failed pending callbacks.
            beacon.CP[i] = null;
          }
        }
      }
    }
  }

  function loadGapi(auth) {
    return new Promise(function (resolve, reject) {
      var _a, _b, _c; // Function to run when gapi.load is ready.


      function loadGapiIframe() {
        // The developer may have tried to previously run gapi.load and failed.
        // Run this to fix that.
        resetUnloadedGapiModules();
        gapi.load('gapi.iframes', {
          callback: function callback() {
            resolve(gapi.iframes.getContext());
          },
          ontimeout: function ontimeout() {
            // The above reset may be sufficient, but having this reset after
            // failure ensures that if the developer calls gapi.load after the
            // connection is re-established and before another attempt to embed
            // the iframe, it would work and would not be broken because of our
            // failed attempt.
            // Timeout when gapi.iframes.Iframe not loaded.
            resetUnloadedGapiModules();
            reject(_createError(auth, "network-request-failed"
            /* NETWORK_REQUEST_FAILED */
            ));
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
        var cbName = _generateCallbackName('iframefcb'); // GApi loader not available, dynamically load platform.js.


        _window()[cbName] = function () {
          // GApi loader should be ready.
          if (!!gapi.load) {
            loadGapiIframe();
          } else {
            // Gapi loader failed, throw error.
            reject(_createError(auth, "network-request-failed"
            /* NETWORK_REQUEST_FAILED */
            ));
          }
        }; // Load GApi loader.


        return _loadJS("https://apis.google.com/js/api.js?onload=".concat(cbName)).catch(function (e) {
          return reject(e);
        });
      }
    }).catch(function (error) {
      // Reset cached promise to allow for retrial.
      cachedGApiLoader = null;
      throw error;
    });
  }

  var cachedGApiLoader = null;

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


  var PING_TIMEOUT = new Delay(5000, 15000);
  var IFRAME_PATH = '__/auth/iframe';
  var EMULATED_IFRAME_PATH = 'emulator/auth/iframe';
  var IFRAME_ATTRIBUTES = {
    style: {
      position: 'absolute',
      top: '-100px',
      width: '1px',
      height: '1px'
    },
    'aria-hidden': 'true',
    tabindex: '-1'
  }; // Map from apiHost to endpoint ID for passing into iframe. In current SDK, apiHost can be set to
  // anything (not from a list of endpoints with IDs as in legacy), so this is the closest we can get.

  var EID_FROM_APIHOST = new Map([["identitytoolkit.googleapis.com"
  /* API_HOST */
  , 'p'], ['staging-identitytoolkit.sandbox.googleapis.com', 's'], ['test-identitytoolkit.sandbox.googleapis.com', 't'] // test
  ]);

  function getIframeUrl(auth) {
    var config = auth.config;

    _assert(config.authDomain, auth, "auth-domain-config-required"
    /* MISSING_AUTH_DOMAIN */
    );

    var url = config.emulator ? _emulatorUrl(config, EMULATED_IFRAME_PATH) : "https://".concat(auth.config.authDomain, "/").concat(IFRAME_PATH);
    var params = {
      apiKey: config.apiKey,
      appName: auth.name,
      v: SDK_VERSION
    };
    var eid = EID_FROM_APIHOST.get(auth.config.apiHost);

    if (eid) {
      params.eid = eid;
    }

    var frameworks = auth._getFrameworks();

    if (frameworks.length) {
      params.fw = frameworks.join(',');
    }

    return "".concat(url, "?").concat(querystring(params).slice(1));
  }

  function _openIframe(_x237) {
    return _openIframe2.apply(this, arguments);
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


  function _openIframe2() {
    _openIframe2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee169(auth) {
      var context, gapi;
      return _regeneratorRuntime().wrap(function _callee169$(_context169) {
        while (1) {
          switch (_context169.prev = _context169.next) {
            case 0:
              _context169.next = 2;
              return _loadGapi(auth);

            case 2:
              context = _context169.sent;
              gapi = _window().gapi;

              _assert(gapi, auth, "internal-error"
              /* INTERNAL_ERROR */
              );

              return _context169.abrupt("return", context.open({
                where: document.body,
                url: getIframeUrl(auth),
                messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
                attributes: IFRAME_ATTRIBUTES,
                dontclear: true
              }, function (iframe) {
                return new Promise( /*#__PURE__*/function () {
                  var _ref40 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee168(resolve, reject) {
                    var networkError, networkErrorTimer, clearTimerAndResolve;
                    return _regeneratorRuntime().wrap(function _callee168$(_context168) {
                      while (1) {
                        switch (_context168.prev = _context168.next) {
                          case 0:
                            clearTimerAndResolve = function _clearTimerAndResolve() {
                              _window().clearTimeout(networkErrorTimer);

                              resolve(iframe);
                            };

                            _context168.next = 3;
                            return iframe.restyle({
                              // Prevent iframe from closing on mouse out.
                              setHideOnLeave: false
                            });

                          case 3:
                            networkError = _createError(auth, "network-request-failed"
                            /* NETWORK_REQUEST_FAILED */
                            ); // Confirm iframe is correctly loaded.
                            // To fallback on failure, set a timeout.

                            networkErrorTimer = _window().setTimeout(function () {
                              reject(networkError);
                            }, PING_TIMEOUT.get()); // Clear timer and resolve pending iframe ready promise.

                            // This returns an IThenable. However the reject part does not call
                            // when the iframe is not loaded.
                            iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, function () {
                              reject(networkError);
                            });

                          case 6:
                          case "end":
                            return _context168.stop();
                        }
                      }
                    }, _callee168);
                  }));

                  return function (_x248, _x249) {
                    return _ref40.apply(this, arguments);
                  };
                }());
              }));

            case 6:
            case "end":
              return _context169.stop();
          }
        }
      }, _callee169);
    }));
    return _openIframe2.apply(this, arguments);
  }

  var BASE_POPUP_OPTIONS = {
    location: 'yes',
    resizable: 'yes',
    statusbar: 'yes',
    toolbar: 'no'
  };
  var DEFAULT_WIDTH = 500;
  var DEFAULT_HEIGHT = 600;
  var TARGET_BLANK = '_blank';
  var FIREFOX_EMPTY_URL = 'http://localhost';

  var AuthPopup = /*#__PURE__*/function () {
    function AuthPopup(window) {
      _classCallCheck(this, AuthPopup);

      this.window = window;
      this.associatedEvent = null;
    }

    _createClass(AuthPopup, [{
      key: "close",
      value: function close() {
        if (this.window) {
          try {
            this.window.close();
          } catch (e) {}
        }
      }
    }]);

    return AuthPopup;
  }();

  function _open(auth, url, name) {
    var width = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : DEFAULT_WIDTH;
    var height = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : DEFAULT_HEIGHT;
    var top = Math.max((window.screen.availHeight - height) / 2, 0).toString();
    var left = Math.max((window.screen.availWidth - width) / 2, 0).toString();
    var target = '';
    var options = Object.assign(Object.assign({}, BASE_POPUP_OPTIONS), {
      width: width.toString(),
      height: height.toString(),
      top: top,
      left: left
    }); // Chrome iOS 7 and 8 is returning an undefined popup win when target is
    // specified, even though the popup is not necessarily blocked.

    var ua = getUA().toLowerCase();

    if (name) {
      target = _isChromeIOS(ua) ? TARGET_BLANK : name;
    }

    if (_isFirefox(ua)) {
      // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
      url = url || FIREFOX_EMPTY_URL; // Firefox disables by default scrolling on popup windows, which can create
      // issues when the user has many Google accounts, for instance.

      options.scrollbars = 'yes';
    }

    var optionsString = Object.entries(options).reduce(function (accum, _ref33) {
      var _ref34 = _slicedToArray(_ref33, 2),
          key = _ref34[0],
          value = _ref34[1];

      return "".concat(accum).concat(key, "=").concat(value, ",");
    }, '');

    if (_isIOSStandalone(ua) && target !== '_self') {
      openAsNewWindowIOS(url || '', target);
      return new AuthPopup(null);
    } // about:blank getting sanitized causing browsers like IE/Edge to display
    // brief error message before redirecting to handler.


    var newWin = window.open(url || '', target, optionsString);

    _assert(newWin, auth, "popup-blocked"
    /* POPUP_BLOCKED */
    ); // Flaky on IE edge, encapsulate with a try and catch.


    try {
      newWin.focus();
    } catch (e) {}

    return new AuthPopup(newWin);
  }

  function openAsNewWindowIOS(url, target) {
    var el = document.createElement('a');
    el.href = url;
    el.target = target;
    var click = document.createEvent('MouseEvent');
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


  var WIDGET_PATH = '__/auth/handler';
  /**
   * URL for emulated environment
   *
   * @internal
   */

  var EMULATOR_WIDGET_PATH = 'emulator/auth/handler';

  function _getRedirectUrl(auth, provider, authType, redirectUrl, eventId, additionalParams) {
    _assert(auth.config.authDomain, auth, "auth-domain-config-required"
    /* MISSING_AUTH_DOMAIN */
    );

    _assert(auth.config.apiKey, auth, "invalid-api-key"
    /* INVALID_API_KEY */
    );

    var params = {
      apiKey: auth.config.apiKey,
      appName: auth.name,
      authType: authType,
      redirectUrl: redirectUrl,
      v: SDK_VERSION,
      eventId: eventId
    };

    if (provider instanceof FederatedAuthProvider) {
      provider.setDefaultLanguage(auth.languageCode);
      params.providerId = provider.providerId || '';

      if (!isEmpty(provider.getCustomParameters())) {
        params.customParameters = JSON.stringify(provider.getCustomParameters());
      } // TODO set additionalParams from the provider as well?


      for (var _i6 = 0, _Object$entries = Object.entries(additionalParams || {}); _i6 < _Object$entries.length; _i6++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i6], 2),
            key = _Object$entries$_i[0],
            value = _Object$entries$_i[1];

        params[key] = value;
      }
    }

    if (provider instanceof BaseOAuthProvider) {
      var scopes = provider.getScopes().filter(function (scope) {
        return scope !== '';
      });

      if (scopes.length > 0) {
        params.scopes = scopes.join(',');
      }
    }

    if (auth.tenantId) {
      params.tid = auth.tenantId;
    } // TODO: maybe set eid as endipointId
    // TODO: maybe set fw as Frameworks.join(",")


    var paramsDict = params;

    for (var _i7 = 0, _Object$keys4 = Object.keys(paramsDict); _i7 < _Object$keys4.length; _i7++) {
      var _key7 = _Object$keys4[_i7];

      if (paramsDict[_key7] === undefined) {
        delete paramsDict[_key7];
      }
    }

    return "".concat(getHandlerBase(auth), "?").concat(querystring(paramsDict).slice(1));
  }

  function getHandlerBase(_ref35) {
    var config = _ref35.config;

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


  var WEB_STORAGE_SUPPORT_KEY = 'webStorageSupport';

  var BrowserPopupRedirectResolver = /*#__PURE__*/function () {
    function BrowserPopupRedirectResolver() {
      _classCallCheck(this, BrowserPopupRedirectResolver);

      this.eventManagers = {};
      this.iframes = {};
      this.originValidationPromises = {};
      this._redirectPersistence = browserSessionPersistence;
      this._completeRedirectFn = _getRedirectResult;
      this._overrideRedirectResult = _overrideRedirectResult;
    } // Wrapping in async even though we don't await anywhere in order
    // to make sure errors are raised as promise rejections


    _createClass(BrowserPopupRedirectResolver, [{
      key: "_openPopup",
      value: function () {
        var _openPopup2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee84(auth, provider, authType, eventId) {
          var _a, url;

          return _regeneratorRuntime().wrap(function _callee84$(_context84) {
            while (1) {
              switch (_context84.prev = _context84.next) {
                case 0:
                  debugAssert((_a = this.eventManagers[auth._key()]) === null || _a === void 0 ? void 0 : _a.manager, '_initialize() not called before _openPopup()');
                  url = _getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId);
                  return _context84.abrupt("return", _open(auth, url, _generateEventId()));

                case 3:
                case "end":
                  return _context84.stop();
              }
            }
          }, _callee84, this);
        }));

        function _openPopup(_x238, _x239, _x240, _x241) {
          return _openPopup2.apply(this, arguments);
        }

        return _openPopup;
      }()
    }, {
      key: "_openRedirect",
      value: function () {
        var _openRedirect2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee85(auth, provider, authType, eventId) {
          return _regeneratorRuntime().wrap(function _callee85$(_context85) {
            while (1) {
              switch (_context85.prev = _context85.next) {
                case 0:
                  _context85.next = 2;
                  return this._originValidation(auth);

                case 2:
                  _setWindowLocation(_getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId));

                  return _context85.abrupt("return", new Promise(function () {}));

                case 4:
                case "end":
                  return _context85.stop();
              }
            }
          }, _callee85, this);
        }));

        function _openRedirect(_x242, _x243, _x244, _x245) {
          return _openRedirect2.apply(this, arguments);
        }

        return _openRedirect;
      }()
    }, {
      key: "_initialize",
      value: function _initialize(auth) {
        var _this43 = this;

        var key = auth._key();

        if (this.eventManagers[key]) {
          var _this$eventManagers$k = this.eventManagers[key],
              manager = _this$eventManagers$k.manager,
              _promise = _this$eventManagers$k.promise;

          if (manager) {
            return Promise.resolve(manager);
          } else {
            debugAssert(_promise, 'If manager is not set, promise should be');
            return _promise;
          }
        }

        var promise = this.initAndGetManager(auth);
        this.eventManagers[key] = {
          promise: promise
        }; // If the promise is rejected, the key should be removed so that the
        // operation can be retried later.

        promise.catch(function () {
          delete _this43.eventManagers[key];
        });
        return promise;
      }
    }, {
      key: "initAndGetManager",
      value: function () {
        var _initAndGetManager = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee86(auth) {
          var iframe, manager;
          return _regeneratorRuntime().wrap(function _callee86$(_context86) {
            while (1) {
              switch (_context86.prev = _context86.next) {
                case 0:
                  _context86.next = 2;
                  return _openIframe(auth);

                case 2:
                  iframe = _context86.sent;
                  manager = new AuthEventManager(auth);
                  iframe.register('authEvent', function (iframeEvent) {
                    _assert(iframeEvent === null || iframeEvent === void 0 ? void 0 : iframeEvent.authEvent, auth, "invalid-auth-event"
                    /* INVALID_AUTH_EVENT */
                    ); // TODO: Consider splitting redirect and popup events earlier on


                    var handled = manager.onEvent(iframeEvent.authEvent);
                    return {
                      status: handled ? "ACK"
                      /* ACK */
                      : "ERROR"
                      /* ERROR */

                    };
                  }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
                  this.eventManagers[auth._key()] = {
                    manager: manager
                  };
                  this.iframes[auth._key()] = iframe;
                  return _context86.abrupt("return", manager);

                case 8:
                case "end":
                  return _context86.stop();
              }
            }
          }, _callee86, this);
        }));

        function initAndGetManager(_x246) {
          return _initAndGetManager.apply(this, arguments);
        }

        return initAndGetManager;
      }()
    }, {
      key: "_isIframeWebStorageSupported",
      value: function _isIframeWebStorageSupported(auth, cb) {
        var iframe = this.iframes[auth._key()];

        iframe.send(WEB_STORAGE_SUPPORT_KEY, {
          type: WEB_STORAGE_SUPPORT_KEY
        }, function (result) {
          var _a;

          var isSupported = (_a = result === null || result === void 0 ? void 0 : result[0]) === null || _a === void 0 ? void 0 : _a[WEB_STORAGE_SUPPORT_KEY];

          if (isSupported !== undefined) {
            cb(!!isSupported);
          }

          _fail(auth, "internal-error"
          /* INTERNAL_ERROR */
          );
        }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
      }
    }, {
      key: "_originValidation",
      value: function _originValidation(auth) {
        var key = auth._key();

        if (!this.originValidationPromises[key]) {
          this.originValidationPromises[key] = _validateOrigin(auth);
        }

        return this.originValidationPromises[key];
      }
    }, {
      key: "_shouldInitProactively",
      get: function get() {
        // Mobile browsers and Safari need to optimistically initialize
        return _isMobileBrowser() || _isSafari() || _isIOS();
      }
    }]);

    return BrowserPopupRedirectResolver;
  }();
  /**
   * An implementation of {@link PopupRedirectResolver} suitable for browser
   * based applications.
   *
   * @public
   */


  var browserPopupRedirectResolver = BrowserPopupRedirectResolver;
  var name$1 = "@firebase/auth";
  var version$1 = "0.20.4";
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

  var AuthInterop = /*#__PURE__*/function () {
    function AuthInterop(auth) {
      _classCallCheck(this, AuthInterop);

      this.auth = auth;
      this.internalListeners = new Map();
    }

    _createClass(AuthInterop, [{
      key: "getUid",
      value: function getUid() {
        var _a;

        this.assertAuthConfigured();
        return ((_a = this.auth.currentUser) === null || _a === void 0 ? void 0 : _a.uid) || null;
      }
    }, {
      key: "getToken",
      value: function () {
        var _getToken2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee87(forceRefresh) {
          var accessToken;
          return _regeneratorRuntime().wrap(function _callee87$(_context87) {
            while (1) {
              switch (_context87.prev = _context87.next) {
                case 0:
                  this.assertAuthConfigured();
                  _context87.next = 3;
                  return this.auth._initializationPromise;

                case 3:
                  if (this.auth.currentUser) {
                    _context87.next = 5;
                    break;
                  }

                  return _context87.abrupt("return", null);

                case 5:
                  _context87.next = 7;
                  return this.auth.currentUser.getIdToken(forceRefresh);

                case 7:
                  accessToken = _context87.sent;
                  return _context87.abrupt("return", {
                    accessToken: accessToken
                  });

                case 9:
                case "end":
                  return _context87.stop();
              }
            }
          }, _callee87, this);
        }));

        function getToken(_x247) {
          return _getToken2.apply(this, arguments);
        }

        return getToken;
      }()
    }, {
      key: "addAuthTokenListener",
      value: function addAuthTokenListener(listener) {
        this.assertAuthConfigured();

        if (this.internalListeners.has(listener)) {
          return;
        }

        var unsubscribe = this.auth.onIdTokenChanged(function (user) {
          var _a;

          listener(((_a = user) === null || _a === void 0 ? void 0 : _a.stsTokenManager.accessToken) || null);
        });
        this.internalListeners.set(listener, unsubscribe);
        this.updateProactiveRefresh();
      }
    }, {
      key: "removeAuthTokenListener",
      value: function removeAuthTokenListener(listener) {
        this.assertAuthConfigured();
        var unsubscribe = this.internalListeners.get(listener);

        if (!unsubscribe) {
          return;
        }

        this.internalListeners.delete(listener);
        unsubscribe();
        this.updateProactiveRefresh();
      }
    }, {
      key: "assertAuthConfigured",
      value: function assertAuthConfigured() {
        _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth"
        /* DEPENDENT_SDK_INIT_BEFORE_AUTH */
        );
      }
    }, {
      key: "updateProactiveRefresh",
      value: function updateProactiveRefresh() {
        if (this.internalListeners.size > 0) {
          this.auth._startProactiveRefresh();
        } else {
          this.auth._stopProactiveRefresh();
        }
      }
    }]);

    return AuthInterop;
  }();
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
      case "Node"
      /* NODE */
      :
        return 'node';

      case "ReactNative"
      /* REACT_NATIVE */
      :
        return 'rn';

      case "Worker"
      /* WORKER */
      :
        return 'webworker';

      case "Cordova"
      /* CORDOVA */
      :
        return 'cordova';

      default:
        return undefined;
    }
  }
  /** @internal */


  function registerAuth(clientPlatform) {
    _registerComponent(new Component("auth"
    /* AUTH */
    , function (container, _ref36) {
      var deps = _ref36.options;
      var app = container.getProvider('app').getImmediate();
      var heartbeatServiceProvider = container.getProvider('heartbeat');
      var _app$options = app.options,
          apiKey = _app$options.apiKey,
          authDomain = _app$options.authDomain;
      return function (app, heartbeatServiceProvider) {
        _assert(apiKey && !apiKey.includes(':'), "invalid-api-key"
        /* INVALID_API_KEY */
        , {
          appName: app.name
        }); // Auth domain is optional if IdP sign in isn't being used


        _assert(!(authDomain === null || authDomain === void 0 ? void 0 : authDomain.includes(':')), "argument-error"
        /* ARGUMENT_ERROR */
        , {
          appName: app.name
        });

        var config = {
          apiKey: apiKey,
          authDomain: authDomain,
          clientPlatform: clientPlatform,
          apiHost: "identitytoolkit.googleapis.com"
          /* API_HOST */
          ,
          tokenApiHost: "securetoken.googleapis.com"
          /* TOKEN_API_HOST */
          ,
          apiScheme: "https"
          /* API_SCHEME */
          ,
          sdkClientVersion: _getClientVersion(clientPlatform)
        };
        var authInstance = new AuthImpl(app, heartbeatServiceProvider, config);

        _initializeAuthInstance(authInstance, deps);

        return authInstance;
      }(app, heartbeatServiceProvider);
    }, "PUBLIC"
    /* PUBLIC */
    )
    /**
     * Auth can only be initialized by explicitly calling getAuth() or initializeAuth()
     * For why we do this, See go/firebase-next-auth-init
     */
    .setInstantiationMode("EXPLICIT"
    /* EXPLICIT */
    )
    /**
     * Because all firebase products that depend on auth depend on auth-internal directly,
     * we need to initialize auth-internal after auth is initialized to make it available to other firebase products.
     */
    .setInstanceCreatedCallback(function (container, _instanceIdentifier, _instance) {
      var authInternalProvider = container.getProvider("auth-internal"
      /* AUTH_INTERNAL */
      );
      authInternalProvider.initialize();
    }));

    _registerComponent(new Component("auth-internal"
    /* AUTH_INTERNAL */
    , function (container) {
      var auth = _castAuth(container.getProvider("auth"
      /* AUTH */
      ).getImmediate());

      return function (auth) {
        return new AuthInterop(auth);
      }(auth);
    }, "PRIVATE"
    /* PRIVATE */
    ).setInstantiationMode("EXPLICIT"
    /* EXPLICIT */
    ));

    registerVersion(name$1, version$1, getVersionForPlatform(clientPlatform)); // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation

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

  /**
   * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
   * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
   *
   * @param app - The Firebase App.
   *
   * @public
   */


  function getAuth() {
    var app = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getApp();

    var provider = _getProvider(app, 'auth');

    if (provider.isInitialized()) {
      return provider.getImmediate();
    }

    return initializeAuth(app, {
      popupRedirectResolver: browserPopupRedirectResolver,
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
    });
  }

  registerAuth("Browser"
  /* BROWSER */
  );

  var name = "firebase";
  var version = "9.8.4";
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
  // https://firebase.google.com/docs/web/setup#available-libraries
  // Your web app's Firebase configuration

  var firebaseConfig = {
    apiKey: "AIzaSyBkogia4Wk0L8PGBmBUe8nchmnTUCP12So",
    authDomain: "pomodoro-ef5e0.firebaseapp.com",
    projectId: "pomodoro-ef5e0",
    storageBucket: "pomodoro-ef5e0.appspot.com",
    messagingSenderId: "1090399963563",
    appId: "1:1090399963563:web:3770ce113bc93a4443eaee"
  }; // Initialize Firebase

  var app = initializeApp(firebaseConfig);
  var auth = getAuth(app); //export const provider = new GoogleAuthProvider();

  //#region Components/CircularProgressBar/circularProgressBar.jsx
  //#endregion
  //#region URLs

  var URLs = {
    // USER: "http://localhost:4444/users",
    // POMO: "http://localhost:4444/pomos",
    USER: "https://pomodoro-apis.onrender.com/users",
    POMO: "https://pomodoro-apis.onrender.com/pomos"
  }; //#endregion

  var idbVersion = 3;
  var DB = null;

  var getIdTokenAndEmail = function getIdTokenAndEmail() {
    return new Promise(function (res, rej) {
      var unsubscribe = onAuthStateChanged(auth, function (user) {
        unsubscribe();

        if (user) {
          getIdToken(user).then(function (idToken) {
            res({
              idToken: idToken,
              email: user.email
            });
          }, function (error) {
            res(null);
          });
        } else {
          res(null);
        }
      });
    });
  };

  self.addEventListener("install", function (ev) {
    console.log("sw - installed");
  });
  self.addEventListener("activate", function (ev) {
    console.log("sw - activated");
    ev.waitUntil(Promise.resolve().then(function () {
      openDB();
    }));
  });
  self.addEventListener("message", function (ev) {
    if (_typeof(ev.data) === "object" && ev.data !== null) {
      var _ev$data = ev.data,
          action = _ev$data.action,
          payload = _ev$data.payload;

      switch (action) {
        case "saveStates":
          ensureDBIsOpen(saveStates, payload);
          break;

        case "countDown":
          if (DB) {
            countDown(payload, ev.source.id);
          } else {
            openDB(function () {
              countDown(payload, ev.source.id);
            });
          }

          break;

        case "emptyStateStore":
          ensureDBIsOpen(emptyStateStore, ev.source.id);
          break;

        case "stopCountdown":
          //number로 바꿔야하 하는거 아니야?
          console.log(payload.idOfSetInterval);
          clearInterval(payload.idOfSetInterval);
          break;
      }
    }

    function ensureDBIsOpen(cb, arg) {
      if (DB) {
        cb(arg);
      } else {
        openDB(function () {
          cb(arg);
        });
      }
    }
  });
  /**
   * purpose: to make TimerRelatedStates in the index.tsx be assigned an empty object.
   *          why?
   *          if it is {}, states in the PatternTimer and Timer are going to be set using the new pomoSetting
   *          not using the stale states in the indexedDB.
   * @param {*} clientId
   */

  function emptyStateStore(_x) {
    return _emptyStateStore.apply(this, arguments);
  } // Purpose: to decide whether the the following duration is a pomo or break.


  function _emptyStateStore() {
    _emptyStateStore = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(clientId) {
      var transaction, store, req, client;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              transaction = DB.transaction("stateStore", "readwrite");

              transaction.onerror = function (err) {
                console.warn(err);
              };

              transaction.oncomplete = function (ev) {
                console.log("transaction has completed");
              };

              store = transaction.objectStore("stateStore");
              req = store.clear();

              req.onsuccess = function (ev) {
                console.log("stateStore has been cleared");
              };

              req.onerror = function (err) {
                console.warn(err);
              };

              _context.next = 9;
              return self.clients.get(clientId);

            case 9:
              client = _context.sent;
              client.postMessage({});

            case 11:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));
    return _emptyStateStore.apply(this, arguments);
  }

  function goNext(_x2, _x3) {
    return _goNext.apply(this, arguments);
  } //#region Now
  // if the timer was running in the timer page, continue to count down the timer.


  function _goNext() {
    _goNext = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(states, clientId) {
      var wrapped, tx, store, duration, pause, repetitionCount, running, startTime, _states$pomoSetting, pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo;

      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              wrapped = wrap$1(DB);
              tx = wrapped.transaction("stateStore", "readwrite");
              store = tx.objectStore("stateStore");
              duration = states.duration, pause = states.pause, repetitionCount = states.repetitionCount, running = states.running, startTime = states.startTime, _states$pomoSetting = states.pomoSetting, pomoDuration = _states$pomoSetting.pomoDuration, shortBreakDuration = _states$pomoSetting.shortBreakDuration, longBreakDuration = _states$pomoSetting.longBreakDuration, numOfPomo = _states$pomoSetting.numOfPomo;
              repetitionCount++;
              running = false;
              pause = {
                totalLength: 0,
                record: []
              };
              _context2.next = 9;
              return store.put({
                name: "repetitionCount",
                component: "PatternTimer",
                value: repetitionCount
              });

            case 9:
              _context2.next = 11;
              return store.put({
                name: "running",
                component: "Timer",
                value: running
              });

            case 11:
              _context2.next = 13;
              return store.put({
                name: "startTime",
                component: "Timer",
                value: 0
              });

            case 13:
              _context2.next = 15;
              return store.put({
                name: "pause",
                component: "Timer",
                value: pause
              });

            case 15:
              if (!(repetitionCount < numOfPomo * 2 - 1)) {
                _context2.next = 33;
                break;
              }

              if (!(repetitionCount % 2 === 1)) {
                _context2.next = 28;
                break;
              }

              //This is when a pomo, which is not the last one of a cycle, is completed.
              self.registration.showNotification("shortBreak", {
                body: "time to take a short break"
              });
              recordPomo(duration, startTime);
              _context2.next = 21;
              return store.put({
                name: "duration",
                component: "PatternTimer",
                value: shortBreakDuration
              });

            case 21:
              _context2.t0 = console;
              _context2.next = 24;
              return getIdTokenAndEmail();

            case 24:
              _context2.t1 = _context2.sent;

              _context2.t0.log.call(_context2.t0, _context2.t1);

              _context2.next = 31;
              break;

            case 28:
              //* This is when a short break is done.
              self.registration.showNotification("pomo", {
                body: "time to focus"
              });
              _context2.next = 31;
              return store.put({
                name: "duration",
                component: "PatternTimer",
                value: pomoDuration
              });

            case 31:
              _context2.next = 46;
              break;

            case 33:
              if (!(repetitionCount === numOfPomo * 2 - 1)) {
                _context2.next = 40;
                break;
              }

              //This is when the last pomo of a cycle is completed.
              self.registration.showNotification("longBreak", {
                body: "time to take a long break"
              });
              recordPomo(duration, startTime);
              _context2.next = 38;
              return store.put({
                name: "duration",
                component: "PatternTimer",
                value: longBreakDuration
              });

            case 38:
              _context2.next = 46;
              break;

            case 40:
              if (!(repetitionCount === numOfPomo * 2)) {
                _context2.next = 46;
                break;
              }

              //This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
              self.registration.showNotification("nextCycle", {
                body: "time to do the next cycle of pomos"
              });
              _context2.next = 44;
              return store.put({
                name: "repetitionCount",
                component: "PatternTimer",
                value: 0
              });

            case 44:
              _context2.next = 46;
              return store.put({
                name: "duration",
                component: "PatternTimer",
                value: pomoDuration
              });

            case 46:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));
    return _goNext.apply(this, arguments);
  }

  function countDown(_x4, _x5) {
    return _countDown.apply(this, arguments);
  } //#endregion
  //data is like below.
  //{
  //   component: "Timer",
  //   stateArr: [
  //     { name: "startTime", value: action.payload },
  //     { name: "running", value: true },
  //   ],
  // };


  function _countDown() {
    _countDown = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(setIntervalId, clientId) {
      var wrapped, store, states, client, idOfSetInterval;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              wrapped = wrap$1(DB);
              store = wrapped.transaction("stateStore").objectStore("stateStore");
              _context3.next = 4;
              return store.getAll();

            case 4:
              states = _context3.sent.reduce(function (acc, cur) {
                return _objectSpread2(_objectSpread2({}, acc), {}, _defineProperty({}, cur.name, cur.value));
              }, {});

              if (!(states.running && setIntervalId === null)) {
                _context3.next = 11;
                break;
              }

              _context3.next = 8;
              return self.clients.get(clientId);

            case 8:
              client = _context3.sent;
              idOfSetInterval = setInterval(function () {
                var remainingDuration = Math.floor((states.duration * 60 * 1000 - (Date.now() - states.startTime - states.pause.totalLength)) / 1000);
                console.log("count down remaining duration", remainingDuration);

                if (remainingDuration <= 0) {
                  console.log("idOfSetInterval", idOfSetInterval);
                  clearInterval(idOfSetInterval);
                  client.postMessage({
                    timerHasEnded: "clearLocalStorage"
                  });
                  goNext(states, clientId);
                }
              }, 500);
              client.postMessage({
                idOfSetInterval: idOfSetInterval
              });

            case 11:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));
    return _countDown.apply(this, arguments);
  }

  function saveStates(data) {
    var transaction = DB.transaction("stateStore", "readwrite"); //immediately returns a transaction object.

    transaction.onerror = function (err) {
      console.warn(err);
    };

    transaction.oncomplete = function (ev) {
      console.log("transaction has completed");
    };

    var stateStore = transaction.objectStore("stateStore");
    console.log(data);
    var component = data.component;
    Array.from(data.stateArr).forEach(function (obj) {
      var req = stateStore.put(_objectSpread2(_objectSpread2({}, obj), {}, {
        component: component
      }));

      req.onsuccess = function (ev) {
        console.log("putting an object has succeeded");
      };

      req.onerror = function (err) {
        console.warn(err);
      };
    });
  }

  function openDB(callback) {
    var req = indexedDB.open("timerRelatedDB", idbVersion);

    req.onerror = function (err) {
      console.warn(err);
      DB = null;
    };

    req.onupgradeneeded = function (ev) {
      DB = req.result;
      var oldVersion = ev.oldVersion;
      var newVersion = ev.newVersion || DB.version;
      console.log("DB updated from version", oldVersion, "to", newVersion);
      console.log("upgrade", DB);

      if (!DB.objectStoreNames.contains("stateStore")) {
        DB.createObjectStore("stateStore", {
          keyPath: ["name", "component"]
        });
      }

      if (!DB.objectStoreNames.contains("idStore")) {
        DB.createObjectStore("idStore", {
          keyPath: ["name"]
        });
      }
    };

    req.onsuccess = function (ev) {
      // every time the connection to the argument db is successful.
      DB = req.result;
      console.log("DB connection has succeeded");

      if (callback) {
        callback();
      }

      DB.onversionchange = function (ev) {
        DB && DB.close();
        console.log("Database version has changed.", {
          versionchange: ev
        });
        openDB();
      };
    };
  }

  function recordPomo(_x6, _x7) {
    return _recordPomo.apply(this, arguments);
  }

  function _recordPomo() {
    _recordPomo = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(duration, startTime) {
      var LocaleDateString, _yield$getIdTokenAndE, idToken, email, body, res;

      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              LocaleDateString = new Date(startTime).toLocaleDateString();
              _context4.next = 4;
              return getIdTokenAndEmail();

            case 4:
              _yield$getIdTokenAndE = _context4.sent;
              idToken = _yield$getIdTokenAndE.idToken;
              email = _yield$getIdTokenAndE.email;
              console.log("idToken", idToken);
              console.log("email", email);
              body = JSON.stringify({
                userEmail: email,
                duration: duration,
                startTime: startTime,
                LocaleDateString: LocaleDateString
              });
              console.log("body", body);
              _context4.next = 13;
              return fetch(URLs.POMO, {
                method: "POST",
                body: body,
                headers: {
                  Authorization: "Bearer " + idToken,
                  "Content-Type": "application/json"
                }
              });

            case 13:
              res = _context4.sent;
              console.log("res of recordPomo in sw: ", res);
              _context4.next = 20;
              break;

            case 17:
              _context4.prev = 17;
              _context4.t0 = _context4["catch"](0);
              console.warn(_context4.t0);

            case 20:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, null, [[0, 17]]);
    }));
    return _recordPomo.apply(this, arguments);
  }

})();
