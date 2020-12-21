'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('fs');

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

// export enum RefType {
//   Definition = 'Definition',
//   Ruleset = 'Ruleset',
//   RulesetOut = 'RulesetOut',
//   MixinCall = 'MixinCall',
//   DeclarationOut = 'DeclarationOut',
//   AtRule = 'AtRule',
//   AtRuleOut = 'AtRuleOut',
//   MixinDefinition = 'MixinDefinition',
//   MixinDefinitionOut = 'MixinDefinitionOut',
//   Media = 'Media',
//   MediaOut = 'MediaOut'
// }
var RefType;
(function (RefType) {
    RefType["rule"] = "rule";
    RefType["atrule"] = "atrule";
    RefType["decl"] = "decl";
    RefType["comment"] = "conment";
    RefType["root"] = "root";
})(RefType || (RefType = {}));

var postcss = require('postcss');
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
var cwd = process.cwd() + '/';
var syntax = require('postcss-less');
var exec = require('child_process').exec;
var fileUrl = '/src/demo1.less';
var isMixinCall = /\(.*\)/;
var lessAST = function (filename) {
    return new Promise(function (res) {
        res(syntax.parse(fs.readFileSync(filename).toString()));
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
var createNewLess = function (res) {
    var newCss = '';
    syntax.stringify(res, function (str) {
        newCss += str;
    });
    console.log(newCss);
    fs.writeFile(cwd + 'res.less', newCss, {}, function (err) {
        if (err)
            console.log(err);
        console.log('文件创建成功');
        console.log('!!!注意：默认会在当前目录下生成一个res.less文件');
        exec('open ' + cwd + 'res.less');
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
        if (ruleset.type === RefType.atrule || (ruleset.type === RefType.rule && isMixinCall.test(ruleset.selector))) {
            return true;
        }
        if (ruleset.nodes) {
            return checkFileNotNeedTransform(ruleset.nodes);
        }
        return false;
    });
};
var lessReverse = function () {
    lessAST('./common-variable.less').then(function (res) {
        dealCommonAst(res, commonVariable);
    });
    lessAST(cwd + fileUrl).then(function (res) {
        if (!checkFileNotNeedTransform(res.nodes)) {
            createNewLess(dealLess(res));
        }
        else {
            console.log('not need transform');
        }
    });
};

exports.lessReverse = lessReverse;
