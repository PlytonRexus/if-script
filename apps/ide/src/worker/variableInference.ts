import { visitSectionNodes } from './variableUsage'
import type { InferredVariableType, VariableCatalogEntry } from '../types/interfaces'

type ConcreteType = Exclude<InferredVariableType, 'unknown'>

interface TypeCounts {
  counts: Partial<Record<ConcreteType, number>>
  firstSeen: Partial<Record<ConcreteType, number>>
}

interface InferenceState {
  variableTypes: Map<string, Set<InferredVariableType>>
  arrayElementTypes: Map<string, Set<InferredVariableType>>
  functionDefs: Map<string, any>
  functionReturnTypes: Map<string, Set<InferredVariableType>>
  functionParamTypes: Map<string, Map<string, Set<InferredVariableType>>>
}

interface AggregateState {
  variableCounts: Map<string, TypeCounts>
  unknownOnlyNames: Set<string>
  allNames: Set<string>
  order: number
}

interface InferContext {
  state: InferenceState
  localTypes: Map<string, Set<InferredVariableType>> | null
  functionName: string | null
  mode: 'propagate' | 'aggregate'
  aggregate?: AggregateState
}

export interface VariableInferenceWarning {
  name: string
  inferredTypes: InferredVariableType[]
}

export interface VariableInferenceResult {
  variableCatalog: VariableCatalogEntry[]
  warnings: VariableInferenceWarning[]
}

const RESERVED_VARIABLE_NAMES = new Set(['turn', 'functions'])
const MAX_FIXPOINT_PASSES = 8
const CONCRETE_TYPES: ConcreteType[] = ['number', 'string', 'boolean', 'array', 'object']
const UNKNOWN_ONLY: Set<InferredVariableType> = new Set(['unknown'])

function inferTypeFromValue(value: unknown): InferredVariableType {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (value && typeof value === 'object') return 'object'
  return 'unknown'
}

function ensureTypeSet(map: Map<string, Set<InferredVariableType>>, name: string): Set<InferredVariableType> {
  const existing = map.get(name)
  if (existing) return existing
  const created = new Set<InferredVariableType>()
  map.set(name, created)
  return created
}

function addTypesToSet(target: Set<InferredVariableType>, types: Set<InferredVariableType>): boolean {
  let changed = false
  types.forEach(type => {
    if (!target.has(type)) {
      target.add(type)
      changed = true
    }
  })
  return changed
}

function addTypesToMap(map: Map<string, Set<InferredVariableType>>, name: string, types: Set<InferredVariableType>): boolean {
  if (!name.trim()) return false
  const target = ensureTypeSet(map, name)
  return addTypesToSet(target, types)
}

function cloneTypeSet(types: Set<InferredVariableType>): Set<InferredVariableType> {
  return new Set(types)
}

function typeSetFrom(type: InferredVariableType): Set<InferredVariableType> {
  return new Set<InferredVariableType>([type])
}

function typeSetFromValues(values: Array<InferredVariableType | null | undefined>): Set<InferredVariableType> {
  const out = new Set<InferredVariableType>()
  values.forEach(type => {
    if (type) out.add(type)
  })
  return out.size > 0 ? out : cloneTypeSet(UNKNOWN_ONLY)
}

function normalizeTypes(types: Set<InferredVariableType>): Set<InferredVariableType> {
  if (types.size === 0) return cloneTypeSet(UNKNOWN_ONLY)
  return types
}

function firstVariableName(input: any): string | null {
  if (!input || typeof input !== 'object') return null
  if (input._class === 'Token' && input.type === 'VARIABLE' && typeof input.symbol === 'string') {
    return input.symbol.trim() || null
  }
  if (typeof input.symbol === 'string' && (!input.type || input.type === 'VARIABLE')) {
    return input.symbol.trim() || null
  }
  return null
}

function extractChoiceBindingNames(input: unknown): string[] {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed ? [trimmed] : []
  }
  if (Array.isArray(input)) return input.flatMap(entry => extractChoiceBindingNames(entry))
  if (!input || typeof input !== 'object') return []
  const node = input as any
  if (node._class === 'Token' && node.type === 'VARIABLE' && typeof node.symbol === 'string') {
    const trimmed = node.symbol.trim()
    return trimmed ? [trimmed] : []
  }
  if (typeof node.symbol === 'string' && !node.type) {
    const trimmed = node.symbol.trim()
    return trimmed ? [trimmed] : []
  }
  return []
}

function gatherFunctionDefs(story: any): Map<string, any> {
  const out = new Map<string, any>()
  ;(story?.functions ?? []).forEach((func: any) => {
    if (func?._class !== 'FunctionDef') return
    const name = typeof func.name === 'string' ? func.name.trim() : ''
    if (!name) return
    out.set(name, func)
  })

  const persistentFunctions = story?.persistent?.functions
  if (persistentFunctions && typeof persistentFunctions === 'object') {
    Object.entries(persistentFunctions).forEach(([name, func]) => {
      if ((func as any)?._class !== 'FunctionDef') return
      const key = name.trim()
      if (!key) return
      out.set(key, func)
    })
  }

  ;(story?.sections ?? []).forEach((section: any) => {
    visitSectionNodes(section, (node) => {
      if (node?._class !== 'FunctionDef') return
      const name = typeof node.name === 'string' ? node.name.trim() : ''
      if (!name) return
      out.set(name, node)
    })
  })

  return out
}

function inferArrayElementTypes(node: any, context: InferContext): Set<InferredVariableType> {
  if (!node || node._class !== 'ArrayLiteral' || !Array.isArray(node.elements)) return cloneTypeSet(UNKNOWN_ONLY)
  const out = new Set<InferredVariableType>()
  node.elements.forEach((entry: any) => {
    const elementTypes = inferExpression(entry, context)
    elementTypes.forEach(type => {
      if (type !== 'array' && type !== 'object' && type !== 'unknown') out.add(type)
      if (type === 'array' || type === 'object' || type === 'unknown') out.add(type)
    })
  })
  return out.size > 0 ? out : cloneTypeSet(UNKNOWN_ONLY)
}

function mergeIntoLocal(local: Map<string, Set<InferredVariableType>> | null, name: string, types: Set<InferredVariableType>): void {
  if (!local) return
  const existing = local.get(name)
  if (existing) {
    addTypesToSet(existing, types)
    return
  }
  local.set(name, cloneTypeSet(types))
}

function inferBuiltinCall(name: string, call: any, context: InferContext): Set<InferredVariableType> {
  const args = Array.isArray(call?.args) ? call.args : []
  const argTypes: Array<Set<InferredVariableType>> = args.map((arg: any) => inferExpression(arg, context))

  if (name === 'randomChoice' || name === 'pick') {
    const firstArg = args[0]
    const arrayName = firstVariableName(firstArg)
    if (arrayName) {
      const known = context.state.arrayElementTypes.get(arrayName)
      if (known && known.size > 0) return cloneTypeSet(known)
    }
    if (firstArg?._class === 'ArrayLiteral') {
      return inferArrayElementTypes(firstArg, context)
    }
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (name === 'type') return typeSetFrom('string')
  if (name === 'len') return typeSetFrom('number')
  if (name === 'contains') return typeSetFrom('boolean')
  if (name === 'startsWith') return typeSetFrom('boolean')
  if (name === 'endsWith') return typeSetFrom('boolean')
  if (name === 'findIndex') return typeSetFrom('number')
  if (name === 'range') return typeSetFrom('array')
  if (name === 'split') return typeSetFrom('array')
  if (name === 'join') return typeSetFrom('string')
  if (name === 'replace') return typeSetFrom('string')
  if (name === 'slice') return typeSetFrom('string')
  if (name === 'upper') return typeSetFrom('string')
  if (name === 'lower') return typeSetFrom('string')
  if (name === 'trim') return typeSetFrom('string')
  if (name === 'capitalize') return typeSetFrom('string')
  if (name === 'slugify') return typeSetFrom('string')
  if (name === 'stripTags') return typeSetFrom('string')
  if (name === 'sanitize') return typeSetFrom('string')
  if (name === 'toString') return typeSetFrom('string')
  if (name === 'toNumber') return typeSetFrom('number')
  if (name === 'setSeed') return typeSetFrom('number')
  if (name === 'seededRandom') return typeSetFrom('number')
  if (name === 'seededRandomInt') return typeSetFrom('number')
  if (name === 'random') return typeSetFrom('number')
  if (name === 'randomInt') return typeSetFrom('number')
  if (name === 'abs') return typeSetFrom('number')
  if (name === 'floor') return typeSetFrom('number')
  if (name === 'ceil') return typeSetFrom('number')
  if (name === 'round') return typeSetFrom('number')
  if (name === 'sqrt') return typeSetFrom('number')
  if (name === 'pow') return typeSetFrom('number')
  if (name === 'min') return typeSetFrom('number')
  if (name === 'max') return typeSetFrom('number')
  if (name === 'sum') return typeSetFrom('number')
  if (name === 'avg') return typeSetFrom('number')
  if (name === 'clamp') return typeSetFrom('number')
  if (name === 'chance') return typeSetFrom('boolean')
  if (name === 'unique') return typeSetFrom('array')
  if (name === 'shuffle') return typeSetFrom('array')
  if (name === 'now') return typeSetFrom('number')
  if (name === 'year') return typeSetFrom('number')
  if (name === 'month') return typeSetFrom('number')
  if (name === 'day') return typeSetFrom('number')
  if (name === 'hour') return typeSetFrom('number')
  if (name === 'minute') return typeSetFrom('number')
  if (name === 'second') return typeSetFrom('number')
  if (name === 'dayOfWeek') return typeSetFrom('number')
  if (name === 'formatDate') return typeSetFrom('string')
  if (name === 'formatTime') return typeSetFrom('string')

  return cloneTypeSet(UNKNOWN_ONLY)
}

function inferMemberAccess(node: any, context: InferContext): Set<InferredVariableType> {
  const objectTypes = inferExpression(node?.object, context)
  const member = typeof node?.member === 'string' ? node.member : ''
  const objectName = firstVariableName(node?.object)
  const args = Array.isArray(node?.args) ? node.args : null

  if (args === null) {
    if (member === 'length') return typeSetFrom('number')
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  const argTypes: Array<Set<InferredVariableType>> = args.map((arg: any) => inferExpression(arg, context))
  if (member === 'push' || member === 'unshift') {
    if (objectName) {
      addTypesToMap(context.state.variableTypes, objectName, typeSetFrom('array'))
      argTypes.forEach(types => {
        addTypesToMap(context.state.arrayElementTypes, objectName, types)
      })
      mergeIntoLocal(context.localTypes, objectName, typeSetFrom('array'))
    }
    return typeSetFrom('number')
  }

  if (member === 'pop' || member === 'shift') {
    if (objectName) {
      const known = context.state.arrayElementTypes.get(objectName)
      if (known && known.size > 0) return cloneTypeSet(known)
    }
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (member === 'join' || member === 'toString') return typeSetFrom('string')
  if (member === 'includes') return typeSetFrom('boolean')
  if (member === 'indexOf' || member === 'findIndex') return typeSetFrom('number')
  if (member === 'startsWith' || member === 'endsWith') return typeSetFrom('boolean')
  if (member === 'trim' || member === 'toUpperCase' || member === 'toLowerCase' || member === 'replace' || member === 'slice') return typeSetFrom('string')

  if (objectTypes.has('array')) return cloneTypeSet(UNKNOWN_ONLY)
  if (objectTypes.has('object')) return cloneTypeSet(UNKNOWN_ONLY)
  return cloneTypeSet(UNKNOWN_ONLY)
}

function inferBinaryAction(node: any, context: InferContext): Set<InferredVariableType> {
  const operator = typeof node?.operator === 'string' ? node.operator : ''
  const left = inferExpression(node?.left, context)
  const right = inferExpression(node?.right, context)

  if (operator === '+' ) {
    const out = new Set<InferredVariableType>()
    const hasString = left.has('string') || right.has('string')
    const hasNumber = left.has('number') && right.has('number')
    if (hasString) out.add('string')
    if (hasNumber) out.add('number')
    return out.size > 0 ? out : cloneTypeSet(UNKNOWN_ONLY)
  }

  if (operator === '-' || operator === '*' || operator === '/' || operator === '%') {
    return typeSetFrom('number')
  }

  if (operator === '==' || operator === '!=' || operator === '>' || operator === '<' || operator === '>=' || operator === '<=' || operator === '&&' || operator === '||') {
    return typeSetFrom('boolean')
  }

  return cloneTypeSet(UNKNOWN_ONLY)
}

function inferVariableReference(name: string, context: InferContext): Set<InferredVariableType> {
  const trimmed = name.trim()
  if (!trimmed) return cloneTypeSet(UNKNOWN_ONLY)
  const local = context.localTypes?.get(trimmed)
  if (local && local.size > 0) return cloneTypeSet(local)
  const global = context.state.variableTypes.get(trimmed)
  if (global && global.size > 0) return cloneTypeSet(global)
  return cloneTypeSet(UNKNOWN_ONLY)
}

function inferExpression(node: any, context: InferContext): Set<InferredVariableType> {
  if (!node || typeof node !== 'object') {
    return inferTypeFromValue(node) === 'unknown' ? cloneTypeSet(UNKNOWN_ONLY) : typeSetFrom(inferTypeFromValue(node))
  }

  if (node._class === 'Token') {
    if (node.type === 'NUMBER') return typeSetFrom('number')
    if (node.type === 'STRING') return typeSetFrom('string')
    if (node.type === 'BOOLEAN') return typeSetFrom('boolean')
    if (node.type === 'VARIABLE' && typeof node.symbol === 'string') {
      return inferVariableReference(node.symbol, context)
    }
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (node._class === 'ArrayLiteral') {
    node.elements?.forEach((element: any) => {
      inferExpression(element, context)
    })
    return typeSetFrom('array')
  }

  if (node._class === 'ArrayAccess') {
    inferExpression(node.array, context)
    inferExpression(node.index, context)
    const arrayName = firstVariableName(node.array)
    if (arrayName) {
      const known = context.state.arrayElementTypes.get(arrayName)
      if (known && known.size > 0) return cloneTypeSet(known)
    }
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (node._class === 'MemberAccess') {
    return inferMemberAccess(node, context)
  }

  if (node._class === 'FunctionCall') {
    const functionName = typeof node?.name === 'string'
      ? node.name
      : (typeof node?.name?.symbol === 'string' ? node.name.symbol : '')
    const trimmedName = functionName.trim()
    if (!trimmedName) return cloneTypeSet(UNKNOWN_ONLY)

    const args = Array.isArray(node.args) ? node.args : []
    const argTypes = args.map((arg: any) => inferExpression(arg, context))
    const userFunction = context.state.functionDefs.get(trimmedName)
    if (userFunction) {
      const params = Array.isArray(userFunction.params) ? userFunction.params : []
      const paramMap = context.state.functionParamTypes.get(trimmedName) ?? new Map<string, Set<InferredVariableType>>()
      params.forEach((param: string, index: number) => {
        if (typeof param !== 'string' || !param.trim()) return
        const incoming = argTypes[index] ?? cloneTypeSet(UNKNOWN_ONLY)
        const existing = paramMap.get(param) ?? new Set<InferredVariableType>()
        addTypesToSet(existing, incoming)
        paramMap.set(param, existing)
      })
      context.state.functionParamTypes.set(trimmedName, paramMap)
      const returnTypes = context.state.functionReturnTypes.get(trimmedName)
      if (returnTypes && returnTypes.size > 0) return cloneTypeSet(returnTypes)
      return cloneTypeSet(UNKNOWN_ONLY)
    }

    return inferBuiltinCall(trimmedName, node, context)
  }

  if (node._class === 'Action') {
    if (node.type === 'binary') return inferBinaryAction(node, context)
    if (node.type === 'unary') {
      inferExpression(node.left, context)
      if (node.operator === '-') return typeSetFrom('number')
      if (node.operator === '!') return typeSetFrom('boolean')
      return cloneTypeSet(UNKNOWN_ONLY)
    }
    if (node.type === 'assign') {
      inferStatement(node, context)
      return cloneTypeSet(UNKNOWN_ONLY)
    }
    if (node.type === 'return') {
      const retTypes = inferExpression(node.left, context)
      if (context.functionName) {
        addTypesToMap(context.state.functionReturnTypes, context.functionName, retTypes)
      }
      return retTypes
    }
  }

  if (node._class === 'ConditionalBlock') {
    inferExpression(node.cond, context)
    const branchTypes = new Set<InferredVariableType>()
    const ifBlock = Array.isArray(node.ifBlock) ? node.ifBlock : (node.then ? [node.then] : [])
    ifBlock.forEach((entry: any) => {
      const types = inferExpression(entry, context)
      addTypesToSet(branchTypes, types)
    })
    const elseBlock = Array.isArray(node.elseBlock) ? node.elseBlock : (node.else ? [node.else] : [])
    elseBlock.forEach((entry: any) => {
      const types = inferExpression(entry, context)
      addTypesToSet(branchTypes, types)
    })
    return normalizeTypes(branchTypes)
  }

  if (node._class === 'Loop') {
    inferExpression(node.condition, context)
    const body = Array.isArray(node.body) ? node.body : []
    body.forEach((entry: any) => inferStatement(entry, context))
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (node._class === 'Choice') {
    inferStatement(node, context)
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  if (node._class === 'FunctionDef') {
    if (typeof node.name === 'string' && node.name.trim()) {
      context.state.functionDefs.set(node.name.trim(), node)
    }
    return cloneTypeSet(UNKNOWN_ONLY)
  }

  return typeSetFrom(inferTypeFromValue(node))
}

function markAssignmentType(name: string, types: Set<InferredVariableType>, context: InferContext): void {
  if (!name || !name.trim()) return
  const trimmed = name.trim()
  addTypesToMap(context.state.variableTypes, trimmed, types)
  mergeIntoLocal(context.localTypes, trimmed, types)

  if (context.mode === 'aggregate' && context.aggregate) {
    context.aggregate.allNames.add(trimmed)
    const concrete = Array.from(types).filter((type): type is ConcreteType => CONCRETE_TYPES.includes(type as ConcreteType))
    if (concrete.length === 0) {
      context.aggregate.unknownOnlyNames.add(trimmed)
      return
    }
    const counts = context.aggregate.variableCounts.get(trimmed) ?? { counts: {}, firstSeen: {} }
    concrete.forEach(type => {
      counts.counts[type] = (counts.counts[type] ?? 0) + 1
      if (counts.firstSeen[type] === undefined) {
        counts.firstSeen[type] = context.aggregate ? context.aggregate.order++ : 0
      }
    })
    context.aggregate.variableCounts.set(trimmed, counts)
  }
}

function inferStatement(node: any, context: InferContext): void {
  if (!node || typeof node !== 'object') return

  if (node._class === 'Action' && node.type === 'assign') {
    const rightTypes = inferExpression(node.right, context)
    const leftName = firstVariableName(node.left)
    if (leftName) {
      markAssignmentType(leftName, rightTypes, context)
      if (node.right?._class === 'ArrayLiteral') {
        const elementTypes = inferArrayElementTypes(node.right, context)
        addTypesToMap(context.state.arrayElementTypes, leftName, elementTypes)
        addTypesToMap(context.state.variableTypes, leftName, typeSetFrom('array'))
      }
    } else if (node.left?._class === 'ArrayAccess') {
      const arrayName = firstVariableName(node.left.array)
      if (arrayName) {
        addTypesToMap(context.state.variableTypes, arrayName, typeSetFrom('array'))
        addTypesToMap(context.state.arrayElementTypes, arrayName, rightTypes)
        mergeIntoLocal(context.localTypes, arrayName, typeSetFrom('array'))
      }
      inferExpression(node.left.index, context)
    } else {
      inferExpression(node.left, context)
    }
    return
  }

  if (node._class === 'Action' && node.type === 'return') {
    const returnTypes = inferExpression(node.left, context)
    if (context.functionName) {
      addTypesToMap(context.state.functionReturnTypes, context.functionName, returnTypes)
    }
    return
  }

  if (node._class === 'Choice') {
    inferExpression(node.when, context)
    ;(node.text ?? []).forEach((entry: any) => inferExpression(entry, context))
    ;(node.actions ?? []).forEach((entry: any) => inferStatement(entry, context))
    extractChoiceBindingNames(node.input).forEach(name => {
      markAssignmentType(name, typeSetFrom('string'), context)
    })
    extractChoiceBindingNames(node.variables).forEach(name => {
      markAssignmentType(name, typeSetFrom('string'), context)
    })
    return
  }

  if (node._class === 'FunctionDef') {
    if (typeof node.name === 'string' && node.name.trim()) {
      context.state.functionDefs.set(node.name.trim(), node)
    }
    return
  }

  if (node._class === 'ConditionalBlock') {
    inferExpression(node.cond, context)
    ;(node.ifBlock ?? []).forEach((entry: any) => inferStatement(entry, context))
    ;(node.elseBlock ?? []).forEach((entry: any) => inferStatement(entry, context))
    return
  }

  if (node._class === 'Loop') {
    inferExpression(node.condition, context)
    ;(node.body ?? []).forEach((entry: any) => inferStatement(entry, context))
    return
  }

  inferExpression(node, context)
}

function runFunctionInference(fnName: string, fnDef: any, state: InferenceState, mode: 'propagate' | 'aggregate', aggregate?: AggregateState): void {
  const local = new Map<string, Set<InferredVariableType>>()
  const paramTypes = state.functionParamTypes.get(fnName)
  ;(fnDef?.params ?? []).forEach((param: any) => {
    if (typeof param !== 'string') return
    const known = paramTypes?.get(param)
    local.set(param, known ? cloneTypeSet(known) : cloneTypeSet(UNKNOWN_ONLY))
  })
  const context: InferContext = { state, localTypes: local, functionName: fnName, mode, aggregate }
  ;(fnDef?.body ?? []).forEach((node: any) => inferStatement(node, context))
}

function initializeState(story: any): {
  state: InferenceState
  defaultValues: Map<string, unknown>
  allNames: Set<string>
  unknownOnlyNames: Set<string>
} {
  const state: InferenceState = {
    variableTypes: new Map<string, Set<InferredVariableType>>(),
    arrayElementTypes: new Map<string, Set<InferredVariableType>>(),
    functionDefs: gatherFunctionDefs(story),
    functionReturnTypes: new Map<string, Set<InferredVariableType>>(),
    functionParamTypes: new Map<string, Map<string, Set<InferredVariableType>>>()
  }
  const defaultValues = new Map<string, unknown>()
  const allNames = new Set<string>()
  const unknownOnlyNames = new Set<string>()

  const persistent = story?.persistent ?? story?.variables ?? {}
  Object.entries(persistent).forEach(([name, value]) => {
    if (!name || RESERVED_VARIABLE_NAMES.has(name)) return
    allNames.add(name)
    defaultValues.set(name, value)
    const inferred = inferTypeFromValue(value)
    addTypesToMap(state.variableTypes, name, typeSetFrom(inferred))
    if (inferred === 'unknown') unknownOnlyNames.add(name)
    if (Array.isArray(value)) {
      const elementTypes = new Set<InferredVariableType>()
      value.forEach(entry => elementTypes.add(inferTypeFromValue(entry)))
      if (elementTypes.size > 0) addTypesToMap(state.arrayElementTypes, name, elementTypes)
    }
  })

  const stats = story?.stats ?? {}
  Object.keys(stats).forEach(name => {
    if (!name || RESERVED_VARIABLE_NAMES.has(name)) return
    allNames.add(name)
    addTypesToMap(state.variableTypes, name, cloneTypeSet(UNKNOWN_ONLY))
    unknownOnlyNames.add(name)
  })

  return { state, defaultValues, allNames, unknownOnlyNames }
}

function runPropagationPass(story: any, state: InferenceState): void {
  state.functionDefs.forEach((fnDef, fnName) => {
    runFunctionInference(fnName, fnDef, state, 'propagate')
  })

  ;(story?.sections ?? []).forEach((section: any) => {
    const context: InferContext = {
      state,
      localTypes: null,
      functionName: null,
      mode: 'propagate'
    }
    visitSectionNodes(section, (node) => inferStatement(node, context))
  })
}

function createAggregateState(baseNames: Set<string>, baseUnknown: Set<string>): AggregateState {
  return {
    variableCounts: new Map<string, TypeCounts>(),
    unknownOnlyNames: new Set(baseUnknown),
    allNames: new Set(baseNames),
    order: 0
  }
}

function addDefaultTypeCount(aggregate: AggregateState, name: string, inferred: InferredVariableType): void {
  aggregate.allNames.add(name)
  if (inferred === 'unknown') {
    aggregate.unknownOnlyNames.add(name)
    return
  }
  const counts = aggregate.variableCounts.get(name) ?? { counts: {}, firstSeen: {} }
  counts.counts[inferred] = (counts.counts[inferred] ?? 0) + 1
  if (counts.firstSeen[inferred] === undefined) {
    counts.firstSeen[inferred] = aggregate.order++
  }
  aggregate.variableCounts.set(name, counts)
}

function runAggregatePass(story: any, state: InferenceState, aggregate: AggregateState): void {
  state.functionDefs.forEach((fnDef, fnName) => {
    runFunctionInference(fnName, fnDef, state, 'aggregate', aggregate)
  })

  ;(story?.sections ?? []).forEach((section: any) => {
    const context: InferContext = {
      state,
      localTypes: null,
      functionName: null,
      mode: 'aggregate',
      aggregate
    }
    visitSectionNodes(section, (node) => inferStatement(node, context))
  })
}

function sortedTypesFromCounts(counts: TypeCounts): InferredVariableType[] {
  return CONCRETE_TYPES
    .filter(type => (counts.counts[type] ?? 0) > 0)
    .sort((left, right) => {
      const countDiff = (counts.counts[right] ?? 0) - (counts.counts[left] ?? 0)
      if (countDiff !== 0) return countDiff
      return (counts.firstSeen[left] ?? Number.MAX_SAFE_INTEGER) - (counts.firstSeen[right] ?? Number.MAX_SAFE_INTEGER)
    })
}

export function buildVariableCatalogAndWarnings(story: any): VariableInferenceResult {
  const { state, defaultValues, allNames, unknownOnlyNames } = initializeState(story)

  for (let pass = 0; pass < MAX_FIXPOINT_PASSES; pass += 1) {
    runPropagationPass(story, state)
  }

  const aggregate = createAggregateState(allNames, unknownOnlyNames)
  defaultValues.forEach((value, name) => {
    addDefaultTypeCount(aggregate, name, inferTypeFromValue(value))
  })
  runAggregatePass(story, state, aggregate)

  const warnings: VariableInferenceWarning[] = []
  const variableCatalog: VariableCatalogEntry[] = Array.from(aggregate.allNames)
    .filter(name => name && !RESERVED_VARIABLE_NAMES.has(name))
    .map((name) => {
      const counts = aggregate.variableCounts.get(name)
      const sortedTypes = counts ? sortedTypesFromCounts(counts) : []
      const inferredTypes: InferredVariableType[] = sortedTypes.length > 0 ? sortedTypes : ['unknown']
      const inferredType: InferredVariableType = inferredTypes[0] ?? 'unknown'
      const entry: VariableCatalogEntry = {
        name,
        inferredType,
        inferredTypes
      }
      if (defaultValues.has(name)) entry.defaultValue = defaultValues.get(name)
      const concreteCount = inferredTypes.filter(type => type !== 'unknown').length
      if (concreteCount > 1) {
        warnings.push({
          name,
          inferredTypes: inferredTypes.filter((type): type is InferredVariableType => type !== 'unknown')
        })
      }
      return entry
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  warnings.sort((a, b) => a.name.localeCompare(b.name))
  return { variableCatalog, warnings }
}
