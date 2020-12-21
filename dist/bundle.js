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
var createAtrule = function (name, params) { return postcss.atRule({
    raws: { before: '\n  ', between: '', afterName: '', identifier: '.' },
    type: 'atrule',
    name: name,
    params: params,
    mixin: true,
}); };
var ruleSetSort = function (a, b) {
    var getLength = function (k) { return Object.keys(k[1].ruleSets).length; };
    return getLength(b) - getLength(a);
};

var fs = require('fs');
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
                    pre.rule[name_1].ruleSets[i.prop] = tempParams_1[i.value] ? {
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
    console.log('filename', filePath);
    var arr = filePath.split('/');
    var _a = arr[arr.length - 1].split('.'), name = _a[0], suffix = _a.slice(1);
    var newFileName = name + '.less-reverse.' + suffix.join('.');
    var newCss = '';
    syntax.stringify(res, function (str) {
        newCss += str;
    });
    fs.writeFile(path.resolve(filePath, '..', newFileName), newCss, {}, function (err) {
        if (err)
            console.log(err);
        console.log('File created successfully');
        console.log("!!!\u6CE8\u610F\uFF1A\u9ED8\u8BA4\u4F1A\u5728\u76EE\u6807\u6587\u4EF6\u540C\u7EA7\u751F\u6210\u4E00\u4E2A" + newFileName + "\u6587\u4EF6");
        canExecOpen && exec('open ' + cwd + 'res.less');
    });
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
            lessTree.nodes.forEach(function (item, index) {
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
            lessTree.nodes = __spreadArrays([createAtrule(key, original)], nodes_1);
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
    if (canExecOpen === void 0) { canExecOpen = false; }
    lessAST(file).then(function (_a) {
        var fileData = _a.fileData, filename = _a.filename;
        if (!checkFileNotNeedTransform(fileData.nodes)) {
            createNewLess(dealLess(fileData), filename, canExecOpen);
        }
        else {
            console.log(filename + " file not need reverse");
        }
    });
};
var lessReverse = function () {
    var argvs = process.argv.splice(3).map(function (item) {
        if (item.substr(item.length - 1) === '/') {
            return item.substr(0, item.length - 1);
        }
        return item;
    });
    if (argvs.length !== 2) {
        throw new Error('only supports commands less-reverse start filePath1 filePath2');
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
