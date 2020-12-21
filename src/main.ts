
import { ICommonVariable, RefType } from "./types"
import { createAtrule, ruleSetSort, traverseFile } from "./utils"

const fs = require('fs')
const path = require('path')
const cwd = process.cwd() + '/'
const syntax = require('postcss-less');
const exec = require('child_process').exec

const isMixinCall = /\(.*\)/
const LESS_DISABLE = 'less-disable'

const lessAST: (filename: string) => Promise<any> = filename => {
    return new Promise(res => {
        res({
           fileData: syntax.parse(fs.readFileSync(filename).toString()),
           filename,
        })
    })
}

function dealCommonAst(res, commonVariable) {
    res.nodes.reduce((pre, item) => {
        if(item.type === RefType.atrule) {
            const name = '@' + item.name.replace(':', '')
            pre.decl[name] = item.params
        } else if(item.type === RefType.rule && isMixinCall.test(item.selector)) {
            const [name, params] = item.selector.split('(').map(i=> i.replace('.', ''))
            pre.rule[name] = {}
            const tempParams = {}
            pre.rule[name].ruleSets = {}
            pre.rule[name].original = '(' + item.selector.split('(')[1].split(')')[0].split(',').map(i=>i.split(':')[0]) + ')'
            pre.rule[name].requireds = []
            params.replace(')', '').split(',').forEach(i=> {
                const [k, v] = i.split(':')
                tempParams[k.trim()] = v?.trim()
            })
            item.nodes.forEach(i => {
                if(i.type === RefType.decl) {
                    pre.rule[name].ruleSets[i.prop] = tempParams[i.value] ? {
                        default: tempParams[i.value],
                        alias: i.value
                    } : {
                        default: i.value,
                    }
                    if(!i.value.includes('@')) {
                        pre.rule[name].requireds.push(i.prop)
                    }
                }
            })
        }
        return pre
    }, commonVariable)
}

const createNewLess = (res, filePath, canExecOpen)=> {
    console.log('filename', filePath)
    const arr = filePath.split('/')
    const [name, ...suffix] = arr[arr.length -1].split('.')
    const newFileName = name + '.less-reverse.' + suffix.join('.')
    let newCss = '';
    syntax.stringify(res, function( str ) {
        newCss += str
    })
    fs.writeFile(path.resolve(filePath, '..', newFileName), newCss, {} ,function(err){
        if(err) console.log(err)
        console.log('File created successfully');
        console.log(`!!!注意：默认会在目标文件同级生成一个${newFileName}文件`)
        canExecOpen && exec( 'open ' + cwd+'res.less')
    })

}

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
const commonVariable: ICommonVariable = {
    decl: {},
    rule: {},
}

const transformDecl = item => {
    Object.entries(commonVariable.decl).forEach(([key, value])=> {
        if(value === item.value) {
            item.value = key
        }
    })
}

const transformRule = lessTree => {
    const isCanTransformRule = Object.entries(commonVariable.rule).sort(ruleSetSort).some(([key, {original, ruleSets, requireds}])=> {
        
        let isCanBeConverted = false

        if (requireds.length){
            isCanBeConverted = !lessTree.nodes.reduce((p, i)=> {
                if(i.type ===  RefType.decl && requireds.includes(i.prop)) {
                    p.splice(p.indexOf(i.prop), 1)
                }
                return p
            }, [...requireds]).length
        } else {
            isCanBeConverted = !lessTree.nodes.reduce((p, i)=> {
                if(Object.keys(ruleSets).includes(i.prop)) p-- 
                return p
            }, Object.keys(ruleSets).length)
        }

        if(isCanBeConverted) {
            const nodes = []
            lessTree.nodes.forEach((item, index) => {
                if(item.type === RefType.decl) {
                    const temp = Object.entries(ruleSets).some(([k, i]) => {
                        if(k === item.prop) {
                            if(i.alias) {
                                original = original.replace(i.alias, item.value)
                            }
                            return true
                        }
                    })
                    if(!temp) {
                        nodes.push(item)
                    }
                } else {
                    nodes.push(item)
                }
            })
            lessTree.nodes = [createAtrule(key,original), ...nodes]
        }

        return isCanBeConverted
    })
    if(isCanTransformRule) {
        transformRule(lessTree)
    }
}

const dealLess = rulesets => {
    rulesets.nodes.forEach(item => {
       
        if(item.type === RefType.rule) {
            transformRule(item)
        }
        if(item.type === RefType.decl) {
            transformDecl(item)
        }
        if(item.nodes) {
            dealLess(item)
        }
    })
    return rulesets
}

const checkFileNotNeedTransform = (rulesets)=> {
    return rulesets.some(ruleset=> {
        if(ruleset.type === RefType.atrule 
            || (ruleset.type === RefType.rule && isMixinCall.test(ruleset.selector)) 
            || ruleset.type === RefType.comment && ruleset.text === LESS_DISABLE
        ) {
            return true
        }
        if(ruleset.nodes) {
            return checkFileNotNeedTransform(ruleset.nodes)
        }
        return false
    })
}

const reseveFile = (file: string, canExecOpen = false) => {
    lessAST(file).then(({
        fileData,
        filename
    })=> {
        if(!checkFileNotNeedTransform(fileData.nodes)) {
            createNewLess(dealLess(fileData), filename, canExecOpen)
        } else {
            console.log(`${filename} file not need reverse`)
        }
    })
}

const lessReverse = () => {

    const argvs = process.argv.splice(3).map(item=> {
        if(item.substr(item.length -1) === '/') {
            return item.substr(0, item.length -1)
        }
        return item
    })

    if(argvs.length !== 2) {
        throw new Error('only supports commands less-reverse start filePath1 filePath2');
    }

    lessAST(argvs[0]).then(({
        fileData,
        filename
    })=> {
        console.log(`🏊🏻 🏊🏻 🏊🏻 Start parsing ${filename} file...`)
        dealCommonAst(fileData, commonVariable)
        console.log(`🎉 🎉 🎉 Parse the file ${filename} successfully...`)
    })

    fs.stat(cwd + argvs[1], (err, data)=> {
        if(data.isFile()) {
            reseveFile(cwd + argvs[1], data.isFile())
        } else {
            traverseFile(cwd + argvs[1], file=> {
                reseveFile(file)
            })
        }
    })

   
}

export { lessReverse }