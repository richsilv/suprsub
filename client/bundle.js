(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var __dirname="/../../node_modules/WNdb";
exports.version = "3.0";	// this is the WordNet DB version
exports.path = require('path').join(__dirname, "dict");
exports.files = require('fs').readdirSync(exports.path);

},{"fs":87,"path":92}],2:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var FFI = require('node-ffi');

var elementSize = 4;

function fortranArrayToJSMatrix(fortranArray, m, n) {
    var array = [];
    var a;
    var rowWidth = elementSize * n;
    var columnOffset = m * elementSize;

    for(var i = 0; i < m; i++) {
        var row = [];
        var rowStart = i * elementSize;

        for(var j = 0; j < n; j++) {
            a = fortranArray.seek(columnOffset * j + rowStart);
            row.push(a.getFloat());
        }

        array.push(row);
    }

    return array;
}

function jsMatrixToFortranArray(array) {
    var m = array.length;
    var n = array[0].length;
    var fortranArrayStart = fortranArray = new FFI.Pointer(m * n * elementSize);
    for(var j = 0; j < n; j++) {
	for(var i = 0; i < m; i++) {
            fortranArray.putFloat(array[i][j]);
            fortranArray = fortranArray.seek(elementSize);
        }
    }

    return fortranArrayStart;
}

function fortranArrayToJSArray(fortranArray, n) {
    var array = [];
    
    for(var i = 0; i < n; i++) {	
	array.push(fortranArray.getFloat());
	fortranArray = fortranArray.seek(elementSize);
    }

    return array;
}

function fortranIntArrayToJSArray(fortranArray, n) {
    var array = [];
    
    for(var i = 0; i < n; i++) {
	array.push(fortranArray.getInt32());
	fortranArray = fortranArray.seek(4);
    }

    return array;
}

module.exports.fortranArrayToJSMatrix = fortranArrayToJSMatrix;
module.exports.jsMatrixToFortranArray = jsMatrixToFortranArray;
module.exports.fortranArrayToJSArray = fortranArrayToJSArray;
module.exports.fortranIntArrayToJSArray = fortranIntArrayToJSArray;

},{"node-ffi":9}],3:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var lapack = require('./lapack.js');
exports.sgeqrf = lapack.sgeqrf;
exports.sgesvd = lapack.sgesvd;
exports.qr = lapack.qr;
exports.lu = lapack.lu;
exports.sgetrf = lapack.sgetrf;
exports.sgesv = lapack.sgesv;

},{"./lapack.js":4}],4:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var fortranArray = require('./fortranArray');
var FFI = require('node-ffi');

var LAPACK;

try {
    LAPACK = new FFI.Library('liblapack', {
	"sgeqrf_": ["void", ["pointer", "pointer", "pointer", "pointer", "pointer", 
			    "pointer", "pointer", "pointer"]],
	"sorgqr_": ["void", ["pointer", "pointer", "pointer", "pointer", "pointer", "pointer", 
			    "pointer", "pointer", "pointer"]],
	"sgesvd_": ["void", ["pointer", "pointer", "pointer", "pointer", "pointer", 
			    "pointer", "pointer", "pointer", "pointer", "pointer", 
			    "pointer", "pointer", "pointer", "pointer", ]],
	"sgetrf_": ["void", ["pointer", "pointer", "pointer", "pointer", "pointer", "pointer"]],
	"sgesv_": ["void", ["pointer", "pointer", "pointer", "pointer", "pointer", "pointer", "pointer", "pointer"]]
	
    });
} catch(e) {
    console.log("!!! node-lapack requires the native lapack to be built as a shared lib.");
    console.log(e);
}

var FORTRAN_INT = 4;
var FORTRAN_CHAR = 1;
var FORTRAN_FLOAT = 4;

function eye(m) {
    var matrix = [];

    for(var i = 0; i < m; i++) {
	var row = [];
	matrix.push(row);
	
	for(var j = 0; j < m; j++) {
	    if(i == j)
		row.push(1);
	    else
		row.push(0);
	}
    }

    return matrix;
}

function matrixOp(matrix, callback) {
    var m = matrix.length;
    var n = matrix[0].length;    
    var f_m = new FFI.Pointer(FORTRAN_INT);
    var f_n = new FFI.Pointer(FORTRAN_INT);
    var f_a = fortranArray.jsMatrixToFortranArray(matrix);
    var f_lda = new FFI.Pointer(FORTRAN_INT);
    
    f_m.putInt32(m);
    f_n.putInt32(n);
    f_lda.putInt32(Math.max(1, m));
    
    callback(m, n, f_m, f_n, f_a, f_lda);
}

function zeroBottomLeft(matrix) {
    // zero out bottom left forming an upper right triangle matrix                
    for(var i = 1; i < matrix.length; i++) {
        for(var j = 0; j < i && j < matrix[0].length; j++)
            matrix[i][j] = 0;
    }

    return matrix
}

function sgesv(a, b) {
    var f_info = new FFI.Pointer(FORTRAN_INT);
    var result = {};

    matrixOp(a, function(am, an, af_m, af_n, f_a) {
	var f_ipiv = new FFI.Pointer(am  * FORTRAN_INT);

	matrixOp(b, function(bm, bn, bf_m, bf_n, f_b) {
	    LAPACK.sgesv_(af_m, bf_n, f_a, af_n, f_ipiv, f_b, bf_m, f_info);
	    result.X = fortranArray.fortranArrayToJSMatrix(f_b, bm, bn);
	    result.P = ipivToP(bm, fortranArray.fortranIntArrayToJSArray(f_ipiv, bm));
	});
    });

    return result;
}

function qr(matrix) {
    var result;

    sgeqrf(matrix, function(qr, m, n, f_m, f_n, f_a, f_lda, f_tau, f_work, f_lwork, f_info) {
	var f_k = new FFI.Pointer(FORTRAN_INT);
	f_k.putInt32(Math.min(m, n));
	LAPACK.sorgqr_(f_m, f_n, f_k, f_a, f_lda, f_tau, f_work, f_lwork, f_info);
	qr.Q = fortranArray.fortranArrayToJSMatrix(f_a, m, n);
	qr.R = zeroBottomLeft(qr.R);
	result = qr;
    });
    
    return result;
}

function sgeqrf(matrix, callback) {
    var qr;
    
    matrixOp(matrix, function(m, n, f_m, f_n, f_a, f_lda) {
	var f_tau = new FFI.Pointer(m * n * FORTRAN_FLOAT);
	var f_info = new FFI.Pointer(FORTRAN_INT);
	var f_lwork = new FFI.Pointer(FORTRAN_INT);
	var f_work;
	f_lwork.putInt32(-1);
	
	// get optimal size of workspace
	f_work = new FFI.Pointer(FORTRAN_INT);
	LAPACK.sgeqrf_(f_m, f_n, f_a, f_lda, f_tau, f_work, f_lwork, f_info);
	lwork = f_work.getFloat();
	
	// allocate workspace
	f_work = new FFI.Pointer(lwork * FORTRAN_FLOAT);    
	f_lwork.putInt32(lwork);
	
	// perform QR decomp
	LAPACK.sgeqrf_(f_m, f_n, f_a, f_lda, f_tau, f_work, f_lwork, f_info); 
	
	qr = {
	    R: fortranArray.fortranArrayToJSMatrix(f_a, m, n),
	    tau: fortranArray.fortranArrayToJSArray(f_tau, Math.min(m, n))
	};
	
	if(callback)
	    qr = callback(qr, m, n, f_m, f_n, f_a, f_lda, f_tau, f_work, f_lwork, f_info);
    });
    
    return qr;
}

function cloneMatrix(matrix, height, width) {
    var clone = [];

    height = height || matrix.length;
    width = width || matrix[0].length;

    for(var i = 0; i < height; i++) {
	var row = [];
	clone.push(row);

	for(var j = 0; j < width; j++) {
	    row.push(matrix[i][j]);
	}
    }

    return clone;
}

function swapRows(matrix, i, j) {
    var tmp = matrix[j];
    matrix[j] = matrix[i];
    matrix[i] = tmp;
    return matrix;
}

function lu(matrix) {
    var result = sgetrf(matrix);
    var P = ipivToP(matrix.length, result.IPIV);
    var L = cloneMatrix(result.LU);
    var m = n = Math.min(matrix.length, matrix[0].length);

    for(var i = 0; i < L.length; i++) {
	for(var j = i; j < L[i].length; j++) {
	    if(i == j)
		L[i][j] = 1;
	    else
		L[i][j] = 0;
	}
    }

    return {
	L: L,
	U: zeroBottomLeft(cloneMatrix(result.LU, n, n)),
	P: P,
	IPIV: result.IPIV
    };
}

function ipivToP(m, ipiv){
    var P = eye(m);

    for(var i = 0; i < ipiv.length; i++) {
	if(i != ipiv[i] - 1)
            swapRows(P, i, ipiv[i] - 1);
    }

    return P;
}

function sgetrf(matrix) {
    var result = {};

    matrixOp(matrix, function(m, n, f_m, f_n, f_a, f_lda) {
	var f_ipiv = new FFI.Pointer(Math.min(m, n) * FORTRAN_INT);
	var f_info = new FFI.Pointer(FORTRAN_INT);
	LAPACK.sgetrf_(f_m, f_n, f_a, f_m, f_ipiv, f_info);
	result.LU = fortranArray.fortranArrayToJSMatrix(f_a, m, n);
	result.IPIV = fortranArray.fortranIntArrayToJSArray(f_ipiv, Math.min(m, n));
    });

    return result;
}

function sgesvd(jobu, jobvt, matrix) {
    var f_jobu = new FFI.Pointer(FORTRAN_CHAR);
    var f_jobvt = new FFI.Pointer(FORTRAN_CHAR);
    f_jobu.putChar(jobu.charCodeAt(0));
    f_jobvt.putChar(jobvt.charCodeAt(0));
    var svd;

    matrixOp(matrix, function(m, n, f_m, f_n, f_a, f_lda) {
	var f_s = new FFI.Pointer(Math.pow(Math.min(m, n), 2) * FORTRAN_FLOAT);
	var f_u = new FFI.Pointer(Math.pow(m, 2) * FORTRAN_FLOAT);
	var f_ldu = new FFI.Pointer(FORTRAN_INT);
	f_ldu.putInt32(m);

	// TODO: punting on dims for now. revisit with http://www.netlib.org/lapack/single/sgesvd.f
	var f_vt = new FFI.Pointer(Math.pow(n, 2) * FORTRAN_FLOAT);
	var f_ldvt = new FFI.Pointer(FORTRAN_INT);
	f_ldvt.putInt32(n);
	
	var lwork = -1;
	var f_work = new FFI.Pointer(FORTRAN_FLOAT);
	var f_lwork = new FFI.Pointer(FORTRAN_INT);
	f_lwork.putInt32(lwork);
	var f_info = new FFI.Pointer(FORTRAN_INT);

	LAPACK.sgesvd_(f_jobu, f_jobvt, f_m, f_n, f_a, f_lda, f_s, f_u, f_ldu, f_vt, f_ldvt, 
		      f_work, f_lwork, f_info);

	lwork = f_work.getFloat();
	f_work = new FFI.Pointer(lwork * FORTRAN_FLOAT);
	f_lwork.putInt32(lwork);

	LAPACK.sgesvd_(f_jobu, f_jobvt, f_m, f_n, f_a, f_lda, f_s, f_u, f_ldu, f_vt, f_ldvt, 
		      f_work, f_lwork, f_info);

	svd = {
	    U: fortranArray.fortranArrayToJSMatrix(f_u, m, m),
	    S: fortranArray.fortranArrayToJSMatrix(f_s, n, n),
	    VT: fortranArray.fortranArrayToJSMatrix(f_vt, n, n)
	};
    });

    return svd;
}

exports.sgeqrf = sgeqrf;
exports.sgesvd = sgesvd;
exports.sgetrf = sgetrf;
exports.sgesv = sgesv;
exports.qr = qr;
exports.lu = lu;

},{"./fortranArray":2,"node-ffi":9}],5:[function(require,module,exports){
var ffi = require('./ffi')

/**
 * Turns a JavaScript function into a C function pointer.
 * The function pointer may be used in other C functions that
 * accept C callback functions.
 * TODO: Deprecate this class, make this function return the callback pointer
 *       directly.
 */

function Callback (typedata, func) {
  var retType = typedata[0]
    , types   = typedata[1]

  this._cif   = new ffi.CIF(retType, types)
  this._info  = new ffi.CallbackInfo(this._cif.getPointer(), function (retval, params) {
    var pptr = params.clone()
    var args = types.map(function (type) {
      return ffi.derefValuePtr(type, pptr.getPointer(true))
    })

    // Invoke the user-given function
    var result = func.apply(null, args)

    if (retType !== 'void') {
      retval['put' + ffi.TYPE_TO_POINTER_METHOD_MAP[retType]](result)
    }
  })

  this.pointer = this._info.pointer
}
module.exports = Callback

/**
 * Returns the callback function pointer. Deprecated. Use `callback.pointer`
 * instead.
 */

Callback.prototype.getPointer = function getPointer () {
  return this.pointer
}

},{"./ffi":9}],6:[function(require,module,exports){
var ffi = require('./ffi')

/**
 * CIF provides a JS interface for the libffi "callback info" (CIF) structure.
 * TODO: Deprecate this class. Turn this into a simple function that returns the
 *       CIF pointer.
 */

function CIF (rtype, types) {

  if (!ffi.isValidReturnType(rtype)) {
    throw new Error('Invalid Return Type: ' + rtype)
  }

  var numArgs = types.length

  this._argtypesptr = new ffi.Pointer(types.length * ffi.Bindings.FFI_TYPE_SIZE)
  this._rtypeptr = ffi.ffiTypeFor(rtype)

  var tptr = this._argtypesptr.clone()

  for (var i=0; i<numArgs; i++) {
    var typeName = types[i]

    if (!ffi.isValidParamType(typeName)) {
      throw new Error('Invalid Type: ' + typeName)
    }

    var ffiType = ffi.ffiTypeFor(typeName)
    tptr.putPointer(ffiType, true)
  }

  this.pointer = ffi.Bindings.prepCif(numArgs, this._rtypeptr, this._argtypesptr)
}
module.exports = CIF

CIF.prototype.getPointer = function () { return this.pointer }

},{"./ffi":9}],7:[function(require,module,exports){
var ffi = require('./ffi')
  , read  = require('fs').readFileSync
  , dlopen = ffi.ForeignFunction(ffi.Bindings.StaticFunctions.dlopen
      , 'pointer', [ 'string', 'int32' ])
  , dlclose = ffi.ForeignFunction(ffi.Bindings.StaticFunctions.dlclose
      , 'int32', [ 'pointer' ])
  , dlsym = ffi.ForeignFunction(ffi.Bindings.StaticFunctions.dlsym
      , 'pointer', [ 'pointer', 'string' ])
  , dlerror = ffi.ForeignFunction(ffi.Bindings.StaticFunctions.dlerror
      , 'string', [ ])

/**
 * `DynamicLibrary` loads and fetches function pointers for dynamic libraries
 * (.so, .dylib, etc). After the libray's function pointer is acquired, then you
 * call `get(symbol)` to retreive a pointer to an exported symbol. You need to
 * call `get___()` on the pointer to dereference it into it's acutal value, or
 * turn the pointer into a callable function with `ForeignFunction`.
 */

function DynamicLibrary (path, mode) {
  this._handle = dlopen(path, mode || DynamicLibrary.FLAGS.RTLD_NOW)

  if (this._handle.isNull()) {
    var err = this.error()

    // THIS CODE IS BASED ON GHC Trac ticket #2615
    // http://hackage.haskell.org/trac/ghc/attachment/ticket/2615

    // On some systems (e.g., Gentoo Linux) dynamic files (e.g. libc.so)
    // contain linker scripts rather than ELF-format object code. This
    // code handles the situation by recognizing the real object code
    // file name given in the linker script.

    // If an "invalid ELF header" error occurs, it is assumed that the
    // .so file contains a linker script instead of ELF object code.
    // In this case, the code looks for the GROUP ( ... ) linker
    // directive. If one is found, the first file name inside the
    // parentheses is treated as the name of a dynamic library and the
    // code attempts to dlopen that file. If this is also unsuccessful,
    // an error message is returned.

    // see if the error message is due to an invalid ELF header
    var match

    if (match = err.match(/^(([^ \t()])+\.so([^ \t:()])*):([ \t])*invalid ELF header$/)) {
      var content = read(match[1], 'ascii')
      // try to find a GROUP ( ... ) command
      if (match = content.match(/GROUP *\( *(([^ )])+)/)){
        return DynamicLibrary.call(this, match[1], mode)
      }
    }

    throw new Error('Dynamic Linking Error: ' + err)
  }
}
module.exports = DynamicLibrary

DynamicLibrary.FLAGS = {
    'RTLD_LAZY':    0x1
  , 'RTLD_NOW':     0x2
  , 'RTLD_LOCAL':   0x4
  , 'RTLD_GLOBAL':  0x8
}

/**
 * Close this library, returns the result of the dlclose() system function.
 */

DynamicLibrary.prototype.close = function () {
  return dlclose(this._handle)
}

/**
 * Get a symbol from this library, returns a Pointer for (memory address of) the symbol
 */

DynamicLibrary.prototype.get = function (symbol) {
  var ptr = dlsym(this._handle, symbol)

  if (ptr.isNull()) {
    throw new Error('Dynamic Symbol Retrieval Error: ' + this.error())
  }

  return ptr
}

/**
 * Returns the result of the dlerror() system function
 */

DynamicLibrary.prototype.error = function error () {
  return dlerror()
}

},{"./ffi":9,"fs":87}],8:[function(require,module,exports){
var process=require("__browserify_process");
/**
 * Implementation of errno. This is a #define :/
 * On Linux, it's a global variable with the symbol `errno`,
 * but on Darwin it's a method execution called `__error`.
 */

var ffi = require('./ffi')
  , errnoPtr = null

if (process.platform == 'darwin' || process.platform == 'mac') {
  var __error = new ffi.DynamicLibrary().get('__error')
  errnoPtr = ffi.ForeignFunction(__error, 'pointer', [])
} else if (process.platform == 'win32') {
  var _errno = new ffi.DynamicLibrary('msvcrt.dll').get('_errno')
  errnoPtr = ffi.ForeignFunction(_errno, 'pointer', [])
} else {
  var errnoGlobal = new ffi.DynamicLibrary().get('errno');
  errnoPtr = function () { return errnoGlobal }
}

function errno () {
  return errnoPtr().getInt32()
}
module.exports = errno

},{"./ffi":9,"__browserify_process":91}],9:[function(require,module,exports){
var ffi = module.exports

ffi.Bindings = require('bindings')('ffi_bindings.node')

ffi.VERSION = '0.5.0'

ffi.TYPE_TO_POINTER_METHOD_MAP = {
    'uint8':   'UInt8'
  , 'int8':    'Int8'
  , 'uint8':   'UInt8'
  , 'int16':   'Int16'
  , 'uint16':  'UInt16'
  , 'int32':   'Int32'
  , 'uint32':  'UInt32'
  , 'int64':   'Int64'
  , 'uint64':  'UInt64'
  , 'float':   'Float'
  , 'double':  'Double'
  , 'string':  'CString'
  , 'pointer': 'Pointer'
}

ffi.SIZE_TO_POINTER_METHOD_MAP = {
    1: 'Int8'
  , 2: 'Int16'
  , 4: 'Int32'
  , 8: 'Int64'
}

ffi.PLATFORM_LIBRARY_EXTENSIONS = {
    'linux':  '.so'
  , 'linux2': '.so'
  , 'sunos':  '.so'
  , 'solaris':'.so'
  , 'darwin': '.dylib'
  , 'mac':    '.dylib'
  , 'win32':  '.dll'
}

// A list of types with no hard C++ methods to read/write them
ffi.NON_SPECIFIC_TYPES = {
    'byte':      'Byte'
  , 'char':      'Char'
  , 'uchar':     'UChar'
  , 'short':     'Short'
  , 'ushort':    'UShort'
  , 'int':       'Int'
  , 'uint':      'UInt'
  , 'long':      'Long'
  , 'ulong':     'ULong'
  , 'longlong':  'LongLong'
  , 'ulonglong': 'ULongLong'
  , 'size_t':    'SizeT'
}

// ------------------------------------------------------
// Miscellaneous Utility Functions
// ------------------------------------------------------

// Returns true if the passed type is a valid param type
ffi.isValidParamType = function(type) {
  return ffi.isStructType(type) || ffi.Bindings.FFI_TYPES[type] != undefined
}

// Returns true if the passed type is a valid return type
ffi.isValidReturnType = function(type) {
  return ffi.isValidParamType(type) || type == 'void'
}

ffi.derefValuePtr = function(type, ptr) {
  if (!ffi.isValidParamType(type)) {
    throw new Error('Invalid Type: ' + type)
  }

  if (ffi.isStructType(type)) {
    return new type(ptr)
  }

  if (type == 'void') {
    return null
  }

  var dptr = ptr

  if (type == 'string') {
    dptr = ptr.getPointer()
    if (dptr.isNull()) {
      return null
    }
  }

  return dptr['get' + ffi.TYPE_TO_POINTER_METHOD_MAP[type]]()
}

// Generates a derefValuePtr for a specific type
ffi.derefValuePtrFunc = function(type) {
  if (!ffi.isValidParamType(type)) {
    throw new Error('Invalid Type: ' + type)
  }

  if (ffi.isStructType(type)) {
    return function(ptr) {
      return new type(ptr)
    }
  }

  if (type == 'void') {
    return function(ptr) { return null; }
  }

  var getf = 'get' + ffi.TYPE_TO_POINTER_METHOD_MAP[type]

  if (type == 'string') {
    return function(ptr) {
      var dptr = ptr.getPointer()
      if (dptr.isNull()) {
        return null
      }
      return dptr[getf]()
    }
  } else {
    return function(ptr) {
      return ptr[getf]()
    }
  }
}

/**
 * Returns the byte size of the given type. `type` may be a string name
 * identifier or a Struct type.
 * Roughly equivalent to the C sizeof() operator.
 */

function sizeof (type) {
  return ffi.isStructType(type)
      ? type.__structInfo__.size
      : ffi.Bindings.TYPE_SIZE_MAP[type]
}
ffi.sizeOf = ffi.sizeof = sizeof

/**
 * Returns the FFI_TYPE for the given `type`. May be a `Struct` type.
 */

function ffiTypeFor (type) {
  return ffi.isStructType(type)
      ? type._ffiType().ref()
      : ffi.Bindings.FFI_TYPES[type]
}
ffi.ffiTypeFor = ffiTypeFor

/**
 * Returns true if the given `type` is a Struct type, false otherwise.
 */

function isStructType (type) {
  return !!type.__isStructType__
}
ffi.isStructType = isStructType

// Direct exports from the bindings
ffi.free = ffi.Bindings.free
ffi.CallbackInfo = ffi.Bindings.CallbackInfo

// Include our other modules
ffi.Pointer = require('./pointer')
ffi.CIF = require('./cif')
ffi.ForeignFunction = require('./foreign_function')
ffi.DynamicLibrary = require('./dynamic_library')
ffi.Library = require('./library')
ffi.Callback = require('./callback')
ffi.Struct = require('./struct')
ffi.errno = require('./errno')

/**
 * Define the `FFI_TYPE` struct for use in JS.
 * This struct type is used internally to define custom struct rtn/arg types.
 */

ffi.FFI_TYPE = ffi.Struct([
    ['size_t', 'size']
  , ['ushort', 'alignment']
  , ['ushort', 'type']
  , ['pointer','elements']
])


},{"./callback":5,"./cif":6,"./dynamic_library":7,"./errno":8,"./foreign_function":10,"./library":11,"./pointer":12,"./struct":13,"bindings":14}],10:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");var ffi = require('./ffi')
  , EventEmitter = require('events').EventEmitter
  , POINTER_SIZE = ffi.Bindings.POINTER_SIZE

/**
 * Represents a foreign function in another library. Manages all of the aspects
 * of function execution, including marshalling the data parameters for the
 * function into native types and also unmarshalling the return from function
 * execution.
 */

function ForeignFunction (ptr, returnType, types, async) {
  if (!(this instanceof ForeignFunction)) {
    return new ForeignFunction(ptr, returnType, types, async)
  }

  var self = this
    , numArgs = types.length
    , drefVal = ffi.derefValuePtrFunc(returnType)
    , result = new ffi.Pointer(ffi.sizeOf(returnType))
    , argsList = new ffi.Pointer(numArgs * POINTER_SIZE)
    , cif = new ffi.CIF(returnType, types)
    , caller = new ffi.Bindings.ForeignCaller(
        cif.getPointer()
      , ptr
      , argsList
      , result
      , async
    )

  // XXX: Can't remove or shit segsaults... WTF....
  this._ = cif

  // allocate a storage area for each argument,
  // then write the pointer to the argument list
  var argputf = types.map(function (type, i) {
    var argPtr = argsList.seek(i * POINTER_SIZE)

    if (ffi.isStructType(type)) {
      return function (val) {
        argPtr.putPointer(val.ref())
      }
    }

    var valPtr = new ffi.Pointer(ffi.sizeOf(type))
    argPtr.putPointer(valPtr)

    if (type == 'string') {
      return function (val) {
        var ptr = ffi.Pointer.NULL
        if (typeof val !== 'undefined' && val !== null) {
          var len = Buffer.byteLength(val, 'utf8')
          ptr = new ffi.Pointer(len+1)
          ptr.putCString(val)
        }
        valPtr.putPointer(ptr)
      }
    } else if (type == 'pointer') {
      // Bypass the struct check for non-struct types
      return function (val) {
        valPtr._putPointer(val)
      }
    } else {
      // Generic type putter function
      var putCall = 'put' + ffi.TYPE_TO_POINTER_METHOD_MAP[type]
      return function (val) {
        valPtr[putCall](val)
      }
    }
  })

  var proxy = function () {
    self // XXX: if this isn't in here, callbacks segfault. what.. the.. f?

    if (arguments.length !== numArgs) {
      throw new Error('Function arguments did not meet specification')
    }

    // write arguments to storage areas
    for (var i=0; i<numArgs; i++) {
      argputf[i](arguments[i])
    }

    var r = caller.exec()

    if (async) {
      var emitter = new EventEmitter()
      r.on('success', function () {
        emitter.emit('success', drefVal(result))
      })
      return emitter
    }

    return drefVal(result)
  }

  // Backwards compat
  // XXX: Remove soon...
  proxy.getFunction = function () { return this }

  return proxy
}
module.exports = ForeignFunction

/**
 * Deprecated. Just invoke ForeignFunction() instead.
 */

ForeignFunction.build = ForeignFunction

},{"./ffi":9,"__browserify_Buffer":90,"events":88}],11:[function(require,module,exports){
var process=require("__browserify_process");var ffi = require('./ffi')
  , EXT = ffi.PLATFORM_LIBRARY_EXTENSIONS[process.platform]
  , RTLD_NOW = ffi.DynamicLibrary.FLAGS.RTLD_NOW

/**
 * Provides a friendly abstraction/API on-top of DynamicLibrary and
 * ForeignFunction.
 */
function Library (libfile, funcs) {
  if (libfile && libfile.indexOf(EXT) === -1) {
    libfile += EXT
  }

  var lib = {}
    , dl = new ffi.DynamicLibrary(libfile || null, RTLD_NOW)

  if (funcs) {
    Object.keys(funcs).forEach(function (func) {
      var fptr = dl.get(func)
        , info = funcs[func]

      if (fptr.isNull()) {
        throw new Error('DynamicLibrary "'+libfile+'" returned NULL function pointer for "'+func+'"')
      }

      var resultType = info[0]
        , paramTypes = info[1]
        , fopts = info[2]
        , async = fopts ? fopts.async : false

      lib[func] = ffi.ForeignFunction(fptr, resultType, paramTypes, async)
    })
  }

  return lib
}
module.exports = Library

},{"./ffi":9,"__browserify_process":91}],12:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");var ffi = require('./ffi')
  , util = require('util')
  , Pointer = module.exports = ffi.Bindings.Pointer

/**
 * `attach()` is used for tracking dependencies among pointers to prevent
 * garbage collection.
 */

Pointer.prototype.attach = function attach (friend) {
  if (!Array.isArray(friend.__attached)) {
    friend.__attached = []
  }
  friend.__attached.push(this)
}

/**
 * Creates and returns a new Pointer that points to the same `address` as this
 * pointer. Usefor for when you want to use a pointer as in iterator, but still
 * want to retain this original pointer's address for use.
 *
 * The returned Pointer's `free` variable is set to `false` by default.
 *
 * @return {Pointer} A new Pointer independent of this one, but points to the same `address`.
 */

Pointer.prototype.clone = function clone () {
  return this.seek(0)
}

/**
 * This wraps _putPointer so it supports direct Struct writing.
 */

Pointer.prototype.putPointer = function putPointer (ptr, seek) {
  var p = ptr && 'pointer' in ptr ? ptr.pointer : ptr
  return this._putPointer(p, seek)
}

/**
 * Custom inspect() function for easier inspecting of Pointers in the REPL
 */

Pointer.prototype.inspect = function inspect (depth, hidden, colors) {
  return '<Pointer address="'
    + util.inspect(this.address, hidden, depth - 1, colors)
    +'" allocated="'
    + util.inspect(this.allocated, hidden, depth - 1, colors)
    +'" free="'
    + util.inspect(this.free, hidden, depth - 1, colors)
    +'">'
}

/**
 * Returns `true` if the given argument is a `Pointer` instance.
 * Returns `false` otherwise.
 *
 * @param {Object} p A pointer object (possibly...)
 * @return {Boolean} `true` if the object is a `Pointer` instance
 */

Pointer.isPointer = function isPointer (p) {
  return p instanceof Pointer
}

/**
 * Allocates a pointer big enough to fit *type* and *value*, writes the value,
 * and returns it.
 */

Pointer.alloc = function alloc (type, value) {
  var size = type == 'string'
           ? Buffer.byteLength(value, 'utf8') + 1
           : ffi.sizeOf(type)

  // malloc() the buffer
  var ptr = new Pointer(size)

  // write the value
  ptr['put' + ffi.TYPE_TO_POINTER_METHOD_MAP[type]](value)

  if (type == 'string') {
    // XXX: consider removing this string special case. it's dumb.
    // we have to actually build an "in-between" pointer for strings
    var dptr = new ffi.Pointer(ffi.Bindings.TYPE_SIZE_MAP.pointer)
    ptr.attach(dptr) // save it from garbage collection
    dptr.putPointer(ptr)
    return dptr
  }

  return ptr
}

/**
 * Appends the `NON_SPECIFIC_TYPES` to the `TYPE_TO_POINTER_METHOD_MAP` by
 * discovering the method suffix by type size.
 */

Object.keys(ffi.NON_SPECIFIC_TYPES).forEach(function (type) {
  var method = ffi.NON_SPECIFIC_TYPES[type]
    , suffix = ffi.TYPE_TO_POINTER_METHOD_MAP[type]

  if (!suffix) {
    // No hard mapping, determine by size
    var size = ffi.sizeOf(type)
      , szFunc = ffi.SIZE_TO_POINTER_METHOD_MAP[size]
      , signed = type !== 'byte' && type != 'size_t' && type[0] != 'u'
    suffix = (signed ? '' : 'U') + szFunc
  }

  ffi.TYPE_TO_POINTER_METHOD_MAP[type] = suffix

  Pointer.prototype['put' + method] = Pointer.prototype['put' + suffix]
  Pointer.prototype['get' + method] = Pointer.prototype['get' + suffix]
})

/**
 * Define the `NULL` pointer. Used internally in other parts of node-ffi.
 */

Pointer.NULL = new Pointer(0)

},{"./ffi":9,"__browserify_Buffer":90,"util":94}],13:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");var ffi = require('./ffi')

/**
 * An interface for modeling and instantiating C-style data structures. This is
 * not a constructor per-say, but a constructor generator. It takes an array of
 * tuples, the left side being the type, and the right side being a field name.
 * The order should be the same order it would appear in the C-style struct
 * definition. It returns a function that can be used to construct an object that
 * reads and writes to the data structure using properties specified by the
 * initial field list.
 *
 * Example:
 *
 *     var PasswordEntry = ffi.Struct(
 *         ['string', 'username']
 *       , ['string', 'password']
 *     )
 *     var pwd = new PasswordEntry()
 *     pwd.username = 'ricky'
 *     pwd.password = 'rbransonlovesnode.js'
 */

function Struct () {
  var struct = {}
    , fields = arguments

  // Legacy API, pass an Array of Arrays
  if (arguments.length > 0) {
    var firstArg = arguments[0]
    if (Array.isArray(firstArg) && firstArg.length > 0 && Array.isArray(firstArg[0])) {
      fields = firstArg
    }
  }

  struct.struct    = {}
  struct.members   = []
  struct.size      = 0
  struct.alignment = 0

  function read (ptr, name) {
    var info = struct.struct[name]
    var fptr = ptr.seek(info.offset)

    if (ffi.isStructType(info.type)) {
      return new info.type(fptr)
    } else if (info.type == 'string') {
      return fptr.getPointer().getCString()
    } else {
      return fptr['get' + ffi.TYPE_TO_POINTER_METHOD_MAP[info.type]]()
    }
  }

  function write (ptr, name, val) {
    var info = struct.struct[name]
    var fptr = ptr.seek(info.offset)

    if (ffi.isStructType(info.type)) {
      new info.type(fptr, val)
    } else if (info.type == 'string') {
      if (typeof val == 'undefined' || val === null) {
        return fptr.putPointer(ffi.Pointer.NULL)
      }
      var len = Buffer.byteLength(val, 'utf8')
      var strPtr = new ffi.Pointer(len+1)
      strPtr.putCString(val)
      fptr.putPointer(strPtr)
    } else {
      return fptr['put' + ffi.TYPE_TO_POINTER_METHOD_MAP[info.type]](val)
    }
  }

  // Read the fields list and apply all the fields to the struct
  for (var i=0, len=fields.length; i<len; i++) {
    var field   = fields[i]
      , type    = field[0]
      , name    = field[1]
    //console.log(name)

    if (name in struct.struct) {
      throw new Error('Error when constructing Struct: ' + name + ' field specified twice!')
    }

    var stype   = ffi.isStructType(type)
      , sz      = ffi.sizeOf(type)
      , asz     = stype ? type.__structInfo__.alignment : sz
    //console.log('  size:',sz)
    //console.log('  offset:', struct.size)
    //console.log('  asz:',asz)

    struct.alignment  = Math.max(struct.alignment, asz)

    var left = struct.size % struct.alignment
      , offset = struct.size

    if (sz > left) {
      offset += left
    }

    struct.size = offset + sz

    struct.struct[name] = {
        name: name
      , type: type
      , size: sz
      , offset: offset
    }
    struct.members.push(name)
  }
  //console.log('before left:', struct.size, struct.alignment)
  var left = struct.size % struct.alignment
  if (left) {
    struct.size += struct.alignment - left
  }
  //console.log('after left:', struct.size)

  var constructor = function (arg, data) {
    if (!(this instanceof constructor)) {
      return new constructor(arg, data)
    }
    if (ffi.Pointer.isPointer(arg)) {
      this.pointer = arg
      arg = data
    } else {
      this.pointer = new ffi.Pointer(struct.size)
    }
    if (arg) {
      for (var key in arg) {
        write(this.pointer, key, arg[key])
      }
    }
  }

  // Function to return an `FFI_TYPE` struct instance from this struct
  constructor._ffiType = function ffiType () {
    // return cached if available
    if (this._ffiTypeCached) {
      return this._ffiTypeCached
    }
    var props = this.__structInfo__.struct
      , propNames = Object.keys(props)
      , numProps = propNames.length
    var t = new ffi.FFI_TYPE()
    t.size = 0
    t.alignment = 0
    t.type = 13 // FFI_TYPE_STRUCT
    t.elements = new ffi.Pointer(ffi.Bindings.POINTER_SIZE * (numProps+1))
    var tptr = t.elements.clone()
    for (var i=0; i<numProps; i++) {
      var prop = props[propNames[i]]
      tptr.putPointer(ffi.ffiTypeFor(prop.type), true)
    }
    // Final NULL pointer to terminate the Array
    tptr.putPointer(ffi.Pointer.NULL)
    return this._ffiTypeCached = t
  }

  // Add getters & setters for each field to the constructor's prototype
  struct.members.forEach(function (field) {
    Object.defineProperty(constructor.prototype, field, {
        get: function () {
          return read(this.pointer, field)
        }
      , set: function (val) {
          write(this.pointer, field, val)
        }
      , enumerable: true
      , configurable: true
    })
  })

  constructor.prototype.__isStructInstance__ == true
  constructor.prototype.__structInfo__ = struct
  constructor.prototype.ref = function ref () {
    return this.pointer
  }

  constructor.__isStructType__ = true
  constructor.__structInfo__ = struct

  return constructor
}
module.exports = Struct

},{"./ffi":9,"__browserify_Buffer":90}],14:[function(require,module,exports){
var process=require("__browserify_process"),__filename="/../../node_modules/lapack/node_modules/node-ffi/node_modules/bindings/bindings.js";
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , join = path.join
  , dirname = path.dirname
  , exists = fs.existsSync || path.existsSync
  , defaults = {
        arrow: process.env.NODE_BINDINGS_ARROW || ' → '
      , compiled: process.env.NODE_BINDINGS_COMPILED_DIR || 'compiled'
      , platform: process.platform
      , arch: process.arch
      , version: process.versions.node
      , bindings: 'bindings.node'
      , try: [
          // node-gyp's linked version in the "build" dir
          [ 'module_root', 'build', 'bindings' ]
          // node-waf and gyp_addon (a.k.a node-gyp)
        , [ 'module_root', 'build', 'Debug', 'bindings' ]
        , [ 'module_root', 'build', 'Release', 'bindings' ]
          // Debug files, for development (legacy behavior, remove for node v0.9)
        , [ 'module_root', 'out', 'Debug', 'bindings' ]
        , [ 'module_root', 'Debug', 'bindings' ]
          // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        , [ 'module_root', 'out', 'Release', 'bindings' ]
        , [ 'module_root', 'Release', 'bindings' ]
          // Legacy from node-waf, node <= 0.4.x
        , [ 'module_root', 'build', 'default', 'bindings' ]
          // Production "Release" buildtype binary (meh...)
        , [ 'module_root', 'compiled', 'version', 'platform', 'arch', 'bindings' ]
        ]
    }

/**
 * The main `bindings()` function loads the compiled bindings for a given module.
 * It uses V8's Error API to determine the parent filename that this function is
 * being invoked from, which is then used to find the root directory.
 */

function bindings (opts) {

  // Argument surgery
  if (typeof opts == 'string') {
    opts = { bindings: opts }
  } else if (!opts) {
    opts = {}
  }
  opts.__proto__ = defaults

  // Get the module root
  if (!opts.module_root) {
    opts.module_root = exports.getRoot(exports.getFileName())
  }

  // Ensure the given bindings name ends with .node
  if (path.extname(opts.bindings) != '.node') {
    opts.bindings += '.node'
  }

  var tries = []
    , i = 0
    , l = opts.try.length
    , n
    , b
    , err

  for (; i<l; i++) {
    n = join.apply(null, opts.try[i].map(function (p) {
      return opts[p] || p
    }))
    tries.push(n)
    try {
      b = opts.path ? require.resolve(n) : require(n)
      if (!opts.path) {
        b.path = n
      }
      return b
    } catch (e) {
      if (!/not find/i.test(e.message)) {
        throw e
      }
    }
  }

  err = new Error('Could not locate the bindings file. Tried:\n'
    + tries.map(function (a) { return opts.arrow + a }).join('\n'))
  err.tries = tries
  throw err
}
module.exports = exports = bindings


/**
 * Gets the filename of the JavaScript file that invokes this function.
 * Used to help find the root directory of a module.
 */

exports.getFileName = function getFileName () {
  var origPST = Error.prepareStackTrace
    , origSTL = Error.stackTraceLimit
    , dummy = {}
    , fileName

  Error.stackTraceLimit = 10

  Error.prepareStackTrace = function (e, st) {
    for (var i=0, l=st.length; i<l; i++) {
      fileName = st[i].getFileName()
      if (fileName !== __filename) {
        return
      }
    }
  }

  // run the 'prepareStackTrace' function above
  Error.captureStackTrace(dummy)
  dummy.stack

  // cleanup
  Error.prepareStackTrace = origPST
  Error.stackTraceLimit = origSTL

  return fileName
}

/**
 * Gets the root directory of a module, given an arbitrary filename
 * somewhere in the module tree. The "root directory" is the directory
 * containing the `package.json` file.
 *
 *   In:  /home/nate/node-native-module/lib/index.js
 *   Out: /home/nate/node-native-module
 */

exports.getRoot = function getRoot (file) {
  var dir = dirname(file)
    , prev
  while (true) {
    if (dir === '.') {
      // Avoids an infinite loop in rare cases, like the REPL
      dir = process.cwd()
    }
    if (exists(join(dir, 'package.json')) || exists(join(dir, 'node_modules'))) {
      // Found the 'package.json' file or 'node_modules' dir; we're done
      return dir
    }
    if (prev === dir) {
      // Got to the top
      throw new Error('Could not find module root given file: "' + file
                    + '". Do you have a `package.json` file? ')
    }
    // Try the parent dir next
    prev = dir
    dir = join(dir, '..')
  }
}

},{"__browserify_process":91,"fs":87,"path":92}],15:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._;

/*
 Sentences Analizer Class
 From http://www.writingcentre.uottawa.ca/hypergrammar/sntpurps.html

 Take a POS input and analyse it for
  - Type of Sentense
     - Interrogative
       - Tag Questions
       - 
     - Declarative
     - Exclamatory 
     - Imperative

  - Parts of a Sentense
     - Subject
     - Predicate

  - Show Preposition Phrases
*/

var Sentences = function(pos, callback) {
    this.posObj = pos;
    this.senType = null;
    callback(this);
}

Sentences.prototype.part = function(callback) {
    var subject = [],
	predicat = [],
	verbFound = false;
	
    this.prepositionPhrases();
	
    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos == "VB") {
            if (i === 0) {
                verbFound = true;
            } else {
                // We need to Test for any EX before the VB
                if (this.posObj.tags[i - 1].pos != "EX") {
                    verbFound = true;
                } else {
                    predicat.push(this.posObj.tags[i].token);
                }					
            }
        }

        // Add Pronoun Phrase (pp) Or Subject Phrase (sp)
        if (!verbFound) {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "SP";
            
            subject.push(this.posObj.tags[i].token);
        } else {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "PP";
            
            predicat.push(this.posObj.tags[i].token)
        }
    }
	
    if (subject.length == 0) {
	this.posObj.tags.push({token:"You",spos:"SP",pos:"PRP",added:true});
    }
    
    callback(this);	
}

// Takes POS and removes IN to NN or NNS
// Adds a PP for each prepositionPhrases
Sentences.prototype.prepositionPhrases = function() {
    var remove = false;

    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos.match("IN")) {
            remove = true;
        }
    
        if (remove) {
            this.posObj.tags[i].pp = true;
        }
    
        if (this.posObj.tags[i].pos.match("NN")) {
            remove = false;
        }
    }	
}

Sentences.prototype.subjectToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "SP" || t.spos == "S" ) return t.token }).join(' ');
}

Sentences.prototype.predicateToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "PP" || t.spos == "P" ) return t.token }).join(' ');
}

Sentences.prototype.implicitYou = function() {
    for (var i = 0; i < this.posObj.tags.length;i++) {
        if (this.posObj.tags[i].added) {
            return true;
        }
    }
    
    return false;
}

Sentences.prototype.toString = function() {
    return this.posObj.tags.map(function(t){return t.token}).join(' ');
}

// This is quick and incomplete.
Sentences.prototype.type = function(callback) {
    var callback = callback || false;
	
    // FIXME - punct seems useless
    var lastElement = this.posObj.punct();
    lastElement = (lastElement.length != 0) ? lastElement.pop() : this.posObj.tags.pop();
	
    if (lastElement.pos !== ".") {
        if (this.implicitYou()) {
            this.senType = "COMMAND";
        } else if (_(["WDT","WP","WP$","WRB"]).contains(this.posObj.tags[0].pos)) {
            // Sentences that start with: who, what where when why and how, then they are questions
            this.senType = "INTERROGATIVE";
        } else if (_(["PRP"]).contains(lastElement.pos)) {
            // Sentences that end in a Personal pronoun are most likely questions
            // eg. We should run away, should we [?]
            // eg. You want to see that again, do you [?]
            this.senType = "INTERROGATIVE";
        } else {
            this.senType = "UNKNOWN";
        }
            
    } else {
        switch(lastElement.token) {
            case "?": this.senType = "INTERROGATIVE"; break;
            case "!": this.senType = (this.implicitYou()) ? "COMMAND":"EXCLAMATORY"; break;
            case ".": this.senType = (this.implicitYou()) ? "COMMAND":"DECLARATIVE";	break;
        }
    }
    
    if (callback && _(callback).isFunction()) {
        callback(this);
    } else {
        return this.senType;
    }
}

module.exports = Sentences;

},{"underscore":85}],16:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PorterStemmer = require('../stemmers/porter_stemmer'),
util = require('util'),
Classifier = require('./classifier'),
ApparatusBayesClassifier = require('apparatus').BayesClassifier;

var BayesClassifier = function(stemmer) {
    Classifier.call(this, new ApparatusBayesClassifier(), stemmer);
};

util.inherits(BayesClassifier, Classifier);

function restore(classifier, stemmer) {
    classifier = Classifier.restore(classifier, stemmer);
    classifier.__proto__ = BayesClassifier.prototype;
    classifier.classifier = ApparatusBayesClassifier.restore(classifier.classifier);

    return classifier;
}

function load(filename, stemmer, callback) {
    Classifier.load(filename, function(err, classifier) {
        callback(err, restore(classifier, stemmer));
    });
}

BayesClassifier.restore = restore;
BayesClassifier.load = load;

module.exports = BayesClassifier;

},{"../stemmers/porter_stemmer":40,"./classifier":17,"apparatus":77,"util":94}],17:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PorterStemmer = require('../stemmers/porter_stemmer'),
util = require('util');

var Classifier = function(classifier, stemmer) {
    this.classifier = classifier;
    this.docs = [];
    this.features = {};
    this.stemmer = stemmer || PorterStemmer;
    this.lastAdded = 0;
};

function addDocument(text, classification) {
    if(typeof text === 'string')
	text = this.stemmer.tokenizeAndStem(text);

    if(text.length === 0) {
        // ignore empty documents
        return;
    }

    this.docs.push({
	label: classification,
	text: text
    });

    for(var i = 0; i < text.length; i++) {
	this.features[text[i]] = 1;
    }
}

function removeDocument(text, classification) {
  var docs = this.docs
    , doc
    , pos;

  if (typeof text === 'string') {
    text = this.stemmer.tokenizeAndStem(text);
  }

  for (var i = 0, ii = docs.length; i < ii; i++) {
    doc = docs[i];
    if (doc.text.join(' ') == text.join(' ') &&
        doc.label == classification) {
      pos = i;
    }
  }

  // Remove if there's a match
  if (!isNaN(pos)) {
    this.docs.splice(pos, 1);

    for (var i = 0, ii = text.length; i < ii; i++) {
      delete this.features[text[i]];
    }
  }
}

function textToFeatures(observation) {
    var features = [];

    if(typeof observation === 'string')
	observation = this.stemmer.tokenizeAndStem(observation);

    for(var feature in this.features) {
        if(observation.indexOf(feature) > -1)
            features.push(1);
        else
            features.push(0);
    }

    return features;
}

function train() {
    for(var i = this.lastAdded; i < this.docs.length; i++) {
	var features = this.textToFeatures(this.docs[i].text);
	this.classifier.addExample(features, this.docs[i].label);	  
	this.lastAdded++;
    }

    this.classifier.train();
}

function retrain() {
  this.classifier = new (this.classifier.constructor)();
  this.lastAdded = 0;
  this.train();
}

function getClassifications(observation) {
    return this.classifier.getClassifications(this.textToFeatures(observation));
}

function classify(observation) {
    return this.classifier.classify(this.textToFeatures(observation));
}

function restore(classifier, stemmer) {
    classifier.stemmer = stemmer || PorterStemmer;
    return classifier;
}

function save(filename, callback) {
    var data = JSON.stringify(this);
    var fs = require('fs');
    var classifier = this;
    fs.writeFile(filename, data, 'utf8', function(err) {
        if(callback) {
            callback(err, err ? null : classifier);
        }
    });
}

function load(filename, callback) {
    var fs = require('fs');

    fs.readFile(filename, 'utf8', function(err, data) {
        var classifier;
          
        if(!err) {
            classifier = JSON.parse(data);
        }

        if(callback)
            callback(err, classifier);
    });
}

Classifier.prototype.addDocument = addDocument;
Classifier.prototype.removeDocument = removeDocument;
Classifier.prototype.train = train;
Classifier.prototype.retrain = retrain;
Classifier.prototype.classify = classify;
Classifier.prototype.textToFeatures = textToFeatures;
Classifier.prototype.save = save;
Classifier.prototype.getClassifications = getClassifications;
Classifier.restore = restore;
Classifier.load = load;

module.exports = Classifier;

},{"../stemmers/porter_stemmer":40,"fs":87,"util":94}],18:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PorterStemmer = require('../stemmers/porter_stemmer'),
util = require('util'),
Classifier = require('./classifier'),
ApparatusLogisticRegressionClassifier = require('apparatus').LogisticRegressionClassifier;

var LogisticRegressionClassifier = function(stemmer) {
    Classifier.call(this, new ApparatusLogisticRegressionClassifier(), stemmer);
};

util.inherits(LogisticRegressionClassifier, Classifier);

function restore(classifier, stemmer) {
    classifier = Classifier.restore(classifier, stemmer);
    classifier.__proto__ = LogisticRegressionClassifier.prototype;
    classifier.classifier = ApparatusLogisticRegressionClassifier.restore(classifier.classifier);

    return classifier;
}

function load(filename, stemmer, callback) {
    Classifier.load(filename, function(err, classifier) {
        callback(err, restore(classifier, stemmer));
    });
}

function train() {
    // we need to reset the traning state because logistic regression
    // needs its matricies to have their widths synced, etc.
    this.lastAdded = 0;
    this.classifier = new ApparatusLogisticRegressionClassifier();
    Classifier.prototype.train.call(this);
}

LogisticRegressionClassifier.prototype.train = train;
LogisticRegressionClassifier.restore = restore;
LogisticRegressionClassifier.load = load;

module.exports = LogisticRegressionClassifier;

},{"../stemmers/porter_stemmer":40,"./classifier":17,"apparatus":77,"util":94}],19:[function(require,module,exports){
/*
Copyright (c) 2011, John Crepezzi, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Get all of the pairs of letters for a string
var letterPairs = function (str) {
  var numPairs = str.length - 1;
  var pairs = new Array(numPairs);
  for (var i = 0; i < numPairs; i++) {
    pairs[i] = str.substring(i, i + 2);
  }
  return pairs;
};

// Get all of the pairs in all of the words for a string
var wordLetterPairs = function (str) {
  var allPairs = [], pairs;
  var words = str.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    pairs = letterPairs(words[i]);
    allPairs.push.apply(allPairs, pairs);
  }
  return allPairs;
};

// Perform some sanitization steps
var sanitize = function (str) {
  return str.toLowerCase().replace(/^\s+|\s+$/g, '');
};

// Compare two strings, and spit out a number from 0-1
var compare = function (str1, str2) {
  var pairs1 = wordLetterPairs(sanitize(str1));
  var pairs2 = wordLetterPairs(sanitize(str2));
  var intersection = 0, union = pairs1.length + pairs2.length;
  var i, j, pair1, pair2;
  for (i = 0; i < pairs1.length; i++) {
    pair1 = pairs1[i];
    for (j = 0; j < pairs2.length; j++) {
      pair2 = pairs2[j];
      if (pair1 == pair2) {
        intersection ++;
        delete pairs2[j];
        break;
      }
    }
  }
  return 2 * intersection / union;
};

module.exports = compare;

},{}],20:[function(require,module,exports){
/*
Copyright (c) 2012, Adam Phillabaum, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

Unless otherwise stated by a specific section of code

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Computes the Jaro distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
function distance(s1, s2) {
    if (typeof(s1) != "string" || typeof(s2) != "string") return 0;
    if (s1.length == 0 || s2.length == 0) 
        return 0;
    s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
    var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
    var matches1 = new Array(s1.length);
    var matches2 = new Array(s2.length);
    var m = 0; // number of matches
    var t = 0; // number of transpositions

    //debug helpers
    //console.log("s1: " + s1 + "; s2: " + s2);
    //console.log(" - matchWindow: " + matchWindow);

    // find matches
    for (var i = 0; i < s1.length; i++) {
	var matched = false;

	// check for an exact match
	if (s1[i] ==  s2[i]) {
		matches1[i] = matches2[i] = matched = true;
		m++
	}

	// check the "match window"
	else {
        	// this for loop is a little brutal
        	for (k = (i <= matchWindow) ? 0 : i - matchWindow;
        		(k <= i + matchWindow) && k < s2.length && !matched;
			k++) {
            		if (s1[i] == s2[k]) {
                		if(!matches1[i] && !matches2[k]) {
                	    		m++;
               		}

        	        matches1[i] = matches2[k] = matched = true;
        	    }
        	}
	}
    }

    if(m == 0)
        return 0.0;

    // count transpositions
    var k = 0;

    for(var i = 0; i < s1.length; i++) {
    	if(matches1[k]) {
    	    while(!matches2[k] && k < matches2.length)
                k++;
	        if(s1[i] != s2[k] &&  k < matches2.length)  {
                t++;
            }

    	    k++;
    	}
    }
    
    //debug helpers:
    //console.log(" - matches: " + m);
    //console.log(" - transpositions: " + t);
    t = t / 2.0;
    return (m / s1.length + m / s2.length + (m - t) / m) / 3;
}

// Computes the Winkler distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
// dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
function JaroWinklerDistance(s1, s2, dj) {
    var jaro;
    (typeof(dj) == 'undefined')? jaro = distance(s1,s2) : jaro = dj;
    var p = 0.1; //
    var l = 0 // length of the matching prefix
    while(s1[l] == s2[l] && l < 4)
        l++;
    
    return jaro + l * p * (1 - jaro);
}
module.exports = JaroWinklerDistance;

},{}],21:[function(require,module,exports){
/*
Copyright (c) 2012, Sid Nallu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * contribution by sidred123
 */

/*
 * Compute the Levenshtein distance between two strings.
 * Algorithm based from Speech and Language Processing - Daniel Jurafsky and James H. Martin.
 */

function LevenshteinDistance (source, target, options) {
    options = options || {};
    if(isNaN(options.insertion_cost)) options.insertion_cost = 1;
    if(isNaN(options.deletion_cost)) options.deletion_cost = 1;
    if(isNaN(options.substitution_cost)) options.substitution_cost = 1;

    var sourceLength = source.length;
    var targetLength = target.length;
    var distanceMatrix = [[0]];

    for (var row =  1; row <= sourceLength; row++) {
        distanceMatrix[row] = [];
        distanceMatrix[row][0] = distanceMatrix[row-1][0] + options.deletion_cost;
    }

    for (var column = 1; column <= targetLength; column++) {
        distanceMatrix[0][column] = distanceMatrix[0][column-1] + options.insertion_cost;
    }

    for (var row = 1; row <= sourceLength; row++) {
        for (var column = 1; column <= targetLength; column++) {
            var costToInsert = distanceMatrix[row][column-1] + options.insertion_cost;
            var costToDelete = distanceMatrix[row-1][column] + options.deletion_cost;

            var sourceElement = source[row-1];
            var targetElement = target[column-1];
            var costToSubstitute = distanceMatrix[row-1][column-1];
            if (sourceElement !== targetElement) {
                costToSubstitute = costToSubstitute + options.substitution_cost;
            }
            distanceMatrix[row][column] = Math.min(costToInsert, costToDelete, costToSubstitute);
        }
    }
    return distanceMatrix[sourceLength][targetLength];
}

module.exports = LevenshteinDistance;

},{}],22:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

exports.SoundEx = require('./phonetics/soundex');
exports.Metaphone = require('./phonetics/metaphone');
exports.DoubleMetaphone = require('./phonetics/double_metaphone');
exports.SoundExDM = require('./phonetics/dm_soundex');
exports.PorterStemmer = require('./stemmers/porter_stemmer');
exports.PorterStemmerFa = require('./stemmers/porter_stemmer_fa');
exports.PorterStemmerRu = require('./stemmers/porter_stemmer_ru');
exports.PorterStemmerEs = require('./stemmers/porter_stemmer_es');
exports.PorterStemmerIt = require('./stemmers/porter_stemmer_it');
exports.LancasterStemmer = require('./stemmers/lancaster_stemmer');
exports.StemmerJa = require('./stemmers/stemmer_ja');
exports.AggressiveTokenizerFa = require('./tokenizers/aggressive_tokenizer_fa');
exports.AggressiveTokenizerRu = require('./tokenizers/aggressive_tokenizer_ru');
exports.AggressiveTokenizerEs = require('./tokenizers/aggressive_tokenizer_es');
exports.AggressiveTokenizerIt = require('./tokenizers/aggressive_tokenizer_it');
exports.AggressiveTokenizer = require('./tokenizers/aggressive_tokenizer');
exports.RegexpTokenizer = require('./tokenizers/regexp_tokenizer').RegexpTokenizer;
exports.WordTokenizer = require('./tokenizers/regexp_tokenizer').WordTokenizer;
exports.WordPunctTokenizer = require('./tokenizers/regexp_tokenizer').WordPunctTokenizer;
exports.TreebankWordTokenizer = require('./tokenizers/treebank_word_tokenizer');
exports.TokenizerJa = require('./tokenizers/tokenizer_ja');
exports.BayesClassifier = require('./classifiers/bayes_classifier');
exports.LogisticRegressionClassifier = require('./classifiers/logistic_regression_classifier');
exports.NounInflector = require('./inflectors/noun_inflector');
exports.NounInflectorFr = require('./inflectors/fr/noun_inflector');
exports.NounInflectorJa = require('./inflectors/ja/noun_inflector');
exports.PresentVerbInflector = require('./inflectors/present_verb_inflector');
exports.CountInflector = require('./inflectors/count_inflector');
exports.WordNet = require('./wordnet/wordnet');
exports.TfIdf = require('./tfidf/tfidf');
exports.SentenceAnalyzer = require('./analyzers/sentence_analyzer');
exports.stopwords = require('./util/stopwords').words;
exports.NGrams = require('./ngrams/ngrams');
exports.JaroWinklerDistance = require('./distance/jaro-winkler_distance');
exports.LevenshteinDistance = require('./distance/levenshtein_distance');
exports.DiceCoefficient = require('./distance/dice_coefficient');
exports.normalize_ja = require('./normalizers/normalizer_ja').normalize_ja;
exports.removeDiacritics = require('./normalizers/remove_diacritics');
exports.transliterate_ja = require('./transliterators/ja');

},{"./analyzers/sentence_analyzer":15,"./classifiers/bayes_classifier":16,"./classifiers/logistic_regression_classifier":18,"./distance/dice_coefficient":19,"./distance/jaro-winkler_distance":20,"./distance/levenshtein_distance":21,"./inflectors/count_inflector":23,"./inflectors/fr/noun_inflector":25,"./inflectors/ja/noun_inflector":26,"./inflectors/noun_inflector":27,"./inflectors/present_verb_inflector":28,"./ngrams/ngrams":30,"./normalizers/normalizer_ja":31,"./normalizers/remove_diacritics":32,"./phonetics/dm_soundex":33,"./phonetics/double_metaphone":34,"./phonetics/metaphone":35,"./phonetics/soundex":37,"./stemmers/lancaster_stemmer":39,"./stemmers/porter_stemmer":40,"./stemmers/porter_stemmer_es":41,"./stemmers/porter_stemmer_fa":42,"./stemmers/porter_stemmer_it":43,"./stemmers/porter_stemmer_ru":44,"./stemmers/stemmer_ja":49,"./tfidf/tfidf":51,"./tokenizers/aggressive_tokenizer":52,"./tokenizers/aggressive_tokenizer_es":53,"./tokenizers/aggressive_tokenizer_fa":54,"./tokenizers/aggressive_tokenizer_it":55,"./tokenizers/aggressive_tokenizer_ru":56,"./tokenizers/regexp_tokenizer":57,"./tokenizers/tokenizer_ja":59,"./tokenizers/treebank_word_tokenizer":60,"./transliterators/ja":61,"./util/stopwords":62,"./wordnet/wordnet":71}],23:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

function nthForm(i) {
    var teenth = (i % 100);

    if(teenth > 10 && teenth < 14)
        return 'th';
    else {
        switch(i % 10) {
            case 1:
                return 'st';
                break;
            case 2:
                return 'nd';
                break;            
            case 3:
                return 'rd';
                break;
            default:
                return 'th';
        }
    }
}

function nth(i) {
    return i.toString() + nthForm(i);
}

var CountInflector = function() {
};

CountInflector.nth = nth;

module.exports = CountInflector;

},{}],24:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var FormSet = function() {
    this.regularForms = [];
    this.irregularForms = {};
}

module.exports = FormSet;

},{}],25:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A noun inflector for French.
 * Compiled from:
 * \@see http://fr.wiktionary.org/wiki/Annexe:Pluriels_irr%C3%A9guliers_en_fran%C3%A7ais
 * \@see http://fr.wikipedia.org/wiki/Pluriels_irr%C3%A9guliers_en_fran%C3%A7ais
 *
 * \@todo Take compounded noun into account (eaux-fortes, pique-nique...).
 * \@todo General note: French also requires AdjectiveInflector (femininize...).
 */

var SingularPluralInflector = require('../singular_plural_inflector'),
    util = require('util'),
    FormSet = require('../form_set');

function attach() {
  var inflector = this;

  String.prototype.singularizeNoun = function() {
    return inflector.singularize(this);
  };

  String.prototype.pluralizeNoun = function() {
    return inflector.pluralize(this);
  };
}



/**
 * @constructor
 */
var NounInflector = function() {
  // Ambiguous a.k.a. invariant.
  // \@todo Expand this list to be as comprehensive as possible.
  this.ambiguous = [
    // Nouns ending by -s
    'à-peu-près', 'à-propos', 'abattis', 'abcès', 'abois', 'abribus', 'abus',
    'accès', 'acquis', 'adénovirus', 'adonis', 'ados', 'agrès', 'aguets',
    'ailleurs', 'ais', 'albatros', 'albinos', 'alias', 'aloès', 'amaryllis',
    'amas', 'ampélopsis', 'ananas', 'anchois', 'angélus', 'anis', 'anticorps',
    'antihéros', 'antirides', 'anus', 'appas', 'appentis', 'appui-bras',
    'appuie-bras', 'arcanes', 'argus', 'arrérages', 'arrière-pays', 'as',
    'ascaris', 'asparagus', 'atlas', 'atours', 'aurochs', 'autobus',
    'autofocus', 'avant-bras', 'avant-corps', 'avant-propos', 'avers', 'avis',
    'axis', 'barbouillis', 'bas', 'beaujolais', 'beaux-arts', 'biais',
    'bibliobus', 'biceps', 'bicross', 'bien-fonds', 'bloc-notes', 'blockhaus',
    'blocus', 'blues', 'bois', 'bonus', 'bout-dehors', 'bouts-rimés',
    'branle-bas', 'bras', 'brebis', 'bris', 'brise-lames', 'brise-mottes',
    'brûlis', 'buis', 'burnous', 'bus', 'business', 'cabas', 'cacatoès',
    'cacatois', 'cactus', 'cadenas', 'cafouillis', 'caillebotis', 'calvados',
    'cambouis', 'campus', 'canevas', 'cannabis', 'carquois', 'cas',
    'casse-noisettes', 'casse-pieds', 'cassis', 'caucus', 'cens', 'cervelas',
    'chablis', 'chamois', 'chaos', 'chas', 'chasselas', 'châssis',
    'chatouillis', 'chauffe-assiettes', 'chauve-souris', 'chorus', 'choucas',
    'circoncis', 'cirrus', 'clafoutis', 'clapotis', 'cliquetis', 'clos',
    'cochylis', 'colis', 'coloris', 'commis', 'compas', 'compromis',
    'compte-chèques', 'compte-gouttes', 'compte-tours', 'concours', 'confins',
    'congrès', 'consensus', 'contrepoids', 'contresens', 'contretemps',
    'corn flakes', 'corps', 'corps-à-corps', 'corpus', 'cosinus', 'cosmos',
    'coulis', 'coupe-ongles', 'cours', 'court-jus', 'couscous', 'coutelas',
    'crocus', 'croquis', 'cross', 'cubitus', 'cumulus', 'cure-dents',
    'cure-ongles', 'cure-pipes', 'cursus', 'cyclo-cross', 'cyprès', 'dais',
    'damas', 'débarras', 'débours', 'débris', 'décès', 'dedans', 'dehors',
    'delirium tremens', 'demi-gros', 'dépens', 'dessous', 'dessus', 'détritus',
    'deux-mâts', 'deux-pièces', 'deux-points', 'deux-roues', 'deux-temps',
    'dévers', 'devis', 'diplodocus', 'discours', 'dos', 'ébats', 'éboulis',
    'échalas', 'edelweiss', 'élaeis', 'éleis', 'éléphantiasis', 'embarras',
    'empois', 'en-cas', 'encens', 'enclos', 'endos', 'engrais', 'entrelacs',
    'entremets', 'envers', 'épluche-légumes', 'ers', 'espace-temps',
    'essuie-mains', 'eucalyptus', 'ex-libris', 'excès', 'express', 'extrados',
    'faciès', 'fait-divers', 'fatras', 'faux-sens', 'favoris', 'ficus',
    'fier-à-bras', 'finnois', 'florès', 'focus', 'fœtus', 'fois', 'forceps',
    'fouillis', 'fracas', 'frais', 'français', 'franglais', 'frimas',
    'friselis', 'frisottis', 'froncis', 'frottis', 'fucus', 'gâchis', 'galetas',
    'galimatias', 'garde-à-vous', 'garde-corps', 'gargouillis', 'gars',
    'gâte-bois', 'gazouillis', 'génois', 'gibus', 'glacis', 'glas', 'gneiss',
    'gobe-mouches', 'grès', 'gribouillis', 'guet-apens', 'habeas corpus',
    'hachis', 'haras', 'hardes', 'harnais', 'haut-le-corps', 'hautbois',
    'herbe-aux-chats', 'héros', 'herpès', 'hiatus', 'hibiscus', 'hors-concours',
    'hors-pistes', 'hourdis', 'huis-clos', 'humérus', 'humus', 'ibis', 'iléus',
    'indique-fuites', 'infarctus', 'inlandsis', 'insuccès', 'intercours',
    'intrados', 'intrus', 'iris', 'isatis', 'jais', 'jars', 'jeans',
    'jeuconcours', 'judas', 'juliénas', 'jus', 'justaucorps', 'kakatoès',
    'kermès', 'kriss', 'lacis', 'laïus', 'lambris', 'lapis', 'laps', 'lapsus',
    'laquais', 'las', 'lattis', 'lave-mains', 'lavis', 'lèche-bottes',
    'lèche-vitrines', 'legs', 'lias', 'liégeois', 'lilas', 'lis', 'lœss',
    'logis', 'loris', 'lotus', 'louis', 'lupus', 'lys', 'mâchicoulis', 'madras',
    'maïs', 'malappris', 'malus', 'mânes', 'maquis', 'marais', 'maroilles',
    'marquis', 'mas', 'mass-médias', 'matelas', 'matois', 'médius', 'mépris',
    'mérinos', 'mess', 'mets', 'mi-bas', 'micro-ondes', 'mille-pattes',
    'millepertuis', 'minibus', 'minois', 'minus', 'mirabilis', 'mois',
    'monocorps', 'monte-plats', 'mors', 'motocross', 'mots-croisés', 'motus',
    'mouchetis', 'mucus', 'myosotis', 'nævus', 'négus', 'niais',
    'nimbo-stratus', 'nimbus', 'norois', 'nounours', 'nu-pieds', 'oasis',
    'obus', 'olibrius', 'omnibus', 'opus', 'os', 'ours', 'ouvre-boîtes',
    'ouvre-bouteilles', 'palais', 'palis', 'palmarès', 'palus', 'panais',
    'panaris', 'pancréas', 'papyrus', 'par-dehors', 'paradis', 'parcours',
    'pardessus', 'pare-balles', 'pare-chocs', 'parvis', 'pas', 'passe-temps',
    'pataquès', 'pathos', 'patois', 'pavois', 'pays', 'permis',
    'petit-bourgeois', 'petit-gris', 'petit-pois', 'phallus', 'phimosis',
    'pickles', 'pilotis', 'pique-fleurs', 'pis', 'pithiviers', 'pityriasis',
    'plateau-repas', 'plâtras', 'plein-temps', 'plexiglas', 'plexus', 'plus',
    'poids', 'pois', 'pont-levis', 'porte-avions', 'porte-bagages',
    'porte-billets', 'porte-bouteilles', 'porte-clés', 'porte-hélicoptères',
    'porte-jarretelles', 'porte-revues', 'pouls', 'préavis', 'presse-fruits',
    'presse-papiers', 'princeps', 'printemps', 'procès', 'processus', 'progrès',
    'propos', 'prospectus', 'protège-dents', 'psoriasis', 'pubis', 'puits',
    'pus', 'putois', 'quatre-épices', 'quatre-feuilles', 'quatre-heures',
    'quatre-mâts', 'quatre-quarts', 'quatre-temps', 'quitus', 'rabais',
    'rachis', 'radis', 'radius', 'raïs', 'ramassis', 'rébus', 'reclus',
    'recours', 'refus', 'relais', 'remords', 'remous', 'remue-méninges',
    'rendez-vous', 'repas', 'répons', 'repos', 'repris', 'reps', 'rétrovirus',
    'revers', 'rhinocéros', 'rictus', 'rince-doigts', 'ris', 'rollmops',
    'rosé-des-prés', 'roulis', 'rubis', 'salmigondis', 'salsifis', 'sans-logis',
    'sas', 'sassafras', 'sauternes', 'schnaps', 'schuss', 'secours', 'semis',
    'sens', 'serre-fils', 'serre-livres', 'sévices', 'sinus', 'skunks',
    'souris', 'sournois', 'sous-bois', 'stradivarius', 'stras', 'strass',
    'strato-cumulus', 'stratus', 'stress', 'succès', 'surdos', 'surplus',
    'surpoids', 'sursis', 'suspens', 'synopsis', 'syphilis', 'taffetas',
    'taillis', 'talus', 'tamaris', 'tamis', 'tapis', 'tas', 'taudis', 'temps',
    'tennis', 'terminus', 'terre-neuvas', 'tétanos', 'tétras', 'thalamus',
    'thermos', 'thesaurus', 'thésaurus', 'thymus', 'tire-fesses', 'tonus',
    'torchis', 'torticolis', 'tournedos', 'tournevis', 'tournis', 'tracas',
    'traîne-savates', 'travers', 'tréfonds', 'treillis', 'trépas', 'trias',
    'triceps', 'trichomonas', 'trois-étoiles', 'trois-mâts', 'trois-quarts',
    'trolleybus', 'tumulus', 'typhus', 'univers', 'us', 'utérus', 'vasistas',
    'vélocross', 'velours', 'verglas', 'verjus', 'vernis', 'vers',
    'vert-de-gris', 'vide-ordures', 'vide-poches', 'villageois', 'virus',
    'vis-à-vis', 'volubilis', 'vulgum pecus', 'waters', 'williams', 'xérès',

    // Nouns ending by -x
    'abat-voix', 'afflux', 'alpax', 'anthrax', 'apex', 'aptéryx',
    'archéoptéryx', 'arrière-faix', 'bombyx', 'borax', 'bordeaux', 'bouseux',
    'box', 'carex', 'casse-noix', 'cedex', 'céphalothorax', 'cérambyx', 'chaux',
    'choix', 'coccyx', 'codex', 'contumax', 'coqueleux', 'cortex', 'courroux',
    'croix', 'crucifix', 'culex', 'demodex', 'duplex', 'entre-deux', 'époux',
    'équivaux', 'eux', 'ex', 'faix', 'faucheux', 'faux', 'fax', 'ferreux',
    'flux', 'fox', 'freux', 'furax', 'hapax', 'harengueux', 'hélix',
    'horse-pox', 'houx', 'index', 'influx', 'inox', 'juke-box', 'kleenex',
    'lagothrix', 'larynx', 'lastex', 'latex', 'lux', 'lynx', 'macareux', 'max',
    'mésothorax', 'mi-voix', 'mirepoix', 'motteux', 'multiplex', 'murex',
    'narthex', 'noix', 'onyx', 'opopanax', 'oropharynx', 'paix', 'panax',
    'perdrix', 'pharynx', 'phénix', 'phlox', 'phoenix', 'pneumothorax', 'poix',
    'portefaix', 'pousse-cailloux', 'preux', 'prix', 'prothorax', 'pucheux',
    'pyrex', 'pyroligneux', 'quadruplex', 'queux', 'redoux', 'reflex', 'reflux',
    'relax', 'rhinopharynx', 'rose-croix', 'rouvieux', 'roux', 'rumex',
    'saindoux', 'sardonyx', 'scolex', 'sèche-cheveux', 'silex', 'simplex',
    'sioux', 'sirex', 'smilax', 'solex', 'songe-creux', 'spalax', 'sphex',
    'sphinx', 'storax', 'strix', 'styrax', 'surfaix', 'surtaux', 'syrinx',
    'tamarix', 'taux', 'télex', 'thorax', 'tord-boyaux', 'toux', 'trionyx',
    'tripoux', 'tubifex', 'vertex', 'vidéotex', 'vielleux', 'vieux',
    'violoneux', 'voix', 'volvox', 'vortex',

    // Nouns ending by -z
    'allume-gaz', 'assez', 'biogaz', 'cache-nez', 'camping-gaz', 'chez',
    'chintz', 'ersatz', 'fez', 'free-jazz', 'fritz', 'gaz', 'gin-fizz', 'hertz',
    'jazz', 'jerez', 'kibboutz', 'kilohertz', 'kolkhoz', 'kronprinz', 'lapiaz',
    'lez', 'mégahertz', 'merguez', 'nez', 'pince-nez', 'quartz', 'quiz', 'ranz',
    'raz', 'recez', 'rémiz', 'rez', 'riz', 'ruolz', 'seltz', 'serre-nez'
  ];

  this.customPluralForms = [];
  this.customSingularForms = [];
  this.singularForms = new FormSet();
  this.pluralForms = new FormSet();

  this.attach = attach;

  this.addIrregular('ail', 'aulx');
  this.addIrregular('bétail', 'bestiaux');
  this.addIrregular('bonhomme', 'bonshommes');
  this.addIrregular('ciel', 'cieux');
  this.addIrregular('monsieur', 'messieurs');
  this.addIrregular('mafioso', 'mafiosi');
  this.addIrregular('œil', 'yeux');
  this.addIrregular('putto', 'putti');
  this.addIrregular('targui', 'touareg'); // touareg -> touaregs is also OK.

  // Pluralize
  this.pluralForms.regularForms.push([/^(av|b|c|carnav|cérémoni|chac|corr|emment|emmenth|festiv|fut|gavi|gra|narv|p|récit|rég|rit|rorqu|st)al$/i, '$1als']);
  this.pluralForms.regularForms.push([/^(aspir|b|cor|ém|ferm|gemm|soupir|trav|vant|vent|vitr)ail$/i, '$1aux']);
  this.pluralForms.regularForms.push([/^(bij|caill|ch|gen|hib|jouj|p|rip|chouch)ou$/i, '$1oux']);
  this.pluralForms.regularForms.push([/^(gr|berimb|don|karb|land|pil|rest|sarr|un)au$/i, '$1aus']);
  this.pluralForms.regularForms.push([/^(bl|ém|enf|pn)eu$/i, '$1eus']);
  this.pluralForms.regularForms.push([/(au|eau|eu|œu)$/i, '$1x']);
  this.pluralForms.regularForms.push([/al$/i, 'aux']);
  this.pluralForms.regularForms.push([/(s|x)$/i, '$1']);
  this.pluralForms.regularForms.push([/(.*)$/i, '$1s']);

  // Singularize
  this.singularForms.regularForms.push([/^(aspir|b|cor|ém|ferm|gemm|soupir|trav|vant|vent|vitr)aux$/i, '$1ail']);
  this.singularForms.regularForms.push([/^(aloy|b|bouc|boy|burg|conoy|coy|cr|esquim|ét|fabli|flé|flûti|glu|gr|gru|hoy|joy|kérab|matéri|nobli|noy|pré|sen|sén|t|touch|tuss|tuy|v|ypré)aux$/i, '$1au']);
  this.singularForms.regularForms.push([/^(bij|caill|ch|gen|hib|jouj|p|rip|chouch)oux$/i, '$1ou']);
  this.singularForms.regularForms.push([/^(bis)?aïeux$/i, '$1aïeul']);
  this.singularForms.regularForms.push([/^apparaux$/i, 'appareil']); // One way transform, don't put on irregular list.
  this.singularForms.regularForms.push([/^ciels$/i, 'ciel']);
  this.singularForms.regularForms.push([/^œils$/i, 'œil']);
  this.singularForms.regularForms.push([/(eau|eu|œu)x$/i, '$1']);
  this.singularForms.regularForms.push([/aux$/i, 'al']);
  this.singularForms.regularForms.push([/(.*)s$/i, '$1']);

  this.pluralize = function(token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
  };

  this.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
  };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;

},{"../form_set":24,"../singular_plural_inflector":29,"util":94}],26:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A noun inflector for Japanese.
 * Compiled from several sources including:
 * \@see http://answers.yahoo.com/question/index?qid=20080528201740AASBWy6
 * \@see http://www.excite.co.jp/dictionary/english_japanese/
 *
 * This script assumes input is normalized using normalizer_ja().
 * Pluralizing Japanese has a very limited interest.
 * Japanese don't usually distinct plural from singular, so even a word looking
 * like a singular might actually be a plural.
 *
 * Singularization of nouns ending by -tachi or -ra is achieved using a
 * comprehensive black list, while nouns ending by -domo or -gata use a white
 * list because there are too many exceptions.
 *
 * \@todo Singularize nouns ending by -ら, but there are too many exceptions.
 * \@todo Expand the list of common plurals ending by -domo and -gata.
 */

var SingularPluralInflector = require('../singular_plural_inflector'),
    util = require('util'),
    FormSet = require('../form_set');

function attach() {
  var inflector = this;

  String.prototype.singularizeNoun = function() {
    return inflector.singularize(this);
  };

  String.prototype.pluralizeNoun = function() {
    return inflector.pluralize(this);
  };
}



/**
 * @constructor
 */
var NounInflector = function() {
  // Ambiguous a.k.a. invariant.
  this.ambiguous = [
    'ともだち', '友だち', '友達', '遊び友達', '飲み友達', '酒飲み友達', '茶飲み友達',
    '学校友達', '女友達', '男友達', '幼友達'
  ];

  this.customPluralForms = [];
  this.customSingularForms = [];
  this.singularForms = new FormSet();
  this.pluralForms = new FormSet();

  this.attach = attach;

  this.addIrregular('神', '神神');
  this.addIrregular('人', '人人');
  this.addIrregular('年', '年年');
  this.addIrregular('月', '月月');
  this.addIrregular('日', '日日');
  this.addIrregular('星', '星星');
  this.addIrregular('島', '島島');
  this.addIrregular('我', '我我');

  /**
   * Notes:
   * -たち exceptions: いたち, おいたち, ついたち, かたち, かおかたち, なりかたち, いでたち, はたち, からたち, なりたち
   * -達 exceptions: 伊達, 男伊達, 栄達, 上意下達, 熟達, 上達, 下意上達, 先達, 送達, 速達, 即日速達, 書留速達, 調達, 通達, 伝達, 到達, 配達, 牛乳配達, 新聞配達, 無料配達, 四通八達, 発達, 未発達, 御用達, 宮内庁御用達, 練達, 闊達
   * -等 exceptions: 一等, 下等, 何等, 均等, 勲等, 高等, 三等, 初等, 上等, 親等, 二親等, 数等, 対等, 中等, 同等, 特等, 二等, 品等, 不等, 平等, 悪平等, 男女平等, 不平等, 優等, 劣等
   */

  // Pluralize
  this.pluralForms.regularForms.push([/^(.+)$/i, '$1たち']);

  // Singularize
  this.singularForms.regularForms.push([/^(.+)たち$/i, function(a, mask) {
    if (['い', 'おい', 'つい', 'か', 'かおか', 'なりか', 'いで', 'は', 'から',
      'なり'].indexOf(mask) >= 0)
      return mask + 'たち';
    return mask;
  }]);
  this.singularForms.regularForms.push([/^(.+)達$/i, function(a, mask) {
    if (['伊', '伊', '栄', '上意下', '熟', '上', '下意上', '先', '送', '速',
      '即日速', '書留速', '調', '通', '伝', '到', '配', '牛乳配', '新聞配', '無料配',
      '四通八', '発', '未発', '御用', '宮内庁御用', '練', '闊'].indexOf(mask) >= 0)
      return mask + '達';
    return mask;
  }]);  // Singularize nouns ending by -等, but not exceptions.
  this.singularForms.regularForms.push([/^(.+)等$/i, function(a, mask) {
    if (['一', '下', '何', '均', '勲', '高', '三', '初', '親', '二親', '数', '対',
      '中', '同', '特', '二', '品', '不', '平', '悪平', '男女平', '不平', '優',
      '劣'].indexOf(mask) >= 0)
      return mask + '等';
    return mask;
  }]);
  this.singularForms.regularForms.push([/^(人間|わたくし|私|てまえ|手前|野郎|やろう|勇者|がき|ガキ|餓鬼)(共|ども)$/i, '$1']);
  this.singularForms.regularForms.push([/^(神様|先生|あなた)(方|がた)$/i, '$1']);

  this.pluralize = function(token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
  };

  this.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
  };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;

},{"../form_set":24,"../singular_plural_inflector":29,"util":94}],27:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var SingularPluralInflector = require('./singular_plural_inflector'),
    util = require('util'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;
    
    String.prototype.singularizeNoun = function() {
        return inflector.singularize(this);
    }
    
    String.prototype.pluralizeNoun = function() {
        return inflector.pluralize(this);
    }
}

var NounInflector = function() {
    this.ambiguous = [
        'bison', 'bream', 'carp', 'chassis', 'cod', 'corps', 'debris', 'deer',
        'diabetes', 'equipment', 'elk', 'fish', 'flounder', 'gallows', 'graffiti',
        'headquarters', 'herpes', 'highjinks', 'homework', 'information',
        'mackerel', 'mews', 'money', 'news', 'rice', 'rabies', 'salmon', 'series',
        'sheep', 'shrimp', 'species', 'swine', 'trout', 'tuna', 'whiting', 'wildebeest'
    ];
    
    this.customPluralForms = [];
    this.customSingularForms = [];    
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.attach = attach;

    this.addIrregular("child", "children");
    this.addIrregular("man", "men");
    this.addIrregular("person", "people");
    this.addIrregular("sex", "sexes");
    this.addIrregular("mouse", "mice");
    this.addIrregular("ox", "oxen");
    this.addIrregular("foot", "feet");
    this.addIrregular("tooth", "teeth");
    this.addIrregular("goose", "geese");
    
    // see if it is possible to unify the creation of both the singular and
    // plural regexes or maybe even just have one list. with a complete list
    // of rules it may only be possible for some regular forms, but worth a shot    
    this.pluralForms.regularForms.push([/y$/i, 'ies']);
    this.pluralForms.regularForms.push([/ife$/i, 'ives']);
    this.pluralForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)a$/i, '$1ae']);    
    this.pluralForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul)us$/i, '$1i']);    
    this.pluralForms.regularForms.push([/(buffal|tomat)o$/i, '$1oes']);    
    this.pluralForms.regularForms.push([/(sis)$/i, 'ses']);
    this.pluralForms.regularForms.push([/(matr|vert|ind)(ix|ex)$/i, '$1ices']);
    this.pluralForms.regularForms.push([/(x|ch|ss|sh|s|z)$/i, '$1es']);
    this.pluralForms.regularForms.push([/^(?!talis|.*hu)(.*)man$/i, '$1men']);
    this.pluralForms.regularForms.push([/(.*)/i, '$1s']);

    this.singularForms.regularForms.push([/([^v])ies$/i, '$1y']);
    this.singularForms.regularForms.push([/ives$/i, 'ife']);
    this.singularForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)ae$/i, '$1a']);
    this.singularForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul)(i)$/i, '$1us']);
    this.singularForms.regularForms.push([/(buffal|tomat)(oes)$/i, '$1o']);
    this.singularForms.regularForms.push([/(analy|naly|synop|parenthe|diagno|the)ses$/i, '$1sis']);
    this.singularForms.regularForms.push([/(vert|ind)(ices)$/i, '$1ex']);
    // our pluralizer won''t cause this form of appendix (appendicies)
    // but we should handle it
    this.singularForms.regularForms.push([/(matr|append)(ices)$/i, '$1ix']);
    this.singularForms.regularForms.push([/(x|ch|ss|sh|s|z)es$/i, '$1']);
    this.singularForms.regularForms.push([/men$/i, 'man']);
    this.singularForms.regularForms.push([/s$/i, '']);
    
    this.pluralize = function (token) {
        return this.ize(token, this.pluralForms, this.customPluralForms);
    };
    
    this.singularize = function(token) {
        return this.ize(token, this.singularForms, this.customSingularForms);
    };
};

util.inherits(NounInflector, SingularPluralInflector);
    
module.exports = NounInflector;

},{"./form_set":24,"./singular_plural_inflector":29,"util":94}],28:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
    SingularPluralInflector = require('./singular_plural_inflector'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;
    
    String.prototype.singularizePresentVerb = function() {
        return inflector.singularize(this);
    }
    
    String.prototype.pluralizePresentVerb = function() {
        return inflector.pluralize(this);
    }
}

var VerbInflector = function() {
    this.ambiguous = [
        'will'
    ];
    
    this.attach = attach;
        
    this.customPluralForms = [];
    this.customSingularForms = [];    
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.addIrregular("am", "are");    
    this.addIrregular("is", "are");
    this.addIrregular("was", "were");
    
    this.singularForms.regularForms.push([/ed$/i, 'ed']);
    this.singularForms.regularForms.push([/ss$/i, 'sses']);
    this.singularForms.regularForms.push([/x$/i, 'xes']);    
    this.singularForms.regularForms.push([/(h|z|o)$/i, '$1es']);
    this.singularForms.regularForms.push([/$zz/i, 'zzes']);
    this.singularForms.regularForms.push([/$/i, 's']);

    this.pluralForms.regularForms.push([/sses$/i, 'ss']);
    this.pluralForms.regularForms.push([/xes$/i, 'x']);
    this.pluralForms.regularForms.push([/([cs])hes$/i, '$1h']);
    this.pluralForms.regularForms.push([/zzes$/i, 'zz']);
    this.pluralForms.regularForms.push([/([^h|z|o])es$/i, '$1e']);
    this.pluralForms.regularForms.push([/e?s$/i, '']); 
};

util.inherits(VerbInflector, SingularPluralInflector);

module.exports = VerbInflector;

},{"./form_set":24,"./singular_plural_inflector":29,"util":94}],29:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var TenseInflector = function () {
};

TenseInflector.prototype.addSingular = function(pattern, replacement) {
    this.customSingularForms.push([pattern, replacement]);    
};

TenseInflector.prototype.addPlural = function(pattern, replacement) {
    this.customPluralForms.push([pattern, replacement]);
};

TenseInflector.prototype.ize = function (token, formSet, customForms) {
    var restoreCase = this.restoreCase(token);
    return restoreCase(this.izeRegExps(token, customForms) || this.izeAbiguous(token) ||
        this.izeRegulars(token, formSet) || this.izeRegExps(token, formSet.regularForms) ||
        token);
}

TenseInflector.prototype.izeAbiguous = function (token) {
    if(this.ambiguous.indexOf(token.toLowerCase()) > -1)
        return token.toLowerCase();

    return false;
}

TenseInflector.prototype.pluralize = function (token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
};

TenseInflector.prototype.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
};    

var uppercaseify = function(token) {
    return token.toUpperCase();
}
var capitalize = function(token) {
    return token[0].toUpperCase() + token.slice(1);
}
var lowercaseify = function(token) {
    return token.toLowerCase();
}

TenseInflector.prototype.restoreCase = function(token) {
    if (token[0] === token[0].toUpperCase()) {
        if (token[1] && token[1] === token[1].toLowerCase()) {
            return capitalize;
        } else {
            return uppercaseify;
        }
    } else {
        return lowercaseify;
    }
}

TenseInflector.prototype.izeRegulars = function(token, formSet) {
    token = token.toLowerCase();
    
    if(formSet.irregularForms[token])
        return formSet.irregularForms[token];

    return false;
}

TenseInflector.prototype.addForm = function(singularTable, pluralTable, singular, plural) {
    singular = singular.toLowerCase();
    plural = plural.toLowerCase();
    pluralTable[singular] = plural;
    singularTable[plural] = singular;
};

TenseInflector.prototype.addIrregular = function(singular, plural) {
    this.addForm(this.singularForms.irregularForms, this.pluralForms.irregularForms, singular, plural);
};

TenseInflector.prototype.izeRegExps = function(token, forms) {
        var i, form;
        for(i = 0; i < forms.length; i++) {
            form = forms[i];
            
            if(token.match(form[0]))
                return token.replace(form[0], form[1]);
        }
        
        return false;
    }

module.exports = TenseInflector;

},{}],30:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer();

exports.ngrams = function(sequence, n) {
    return ngrams(sequence, n);
}

exports.bigrams = function(sequence) {
    return ngrams(sequence, 2);
}

exports.trigrams = function(sequence) {
    return ngrams(sequence, 3);
}

var ngrams = function(sequence, n) {
    var result = [];
    
    if (!_(sequence).isArray()) {
        sequence = tokenizer.tokenize(sequence);
    }

    var count = _.max([0, sequence.length - n + 1]);
    
    for (var i = 0; i < count; i++) {
        result.push(sequence.slice(i, i + n));
    }
    
    return result;
}


},{"../tokenizers/regexp_tokenizer":57,"underscore":85}],31:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Normalize Japanese inputs and expose function to perform several conversions.
 *
 * Note: The space character is treated like a roman character as it usually
 *   has the same width as them in Japanese texts.
 *
 * \@todo Replace characters range from ㈠ to ㉃, ㊀ to ㊰ and ㇰ to ㇿ.
 * \@todo Lazy initializations of conversionTables and converters.
 * \@todo Would fixHalfwidthKana be useful?
 *
 * Descriptions of functions exposed:
 * normalizeJapanese 「全角」英字・数字を「半角」、「半角」記・カタカナを「全角」に変換
 * converters.fullwidthToHalfwidth.alphabet    「全角」英字を「半角」に変換
 * converters.halfwidthToFullwidth.alphabet    「半角」英字を「全角」に変換
 * converters.fullwidthToHalfwidth.numbers     「全角」数字を「半角」に変換
 * converters.halfwidthToFullwidth.numbers     「半角」数字を「全角」に変換 「全角」スペースを「半角」
 * converters.fullwidthToHalfwidth.punctuation 「全角」記号を「半角」に変換 「半角」スペースを「全角」
 * converters.halfwidthToFullwidth.punctuation 「半角」記号を「全角」に変換
 * converters.fullwidthToHalfwidth.katakana    「全角カタカナ」を「半角カタカナ」に変換
 * converters.halfwidthToFullwidth.katakana    「半角カタカナ」を「全角カタカナ」に変換
 * converters.hiraganaToKatakana               「カタカナ」を「ひらがな」に変換
 * converters.katakanaToHiragana               「ひらがな」を「カタカナ」に変換
 */

var flip = require('../util/utils.js').flip;
var merge = require('../util/utils.js').merge;
var replacer = require('../util/utils').replacer;

// From http://fernweh.jp/b/mb_convert_kana_js/
var conversionTables = {
  fullwidthToHalfwidth: {
    alphabet: {
      'ａ': 'a',
      'ｂ': 'b',
      'ｃ': 'c',
      'ｄ': 'd',
      'ｅ': 'e',
      'ｆ': 'f',
      'ｇ': 'g',
      'ｈ': 'h',
      'ｉ': 'i',
      'ｊ': 'j',
      'ｋ': 'k',
      'ｌ': 'l',
      'ｍ': 'm',
      'ｎ': 'n',
      'ｏ': 'o',
      'ｐ': 'p',
      'ｑ': 'q',
      'ｒ': 'r',
      'ｓ': 's',
      'ｔ': 't',
      'ｕ': 'u',
      'ｖ': 'v',
      'ｗ': 'w',
      'ｘ': 'x',
      'ｙ': 'y',
      'ｚ': 'z',
      'Ａ': 'A',
      'Ｂ': 'B',
      'Ｃ': 'C',
      'Ｄ': 'D',
      'Ｅ': 'E',
      'Ｆ': 'F',
      'Ｇ': 'G',
      'Ｈ': 'H',
      'Ｉ': 'I',
      'Ｊ': 'J',
      'Ｋ': 'K',
      'Ｌ': 'L',
      'Ｍ': 'M',
      'Ｎ': 'N',
      'Ｏ': 'O',
      'Ｐ': 'P',
      'Ｑ': 'Q',
      'Ｒ': 'R',
      'Ｓ': 'S',
      'Ｔ': 'T',
      'Ｕ': 'U',
      'Ｖ': 'V',
      'Ｗ': 'W',
      'Ｘ': 'X',
      'Ｙ': 'Y',
      'Ｚ': 'Z',
      '　': ' ' // Fullwidth space
    },

    numbers: {
      '０': '0',
      '１': '1',
      '２': '2',
      '３': '3',
      '４': '4',
      '５': '5',
      '６': '6',
      '７': '7',
      '８': '8',
      '９': '9'
    },

    punctuation: {
      '＿': '_',
      '－': '-',
      '・': '･',
      '，': ',',
      '、': '､',
      '；': ';',
      '：': ':',
      '！': '!',
      '？': '?',
      '．': '.',
      '。': '｡',
      '（': '(',
      '）': ')',
      '［': '[',
      '］': ']',
      '｛': '{',
      '｝': '}',
      '「': '｢',
      '」': '｣',
      '＠': '@',
      '＊': '*',
      '＼': '\\',
      '／': '/',
      '＆': '&',
      '＃': '#',
      '％': '%',
      '｀': '`',
      '＾': '^',
      '＋': '+',
      '＜': '<',
      '＝': '=',
      '＞': '>',
      '｜': '|',
      '～': '~',
      '≪': '«',
      '≫': '»',
      '─': '-',
      '＄': '$',
      '＂': '"'
    },

    katakana: {
      '゛': 'ﾞ',
      '゜': 'ﾟ',
      'ー': 'ｰ',

      'ヴ': 'ｳﾞ',
      'ガ': 'ｶﾞ',
      'ギ': 'ｷﾞ',
      'グ': 'ｸﾞ',
      'ゲ': 'ｹﾞ',
      'ゴ': 'ｺﾞ',
      'ザ': 'ｻﾞ',
      'ジ': 'ｼﾞ',
      'ズ': 'ｽﾞ',
      'ゼ': 'ｾﾞ',
      'ゾ': 'ｿﾞ',
      'ダ': 'ﾀﾞ',
      'ヂ': 'ﾁﾞ',
      'ヅ': 'ﾂﾞ',
      'デ': 'ﾃﾞ',
      'ド': 'ﾄﾞ',
      'バ': 'ﾊﾞ',
      'パ': 'ﾊﾟ',
      'ビ': 'ﾋﾞ',
      'ピ': 'ﾋﾟ',
      'ブ': 'ﾌﾞ',
      'プ': 'ﾌﾟ',
      'ベ': 'ﾍﾞ',
      'ペ': 'ﾍﾟ',
      'ボ': 'ﾎﾞ',
      'ポ': 'ﾎﾟ',

      'ァ': 'ｧ',
      'ア': 'ｱ',
      'ィ': 'ｨ',
      'イ': 'ｲ',
      'ゥ': 'ｩ',
      'ウ': 'ｳ',
      'ェ': 'ｪ',
      'エ': 'ｴ',
      'ォ': 'ｫ',
      'オ': 'ｵ',
      'カ': 'ｶ',
      'キ': 'ｷ',
      'ク': 'ｸ',
      'ケ': 'ｹ',
      'コ': 'ｺ',
      'サ': 'ｻ',
      'シ': 'ｼ',
      'ス': 'ｽ',
      'セ': 'ｾ',
      'ソ': 'ｿ',
      'タ': 'ﾀ',
      'チ': 'ﾁ',
      'ッ': 'ｯ',
      'ツ': 'ﾂ',
      'テ': 'ﾃ',
      'ト': 'ﾄ',
      'ナ': 'ﾅ',
      'ニ': 'ﾆ',
      'ヌ': 'ﾇ',
      'ネ': 'ﾈ',
      'ノ': 'ﾉ',
      'ハ': 'ﾊ',
      'ヒ': 'ﾋ',
      'フ': 'ﾌ',
      'ヘ': 'ﾍ',
      'ホ': 'ﾎ',
      'マ': 'ﾏ',
      'ミ': 'ﾐ',
      'ム': 'ﾑ',
      'メ': 'ﾒ',
      'モ': 'ﾓ',
      'ャ': 'ｬ',
      'ヤ': 'ﾔ',
      'ュ': 'ｭ',
      'ユ': 'ﾕ',
      'ョ': 'ｮ',
      'ヨ': 'ﾖ',
      'ラ': 'ﾗ',
      'リ': 'ﾘ',
      'ル': 'ﾙ',
      'レ': 'ﾚ',
      'ロ': 'ﾛ',
      'ワ': 'ﾜ',
      'ヲ': 'ｦ',
      'ン': 'ﾝ'
    }
  },

  halfwidthToFullwidth: {}
};

var fixFullwidthKana = {
  'ゝ゛': 'ゞ',
  'ヽ゛': 'ヾ',

  'う゛': 'ゔ',
  'か゛': 'が',
  'き゛': 'ぎ',
  'く゛': 'ぐ',
  'け゛': 'げ',
  'こ゛': 'ご',
  'さ゛': 'ざ',
  'し゛': 'じ',
  'す゛': 'ず',
  'せ゛': 'ぜ',
  'そ゛': 'ぞ',
  'た゛': 'だ',
  'ち゛': 'ぢ',
  'つ゛': 'づ',
  'て゛': 'で',
  'と゛': 'ど',
  'は゛': 'ば',
  'は゜': 'ぱ',
  'ひ゛': 'び',
  'ひ゜': 'ぴ',
  'ふ゛': 'ぶ',
  'ふ゜': 'ぷ',
  'へ゛': 'べ',
  'へ゜': 'ぺ',
  'ほ゛': 'ぼ',
  'ほ゜': 'ぽ',
  'っな': 'んな',
  'っに': 'んに',
  'っぬ': 'んぬ',
  'っね': 'んね',
  'っの': 'んの',

  'ウ゛': 'ヴ',
  'カ゛': 'ガ',
  'キ゛': 'ギ',
  'ク゛': 'グ',
  'ケ゛': 'ゲ',
  'コ゛': 'ゴ',
  'サ゛': 'ザ',
  'シ゛': 'ジ',
  'ス゛': 'ズ',
  'セ゛': 'ゼ',
  'ソ゛': 'ゾ',
  'タ゛': 'ダ',
  'チ゛': 'ヂ',
  'ツ゛': 'ヅ',
  'テ゛': 'デ',
  'ト゛': 'ド',
  'ハ゛': 'バ',
  'ハ゜': 'パ',
  'ヒ゛': 'ビ',
  'ヒ゜': 'ピ',
  'フ゛': 'ブ',
  'フ゜': 'プ',
  'ヘ゛': 'ベ',
  'ヘ゜': 'ペ',
  'ホ゛': 'ボ',
  'ホ゜': 'ポ',
  'ッナ': 'ンナ',
  'ッニ': 'ンニ',
  'ッヌ': 'ンヌ',
  'ッネ': 'ンネ',
  'ッノ': 'ンノ'
};

var fixCompositeSymbolsTable = {
  '㋀': '1月',
  '㋁': '2月',
  '㋂': '3月',
  '㋃': '4月',
  '㋄': '5月',
  '㋅': '6月',
  '㋆': '7月',
  '㋇': '8月',
  '㋈': '9月',
  '㋉': '10月',
  '㋊': '11月',
  '㋋': '12月',

  '㏠': '1日',
  '㏡': '2日',
  '㏢': '3日',
  '㏣': '4日',
  '㏤': '5日',
  '㏥': '6日',
  '㏦': '7日',
  '㏧': '8日',
  '㏨': '9日',
  '㏩': '10日',
  '㏪': '11日',
  '㏫': '12日',
  '㏬': '13日',
  '㏭': '14日',
  '㏮': '15日',
  '㏯': '16日',
  '㏰': '17日',
  '㏱': '18日',
  '㏲': '19日',
  '㏳': '20日',
  '㏴': '21日',
  '㏵': '22日',
  '㏶': '23日',
  '㏷': '24日',
  '㏸': '25日',
  '㏹': '26日',
  '㏺': '27日',
  '㏻': '28日',
  '㏼': '29日',
  '㏽': '30日',
  '㏾': '31日',

  '㍘': '0点',
  '㍙': '1点',
  '㍚': '2点',
  '㍛': '3点',
  '㍜': '4点',
  '㍝': '5点',
  '㍞': '6点',
  '㍟': '7点',
  '㍠': '8点',
  '㍡': '9点',
  '㍢': '10点',
  '㍣': '11点',
  '㍤': '12点',
  '㍥': '13点',
  '㍦': '14点',
  '㍧': '15点',
  '㍨': '16点',
  '㍩': '17点',
  '㍪': '18点',
  '㍫': '19点',
  '㍬': '20点',
  '㍭': '21点',
  '㍮': '22点',
  '㍯': '23点',
  '㍰': '24点',

  '㍻': '平成',
  '㍼': '昭和',
  '㍽': '大正',
  '㍾': '明治',
  '㍿': '株式会社',

  '㌀': 'アパート',
  '㌁': 'アルファ',
  '㌂': 'アンペア',
  '㌃': 'アール',
  '㌄': 'イニング',
  '㌅': 'インチ',
  '㌆': 'ウオン',
  '㌇': 'エスクード',
  '㌈': 'エーカー',
  '㌉': 'オンス',
  '㌊': 'オーム',
  '㌋': 'カイリ', //海里
  '㌌': 'カラット',
  '㌍': 'カロリー',
  '㌎': 'ガロン',
  '㌏': 'ガンマ',
  '㌐': 'ギガ',
  '㌑': 'ギニー',
  '㌒': 'キュリー',
  '㌓': 'ギルダー',
  '㌔': 'キロ',
  '㌕': 'キログラム',
  '㌖': 'キロメートル',
  '㌗': 'キロワット',
  '㌘': 'グラム',
  '㌙': 'グラムトン',
  '㌚': 'クルゼイロ',
  '㌛': 'クローネ',
  '㌜': 'ケース',
  '㌝': 'コルナ',
  '㌞': 'コーポ',
  '㌟': 'サイクル',
  '㌠': 'サンチーム',
  '㌡': 'シリング',
  '㌢': 'センチ',
  '㌣': 'セント',
  '㌤': 'ダース',
  '㌥': 'デシ',
  '㌦': 'ドル',
  '㌧': 'トン',
  '㌨': 'ナノ',
  '㌩': 'ノット',
  '㌪': 'ハイツ',
  '㌫': 'パーセント',
  '㌬': 'パーツ',
  '㌭': 'バーレル',
  '㌮': 'ピアストル',
  '㌯': 'ピクル',
  '㌰': 'ピコ',
  '㌱': 'ビル',
  '㌲': 'ファラッド',
  '㌳': 'フィート',
  '㌴': 'ブッシェル',
  '㌵': 'フラン',
  '㌶': 'ヘクタール',
  '㌷': 'ペソ',
  '㌸': 'ペニヒ',
  '㌹': 'ヘルツ',
  '㌺': 'ペンス',
  '㌻': 'ページ',
  '㌼': 'ベータ',
  '㌽': 'ポイント',
  '㌾': 'ボルト',
  '㌿': 'ホン',
  '㍀': 'ポンド',
  '㍁': 'ホール',
  '㍂': 'ホーン',
  '㍃': 'マイクロ',
  '㍄': 'マイル',
  '㍅': 'マッハ',
  '㍆': 'マルク',
  '㍇': 'マンション',
  '㍈': 'ミクロン',
  '㍉': 'ミリ',
  '㍊': 'ミリバール',
  '㍋': 'メガ',
  '㍌': 'メガトン',
  '㍍': 'メートル',
  '㍎': 'ヤード',
  '㍏': 'ヤール',
  '㍐': 'ユアン',
  '㍑': 'リットル',
  '㍒': 'リラ',
  '㍓': 'ルピー',
  '㍔': 'ルーブル',
  '㍕': 'レム',
  '㍖': 'レントゲン',
  '㍗': 'ワット'
};

// Fill in the conversion tables with the flipped tables.
conversionTables.halfwidthToFullwidth.alphabet = flip(conversionTables.fullwidthToHalfwidth.alphabet);
conversionTables.halfwidthToFullwidth.numbers = flip(conversionTables.fullwidthToHalfwidth.numbers);
conversionTables.halfwidthToFullwidth.punctuation = flip(conversionTables.fullwidthToHalfwidth.punctuation);
conversionTables.halfwidthToFullwidth.katakana = flip(conversionTables.fullwidthToHalfwidth.katakana);

// Build the normalization table.
conversionTables.normalize = merge(
    conversionTables.fullwidthToHalfwidth.alphabet,
    conversionTables.fullwidthToHalfwidth.numbers,
    conversionTables.halfwidthToFullwidth.punctuation,
    conversionTables.halfwidthToFullwidth.katakana
    );

var converters = {
  fullwidthToHalfwidth: {
    alphabet: replacer(conversionTables.fullwidthToHalfwidth.alphabet),
    numbers: replacer(conversionTables.fullwidthToHalfwidth.numbers),
    punctuation: replacer(conversionTables.fullwidthToHalfwidth.punctuation),
    katakana: replacer(conversionTables.fullwidthToHalfwidth.katakana)
  },

  halfwidthToFullwidth: {
    alphabet: replacer(conversionTables.halfwidthToFullwidth.alphabet),
    numbers: replacer(conversionTables.halfwidthToFullwidth.numbers),
    punctuation: replacer(conversionTables.halfwidthToFullwidth.punctuation),
    katakana: replacer(conversionTables.halfwidthToFullwidth.katakana)
  },

  fixFullwidthKana: replacer(fixFullwidthKana),
  normalize: replacer(conversionTables.normalize)
};

var fixCompositeSymbols = replacer(fixCompositeSymbolsTable);


/**
 * Convert hiragana to fullwidth katakana.
 * According to http://jsperf.com/converting-japanese, these implementations are
 * faster than using lookup tables.
 *
 * @param {string} str A string.
 * @return {string} A string not containing hiragana.
 */
converters.hiraganaToKatakana = function(str) {
  str = converters.halfwidthToFullwidth.katakana(str);
  str = converters.fixFullwidthKana(str);

  str = str.replace(/ゝ/g, 'ヽ');
  str = str.replace(/ゞ/g, 'ヾ');
  //str = str.replace(/?/g, '𛀀'); // Letter archaic E

  str = str.replace(/[ぁ-ゖ]/g, function(str) {
    return String.fromCharCode(str.charCodeAt(0) + 96);
  });

  return str;
};


/**
 * Convert katakana to hiragana.
 *
 * @param {string} str A string.
 * @return {string} A string not containing katakana.
 */
converters.katakanaToHiragana = function(str) {
  str = converters.halfwidthToFullwidth.katakana(str);
  str = converters.fixFullwidthKana(str);

  str = str.replace(/ヽ/g, 'ゝ');
  str = str.replace(/ヾ/g, 'ゞ');
  //str = str.replace(/?/g, '𛀁'); // Letter archaic E

  str = str.replace(/[ァ-ヶ]/g, function(str) {
    return String.fromCharCode(str.charCodeAt(0) - 96);
  });

  return str;
};


/**
 * Fix kana and apply the following processes;
 * * Replace repeat characters
 * * Alphabet to halfwidth
 * * Numbers to halfwidth
 * * Punctuation to fullwidth
 * * Katakana to fullwidth
 * * Fix fullwidth kana
 * * Replace composite symbols
 *
 * @param {string} str
 * @return {string}
 */
var normalize_ja = function(str) {
  // Replace repeat characters.
  str = str
    .replace(/(..)々々/g, '$1$1')
    .replace(/(.)々/g, '$1$1');

  str = converters.normalize(str);
  str = converters.fixFullwidthKana(str);

  // Replace composite symbols.
  str = fixCompositeSymbols(str);

  return str;
};

exports.normalize_ja = normalize_ja;
exports.converters = converters;

},{"../util/utils":68,"../util/utils.js":68}],32:[function(require,module,exports){
/*
 Copyright (c) 2012, Alexy Maslennikov

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Script to remove diacritics. Original source was taken from
 * http://lehelk.com/2011/05/06/script-to-remove-diacritics/
 */
var diacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
];


module.exports = function(str) {
	var rules = diacriticsRemovalMap;
	for (var i = 0; i < rules.length; i++) {
		str = str.replace(rules[i].letters, rules[i].base);
	}
	return str;
};

},{}],33:[function(require,module,exports){
/*
Copyright (c) 2012, Alexy Maslenninkov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * Daitch-Mokotoff Soundex Coding
 *
 * The Daitch-Mokotoff Soundex System was created by Randy Daitch and Gary
 * Mokotoff of the Jewish Genealogical Society because they concluded the system
 * developed by Robert Russell in 1918, and in use today by the U.S. National
 * Archives and Records Administration (NARA) does not apply well to many Slavic
 * and Yiddish surnames.  It also includes refinements that are independent of
 * ethnic considerations.
 *
 * The rules for converting surnames into D-M Code numbers are listed below.
 * They are followed by the coding chart.
 *
 * 1. Names are coded to six digits, each digit representing a sound listed in
 * the coding chart (below).
 *
 * 2. When a name lacks enough coded sounds for six digits, use zeros to fill to
 * six digits. GOLDEN which has only four coded sounds [G-L-D-N] is coded as
 * 583600.
 *
 * 3. The letters A, E, I, O, U, J, and Y are always coded at the beginning of a
 * name as in Alpert 087930. In any other situation, they are ignored except
 * when two of them form a pair and the pair comes before a vowel, as in Breuer
 * 791900 but not Freud.
 *
 * 4. The letter H is coded at the beginning of a name, as in Haber 579000, or
 * preceding a vowel, as in Manheim 665600, otherwise it is not coded.
 *
 * 5. When adjacent sounds can combine to form a larger sound, they are given
 * the code number of the larger sound.  Mintz which is not coded MIN-T-Z but
 * MIN-TZ 664000.
 *
 * 6. When adjacent letters have the same code number, they are coded as one
 * sound, as in TOPF, which is not coded TO-P-F 377000 but TO-PF 370000.
 * Exceptions to this rule are the letter combinations MN and NM, whose letters
 * are coded separately, as in Kleinman, which is coded 586660 not 586600.
 *
 * 7. When a surname consists or more than one word, it is coded as if one word,
 * such as Ben Aron which is treated as Benaron.
 *
 * 8. Several letter and letter combinations pose the problem that they may
 * sound in one of two ways.  The letter and letter combinations CH, CK, C, J,
 * and RS are assigned two possible code numbers.
 *
 * For more info, see http://www.jewishgen.org/InfoFiles/soundex.html
 */

/**
 * D-M transformation table in the form of finite-state machine.
 * Every element of the table having member with zero index represents
 * legal FSM state; every non-zero key is the transition rule.
 *
 * Every legal state comprises tree values chosen according to the position
 * of the letter combination in the word:
 *   0: start of a word;
 *   1: before a vowel;
 *   2: any other situation.
 */
var codes = {
    A: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]],
        U: [[0, 7, -1]]},
    B: [[7, 7, 7]],
    C: {
        0: [5, 5, 5],
        Z: {0: [4, 4, 4], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], Z: [[4, 4, 4]]},
        K: [[5, 5, 5], [45, 45, 45]],
        H: {0: [5, 5, 5], S: [[5, 54, 54]]}},
    D: {
        0: [3, 3, 3],
        T: [[3, 3, 3]],
        Z: {0: [4, 4, 4], H: [[4, 4, 4]], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], H: [[4, 4, 4]], Z: [[4, 4, 4]]},
        R: {S: [[4, 4, 4]], Z: [[4, 4, 4]]}},
    E: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]],
        U: [[1, 1, -1]],
        W: [[1, 1, -1]]},
    F: {
        0: [7, 7, 7],
        B: [[7, 7, 7]]},
    G: [[5, 5, 5]],
    H: [[5, 5, -1]],
    I: {
        0: [0, -1, -1],
        A: [[1, -1, -1]],
        E: [[1, -1, -1]],
        O: [[1, -1, -1]],
        U: [[1, -1, -1]]},
    J: [[4, 4, 4]],
    K: {
        0: [5, 5, 5],
        H: [[5, 5, 5]],
        S: [[5, 54, 54]]},
    L: [[8, 8, 8]],
    M: {
        0: [6, 6, 6],
        N: [[66, 66, 66]]},
    N: {
        0: [6, 6, 6],
        M: [[66, 66, 66]]},
    O: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]]},
    P: {
        0: [7, 7, 7],
        F: [[7, 7, 7]],
        H: [[7, 7, 7]]},
    Q: [[5, 5, 5]],
    R: {
        0: [9, 9, 9],
        Z: [[94, 94, 94], [94, 94, 94]],
        S: [[94, 94, 94], [94, 94, 94]]},
    S: {
        0: [4, 4, 4],
        Z: {0: [4, 4, 4], T: [[2, 43, 43]], C: {Z: [[2, 4, 4]], S: [[2, 4, 4]]}, D: [[2, 43, 43]]},
        D: [[2, 43, 43]],
        T: {0: [2, 43, 43], R: {Z: [[2, 4, 4]], S: [[2, 4, 4]]}, C: {H: [[2, 4, 4]]}, S: {H: [[2, 4, 4]], C: {H: [[2, 4, 4]]}}},
        C: {0: [2, 4, 4], H: {0: [4, 4, 4], T: {0: [2, 43, 43], S: {C: {H: [[2, 4, 4]]}, H: [[2, 4, 4]]}, C: {H: [[2, 4, 4]]}}, D: [[2, 43, 43]]}},
        H: {0: [4, 4, 4], T: {0: [2, 43, 43], C: {H: [[2, 4, 4]]}, S: {H: [[2, 4, 4]]}}, C: {H: [[2, 4, 4]]}, D: [[2, 43, 43]]}},
    T: {
        0: [3, 3, 3],
        C: {0: [4, 4, 4], H: [[4, 4, 4]]},
        Z: {0: [4, 4, 4], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], Z: [[4, 4, 4]], H: [[4, 4, 4]], C: {H: [[4, 4, 4]]}},
        T: {S: {0: [4, 4, 4], Z: [[4, 4, 4]], C: {H: [[4, 4, 4]]}}, C: {H: [[4, 4, 4]]}, Z: [[4, 4, 4]]},
        H: [[3, 3, 3]],
        R: {Z: [[4, 4, 4]], S: [[4, 4, 4]]}},
    U: {
        0: [0, -1, -1],
        E: [[0, -1, -1]],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]]},
    V: [[7, 7, 7]],
    W: [[7, 7, 7]],
    X: [[5, 54, 54]],
    Y: [[1, -1, -1]],
    Z: {
        0: [4, 4, 4],
        D: {0: [2, 43, 43], Z: {0: [2, 4, 4], H: [[2, 4, 4]]}},
        H: {0: [4, 4, 4], D: {0: [2, 43, 43], Z: {H: [[2, 4, 4]]}}},
        S: {0: [4, 4, 4], H: [[4, 4, 4]], C: {H: [[4, 4, 4]]}}}
};


function process(word, codeLength) {
	codeLength = codeLength || 6;
    word = word.toUpperCase();
    var output = '';

    var pos = 0, lastCode = -1;
    while (pos < word.length) {
        var substr = word.slice(pos);
        var rules = findRules(substr);

        var code;
        if (pos == 0) {
            // at the beginning of the word
            code = rules.mapping[0];
        } else if (substr[rules.length] && findRules(substr[rules.length]).mapping[0] == 0) {
            // before a vowel
            code = rules.mapping[1];
        } else {
            // any other situation
            code = rules.mapping[2];
        }

        if ((code != -1) && (code != lastCode)) output += code;
        lastCode = code;
        pos += rules.length;

    }

    return normalizeLength(output, codeLength);
}


function findRules(str) {
    var state = codes[str[0]];
    var legalState = state || [[-1,-1,-1]],
        charsInvolved = 1;

    for (var offs = 1; offs < str.length; offs++) {
        if (!state || !state[str[offs]]) break;

        state = state[str[offs]];
        if (state[0]) {
            legalState = state;
            charsInvolved = offs + 1;
        }
    }

    return {
        length: charsInvolved,
        mapping: legalState[0]
    };
}


/**
 * Pad right with zeroes or cut excess symbols to fit length
 */
function normalizeLength(token, length) {
	length = length || 6;
	if (token.length < length) {
		token += (new Array(length - token.length + 1)).join('0');
	}
    return token.slice(0, length);
}

var Phonetic = require('./phonetic');
var soundex = new Phonetic();
soundex.process = process;
module.exports = soundex;


},{"./phonetic":36}],34:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

var DoubleMetaphone = new Phonetic();
module.exports = DoubleMetaphone;

function isVowel(c) {
	return c && c.match(/[aeiouy]/i);
}

function truncate(string, length) {
    if(string.length >= length)
        string = string.substring(0, length);
        
    return string;
}

function process(token, maxLength) {
	token = token.toUpperCase();
	var primary = '', secondary = '';	
    var pos = 0;
    maxLength == maxLength || 32;

    function subMatch(startOffset, stopOffset, terms) {
        return subMatchAbsolute(pos + startOffset, pos + stopOffset, terms);
    }

    function subMatchAbsolute(startOffset, stopOffset, terms) {
        return terms.indexOf(token.substring(startOffset, stopOffset)) > -1;
    }

    function addSecondary(primaryAppendage, secondaryAppendage) {
    	primary += primaryAppendage;
    	secondary += secondaryAppendage;
    }

    function add(primaryAppendage) {
    	addSecondary(primaryAppendage, primaryAppendage);
    }

    function addCompressedDouble(c, encoded) {
    	if(token[pos + 1] == c)
    		pos++;
    	add(encoded || c);
    }

    function handleC() {
        if(pos > 1 && !isVowel(token[pos - 2]) 
                && token[pos - 1] == 'A' && token[pos + 1] == 'H'
                    && (token[pos + 2] != 'I' && token[pos + 2] != 'I')
                        || subMatch(-2, 4, ['BACHER', 'MACHER'])) {
            add('K');
            pos++;
        } else if(pos == 0 && token.substring(1, 6) == 'EASAR') {
            add('S');
            pos++;
        } else if(token.substring(pos + 1, pos + 4) == 'HIA') {
            add('K');
            pos++;
        } else if(token[pos + 1] == 'H') {
            if(pos > 0 && token.substring(pos + 2, pos + 4) == 'AE') {
                addSecondary('K', 'X');
                pos++;
            } else if(pos == 0 
                        && (subMatch(1, 6, ['HARAC', 'HARIS']) 
                            || subMatch(1, 3, ['HOR', 'HUM', 'HIA', 'HEM']))
                        && token.substring(pos + 1, pos + 5) != 'HORE') {
                add('K');
                pos++;
            } else {
                if((subMatchAbsolute(0, 3, ['VAN', 'VON']) || token.substring(0,  3) == 'SCH')
                    || subMatch(-2, 4, ['ORCHES', 'ARCHIT', 'ORCHID'])
                    || subMatch(2, 3, ['T', 'S'])
                    || ((subMatch(-1, 0, ['A', 'O', 'U', 'E']) || pos == 0) 
                        && subMatch(2, 3, ['B', 'F', 'H', 'L', 'M', 'N', 'R', 'V', 'W']))) {
                    add('K');
                } else if(pos > 0) {
                    if(token.substring(0, 2) == 'MC') {
                        add('K');
                    } else {
                        addSecondary('X', 'K');   
                    }
                } else {
                    add('X');
                }

                pos++;
            } 
        } else if(token.substring(pos, pos + 2) == 'CZ' 
                && token.substring(pos - 2, pos + 1) != 'WICZ') {
            addSecondary('S', 'X');
            pos++;
        } else if(token.substring(pos, pos + 3) == 'CIA') {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'C' && pos != 1 && token[0] != 'M') {
            if(['I', 'E', 'H'].indexOf(token[pos + 2]) > -1 
                    && token.substring(pos + 2, pos + 4) != 'HU') {
                if(pos == 1 && token[pos - 1] == 'A'
                        || subMatch(-1, 4, ['UCCEE', 'UCCES'])) {
                    add('KS');
                } else {
                   add('X');
                }

               pos +=2;
            } else {
                add('K');
                pos++;
            }
        } else if(['K', 'G', 'Q'].indexOf(token[pos + 1]) > -1) {
            add('K');
            pos++;
        } else if(['E', 'I', 'Y'].indexOf(token[pos + 1]) > -1) {
            if(subMatch(1, 3, ['IA', 'IE', 'IO'])) {
                addSecondary('S', 'X');   
            } else {
                add('S');
            }
            pos++;
        } else {            
            add('K');
            if(token[pos + 1] == ' ' && ['C', 'Q', 'G'].indexOf(token[pos + 2])) {
                pos += 2;
            } else if(['C', 'K', 'Q'].indexOf(token[pos + 1]) > -1
                    && !subMatch(1, 3, ['CE', 'CI'])) {
                pos++;
            } 
        }
    }

    function handleD() {
    	if(token[pos + 1] == 'G') {
    		if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1)  {
    			add('J');
    			pos += 2;
    		} else {
    			add('TK');
    			pos++;
    		}
	    } else if(token[pos + 1] == 'T') {
    		add('T');
	    	pos++;    		
    	} else
    		addCompressedDouble('D', 'T');
    }

    function handleG() {
        if(token[pos + 1] == 'H') {
            if(pos > 0 && !isVowel(token[pos - 1])) {
                add('K');
                pos++;
            } else if(pos == 0) {
                if(token[pos + 2] == 'I') {
                    add('J');
                } else {
                    add('K');
                }
                pos++;
            } else if(pos > 1 
                && (['B', 'H', 'D'].indexOf(token[pos - 2]) > -1
                    || ['B', 'H', 'D'].indexOf(token[pos - 3]) > -1
                    || ['B', 'H'].indexOf(token[pos - 4]) > -1)) {
                pos++;
            } else {
                if(pos > 2
                        && token[pos - 1] == 'U'
                        && ['C', 'G', 'L', 'R', 'T'].indexOf(token[pos - 3]) > -1) {
                    add('F');
                } else if(token[pos - 1] != 'I') {
                    add('K');
                }

                pos++;
            }
        } else if(token[pos + 1] == 'N') {
            if(pos == 1 && startsWithVowel && !slavoGermanic) {
                addSecondary('KN', 'N');
            } else {
                if(token.substring(pos + 2, pos + 4) != 'EY'
                        && (token[pos + 1] != 'Y'
                            && !slavoGermanic)) {
                    addSecondary('N', 'KN');
                } else
                    add('KN');
            }
            pos++;
        } else if(token.substring(pos + 1, pos + 3) == 'LI' && !slavoGermanic) {
            addSecondary('KL', 'L');
            pos++;
        } else if(pos == 0 && (token[pos + 1] == 'Y'                
                || subMatch(1, 3, ['ES', 'EP', 'EB', 'EL', 'EY', 'IB', 'IL', 'IN', 'IE', 'EI', 'ER']))) {
            addSecondary('K', 'J')
        } else {
            addCompressedDouble('G', 'K');
        }
    }

    function handleH() {
		// keep if starts a word or is surrounded by vowels
		if((pos == 0 || isVowel(token[pos - 1])) && isVowel(token[pos + 1])) {
			add('H');
			pos++;
		}    	
    }    

    function handleJ() {
        var jose = (token.substring(pos + 1, pos + 4) == 'OSE');

        if(san || jose) {
            if((pos == 0 && token[pos + 4] == ' ') 
                    || san) {
                add('H');            
            } else
                add('J', 'H');
        } else {
            if(pos == 0/* && !jose*/) {
                addSecondary('J', 'A');
            } else if(isVowel(token[pos - 1]) && !slavoGermanic 
                    && (token[pos + 1] == 'A' || token[pos + 1] == 'O')) {
                addSecondary('J', 'H');
            } else if(pos == token.length - 1) {
                addSecondary('J', ' ');
            } else
                addCompressedDouble('J');
        }
    }

    function handleL() {
    	if(token[pos + 1] == 'L') {
    		if(pos == token.length - 3 && (
    					subMatch(-1, 3, ['ILLO', 'ILLA', 'ALLE']) || (
    						token.substring(pos - 1, pos + 3) == 'ALLE' &&
    						(subMatch(-2, -1, ['AS', 'OS']) > -1 ||
    						['A', 'O'].indexOf(token[token.length - 1]) > -1)))) {
    			addSecondary('L', '');
    			pos++;
    			return;
    		}
    		pos++;	
    	}
    	add('L');
    }

    function handleM() {
    	addCompressedDouble('M');
    	if(token[pos - 1] == 'U' && token[pos + 1] == 'B' && 
    			((pos == token.length - 2  || token.substring(pos + 2, pos + 4) == 'ER')))
    		pos++;
    }

    function handleP() {
    	if(token[pos + 1] == 'H') {
    		add('F');
    		pos++;	
    	} else {
    		addCompressedDouble('P');
    		    		
			if(token[pos + 1] == 'B')
    			pos++;
    	}
    }

    function handleR() {
    	if(pos == token.length - 1 && !slavoGermanic
    			&& token.substring(pos - 2, pos) == 'IE'
    			&& !subMatch(-4, -3, ['ME', 'MA'])) {
    		addSecondary('', 'R');
    	} else
	    	addCompressedDouble('R');    		
    }

    function handleS() {
        if(pos == 0 && token.substring(0, 5) == 'SUGAR') {
            addSecondary('X', 'S');
        } else if(token[pos + 1] == 'H') {
            if(subMatch(2, 5, ['EIM', 'OEK', 'OLM', 'OLZ'])) {
                add('S');
            } else {
                add('X');
            }
            pos++;
        } else if(subMatch(1, 3, ['IO', 'IA'])) {
            if(slavoGermanic) {
                add('S');
            } else {
                addSecondary('S', 'X');
            }
            pos++;
        } else if((pos == 0 && ['M', 'N', 'L', 'W'].indexOf(token[pos + 1]) > -1) 
                || token[pos + 1] == 'Z') {
            addSecondary('S', 'X');
            if(token[pos + 1] == 'Z')
                pos++;
        } else if(token.substring(pos, pos + 2) == 'SC') {
            if(token[pos + 2] == 'H') {
                if(subMatch(3, 5, ['ER', 'EN'])) {
                    addSecondary('X', 'SK');
                } else if(subMatch(3, 5, ['OO', 'UY', 'ED', 'EM'])) {
                    add('SK');
                } else if(pos == 0 && !isVowel(token[3]) && token[3] != 'W') {
                    addSecondary('X', 'S');
                } else {
                    add('X');   
                } 
            } else if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1) {
                add('S');
            } else {
                add('SK');
            }

            pos += 2;            
        } else if(pos == token.length - 1
                && subMatch(-2, 0, ['AI', 'OI'])) {
            addSecondary('', 'S');            
        } else if(token[pos + 1] != 'L' && (
                token[pos - 1] != 'A' && token[pos - 1] != 'I')) {
            addCompressedDouble('S');
            if(token[pos + 1] == 'Z')
                pos++;
        }
    }

    function handleT() {
        if(token.substring(pos + 1, pos + 4) == 'ION') {
            add('XN');
            pos += 3;
        } else if(subMatch(1, 3, ['IA', 'CH'])) {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'H' 
                || token.substring(1, 2) == 'TH') {
            if(subMatch(2, 4, ['OM', 'AM']) 
                    || ['VAN ', 'VON '].indexOf(token.substring(0, 4)) > -1
                    || token.substring(0, 3) == 'SCH') {
                add('T');            
            } else
                addSecondary('0', 'T');
            pos++;
        } else {
            addCompressedDouble('T');

            if(token[pos + 1] == 'D')
                pos++;
        }
    }

    function handleX() {
    	if(pos == 0) {
    		add('S');
    	} else if(!(pos == token.length - 1 
	    		&& (['IAU', 'EAU', 'IEU'].indexOf(token.substring(pos - 3, pos)) > -1
	    			|| ['AU', 'OU'].indexOf(token.substring(pos - 2, pos)) > -1))) {
    		add('KS');
    	}
    }

    function handleW() {
        if(pos == 0) {
            if(token[1] == 'H') {
                add('A');
            } else if (isVowel(token[1])) {
                addSecondary('A', 'F');
            }
        } else if((pos == token.length - 1 && isVowel(token[pos - 1]) 
                    || subMatch(-1, 4, ['EWSKI', 'EWSKY', 'OWSKI', 'OWSKY'])
                    || token.substring(0, 3) == 'SCH')) {
                addSecondary('', 'F');
                pos++;
        } else if(['ICZ', 'ITZ'].indexOf(token.substring(pos + 1, pos + 4)) > -1) {
            addSecondary('TS', 'FX');
            pos += 3;
        }
    }

    function handleZ() {
        if(token[pos + 1] == 'H') {
            add('J');
            pos++;            
        } else if(subMatch(1, 3, ['ZO', 'ZI', 'ZA']) 
                || (slavoGermanic && pos > 0 && token[pos - 1] != 'T')) {
            addSecondary('S', 'TS');
            pos++; 
        } else
            addCompressedDouble('Z', 'S');
    }

    var san = (token.substring(0, 3) == 'SAN');
    var startsWithVowel = isVowel(token[0]);
    var slavoGermanic = token.match(/(W|K|CZ|WITZ)/);

    if(subMatch(0, 2, ['GN', 'KN', 'PN', 'WR', 'PS'])) {
    	pos++;
    }

    while(pos < token.length) {
    	switch(token[pos]) {
	        case 'A': case 'E': case 'I': case 'O': case 'U': case 'Y': 	        
	        case 'Ê': case 'É': case 'É': case'À':
		        if(pos == 0)
		        	add('A');
		        break;
		    case 'B':
		    	addCompressedDouble('B', 'P');
		    	break;
            case 'C':
                handleC();
                break;
	        case 'Ç':
	            add("S");
	            break;
	        case 'D':
	        	handleD();
	        	break;
	        case 'F': case 'K': case 'N':
	        	addCompressedDouble(token[pos]);
	        	break;
            case 'G':
                handleG();
                break;
	        case 'H':
	        	handleH();
	        	break;
            case 'J':
                handleJ();
                break;
	        case 'L':
	        	handleL();
	        	break;
	        case 'M':
	        	handleM();
	        	break;
	        case 'Ñ':
	        	add('N');
	        	break;
	        case 'P':
	        	handleP();
	        	break;
	        case 'Q':
	        	addCompressedDouble('Q', 'K');
	        	break;
	        case 'R':
	        	handleR();
	        	break;
            case 'S':
                handleS();
                break;
            case 'T':
                handleT();
                break;
	        case 'V':
	        	addCompressedDouble('V', 'F');
	        	break;
            case 'W':
                handleW();
                break;
	        case 'X':
	        	handleX();
	        	break;
	        case 'Z':
	        	handleZ();
	        	break;
    	}

        if(primary.length >= maxLength && secondary.length >= maxLength) {
            break;
        }

    	pos++;
    }    

    return [truncate(primary, maxLength), truncate(secondary, maxLength)];
}

function compare(stringA, stringB) {
    var encodingsA = process(stringA),
        encodingsB = process(stringB);

    return encodingsA[0] == encodingsB[0] || 
        encodingsA[1] == encodingsB[1];
};

DoubleMetaphone.compare = compare
DoubleMetaphone.process = process;
DoubleMetaphone.isVowel = isVowel;

},{"./phonetic":36}],35:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function dedup(token) {
    return token.replace(/([^c])\1/g, '$1');
}

function dropInitialLetters(token) {
    if(token.match(/^(kn|gn|pn|ae|wr)/))
        return token.substr(1, token.length - 1);
        
    return token;
}

function dropBafterMAtEnd(token) {
    return token.replace(/mb$/, 'm');
}

function cTransform(token) {
    token = token.replace(/([^s]|^)(c)(h)/g, '$1x$3').trim();
    token = token.replace(/cia/g, 'xia');
    token = token.replace(/c(i|e|y)/g, 's$1');
    token = token.replace(/c/g, 'k'); 
    
    return token;
}

function dTransform(token) {
    token = token.replace(/d(ge|gy|gi)/g, 'j$1');
    token = token.replace(/d/g, 't');
    
    return token;
}

function dropG(token) {
    token = token.replace(/gh(^$|[^aeiou])/g, 'h$1');
    token = token.replace(/g(n|ned)$/g, '$1');    
    
    return token;
}

function transformG(token) {
    token = token.replace(/([^g]|^)(g)(i|e|y)/g, '$1j$3');
    token = token.replace(/gg/g, 'g');
    token = token.replace(/g/g, 'k');    
    
    return token;
}

function dropH(token) {
    return token.replace(/([aeiou])h([^aeiou])/g, '$1$2');
}

function transformCK(token) {
    return token.replace(/ck/g, 'k');
}
function transformPH(token) {
    return token.replace(/ph/g, 'f');
}

function transformQ(token) {
    return token.replace(/q/g, 'k');
}

function transformS(token) {
    return token.replace(/s(h|io|ia)/g, 'x$1');
}

function transformT(token) {
    token = token.replace(/t(ia|io)/g, 'x$1');
    token = token.replace(/th/, '0');
    
    return token;
}

function dropT(token) {
    return token.replace(/tch/g, 'ch');
}

function transformV(token) {
    return token.replace(/v/g, 'f');
}

function transformWH(token) {
    return token.replace(/^wh/, 'w');
}

function dropW(token) {
    return token.replace(/w([^aeiou]|$)/g, '$1');
}

function transformX(token) {
    token = token.replace(/^x/, 's');
    token = token.replace(/x/g, 'ks');
    return token;
}

function dropY(token) {
    return token.replace(/y([^aeiou]|$)/g, '$1');
}

function transformZ(token) {
    return token.replace(/z/, 's');
}

function dropVowels(token) {
    return token.charAt(0) + token.substr(1, token.length).replace(/[aeiou]/g, '');
}

var Metaphone = new Phonetic();
module.exports = Metaphone;

Metaphone.process = function(token, maxLength) {
    maxLength == maxLength || 32;
    token = token.toLowerCase();
    token = dedup(token);
    token = dropInitialLetters(token);
    token = dropBafterMAtEnd(token);
    token = transformCK(token);
    token = cTransform(token);
    token = dTransform(token);
    token = dropG(token);
    token = transformG(token);
    token = dropH(token);
    token = transformPH(token);
    token = transformQ(token);
    token = transformS(token);
    token = transformX(token);    
    token = transformT(token);
    token = dropT(token);
    token = transformV(token);
    token = transformWH(token);
    token = dropW(token);
    token = dropY(token);
    token = transformZ(token);
    token = dropVowels(token);
    
    token.toUpperCase();
    if(token.length >= maxLength)
        token = token.substring(0, maxLength);        

    return token.toUpperCase();
};

// expose functions for testing    
Metaphone.dedup = dedup;
Metaphone.dropInitialLetters = dropInitialLetters;
Metaphone.dropBafterMAtEnd = dropBafterMAtEnd;
Metaphone.cTransform = cTransform;
Metaphone.dTransform = dTransform;
Metaphone.dropG = dropG;
Metaphone.transformG = transformG;
Metaphone.dropH = dropH;
Metaphone.transformCK = transformCK;
Metaphone.transformPH = transformPH;
Metaphone.transformQ = transformQ;
Metaphone.transformS = transformS;
Metaphone.transformT = transformT;
Metaphone.dropT = dropT;
Metaphone.transformV = transformV;
Metaphone.transformWH = transformWH;
Metaphone.dropW = dropW;
Metaphone.transformX = transformX;
Metaphone.dropY = dropY;
Metaphone.transformZ = transformZ;
Metaphone.dropVowels = dropVowels;

},{"./phonetic":36}],36:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = require('../tokenizers/aggressive_tokenizer'),
    tokenizer = new Tokenizer();

module.exports = function() {
    this.compare = function(stringA, stringB) {
        return this.process(stringA) == this.process(stringB);
    };

    this.attach = function() {
	var phonetic = this;

        String.prototype.soundsLike = function(compareTo) {
            return phonetic.compare(this, compareTo);
        }
        
        String.prototype.phonetics = function() {
            return phonetic.process(this);
        }
	
        String.prototype.tokenizeAndPhoneticize = function(keepStops) {
            var phoneticizedTokens = [];
            
            tokenizer.tokenize(this).forEach(function(token) {
                if(keepStops || stopwords.words.indexOf(token) < 0)
                    phoneticizedTokens.push(token.phonetics());
            });
            
            return phoneticizedTokens;
        }
    };
};

},{"../tokenizers/aggressive_tokenizer":52,"../util/stopwords":62}],37:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function transformLipps(token) {
    return token.replace(/[bfpv]/g, '1');
}

function transformThroats(token) {
    return token.replace(/[cgjkqsxz]/g, '2');
}

function transformToungue(token) {
    return token.replace(/[dt]/g, '3');
}

function transformL(token) {
    return token.replace(/l/g, '4');
}

function transformHum(token) {
    return token.replace(/[mn]/g, '5');
}

function transformR(token) {
    return token.replace(/r/g, '6');
}

function condense(token) {
    return token.replace(/(\d)[hw]?\1+/g, '$1').replace(/[hw]/g, '');
}

function padRight0(token) {
    if(token.length < 4)
        return token + Array(4 - token.length).join('0');
    else
        return token;
}

var SoundEx = new Phonetic();
module.exports = SoundEx;

SoundEx.process = function(token, maxLength) {
    token = token.toLowerCase();
    
    return token.charAt(0).toUpperCase() + padRight0(condense(transformLipps(transformThroats(
        transformToungue(transformL(transformHum(transformR(
            token.substr(1, token.length - 1).replace(/[aeiouy]/g, '')))))))
                )).substr(0, (maxLength && maxLength - 1) || 3);
};

// export for tests;
SoundEx.transformLipps = transformLipps;
SoundEx.transformThroats = transformThroats;
SoundEx.transformToungue = transformToungue;
SoundEx.transformL = transformL;
SoundEx.transformHum = transformHum;
SoundEx.transformR = transformR;
SoundEx.condense = condense;
SoundEx.padRight0 = padRight0;

},{"./phonetic":36}],38:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

exports.rules = {
    "a": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "ia", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "a", 
            "size": "1"
        }
    ], 
    "b": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "bb", 
            "size": "1"
        }
    ], 
    "c": [
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ytic", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ic", 
            "size": "2"
       }, 
        {
            "appendage": "t", 
            "continuation": true, 
            "intact": false, 
            "pattern": "nc", 
            "size": "1"
        }
    ], 
    "d": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "dd", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ied", 
            "size": "3"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ceed", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "eed", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ed", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "hood", 
            "size": "4"
        }
    ], 
    "e": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "e", 
            "size": "1"
        }
    ], 
    "f": [
        {
            "appendage": "v", 
            "continuation": false, 
            "intact": false, 
            "pattern": "lief", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "if", 
            "size": "2"
        }
    ], 
    "g": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ing", 
            "size": "3"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iag", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ag", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "gg", 
            "size": "1"
        }
    ], 
    "h": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "th", 
            "size": "2"
        }, 
        {
            "appendage": "c", 
            "continuation": false, 
            "intact": false, 
            "pattern": "guish", 
            "size": "5"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ish", 
            "size": "3"
        }
    ], 
    "i": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "i", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "i", 
            "size": "1"
        }
    ], 
    "j": [
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ij", 
            "size": "1"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "fuj", 
            "size": "1"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "uj", 
            "size": "1"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "oj", 
            "size": "1"
        }, 
        {
            "appendage": "r", 
            "continuation": false, 
            "intact": false, 
            "pattern": "hej", 
            "size": "1"
        }, 
        {
            "appendage": "t", 
            "continuation": false, 
            "intact": false, 
            "pattern": "verj", 
            "size": "1"
        }, 
        {
            "appendage": "t", 
            "continuation": false, 
            "intact": false, 
            "pattern": "misj", 
            "size": "2"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "nj", 
            "size": "1"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "j", 
            "size": "1"
        }
    ], 
    "l": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ifiabl", 
            "size": "6"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iabl", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "abl", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ibl", 
            "size": "3"
        }, 
        {
            "appendage": "l", 
            "continuation": true, 
            "intact": false, 
            "pattern": "bil", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "cl", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iful", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ful", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ul", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ial", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ual", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "al", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ll", 
            "size": "1"
        }
    ], 
    "m": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ium", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "um", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ism", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "mm", 
            "size": "1"
        }
    ], 
    "n": [
        {
            "appendage": "j", 
            "continuation": true, 
            "intact": false, 
            "pattern": "sion", 
            "size": "4"
        }, 
        {
            "appendage": "c", 
            "continuation": false, 
            "intact": false, 
            "pattern": "xion", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ion", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ian", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "an", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "een", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "en", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "nn", 
            "size": "1"
        }
    ], 
    "p": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ship", 
            "size": "4"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "pp", 
            "size": "1"
        }
    ], 
    "r": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "er", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ear", 
            "size": "0"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ar", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "or", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ur", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "rr", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "tr", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ier", 
            "size": "3"
        }
    ], 
    "s": [
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ies", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sis", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "is", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ness", 
            "size": "4"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ss", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ous", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "us", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": true, 
            "pattern": "s", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "s", 
            "size": "0"
        }
    ], 
    "t": [
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "plicat", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "at", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ment", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ent", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ant", 
            "size": "3"
        }, 
        {
            "appendage": "b", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ript", 
            "size": "2"
        }, 
        {
            "appendage": "b", 
            "continuation": false, 
            "intact": false, 
            "pattern": "orpt", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "duct", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sumpt", 
            "size": "2"
        }, 
        {
            "appendage": "i", 
            "continuation": false, 
            "intact": false, 
            "pattern": "cept", 
            "size": "2"
        }, 
        {
            "appendage": "v", 
            "continuation": false, 
            "intact": false, 
            "pattern": "olut", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sist", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ist", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "tt", 
            "size": "1"
        }
    ], 
    "u": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "iqu", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ogu", 
            "size": "1"
        }
    ], 
    "v": [
        {
            "appendage": "j", 
            "continuation": true, 
            "intact": false, 
            "pattern": "siv", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "eiv", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "iv", 
            "size": "2"
        }
    ], 
    "y": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "bly", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ily", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ply", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ly", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ogy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "phy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "omy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "opy", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ity", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ety", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "lty", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "istry", 
            "size": "5"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ary", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ory", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ify", 
            "size": "3"
        }, 
        {
            "appendage": "t", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ncy", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "acy", 
            "size": "3"
        }
    ], 
    "z": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "iz", 
            "size": "2"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "yz", 
            "size": "1"
        }
    ]
};


},{}],39:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');
var ruleTable = require('./lancaster_rules').rules;

function acceptable(candidate) {
    if (candidate.match(/^[aeiou]/))
        return (candidate.length > 1);
    else
        return (candidate.length > 2 && candidate.match(/[aeiouy]/));
}

// take a token, look up the applicatble rule section and attempt some stemming!
function applyRuleSection(token, intact) {
    var section = token.substr( - 1);
    var rules = ruleTable[section];

    if (rules) {
        for (var i = 0; i < rules.length; i++) {
            if ((intact || !rules[i].intact)
            // only apply intact rules to intact tokens
            && token.substr(0 - rules[i].pattern.length) == rules[i].pattern) {
                // hack off only as much as the rule indicates
                var result = token.substr(0, token.length - rules[i].size);

                // if the rules wants us to apply an appendage do so
                if (rules[i].appendage)
                    result += rules[i].appendage;

                if (acceptable(result)) {
                    token = result;

                    // see what the rules wants to do next
                    if (rules[i].continuation) {
                        // this rule thinks there still might be stem left. keep at it.
                        // since we've applied a change we'll pass false in for intact
                        return applyRuleSection(result, false);
                    } else {
                        // the rule thinks we're done stemming. drop out.
                        return result;
                    }
                }
            }
        }
    }

    return token;
}

var LancasterStemmer = new Stemmer();
module.exports = LancasterStemmer;

LancasterStemmer.stem = function(token) {
    return applyRuleSection(token.toLowerCase(), true);
}
},{"./lancaster_rules":38,"./stemmer":45}],40:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');

// denote groups of consecutive consonants with a C and consecutive vowels
// with a V.
function categorizeGroups(token) {
    return token.replace(/[^aeiou]+/g, 'C').replace(/[aeiouy]+/g, 'V');
}

// denote single consonants with a C and single vowels with a V
function categorizeChars(token) {
    return token.replace(/[^aeiou]/g, 'C').replace(/[aeiouy]/g, 'V');
}

// calculate the "measure" M of a word. M is the count of VC sequences dropping
// an initial C if it exists and a trailing V if it exists.
function measure(token) {
    if(!token)
	return -1;

    return categorizeGroups(token).replace(/^C/, '').replace(/V$/, '').length / 2;
}

// determine if a token end with a double consonant i.e. happ
function endsWithDoublCons(token) {
    return token.match(/([^aeiou])\1$/);
}

// replace a pattern in a word. if a replacement occurs an optional callback
// can be called to post-process the result. if no match is made NULL is
// returned.
function attemptReplace(token, pattern, replacement, callback) {
    var result = null;
    
    if((typeof pattern == 'string') && token.substr(0 - pattern.length) == pattern)
        result = token.replace(new RegExp(pattern + '$'), replacement);
    else if((pattern instanceof RegExp) && token.match(pattern))
        result = token.replace(pattern, replacement);
        
    if(result && callback)
        return callback(result);
    else
        return result;
}

// attempt to replace a list of patterns/replacements on a token for a minimum
// measure M.
function attemptReplacePatterns(token, replacements, measureThreshold) {
    var replacement = null;

    for(var i = 0; i < replacements.length; i++) {
	if(measureThreshold == null || measure(attemptReplace(token, replacements[i][0], '')) > measureThreshold)
	    replacement = attemptReplace(token, replacements[i][0], replacements[i][1]);

	if(replacement)
	    break;
    }
    
    return replacement;
}

// replace a list of patterns/replacements on a word. if no match is made return
// the original token.
function replacePatterns(token, replacements, measureThreshold) {
    var result = attemptReplacePatterns(token, replacements, measureThreshold);
    token = result == null ? token : result;
    
    return token;
}

// step 1a as defined for the porter stemmer algorithm. 
function step1a(token) {    
    if(token.match(/(ss|i)es$/))
        return token.replace(/(ss|i)es$/, '$1');
 
    if(token.substr(-1) == 's' && token.substr(-2, 1) != 's' && token.length > 3)
        return token.replace(/s?$/, '');
    
    return token;
}

// step 1b as defined for the porter stemmer algorithm. 
function step1b(token) {   
    if(token.substr(-3) == 'eed') {
	if(measure(token.substr(0, token.length - 3)) > 0)
            return token.replace(/eed$/, 'ee');
    } else {
	var result = attemptReplace(token, /ed|ing$/, '', function(token) {	    
	    if(categorizeGroups(token).indexOf('V') > 0) {
		var result = attemptReplacePatterns(token, [['at', 'ate'],  ['bl', 'ble'], ['iz', 'ize']]);

		if(result)
		    return result;
		else {
		    if(endsWithDoublCons(token) && token.match(/[^lsz]$/))
			return token.replace(/([^aeiou])\1$/, '$1');

		    if(measure(token) == 1 && categorizeChars(token).substr(-3) == 'CVC' && token.match(/[^wxy]$/))
			return token + 'e';                            
		}

		return token;
	    }
	    
	    return null;
	});
	
	if(result)
	    return result;
    }

    return token;   
}

// step 1c as defined for the porter stemmer algorithm. 
function step1c(token) {
    if(categorizeGroups(token).substr(-2, 1) == 'V') {
        if(token.substr(-1) == 'y')
            return token.replace(/y$/, 'i');
    }
   
    return token;
}

// step 2 as defined for the porter stemmer algorithm. 
function step2(token) {
    return replacePatterns(token, [['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
        ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'],
        ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'], ['ator', 'ate'],['alism', 'al'],
        ['iveness', 'ive'], ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'],
        ['iviti', 'ive'], ['biliti', 'ble']], 0);
}

// step 3 as defined for the porter stemmer algorithm. 
function step3(token) {
    return replacePatterns(token, [['icate', 'ic'], ['ative', ''], ['alize', 'al'],
				   ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', '']], 0); 
}

// step 4 as defined for the porter stemmer algorithm. 
function step4(token) {
    return replacePatterns(token, [['al', ''], ['ance', ''], ['ence', ''], ['er', ''], 
        ['ic', ''], ['able', ''], ['ible', ''], ['ant', ''],
        ['ement', ''], ['ment', ''], ['ent', ''], [/([st])ion/, '$1'], ['ou', ''], ['ism', ''],
        ['ate', ''], ['iti', ''], ['ous', ''], ['ive', ''], 
        ['ize', '']], 1);
}

// step 5a as defined for the porter stemmer algorithm. 
function step5a(token) {
    var m = measure(token);
    
    if(token.length > 3 && ((m > 1 && token.substr(-1) == 'e') || (m == 1 && !(categorizeChars(token).substr(-4, 3) == 'CVC' && token.match(/[^wxy].$/)))))
        return token.replace(/e$/, '');

    return token;
}

// step 5b as defined for the porter stemmer algorithm. 
function step5b(token) {
    if(measure(token) > 1) {
        if(endsWithDoublCons(token) && token.substr(-2) == 'll')
           return token.replace(/ll$/, 'l'); 
    }
    
    return token;
}

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    return step5b(step5a(step4(step3(step2(step1c(step1b(step1a(token.toLowerCase())))))))).toString();
};

//exports for tests
PorterStemmer.step1a = step1a;
PorterStemmer.step1b = step1b;
PorterStemmer.step1c = step1c;
PorterStemmer.step2 = step2;
PorterStemmer.step3 = step3;
PorterStemmer.step4 = step4;
PorterStemmer.step5a = step5a;
PorterStemmer.step5b = step5b;

},{"./stemmer":45}],41:[function(require,module,exports){
/*
Copyright (c) 2012, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_es');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


function isVowel(letter){
	return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'á' || letter == 'é' ||
			letter == 'í' || letter == 'ó' || letter == 'ú');
};

function getNextVowelPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (isVowel(token[i])) return i;
			return length;
};

function getNextConsonantPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (!isVowel(token[i])) return i;
			return length;
};


function endsin(token, suffix) {
	if (token.length < suffix.length) return false;
	return (token.slice(-suffix.length) == suffix);
};

function endsinArr(token, suffixes) {
	for(var i=0;i<suffixes.length;i++){
		if (endsin(token, suffixes[i])) return suffixes[i];
	}
	return '';
};

function removeAccent(token) {
	var str=token.replace(/á/gi,'a');
	str=str.replace(/é/gi,'e');
	str=str.replace(/í/gi,'i');
	str=str.replace(/ó/gi,'o');
	str=str.replace(/ú/gi,'u');
	return str;
};


// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase();

	if (token.length<3){
		return token;
	}

	var r1,r2,rv,len= token.length;
	//looking for regions after vowels

	for(var i=0; i< token.length-1 && r1==len;i++){
 		if(isVowel(token[i]) && !isVowel(token[i+1]) ){
 			r1=i+2;
 		}

	}

	for(var i=r1; i< token.length-1 && r2==len;i++){
		if(isVowel(token[i]) && !isVowel(token[i+1])){
			r2=i+2;
		}
	}

	if (len > 3) {
			if(isVowel(token[1])) {
				// If the second letter is a consonant, RV is the region after the next following vowel
				rv = getNextVowelPos(token, 2) +1;
			} else if (isVowel(token[0]) && isVowel(token[1])) { 
				// or if the first two letters are vowels, RV is the region after the next consonant
				rv = getNextConsonantPos(token, 2) + 1;
			} else {
				//otherwise (consonant-vowel case) RV is the region after the third letter. But RV is the end of the word if these positions cannot be found.
				rv = 3;
			}
		}

	var r1_txt = token.substring(r1-1);
	var r2_txt = token.substring(r2-1);
	var rv_txt = token.substring(rv-1);


	var token_orig = token;

	// Step 0: Attached pronoun
	var pronoun_suf = new Array('me', 'se', 'sela', 'selo', 'selas', 'selos', 'la', 'le', 'lo', 'las', 'les', 'los', 'nos');	
	var pronoun_suf_pre1 = new Array('éndo', 'ándo', 'ár', 'ér', 'ír');	
	var pronoun_suf_pre2 = new Array('ando', 'iendo', 'ar', 'er', 'ir');
	var suf = endsinArr(token, pronoun_suf);

    
	if (suf!='') {

		var pre_suff = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre1);
		
		if (pre_suff != '') {
				
				token = removeAccent(token.slice(0,-suf.length));
		} else {
			var pre_suff = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre2);
			
			if (pre_suff != '' ||
				(endsin(token, 'yendo' ) && 
				(token.slice(-suf.length-6,1) == 'u'))) {
				token = token.slice(0,-suf.length);
			}
		}
	}
		
		if (token != token_orig) {
			r1_txt = token.substring(r1-1);
			r2_txt = token.substring(r2-1);
			rv_txt = token.substring(rv-1);
		}
		var token_after0 = token;
		
		if ((suf = endsinArr(r2_txt, new Array('anza', 'anzas', 'ico', 'ica', 'icos', 'icas', 'ismo', 'ismos', 'able', 'ables', 'ible', 'ibles', 'ista', 'istas', 'oso', 'osa', 'osos', 'osas', 'amiento', 'amientos', 'imiento', 'imientos'))) != '') {
			token = token.slice(0, -suf.length);	
		} else if ((suf = endsinArr(r2_txt, new  Array('icadora', 'icador', 'icación', 'icadoras', 'icadores', 'icaciones', 'icante', 'icantes', 'icancia', 'icancias', 'adora', 'ador', 'ación', 'adoras', 'adores', 'aciones', 'ante', 'antes', 'ancia', 'ancias'))) != '') {
			token = token.slice(0,  -suf.length);	
		} else if ((suf = endsinArr(r2_txt, new  Array('logía', 'logías'))) != '') {
			token = token.slice(0,  -suf.length)+ 'log';
		} else if ((suf =endsinArr(r2_txt, new  Array('ución', 'uciones'))) != '') {
			token = token.slice(0,  -suf.length) + 'u';
		} else if ((suf = endsinArr(r2_txt, new  Array('encia', 'encias'))) != '') {
			token = token.slice(0,  -suf.length)+ 'ente';
		} else if ((suf = endsinArr(r2_txt, new  Array('ativamente', 'ivamente', 'osamente', 'icamente', 'adamente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r1_txt, new  Array('amente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('antemente', 'ablemente', 'iblemente', 'mente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('abilidad', 'abilidades', 'icidad', 'icidades', 'ividad', 'ividades', 'idad', 'idades'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('ativa', 'ativo', 'ativas', 'ativos', 'iva', 'ivo', 'ivas', 'ivos'))) != '') {
			token = token.slice(0,  -suf.length);
		}

		if (token != token_after0) {
			r1_txt = token.substring(r1-1);
			r2_txt = token.substring(r2-1);
			rv_txt = token.substring(rv-1);
		}
		var token_after1 = token;
		
		if (token_after0 == token_after1) {
			// Do step 2a if no ending was removed by step 1. 
			if ((suf = endsinArr(rv_txt, new Array('ya', 'ye', 'yan', 'yen', 'yeron', 'yendo', 'yo', 'yó', 'yas', 'yes', 'yais', 'yamos'))) != '' && (token.substring(suf.length-1,1) == 'u')) {
				token = token.slice(0, -suf.length);
			}
			
			if (token != token_after1) {
				r1_txt = token.substring(r1-1);
				r2_txt = token.substring(r2-1);
				rv_txt = token.substring(rv-1);
			}
			var token_after2a = token;
			
			// Do Step 2b if step 2a was done, but failed to remove a suffix. 
			if (token_after2a == token_after1) {
				
				if ((suf = endsinArr(rv_txt,new Array('en', 'es', 'éis', 'emos'))) != '') {
					token = token.slice(0,-suf.length);
					if (endsin(token, 'gu')) {
						token = token.slice(0,-1);
					}
				} else if ((suf = endsinArr(rv_txt, new Array('arían', 'arías', 'arán', 'arás', 'aríais', 'aría', 'aréis', 'aríamos', 'aremos', 'ará', 'aré', 'erían', 'erías', 'erán', 'erás', 'eríais', 'ería', 'eréis', 'eríamos', 'eremos', 'erá', 'eré', 'irían', 'irías', 'irán', 'irás', 'iríais', 'iría', 'iréis', 'iríamos', 'iremos', 'irá', 'iré', 'aba', 'ada', 'ida', 'ía', 'ara', 'iera', 'ad', 'ed', 'id', 'ase', 'iese', 'aste', 'iste', 'an', 'aban', 'ían', 'aran', 'ieran', 'asen', 'iesen', 'aron', 'ieron', 'ado', 'ido', 'ando', 'iendo', 'ió', 'ar', 'er', 'ir', 'as', 'abas', 'adas', 'idas', 'ías', 'aras', 'ieras', 'ases', 'ieses', 'ís', 'áis', 'abais', 'íais', 'arais', 'ierais', '  aseis', 'ieseis', 'asteis', 'isteis', 'ados', 'idos', 'amos', 'ábamos', 'íamos', 'imos', 'áramos', 'iéramos', 'iésemos', 'ásemos'))) != '') {
					
					token = token.slice(0, -suf.length);
					
				}
			}
		}

		// Always do step 3. 
		r1_txt = token.substring(r1-1);
		r2_txt = token.substring(r2-1);
		rv_txt = token.substring(rv-1);

		if ((suf = endsinArr(rv_txt, new Array('os', 'a', 'o', 'á', 'í', 'ó'))) != '') {
			token = token.slice(0, -suf.length);
		} else if ((suf = endsinArr(rv_txt ,new Array('e','é'))) != '') {
			token = token.slice(0,-1);
			rv_txt = token.substring(rv-1);
			if (endsin(rv_txt,'u') && endsin(token,'gu')) {
				token = token.slice(0,-1);
			}
		}
		
		return removeAccent(token);

};

},{"./stemmer_es":46}],42:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Porter Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_fa');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// disabled stemming for Farsi
// Farsi stemming will be supported soon
PorterStemmer.stem = function(token) {
    return token;
};
},{"./stemmer_fa":47}],43:[function(require,module,exports){
/*
Copyright (c) 2012, Leonardo Fenu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_it');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


function isVowel(letter){
	return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'à' ||
			letter == 'è' || letter == 'ì' || letter == 'ò' || letter == 'ù');
};

function getNextVowelPos(token,start){
	start = start + 1;
	var length = token.length;
	for (var i = start; i < length; i++) {
		if (isVowel(token[i])) {
			return i;
		}
	}
	return length;
};

function getNextConsonantPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (!isVowel(token[i])) return i;
			return length;
};


function endsin(token, suffix) {
	if (token.length < suffix.length) return false;
	return (token.slice(-suffix.length) == suffix);
};

function endsinArr(token, suffixes) {
	for(var i=0;i<suffixes.length;i++){
		if (endsin(token, suffixes[i])) return suffixes[i];
	}
	return '';
};

function replaceAcute(token) {
	var str=token.replace(/á/gi,'à');
	str=str.replace(/é/gi,'è');
	str=str.replace(/í/gi,'ì');
	str=str.replace(/ó/gi,'ò');
	str=str.replace(/ú/gi,'ù');
	return str;
};

function vowelMarking(token) {
	function replacer(match, p1, p2, p3){
  		return p1+p2.toUpperCase()+p3;
	};	
	str=token.replace(/([aeiou])(i|u)([aeiou])/g, replacer);	
	return str;
}


// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	
	token = token.toLowerCase();
	token = replaceAcute(token);
	token = token.replace(/qu/g,'qU');	
	token = vowelMarking(token);
	
	if (token.length<3){
		return token;
	}

	var r1 = r2 = rv = len = token.length;
	// R1 is the region after the first non-vowel following a vowel, 
	for(var i=0; i < token.length-1 && r1==len;i++){
 		if(isVowel(token[i]) && !isVowel(token[i+1]) ){
 			r1=i+2;
 		}
	}
	// Or is the null region at the end of the word if there is no such non-vowel.  

	// R2 is the region after the first non-vowel following a vowel in R1
	for(var i=r1; i< token.length-1 && r2==len;i++){
		if(isVowel(token[i]) && !isVowel(token[i+1])){
			r2=i+2;
		}
	}

	// Or is the null region at the end of the word if there is no such non-vowel. 

	// If the second letter is a consonant, RV is the region after the next following vowel, 
	
	// RV as follow

	if (len > 3) {
		if(!isVowel(token[1])) {
			// If the second letter is a consonant, RV is the region after the next following vowel
			rv = getNextVowelPos(token, 1) +1;
		} else if (isVowel(token[0]) && isVowel(token[1])) { 
			// or if the first two letters are vowels, RV is the region after the next consonant
			rv = getNextConsonantPos(token, 2) + 1;
		} else {
			//otherwise (consonant-vowel case) RV is the region after the third letter. But RV is the end of the word if these positions cannot be found.
			rv = 3;
		}
	}

	var r1_txt = token.substring(r1);
	var r2_txt = token.substring(r2);
	var rv_txt = token.substring(rv);

	var token_orig = token;

	// Step 0: Attached pronoun

	var pronoun_suf = new Array('glieli','glielo','gliene','gliela','gliele','sene','tene','cela','cele','celi','celo','cene','vela','vele','veli','velo','vene','mela','mele','meli','melo','mene','tela','tele','teli','telo','gli','ci', 'la','le','li','lo','mi','ne','si','ti','vi');	
	var pronoun_suf_pre1 = new Array('ando','endo');	
	var pronoun_suf_pre2 = new Array('ar', 'er', 'ir');
	var suf = endsinArr(token, pronoun_suf);

	if (suf!='') {
		var pre_suff1 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre1);
		var pre_suff2 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre2);	
		
		if (pre_suff1 != '') {
			token = token.slice(0,-suf.length);
		}
		if (pre_suff2 != '') {
			token = token.slice(0,  -suf.length)+ 'e';
		}
	}

	if (token != token_orig) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}

	var token_after0 = token;

	// Step 1:  Standard suffix removal
	
	if ((suf = endsinArr(r2_txt, new  Array('ativamente','abilamente','ivamente','osamente','icamente'))) != '') {
		token = token.slice(0, -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icazione','icazioni','icatore','icatori','azione','azioni','atore','atori'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('logia','logie'))) != '') {
		token = token.slice(0,  -suf.length)+ 'log'; // replace with log
	} else if ((suf =endsinArr(r2_txt, new  Array('uzione','uzioni','usione','usioni'))) != '') {
		token = token.slice(0,  -suf.length) + 'u'; // replace with u
	} else if ((suf = endsinArr(r2_txt, new  Array('enza','enze'))) != '') {
		token = token.slice(0,  -suf.length)+ 'ente'; // replace with ente
	} else if ((suf = endsinArr(rv_txt, new  Array('amento', 'amenti', 'imento', 'imenti'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r1_txt, new  Array('amente'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new Array('atrice','atrici','abile','abili','ibile','ibili','mente','ante','anti','anza','anze','iche','ichi','ismo','ismi','ista','iste','isti','istà','istè','istì','ico','ici','ica','ice','oso','osi','osa','ose'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('abilità', 'icità', 'ività', 'ità'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icativa','icativo','icativi','icative','ativa','ativo','ativi','ative','iva','ivo','ivi','ive'))) != '') {
		token = token.slice(0,  -suf.length);
	}
	
	
	if (token != token_after0) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}
	

	var token_after1 = token;
	
	// Step 2:  Verb suffixes

	if (token_after0 == token_after1) {
		if ((suf = endsinArr(rv_txt, new Array('erebbero','irebbero','assero','assimo','eranno','erebbe','eremmo','ereste','eresti','essero','iranno','irebbe','iremmo','ireste','iresti','iscano','iscono','issero','arono','avamo','avano','avate','eremo','erete','erono','evamo','evano','evate','iremo','irete','irono','ivamo','ivano','ivate','ammo','ando','asse','assi','emmo','enda','ende','endi','endo','erai','Yamo','iamo','immo','irai','irei','isca','isce','isci','isco','erei','uti','uto','ita','ite','iti','ito','iva','ivi','ivo','ono','uta','ute','ano','are','ata','ate','ati','ato','ava','avi','avo','erà','ere','erò','ete','eva','evi','evo','irà','ire','irò','ar','ir'))) != '') {
			token = token.slice(0, -suf.length);
		}
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	// Always do step 3. 

	if ((suf = endsinArr(rv_txt, new Array('ia', 'ie', 'ii', 'io', 'ià', 'iè','iì', 'iò','a','e','i','o','à','è','ì','ò'))) != '') {
		token = token.slice(0, -suf.length);
	} 

	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);
	
	if ((suf =endsinArr(rv_txt, new  Array('ch'))) != '') {
		token = token.slice(0,  -suf.length) + 'c'; // replace with c
	} else if ((suf =endsinArr(rv_txt, new  Array('gh'))) != '') {
		token = token.slice(0,  -suf.length) + 'g'; // replace with g
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	return token.toLowerCase();

};
},{"./stemmer_it":48}],44:[function(require,module,exports){
/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_ru');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

function attemptReplacePatterns(token, patterns) {
	var replacement = null;
	var i = 0, isReplaced = false;
	while ((i < patterns.length) && !isReplaced) {
		if (patterns[i][0].test(token)) {
			replacement = token.replace(patterns[i][0], patterns[i][1]);
			isReplaced = true;
		}
		i++;
	}
	return replacement;
};

function perfectiveGerund(token) {
	var result = attemptReplacePatterns(token, [
			[/[ая]в(ши|шись)$/g, ''],
			[/(ив|ивши|ившись|ывши|ывшись|ыв)$/g, '']
		]);
	return result;
};

function adjectival(token) {
	var result = adjective(token);
	if (result != null) {
		var pariticipleResult = participle(result);
		result = pariticipleResult ? pariticipleResult : result;
	}
	return result;
};

function adjective(token) {
	var result = attemptReplacePatterns(token, [
			[/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/g, '']
		]);
	return result;
};

function participle(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ем|нн|вш|ющ|щ)$/g, '$1'],
		[/(ивш|ывш|ующ)$/g, '']
	]);
	return result;
};

function reflexive(token) {
	var result = attemptReplacePatterns(token, [
		[/(ся|сь)$/g, '']
	]);
	return result;
};

function verb(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/g, '$1'],
		[/(ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|ит|ыт|ены|ить|ыть|ишь|ую|ю)$/g, '']
	]);
	return result;
};

function noun(token) {
	var result = attemptReplacePatterns(token, [
		[/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/g, '']
	]);
	return result;
};

function superlative (token) {
	var result = attemptReplacePatterns(token, [
		[/(ейш|ейше)$/g, '']
	]);
	return result;
};

function derivational (token) {
	var result = attemptReplacePatterns(token, [
		[/(ост|ость)$/g, '']
	]);
	return result;
};

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase().replace(/ё/g, 'е');
	var volwesRegexp = /^(.*?[аеиоюяуыиэ])(.*)$/g;
	var RV = volwesRegexp.exec(token);
	if (!RV || RV.length < 3) {
		return token;
	}
	var head = RV[1];
	RV = RV[2];
	volwesRegexp.lastIndex = 0;
	var R2 = volwesRegexp.exec(RV);
	var result = perfectiveGerund(RV);
	if (result === null) {
		var resultReflexive = reflexive(RV) || RV;
		result = adjectival(resultReflexive);
		if (result === null) {
			result = verb(resultReflexive);
			if (result === null) {
				result = noun(resultReflexive);
				if (result === null) {
					result = resultReflexive;
				}
			}
		}
	}
	result = result.replace(/и$/g, '');
	var derivationalResult = result
	if (R2 && R2[2]) {
		derivationalResult = derivational(R2[2]);
		if (derivationalResult != null) {
			derivationalResult = derivational(result);
		} else {
			derivationalResult = result;
		}
	}

	var superlativeResult = superlative(derivationalResult) || derivationalResult;

	superlativeResult = superlativeResult.replace(/(н)н/g, '$1');
	superlativeResult = superlativeResult.replace(/ь$/g, '');
	return head + superlativeResult;
};

},{"./stemmer_ru":50}],45:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = require('../tokenizers/aggressive_tokenizer');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer":52,"../util/stopwords":62}],46:[function(require,module,exports){
/*
Copyright (c) 2012, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_es');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_es');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[а-záéíóúüñ0-9]+', 'gi'))) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_es":53,"../util/stopwords_es":63}],47:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_fa');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_fa');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_fa":54,"../util/stopwords_fa":64}],48:[function(require,module,exports){
var stopwords = require('../util/stopwords_it');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_it');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(/[a-zàèìòù0-9]/gi)) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}
},{"../tokenizers/aggressive_tokenizer_it":55,"../util/stopwords_it":65}],49:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A very basic stemmer that performs the following steps:
 * * Stem katakana.
 * Inspired by:
 * http://svn.apache.org/repos/asf/lucene/dev/trunk/lucene/analysis/kuromoji/src/java/org/apache/lucene/analysis/ja/JapaneseKatakanaStemFilter.java
 *
 * This script assumes input is normalized using normalizer_ja().
 *
 * \@todo Use .bind() in StemmerJa.prototype.attach().
 */

var Tokenizer = require('../tokenizers/tokenizer_ja');
var stopwords = require('../util/stopwords_ja');



/**
 * @constructor
 */
var StemmerJa = function() {
};


/**
 * Tokenize and stem a text.
 * Stop words are excluded except if the second argument is true.
 *
 * @param {string} text
 * @param {boolean} keepStops Whether to keep stop words from the output or not.
 * @return {Array.<string>}
 */
StemmerJa.prototype.tokenizeAndStem = function(text, keepStops) {
  var self = this;
  var stemmedTokens = [];
  var tokens = new Tokenizer().tokenize(text);

  // This is probably faster than an if at each iteration.
  if (keepStops) {
    tokens.forEach(function(token) {
      var resultToken = token.toLowerCase();
      resultToken = self.stem(resultToken);
      stemmedTokens.push(resultToken);
    });
  } else {
    tokens.forEach(function(token) {
      if (stopwords.indexOf(token) == -1) {
        var resultToken = token.toLowerCase();
        resultToken = self.stem(resultToken);
        stemmedTokens.push(resultToken);
      }
    });
  }

  return stemmedTokens;
};


/**
 * Stem a term.
 *
 * @param {string} token
 * @return {string}
 */
StemmerJa.prototype.stem = function(token) {
  token = this.stemKatakana(token);

  return token;
};


/**
 * Remove the final prolonged sound mark on katakana if length is superior to
 * a threshold.
 *
 * @param {string} token A katakana string to stem.
 * @return {string} A katakana string stemmed.
 */
StemmerJa.prototype.stemKatakana = function(token) {
  var HIRAGANA_KATAKANA_PROLONGED_SOUND_MARK = 'ー';
  var DEFAULT_MINIMUM_LENGTH = 4;

  if (token.length >= DEFAULT_MINIMUM_LENGTH
      && token.slice(-1) === HIRAGANA_KATAKANA_PROLONGED_SOUND_MARK
      && this.isKatakana(token)) {
    token = token.slice(0, token.length - 1);
  }
  return token;
};


/**
 * Is a string made of fullwidth katakana only?
 * This implementation is the fastest I know:
 * http://jsperf.com/string-contain-katakana-only/2
 *
 * @param {string} str A string.
 * @return {boolean} True if the string has katakana only.
 */
StemmerJa.prototype.isKatakana = function(str) {
  return !!str.match(/^[゠-ヿ]+$/);
};

// Expose an attach function that will patch String with new methods.
StemmerJa.prototype.attach = function() {
  var self = this;

  String.prototype.stem = function() {
    return self.stem(this);
  };

  String.prototype.tokenizeAndStem = function(keepStops) {
    return self.tokenizeAndStem(this, keepStops);
  };
};

module.exports = StemmerJa;

},{"../tokenizers/tokenizer_ja":59,"../util/stopwords_ja":66}],50:[function(require,module,exports){
/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_ru');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_ru');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[а-яё0-9]+', 'gi'))) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_ru":56,"../util/stopwords_ru":67}],51:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer(),
    stopwords = require('../util/stopwords').words,
    fs = require('fs');

function buildDocument(text, key) {
    var stopOut;
    
    if(typeof text === 'string') {
        text = tokenizer.tokenize(text.toLowerCase());
        stopOut = true;
    } else if(!_.isArray(text)) {
        return text;
        stopOut = false;
    }

    return text.reduce(function(document, term) {
        if(!stopOut || stopwords.indexOf(term) < 0)
            document[term] = (document[term] ? document[term] + 1 : 1);
            
        return document;
    }, {__key: key});
}

function tf(term, document) {
    return document[term] ? document[term]: 0;
}

function documentHasTerm(term, document) {
    return document[term] && document[term] > 0;
}

function TfIdf(deserialized) {
    if(deserialized)
        this.documents = deserialized.documents;
    else
        this.documents = [];

    this._idfCache = {};
}

module.exports = TfIdf;
TfIdf.tf = tf;

TfIdf.prototype.idf = function(term, force) {

    // Lookup the term in the New term-IDF caching, 
    // this will cut search times down exponentially on large document sets.
    if(this._idfCache[term] && force !== true)
        return this._idfCache[term];

    var docsWithTerm = this.documents.reduce(function(count, document) {
        return count + (documentHasTerm(term, document) ? 1 : 0);
    }, 0);

    var idf = Math.log((this.documents.length) / (docsWithTerm));

    // Add the idf to the term cache and return it
    this._idfCache[term] = idf;
    return idf;
};

// If restoreCache is set to true, all terms idf scores currently cached will be recomputed.
// Otherwise, the cache will just be wiped clean
TfIdf.prototype.addDocument = function(document, key, restoreCache) {
    this.documents.push(buildDocument(document, key));

    // make sure the cache is invalidated when new documents arrive
    if(restoreCache === true) {
        for(var term in this._idfCache) {
            // invoking idf with the force option set will 
            // force a recomputation of the idf, and it will
            // automatically refresh the cache value.
            this.idf(term, true);
        }
    }
    else {
        this._idfCache = {};
    }
};

// If restoreCache is set to true, all terms idf scores currently cached will be recomputed.
// Otherwise, the cache will just be wiped clean
TfIdf.prototype.addFileSync = function(path, encoding, key, restoreCache) {
    if(!encoding)
        encoding = 'UTF-8';
        
    var document = fs.readFileSync(path, 'UTF-8');
    this.documents.push(buildDocument(document, key));

    // make sure the cache is invalidated when new documents arrive
    if(restoreCache === true) {
        for(var term in this._idfCache) {
            // invoking idf with the force option set will 
            // force a recomputation of the idf, and it will
            // automatically refresh the cache value.
            this.idf(term, true);
        }
    }
    else {
        this._idfCache = {};
    }
};

TfIdf.prototype.tfidf = function(terms, d) {
    var _this = this;
    
    if(!_.isArray(terms))
        terms = tokenizer.tokenize(terms.toString().toLowerCase());
    
    return terms.reduce(function(value, term) {
        return value + (tf(term, _this.documents[d]) * _this.idf(term));
    }, 0.0);
};

TfIdf.prototype.listTerms = function(d) {
    var terms = [];

    for(var term in this.documents[d]) {
        if(term != '__key')
    	   terms.push({term: term, tfidf: this.tfidf(term, d)})
    }

    return terms.sort(function(x, y) { return y.tfidf - x.tfidf });
}

TfIdf.prototype.tfidfs = function(terms, callback) {
    var tfidfs = new Array(this.documents.length);
    
    for(var i = 0; i < this.documents.length; i++) {
        tfidfs[i] = this.tfidf(terms, i);
        
        if(callback)
            callback(i, tfidfs[i], this.documents[i].__key);
    }

    return tfidfs;
};

},{"../tokenizers/regexp_tokenizer":57,"../util/stopwords":62,"fs":87,"underscore":85}],52:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

},{"./tokenizer":58,"util":94}],53:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

},{"./tokenizer":58,"util":94}],54:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Aggressive Tokenizer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.clearEmptyString = function(array) {
	return array.filter(function(a) {
		return a != '';
	});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(new RegExp('\.\:\+\-\=\(\)\"\'\!\?\،\,\؛\;', 'g'), ' ');
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    text = this.clearText(text);
    return this.clearEmptyString(text.split(/\s+/));
};

},{"./tokenizer":58,"util":94}],55:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

},{"./tokenizer":58,"util":94}],56:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};

util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.withoutEmpty = function(array) {
	return array.filter(function(a) {return a;});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(/[^a-zа-яё0-9]/gi, ' ').replace(/[\s\n]+/g, ' ').trim();
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.withoutEmpty(this.clearText(text).split(' '));
};

},{"./tokenizer":58,"util":94}],57:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require("util"),
    _ = require('underscore')._;

// Base Class for RegExp Matching
var RegexpTokenizer = function(options) {
    var options = options || {};
    this._pattern = options.pattern || this._pattern;
    this.discardEmpty = options.discardEmpty || true;

    // Match and split on GAPS not the actual WORDS
    this._gaps = options.gaps;
    
    if (this._gaps === undefined) {
        this._gaps = true;
    }
};

util.inherits(RegexpTokenizer, Tokenizer);

RegexpTokenizer.prototype.tokenize = function(s) {
    var results;

    if (this._gaps) {
        results = s.split(this._pattern);
        return (this.discardEmpty) ? _.without(results,'',' ') : results;
    } else {
        return s.match(this._pattern);
    }
};

exports.RegexpTokenizer = RegexpTokenizer;

/***
 * A tokenizer that divides a text into sequences of alphabetic and
 * non-alphabetic characters.  E.g.:
 *
 *      >>> WordTokenizer().tokenize("She said 'hello'.")
 *      ['She', 'said', 'hello']
 * 
 */
var WordTokenizer = function(options) {
    this._pattern = /\W+/;
    RegexpTokenizer.call(this,options)
};

util.inherits(WordTokenizer, RegexpTokenizer);
exports.WordTokenizer = WordTokenizer;

/***
 * A tokenizer that divides a text into sequences of alphabetic and
 * non-alphabetic characters.  E.g.:
 *
 *      >>> WordPunctTokenizer().tokenize("She said 'hello'.")
 *      ['She', 'said', "'", 'hello', "'."]
 * 
 */
var WordPunctTokenizer = function(options) {
    this._pattern = new RegExp(/(\w+|\!|\'|\"")/i);
    RegexpTokenizer.call(this,options)
};

util.inherits(WordPunctTokenizer, RegexpTokenizer);
exports.WordPunctTokenizer = WordPunctTokenizer;

},{"./tokenizer":58,"underscore":85,"util":94}],58:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * \@todo Use .bind() in Tokenizer.prototype.attach().
 */

var Tokenizer = function() {
};

Tokenizer.prototype.trim = function(array) {
  if (array[array.length - 1] == '')
    array.pop();

  if (array[0] == '')
    array.shift();

  return array;
};

// Expose an attach function that will patch String with new methods.
Tokenizer.prototype.attach = function() {
  var self = this;

  String.prototype.tokenize = function() {
    return self.tokenize(this);
  }
};

Tokenizer.prototype.tokenize = function() {};

module.exports = Tokenizer;

},{}],59:[function(require,module,exports){
// Original copyright:
/*
 Copyright (c) 2008, Taku Kudo

 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of the <ORGANIZATION> nor the names of its
 contributors may be used to endorse or promote products derived from this
 software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// This version:
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

// TinySegmenter 0.1 -- Super compact Japanese tokenizer in Javascript
// (c) 2008 Taku Kudo <taku@chasen.org>
// TinySegmenter is freely distributable under the terms of a new BSD licence.
// For details, see http://chasen.org/~taku/software/TinySegmenter/LICENCE.txt

var Tokenizer = require('./tokenizer'),
    normalize = require('../normalizers/normalizer_ja').normalize_ja,
    util = require('util');



/**
 * @constructor
 */
var TokenizerJa = function() {
  this.chartype_ = [
    [/[〇一二三四五六七八九十百千万億兆]/, 'M'],
    [/[一-鿌〆]/, 'H'],
    [/[ぁ-ゟ]/, 'I'],
    [/[゠-ヿ]/, 'K'],
    [/[a-zA-Z]/, 'A'],
    [/[0-9]/, 'N']
  ];

  this.BIAS__ = -332;
  this.BC1__ = {'HH': 6, 'II': 2461, 'KH': 406, 'OH': -1378};
  this.BC2__ = {'AA': -3267, 'AI': 2744, 'AN': -878, 'HH': -4070, 'HM': -1711, 'HN': 4012, 'HO': 3761, 'IA': 1327, 'IH': -1184, 'II': -1332, 'IK': 1721, 'IO': 5492, 'KI': 3831, 'KK': -8741, 'MH': -3132, 'MK': 3334, 'OO': -2920};
  this.BC3__ = {'HH': 996, 'HI': 626, 'HK': -721, 'HN': -1307, 'HO': -836, 'IH': -301, 'KK': 2762, 'MK': 1079, 'MM': 4034, 'OA': -1652, 'OH': 266};
  this.BP1__ = {'BB': 295, 'OB': 304, 'OO': -125, 'UB': 352};
  this.BP2__ = {'BO': 60, 'OO': -1762};
  this.BQ1__ = {'BHH': 1150, 'BHM': 1521, 'BII': -1158, 'BIM': 886, 'BMH': 1208, 'BNH': 449, 'BOH': -91, 'BOO': -2597, 'OHI': 451, 'OIH': -296, 'OKA': 1851, 'OKH': -1020, 'OKK': 904, 'OOO': 2965};
  this.BQ2__ = {'BHH': 118, 'BHI': -1159, 'BHM': 466, 'BIH': -919, 'BKK': -1720, 'BKO': 864, 'OHH': -1139, 'OHM': -181, 'OIH': 153, 'UHI': -1146};
  this.BQ3__ = {'BHH': -792, 'BHI': 2664, 'BII': -299, 'BKI': 419, 'BMH': 937, 'BMM': 8335, 'BNN': 998, 'BOH': 775, 'OHH': 2174, 'OHM': 439, 'OII': 280, 'OKH': 1798, 'OKI': -793, 'OKO': -2242, 'OMH': -2402, 'OOO': 11699};
  this.BQ4__ = {'BHH': -3895, 'BIH': 3761, 'BII': -4654, 'BIK': 1348, 'BKK': -1806, 'BMI': -3385, 'BOO': -12396, 'OAH': 926, 'OHH': 266, 'OHK': -2036, 'ONN': -973};
  this.BW1__ = {'，と': 660, '，同': 727, 'B1あ': 1404, 'B1同': 542, '、と': 660, '、同': 727, '｣と': 1682, 'あっ': 1505, 'いう': 1743, 'いっ': -2055, 'いる': 672, 'うし': -4817, 'うん': 665, 'から': 3472, 'がら': 600, 'こう': -790, 'こと': 2083, 'こん': -1262, 'さら': -4143, 'さん': 4573, 'した': 2641, 'して': 1104, 'すで': -3399, 'そこ': 1977, 'それ': -871, 'たち': 1122, 'ため': 601, 'った': 3463, 'つい': -802, 'てい': 805, 'てき': 1249, 'でき': 1127, 'です': 3445, 'では': 844, 'とい': -4915, 'とみ': 1922, 'どこ': 3887, 'ない': 5713, 'なっ': 3015, 'など': 7379, 'なん': -1113, 'にし': 2468, 'には': 1498, 'にも': 1671, 'に対': -912, 'の一': -501, 'の中': 741, 'ませ': 2448, 'まで': 1711, 'まま': 2600, 'まる': -2155, 'やむ': -1947, 'よっ': -2565, 'れた': 2369, 'れで': -913, 'をし': 1860, 'を見': 731, '亡く': -1886, '京都': 2558, '取り': -2784, '大き': -2604, '大阪': 1497, '平方': -2314, '引き': -1336, '日本': -195, '本当': -2423, '毎日': -2113, '目指': -724};
  this.BW2__ = {'11': -669, '．．': -11822, '――': -5730, '−−': -13175, 'いう': -1609, 'うか': 2490, 'かし': -1350, 'かも': -602, 'から': -7194, 'かれ': 4612, 'がい': 853, 'がら': -3198, 'きた': 1941, 'くな': -1597, 'こと': -8392, 'この': -4193, 'させ': 4533, 'され': 13168, 'さん': -3977, 'しい': -1819, 'しか': -545, 'した': 5078, 'して': 972, 'しな': 939, 'その': -3744, 'たい': -1253, 'たた': -662, 'ただ': -3857, 'たち': -786, 'たと': 1224, 'たは': -939, 'った': 4589, 'って': 1647, 'っと': -2094, 'てい': 6144, 'てき': 3640, 'てく': 2551, 'ては': -3110, 'ても': -3065, 'でい': 2666, 'でき': -1528, 'でし': -3828, 'です': -4761, 'でも': -4203, 'とい': 1890, 'とこ': -1746, 'とと': -2279, 'との': 720, 'とみ': 5168, 'とも': -3941, 'ない': -2488, 'なが': -1313, 'など': -6509, 'なの': 2614, 'なん': 3099, 'にお': -1615, 'にし': 2748, 'にな': 2454, 'によ': -7236, 'に対': -14943, 'に従': -4688, 'に関': -11388, 'のか': 2093, 'ので': -7059, 'のに': -6041, 'のの': -6125, 'はい': 1073, 'はが': -1033, 'はず': -2532, 'ばれ': 1813, 'まし': -1316, 'まで': -6621, 'まれ': 5409, 'めて': -3153, 'もい': 2230, 'もの': -10713, 'らか': -944, 'らし': -1611, 'らに': -1897, 'りし': 651, 'りま': 1620, 'れた': 4270, 'れて': 849, 'れば': 4114, 'ろう': 6067, 'われ': 7901, 'を通': -11877, 'んだ': 728, 'んな': -4115, '一人': 602, '一方': -1375, '一日': 970, '一部': -1051, '上が': -4479, '会社': -1116, '出て': 2163, '分の': -7758, '同党': 970, '同日': -913, '大阪': -2471, '委員': -1250, '少な': -1050, '年度': -8669, '年間': -1626, '府県': -2363, '手権': -1982, '新聞': -4066, '日新': -722, '日本': -7068, '日米': 3372, '曜日': -601, '朝鮮': -2355, '本人': -2697, '東京': -1543, '然と': -1384, '社会': -1276, '立て': -990, '第に': -1612, '米国': -4268};
  this.BW3__ = {'あた': -2194, 'あり': 719, 'ある': 3846, 'い．': -1185, 'い。': -1185, 'いい': 5308, 'いえ': 2079, 'いく': 3029, 'いた': 2056, 'いっ': 1883, 'いる': 5600, 'いわ': 1527, 'うち': 1117, 'うと': 4798, 'えと': 1454, 'か．': 2857, 'か。': 2857, 'かけ': -743, 'かっ': -4098, 'かに': -669, 'から': 6520, 'かり': -2670, 'が，': 1816, 'が、': 1816, 'がき': -4855, 'がけ': -1127, 'がっ': -913, 'がら': -4977, 'がり': -2064, 'きた': 1645, 'けど': 1374, 'こと': 7397, 'この': 1542, 'ころ': -2757, 'さい': -714, 'さを': 976, 'し，': 1557, 'し、': 1557, 'しい': -3714, 'した': 3562, 'して': 1449, 'しな': 2608, 'しま': 1200, 'す．': -1310, 'す。': -1310, 'する': 6521, 'ず，': 3426, 'ず、': 3426, 'ずに': 841, 'そう': 428, 'た．': 8875, 'た。': 8875, 'たい': -594, 'たの': 812, 'たり': -1183, 'たる': -853, 'だ．': 4098, 'だ。': 4098, 'だっ': 1004, 'った': -4748, 'って': 300, 'てい': 6240, 'てお': 855, 'ても': 302, 'です': 1437, 'でに': -1482, 'では': 2295, 'とう': -1387, 'とし': 2266, 'との': 541, 'とも': -3543, 'どう': 4664, 'ない': 1796, 'なく': -903, 'など': 2135, 'に，': -1021, 'に、': -1021, 'にし': 1771, 'にな': 1906, 'には': 2644, 'の，': -724, 'の、': -724, 'の子': -1000, 'は，': 1337, 'は、': 1337, 'べき': 2181, 'まし': 1113, 'ます': 6943, 'まっ': -1549, 'まで': 6154, 'まれ': -793, 'らし': 1479, 'られ': 6820, 'るる': 3818, 'れ，': 854, 'れ、': 854, 'れた': 1850, 'れて': 1375, 'れば': -3246, 'れる': 1091, 'われ': -605, 'んだ': 606, 'んで': 798, 'カ月': 990, '会議': 860, '入り': 1232, '大会': 2217, '始め': 1681, '市': 965, '新聞': -5055, '日，': 974, '日、': 974, '社会': 2024};
  this.TC1__ = {'AAA': 1093, 'HHH': 1029, 'HHM': 580, 'HII': 998, 'HOH': -390, 'HOM': -331, 'IHI': 1169, 'IOH': -142, 'IOI': -1015, 'IOM': 467, 'MMH': 187, 'OOI': -1832};
  this.TC2__ = {'HHO': 2088, 'HII': -1023, 'HMM': -1154, 'IHI': -1965, 'KKH': 703, 'OII': -2649};
  this.TC3__ = {'AAA': -294, 'HHH': 346, 'HHI': -341, 'HII': -1088, 'HIK': 731, 'HOH': -1486, 'IHH': 128, 'IHI': -3041, 'IHO': -1935, 'IIH': -825, 'IIM': -1035, 'IOI': -542, 'KHH': -1216, 'KKA': 491, 'KKH': -1217, 'KOK': -1009, 'MHH': -2694, 'MHM': -457, 'MHO': 123, 'MMH': -471, 'NNH': -1689, 'NNO': 662, 'OHO': -3393};
  this.TC4__ = {'HHH': -203, 'HHI': 1344, 'HHK': 365, 'HHM': -122, 'HHN': 182, 'HHO': 669, 'HIH': 804, 'HII': 679, 'HOH': 446, 'IHH': 695, 'IHO': -2324, 'IIH': 321, 'III': 1497, 'IIO': 656, 'IOO': 54, 'KAK': 4845, 'KKA': 3386, 'KKK': 3065, 'MHH': -405, 'MHI': 201, 'MMH': -241, 'MMM': 661, 'MOM': 841};
  this.TQ1__ = {'BHHH': -227, 'BHHI': 316, 'BHIH': -132, 'BIHH': 60, 'BIII': 1595, 'BNHH': -744, 'BOHH': 225, 'BOOO': -908, 'OAKK': 482, 'OHHH': 281, 'OHIH': 249, 'OIHI': 200, 'OIIH': -68};
  this.TQ2__ = {'BIHH': -1401, 'BIII': -1033, 'BKAK': -543, 'BOOO': -5591};
  this.TQ3__ = {'BHHH': 478, 'BHHM': -1073, 'BHIH': 222, 'BHII': -504, 'BIIH': -116, 'BIII': -105, 'BMHI': -863, 'BMHM': -464, 'BOMH': 620, 'OHHH': 346, 'OHHI': 1729, 'OHII': 997, 'OHMH': 481, 'OIHH': 623, 'OIIH': 1344, 'OKAK': 2792, 'OKHH': 587, 'OKKA': 679, 'OOHH': 110, 'OOII': -685};
  this.TQ4__ = {'BHHH': -721, 'BHHM': -3604, 'BHII': -966, 'BIIH': -607, 'BIII': -2181, 'OAAA': -2763, 'OAKK': 180, 'OHHH': -294, 'OHHI': 2446, 'OHHO': 480, 'OHIH': -1573, 'OIHH': 1935, 'OIHI': -493, 'OIIH': 626, 'OIII': -4007, 'OKAK': -8156};
  this.TW1__ = {'につい': -4681, '東京都': 2026};
  this.TW2__ = {'ある程': -2049, 'いった': -1256, 'ころが': -2434, 'しょう': 3873, 'その後': -4430, 'だって': -1049, 'ていた': 1833, 'として': -4657, 'ともに': -4517, 'もので': 1882, '一気に': -792, '初めて': -1512, '同時に': -8097, '大きな': -1255, '対して': -2721, '社会党': -3216};
  this.TW3__ = {'いただ': -1734, 'してい': 1314, 'として': -4314, 'につい': -5483, 'にとっ': -5989, 'に当た': -6247, 'ので，': -727, 'ので、': -727, 'のもの': -600, 'れから': -3752, '十二月': -2287};
  this.TW4__ = {'いう．': 8576, 'いう。': 8576, 'からな': -2348, 'してい': 2958, 'たが，': 1516, 'たが、': 1516, 'ている': 1538, 'という': 1349, 'ました': 5543, 'ません': 1097, 'ようと': -4258, 'よると': 5865};
  this.UC1__ = {'A': 484, 'K': 93, 'M': 645, 'O': -505};
  this.UC2__ = {'A': 819, 'H': 1059, 'I': 409, 'M': 3987, 'N': 5775, 'O': 646};
  this.UC3__ = {'A': -1370, 'I': 2311};
  this.UC4__ = {'A': -2643, 'H': 1809, 'I': -1032, 'K': -3450, 'M': 3565, 'N': 3876, 'O': 6646};
  this.UC5__ = {'H': 313, 'I': -1238, 'K': -799, 'M': 539, 'O': -831};
  this.UC6__ = {'H': -506, 'I': -253, 'K': 87, 'M': 247, 'O': -387};
  this.UP1__ = {'O': -214};
  this.UP2__ = {'B': 69, 'O': 935};
  this.UP3__ = {'B': 189};
  this.UQ1__ = {'BH': 21, 'BI': -12, 'BK': -99, 'BN': 142, 'BO': -56, 'OH': -95, 'OI': 477, 'OK': 410, 'OO': -2422};
  this.UQ2__ = {'BH': 216, 'BI': 113, 'OK': 1759};
  this.UQ3__ = {'BA': -479, 'BH': 42, 'BI': 1913, 'BK': -7198, 'BM': 3160, 'BN': 6427, 'BO': 14761, 'OI': -827, 'ON': -3212};
  this.UW1__ = {'，': 156, '、': 156, '｢': -463, 'あ': -941, 'う': -127, 'が': -553, 'き': 121, 'こ': 505, 'で': -201, 'と': -547, 'ど': -123, 'に': -789, 'の': -185, 'は': -847, 'も': -466, 'や': -470, 'よ': 182, 'ら': -292, 'り': 208, 'れ': 169, 'を': -446, 'ん': -137, '・': -135, '主': -402, '京': -268, '区': -912, '午': 871, '国': -460, '大': 561, '委': 729, '市': -411, '日': -141, '理': 361, '生': -408, '県': -386, '都': -718};
  this.UW2__ = {'，': -829, '、': -829, '〇': 892, '｢': -645, '｣': 3145, 'あ': -538, 'い': 505, 'う': 134, 'お': -502, 'か': 1454, 'が': -856, 'く': -412, 'こ': 1141, 'さ': 878, 'ざ': 540, 'し': 1529, 'す': -675, 'せ': 300, 'そ': -1011, 'た': 188, 'だ': 1837, 'つ': -949, 'て': -291, 'で': -268, 'と': -981, 'ど': 1273, 'な': 1063, 'に': -1764, 'の': 130, 'は': -409, 'ひ': -1273, 'べ': 1261, 'ま': 600, 'も': -1263, 'や': -402, 'よ': 1639, 'り': -579, 'る': -694, 'れ': 571, 'を': -2516, 'ん': 2095, 'ア': -587, 'カ': 306, 'キ': 568, 'ッ': 831, '三': -758, '不': -2150, '世': -302, '中': -968, '主': -861, '事': 492, '人': -123, '会': 978, '保': 362, '入': 548, '初': -3025, '副': -1566, '北': -3414, '区': -422, '大': -1769, '天': -865, '太': -483, '子': -1519, '学': 760, '実': 1023, '小': -2009, '市': -813, '年': -1060, '強': 1067, '手': -1519, '揺': -1033, '政': 1522, '文': -1355, '新': -1682, '日': -1815, '明': -1462, '最': -630, '朝': -1843, '本': -1650, '東': -931, '果': -665, '次': -2378, '民': -180, '気': -1740, '理': 752, '発': 529, '目': -1584, '相': -242, '県': -1165, '立': -763, '第': 810, '米': 509, '自': -1353, '行': 838, '西': -744, '見': -3874, '調': 1010, '議': 1198, '込': 3041, '開': 1758, '間': -1257};
  this.UW3__ = {'1': -800, '，': 4889, '−': -1723, '、': 4889, '々': -2311, '〇': 5827, '｣': 2670, '〓': -3573, 'あ': -2696, 'い': 1006, 'う': 2342, 'え': 1983, 'お': -4864, 'か': -1163, 'が': 3271, 'く': 1004, 'け': 388, 'げ': 401, 'こ': -3552, 'ご': -3116, 'さ': -1058, 'し': -395, 'す': 584, 'せ': 3685, 'そ': -5228, 'た': 842, 'ち': -521, 'っ': -1444, 'つ': -1081, 'て': 6167, 'で': 2318, 'と': 1691, 'ど': -899, 'な': -2788, 'に': 2745, 'の': 4056, 'は': 4555, 'ひ': -2171, 'ふ': -1798, 'へ': 1199, 'ほ': -5516, 'ま': -4384, 'み': -120, 'め': 1205, 'も': 2323, 'や': -788, 'よ': -202, 'ら': 727, 'り': 649, 'る': 5905, 'れ': 2773, 'わ': -1207, 'を': 6620, 'ん': -518, 'ア': 551, 'グ': 1319, 'ス': 874, 'ッ': -1350, 'ト': 521, 'ム': 1109, 'ル': 1591, 'ロ': 2201, 'ン': 278, '・': -3794, '一': -1619, '下': -1759, '世': -2087, '両': 3815, '中': 653, '主': -758, '予': -1193, '二': 974, '人': 2742, '今': 792, '他': 1889, '以': -1368, '低': 811, '何': 4265, '作': -361, '保': -2439, '元': 4858, '党': 3593, '全': 1574, '公': -3030, '六': 755, '共': -1880, '円': 5807, '再': 3095, '分': 457, '初': 2475, '別': 1129, '前': 2286, '副': 4437, '力': 365, '動': -949, '務': -1872, '化': 1327, '北': -1038, '区': 4646, '千': -2309, '午': -783, '協': -1006, '口': 483, '右': 1233, '各': 3588, '合': -241, '同': 3906, '和': -837, '員': 4513, '国': 642, '型': 1389, '場': 1219, '外': -241, '妻': 2016, '学': -1356, '安': -423, '実': -1008, '家': 1078, '小': -513, '少': -3102, '州': 1155, '市': 3197, '平': -1804, '年': 2416, '広': -1030, '府': 1605, '度': 1452, '建': -2352, '当': -3885, '得': 1905, '思': -1291, '性': 1822, '戸': -488, '指': -3973, '政': -2013, '教': -1479, '数': 3222, '文': -1489, '新': 1764, '日': 2099, '旧': 5792, '昨': -661, '時': -1248, '曜': -951, '最': -937, '月': 4125, '期': 360, '李': 3094, '村': 364, '東': -805, '核': 5156, '森': 2438, '業': 484, '氏': 2613, '民': -1694, '決': -1073, '法': 1868, '海': -495, '無': 979, '物': 461, '特': -3850, '生': -273, '用': 914, '町': 1215, '的': 7313, '直': -1835, '省': 792, '県': 6293, '知': -1528, '私': 4231, '税': 401, '立': -960, '第': 1201, '米': 7767, '系': 3066, '約': 3663, '級': 1384, '統': -4229, '総': 1163, '線': 1255, '者': 6457, '能': 725, '自': -2869, '英': 785, '見': 1044, '調': -562, '財': -733, '費': 1777, '車': 1835, '軍': 1375, '込': -1504, '通': -1136, '選': -681, '郎': 1026, '郡': 4404, '部': 1200, '金': 2163, '長': 421, '開': -1432, '間': 1302, '関': -1282, '雨': 2009, '電': -1045, '非': 2066, '駅': 1620};
  this.UW4__ = {'，': 3930, '．': 3508, '―': -4841, '、': 3930, '。': 3508, '〇': 4999, '｢': 1895, '｣': 3798, '〓': -5156, 'あ': 4752, 'い': -3435, 'う': -640, 'え': -2514, 'お': 2405, 'か': 530, 'が': 6006, 'き': -4482, 'ぎ': -3821, 'く': -3788, 'け': -4376, 'げ': -4734, 'こ': 2255, 'ご': 1979, 'さ': 2864, 'し': -843, 'じ': -2506, 'す': -731, 'ず': 1251, 'せ': 181, 'そ': 4091, 'た': 5034, 'だ': 5408, 'ち': -3654, 'っ': -5882, 'つ': -1659, 'て': 3994, 'で': 7410, 'と': 4547, 'な': 5433, 'に': 6499, 'ぬ': 1853, 'ね': 1413, 'の': 7396, 'は': 8578, 'ば': 1940, 'ひ': 4249, 'び': -4134, 'ふ': 1345, 'へ': 6665, 'べ': -744, 'ほ': 1464, 'ま': 1051, 'み': -2082, 'む': -882, 'め': -5046, 'も': 4169, 'ゃ': -2666, 'や': 2795, 'ょ': -1544, 'よ': 3351, 'ら': -2922, 'り': -9726, 'る': -14896, 'れ': -2613, 'ろ': -4570, 'わ': -1783, 'を': 13150, 'ん': -2352, 'カ': 2145, 'コ': 1789, 'セ': 1287, 'ッ': -724, 'ト': -403, 'メ': -1635, 'ラ': -881, 'リ': -541, 'ル': -856, 'ン': -3637, '・': -4371, 'ー': -11870, '一': -2069, '中': 2210, '予': 782, '事': -190, '井': -1768, '人': 1036, '以': 544, '会': 950, '体': -1286, '作': 530, '側': 4292, '先': 601, '党': -2006, '共': -1212, '内': 584, '円': 788, '初': 1347, '前': 1623, '副': 3879, '力': -302, '動': -740, '務': -2715, '化': 776, '区': 4517, '協': 1013, '参': 1555, '合': -1834, '和': -681, '員': -910, '器': -851, '回': 1500, '国': -619, '園': -1200, '地': 866, '場': -1410, '塁': -2094, '士': -1413, '多': 1067, '大': 571, '子': -4802, '学': -1397, '定': -1057, '寺': -809, '小': 1910, '屋': -1328, '山': -1500, '島': -2056, '川': -2667, '市': 2771, '年': 374, '庁': -4556, '後': 456, '性': 553, '感': 916, '所': -1566, '支': 856, '改': 787, '政': 2182, '教': 704, '文': 522, '方': -856, '日': 1798, '時': 1829, '最': 845, '月': -9066, '木': -485, '来': -442, '校': -360, '業': -1043, '氏': 5388, '民': -2716, '気': -910, '沢': -939, '済': -543, '物': -735, '率': 672, '球': -1267, '生': -1286, '産': -1101, '田': -2900, '町': 1826, '的': 2586, '目': 922, '省': -3485, '県': 2997, '空': -867, '立': -2112, '第': 788, '米': 2937, '系': 786, '約': 2171, '経': 1146, '統': -1169, '総': 940, '線': -994, '署': 749, '者': 2145, '能': -730, '般': -852, '行': -792, '規': 792, '警': -1184, '議': -244, '谷': -1000, '賞': 730, '車': -1481, '軍': 1158, '輪': -1433, '込': -3370, '近': 929, '道': -1291, '選': 2596, '郎': -4866, '都': 1192, '野': -1100, '銀': -2213, '長': 357, '間': -2344, '院': -2297, '際': -2604, '電': -878, '領': -1659, '題': -792, '館': -1984, '首': 1749, '高': 2120};
  this.UW5__ = {'1': -514, '，': 465, '．': -299, 'E2': -32768, '］': -2762, '、': 465, '。': -299, '｢': 363, 'あ': 1655, 'い': 331, 'う': -503, 'え': 1199, 'お': 527, 'か': 647, 'が': -421, 'き': 1624, 'ぎ': 1971, 'く': 312, 'げ': -983, 'さ': -1537, 'し': -1371, 'す': -852, 'だ': -1186, 'ち': 1093, 'っ': 52, 'つ': 921, 'て': -18, 'で': -850, 'と': -127, 'ど': 1682, 'な': -787, 'に': -1224, 'の': -635, 'は': -578, 'べ': 1001, 'み': 502, 'め': 865, 'ゃ': 3350, 'ょ': 854, 'り': -208, 'る': 429, 'れ': 504, 'わ': 419, 'を': -1264, 'ん': 327, 'イ': 241, 'ル': 451, 'ン': -343, '中': -871, '京': 722, '会': -1153, '党': -654, '務': 3519, '区': -901, '告': 848, '員': 2104, '大': -1296, '学': -548, '定': 1785, '嵐': -1304, '市': -2991, '席': 921, '年': 1763, '思': 872, '所': -814, '挙': 1618, '新': -1682, '日': 218, '月': -4353, '査': 932, '格': 1356, '機': -1508, '氏': -1347, '田': 240, '町': -3912, '的': -3149, '相': 1319, '省': -1052, '県': -4003, '研': -997, '社': -278, '空': -813, '統': 1955, '者': -2233, '表': 663, '語': -1073, '議': 1219, '選': -1018, '郎': -368, '長': 786, '間': 1191, '題': 2368, '館': -689};
  this.UW6__ = {'1': -270, '，': 227, '．': 808, 'E1': 306, '、': 227, '。': 808, 'あ': -307, 'う': 189, 'か': 241, 'が': -73, 'く': -121, 'こ': -200, 'じ': 1782, 'す': 383, 'た': -428, 'っ': 573, 'て': -1014, 'で': 101, 'と': -105, 'な': -253, 'に': -149, 'の': -417, 'は': -236, 'も': -206, 'り': 187, 'る': -135, 'を': 195, 'ル': -673, 'ン': -496, '一': -277, '中': 201, '件': -800, '会': 624, '前': 302, '区': 1792, '員': -1212, '委': 798, '学': -960, '市': 887, '広': -695, '後': 535, '業': -697, '相': 753, '社': -507, '福': 974, '空': -822, '者': 1811, '連': 463, '郎': 1082};

  return this;
};

util.inherits(TokenizerJa, Tokenizer);


/**
 * @param {string} str
 * @return {string}
 * @private
 */
TokenizerJa.prototype.ctype_ = function(str) {
  for (var i = 0, length = this.chartype_.length; i < length; i++) {
    if (str.match(this.chartype_[i][0])) {
      return this.chartype_[i][1];
    }
  }
  return 'O';
};


/**
 * @param {string} v
 * @return {number}
 * @private
 */
TokenizerJa.prototype.ts_ = function(v) {
  if (v) { return v; }
  return 0;
};


/**
 * Remove punctuations signs from tokens.
 *
 * @param {Array.<string>} tokens An array of tokens.
 * @return {Array.<string>} An array of tokens.
 * @private
 */
TokenizerJa.prototype.removePuncTokens = function(tokens) {
  return tokens
      .map(function(token) {
        return token.replace(/[＿－・，、；：！？．。（）［］｛｝｢｣＠＊＼／＆＃％｀＾＋＜＝＞｜～≪≫─＄＂_\-･,､;:!?.｡()[\]{}「」@*\/&#%`^+<=>|~«»$"\s]+/g, '');
      })
      .filter(function(token) {
        return token != '';
      });
};


/**
 * @param {string} text
 * @return {Array.<string>}
 */
TokenizerJa.prototype.tokenize = function(text) {
  if (text == null || text == undefined || text == '') {
    return [];
  }
  text = normalize(text);
  var result = [];
  var seg = ['B3', 'B2', 'B1'];
  var ctype = ['O', 'O', 'O'];
  var o = text.split('');
  var i;
  var length;
  for (i = 0, length = o.length; i < length; ++i) {
    seg.push(o[i]);
    ctype.push(this.ctype_(o[i]));
  }
  seg.push('E1');
  seg.push('E2');
  seg.push('E3');
  ctype.push('O');
  ctype.push('O');
  ctype.push('O');
  var word = seg[3];
  var p1 = 'U';
  var p2 = 'U';
  var p3 = 'U';
  for (i = 4, length = seg.length - 3; i < length; ++i) {
    var score = this.BIAS__;
    var w1 = seg[i - 3];
    var w2 = seg[i - 2];
    var w3 = seg[i - 1];
    var w4 = seg[i];
    var w5 = seg[i + 1];
    var w6 = seg[i + 2];
    var c1 = ctype[i - 3];
    var c2 = ctype[i - 2];
    var c3 = ctype[i - 1];
    var c4 = ctype[i];
    var c5 = ctype[i + 1];
    var c6 = ctype[i + 2];
    score += this.ts_(this.UP1__[p1]);
    score += this.ts_(this.UP2__[p2]);
    score += this.ts_(this.UP3__[p3]);
    score += this.ts_(this.BP1__[p1 + p2]);
    score += this.ts_(this.BP2__[p2 + p3]);
    score += this.ts_(this.UW1__[w1]);
    score += this.ts_(this.UW2__[w2]);
    score += this.ts_(this.UW3__[w3]);
    score += this.ts_(this.UW4__[w4]);
    score += this.ts_(this.UW5__[w5]);
    score += this.ts_(this.UW6__[w6]);
    score += this.ts_(this.BW1__[w2 + w3]);
    score += this.ts_(this.BW2__[w3 + w4]);
    score += this.ts_(this.BW3__[w4 + w5]);
    score += this.ts_(this.TW1__[w1 + w2 + w3]);
    score += this.ts_(this.TW2__[w2 + w3 + w4]);
    score += this.ts_(this.TW3__[w3 + w4 + w5]);
    score += this.ts_(this.TW4__[w4 + w5 + w6]);
    score += this.ts_(this.UC1__[c1]);
    score += this.ts_(this.UC2__[c2]);
    score += this.ts_(this.UC3__[c3]);
    score += this.ts_(this.UC4__[c4]);
    score += this.ts_(this.UC5__[c5]);
    score += this.ts_(this.UC6__[c6]);
    score += this.ts_(this.BC1__[c2 + c3]);
    score += this.ts_(this.BC2__[c3 + c4]);
    score += this.ts_(this.BC3__[c4 + c5]);
    score += this.ts_(this.TC1__[c1 + c2 + c3]);
    score += this.ts_(this.TC2__[c2 + c3 + c4]);
    score += this.ts_(this.TC3__[c3 + c4 + c5]);
    score += this.ts_(this.TC4__[c4 + c5 + c6]);
    //score += this.ts_(this.TC5__[c4 + c5 + c6]);
    score += this.ts_(this.UQ1__[p1 + c1]);
    score += this.ts_(this.UQ2__[p2 + c2]);
    score += this.ts_(this.UQ3__[p3 + c3]);
    score += this.ts_(this.BQ1__[p2 + c2 + c3]);
    score += this.ts_(this.BQ2__[p2 + c3 + c4]);
    score += this.ts_(this.BQ3__[p3 + c2 + c3]);
    score += this.ts_(this.BQ4__[p3 + c3 + c4]);
    score += this.ts_(this.TQ1__[p2 + c1 + c2 + c3]);
    score += this.ts_(this.TQ2__[p2 + c2 + c3 + c4]);
    score += this.ts_(this.TQ3__[p3 + c1 + c2 + c3]);
    score += this.ts_(this.TQ4__[p3 + c2 + c3 + c4]);
    var p = 'O';
    if (score > 0) {
      result.push(word);
      word = '';
      p = 'B';
    }
    p1 = p2;
    p2 = p3;
    p3 = p;
    word += seg[i];
  }
  result.push(word);

  result = this.removePuncTokens(result);

  return result;
};

module.exports = TokenizerJa;

},{"../normalizers/normalizer_ja":31,"./tokenizer":58,"util":94}],60:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require("util"),
    _ = require('underscore')._;

var contractions2 = [
    /(.)('ll|'re|'ve|n't|'s|'m|'d)\b/ig,
    /\b(can)(not)\b/ig,
    /\b(D)('ye)\b/ig,
    /\b(Gim)(me)\b/ig,
    /\b(Gon)(na)\b/ig,
    /\b(Got)(ta)\b/ig,
    /\b(Lem)(me)\b/ig,
    /\b(Mor)('n)\b/ig,
    /\b(T)(is)\b/ig,
    /\b(T)(was)\b/ig,
    /\b(Wan)(na)\b/ig];

var contractions3 = [
    /\b(Whad)(dd)(ya)\b/ig,
    /\b(Wha)(t)(cha)\b/ig
];

var TreebankWordTokenizer = function() {
};

util.inherits(TreebankWordTokenizer, Tokenizer);

TreebankWordTokenizer.prototype.tokenize = function(text) {
    contractions2.forEach(function(regexp) {
	text = text.replace(regexp,"$1 $2");
    });
    
    contractions3.forEach(function(regexp) {
	text = text.replace(regexp,"$1 $2 $3");
    });

    // most punctuation
    text = text.replace(/([^\w\.\'\-\/\+\<\>,&])/g, " $1 ");

    // commas if followed by space
    text = text.replace(/(,\s)/g, " $1");

    // single quotes if followed by a space
    text = text.replace(/('\s)/g, " $1");

    // periods before newline or end of string
    text = text.replace(/\. *(\n|$)/g, " . ");
    
    return  _.without(text.split(/\s+/), '');	
};

module.exports = TreebankWordTokenizer;

},{"./tokenizer":58,"underscore":85,"util":94}],61:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A transliteration of Katakana & Hiragana to roman characters using the
 * modified Hepburn system.
 * Rules based on CLDR transform rule set `Katakana-Latin-BGN.xml` but with
 * several bugs fixed:
 *  * Missing ū
 *  * Missing tsu + voiced kana
 *  * typos on my~ transliterations
 *  * support for long vowel sign
 *  * support for final small tsu
 *  * support for u + small vowels
 *  * support for su/shi/ji + small vowels
 *  * support for tchi/tsu/te/to + small vowels
 *  * support for fu + small vowels
 *  * support for katakana middle dot
 *
 * \@todo Take iteration marks into account.
 */

var replacer = require('../../util/utils').replacer;

var transliterationTable1 = {
  'ウァ': 'wa', // KATAKANA LETTER U + SMALL A
  'ウィ': 'wi', // KATAKANA LETTER U + SMALL I
  'ウェ': 'we', // KATAKANA LETTER U + SMALL E
  'ウォ': 'wo', // KATAKANA LETTER U + SMALL O
  'ウー': 'ū', // KATAKANA LETTER VU + PROLONGED SOUND MARK

  'ヴァ': 'va', // KATAKANA LETTER VU + SMALL A
  'ヴィ': 'vi', // KATAKANA LETTER VU + SMALL I
  'ヴェ': 've', // KATAKANA LETTER VU + SMALL E
  'ヴォ': 'vo', // KATAKANA LETTER VU + SMALL O
  'ヴュ': 'vyu', // KATAKANA LETTER VU + SMALL YU

  'うぁ': 'wa', // HIRAGANA LETTER U + SMALL A
  'うぃ': 'wi', // HIRAGANA LETTER U + SMALL I
  'うぇ': 'we', // HIRAGANA LETTER U + SMALL E
  'うぉ': 'wo', // HIRAGANA LETTER U + SMALL O
  'うー': 'ū', // HIRAGANA LETTER VU + PROLONGED SOUND MARK

  'ゔぁ': 'va', // HIRAGANA LETTER VU + SMALL A
  'ゔぃ': 'vi', // HIRAGANA LETTER VU + SMALL I
  'ゔぇ': 've', // HIRAGANA LETTER VU + SMALL E
  'ゔぉ': 'vo', // HIRAGANA LETTER VU + SMALL O
  'ゔゅ': 'vyu' // HIRAGANA LETTER VU + SMALL YU
};

var transliterationTable2 = {
  'イェ': 'ye', // KATAKANA LETTER I + SMALL E

  'ア': 'a', // KATAKANA LETTER A
  'イ': 'i', // KATAKANA LETTER I
  'ウウ': 'ū', // KATAKANA LETTER U + U
  'ウ': 'u', // KATAKANA LETTER U
  'エ': 'e', // KATAKANA LETTER E
  'オウ': 'ō', // KATAKANA LETTER O + U
  'オ': 'o', // KATAKANA LETTER O

  'クァ': 'kwa', // KATAKANA LETTER KU + SMALL A
  'クィ': 'kwi', // KATAKANA LETTER KU + SMALL I
  'クェ': 'kwe', // KATAKANA LETTER KU + SMALL E
  'クォ': 'kwo', // KATAKANA LETTER KU + SMALL O

  'カ': 'ka', // KATAKANA LETTER KA
  'キョウ': 'kyō', // KATAKANA LETTER KI + SMALL YO + U
  'キュウ': 'kyū', // KATAKANA LETTER KI + SMALL YU + U
  'キャ': 'kya', // KATAKANA LETTER KI + SMALL YA
  'キョ': 'kyo', // KATAKANA LETTER KI + SMALL YO
  'キュ': 'kyu', // KATAKANA LETTER KI + SMALL YU
  'キ': 'ki', // KATAKANA LETTER KI
  'ク': 'ku', // KATAKANA LETTER KU
  'ケ': 'ke', // KATAKANA LETTER KE
  'コウ': 'kō', // KATAKANA LETTER KO + U
  'コ': 'ko', // KATAKANA LETTER KO

  'シェ': 'she', // KATAKANA LETTER SI + SMALL E
  'スィ': 'si', // KATAKANA LETTER SU + SMALL I

  'サ': 'sa', // KATAKANA LETTER SA
  'ショウ': 'shō', // KATAKANA LETTER SI + SMALL YO + U
  'シュウ': 'shū', // KATAKANA LETTER SI + SMALL YU + U
  'シャ': 'sha', // KATAKANA LETTER SI + SMALL YA
  'ショ': 'sho', // KATAKANA LETTER SI + SMALL YO
  'シュ': 'shu', // KATAKANA LETTER SI + SMALL YU
  'シ': 'shi', // KATAKANA LETTER SI
  'スウ': 'sū', // KATAKANA LETTER SU + U
  'ス': 'su', // KATAKANA LETTER SU
  'セ': 'se', // KATAKANA LETTER SE
  'ソウ': 'sō', // KATAKANA LETTER SO + U
  'ソ': 'so', // KATAKANA LETTER SO

  'チェ': 'che', // KATAKANA LETTER TI + SMALL E
  'ツァ': 'tsa', // KATAKANA LETTER TU + SMALL A
  'ツィ': 'tsi', // KATAKANA LETTER TU + SMALL I
  'ツェ': 'tse', // KATAKANA LETTER TU + SMALL E
  'ツォ': 'tso', // KATAKANA LETTER TU + SMALL O
  'ティ': 'ti', // KATAKANA LETTER TE + SMALL I
  'ディ': 'di', // KATAKANA LETTER DE + SMALL I
  'テュ': 'tyu', // KATAKANA LETTER TE + SMALL YU
  'デュ': 'dyu', // KATAKANA LETTER DE + SMALL YU
  'トィ': 'twi', // KATAKANA LETTER TO + SMALL I
  'トゥ': 'tu', // KATAKANA LETTER TO + SMALL U
  'ドィ': 'dwi', // KATAKANA LETTER DO + SMALL I
  'ドゥ': 'du', // KATAKANA LETTER DO + SMALL U

  'タ': 'ta', // KATAKANA LETTER TA
  'チョウ': 'chō', // KATAKANA LETTER TI + SMALL YO + U
  'チュウ': 'chū', // KATAKANA LETTER TI + SMALL YU + U
  'チャ': 'cha', // KATAKANA LETTER TI + SMALL YA
  'チョ': 'cho', // KATAKANA LETTER TI + SMALL YO
  'チュ': 'chu', // KATAKANA LETTER TI + SMALL YU
  'チ': 'chi', // KATAKANA LETTER TI
  'ツウ': 'tsū', // KATAKANA LETTER TU + U
  'ツ': 'tsu', // KATAKANA LETTER TU
  'テ': 'te', // KATAKANA LETTER TE
  'トウ': 'tō', // KATAKANA LETTER TO + U
  'ト': 'to', // KATAKANA LETTER TO

  'ナ': 'na', // KATAKANA LETTER NA
  'ニョウ': 'nyō', // KATAKANA LETTER NI + SMALL YO + U
  'ニュウ': 'nyū', // KATAKANA LETTER NI + SMALL YU + U
  'ニャ': 'nya', // KATAKANA LETTER NI + SMALL YA
  'ニョ': 'nyo', // KATAKANA LETTER NI + SMALL YO
  'ニュ': 'nyu', // KATAKANA LETTER NI + SMALL YU
  'ニ': 'ni', // KATAKANA LETTER NI
  'ヌウ': 'nū', // KATAKANA LETTER NU + U
  'ヌ': 'nu', // KATAKANA LETTER NU
  'ネ': 'ne', // KATAKANA LETTER NE
  'ノウ': 'nō', // KATAKANA LETTER NO + U
  'ノ': 'no', // KATAKANA LETTER NO

  'ファ': 'fa', // KATAKANA LETTER HU + SMALL A
  'フィ': 'fi', // KATAKANA LETTER HU + SMALL I
  //'フゥ': 'fu', // KATAKANA LETTER HU + SMALL U
  'フェ': 'fe', // KATAKANA LETTER HU + SMALL E
  'フォ': 'fo', // KATAKANA LETTER HU + SMALL O
  'フュ': 'fyu', // KATAKANA LETTER HU + SMALL YU
  'ホェ': 'hwe', // KATAKANA LETTER HO + SMALL E

  'ハ': 'ha', // KATAKANA LETTER HA
  'ヒョウ': 'hyō', // KATAKANA LETTER HI + SMALL YO + U
  'ヒュウ': 'hyū', // KATAKANA LETTER HI + SMALL YU + U
  'ヒャ': 'hya', // KATAKANA LETTER HI + SMALL YA
  'ヒョ': 'hyo', // KATAKANA LETTER HI + SMALL YO
  'ヒュ': 'hyu', // KATAKANA LETTER HI + SMALL YU
  'ヒ': 'hi', // KATAKANA LETTER HI
  'フウ': 'fū', // KATAKANA LETTER HU + U
  'フ': 'fu', // KATAKANA LETTER HU
  'ヘ': 'he', // KATAKANA LETTER HE
  'ホウ': 'hō', // KATAKANA LETTER HO + U
  'ホ': 'ho', // KATAKANA LETTER HO

  'マ': 'ma', // KATAKANA LETTER MA
  'ミョウ': 'myō', // KATAKANA LETTER MI + SMALL YO + U
  'ミュウ': 'myū', // KATAKANA LETTER MI + SMALL YU + U
  'ミャ': 'mya', // KATAKANA LETTER MI + SMALL YA
  'ミョ': 'myo', // KATAKANA LETTER MI + SMALL YO
  'ミュ': 'myu', // KATAKANA LETTER MI + SMALL YU
  'ミ': 'mi', // KATAKANA LETTER MI
  'ムウ': 'mū', // KATAKANA LETTER MU + U
  'ム': 'mu', // KATAKANA LETTER MU
  'メ': 'me', // KATAKANA LETTER ME
  'モウ': 'mō', // KATAKANA LETTER MO + U
  'モ': 'mo', // KATAKANA LETTER MO

  'ヤ': 'ya', // KATAKANA LETTER YA
  'ユウ': 'yū', // KATAKANA LETTER YU + U
  'ユ': 'yu', // KATAKANA LETTER YU
  'ヨウ': 'yō', // KATAKANA LETTER YO + U
  'ヨ': 'yo', // KATAKANA LETTER YO

  'リェ': 'rye', // KATAKANA LETTER RI + SMALL E

  'ラ': 'ra', // KATAKANA LETTER RA
  'リョウ': 'ryō', // KATAKANA LETTER RI + SMALL YO + U
  'リュウ': 'ryū', // KATAKANA LETTER RI + SMALL YU + U
  'リャ': 'rya', // KATAKANA LETTER RI + SMALL YA
  'リョ': 'ryo', // KATAKANA LETTER RI + SMALL YO
  'リュ': 'ryu', // KATAKANA LETTER RI + SMALL YU
  'リ': 'ri', // KATAKANA LETTER RI
  'ルウ': 'rū', // KATAKANA LETTER RU + U
  'ル': 'ru', // KATAKANA LETTER RU
  'レ': 're', // KATAKANA LETTER RE
  'ロウ': 'rō', // KATAKANA LETTER RO + U
  'ロ': 'ro', // KATAKANA LETTER RO

  'ワ': 'wa', // KATAKANA LETTER WA
  'ヰ': 'i', // KATAKANA LETTER WI
  'ヱ': 'e', // KATAKANA LETTER WE
  'ヲ': 'o', // KATAKANA LETTER WO

  'ン': 'n', // KATAKANA LETTER N

  'グァ': 'gwa', // KATAKANA LETTER GU + SMALL A
  'グィ': 'gwi', // KATAKANA LETTER GU + SMALL I
  'グェ': 'gwe', // KATAKANA LETTER GU + SMALL E
  'グォ': 'gwo', // KATAKANA LETTER GU + SMALL O

  'ガ': 'ga', // KATAKANA LETTER GA
  'ギョウ': 'gyō', // KATAKANA LETTER GI + SMALL YO + U
  'ギュウ': 'gyū', // KATAKANA LETTER GI + SMALL YU + U
  'ギャ': 'gya', // KATAKANA LETTER GI + SMALL YA
  'ギョ': 'gyo', // KATAKANA LETTER GI + SMALL YO
  'ギュ': 'gyu', // KATAKANA LETTER GI + SMALL YU
  'ギ': 'gi', // KATAKANA LETTER GI
  'グウ': 'gū', // KATAKANA LETTER GU + U
  'グ': 'gu', // KATAKANA LETTER GU
  'ゲ': 'ge', // KATAKANA LETTER GE
  'ゴウ': 'gō', // KATAKANA LETTER GO + U
  'ゴ': 'go', // KATAKANA LETTER GO

  'ジェ': 'je', // KATAKANA LETTER ZI + SMALL E
  'ズィ': 'zi', // KATAKANA LETTER ZU + SMALL I

  'ザ': 'za', // KATAKANA LETTER ZA
  'ジョウ': 'jō', // KATAKANA LETTER ZI + SMALL YO + U
  'ジュウ': 'jū', // KATAKANA LETTER ZI + SMALL YU + U
  'ジャ': 'ja', // KATAKANA LETTER ZI + SMALL YA
  'ジョ': 'jo', // KATAKANA LETTER ZI + SMALL YO
  'ジュ': 'ju', // KATAKANA LETTER ZI + SMALL YU
  'ジ': 'ji', // KATAKANA LETTER ZI
  'ズウ': 'zū', // KATAKANA LETTER ZU + U
  'ズ': 'zu', // KATAKANA LETTER ZU
  'ゼ': 'ze', // KATAKANA LETTER ZE
  'ゾウ': 'zō', // KATAKANA LETTER ZO + U
  'ゾ': 'zo', // KATAKANA LETTER ZO

  'ダ': 'da', // KATAKANA LETTER DA
  'ヂ': 'ji', // KATAKANA LETTER DI
  'ヅウ': 'zū', // KATAKANA LETTER DU + U
  'ヅ': 'zu', // KATAKANA LETTER DU
  'デ': 'de', // KATAKANA LETTER DE
  'ドウ': 'dō', // KATAKANA LETTER DO + U
  'ド': 'do', // KATAKANA LETTER DO

  'ブュ': 'byu', // KATAKANA LETTER BU + SMALL YU

  'バ': 'ba', // KATAKANA LETTER BA
  'ビョウ': 'byō', // KATAKANA LETTER BI + SMALL YO + U
  'ビュウ': 'byū', // KATAKANA LETTER BI + SMALL YU + U
  'ビャ': 'bya', // KATAKANA LETTER BI + SMALL YA
  'ビョ': 'byo', // KATAKANA LETTER BI + SMALL YO
  'ビュ': 'byu', // KATAKANA LETTER BI + SMALL YU
  'ビ': 'bi', // KATAKANA LETTER BI
  'ブウ': 'bū', // KATAKANA LETTER BU + U
  'ブ': 'bu', // KATAKANA LETTER BU
  'ベ': 'be', // KATAKANA LETTER BE
  'ボウ': 'bō', // KATAKANA LETTER BO + U
  'ボ': 'bo', // KATAKANA LETTER BO

  'パ': 'pa', // KATAKANA LETTER PA
  'ピョウ': 'pyō', // KATAKANA LETTER PI + SMALL YO + U
  'ピュウ': 'pyū', // KATAKANA LETTER PI + SMALL YU + U
  'ピャ': 'pya', // KATAKANA LETTER PI + SMALL YA
  'ピョ': 'pyo', // KATAKANA LETTER PI + SMALL YO
  'ピュ': 'pyu', // KATAKANA LETTER PI + SMALL YU
  'ピ': 'pi', // KATAKANA LETTER PI
  'プウ': 'pū', // KATAKANA LETTER PU + U
  'プ': 'pu', // KATAKANA LETTER PU
  'ペ': 'pe', // KATAKANA LETTER PE
  'ポウ': 'pō', // KATAKANA LETTER PO + U
  'ポ': 'po', // KATAKANA LETTER PO

  'ヴ': 'v', // KATAKANA LETTER VU

  '・': ' ', // KATAKANA MIDDLE DOT

  'いぇ': 'ye', // HIRAGANA LETTER I + SMALL E

  'あ': 'a', // HIRAGANA LETTER A
  'い': 'i', // HIRAGANA LETTER I
  'うう': 'ū', // HIRAGANA LETTER U + U
  'う': 'u', // HIRAGANA LETTER U
  'え': 'e', // HIRAGANA LETTER E
  'おう': 'ō', // HIRAGANA LETTER O + U
  'お': 'o', // HIRAGANA LETTER O

  'くぁ': 'kwa', // HIRAGANA LETTER KU + SMALL A
  'くぃ': 'kwi', // HIRAGANA LETTER KU + SMALL I
  'くぇ': 'kwe', // HIRAGANA LETTER KU + SMALL E
  'くぉ': 'kwo', // HIRAGANA LETTER KU + SMALL O

  'か': 'ka', // HIRAGANA LETTER KA
  'きょう': 'kyō', // HIRAGANA LETTER KI + SMALL YO + U
  'きゅう': 'kyū', // HIRAGANA LETTER KI + SMALL YU + U
  'きゃ': 'kya', // HIRAGANA LETTER KI + SMALL YA
  'きょ': 'kyo', // HIRAGANA LETTER KI + SMALL YO
  'きゅ': 'kyu', // HIRAGANA LETTER KI + SMALL YU
  'き': 'ki', // HIRAGANA LETTER KI
  'くう': 'kū', // HIRAGANA LETTER KU + U
  'く': 'ku', // HIRAGANA LETTER KU
  'け': 'ke', // HIRAGANA LETTER KE
  'こう': 'kō', // HIRAGANA LETTER KO + U
  'こ': 'ko', // HIRAGANA LETTER KO

  'しぇ': 'she', // HIRAGANA LETTER SI + SMALL E
  'すぃ': 'si', // HIRAGANA LETTER SU + SMALL I

  'さ': 'sa', // HIRAGANA LETTER SA
  'しょう': 'shō', // HIRAGANA LETTER SI + SMALL YO + U
  'しゅう': 'shū', // HIRAGANA LETTER SI + SMALL YU + U
  'しゃ': 'sha', // HIRAGANA LETTER SI + SMALL YA
  'しょ': 'sho', // HIRAGANA LETTER SI + SMALL YO
  'しゅ': 'shu', // HIRAGANA LETTER SI + SMALL YU
  'し': 'shi', // HIRAGANA LETTER SI
  'すう': 'sū', // HIRAGANA LETTER SU + U
  'す': 'su', // HIRAGANA LETTER SU
  'せ': 'se', // HIRAGANA LETTER SE
  'そう': 'sō', // HIRAGANA LETTER SO + U
  'そ': 'so', // HIRAGANA LETTER SO

  'ちぇ': 'che', // HIRAGANA LETTER TI + SMALL E
  'つぁ': 'tsa', // HIRAGANA LETTER TU + SMALL A
  'つぃ': 'tsi', // HIRAGANA LETTER TU + SMALL I
  'つぇ': 'tse', // HIRAGANA LETTER TU + SMALL E
  'つぉ': 'tso', // HIRAGANA LETTER TU + SMALL O
  'てぃ': 'ti', // HIRAGANA LETTER TE + SMALL I
  'でぃ': 'di', // HIRAGANA LETTER DE + SMALL I
  'てゅ': 'tyu', // HIRAGANA LETTER TE + SMALL YU
  'でゅ': 'dyu', // HIRAGANA LETTER DE + SMALL YU
  'とぃ': 'twi', // HIRAGANA LETTER TO + SMALL I
  'とぅ': 'tu', // HIRAGANA LETTER TO + SMALL U
  'どぃ': 'dwi', // HIRAGANA LETTER DO + SMALL I
  'どぅ': 'du', // HIRAGANA LETTER DO + SMALL U

  'た': 'ta', // HIRAGANA LETTER TA
  'ちょう': 'chō', // HIRAGANA LETTER TI + SMALL YO + U
  'ちゅう': 'chū', // HIRAGANA LETTER TI + SMALL YU + U
  'ちゃ': 'cha', // HIRAGANA LETTER TI + SMALL YA
  'ちょ': 'cho', // HIRAGANA LETTER TI + SMALL YO
  'ちゅ': 'chu', // HIRAGANA LETTER TI + SMALL YU
  'ち': 'chi', // HIRAGANA LETTER TI
  'つう': 'tsū', // HIRAGANA LETTER TU + U
  'つ': 'tsu', // HIRAGANA LETTER TU
  'て': 'te', // HIRAGANA LETTER TE
  'とう': 'tō', // HIRAGANA LETTER TO + U
  'と': 'to', // HIRAGANA LETTER TO

  'な': 'na', // HIRAGANA LETTER NA
  'にょう': 'nyō', // HIRAGANA LETTER NI + SMALL YO + U
  'にゅう': 'nyū', // HIRAGANA LETTER NI + SMALL YU + U
  'にゃ': 'nya', // HIRAGANA LETTER NI + SMALL YA
  'にょ': 'nyo', // HIRAGANA LETTER NI + SMALL YO
  'にゅ': 'nyu', // HIRAGANA LETTER NI + SMALL YU
  'に': 'ni', // HIRAGANA LETTER NI
  'ぬう': 'nū', // HIRAGANA LETTER NU + U
  'ぬ': 'nu', // HIRAGANA LETTER NU
  'ね': 'ne', // HIRAGANA LETTER NE
  'のう': 'nō', // HIRAGANA LETTER NO + U
  'の': 'no', // HIRAGANA LETTER NO

  'ふぁ': 'fa', // HIRAGANA LETTER HU + SMALL A
  'ふぃ': 'fi', // HIRAGANA LETTER HU + SMALL I
  //'ふぅ': 'fu', // HIRAGANA LETTER HU + SMALL U
  'ふぇ': 'fe', // HIRAGANA LETTER HU + SMALL E
  'ふぉ': 'fo', // HIRAGANA LETTER HU + SMALL O
  'ふゅ': 'fyu', // HIRAGANA LETTER HU + SMALL YU
  'ほぇ': 'hwe', // HIRAGANA LETTER HO + SMALL E

  'は': 'ha', // HIRAGANA LETTER HA
  'ひょう': 'hyō', // HIRAGANA LETTER HI + SMALL YO + U
  'ひゅう': 'hyū', // HIRAGANA LETTER HI + SMALL YU + U
  'ひゃ': 'hya', // HIRAGANA LETTER HI + SMALL YA
  'ひょ': 'hyo', // HIRAGANA LETTER HI + SMALL YO
  'ひゅ': 'hyu', // HIRAGANA LETTER HI + SMALL YU
  'ひ': 'hi', // HIRAGANA LETTER HI
  'ふう': 'fū', // HIRAGANA LETTER HU + U
  'ふ': 'fu', // HIRAGANA LETTER HU
  'へ': 'he', // HIRAGANA LETTER HE
  'ほう': 'hō', // HIRAGANA LETTER HO + U
  'ほ': 'ho', // HIRAGANA LETTER HO

  'ま': 'ma', // HIRAGANA LETTER MA
  'みょう': 'myō', // HIRAGANA LETTER MI + SMALL YO + U
  'みゅう': 'myū', // HIRAGANA LETTER MI + SMALL YU + U
  'みゃ': 'mya', // HIRAGANA LETTER MI + SMALL YA
  'みょ': 'myo', // HIRAGANA LETTER MI + SMALL YO
  'みゅ': 'myu', // HIRAGANA LETTER MI + SMALL YU
  'み': 'mi', // HIRAGANA LETTER MI
  'むう': 'mū', // HIRAGANA LETTER MU + U
  'む': 'mu', // HIRAGANA LETTER MU
  'め': 'me', // HIRAGANA LETTER ME
  'もう': 'mō', // HIRAGANA LETTER MO + U
  'も': 'mo', // HIRAGANA LETTER MO

  'や': 'ya', // HIRAGANA LETTER YA
  'ゆう': 'yū', // HIRAGANA LETTER YU + U
  'ゆ': 'yu', // HIRAGANA LETTER YU
  'よう': 'yō', // HIRAGANA LETTER YO + U
  'よ': 'yo', // HIRAGANA LETTER YO

  'りぇ': 'rye', // HIRAGANA LETTER RI + SMALL E

  'ら': 'ra', // HIRAGANA LETTER RA
  'りょう': 'ryō', // HIRAGANA LETTER RI + SMALL YO + U
  'りゅう': 'ryū', // HIRAGANA LETTER RI + SMALL YU + U
  'りゃ': 'rya', // HIRAGANA LETTER RI + SMALL YA
  'りょ': 'ryo', // HIRAGANA LETTER RI + SMALL YO
  'りゅ': 'ryu', // HIRAGANA LETTER RI + SMALL YU
  'り': 'ri', // HIRAGANA LETTER RI
  'るう': 'rū', // HIRAGANA LETTER RU + U
  'る': 'ru', // HIRAGANA LETTER RU
  'れ': 're', // HIRAGANA LETTER RE
  'ろう': 'rō', // HIRAGANA LETTER RO + U
  'ろ': 'ro', // HIRAGANA LETTER RO

  'わ': 'wa', // HIRAGANA LETTER WA
  'ゐ': 'i', // HIRAGANA LETTER WI
  'ゑ': 'e', // HIRAGANA LETTER WE
  'を': 'o', // HIRAGANA LETTER WO

  'ん': 'n', // HIRAGANA LETTER N

  'ぐぁ': 'gwa', // HIRAGANA LETTER GU + SMALL A
  'ぐぃ': 'gwi', // HIRAGANA LETTER GU + SMALL I
  'ぐぇ': 'gwe', // HIRAGANA LETTER GU + SMALL E
  'ぐぉ': 'gwo', // HIRAGANA LETTER GU + SMALL O

  'が': 'ga', // HIRAGANA LETTER GA
  'ぎょう': 'gyō', // HIRAGANA LETTER GI + SMALL YO + U
  'ぎゅう': 'gyū', // HIRAGANA LETTER GI + SMALL YU + U
  'ぎゃ': 'gya', // HIRAGANA LETTER GI + SMALL YA
  'ぎょ': 'gyo', // HIRAGANA LETTER GI + SMALL YO
  'ぎゅ': 'gyu', // HIRAGANA LETTER GI + SMALL YU
  'ぎ': 'gi', // HIRAGANA LETTER GI
  'ぐう': 'gū', // HIRAGANA LETTER GU + U
  'ぐ': 'gu', // HIRAGANA LETTER GU
  'げ': 'ge', // HIRAGANA LETTER GE
  'ごう': 'gō', // HIRAGANA LETTER GO + U
  'ご': 'go', // HIRAGANA LETTER GO

  'じぇ': 'je', // HIRAGANA LETTER ZI + SMALL E
  'ずぃ': 'zi', // HIRAGANA LETTER ZU + SMALL I

  'ざ': 'za', // HIRAGANA LETTER ZA
  'じょう': 'jō', // HIRAGANA LETTER ZI + SMALL YO + U
  'じゅう': 'jū', // HIRAGANA LETTER ZI + SMALL YU + U
  'じゃ': 'ja', // HIRAGANA LETTER ZI + SMALL YA
  'じょ': 'jo', // HIRAGANA LETTER ZI + SMALL YO
  'じゅ': 'ju', // HIRAGANA LETTER ZI + SMALL YU
  'じ': 'ji', // HIRAGANA LETTER ZI
  'ずう': 'zū', // HIRAGANA LETTER ZU + U
  'ず': 'zu', // HIRAGANA LETTER ZU
  'ぜ': 'ze', // HIRAGANA LETTER ZE
  'ぞう': 'zō', // HIRAGANA LETTER ZO + U
  'ぞ': 'zo', // HIRAGANA LETTER ZO

  'だ': 'da', // HIRAGANA LETTER DA
  'ぢ': 'ji', // HIRAGANA LETTER DI
  'づう': 'zū', // HIRAGANA LETTER DU + U
  'づ': 'zu', // HIRAGANA LETTER DU
  'で': 'de', // HIRAGANA LETTER DE
  'どう': 'dō', // HIRAGANA LETTER DO + U
  'ど': 'do', // HIRAGANA LETTER DO

  'ぶゅ': 'byu', // HIRAGANA LETTER BU + SMALL YU

  'ば': 'ba', // HIRAGANA LETTER BA
  'びょう': 'byō', // HIRAGANA LETTER BI + SMALL YO + U
  'びゅう': 'byū', // HIRAGANA LETTER BI + SMALL YU + U
  'びゃ': 'bya', // HIRAGANA LETTER BI + SMALL YA
  'びょ': 'byo', // HIRAGANA LETTER BI + SMALL YO
  'びゅ': 'byu', // HIRAGANA LETTER BI + SMALL YU
  'び': 'bi', // HIRAGANA LETTER BI
  'ぶう': 'bū', // HIRAGANA LETTER BU + U
  'ぶ': 'bu', // HIRAGANA LETTER BU
  'べ': 'be', // HIRAGANA LETTER BE
  'ぼう': 'bō', // HIRAGANA LETTER BO + U
  'ぼ': 'bo', // HIRAGANA LETTER BO

  'ぱ': 'pa', // HIRAGANA LETTER PA
  'ぴょう': 'pyō', // HIRAGANA LETTER PI + SMALL YO + U
  'ぴゅう': 'pyū', // HIRAGANA LETTER PI + SMALL YU + U
  'ぴゃ': 'pya', // HIRAGANA LETTER PI + SMALL YA
  'ぴょ': 'pyo', // HIRAGANA LETTER PI + SMALL YO
  'ぴゅ': 'pyu', // HIRAGANA LETTER PI + SMALL YU
  'ぴ': 'pi', // HIRAGANA LETTER PI
  'ぷう': 'pū', // HIRAGANA LETTER PU + U
  'ぷ': 'pu', // HIRAGANA LETTER PU
  'ぺ': 'pe', // HIRAGANA LETTER PE
  'ぽう': 'pō', // HIRAGANA LETTER PO + U
  'ぽ': 'po', // HIRAGANA LETTER PO

  'ゔ': 'v' // HIRAGANA LETTER VU
};

var transliterationTable3 = {
  'aァ': 'ā',
  'aぁ': 'ā',
  'iィー': 'ī',
  'iィ': 'ī',
  'iぃー': 'ī',
  'iぃ': 'ī',
  'aー': 'ā',
  'iー': 'ī',
  'uー': 'ū',
  'eー': 'ē',
  'oー': 'ō',

  // Fallback for small vowels
  'ァ': 'a',
  'ィ': 'i',
  'ゥ': 'u',
  'ェ': 'e',
  'ォ': 'o',
  'ぁ': 'a',
  'ぃ': 'i',
  'ぅ': 'u',
  'ぇ': 'e',
  'ぉ': 'o'
};

var replace1 = replacer(transliterationTable1);
var replace2 = replacer(transliterationTable2);
var replace3 = replacer(transliterationTable3);

module.exports = function(str) {
  str = replace1(str);

  str = str
    .replace(/ッ(?=[ン])/g, 'n')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[ん])/g, 'n')// HIRAGANA LETTER SMALL TU
    .replace(/ン(?=[バビブベボパピプペポマミムメモ])/g, 'm')// KATAKANA LETTER N
    .replace(/ん(?=[ばびぶべぼぱぴぷぺぽまみむめも])/g, 'm')// HIRAGANA LETTER N
    .replace(/ン(?=[ヤユヨアイウエオ])/g, "n'")// KATAKANA LETTER N
    .replace(/ん(?=[やゆよあいうえお])/g, "n'");// HIRAGANA LETTER N
  str = str
    .replace(/ッ(?=[カキクケコ])/g, 'k')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[かきくけこ])/g, 'k')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ガギグゲゴ])/g, 'g')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[がぎぐげご])/g, 'g')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[サシスセソ])/g, 's')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[さしすせそ])/g, 's')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ザズゼゾ])/g, 'z')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[ざずぜぞ])/g, 'z')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ジ])/g, 'j')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[じ])/g, 'j')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[タチツテト])/g, 't')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[たちつてと])/g, 't')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ダヂヅデド])/g, 't')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[だぢづでど])/g, 't')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ハヒヘホ])/g, 'h')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[はひへほ])/g, 'h')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[フ])/g, 'f')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[ふ])/g, 'f')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[バビブベボ])/g, 'b')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[ばびぶべぼ])/g, 'b')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[パピプペポ])/g, 'p')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[ぱぴぷぺぽ])/g, 'p')// HIRAGANA LETTER SMALL TU
    .replace(/ッ(?=[ラリルレロ])/g, 'r')// KATAKANA LETTER SMALL TU
    .replace(/っ(?=[らりるれろ])/g, 'r');// HIRAGANA LETTER SMALL TU

  str = replace2(str);
  str = replace3(str);

  str = str
    .replace(/(ッ|っ)\B/g, 't');// FINAL KATAKANA LETTER SMALL TU

  return str;
};

},{"../../util/utils":68}],62:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'about', 'after', 'all', 'also', 'am', 'an', 'and', 'another', 'any', 'are', 'as', 'at', 'be',
    'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'came', 'can',
    'come', 'could', 'did', 'do', 'each', 'for', 'from', 'get', 'got', 'has', 'had',
    'he', 'have', 'her', 'here', 'him', 'himself', 'his', 'how', 'if', 'in', 'into',
    'is', 'it', 'like', 'make', 'many', 'me', 'might', 'more', 'most', 'much', 'must',
    'my', 'never', 'now', 'of', 'on', 'only', 'or', 'other', 'our', 'out', 'over',
    'said', 'same', 'see', 'should', 'since', 'some', 'still', 'such', 'take', 'than',
    'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'up', 'very', 'was', 'way', 'we', 'well', 'were',
    'what', 'where', 'which', 'while', 'who', 'with', 'would', 'you', 'your',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1',
    '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];
    
// tell the world about the noise words.    
exports.words = words;

},{}],63:[function(require,module,exports){
/*
Copyright (c) 2011, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'a','un','el','ella','y','sobre','de','la','que','en',
    'los','del','se','las','por','un','para','con','no',
    'una','su','al','lo','como','más','pero','sus','le',
    'ya','o','porque','cuando','muy','sin','sobre','también',
    'me','hasta','donde','quien','desde','nos','durante','uno',
    'ni','contra','ese','eso','mí','qué','otro','él','cual',
    'poco','mi','tú','te','ti','sí',
     '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];
    
// tell the world about the noise words.    
exports.words = words;

},{}],64:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Stop Words by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    // Words
    'از', 'با', 'یه', 'برای', 'و', 'باید', 'شاید',

    // Symbols
    '؟', '!', '٪', '.', '،', '؛', ':', ';', ',',
    
    // Numbers
    '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'
];
    
// tell the world about the noise words.    
exports.words = words;

},{}],65:[function(require,module,exports){
/*
Copyright (c) 2011, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'ad','al','allo','ai','agli','all','agl','alla','alle','con','col','coi','da','dal','dallo',
    'dai','dagli','dall','dagl','dalla','dalle','di','del','dello','dei','degli','dell','degl',
    'della','delle','in','nel','nello','nei','negli','nell','negl','nella','nelle','su','sul',
    'sullo','sui','sugli','sull','sugl','sulla','sulle','per','tra','contro','io','tu','lui',
    'lei','noi','voi','loro','mio','mia','miei','mie','tuo','tua','tuoi','tue','suo','sua','suoi',
    'sue','nostro','nostra','nostri','nostre','vostro','vostra','vostri','vostre','mi','ti','ci',
    'vi','lo','la','li','le','gli','ne','il','un','uno','una','ma','ed','se','perché','anche','come',
    'dov','dove','che','chi','cui','non','più','quale','quanto','quanti','quanta','quante','quello',
    'quelli','quella','quelle','questo','questi','questa','queste','si','tutto','tutti','a','c','e',
    'i','l','o','ho','hai','ha','abbiamo','avete','hanno','abbia','abbiate','abbiano','avrò','avrai',
    'avrà','avremo','avrete','avranno','avrei','avresti','avrebbe','avremmo','avreste','avrebbero',
    'avevo','avevi','aveva','avevamo','avevate','avevano','ebbi','avesti','ebbe','avemmo','aveste',
    'ebbero','avessi','avesse','avessimo','avessero','avendo','avuto','avuta','avuti','avute','sono',
    'sei','è','siamo','siete','sia','siate','siano','sarò','sarai','sarà','saremo','sarete','saranno',
    'sarei','saresti','sarebbe','saremmo','sareste','sarebbero','ero','eri','era','eravamo','eravate',
    'erano','fui','fosti','fu','fummo','foste','furono','fossi','fosse','fossimo','fossero','essendo',
    'faccio','fai','facciamo','fanno','faccia','facciate','facciano','farò','farai','farà','faremo',
    'farete','faranno','farei','faresti','farebbe','faremmo','fareste','farebbero','facevo','facevi',
    'faceva','facevamo','facevate','facevano','feci','facesti','fece','facemmo','faceste','fecero',
    'facessi','facesse','facessimo','facessero','facendo','sto','stai','sta','stiamo','stanno','stia',
    'stiate','stiano','starò','starai','starà','staremo','starete','staranno','starei','staresti',
    'starebbe','staremmo','stareste','starebbero','stavo','stavi','stava','stavamo','stavate','stavano',
    'stetti','stesti','stette','stemmo','steste','stettero','stessi','stesse','stessimo','stessero','stando',
     '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];
    
// tell the world about the noise words.    
exports.words = words;

},{}],66:[function(require,module,exports){
// Original copyright:
/*
 Licensed to the Apache Software Foundation (ASF) under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// This version:
/*
Copyright (c) 2012, Guillaume Marty

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
// Original location:
// http://svn.apache.org/repos/asf/lucene/dev/trunk/lucene/analysis/kuromoji/src/resources/org/apache/lucene/analysis/ja/stopwords.txt
var words = ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
  'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる',
  'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また', 'もの',
  'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ', 'によって',
  'により', 'おり', 'より', 'による', 'ず', 'なり', 'られる', 'において', 'ば', 'なかっ',
  'なく', 'しかし', 'について', 'せ', 'だっ', 'その後', 'できる', 'それ', 'う', 'ので',
  'なお', 'のみ', 'でき', 'き', 'つ', 'における', 'および', 'いう', 'さらに', 'でも',
  'ら', 'たり', 'その他', 'に関する', 'たち', 'ます', 'ん', 'なら', 'に対して', '特に',
  'せる', '及び', 'これら', 'とき', 'では', 'にて', 'ほか', 'ながら', 'うち', 'そして',
  'とともに', 'ただし', 'かつて', 'それぞれ', 'または', 'お', 'ほど', 'ものの', 'に対する',
  'ほとんど', 'と共に', 'といった', 'です', 'とも', 'ところ', 'ここ'];

// tell the world about the noise words.
module.exports = words;

},{}],67:[function(require,module,exports){
/*
Copyright (c) 2011, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'о', 'после', 'все', 'также', 'и', 'другие', 'все', 'как', 'во', 'быть',
    'потому', 'был', 'до', 'являюсь', 'между', 'все', 'но', 'от', 'иди', 'могу',
    'подойди', 'мог', 'делал', 'делаю', 'каждый', 'для', 'откуда', 'иметь', 'имел',
    'он', 'имеет', 'её', 'здесь', 'его', 'как', 'если', 'в', 'оно', 'за',
    'делать', 'много', 'я', 'может быть', 'более', 'самый', 'должен',
    'мой', 'никогда', 'сейчас', 'из', 'на', 'только', 'или', 'другой', 'другая',
    'другое', 'наше', 'вне', 'конец', 'сказал', 'сказала', 'также', 'видел', 'c',
    'немного', 'все еще', 'так', 'затем', 'тот', 'их', 'там', 'этот', 'они', 'те',
    'через', 'тоже', 'под', 'над', 'очень', 'был', 'путь', 'мы', 'хорошо',
    'что', 'где', 'который', 'пока', 'кто', 'с кем', 'хотел бы', 'ты', 'твои',
    'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н',
    'o', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь',
    'э', 'ю', 'я','$', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];
    
// tell the world about the noise words.    
exports.words = words;

},{}],68:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */


/**
 * Generate a replacing function given a table of patterns. Inspired by:
 * http://code.google.com/p/jslibs/wiki/JavascriptTips#String_converter
 * The order of elements is significant. Longer elements should be listed first.
 * @see Speed test http://jsperf.com/build-a-regexp-table
 *
 * @param {Object.<string, string>} translationTable The translation table of key value.
 * @return {function(string): string} A translating function.
 */
function replacer(translationTable) {
  /**
   * An array of translationTable keys.
   * @type {Array.<string>}
   */
  var pattern = [];

  /**
   * The regular expression doing the replacement job.
   * @type {RegExp}
   */
  var regExp;

  /**
   * Used to iterate over translationTable.
   * @type {string}
   */
  var key;

  for (key in translationTable) {
    // Escaping regexp special chars.
    // @see Speed test for type casting to string http://jsperf.com/string-type-casting/2
    // @see http://closure-library.googlecode.com/svn/docs/closure_goog_string_string.js.source.html#line956
    key = ('' + key).replace(/([-()\[\]{}+?*.$\^|,:#<!\\\/])/g, '\\$1').
      replace(/\x08/g, '\\x08');

    pattern.push(key);
  }

  regExp = new RegExp(pattern.join('|'), 'g');

  /**
   * @param {string} str Input string.
   * @return {string} The string replaced.
   */
  return function(str) {
    return str.replace(regExp, function(str) {
      return translationTable[str];
    });
  };
}


/**
 * Exchanges all keys with their associated values in an object.
 *
 * @param {Object.<string, string>} obj An object of strings.
 * @return {Object.<string, string>} An object of strings.
 */
function flip(obj) {
  var newObj = Object.create(null),
      key;

  for (key in obj) {
    newObj[obj[key]] = key;
  }

  return newObj;
}


/**
 * Merge several objects. Properties from earlier objects are overwritten by
 * laters's in case of conflict.
 *
 * @param {...Object.<string, string>} var_args One or more objects of strings.
 * @return {!Object.<string, string>} An object of strings.
 */
function merge(var_args) {
  var args = [].slice.call(arguments),
      newObj = Object.create(null),
      id = 0, key;

  while (args[id]) {
    for (key in args[id]) {
      newObj[key] = args[id][key];
    }

    id++;
  }

  return newObj;
}

exports.replacer = replacer;
exports.flip = flip;
exports.merge = merge;

},{}],69:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var WordNetFile = require('./wordnet_file'),
  fs = require('fs'),
  util = require('util');

function get(location, callback) {
  var buff = new Buffer(4096);

  this.open(function(err, fd, done) {
    WordNetFile.appendLineChar(fd, location, 0, buff, function(line) {
      done();
      var data = line.split('| ');
      var tokens = data[0].split(/\s+/);
      var ptrs = [];
      var wCnt = parseInt(tokens[3], 16);
      var synonyms = [];

      for(var i = 0; i < wCnt; i++) {
        synonyms.push(tokens[4 + i * 2]);
      }

      var ptrOffset = (wCnt - 1) * 2 + 6;
      for(var i = 0; i < parseInt(tokens[ptrOffset], 10); i++) {
        ptrs.push({
          pointerSymbol: tokens[ptrOffset + 1 + i * 4],
          synsetOffset: parseInt(tokens[ptrOffset + 2 + i * 4], 10),
          pos: tokens[ptrOffset + 3 + i * 4],
          sourceTarget: tokens[ptrOffset + 4 + i * 4]
        });
      }

      // break "gloss" into definition vs. examples
      var glossArray = data[1].split("; ");
      var definition = glossArray[0];
      var examples = glossArray.slice(1);    

      for (var k=0; k < examples.length; k++) {
        examples[k] = examples[k].replace(/\"/g,'').replace(/\s\s+/g,'');
      }
      
      callback({
        synsetOffset: parseInt(tokens[0], 10),
        lexFilenum: parseInt(tokens[1], 10),
        pos: tokens[2],
        wCnt: wCnt,
        lemma: tokens[4],
        synonyms: synonyms,
        lexId: tokens[5],
        ptrs: ptrs,
        gloss: data[1],
        def: definition,
        exp: examples
      });
    });
  });
}

var DataFile = function(dataDir, name) {
  WordNetFile.call(this, dataDir, 'data.' + name);
};

util.inherits(DataFile, WordNetFile);
DataFile.prototype.get = get;

module.exports = DataFile;

},{"./wordnet_file":72,"__browserify_Buffer":90,"fs":87,"util":94}],70:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var WordNetFile = require('./wordnet_file'),
  fs = require('fs'),
  util = require('util');

function getFileSize(path) {
  var stat = fs.statSync(path);
  return stat.size;
}

function findPrevEOL(fd, pos, callback) {
  var buff = new Buffer(1024);
  if(pos == 0)
    callback(0);
  else {
    fs.read(fd, buff, 0, 1, pos, function(err, count) {
      if(buff[0] == 10)
        callback(pos + 1);
      else
        findPrevEOL(fd, pos - 1, callback);
    });
  }
}

function readLine(fd, pos, callback) {
  var buff = new Buffer(1024);
  findPrevEOL(fd, pos, function(pos) {
    WordNetFile.appendLineChar(fd, pos, 0, buff, callback);
  });
}

function miss(callback) {
  callback({status: 'miss'});
}

function findAt(fd, size, pos, lastPos, adjustment, searchKey, callback, lastKey) {
  if (lastPos == pos || pos >= size) {
    miss(callback);
  } else {
    readLine(fd, pos, function(line) {
      var tokens = line.split(/\s+/);
      var key = tokens[0];

    if(key == searchKey) {
        callback({status: 'hit', key: key, 'line': line, tokens: tokens});
      } else if(adjustment == 1 || key == lastKey)  {
        miss(callback);
      } else {
        adjustment = Math.ceil(adjustment * 0.5);

        if (key < searchKey) {
          findAt(fd, size, pos + adjustment, pos, adjustment, searchKey, callback, key);
        } else {
          findAt(fd, size, pos - adjustment, pos, adjustment, searchKey, callback, key);
        }
      }
    });
  }
}

function find(searchKey, callback) {
  var indexFile = this;

  indexFile.open(function(err, fd, done) {
    if(err) {
      console.log(err);
    } else {
      var size = getFileSize(indexFile.filePath) - 1;
      var pos = Math.ceil(size / 2);
      findAt(fd, size, pos, null, pos, searchKey,
        function(result) { callback(result); done(); });
    }
  });
}

function lookupFromFile(word, callback) {
  this.find(word, function(record) {
    var indexRecord = null;

    if(record.status == 'hit') {
      var ptrs = [], offsets = [];

      for(var i = 0; i < parseInt(record.tokens[3]); i++)
        ptrs.push(record.tokens[i]);

      for(var i = 0; i < parseInt(record.tokens[2]); i++)
        offsets.push(parseInt(record.tokens[ptrs.length + 6 + i], 10));

      indexRecord = {
        lemma: record.tokens[0],
        pos: record.tokens[1],
        ptrSymbol: ptrs,
        senseCnt:  parseInt(record.tokens[ptrs.length + 4], 10),
        tagsenseCnt:  parseInt(record.tokens[ptrs.length + 5], 10),
        synsetOffset:  offsets
      };
    }

    callback(indexRecord);
  });
}

function lookup(word, callback) {
  this.lookupFromFile(word, callback);
}

var IndexFile = function(dataDir, name) {
  WordNetFile.call(this, dataDir, 'index.' + name);
};

util.inherits(IndexFile, WordNetFile);

IndexFile.prototype.lookupFromFile = lookupFromFile;
IndexFile.prototype.lookup = lookup;
IndexFile.prototype.find = find;

IndexFile.prototype._findAt = findAt;

module.exports = IndexFile;

},{"./wordnet_file":72,"__browserify_Buffer":90,"fs":87,"util":94}],71:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var IndexFile = require('./index_file'),
  DataFile = require('./data_file');

function pushResults(data, results, offsets, callback) {
  var wordnet = this;

  if(offsets.length == 0) {
    callback(results);
  } else {
    data.get(offsets.pop(), function(record) {
      results.push(record);
      wordnet.pushResults(data, results, offsets, callback);
    });
  }
}

function lookupFromFiles(files, results, word, callback) {
  var wordnet = this;

  if(files.length == 0)
    callback(results);
  else {
    var file = files.pop();

    file.index.lookup(word, function(record) {
      if(record) {
        wordnet.pushResults(file.data, results, record.synsetOffset, function() {
          wordnet.lookupFromFiles(files, results, word, callback);
        });
      } else {
        wordnet.lookupFromFiles(files, results, word, callback);
      }
    });
  }
}

function lookup(word, callback) {
  word = word.toLowerCase().replace(/\s+/g, '_');

  this.lookupFromFiles([
    {index: this.nounIndex, data: this.nounData},
    {index: this.verbIndex, data: this.verbData},
    {index: this.adjIndex, data: this.adjData},
    {index: this.advIndex, data: this.advData},
  ], [], word, callback);
}

function get(synsetOffset, pos, callback) {
  var dataFile = this.getDataFile(pos);
  var wordnet = this;

  dataFile.get(synsetOffset, function(result) {
    callback(result);
  });
}

function getDataFile(pos) {
    switch(pos) {
      case 'n':
        return this.nounData;
      case 'v':
        return this.verbData;
      case 'a': case 's':
        return this.adjData;
      case 'r':
        return this.advData;
    }
}

function loadSynonyms(synonyms, results, ptrs, callback) {
  var wordnet = this;

  if(ptrs.length > 0) {
    var ptr = ptrs.pop();

    this.get(ptr.synsetOffset, ptr.pos, function(result) {
      synonyms.push(result);
      wordnet.loadSynonyms(synonyms, results, ptrs, callback);
    });
  } else {
    wordnet.loadResultSynonyms(synonyms, results, callback);
  }
}

function loadResultSynonyms(synonyms, results, callback) {
  var wordnet = this;

  if(results.length > 0) {
    var result = results.pop();
    wordnet.loadSynonyms(synonyms, results, result.ptrs, callback);
  } else
    callback(synonyms);
}

function lookupSynonyms(word, callback) {
  var wordnet = this;

  wordnet.lookup(word, function(results) {
    wordnet.loadResultSynonyms([], results, callback);
  });
}

function getSynonyms() {
  var wordnet = this;
  var callback = arguments[2] ? arguments[2] : arguments[1];
  var pos = arguments[0].pos ? arguments[0].pos : arguments[1];
  var synsetOffset = arguments[0].synsetOffset ? arguments[0].synsetOffset : arguments[0];

  this.get(synsetOffset, pos, function(result) {
    wordnet.loadSynonyms([], [], result.ptrs, callback);
  });
}

function WordNet(dataDir) {

  if (!dataDir) {
    try {
      var WNdb = require('WNdb');
    } catch(e) {
      console.error("Please 'npm install WNdb' before using WordNet module or specify a dict directory.");
      throw e;
    }
    dataDir = WNdb.path;
  }

  this.nounIndex = new IndexFile(dataDir, 'noun');
  this.verbIndex = new IndexFile(dataDir, 'verb');
  this.adjIndex = new IndexFile(dataDir, 'adj');
  this.advIndex = new IndexFile(dataDir, 'adv');

  this.nounData = new DataFile(dataDir, 'noun');
  this.verbData = new DataFile(dataDir, 'verb');
  this.adjData = new DataFile(dataDir, 'adj');
  this.advData = new DataFile(dataDir, 'adv');

  this.get = get;
  this.lookup = lookup;
  this.lookupFromFiles = lookupFromFiles;
  this.pushResults = pushResults;
  this.loadResultSynonyms = loadResultSynonyms;
  this.loadSynonyms = loadSynonyms;
  this.lookupSynonyms = lookupSynonyms;
  this.getSynonyms = getSynonyms;
  this.getDataFile = getDataFile;
}

module.exports = WordNet;

},{"./data_file":69,"./index_file":70,"WNdb":1}],72:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var  fs = require('fs'),
  path = require('path'),
  util = require('util');


function appendLineChar(fd, pos, buffPos, buff, callback) {
  if(buffPos >= buff.length) {
    var newBuff = new Buffer(buff.length * 2);
    buff.copy(newBuff, 0, 0, buff.length);
    buff = newBuff;
  }

  fs.read(fd, buff, buffPos, 1, pos, function(err, count) {
    if(err)
      console.log(err);
    else {
      if(buff[buffPos] == 10 || buffPos == buff.length)
        callback(buff.slice(0, buffPos).toString('ASCII'));
      else {
        appendLineChar(fd, pos + 1, buffPos + 1, buff, callback);
      }
    }
  });
}

function open(callback) {
  var filePath = this.filePath;

  fs.open(filePath, 'r', null, function(err, fd) {
    if (err) {
        console.log('Unable to open %s', filePath);
        return;
    }
    callback(err, fd, function() {fs.close(fd)});
  });
}

var WordNetFile = function(dataDir, fileName) {
  this.dataDir = dataDir;
  this.fileName = fileName;
  this.filePath = require('path').join(this.dataDir, this.fileName);
};

WordNetFile.prototype.open = open;
WordNetFile.appendLineChar = appendLineChar;

module.exports = WordNetFile;

},{"__browserify_Buffer":90,"fs":87,"path":92,"util":94}],73:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
Classifier = require('./classifier');

var BayesClassifier = function(smoothing) {
    Classifier.call(this);
    this.classFeatures = {};
    this.classTotals = {};
    this.totalExamples = 1; // start at one to smooth
    this.smoothing = smoothing === undefined ? 1.0 : smoothing;
};

util.inherits(BayesClassifier, Classifier);

function addExample(observation, label) {     
    if(!this.classFeatures[label]) {
        this.classFeatures[label] = {};
        this.classTotals[label] = 1; // give an extra for smoothing
    }

    if(observation instanceof Array){
        var i = observation.length;
        this.totalExamples++;
        this.classTotals[label]++;

        while(i--) {
	    if(observation[i]) {
                if(this.classFeatures[label][i]) {
		    this.classFeatures[label][i]++;
                } else {
		    // give an extra for smoothing
		    this.classFeatures[label][i] = 1 + this.smoothing;
                }
	    }
        }
    } else {
        // sparse observation
        for(var key in observation){
            value = observation[key];
            
            if(this.classFeatures[label][value]) {
	           this.classFeatures[label][value]++;
            } else {
                // give an extra for smoothing
	           this.classFeatures[label][value] = 1 + this.smoothing;
            }
        }
    }
}

function train() {
    
}

function probabilityOfClass(observation, label) {
    var prob = 0;

    if(observation instanceof Array){
        var i = observation.length;

        while(i--) {
	    if(observation[i]) {
                var count = this.classFeatures[label][i] || this.smoothing; 
                
	        // numbers are tiny, add logs rather than take product
                prob += Math.log(count / this.classTotals[label]);
	    }
        };
    } else {
        // sparse observation
        for(var key in observation){
            var count = this.classFeatures[label][observation[key]] || this.smoothing; 
            
	    // numbers are tiny, add logs rather than take product
            prob += Math.log(count / this.classTotals[label]);
        }
    }

    // p(C) * unlogging the above calculation P(X|C)
    prob = (this.classTotals[label] / this.totalExamples) * Math.exp(prob);
    
    return prob;
}

function getClassifications(observation) {
    var classifier = this;
    var labels = [];
    
    for(var className in this.classFeatures) {
	labels.push({label: className,
	      value: classifier.probabilityOfClass(observation, className)});
    }
    
    return labels.sort(function(x, y) {return y.value - x.value});
}

function restore(classifier) {
     classifier = Classifier.restore(classifier);
     classifier.__proto__ = BayesClassifier.prototype;
     
     return classifier;
}

BayesClassifier.prototype.addExample = addExample;
BayesClassifier.prototype.train = train;
BayesClassifier.prototype.getClassifications = getClassifications;
BayesClassifier.prototype.probabilityOfClass = probabilityOfClass;

BayesClassifier.restore = restore;

module.exports = BayesClassifier;
},{"./classifier":74,"util":94}],74:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

function Classifier() {
}

function restore(classifier) {
    classifier = typeof classifier == 'string' ?  JSON.parse(classifier) : classifier;
    
    return classifier;
}

function addExample(observation, classification) {
    throw 'Not implemented';
}

function classify(observation) {
    return this.getClassifications(observation)[0].label;
}

function train() {
    throw 'Not implemented';
}

Classifier.prototype.addExample = addExample;
Classifier.prototype.train = train;
Classifier.prototype.classify = classify;

Classifier.restore = restore;

module.exports = Classifier;

},{}],75:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
     Classifier = require('./classifier');

var sylvester = require('sylvester'),
Matrix = sylvester.Matrix,
Vector = sylvester.Vector;

function sigmoid(z) {
    return 1 / (1 + Math.exp(0 - z));
}

function hypothesis(theta, Observations) {
    return Observations.x(theta).map(sigmoid);
}

function cost(theta, Examples, classifications) {
    var hypothesisResult = hypothesis(theta, Examples);

    var ones = Vector.One(Examples.rows());
    var cost_1 = Vector.Zero(Examples.rows()).subtract(classifications).elementMultiply(hypothesisResult.log());
    var cost_0 = ones.subtract(classifications).elementMultiply(ones.subtract(hypothesisResult).log());

    return (1 / Examples.rows()) * cost_1.subtract(cost_0).sum();
}

function descendGradient(theta, Examples, classifications) {
    var maxIt = 500;
    var last;
    var current;
    var learningRate = 3;
    var learningRateFound = false;

    Examples = Matrix.One(Examples.rows(), 1).augment(Examples);
    theta = theta.augment([0]);

    while(!learningRateFound) {
	var i = 0;
	last = null;

	while(true) {
	    var hypothesisResult = hypothesis(theta, Examples);	
	    theta = theta.subtract(Examples.transpose().x(
		hypothesisResult.subtract(classifications)).x(1 / Examples.rows()).x(learningRate));
	    current = cost(theta, Examples, classifications);
	    
	    i++;
	    
	    if(last) {
		if(current < last)
		    learningRateFound = true;
		else
		    break;
		
		if(last - current < 0.0001)
		    break;
	    }

	    if(i >= maxIt)
		throw 'unable to find minimum';

	    last = current;
	}

	learningRate /= 3;
    }
    
    return theta.chomp(1);
}

var LogisticRegressionClassifier = function() {
    Classifier.call(this);
    this.examples = {};
    this.features = [];
    this.featurePositions = {};
    this.maxFeaturePosition = 0;
    this.classifications = [];
    this.exampleCount = 0;
};

util.inherits(LogisticRegressionClassifier, Classifier);

function createClassifications() {
    var classifications = [];

    for(var i = 0; i < this.exampleCount; i++) {
	var classification = [];

	for(var _ in this.examples)
	    classification.push(0);

	classifications.push(classification);
    }

    return classifications;
}

function computeThetas(Examples, Classifications) {
    this.theta = [];

    // each class will have it's own theta.
    for(var i = 1; i <= this.classifications.length; i++) {
	var theta = Examples.row(1).map(function() { return 0; });
	this.theta.push(descendGradient(theta, Examples, Classifications.column(i)));
    }
}

function train() {
    var examples = [];
    var classifications = this.createClassifications();
    var d = 0, c = 0;

    for(var classification in this.examples) {
	for(var i = 0; i < this.examples[classification].length; i++) {
	    var doc = this.examples[classification][i];
	    var example = doc;
	    
	    examples.push(example);
	    classifications[d][c] = 1;
	    d++;
	}

	c++;
    }

    this.computeThetas($M(examples), $M(classifications));
}

function addExample(data, classification) {    
    if(!this.examples[classification]) {
	this.examples[classification] = [];
	this.classifications.push(classification);
    }

    this.examples[classification].push(data);
    this.exampleCount++;
}

function getClassifications(observation) {
    observation = $V(observation);
    var classifications = [];

    for(var i = 0; i < this.theta.length; i++) {
	classifications.push({label: this.classifications[i], 
			      value: sigmoid(observation.dot(this.theta[i])) });
    }

    return classifications.sort(function(x, y) {return y.value - x.value});
}

function restore(classifier) {
    classifier = Classifier.restore(classifier);
    classifier.__proto__ = LogisticRegressionClassifier.prototype;

    return classifier;
}

LogisticRegressionClassifier.prototype.addExample = addExample;
LogisticRegressionClassifier.prototype.restore = restore;
LogisticRegressionClassifier.prototype.train = train;
LogisticRegressionClassifier.prototype.createClassifications = createClassifications;
LogisticRegressionClassifier.prototype.computeThetas = computeThetas;
LogisticRegressionClassifier.prototype.getClassifications = getClassifications;

LogisticRegressionClassifier.restore = restore;

module.exports = LogisticRegressionClassifier;

},{"./classifier":74,"sylvester":78,"util":94}],76:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Sylvester = require('sylvester'),
Matrix = Sylvester.Matrix,
Vector = Sylvester.Vector;

function KMeans(Observations) {
    if(!Observations.elements)
	Observations = $M(Observations);

    this.Observations = Observations;
}

// create an initial centroid matrix with initial values between 
// 0 and the max of feature data X.
function createCentroids(k) {
    var Centroid = [];
    var maxes = this.Observations.maxColumns();
    //console.log(maxes);

    for(var i = 1; i <= k; i++) {
	var centroid = [];
	
	for(var j = 1; j <= this.Observations.cols(); j++) {
	    centroid.push(Math.random() * maxes.e(j));
	}

	Centroid.push(centroid);
    }

    //console.log(centroid)
    
    return $M(Centroid);
}

// get the euclidian distance between the feature data X and
// a given centroid matrix C.
function distanceFrom(Centroids) {
    var distances = [];

    for(var i = 1; i <= this.Observations.rows(); i++) {
	var distance = [];

	for(var j = 1; j <= Centroids.rows(); j++) {
	    distance.push(this.Observations.row(i).distanceFrom(Centroids.row(j)));
	}

	distances.push(distance);
    }

    return $M(distances);
}

// categorize the feature data X into k clusters. return a vector
// containing the results.
function cluster(k) {
    var Centroids = this.createCentroids(k);
    var LastDistances = Matrix.Zero(this.Observations.rows(), this.Observations.cols());
    var Distances = this.distanceFrom(Centroids);
    var Groups;

    while(!(LastDistances.eql(Distances))) {
	Groups = Distances.minColumnIndexes();
	LastDistances = Distances;

	var newCentroids = [];

	for(var i = 1; i <= Centroids.rows(); i++) {
	    var centroid = [];

	    for(var j = 1; j <= Centroids.cols(); j++) {
		var sum = 0;
		var count = 0;

		for(var l = 1; l <= this.Observations.rows(); l++) {
		    if(Groups.e(l) == i) {
			count++;
			sum += this.Observations.e(l, j);
		    }
		}

		centroid.push(sum / count);
	    }

	    newCentroids.push(centroid);
	}
	
	Centroids = $M(newCentroids);
	Distances = this.distanceFrom(Centroids);
    }

    return Groups;
}

KMeans.prototype.createCentroids = createCentroids;
KMeans.prototype.distanceFrom = distanceFrom;
KMeans.prototype.cluster = cluster;

module.exports = KMeans;

},{"sylvester":78}],77:[function(require,module,exports){

exports.BayesClassifier = require('./classifier/bayes_classifier');
exports.LogisticRegressionClassifier = require('./classifier/logistic_regression_classifier');
exports.KMeans = require('./clusterer/kmeans');

},{"./classifier/bayes_classifier":73,"./classifier/logistic_regression_classifier":75,"./clusterer/kmeans":76}],78:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright (c) 2011, Chris Umbel

exports.Vector = require('./vector');
global.$V = exports.Vector.create;
exports.Matrix = require('./matrix');
global.$M = exports.Matrix.create;
exports.Line = require('./line');
global.$L = exports.Line.create;
exports.Plane = require('./plane');
global.$P = exports.Plane.create;
exports.Line.Segment = require('./line.segment');
exports.Sylvester = require('./sylvester');

},{"./line":79,"./line.segment":80,"./matrix":81,"./plane":82,"./sylvester":83,"./vector":84}],79:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
var Vector = require('./vector');
var Matrix = require('./matrix');
var Plane = require('./plane');
var Sylvester = require('./sylvester');

// Line class - depends on Vector, and some methods require Matrix and Plane.

function Line() {}
Line.prototype = {

  // Returns true if the argument occupies the same space as the line
  eql: function(line) {
    return (this.isParallelTo(line) && this.contains(line.anchor));
  },

  // Returns a copy of the line
  dup: function() {
    return Line.create(this.anchor, this.direction);
  },

  // Returns the result of translating the line by the given vector/array
  translate: function(vector) {
    var V = vector.elements || vector;
    return Line.create([
      this.anchor.elements[0] + V[0],
      this.anchor.elements[1] + V[1],
      this.anchor.elements[2] + (V[2] || 0)
    ], this.direction);
  },

  // Returns true if the line is parallel to the argument. Here, 'parallel to'
  // means that the argument's direction is either parallel or antiparallel to
  // the line's own direction. A line is parallel to a plane if the two do not
  // have a unique intersection.
  isParallelTo: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.isParallelTo(this); }
    var theta = this.direction.angleFrom(obj.direction);
    return (Math.abs(theta) <= Sylvester.precision || Math.abs(theta - Math.PI) <= Sylvester.precision);
  },

  // Returns the line's perpendicular distance from the argument,
  // which can be a point, a line or a plane
  distanceFrom: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.distanceFrom(this); }
    if (obj.direction) {
      // obj is a line
      if (this.isParallelTo(obj)) { return this.distanceFrom(obj.anchor); }
      var N = this.direction.cross(obj.direction).toUnitVector().elements;
      var A = this.anchor.elements, B = obj.anchor.elements;
      return Math.abs((A[0] - B[0]) * N[0] + (A[1] - B[1]) * N[1] + (A[2] - B[2]) * N[2]);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      var A = this.anchor.elements, D = this.direction.elements;
      var PA1 = P[0] - A[0], PA2 = P[1] - A[1], PA3 = (P[2] || 0) - A[2];
      var modPA = Math.sqrt(PA1*PA1 + PA2*PA2 + PA3*PA3);
      if (modPA === 0) return 0;
      // Assumes direction vector is normalized
      var cosTheta = (PA1 * D[0] + PA2 * D[1] + PA3 * D[2]) / modPA;
      var sin2 = 1 - cosTheta*cosTheta;
      return Math.abs(modPA * Math.sqrt(sin2 < 0 ? 0 : sin2));
    }
  },

  // Returns true iff the argument is a point on the line, or if the argument
  // is a line segment lying within the receiver
  contains: function(obj) {
    if (obj.start && obj.end) { return this.contains(obj.start) && this.contains(obj.end); }
    var dist = this.distanceFrom(obj);
    return (dist !== null && dist <= Sylvester.precision);
  },

  // Returns the distance from the anchor of the given point. Negative values are
  // returned for points that are in the opposite direction to the line's direction from
  // the line's anchor point.
  positionOf: function(point) {
    if (!this.contains(point)) { return null; }
    var P = point.elements || point;
    var A = this.anchor.elements, D = this.direction.elements;
    return (P[0] - A[0]) * D[0] + (P[1] - A[1]) * D[1] + ((P[2] || 0) - A[2]) * D[2];
  },

  // Returns true iff the line lies in the given plane
  liesIn: function(plane) {
    return plane.contains(this);
  },

  // Returns true iff the line has a unique point of intersection with the argument
  intersects: function(obj) {
    if (obj.normal) { return obj.intersects(this); }
    return (!this.isParallelTo(obj) && this.distanceFrom(obj) <= Sylvester.precision);
  },

  // Returns the unique intersection point with the argument, if one exists
  intersectionWith: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.intersectionWith(this); }
    if (!this.intersects(obj)) { return null; }
    var P = this.anchor.elements, X = this.direction.elements,
        Q = obj.anchor.elements, Y = obj.direction.elements;
    var X1 = X[0], X2 = X[1], X3 = X[2], Y1 = Y[0], Y2 = Y[1], Y3 = Y[2];
    var PsubQ1 = P[0] - Q[0], PsubQ2 = P[1] - Q[1], PsubQ3 = P[2] - Q[2];
    var XdotQsubP = - X1*PsubQ1 - X2*PsubQ2 - X3*PsubQ3;
    var YdotPsubQ = Y1*PsubQ1 + Y2*PsubQ2 + Y3*PsubQ3;
    var XdotX = X1*X1 + X2*X2 + X3*X3;
    var YdotY = Y1*Y1 + Y2*Y2 + Y3*Y3;
    var XdotY = X1*Y1 + X2*Y2 + X3*Y3;
    var k = (XdotQsubP * YdotY / XdotX + XdotY * YdotPsubQ) / (YdotY - XdotY * XdotY);
    return Vector.create([P[0] + k*X1, P[1] + k*X2, P[2] + k*X3]);
  },

  // Returns the point on the line that is closest to the given point or line/line segment
  pointClosestTo: function(obj) {
    if (obj.start && obj.end) {
      // obj is a line segment
      var P = obj.pointClosestTo(this);
      return (P === null) ? null : this.pointClosestTo(P);
    } else if (obj.direction) {
      // obj is a line
      if (this.intersects(obj)) { return this.intersectionWith(obj); }
      if (this.isParallelTo(obj)) { return null; }
      var D = this.direction.elements, E = obj.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], E1 = E[0], E2 = E[1], E3 = E[2];
      // Create plane containing obj and the shared normal and intersect this with it
      // Thank you: http://www.cgafaq.info/wiki/Line-line_distance
      var x = (D3 * E1 - D1 * E3), y = (D1 * E2 - D2 * E1), z = (D2 * E3 - D3 * E2);
      var N = [x * E3 - y * E2, y * E1 - z * E3, z * E2 - x * E1];
      var P = Plane.create(obj.anchor, N);
      return P.intersectionWith(this);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      if (this.contains(P)) { return Vector.create(P); }
      var A = this.anchor.elements, D = this.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], A1 = A[0], A2 = A[1], A3 = A[2];
      var x = D1 * (P[1]-A2) - D2 * (P[0]-A1), y = D2 * ((P[2] || 0) - A3) - D3 * (P[1]-A2),
          z = D3 * (P[0]-A1) - D1 * ((P[2] || 0) - A3);
      var V = Vector.create([D2 * x - D3 * z, D3 * y - D1 * x, D1 * z - D2 * y]);
      var k = this.distanceFrom(P) / V.modulus();
      return Vector.create([
        P[0] + V.elements[0] * k,
        P[1] + V.elements[1] * k,
        (P[2] || 0) + V.elements[2] * k
      ]);
    }
  },

  // Returns a copy of the line rotated by t radians about the given line. Works by
  // finding the argument's closest point to this line's anchor point (call this C) and
  // rotating the anchor about C. Also rotates the line's direction about the argument's.
  // Be careful with this - the rotation axis' direction affects the outcome!
  rotate: function(t, line) {
    // If we're working in 2D
    if (typeof(line.direction) == 'undefined') { line = Line.create(line.to3D(), Vector.k); }
    var R = Matrix.Rotation(t, line.direction).elements;
    var C = line.pointClosestTo(this.anchor).elements;
    var A = this.anchor.elements, D = this.direction.elements;
    var C1 = C[0], C2 = C[1], C3 = C[2], A1 = A[0], A2 = A[1], A3 = A[2];
    var x = A1 - C1, y = A2 - C2, z = A3 - C3;
    return Line.create([
      C1 + R[0][0] * x + R[0][1] * y + R[0][2] * z,
      C2 + R[1][0] * x + R[1][1] * y + R[1][2] * z,
      C3 + R[2][0] * x + R[2][1] * y + R[2][2] * z
    ], [
      R[0][0] * D[0] + R[0][1] * D[1] + R[0][2] * D[2],
      R[1][0] * D[0] + R[1][1] * D[1] + R[1][2] * D[2],
      R[2][0] * D[0] + R[2][1] * D[1] + R[2][2] * D[2]
    ]);
  },

  // Returns a copy of the line with its direction vector reversed.
  // Useful when using lines for rotations.
  reverse: function() {
    return Line.create(this.anchor, this.direction.x(-1));
  },

  // Returns the line's reflection in the given point or line
  reflectionIn: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var A = this.anchor.elements, D = this.direction.elements;
      var A1 = A[0], A2 = A[1], A3 = A[2], D1 = D[0], D2 = D[1], D3 = D[2];
      var newA = this.anchor.reflectionIn(obj).elements;
      // Add the line's direction vector to its anchor, then mirror that in the plane
      var AD1 = A1 + D1, AD2 = A2 + D2, AD3 = A3 + D3;
      var Q = obj.pointClosestTo([AD1, AD2, AD3]).elements;
      var newD = [Q[0] + (Q[0] - AD1) - newA[0], Q[1] + (Q[1] - AD2) - newA[1], Q[2] + (Q[2] - AD3) - newA[2]];
      return Line.create(newA, newD);
    } else if (obj.direction) {
      // obj is a line - reflection obtained by rotating PI radians about obj
      return this.rotate(Math.PI, obj);
    } else {
      // obj is a point - just reflect the line's anchor in it
      var P = obj.elements || obj;
      return Line.create(this.anchor.reflectionIn([P[0], P[1], (P[2] || 0)]), this.direction);
    }
  },

  // Set the line's anchor point and direction.
  setVectors: function(anchor, direction) {
    // Need to do this so that line's properties are not
    // references to the arguments passed in
    anchor = Vector.create(anchor);
    direction = Vector.create(direction);
    if (anchor.elements.length == 2) {anchor.elements.push(0); }
    if (direction.elements.length == 2) { direction.elements.push(0); }
    if (anchor.elements.length > 3 || direction.elements.length > 3) { return null; }
    var mod = direction.modulus();
    if (mod === 0) { return null; }
    this.anchor = anchor;
    this.direction = Vector.create([
      direction.elements[0] / mod,
      direction.elements[1] / mod,
      direction.elements[2] / mod
    ]);
    return this;
  }
};

// Constructor function
Line.create = function(anchor, direction) {
  var L = new Line();
  return L.setVectors(anchor, direction);
};

// Axes
Line.X = Line.create(Vector.Zero(3), Vector.i);
Line.Y = Line.create(Vector.Zero(3), Vector.j);
Line.Z = Line.create(Vector.Zero(3), Vector.k);

module.exports = Line;

},{"./matrix":81,"./plane":82,"./sylvester":83,"./vector":84}],80:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
// Line.Segment class - depends on Line and its dependencies.

var Line = require('./line');
var Vector = require('./vector');

Line.Segment = function() {};
Line.Segment.prototype = {

  // Returns true iff the line segment is equal to the argument
  eql: function(segment) {
    return (this.start.eql(segment.start) && this.end.eql(segment.end)) ||
        (this.start.eql(segment.end) && this.end.eql(segment.start));
  },

  // Returns a copy of the line segment
  dup: function() {
    return Line.Segment.create(this.start, this.end);
  },

  // Returns the length of the line segment
  length: function() {
    var A = this.start.elements, B = this.end.elements;
    var C1 = B[0] - A[0], C2 = B[1] - A[1], C3 = B[2] - A[2];
    return Math.sqrt(C1*C1 + C2*C2 + C3*C3);
  },

  // Returns the line segment as a vector equal to its
  // end point relative to its endpoint
  toVector: function() {
    var A = this.start.elements, B = this.end.elements;
    return Vector.create([B[0] - A[0], B[1] - A[1], B[2] - A[2]]);
  },

  // Returns the segment's midpoint as a vector
  midpoint: function() {
    var A = this.start.elements, B = this.end.elements;
    return Vector.create([(B[0] + A[0])/2, (B[1] + A[1])/2, (B[2] + A[2])/2]);
  },

  // Returns the plane that bisects the segment
  bisectingPlane: function() {
    return Plane.create(this.midpoint(), this.toVector());
  },

  // Returns the result of translating the line by the given vector/array
  translate: function(vector) {
    var V = vector.elements || vector;
    var S = this.start.elements, E = this.end.elements;
    return Line.Segment.create(
      [S[0] + V[0], S[1] + V[1], S[2] + (V[2] || 0)],
      [E[0] + V[0], E[1] + V[1], E[2] + (V[2] || 0)]
    );
  },

  // Returns true iff the line segment is parallel to the argument. It simply forwards
  // the method call onto its line property.
  isParallelTo: function(obj) {
    return this.line.isParallelTo(obj);
  },

  // Returns the distance between the argument and the line segment's closest point to the argument
  distanceFrom: function(obj) {
    var P = this.pointClosestTo(obj);
    return (P === null) ? null : P.distanceFrom(obj);
  },

  // Returns true iff the given point lies on the segment
  contains: function(obj) {
    if (obj.start && obj.end) { return this.contains(obj.start) && this.contains(obj.end); }
    var P = (obj.elements || obj).slice();
    if (P.length == 2) { P.push(0); }
    if (this.start.eql(P)) { return true; }
    var S = this.start.elements;
    var V = Vector.create([S[0] - P[0], S[1] - P[1], S[2] - (P[2] || 0)]);
    var vect = this.toVector();
    return V.isAntiparallelTo(vect) && V.modulus() <= vect.modulus();
  },

  // Returns true iff the line segment intersects the argument
  intersects: function(obj) {
    return (this.intersectionWith(obj) !== null);
  },

  // Returns the unique point of intersection with the argument
  intersectionWith: function(obj) {
    if (!this.line.intersects(obj)) { return null; }
    var P = this.line.intersectionWith(obj);
    return (this.contains(P) ? P : null);
  },

  // Returns the point on the line segment closest to the given object
  pointClosestTo: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var V = this.line.intersectionWith(obj);
      if (V === null) { return null; }
      return this.pointClosestTo(V);
    } else {
      // obj is a line (segment) or point
      var P = this.line.pointClosestTo(obj);
      if (P === null) { return null; }
      if (this.contains(P)) { return P; }
      return (this.line.positionOf(P) < 0 ? this.start : this.end).dup();
    }
  },

  // Set the start and end-points of the segment
  setPoints: function(startPoint, endPoint) {
    startPoint = Vector.create(startPoint).to3D();
    endPoint = Vector.create(endPoint).to3D();
    if (startPoint === null || endPoint === null) { return null; }
    this.line = Line.create(startPoint, endPoint.subtract(startPoint));
    this.start = startPoint;
    this.end = endPoint;
    return this;
  }
};

// Constructor function
Line.Segment.create = function(v1, v2) {
  var S = new Line.Segment();
  return S.setPoints(v1, v2);
};

module.exports = Line.Segment;

},{"./line":79,"./vector":84}],81:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
// Matrix class - depends on Vector.

var fs = require('fs');
var Sylvester = require('./sylvester');
var Vector = require('./vector');

// augment a matrix M with identity rows/cols
function identSize(M, m, n, k) {
    var e = M.elements;
    var i = k - 1;

    while(i--) {
	var row = [];
	
	for(var j = 0; j < n; j++)
	    row.push(j == i ? 1 : 0);
	
        e.unshift(row);
    }
    
    for(var i = k - 1; i < m; i++) {
        while(e[i].length < n)
            e[i].unshift(0);
    }

    return $M(e);
}

function pca(X) {
    var Sigma = X.transpose().x(X).x(1 / X.rows());
    var svd = Sigma.svd();
    return {U: svd.U, S: svd.S};
}

// singular value decomposition in pure javascript
function svdJs() {
    var A = this;
    var V = Matrix.I(A.rows());
    var S = A.transpose();
    var U = Matrix.I(A.cols());
    var err = Number.MAX_VALUE;
    var i = 0;
    var maxLoop = 100;

    while(err > 2.2737e-13 && i < maxLoop) {
        var qr = S.transpose().qrJs();
        S = qr.R;
        V = V.x(qr.Q);
        qr = S.transpose().qrJs();
        U = U.x(qr.Q);
        S = qr.R;

        var e = S.triu(1).unroll().norm();
        var f = S.diagonal().norm();

        if(f == 0)
            f = 1;

        err = e / f;

        i++;
    }

    var ss = S.diagonal();
    var s = [];

    for(var i = 1; i <= ss.cols(); i++) {
        var ssn = ss.e(i);
        s.push(Math.abs(ssn));

        if(ssn < 0) {
            for(var j = 0; j < U.rows(); j++) {
                V.elements[j][i - 1] = -(V.elements[j][i - 1]);
            }
        }
    }

    return {U: U, S: $V(s).toDiagonalMatrix(), V: V};
}

// singular value decomposition using LAPACK
function svdPack() {
    var result = lapack.sgesvd('A', 'A', this.elements);

    return {
        U: $M(result.U),
        S: $M(result.S).column(1).toDiagonalMatrix(),
	V: $M(result.VT).transpose()
    };
}

// QR decomposition in pure javascript
function qrJs() {
    var m = this.rows();
    var n = this.cols();
    var Q = Matrix.I(m);
    var A = this;
    
    for(var k = 1; k < Math.min(m, n); k++) {
	var ak = A.slice(k, 0, k, k).col(1);
	var oneZero = [1];
	
	while(oneZero.length <=  m - k)
	    oneZero.push(0);
	
	oneZero = $V(oneZero);
	var vk = ak.add(oneZero.x(ak.norm() * Math.sign(ak.e(1))));
	var Vk = $M(vk);
	var Hk = Matrix.I(m - k + 1).subtract(Vk.x(2).x(Vk.transpose()).div(Vk.transpose().x(Vk).e(1, 1)));
	var Qk = identSize(Hk, m, n, k);
	A = Qk.x(A);
	// slow way to compute Q
	Q = Q.x(Qk);
    }
    
    return {Q: Q, R: A};
}

// QR decomposition using LAPACK
function qrPack() {
    var qr = lapack.qr(this.elements);

    return {
	Q: $M(qr.Q),
	R: $M(qr.R)
    };
}

function Matrix() {}
Matrix.prototype = {
    // solve a system of linear equations (work in progress)
    solve: function(b) {
	var lu = this.lu();
	b = lu.P.x(b);
	var y = lu.L.forwardSubstitute(b);
	var x = lu.U.backSubstitute(y);
	return lu.P.x(x);
	//return this.inv().x(b);
    },

    // project a matrix onto a lower dim
    pcaProject: function(k, U) {
	var U = U || pca(this).U;
	var Ureduce= U.slice(1, U.rows(), 1, k);
	return {Z: this.x(Ureduce), U: U};
    },

    // recover a matrix to a higher dimension
    pcaRecover: function(U) {
	var k = this.cols();
	var Ureduce = U.slice(1, U.rows(), 1, k);
	return this.x(Ureduce.transpose());
    },    

    // grab the upper triangular part of the matrix
    triu: function(k) {
	if(!k)
	    k = 0;
	
	return this.map(function(x, i, j) {
	    return j - i >= k ? x : 0;
	});
    },

    // unroll a matrix into a vector
    unroll: function() {
	var v = [];
	
	for(var i = 1; i <= this.cols(); i++) {
	    for(var j = 1; j <= this.rows(); j++) {
		v.push(this.e(j, i));
	    }
	}

	return $V(v);
    },

    // return a sub-block of the matrix
    slice: function(startRow, endRow, startCol, endCol) {
	var x = [];
	
	if(endRow == 0)
	    endRow = this.rows();
	
	if(endCol == 0)
	    endCol = this.cols();

	for(i = startRow; i <= endRow; i++) {
	    var row = [];

	    for(j = startCol; j <= endCol; j++) {
		row.push(this.e(i, j));
	    }

	    x.push(row);
	}

	return $M(x);
    },

    // Returns element (i,j) of the matrix
    e: function(i,j) {
	if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) { return null; }
	return this.elements[i - 1][j - 1];
    },

    // Returns row k of the matrix as a vector
    row: function(i) {
	if (i > this.elements.length) { return null; }
	return $V(this.elements[i - 1]);
    },

    // Returns column k of the matrix as a vector
    col: function(j) {
	if (j > this.elements[0].length) { return null; }
	var col = [], n = this.elements.length;
	for (var i = 0; i < n; i++) { col.push(this.elements[i][j - 1]); }
	return $V(col);
    },

    // Returns the number of rows/columns the matrix has
    dimensions: function() {
	return {rows: this.elements.length, cols: this.elements[0].length};
    },

    // Returns the number of rows in the matrix
    rows: function() {
	return this.elements.length;
    },

    // Returns the number of columns in the matrix
    cols: function() {
	return this.elements[0].length;
    },

    approxEql: function(matrix) {
	return this.eql(matrix, Sylvester.approxPrecision);
    },

    // Returns true iff the matrix is equal to the argument. You can supply
    // a vector as the argument, in which case the receiver must be a
    // one-column matrix equal to the vector.
    eql: function(matrix, precision) {
	var M = matrix.elements || matrix;
	if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	if (this.elements.length != M.length ||
            this.elements[0].length != M[0].length) { return false; }
	var i = this.elements.length, nj = this.elements[0].length, j;
	while (i--) { j = nj;
		      while (j--) {
			  if (Math.abs(this.elements[i][j] - M[i][j]) > (precision || Sylvester.precision)) { return false; }
		      }
		    }
	return true;
    },

    // Returns a copy of the matrix
    dup: function() {
	return Matrix.create(this.elements);
    },

    // Maps the matrix to another matrix (of the same dimensions) according to the given function
    map: function(fn) {
    var els = [], i = this.elements.length, nj = this.elements[0].length, j;
	while (i--) { j = nj;
		      els[i] = [];
		      while (j--) {
			  els[i][j] = fn(this.elements[i][j], i + 1, j + 1);
		      }
		    }
	return Matrix.create(els);
    },

    // Returns true iff the argument has the same dimensions as the matrix
    isSameSizeAs: function(matrix) {
	var M = matrix.elements || matrix;
	if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	return (this.elements.length == M.length &&
		this.elements[0].length == M[0].length);
    },

    // Returns the result of adding the argument to the matrix
    add: function(matrix) {
	if(typeof(matrix) == 'number') {
	    return this.map(function(x, i, j) { return x + matrix});
	} else {
	    var M = matrix.elements || matrix;
	    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	    if (!this.isSameSizeAs(M)) { return null; }
	    return this.map(function(x, i, j) { return x + M[i - 1][j - 1]; });
	}
    },

    // Returns the result of subtracting the argument from the matrix
    subtract: function(matrix) {
	if(typeof(matrix) == 'number') {
	    return this.map(function(x, i, j) { return x - matrix});
	} else {
	    var M = matrix.elements || matrix;
	    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	    if (!this.isSameSizeAs(M)) { return null; }
	    return this.map(function(x, i, j) { return x - M[i - 1][j - 1]; });
	}
    },

    // Returns true iff the matrix can multiply the argument from the left
    canMultiplyFromLeft: function(matrix) {
	var M = matrix.elements || matrix;
	if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	// this.columns should equal matrix.rows
	return (this.elements[0].length == M.length);
    },

    // Returns the result of a multiplication-style operation the matrix from the right by the argument.
    // If the argument is a scalar then just operate on all the elements. If the argument is
    // a vector, a vector is returned, which saves you having to remember calling
    // col(1) on the result.
    mulOp: function(matrix, op) {
	if (!matrix.elements) {
	    return this.map(function(x) { return op(x, matrix); });
	}

	var returnVector = matrix.modulus ? true : false;
	var M = matrix.elements || matrix;
	if (typeof(M[0][0]) == 'undefined') 
	    M = Matrix.create(M).elements;
	if (!this.canMultiplyFromLeft(M)) 
	    return null; 
	var e = this.elements, rowThis, rowElem, elements = [],
        sum, m = e.length, n = M[0].length, o = e[0].length, i = m, j, k;

	while (i--) {
            rowElem = [];
            rowThis = e[i];
            j = n;

            while (j--) {
		sum = 0;
		k = o;

		while (k--) {
                    sum += op(rowThis[k], M[k][j]);
		}

		rowElem[j] = sum;
            }

            elements[i] = rowElem;
	}

	var M = Matrix.create(elements);
	return returnVector ? M.col(1) : M;
    },

    // Returns the result of dividing the matrix from the right by the argument.
    // If the argument is a scalar then just divide all the elements. If the argument is
    // a vector, a vector is returned, which saves you having to remember calling
    // col(1) on the result.
    div: function(matrix) {
	return this.mulOp(matrix, function(x, y) { return x / y});
    },

    // Returns the result of multiplying the matrix from the right by the argument.
    // If the argument is a scalar then just multiply all the elements. If the argument is
    // a vector, a vector is returned, which saves you having to remember calling
    // col(1) on the result.
    multiply: function(matrix) {
	return this.mulOp(matrix, function(x, y) { return x * y});
    },

    x: function(matrix) { return this.multiply(matrix); },

    elementMultiply: function(v) {
        return this.map(function(k, i, j) {
            return v.e(i, j) * k;
        });
    },

    // sum all elements in the matrix
    sum: function() {
        var sum = 0;

        this.map(function(x) { sum += x;});

        return sum;
    },

    // Returns a Vector of each colum averaged.
    mean: function() {
      var dim = this.dimensions();
      var r = [];
      for (var i = 1; i <= dim.cols; i++) {
        r.push(this.col(i).sum() / dim.rows);
      }
      return $V(r);
    },

    column: function(n) {
	return this.col(n);
    },

    // element-wise log
    log: function() {
	return this.map(function(x) { return Math.log(x); });
    },

    // Returns a submatrix taken from the matrix
    // Argument order is: start row, start col, nrows, ncols
    // Element selection wraps if the required index is outside the matrix's bounds, so you could
    // use this to perform row/column cycling or copy-augmenting.
    minor: function(a, b, c, d) {
	var elements = [], ni = c, i, nj, j;
	var rows = this.elements.length, cols = this.elements[0].length;
	while (ni--) {
	    i = c - ni - 1;
	    elements[i] = [];
	    nj = d;
	    while (nj--) {
		j = d - nj - 1;
		elements[i][j] = this.elements[(a + i - 1) % rows][(b + j - 1) % cols];
	    }
	}
	return Matrix.create(elements);
    },

    // Returns the transpose of the matrix
    transpose: function() {
    var rows = this.elements.length, i, cols = this.elements[0].length, j;
	var elements = [], i = cols;
	while (i--) {
	    j = rows;
	    elements[i] = [];
	    while (j--) {
		elements[i][j] = this.elements[j][i];
	    }
	}
	return Matrix.create(elements);
    },

    // Returns true iff the matrix is square
    isSquare: function() {
	return (this.elements.length == this.elements[0].length);
    },

    // Returns the (absolute) largest element of the matrix
    max: function() {
	var m = 0, i = this.elements.length, nj = this.elements[0].length, j;
	while (i--) {
	    j = nj;
	    while (j--) {
		if (Math.abs(this.elements[i][j]) > Math.abs(m)) { m = this.elements[i][j]; }
	    }
	}
	return m;
    },

    // Returns the indeces of the first match found by reading row-by-row from left to right
    indexOf: function(x) {
	var index = null, ni = this.elements.length, i, nj = this.elements[0].length, j;
	for (i = 0; i < ni; i++) {
	    for (j = 0; j < nj; j++) {
		if (this.elements[i][j] == x) { return {i: i + 1, j: j + 1}; }
	    }
	}
	return null;
    },

    // If the matrix is square, returns the diagonal elements as a vector.
    // Otherwise, returns null.
    diagonal: function() {
	if (!this.isSquare) { return null; }
	var els = [], n = this.elements.length;
	for (var i = 0; i < n; i++) {
	    els.push(this.elements[i][i]);
	}
	return $V(els);
    },

    // Make the matrix upper (right) triangular by Gaussian elimination.
    // This method only adds multiples of rows to other rows. No rows are
    // scaled up or switched, and the determinant is preserved.
    toRightTriangular: function() {
	var M = this.dup(), els;
	var n = this.elements.length, i, j, np = this.elements[0].length, p;
	for (i = 0; i < n; i++) {
	    if (M.elements[i][i] == 0) {
		for (j = i + 1; j < n; j++) {
		    if (M.elements[j][i] != 0) {
			els = [];
			for (p = 0; p < np; p++) { els.push(M.elements[i][p] + M.elements[j][p]); }
			M.elements[i] = els;
			break;
		    }
		}
	    }
	    if (M.elements[i][i] != 0) {
		for (j = i + 1; j < n; j++) {
		    var multiplier = M.elements[j][i] / M.elements[i][i];
		    els = [];
		    for (p = 0; p < np; p++) {
			// Elements with column numbers up to an including the number
			// of the row that we're subtracting can safely be set straight to
			// zero, since that's the point of this routine and it avoids having
			// to loop over and correct rounding errors later
			els.push(p <= i ? 0 : M.elements[j][p] - M.elements[i][p] * multiplier);
		    }
		    M.elements[j] = els;
		}
	    }
	}
	return M;
    },

    toUpperTriangular: function() { return this.toRightTriangular(); },

    // Returns the determinant for square matrices
    determinant: function() {
	if (!this.isSquare()) { return null; }
	if (this.cols == 1 && this.rows == 1) { return this.row(1); }
	if (this.cols == 0 && this.rows == 0) { return 1; }
	var M = this.toRightTriangular();
	var det = M.elements[0][0], n = M.elements.length;
	for (var i = 1; i < n; i++) {
	    det = det * M.elements[i][i];
	}
	return det;
    },
    det: function() { return this.determinant(); },

    // Returns true iff the matrix is singular
    isSingular: function() {
	return (this.isSquare() && this.determinant() === 0);
    },

    // Returns the trace for square matrices
    trace: function() {
	if (!this.isSquare()) { return null; }
	var tr = this.elements[0][0], n = this.elements.length;
	for (var i = 1; i < n; i++) {
	    tr += this.elements[i][i];
	}
	return tr;
    },

    tr: function() { return this.trace(); },

    // Returns the rank of the matrix
    rank: function() {
	var M = this.toRightTriangular(), rank = 0;
	var i = this.elements.length, nj = this.elements[0].length, j;
	while (i--) {
	    j = nj;
	    while (j--) {
		if (Math.abs(M.elements[i][j]) > Sylvester.precision) { rank++; break; }
	    }
	}
	return rank;
    },

    rk: function() { return this.rank(); },

    // Returns the result of attaching the given argument to the right-hand side of the matrix
    augment: function(matrix) {
	var M = matrix.elements || matrix;
	if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
	var T = this.dup(), cols = T.elements[0].length;
	var i = T.elements.length, nj = M[0].length, j;
	if (i != M.length) { return null; }
	while (i--) {
	    j = nj;
	    while (j--) {
		T.elements[i][cols + j] = M[i][j];
	    }
	}
	return T;
    },

    // Returns the inverse (if one exists) using Gauss-Jordan
    inverse: function() {
	if (!this.isSquare() || this.isSingular()) { return null; }
	var n = this.elements.length, i = n, j;
	var M = this.augment(Matrix.I(n)).toRightTriangular();
	var np = M.elements[0].length, p, els, divisor;
	var inverse_elements = [], new_element;
	// Matrix is non-singular so there will be no zeros on the diagonal
	// Cycle through rows from last to first
	while (i--) {
	    // First, normalise diagonal elements to 1
	    els = [];
	    inverse_elements[i] = [];
	    divisor = M.elements[i][i];
	    for (p = 0; p < np; p++) {
        new_element = M.elements[i][p] / divisor;
		els.push(new_element);
		// Shuffle off the current row of the right hand side into the results
		// array as it will not be modified by later runs through this loop
		if (p >= n) { inverse_elements[i].push(new_element); }
	    }
	    M.elements[i] = els;
	    // Then, subtract this row from those above it to
	    // give the identity matrix on the left hand side
	    j = i;
	    while (j--) {
		els = [];
		for (p = 0; p < np; p++) {
		    els.push(M.elements[j][p] - M.elements[i][p] * M.elements[j][i]);
		}
		M.elements[j] = els;
	    }
	}
	return Matrix.create(inverse_elements);
    },

    inv: function() { return this.inverse(); },

    // Returns the result of rounding all the elements
    round: function() {
	return this.map(function(x) { return Math.round(x); });
    },

    // Returns a copy of the matrix with elements set to the given value if they
    // differ from it by less than Sylvester.precision
    snapTo: function(x) {
	return this.map(function(p) {
	    return (Math.abs(p - x) <= Sylvester.precision) ? x : p;
	});
    },

    // Returns a string representation of the matrix
    inspect: function() {
	var matrix_rows = [];
	var n = this.elements.length;
	for (var i = 0; i < n; i++) {
	    matrix_rows.push($V(this.elements[i]).inspect());
	}
	return matrix_rows.join('\n');
    },

    // Returns a array representation of the matrix
    toArray: function() {
    	var matrix_rows = [];
    	var n = this.elements.length;
    	for (var i = 0; i < n; i++) {
        matrix_rows.push(this.elements[i]);
    	}
      return matrix_rows;
    },


    // Set the matrix's elements from an array. If the argument passed
    // is a vector, the resulting matrix will be a single column.
    setElements: function(els) {
	var i, j, elements = els.elements || els;
	if (typeof(elements[0][0]) != 'undefined') {
	    i = elements.length;
	    this.elements = [];
	    while (i--) {
		j = elements[i].length;
		this.elements[i] = [];
		while (j--) {
		    this.elements[i][j] = elements[i][j];
		}
	    }
	    return this;
	}
	var n = elements.length;
	this.elements = [];
	for (i = 0; i < n; i++) {
	    this.elements.push([elements[i]]);
	}
	return this;
    },

    // return the indexes of the columns with the largest value
    // for each row
    maxColumnIndexes: function() {
	var maxes = [];

	for(var i = 1; i <= this.rows(); i++) {
	    var max = null;
	    var maxIndex = -1;

	    for(var j = 1; j <= this.cols(); j++) {
		if(max === null || this.e(i, j) > max) {
		    max = this.e(i, j);
		    maxIndex = j;
		}
	    }

	    maxes.push(maxIndex);
	}

	return $V(maxes);
    },

    // return the largest values in each row
    maxColumns: function() {
	var maxes = [];

	for(var i = 1; i <= this.rows(); i++) {
	    var max = null;

	    for(var j = 1; j <= this.cols(); j++) {
		if(max === null || this.e(i, j) > max) {
		    max = this.e(i, j);
		}
	    }

	    maxes.push(max);
	}

	return $V(maxes);
    },

    // return the indexes of the columns with the smallest values
    // for each row
    minColumnIndexes: function() {
	var mins = [];

	for(var i = 1; i <= this.rows(); i++) {
	    var min = null;
	    var minIndex = -1;

	    for(var j = 1; j <= this.cols(); j++) {
		if(min === null || this.e(i, j) < min) {
		    min = this.e(i, j);
		    minIndex = j;
		}
	    }

	    mins.push(minIndex);
	}

	return $V(mins);
    },

    // return the smallest values in each row
    minColumns: function() {
	var mins = [];

	for(var i = 1; i <= this.rows(); i++) {
	    var min = null;

	    for(var j = 1; j <= this.cols(); j++) {
		if(min === null || this.e(i, j) < min) {
		    min = this.e(i, j);
		}
	    }

	    mins.push(min);
	}

	return $V(mins);
    },
    
    // perorm a partial pivot on the matrix. essentially move the largest
    // row below-or-including the pivot and replace the pivot's row with it.
    // a pivot matrix is returned so multiplication can perform the transform.
    partialPivot: function(k, j, P, A, L) {
	var maxIndex = 0;
	var maxValue = 0;

	for(var i = k; i <= A.rows(); i++) {
	    if(Math.abs(A.e(i, j)) > maxValue) {
		maxValue = Math.abs(A.e(k, j));
		maxIndex = i;
	    }
	}

	if(maxIndex != k) {
	    var tmp = A.elements[k - 1];
	    A.elements[k - 1] = A.elements[maxIndex - 1];
	    A.elements[maxIndex - 1] = tmp;
	    
	    P.elements[k - 1][k - 1] = 0;
	    P.elements[k - 1][maxIndex - 1] = 1;
	    P.elements[maxIndex - 1][maxIndex - 1] = 0;
	    P.elements[maxIndex - 1][k - 1] = 1;
	}
	
	return P;
    },

    // solve lower-triangular matrix * x = b via forward substitution
    forwardSubstitute: function(b) {
	var xa = [];

	for(var i = 1; i <= this.rows(); i++) {
	    var w = 0;

	    for(var j = 1; j < i; j++) {
		w += this.e(i, j) * xa[j - 1];
	    }

	    xa.push((b.e(i) - w) / this.e(i, i));
	}

	return $V(xa);
    },

    // solve an upper-triangular matrix * x = b via back substitution
    backSubstitute: function(b) {
	var xa = [];

	for(var i = this.rows(); i > 0; i--) {
	    var w = 0;

	    for(var j = this.cols(); j > i; j--) {
		w += this.e(i, j) * xa[this.rows() - j];
	    }

	    xa.push((b.e(i) - w) / this.e(i, i));
	}

	return $V(xa.reverse());
    },
    
    luPack: luPack,
    luJs: luJs,
    svdJs: svdJs,
    svdPack: svdPack,
    qrJs: qrJs,
    qrPack: qrPack
};

// LU factorization from LAPACK
function luPack() {
    var lu = lapack.lu(this.elements);
    return {
	L: $M(lu.L),
	U: $M(lu.U),
	P: $M(lu.P)
	// don't pass back IPIV
    };
}

var tolerance =  1.4901e-08;

// pure Javascript LU factorization
function luJs() {
    var A = this.dup();
    var L = Matrix.I(A.rows());
    var P = Matrix.I(A.rows());
    var U = Matrix.Zeros(A.rows(), A.cols());
    var p = 1;

    for(var k = 1; k <= Math.min(A.cols(), A.rows()); k++) {
	P = A.partialPivot(k, p, P, A, L);
	
	for(var i = k + 1; i <= A.rows(); i++) {
	    var l = A.e(i, p) / A.e(k, p);
	    L.elements[i - 1][k - 1] = l;
	    
	    for(var j = k + 1 ; j <= A.cols(); j++) {
		A.elements[i - 1][j - 1] -= A.e(k, j) * l;
	    }
	}
	
	for(var j = k; j <= A.cols(); j++) {
	    U.elements[k - 1][j - 1] = A.e(k, j);
	}

	if(p < A.cols())
	    p++;
    }    
    
    return {L: L, U: U, P: P};
}

function getLapack() {
    try {
	return require('lapack');
    } catch(e) {}
}

var lapack;

// if node-lapack is installed use the fast, native fortran routines
if(lapack = getLapack()) {
    Matrix.prototype.svd = svdPack;
    Matrix.prototype.qr = qrPack;
    Matrix.prototype.lu = luPack;
} else {
    // otherwise use the slower pure Javascript versions
    Matrix.prototype.svd = svdJs;
    Matrix.prototype.qr = qrJs;
    Matrix.prototype.lu = luJs;
}

// Constructor function
Matrix.create = function(aElements, ignoreLapack) {
    var M = new Matrix().setElements(aElements);
    return M;
};

// Identity matrix of size n
Matrix.I = function(n) {
    var els = [], i = n, j;
    while (i--) {
	j = n;
	els[i] = [];
	while (j--) {
	    els[i][j] = (i == j) ? 1 : 0;
	}
    }
    return Matrix.create(els);
};

Matrix.loadFile = function(file) {
    var contents = fs.readFileSync(file, 'utf-8');
    var matrix = [];

    var rowArray = contents.split('\n');
    for (var i = 0; i < rowArray.length; i++) {
	var d = rowArray[i].split(',');
	if (d.length > 1) {
	    matrix.push(d);
	}
    }

    var M = new Matrix();
    return M.setElements(matrix);
};

// Diagonal matrix - all off-diagonal elements are zero
Matrix.Diagonal = function(elements) {
    var i = elements.length;
    var M = Matrix.I(i);
    while (i--) {
	M.elements[i][i] = elements[i];
    }
    return M;
};

// Rotation matrix about some axis. If no axis is
// supplied, assume we're after a 2D transform
Matrix.Rotation = function(theta, a) {
    if (!a) {
	return Matrix.create([
	    [Math.cos(theta), -Math.sin(theta)],
	    [Math.sin(theta), Math.cos(theta)]
	]);
    }
    var axis = a.dup();
    if (axis.elements.length != 3) { return null; }
    var mod = axis.modulus();
    var x = axis.elements[0] / mod, y = axis.elements[1] / mod, z = axis.elements[2] / mod;
    var s = Math.sin(theta), c = Math.cos(theta), t = 1 - c;
    // Formula derived here: http://www.gamedev.net/reference/articles/article1199.asp
    // That proof rotates the co-ordinate system so theta
    // becomes -theta and sin becomes -sin here.
    return Matrix.create([
	[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
	[t * x * y + s * z, t * y * y + c, t * y * z - s * x],
	[t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    ]);
};

// Special case rotations
Matrix.RotationX = function(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return Matrix.create([
	[1, 0, 0],
	[0, c, -s],
	[0, s, c]
    ]);
};

Matrix.RotationY = function(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return Matrix.create([
	[c, 0, s],
	[0, 1, 0],
	[-s, 0, c]
    ]);
};

Matrix.RotationZ = function(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return Matrix.create([
	[c, -s, 0],
	[s, c, 0],
	[0, 0, 1]
    ]);
};

// Random matrix of n rows, m columns
Matrix.Random = function(n, m) {
    if (arguments.length === 1) m = n;
    return Matrix.Zero(n, m).map(
	function() { return Math.random(); }
  );
};

Matrix.Fill = function(n, m, v) {
    if (arguments.length === 2) {
	v = m;
	m = n;
    }

    var els = [], i = n, j;

    while (i--) {
	j = m;
	els[i] = [];

	while (j--) {
	    els[i][j] = v;
	}
    }

    return Matrix.create(els);
};

// Matrix filled with zeros
Matrix.Zero = function(n, m) {
    return Matrix.Fill(n, m, 0);
};

// Matrix filled with zeros
Matrix.Zeros = function(n, m) {
    return Matrix.Zero(n, m);
};

// Matrix filled with ones
Matrix.One = function(n, m) {
    return Matrix.Fill(n, m, 1);
};

// Matrix filled with ones
Matrix.Ones = function(n, m) {
    return Matrix.One(n, m);
};

module.exports = Matrix;

},{"./sylvester":83,"./vector":84,"fs":87,"lapack":3}],82:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
// Plane class - depends on Vector. Some methods require Matrix and Line.
var Vector = require('./vector');
var Matrix = require('./matrix');
var Line = require('./line');

var Sylvester = require('./sylvester');

function Plane() {}
Plane.prototype = {

  // Returns true iff the plane occupies the same space as the argument
  eql: function(plane) {
    return (this.contains(plane.anchor) && this.isParallelTo(plane));
  },

  // Returns a copy of the plane
  dup: function() {
    return Plane.create(this.anchor, this.normal);
  },

  // Returns the result of translating the plane by the given vector
  translate: function(vector) {
    var V = vector.elements || vector;
    return Plane.create([
      this.anchor.elements[0] + V[0],
      this.anchor.elements[1] + V[1],
      this.anchor.elements[2] + (V[2] || 0)
    ], this.normal);
  },

  // Returns true iff the plane is parallel to the argument. Will return true
  // if the planes are equal, or if you give a line and it lies in the plane.
  isParallelTo: function(obj) {
    var theta;
    if (obj.normal) {
      // obj is a plane
      theta = this.normal.angleFrom(obj.normal);
      return (Math.abs(theta) <= Sylvester.precision || Math.abs(Math.PI - theta) <= Sylvester.precision);
    } else if (obj.direction) {
      // obj is a line
      return this.normal.isPerpendicularTo(obj.direction);
    }
    return null;
  },

  // Returns true iff the receiver is perpendicular to the argument
  isPerpendicularTo: function(plane) {
    var theta = this.normal.angleFrom(plane.normal);
    return (Math.abs(Math.PI/2 - theta) <= Sylvester.precision);
  },

  // Returns the plane's distance from the given object (point, line or plane)
  distanceFrom: function(obj) {
    if (this.intersects(obj) || this.contains(obj)) { return 0; }
    if (obj.anchor) {
      // obj is a plane or line
      var A = this.anchor.elements, B = obj.anchor.elements, N = this.normal.elements;
      return Math.abs((A[0] - B[0]) * N[0] + (A[1] - B[1]) * N[1] + (A[2] - B[2]) * N[2]);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      var A = this.anchor.elements, N = this.normal.elements;
      return Math.abs((A[0] - P[0]) * N[0] + (A[1] - P[1]) * N[1] + (A[2] - (P[2] || 0)) * N[2]);
    }
  },

  // Returns true iff the plane contains the given point or line
  contains: function(obj) {
    if (obj.normal) { return null; }
    if (obj.direction) {
      return (this.contains(obj.anchor) && this.contains(obj.anchor.add(obj.direction)));
    } else {
      var P = obj.elements || obj;
      var A = this.anchor.elements, N = this.normal.elements;
      var diff = Math.abs(N[0]*(A[0] - P[0]) + N[1]*(A[1] - P[1]) + N[2]*(A[2] - (P[2] || 0)));
      return (diff <= Sylvester.precision);
    }
  },

  // Returns true iff the plane has a unique point/line of intersection with the argument
  intersects: function(obj) {
    if (typeof(obj.direction) == 'undefined' && typeof(obj.normal) == 'undefined') { return null; }
    return !this.isParallelTo(obj);
  },

  // Returns the unique intersection with the argument, if one exists. The result
  // will be a vector if a line is supplied, and a line if a plane is supplied.
  intersectionWith: function(obj) {
    if (!this.intersects(obj)) { return null; }
    if (obj.direction) {
      // obj is a line
      var A = obj.anchor.elements, D = obj.direction.elements,
          P = this.anchor.elements, N = this.normal.elements;
      var multiplier = (N[0]*(P[0]-A[0]) + N[1]*(P[1]-A[1]) + N[2]*(P[2]-A[2])) / (N[0]*D[0] + N[1]*D[1] + N[2]*D[2]);
      return Vector.create([A[0] + D[0]*multiplier, A[1] + D[1]*multiplier, A[2] + D[2]*multiplier]);
    } else if (obj.normal) {
      // obj is a plane
      var direction = this.normal.cross(obj.normal).toUnitVector();
      // To find an anchor point, we find one co-ordinate that has a value
      // of zero somewhere on the intersection, and remember which one we picked
      var N = this.normal.elements, A = this.anchor.elements,
          O = obj.normal.elements, B = obj.anchor.elements;
      var solver = Matrix.Zero(2,2), i = 0;
      while (solver.isSingular()) {
        i++;
        solver = Matrix.create([
          [ N[i%3], N[(i+1)%3] ],
          [ O[i%3], O[(i+1)%3]  ]
        ]);
      }
      // Then we solve the simultaneous equations in the remaining dimensions
      var inverse = solver.inverse().elements;
      var x = N[0]*A[0] + N[1]*A[1] + N[2]*A[2];
      var y = O[0]*B[0] + O[1]*B[1] + O[2]*B[2];
      var intersection = [
        inverse[0][0] * x + inverse[0][1] * y,
        inverse[1][0] * x + inverse[1][1] * y
      ];
      var anchor = [];
      for (var j = 1; j <= 3; j++) {
        // This formula picks the right element from intersection by
        // cycling depending on which element we set to zero above
        anchor.push((i == j) ? 0 : intersection[(j + (5 - i)%3)%3]);
      }
      return Line.create(anchor, direction);
    }
  },

  // Returns the point in the plane closest to the given point
  pointClosestTo: function(point) {
    var P = point.elements || point;
    var A = this.anchor.elements, N = this.normal.elements;
    var dot = (A[0] - P[0]) * N[0] + (A[1] - P[1]) * N[1] + (A[2] - (P[2] || 0)) * N[2];
    return Vector.create([P[0] + N[0] * dot, P[1] + N[1] * dot, (P[2] || 0) + N[2] * dot]);
  },

  // Returns a copy of the plane, rotated by t radians about the given line
  // See notes on Line#rotate.
  rotate: function(t, line) {
    var R = t.determinant ? t.elements : Matrix.Rotation(t, line.direction).elements;
    var C = line.pointClosestTo(this.anchor).elements;
    var A = this.anchor.elements, N = this.normal.elements;
    var C1 = C[0], C2 = C[1], C3 = C[2], A1 = A[0], A2 = A[1], A3 = A[2];
    var x = A1 - C1, y = A2 - C2, z = A3 - C3;
    return Plane.create([
      C1 + R[0][0] * x + R[0][1] * y + R[0][2] * z,
      C2 + R[1][0] * x + R[1][1] * y + R[1][2] * z,
      C3 + R[2][0] * x + R[2][1] * y + R[2][2] * z
    ], [
      R[0][0] * N[0] + R[0][1] * N[1] + R[0][2] * N[2],
      R[1][0] * N[0] + R[1][1] * N[1] + R[1][2] * N[2],
      R[2][0] * N[0] + R[2][1] * N[1] + R[2][2] * N[2]
    ]);
  },

  // Returns the reflection of the plane in the given point, line or plane.
  reflectionIn: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var A = this.anchor.elements, N = this.normal.elements;
      var A1 = A[0], A2 = A[1], A3 = A[2], N1 = N[0], N2 = N[1], N3 = N[2];
      var newA = this.anchor.reflectionIn(obj).elements;
      // Add the plane's normal to its anchor, then mirror that in the other plane
      var AN1 = A1 + N1, AN2 = A2 + N2, AN3 = A3 + N3;
      var Q = obj.pointClosestTo([AN1, AN2, AN3]).elements;
      var newN = [Q[0] + (Q[0] - AN1) - newA[0], Q[1] + (Q[1] - AN2) - newA[1], Q[2] + (Q[2] - AN3) - newA[2]];
      return Plane.create(newA, newN);
    } else if (obj.direction) {
      // obj is a line
      return this.rotate(Math.PI, obj);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      return Plane.create(this.anchor.reflectionIn([P[0], P[1], (P[2] || 0)]), this.normal);
    }
  },

  // Sets the anchor point and normal to the plane. If three arguments are specified,
  // the normal is calculated by assuming the three points should lie in the same plane.
  // If only two are sepcified, the second is taken to be the normal. Normal vector is
  // normalised before storage.
  setVectors: function(anchor, v1, v2) {
    anchor = Vector.create(anchor);
    anchor = anchor.to3D(); if (anchor === null) { return null; }
    v1 = Vector.create(v1);
    v1 = v1.to3D(); if (v1 === null) { return null; }
    if (typeof(v2) == 'undefined') {
      v2 = null;
    } else {
      v2 = Vector.create(v2);
      v2 = v2.to3D(); if (v2 === null) { return null; }
    }
    var A1 = anchor.elements[0], A2 = anchor.elements[1], A3 = anchor.elements[2];
    var v11 = v1.elements[0], v12 = v1.elements[1], v13 = v1.elements[2];
    var normal, mod;
    if (v2 !== null) {
      var v21 = v2.elements[0], v22 = v2.elements[1], v23 = v2.elements[2];
      normal = Vector.create([
        (v12 - A2) * (v23 - A3) - (v13 - A3) * (v22 - A2),
        (v13 - A3) * (v21 - A1) - (v11 - A1) * (v23 - A3),
        (v11 - A1) * (v22 - A2) - (v12 - A2) * (v21 - A1)
      ]);
      mod = normal.modulus();
      if (mod === 0) { return null; }
      normal = Vector.create([normal.elements[0] / mod, normal.elements[1] / mod, normal.elements[2] / mod]);
    } else {
      mod = Math.sqrt(v11*v11 + v12*v12 + v13*v13);
      if (mod === 0) { return null; }
      normal = Vector.create([v1.elements[0] / mod, v1.elements[1] / mod, v1.elements[2] / mod]);
    }
    this.anchor = anchor;
    this.normal = normal;
    return this;
  }
};

// Constructor function
Plane.create = function(anchor, v1, v2) {
  var P = new Plane();
  return P.setVectors(anchor, v1, v2);
};

// X-Y-Z planes
Plane.XY = Plane.create(Vector.Zero(3), Vector.k);
Plane.YZ = Plane.create(Vector.Zero(3), Vector.i);
Plane.ZX = Plane.create(Vector.Zero(3), Vector.j);
Plane.YX = Plane.XY; Plane.ZY = Plane.YZ; Plane.XZ = Plane.ZX;

// Returns the plane containing the given points (can be arrays as
// well as vectors). If the points are not coplanar, returns null.
Plane.fromPoints = function(points) {
  var np = points.length, list = [], i, P, n, N, A, B, C, D, theta, prevN, totalN = Vector.Zero(3);
  for (i = 0; i < np; i++) {
    P = Vector.create(points[i]).to3D();
    if (P === null) { return null; }
    list.push(P);
    n = list.length;
    if (n > 2) {
      // Compute plane normal for the latest three points
      A = list[n-1].elements; B = list[n-2].elements; C = list[n-3].elements;
      N = Vector.create([
        (A[1] - B[1]) * (C[2] - B[2]) - (A[2] - B[2]) * (C[1] - B[1]),
        (A[2] - B[2]) * (C[0] - B[0]) - (A[0] - B[0]) * (C[2] - B[2]),
        (A[0] - B[0]) * (C[1] - B[1]) - (A[1] - B[1]) * (C[0] - B[0])
      ]).toUnitVector();
      if (n > 3) {
        // If the latest normal is not (anti)parallel to the previous one, we've strayed off the plane.
        // This might be a slightly long-winded way of doing things, but we need the sum of all the normals
        // to find which way the plane normal should point so that the points form an anticlockwise list.
        theta = N.angleFrom(prevN);
        if (theta !== null) {
          if (!(Math.abs(theta) <= Sylvester.precision || Math.abs(theta - Math.PI) <= Sylvester.precision)) { return null; }
        }
      }
      totalN = totalN.add(N);
      prevN = N;
    }
  }
  // We need to add in the normals at the start and end points, which the above misses out
  A = list[1].elements; B = list[0].elements; C = list[n-1].elements; D = list[n-2].elements;
  totalN = totalN.add(Vector.create([
    (A[1] - B[1]) * (C[2] - B[2]) - (A[2] - B[2]) * (C[1] - B[1]),
    (A[2] - B[2]) * (C[0] - B[0]) - (A[0] - B[0]) * (C[2] - B[2]),
    (A[0] - B[0]) * (C[1] - B[1]) - (A[1] - B[1]) * (C[0] - B[0])
  ]).toUnitVector()).add(Vector.create([
    (B[1] - C[1]) * (D[2] - C[2]) - (B[2] - C[2]) * (D[1] - C[1]),
    (B[2] - C[2]) * (D[0] - C[0]) - (B[0] - C[0]) * (D[2] - C[2]),
    (B[0] - C[0]) * (D[1] - C[1]) - (B[1] - C[1]) * (D[0] - C[0])
  ]).toUnitVector());
  return Plane.create(list[0], totalN);
};

module.exports = Plane;

},{"./line":79,"./matrix":81,"./sylvester":83,"./vector":84}],83:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
// This file is required in order for any other classes to work. Some Vector methods work with the
// other Sylvester classes and are useless unless they are included. Other classes such as Line and
// Plane will not function at all without Vector being loaded first.           

Math.sign = function(x) {
    return x < 0 ? -1: 1;
}
                                              
var Sylvester = {
    precision: 1e-6,
    approxPrecision: 1e-5
};

module.exports = Sylvester;

},{}],84:[function(require,module,exports){
// Copyright (c) 2011, Chris Umbel, James Coglan
// This file is required in order for any other classes to work. Some Vector methods work with the
// other Sylvester classes and are useless unless they are included. Other classes such as Line and
// Plane will not function at all without Vector being loaded first.

var Sylvester = require('./sylvester'),
Matrix = require('./matrix');

function Vector() {}
Vector.prototype = {

    norm: function() {
	var n = this.elements.length;
	var sum = 0;

	while (n--) {
	    sum += Math.pow(this.elements[n], 2);
	}

	return Math.sqrt(sum);
    },

    // Returns element i of the vector
    e: function(i) {
      return (i < 1 || i > this.elements.length) ? null : this.elements[i - 1];
    },

    // Returns the number of rows/columns the vector has
    dimensions: function() {
      return {rows: 1, cols: this.elements.length};
    },

    // Returns the number of rows in the vector
    rows: function() {
      return 1;
    },

    // Returns the number of columns in the vector
    cols: function() {
      return this.elements.length;
    },

    // Returns the modulus ('length') of the vector
    modulus: function() {
      return Math.sqrt(this.dot(this));
    },

    // Returns true iff the vector is equal to the argument
    eql: function(vector) {
    	var n = this.elements.length;
    	var V = vector.elements || vector;
    	if (n != V.length) { return false; }
    	while (n--) {
    	    if (Math.abs(this.elements[n] - V[n]) > Sylvester.precision) { return false; }
    	}
    	return true;
    },

    // Returns a copy of the vector
    dup: function() {
	    return Vector.create(this.elements);
    },

    // Maps the vector to another vector according to the given function
    map: function(fn) {
	var elements = [];
	this.each(function(x, i) {
	    elements.push(fn(x, i));
	});
	return Vector.create(elements);
    },

    // Calls the iterator for each element of the vector in turn
    each: function(fn) {
	var n = this.elements.length;
	for (var i = 0; i < n; i++) {
	    fn(this.elements[i], i + 1);
	}
    },

    // Returns a new vector created by normalizing the receiver
    toUnitVector: function() {
	var r = this.modulus();
	if (r === 0) { return this.dup(); }
	return this.map(function(x) { return x / r; });
    },

    // Returns the angle between the vector and the argument (also a vector)
    angleFrom: function(vector) {
	var V = vector.elements || vector;
	var n = this.elements.length, k = n, i;
	if (n != V.length) { return null; }
	var dot = 0, mod1 = 0, mod2 = 0;
	// Work things out in parallel to save time
	this.each(function(x, i) {
	    dot += x * V[i - 1];
	    mod1 += x * x;
	    mod2 += V[i - 1] * V[i - 1];
	});
	mod1 = Math.sqrt(mod1); mod2 = Math.sqrt(mod2);
	if (mod1 * mod2 === 0) { return null; }
	var theta = dot / (mod1 * mod2);
	if (theta < -1) { theta = -1; }
	if (theta > 1) { theta = 1; }
	return Math.acos(theta);
    },

    // Returns true iff the vector is parallel to the argument
    isParallelTo: function(vector) {
	var angle = this.angleFrom(vector);
	return (angle === null) ? null : (angle <= Sylvester.precision);
    },

    // Returns true iff the vector is antiparallel to the argument
    isAntiparallelTo: function(vector) {
	var angle = this.angleFrom(vector);
	return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Sylvester.precision);
    },

    // Returns true iff the vector is perpendicular to the argument
    isPerpendicularTo: function(vector) {
	var dot = this.dot(vector);
	return (dot === null) ? null : (Math.abs(dot) <= Sylvester.precision);
    },

    // Returns the result of adding the argument to the vector
    add: function(value) {
	var V = value.elements || value;

	if (this.elements.length != V.length) 
	    return this.map(function(v) { return v + value });
	else
	    return this.map(function(x, i) { return x + V[i - 1]; });
    },

    // Returns the result of subtracting the argument from the vector
    subtract: function(v) {
	if (typeof(v) == 'number')
	    return this.map(function(k) { return k - v; });

	var V = v.elements || v;
	if (this.elements.length != V.length) { return null; }
	return this.map(function(x, i) { return x - V[i - 1]; });
    },

    // Returns the result of multiplying the elements of the vector by the argument
    multiply: function(k) {
	return this.map(function(x) { return x * k; });
    },

    elementMultiply: function(v) {
	return this.map(function(k, i) {
	    return v.e(i) * k;
	});
    },

    sum: function() {
	var sum = 0;
	this.map(function(x) { sum += x;});
	return sum;
    },

    chomp: function(n) {
	var elements = [];

	for (var i = n; i < this.elements.length; i++) {
	    elements.push(this.elements[i]);
	}

	return Vector.create(elements);
    },

    top: function(n) {
	var elements = [];

	for (var i = 0; i < n; i++) {
	    elements.push(this.elements[i]);
	}

	return Vector.create(elements);
    },

    augment: function(elements) {
	var newElements = this.elements;

	for (var i = 0; i < elements.length; i++) {
	    newElements.push(elements[i]);
	}

	return Vector.create(newElements);
    },

    x: function(k) { return this.multiply(k); },

    log: function() {
	return Vector.log(this);
    },

    elementDivide: function(vector) {
	return this.map(function(v, i) {
	    return v / vector.e(i);
	});
    },

    product: function() {
	var p = 1;

	this.map(function(v) {
	    p *= v;
	});

	return p;
    },

    // Returns the scalar product of the vector with the argument
    // Both vectors must have equal dimensionality
    dot: function(vector) {
	var V = vector.elements || vector;
	var i, product = 0, n = this.elements.length;	
	if (n != V.length) { return null; }
	while (n--) { product += this.elements[n] * V[n]; }
	return product;
    },

    // Returns the vector product of the vector with the argument
    // Both vectors must have dimensionality 3
    cross: function(vector) {
	var B = vector.elements || vector;
	if (this.elements.length != 3 || B.length != 3) { return null; }
	var A = this.elements;
	return Vector.create([
	    (A[1] * B[2]) - (A[2] * B[1]),
	    (A[2] * B[0]) - (A[0] * B[2]),
	    (A[0] * B[1]) - (A[1] * B[0])
	]);
    },

    // Returns the (absolute) largest element of the vector
    max: function() {
	var m = 0, i = this.elements.length;
	while (i--) {
	    if (Math.abs(this.elements[i]) > Math.abs(m)) { m = this.elements[i]; }
	}
	return m;
    },


    maxIndex: function() {
	var m = 0, i = this.elements.length;
	var maxIndex = -1;

	while (i--) {
	    if (Math.abs(this.elements[i]) > Math.abs(m)) { 
		m = this.elements[i]; 
		maxIndex = i + 1;
	    }
	}

	return maxIndex;
    },


    // Returns the index of the first match found
    indexOf: function(x) {
	var index = null, n = this.elements.length;
	for (var i = 0; i < n; i++) {
	    if (index === null && this.elements[i] == x) {
		index = i + 1;
	    }
	}
	return index;
    },

    // Returns a diagonal matrix with the vector's elements as its diagonal elements
    toDiagonalMatrix: function() {
	return Matrix.Diagonal(this.elements);
    },

    // Returns the result of rounding the elements of the vector
    round: function() {
	return this.map(function(x) { return Math.round(x); });
    },

    // Transpose a Vector, return a 1xn Matrix
    transpose: function() {
	var rows = this.elements.length;
	var elements = [];

	for (var i = 0; i < rows; i++) {
	    elements.push([this.elements[i]]);
	}
	return Matrix.create(elements);
    },

    // Returns a copy of the vector with elements set to the given value if they
    // differ from it by less than Sylvester.precision
    snapTo: function(x) {
	return this.map(function(y) {
	    return (Math.abs(y - x) <= Sylvester.precision) ? x : y;
	});
    },

    // Returns the vector's distance from the argument, when considered as a point in space
    distanceFrom: function(obj) {
	if (obj.anchor || (obj.start && obj.end)) { return obj.distanceFrom(this); }
	var V = obj.elements || obj;
	if (V.length != this.elements.length) { return null; }
	var sum = 0, part;
	this.each(function(x, i) {
	    part = x - V[i - 1];
	    sum += part * part;
	});
	return Math.sqrt(sum);
    },

    // Returns true if the vector is point on the given line
    liesOn: function(line) {
	return line.contains(this);
    },

    // Return true iff the vector is a point in the given plane
    liesIn: function(plane) {
	return plane.contains(this);
    },

    // Rotates the vector about the given object. The object should be a
    // point if the vector is 2D, and a line if it is 3D. Be careful with line directions!
    rotate: function(t, obj) {
	var V, R = null, x, y, z;
	if (t.determinant) { R = t.elements; }
	switch (this.elements.length) {
	case 2:
            V = obj.elements || obj;
            if (V.length != 2) { return null; }
            if (!R) { R = Matrix.Rotation(t).elements; }
            x = this.elements[0] - V[0];
            y = this.elements[1] - V[1];
            return Vector.create([
		V[0] + R[0][0] * x + R[0][1] * y,
		V[1] + R[1][0] * x + R[1][1] * y
            ]);
            break;
	case 3:
            if (!obj.direction) { return null; }
            var C = obj.pointClosestTo(this).elements;
            if (!R) { R = Matrix.Rotation(t, obj.direction).elements; }
            x = this.elements[0] - C[0];
            y = this.elements[1] - C[1];
            z = this.elements[2] - C[2];
            return Vector.create([
		C[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z,
		C[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z,
		C[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z
            ]);
            break;
	default:
            return null;
	}
    },

    // Returns the result of reflecting the point in the given point, line or plane
    reflectionIn: function(obj) {
	if (obj.anchor) {
	    // obj is a plane or line
	    var P = this.elements.slice();
	    var C = obj.pointClosestTo(P).elements;
	    return Vector.create([C[0] + (C[0] - P[0]), C[1] + (C[1] - P[1]), C[2] + (C[2] - (P[2] || 0))]);
	} else {
	    // obj is a point
	    var Q = obj.elements || obj;
	    if (this.elements.length != Q.length) { return null; }
	    return this.map(function(x, i) { return Q[i - 1] + (Q[i - 1] - x); });
	}
    },

    // Utility to make sure vectors are 3D. If they are 2D, a zero z-component is added
    to3D: function() {
	var V = this.dup();
	switch (V.elements.length) {
	case 3: break;
	case 2: V.elements.push(0); break;
	default: return null;
	}
	return V;
    },

    // Returns a string representation of the vector
    inspect: function() {
	return '[' + this.elements.join(', ') + ']';
    },

    // Set vector's elements from an array
    setElements: function(els) {
	this.elements = (els.elements || els).slice();
	return this;
    }
};

// Constructor function
Vector.create = function(elements) {
    var V = new Vector();
    return V.setElements(elements);
};

// i, j, k unit vectors
Vector.i = Vector.create([1, 0, 0]);
Vector.j = Vector.create([0, 1, 0]);
Vector.k = Vector.create([0, 0, 1]);

// Random vector of size n
Vector.Random = function(n) {
    var elements = [];
    while (n--) { elements.push(Math.random()); }
    return Vector.create(elements);
};

Vector.Fill = function(n, v) {
    var elements = [];
    while (n--) { elements.push(v); }
    return Vector.create(elements);
};

// Vector filled with zeros
Vector.Zero = function(n) {
    return Vector.Fill(n, 0);
};

Vector.One = function(n) {
    return Vector.Fill(n, 1);
};

Vector.log = function(v) {
    return v.map(function(x) {
	return Math.log(x);
    });
};

module.exports = Vector;

},{"./matrix":81,"./sylvester":83}],85:[function(require,module,exports){
//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],86:[function(require,module,exports){
// Use a Node.js core library
var Natural = require('natural');

window.Natural = Natural;

},{"natural":22}],87:[function(require,module,exports){

},{}],88:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],89:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],90:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"PcZj9L":[function(require,module,exports){
var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `browserSupport`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
var browserSupport = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
   if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined' ||
        typeof DataView === 'undefined')
      return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Relevant Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo()
  } catch (e) {
    return false
  }
})()


/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (browserSupport) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return this instance of Buffer
    buf = this
    buf.length = length
  }

  var i
  if (Buffer.isBuffer(subject)) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf.set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !browserSupport && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
      return true

    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return b && b._isBuffer
}

Buffer.byteLength = function (str, encoding) {
  switch (encoding || 'utf8') {
    case 'hex':
      return str.length / 2

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length

    case 'ascii':
    case 'binary':
      return str.length

    case 'base64':
      return base64ToBytes(str).length

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error('Usage: Buffer.concat(list, [totalLength])\n' +
        'list should be an Array.')
  }

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) {
    throw new Error('Invalid hex string')
  }
  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
}

function _asciiWrite (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  switch (encoding) {
    case 'hex':
      return _hexWrite(this, string, offset, length)

    case 'utf8':
    case 'utf-8':
      return _utf8Write(this, string, offset, length)

    case 'ascii':
      return _asciiWrite(this, string, offset, length)

    case 'binary':
      return _binaryWrite(this, string, offset, length)

    case 'base64':
      return _base64Write(this, string, offset, length)

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  switch (encoding) {
    case 'hex':
      return _hexSlice(self, start, end)

    case 'utf8':
    case 'utf-8':
      return _utf8Slice(self, start, end)

    case 'ascii':
      return _asciiSlice(self, start, end)

    case 'binary':
      return _binarySlice(self, start, end)

    case 'base64':
      return _base64Slice(self, start, end)

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start)
    throw new Error('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new Error('targetStart out of bounds')
  if (start < 0 || start >= source.length)
    throw new Error('sourceStart out of bounds')
  if (end < 0 || end > source.length)
    throw new Error('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

// TODO: add test that modifying the new buffer slice will modify memory in the
// original buffer! Use code from:
// http://nodejs.org/api/buffer.html#buffer_buf_slice_start_end
Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (browserSupport) {
    return augment(this.subarray(start, end))
  } else {
    // TODO: slicing works, with limitations (no parent tracking/update)
    // https://github.com/feross/native-buffer-browserify/issues/9
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  return buf[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 < len) {
      return buf._dataview.getUint16(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getUint16(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      val = buf[offset]
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
    } else {
      val = buf[offset] << 8
      if (offset + 1 < len)
        val |= buf[offset + 1]
    }
    return val
  }
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 < len) {
      return buf._dataview.getUint32(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getUint32(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      if (offset + 2 < len)
        val = buf[offset + 2] << 16
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
      val |= buf[offset]
      if (offset + 3 < len)
        val = val + (buf[offset + 3] << 24 >>> 0)
    } else {
      if (offset + 1 < len)
        val = buf[offset + 1] << 16
      if (offset + 2 < len)
        val |= buf[offset + 2] << 8
      if (offset + 3 < len)
        val |= buf[offset + 3]
      val = val + (buf[offset] << 24 >>> 0)
    }
    return val
  }
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    return buf._dataview.getInt8(offset)
  } else {
    var neg = buf[offset] & 0x80
    if (neg)
      return (0xff - buf[offset] + 1) * -1
    else
      return buf[offset]
  }
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getInt16(0, littleEndian)
    } else {
      return buf._dataview.getInt16(offset, littleEndian)
    }
  } else {
    var val = _readUInt16(buf, offset, littleEndian, true)
    var neg = val & 0x8000
    if (neg)
      return (0xffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getInt32(0, littleEndian)
    } else {
      return buf._dataview.getInt32(offset, littleEndian)
    }
  } else {
    var val = _readUInt32(buf, offset, littleEndian, true)
    var neg = val & 0x80000000
    if (neg)
      return (0xffffffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat32(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat64(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= buf.length) return

  buf[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setUint16(offset, value, littleEndian)
    }
  } else {
    for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
      buf[offset + i] =
          (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
              (littleEndian ? i : 1 - i) * 8
    }
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  var i
  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setUint32(0, value, littleEndian)
      for (i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setUint32(offset, value, littleEndian)
    }
  } else {
    for (i = 0, j = Math.min(len - offset, 4); i < j; i++) {
      buf[offset + i] =
          (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
    }
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    buf._dataview.setInt8(offset, value)
  } else {
    if (value >= 0)
      buf.writeUInt8(value, offset, noAssert)
    else
      buf.writeUInt8(0xff + value + 1, offset, noAssert)
  }
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setInt16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setInt16(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt16(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setInt32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setInt32(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt32(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setFloat32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat32(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 7 >= len) {
      var dv = new DataView(new ArrayBuffer(8))
      dv.setFloat64(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat64(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('value is not a number')
  }

  if (end < start) throw new Error('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds')
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds')
  }

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Not added to Buffer.prototype since it should only
 * be available in browsers that support ArrayBuffer.
 */
function BufferToArrayBuffer () {
  return (new Buffer(this)).buffer
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

function augment (arr) {
  arr._isBuffer = true

  // Augment the Uint8Array *instance* (not the class!) with Buffer methods
  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BufferToArrayBuffer

  if (arr.byteLength !== 0)
    arr._dataview = new DataView(arr.buffer, arr.byteOffset, arr.byteLength)

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value >= 0,
      'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":3,"ieee754":4}],"native-buffer-browserify":[function(require,module,exports){
module.exports=require('PcZj9L');
},{}],3:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = indexOf(b64, '=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 18) | (indexOf(lookup, b64.charAt(i + 1)) << 12) | (indexOf(lookup, b64.charAt(i + 2)) << 6) | indexOf(lookup, b64.charAt(i + 3));
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 2) | (indexOf(lookup, b64.charAt(i + 1)) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 10) | (indexOf(lookup, b64.charAt(i + 1)) << 4) | (indexOf(lookup, b64.charAt(i + 2)) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup.charAt(num >> 18 & 0x3F) + lookup.charAt(num >> 12 & 0x3F) + lookup.charAt(num >> 6 & 0x3F) + lookup.charAt(num & 0x3F);
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup.charAt(temp >> 2);
				output += lookup.charAt((temp << 4) & 0x3F);
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup.charAt(temp >> 10);
				output += lookup.charAt((temp >> 4) & 0x3F);
				output += lookup.charAt((temp << 2) & 0x3F);
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

function indexOf (arr, elt /*, from*/) {
	var len = arr.length;

	var from = Number(arguments[1]) || 0;
	from = (from < 0)
		? Math.ceil(from)
		: Math.floor(from);
	if (from < 0)
		from += len;

	for (; from < len; from++) {
		if ((typeof arr === 'string' && arr.charAt(from) === elt) ||
				(typeof arr !== 'string' && arr[from] === elt)) {
			return from;
		}
	}
	return -1;
}

},{}],4:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}]},{},[])
;;module.exports=require("native-buffer-browserify").Buffer

},{}],91:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],92:[function(require,module,exports){
var process=require("__browserify_process");// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

},{"__browserify_process":91}],93:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],94:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":93,"__browserify_process":91,"inherits":89}]},{},[86])