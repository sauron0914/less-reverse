import fs from 'fs'
const postcss = require('postcss')

const includeFile = ['.less']

const matchSuffix = (str: string)=> {
    const res = str.match(/\.\w+/g)
    return res ? res[res.length-1] : ''
}

export const traverseFile= (src ,callback) => {
    let paths = fs.readdirSync(src).filter(item=> item !== 'node_modules')
    paths.forEach(path => {
        const _src = src + '/' + path
        const statSyncRes = fs.statSync(_src)
        if(statSyncRes.isFile() && includeFile.includes(matchSuffix(path))) {
            callback(_src)
        } else if(statSyncRes.isDirectory()){ //是目录则 递归 
            traverseFile(_src, callback)
        }
    })
}

export const createDecl = (prop, value) => postcss.decl({
    raws: { before: '\n  ', between: ': ' },
    prop,
    value,
})

export const createAtrule = (name, params) => postcss.atRule({
    raws: { before: '\n  ', between: '', afterName: '', identifier: '.' },
    type: 'atrule',
    name,
    params,
    mixin: true,
})

export const ruleSetSort = (a: any, b: any) => {
    const getLength = k => Object.keys(k[1].ruleSets).length
    return getLength(b) - getLength(a)
}

export const trim = str => str.replace(/\s*/g,"")