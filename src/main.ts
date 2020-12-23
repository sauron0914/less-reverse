
import { ICommonVariable, IRuleSets, RefType } from "./types"
import { createAtrule, ruleSetSort, traverseFile, trim } from "./utils"

const fs = require('fs')
const program = require('commander')
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
                    pre.rule[name].ruleSets[i.prop] = i.value.includes('@') ? {
                        default: tempParams[i.value],
                        alias: i.value
                    } : {
                        default: i.value,
                    }
                    // 不包含 @ 的，和包含 @ 并且没有默认值的，都视为必传项
                    if(!i.value.includes('@') 
                        || ((i.value.includes('@') && i.parent.selector.match(/\(.*\)/)[0].split(',').some(k=> k.includes(i.value) && !k.includes(':'))))) {
                        pre.rule[name].requireds.push(i.prop)
                    }
                }
            })
        }
        return pre
    }, commonVariable)
}

const createNewLess = (res, filePath, canExecOpen)=> {

    const arr = filePath.split('/')
    const [name, ...suffix] = arr[arr.length -1].split('.')
    const newFileName = name + '.less-reverse.' + suffix.join('.')

    const gloablHeaderPath =  program.args[3] ? (program.args[3][program.args[3].length - 1] === ';' ? program.args[3] : (program.args[3]+';')) : ''

    let newCss =  gloablHeaderPath ? (gloablHeaderPath + '\n\n') : ''

    syntax.stringify(res, function( str ) {
        newCss += str
    })

    console.log(newCss)

    // fs.writeFile(path.resolve(filePath, '..', newFileName), newCss, {} ,function(err){
    //     if(err) console.log(err)
    //     console.log('File created successfully');
    //     console.log(`!!!注意：默认会在目标文件同级生成一个${newFileName}文件`)
    //     canExecOpen && exec( 'open ' + path.resolve(filePath, '..', newFileName))
    // })
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

const dealOriginal = (original, ruleSets: IRuleSets) => {
    const tempOriginal = original.replace('(', '').replace(')', '').split(',')
    const res = tempOriginal.reduce((pre, item)=> {
        
        if(item.includes('@'))  item = Object.values(ruleSets).filter(i=>i.alias === trim(item))[0].default

        pre.push(item)

        return pre
    }, []).join(',')
    return `(${res})`
}

const transformRule = lessTree => {
    const isCanTransformRule = Object.entries(commonVariable.rule).sort(ruleSetSort).some(([key, {original, ruleSets, requireds}])=> {

        let isCanBeConverted = false
        if (requireds.length){
            isCanBeConverted = !lessTree.nodes.reduce((p, i)=> {
                if(i.type ===  RefType.decl && requireds.includes(i.prop) && (!ruleSets[i.prop].default || i.value === ruleSets[i.prop].default)) {
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
            lessTree.nodes.forEach(item => {
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
            
            lessTree.nodes = [
                createAtrule(key, dealOriginal(original, ruleSets), { 
                    mixin: true,
                    before: lessTree.nodes[0].raws.before
                }),
                ...nodes
            ]
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
        if(
            ruleset.type === RefType.atrule 
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
    const argvs = [...program.args].splice(1).map(item=> {
        if(item.substr(item.length -1) === '/') {
            return item.substr(0, item.length -1)
        }
        return item
    })
   
    if(argvs.length < 2 || argvs.length > 3) {
        throw new Error('only supports commands less-reverse start filePath1 filePath2 [global header path]');
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