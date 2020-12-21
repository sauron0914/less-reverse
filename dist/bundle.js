'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs$1 = require('fs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs$1);

/*! *****************************************************************************
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

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

var RefType;
(function (RefType) {
    RefType["rule"] = "rule";
    RefType["atrule"] = "atrule";
    RefType["decl"] = "decl";
    RefType["comment"] = "comment";
    RefType["root"] = "root";
})(RefType || (RefType = {}));

var postcss = require('postcss');
var includeFile = ['.less'];
var matchSuffix = function (str) {
    var res = str.match(/\.\w+/g);
    return res ? res[res.length - 1] : '';
};
var traverseFile = function (src, callback) {
    var paths = fs__default['default'].readdirSync(src).filter(function (item) { return item !== 'node_modules'; });
    paths.forEach(function (path) {
        var _src = src + '/' + path;
        var statSyncRes = fs__default['default'].statSync(_src);
        if (statSyncRes.isFile() && includeFile.includes(matchSuffix(path))) {
            callback(_src);
        }
        else if (statSyncRes.isDirectory()) { //是目录则 递归 
            traverseFile(_src, callback);
        }
    });
};
var createAtrule = function (name, params, options) {
    if (options === void 0) { options = {}; }
    return postcss.atRule(__assign({ raws: { before: options.before || '\n  ', between: '', afterName: '', identifier: '.' }, type: 'atrule', name: name,
        params: params }, options));
};
var ruleSetSort = function (a, b) {
    var getLength = function (k) { return Object.keys(k[1].ruleSets).length; };
    return getLength(b) - getLength(a);
};
var trim = function (str) { return str.replace(/\s*/g, ""); };

var fs = require('fs');
var program = require('commander');
var path = require('path');
var cwd = process.cwd() + '/';
var syntax = require('postcss-less');
var exec = require('child_process').exec;
var isMixinCall = /\(.*\)/;
var LESS_DISABLE = 'less-disable';
var lessAST = function (filename) {
    return new Promise(function (res) {
        res({
            fileData: syntax.parse(fs.readFileSync(filename).toString()),
            filename: filename,
        });
    });
};
function dealCommonAst(res, commonVariable) {
    res.nodes.reduce(function (pre, item) {
        if (item.type === RefType.atrule) {
            var name = '@' + item.name.replace(':', '');
            pre.decl[name] = item.params;
        }
        else if (item.type === RefType.rule && isMixinCall.test(item.selector)) {
            var _a = item.selector.split('(').map(function (i) { return i.replace('.', ''); }), name_1 = _a[0], params = _a[1];
            pre.rule[name_1] = {};
            var tempParams_1 = {};
            pre.rule[name_1].ruleSets = {};
            pre.rule[name_1].original = '(' + item.selector.split('(')[1].split(')')[0].split(',').map(function (i) { return i.split(':')[0]; }) + ')';
            pre.rule[name_1].requireds = [];
            params.replace(')', '').split(',').forEach(function (i) {
                var _a = i.split(':'), k = _a[0], v = _a[1];
                tempParams_1[k.trim()] = v === null || v === void 0 ? void 0 : v.trim();
            });
            item.nodes.forEach(function (i) {
                if (i.type === RefType.decl) {
                    pre.rule[name_1].ruleSets[i.prop] = i.value.includes('@') ? {
                        default: tempParams_1[i.value],
                        alias: i.value
                    } : {
                        default: i.value,
                    };
                    if (!i.value.includes('@')) {
                        pre.rule[name_1].requireds.push(i.prop);
                    }
                }
            });
        }
        return pre;
    }, commonVariable);
}
var createNewLess = function (res, filePath, canExecOpen) {
    var arr = filePath.split('/');
    var _a = arr[arr.length - 1].split('.'), name = _a[0], suffix = _a.slice(1);
    var newFileName = name + '.less-reverse.' + suffix.join('.');
    var gloablHeaderPath = program.args[3] ? (program.args[3][program.args[3].length - 1] === ';' ? program.args[3] : (program.args[3] + ';')) : '';
    var newCss = gloablHeaderPath ? (gloablHeaderPath + '\n\n') : '';
    syntax.stringify(res, function (str) {
        newCss += str;
    });
    console.log(newCss);
    // fs.writeFile(path.resolve(filePath, '..', newFileName), newCss, {} ,function(err){
    //     if(err) console.log(err)
    //     console.log('File created successfully');
    //     console.log(`!!!注意：默认会在目标文件同级生成一个${newFileName}文件`)
    //     canExecOpen && exec( 'open ' + path.resolve(filePath, '..', newFileName))
    // })
};
/**
 * commonVariable
 * 格式如下：
 * {
 *  '.flex': {
 *      ruleSets: {
 *          display: {
 *              default: 'flex',
 *          },
 *          'justify-content': {
 *              default: 'flex-start',
 *              alias: '@h'
 *          },
 *          'align-items': {
 *              default: 'center',
 *              alias: '@v',
 *          },
 *          'flex-wrap': {
 *              default: 'nowrap',
 *              alias: '@wrap'
 *          }
 *      },
 *      requireds: [ 'display' ]
 *  }
 * }
*/
var commonVariable = {
    decl: {},
    rule: {},
};
var transformDecl = function (item) {
    Object.entries(commonVariable.decl).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        if (value === item.value) {
            item.value = key;
        }
    });
};
var dealOriginal = function (original, ruleSets) {
    var tempOriginal = original.replace('(', '').replace(')', '').split(',');
    var res = tempOriginal.reduce(function (pre, item) {
        if (item.includes('@'))
            item = Object.values(ruleSets).filter(function (i) { return i.alias === trim(item); })[0].default;
        pre.push(item);
        return pre;
    }, []).join(',');
    return "(" + res + ")";
};
var transformRule = function (lessTree) {
    var isCanTransformRule = Object.entries(commonVariable.rule).sort(ruleSetSort).some(function (_a) {
        var key = _a[0], _b = _a[1], original = _b.original, ruleSets = _b.ruleSets, requireds = _b.requireds;
        var isCanBeConverted = false;
        if (requireds.length) {
            isCanBeConverted = !lessTree.nodes.reduce(function (p, i) {
                if (i.type === RefType.decl && requireds.includes(i.prop)) {
                    p.splice(p.indexOf(i.prop), 1);
                }
                return p;
            }, __spreadArrays(requireds)).length;
        }
        else {
            isCanBeConverted = !lessTree.nodes.reduce(function (p, i) {
                if (Object.keys(ruleSets).includes(i.prop))
                    p--;
                return p;
            }, Object.keys(ruleSets).length);
        }
        if (isCanBeConverted) {
            var nodes_1 = [];
            lessTree.nodes.forEach(function (item) {
                if (item.type === RefType.decl) {
                    var temp = Object.entries(ruleSets).some(function (_a) {
                        var k = _a[0], i = _a[1];
                        if (k === item.prop) {
                            if (i.alias) {
                                original = original.replace(i.alias, item.value);
                            }
                            return true;
                        }
                    });
                    if (!temp) {
                        nodes_1.push(item);
                    }
                }
                else {
                    nodes_1.push(item);
                }
            });
            lessTree.nodes = __spreadArrays([
                createAtrule(key, dealOriginal(original, ruleSets), {
                    mixin: true,
                    before: lessTree.nodes[0].raws.before
                })
            ], nodes_1);
        }
        return isCanBeConverted;
    });
    if (isCanTransformRule) {
        transformRule(lessTree);
    }
};
var dealLess = function (rulesets) {
    rulesets.nodes.forEach(function (item) {
        if (item.type === RefType.rule) {
            transformRule(item);
        }
        if (item.type === RefType.decl) {
            transformDecl(item);
        }
        if (item.nodes) {
            dealLess(item);
        }
    });
    return rulesets;
};
var checkFileNotNeedTransform = function (rulesets) {
    return rulesets.some(function (ruleset) {
        if (ruleset.type === RefType.atrule
            || (ruleset.type === RefType.rule && isMixinCall.test(ruleset.selector))
            || ruleset.type === RefType.comment && ruleset.text === LESS_DISABLE) {
            return true;
        }
        if (ruleset.nodes) {
            return checkFileNotNeedTransform(ruleset.nodes);
        }
        return false;
    });
};
var reseveFile = function (file, canExecOpen) {
    lessAST(file).then(function (_a) {
        var fileData = _a.fileData, filename = _a.filename;
        if (!checkFileNotNeedTransform(fileData.nodes)) {
            createNewLess(dealLess(fileData), filename);
        }
        else {
            console.log(filename + " file not need reverse");
        }
    });
};
var lessReverse = function () {
    var argvs = __spreadArrays(program.args).splice(1).map(function (item) {
        if (item.substr(item.length - 1) === '/') {
            return item.substr(0, item.length - 1);
        }
        return item;
    });
    if (argvs.length < 2 || argvs.length > 3) {
        throw new Error('only supports commands less-reverse start filePath1 filePath2 [global header path]');
    }
    lessAST(argvs[0]).then(function (_a) {
        var fileData = _a.fileData, filename = _a.filename;
        console.log("\uD83C\uDFCA\uD83C\uDFFB \uD83C\uDFCA\uD83C\uDFFB \uD83C\uDFCA\uD83C\uDFFB Start parsing " + filename + " file...");
        dealCommonAst(fileData, commonVariable);
        console.log("\uD83C\uDF89 \uD83C\uDF89 \uD83C\uDF89 Parse the file " + filename + " successfully...");
    });
    fs.stat(cwd + argvs[1], function (err, data) {
        if (data.isFile()) {
            reseveFile(cwd + argvs[1], data.isFile());
        }
        else {
            traverseFile(cwd + argvs[1], function (file) {
                reseveFile(file);
            });
        }
    });
};

exports.lessReverse = lessReverse;
