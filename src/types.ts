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

export enum RefType {
  rule = 'rule',
  atrule = 'atrule',
  decl = 'decl',
  comment = 'conment',
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