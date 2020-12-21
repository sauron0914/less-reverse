export enum RefType {
  rule = 'rule',
  atrule = 'atrule',
  decl = 'decl',
  comment = 'comment',
  root = 'root'
}

interface Idecl {
    [key: string]: string
}

interface IRule {
  [key: string]: {
    ruleSets: {
      [key: string]: {
        default: string
        alias?: string
      }
    },
    original: string,
    requireds: string[]
  }
}

export interface ICommonVariable {
  decl: Idecl
  rule: IRule
}