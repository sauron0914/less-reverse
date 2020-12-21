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
export interface IRuleSets {
  [key: string]: {
    default: string
    alias?: string
  }
}
interface IRule {
  [key: string]: {
    ruleSets: IRuleSets,
    original: string,
    requireds: string[]
  }
}

export interface ICommonVariable {
  decl: Idecl
  rule: IRule
}