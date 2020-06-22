/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = void 0;
var Status;
(function (Status) {
    Status["error"] = "error";
    Status["success"] = "success";
    Status["init"] = "init";
})(Status = exports.Status || (exports.Status = {}));


/***/ }),
/* 2 */,
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var sharedTypes_1 = __webpack_require__(1);
var WorkerToHost = /** @class */ (function () {
    function WorkerToHost() {
        this.funcRegistry = {};
        this.funcRegistry = {};
    }
    WorkerToHost.prototype.registerFunc = function (func, name) {
        var funcName = name ? name : func.name;
        if (this.funcRegistry[funcName]) {
            throw 'Naming Conflict in register Function';
        }
        this.funcRegistry[funcName] = func;
    };
    WorkerToHost.prototype.registerServiceWorker = function (serviceWorker) {
        var _this = this;
        if (this.serviceWorker) {
            throw 'Service Worker Already Registered';
        }
        this.serviceWorker = serviceWorker;
        serviceWorker.postMessage({
            header: 'WorkerToHost',
            body: {
                status: sharedTypes_1.Status.init
            }
        }).then(function (message) { return _this.handleResponse(message); });
    };
    WorkerToHost.prototype.handleResponse = function (res) {
        var _this = this;
        if (res.body.func == '__echo__init') {
            return;
        }
        var possibleFunc = this.funcRegistry[res.body.func];
        if (possibleFunc) {
            try {
                Promise.resolve(possibleFunc.apply(void 0, res.body.args)).then(function (ret) { return _this.reHook(sharedTypes_1.Status.success, ret); });
            }
            catch (e) {
                this.reHook(sharedTypes_1.Status.error, e);
            }
        }
        else {
            this.reHook(sharedTypes_1.Status.error, 'Function is not currently Registered');
        }
    };
    WorkerToHost.prototype.reHook = function (status, returnVal) {
        var _this = this;
        this.serviceWorker.postMessage({
            header: 'WorkerToHost',
            body: {
                status: status,
                return: returnVal
            }
        }).then(function (message) { return _this.handleResponse(message); });
    };
    return WorkerToHost;
}());
exports.default = WorkerToHost;


/***/ }),
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var messageIds = 0

function onMessage (self, e) {
  var message = e.data
  if (!Array.isArray(message) || message.length < 2) {
    // Ignore - this message is not for us.
    return
  }
  var messageId = message[0]
  var error = message[1]
  var result = message[2]

  var callback = self._callbacks[messageId]

  if (!callback) {
    // Ignore - user might have created multiple PromiseWorkers.
    // This message is not for us.
    return
  }

  delete self._callbacks[messageId]
  callback(error, result)
}

function PromiseWorker (worker) {
  var self = this
  self._worker = worker
  self._callbacks = {}

  worker.addEventListener('message', function (e) {
    onMessage(self, e)
  })
}

PromiseWorker.prototype.postMessage = function (userMessage) {
  var self = this
  var messageId = messageIds++

  var messageToSend = [messageId, userMessage]

  return new Promise(function (resolve, reject) {
    self._callbacks[messageId] = function (error, result) {
      if (error) {
        return reject(new Error(error.message))
      }
      resolve(result)
    }

    /* istanbul ignore if */
    if (typeof self._worker.controller !== 'undefined') {
      // service worker, use MessageChannels because e.source is broken in Chrome < 51:
      // https://bugs.chromium.org/p/chromium/issues/detail?id=543198
      var channel = new MessageChannel()
      channel.port1.onmessage = function (e) {
        onMessage(self, e)
      }
      self._worker.controller.postMessage(messageToSend, [channel.port2])
    } else {
      // web worker
      self._worker.postMessage(messageToSend)
    }
  })
}

module.exports = PromiseWorker


/***/ }),
/* 8 */,
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var PromiseWorker = __webpack_require__(7);
var workerToHost_Host_1 = __webpack_require__(3);
var workerToHost = new workerToHost_Host_1.default();
var Pworker = navigator.serviceWorker
    .register('sw.js', { scope: '/' })
    .then(waitForServiceWorkerActivation)
    .then(function (worker) {
    var PW = new PromiseWorker(worker);
    workerToHost.registerServiceWorker(PW);
    return PW;
})
    .catch(function (e) { return console.error('There was an error registering the Service Worker please restart the app', e); });
function waitForServiceWorkerActivation(registration) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (navigator.serviceWorker.controller) { // already active and controlling this page
                return [2 /*return*/, navigator.serviceWorker];
            }
            return [2 /*return*/, new Promise(function (resolve) {
                    registration.addEventListener('updatefound', function () {
                        var newWorker = registration.installing;
                        newWorker.addEventListener('statechange', function () {
                            if (newWorker.state == 'activated' && navigator.serviceWorker.controller) {
                                resolve(navigator.serviceWorker);
                            }
                        });
                    });
                })];
        });
    });
}
workerToHost.registerFunc(function () { return 'Hello from the mainThread'; }, 'test');


/***/ })
/******/ ]);
//# sourceMappingURL=index.js.map