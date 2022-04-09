import type {$FixMe, $IntentionalAny} from '@theatre/shared/utils/types'
import userReadableTypeOfValue from '@theatre/shared/utils/userReadableTypeOfValue'
import type {Rgba} from '@theatre/shared/utils/color'
import {
  decorateRgba,
  linearSrgbToOklab,
  oklabToLinearSrgb,
  srgbToLinearSrgb,
  linearSrgbToSrgb,
} from '@theatre/shared/utils/color'
import {clamp, mapValues} from 'lodash-es'
import type {
  IShorthandCompoundProps,
  IValidCompoundProps,
  ShorthandCompoundPropsToLonghandCompoundProps,
} from './internals'
import {sanitizeCompoundProps} from './internals'
import {propTypeSymbol} from './internals'

// Notes on naming:
// As of now, prop types are either `simple` or `composite`.
// The compound type is a composite type. So is the upcoming enum type.
// Composite types are not directly sequenceable yet. Their simple sub/ancestor props are.
// We’ll provide a nice UX to manage keyframing of multiple sub-props.

/**
 * Validates the common options given to all prop types, such as `opts.label`
 *
 * @param fnCallSignature - See references for examples
 * @param opts - The common options of all prop types
 * @returns void - will throw if options are invalid
 */
const validateCommonOpts = (fnCallSignature: string, opts?: CommonOpts) => {
  if (process.env.NODE_ENV !== 'production') {
    if (opts === undefined) return
    if (typeof opts !== 'object' || opts === null) {
      throw new Error(
        `opts in ${fnCallSignature} must either be undefined or an object.`,
      )
    }
    if (Object.prototype.hasOwnProperty.call(opts, 'label')) {
      const {label} = opts
      if (typeof label !== 'string') {
        throw new Error(
          `opts.label in ${fnCallSignature} should be a string. ${userReadableTypeOfValue(
            label,
          )} given.`,
        )
      }
      if (label.trim().length !== label.length) {
        throw new Error(
          `opts.label in ${fnCallSignature} should not start/end with whitespace. "${label}" given.`,
        )
      }
      if (label.length === 0) {
        throw new Error(
          `opts.label in ${fnCallSignature} should not be an empty string. If you wish to have no label, remove opts.label from opts.`,
        )
      }
    }
  }
}

/**
 * A compound prop type (basically a JS object).
 *
 * @example
 * Usage:
 * ```ts
 * // shorthand
 * const position = {
 *   x: 0,
 *   y: 0
 * }
 * assert(sheet.object('some object', position).value.x === 0)
 *
 * // nesting
 * const foo = {bar: {baz: {quo: 0}}}
 * assert(sheet.object('some object', foo).value.bar.baz.quo === 0)
 *
 * // With additional options:
 * const position = t.compound(
 *   {x: 0, y: 0},
 *   // a custom label for the prop:
 *   {label: "Position"}
 * )
 * ```
 *
 */
export const compound = <Props extends IShorthandCompoundProps>(
  props: Props,
  opts?: {
    label?: string
  },
): PropTypeConfig_Compound<
  ShorthandCompoundPropsToLonghandCompoundProps<Props>
> => {
  validateCommonOpts('t.compound(props, opts)', opts)
  const sanitizedProps = sanitizeCompoundProps(props)
  const deserializationCache = new WeakMap<{}, unknown>()
  const config: PropTypeConfig_Compound<
    ShorthandCompoundPropsToLonghandCompoundProps<Props>
  > = {
    type: 'compound',
    props: sanitizedProps,
    valueType: null as $IntentionalAny,
    [propTypeSymbol]: 'TheatrePropType',
    label: opts?.label,
    default: mapValues(sanitizedProps, (p) => p.default) as $IntentionalAny,
    deserialize: (json: unknown) => {
      if (typeof json !== 'object' || !json) return undefined
      if (deserializationCache.has(json)) {
        return deserializationCache.get(json)
      }

      // TODO we should probably also check here whether `json` is a pure object rather
      // than an instance of a class, just to avoid the possible edge cases of handling
      // class instances.

      const deserialized: $FixMe = {}
      let atLeastOnePropWasDeserialized = false
      for (const [key, propConfig] of Object.entries(sanitizedProps)) {
        if (Object.prototype.hasOwnProperty.call(json, key)) {
          const deserializedSub = propConfig.deserialize(
            (json as $IntentionalAny)[key] as unknown,
          )
          if (
            typeof deserializedSub !== 'undefined' &&
            deserializedSub !== null
          ) {
            atLeastOnePropWasDeserialized = true
            deserialized[key] = deserializedSub
          }
        }
      }
      deserializationCache.set(json, deserialized)
      if (atLeastOnePropWasDeserialized) {
        return deserialized
      }
    },
  }
  return config
}

/**
 * A number prop type.
 *
 * @example
 * Usage
 * ```ts
 * // shorthand:
 * const obj = sheet.object('key', {x: 0})
 *
 * // With options (equal to above)
 * const obj = sheet.object('key', {
 *   x: t.number(0)
 * })
 *
 * // With a range (note that opts.range is just a visual guide, not a validation rule)
 * const x = t.number(0, {range: [0, 10]}) // limited to 0 and 10
 *
 * // With custom nudging
 * const x = t.number(0, {nudgeMultiplier: 0.1}) // nudging will happen in 0.1 increments
 *
 * // With custom nudging function
 * const x = t.number({
 *   nudgeFn: (
 *     // the mouse movement (in pixels)
 *     deltaX: number,
 *     // the movement as a fraction of the width of the number editor's input
 *     deltaFraction: number,
 *     // A multiplier that's usually 1, but might be another number if user wants to nudge slower/faster
 *     magnitude: number,
 *     // the configuration of the number
 *     config: {nudgeMultiplier?: number; range?: [number, number]},
 *   ): number => {
 *     return deltaX * magnitude
 *   },
 * })
 * ```
 *
 * @param defaultValue - The default value (Must be a finite number)
 * @param opts - The options (See usage examples)
 * @returns A number prop config
 */
export const number = (
  defaultValue: number,
  opts?: {
    nudgeFn?: PropTypeConfig_Number['nudgeFn']
    range?: PropTypeConfig_Number['range']
    nudgeMultiplier?: number
    label?: string
  },
): PropTypeConfig_Number => {
  if (process.env.NODE_ENV !== 'production') {
    validateCommonOpts('t.number(defaultValue, opts)', opts)
    if (typeof defaultValue !== 'number' || !isFinite(defaultValue)) {
      throw new Error(
        `Argument defaultValue in t.number(defaultValue) must be a number. ${userReadableTypeOfValue(
          defaultValue,
        )} given.`,
      )
    }
    if (typeof opts === 'object' && opts !== null) {
      if (Object.prototype.hasOwnProperty.call(opts, 'range')) {
        if (!Array.isArray(opts.range)) {
          throw new Error(
            `opts.range in t.number(defaultValue, opts) must be a tuple of two numbers. ${userReadableTypeOfValue(
              opts.range,
            )} given.`,
          )
        }
        if (opts.range.length !== 2) {
          throw new Error(
            `opts.range in t.number(defaultValue, opts) must have two elements. ${opts.range.length} given.`,
          )
        }
        if (!opts.range.every((n) => typeof n === 'number' && !isNaN(n))) {
          throw new Error(
            `opts.range in t.number(defaultValue, opts) must be a tuple of two numbers.`,
          )
        }
        if (opts.range[0] >= opts.range[1]) {
          throw new Error(
            `opts.range[0] in t.number(defaultValue, opts) must be smaller than opts.range[1]. Given: ${JSON.stringify(
              opts.range,
            )}`,
          )
        }
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'nudgeMultiplier')) {
        if (
          typeof opts!.nudgeMultiplier !== 'number' ||
          !isFinite(opts!.nudgeMultiplier)
        ) {
          throw new Error(
            `opts.nudgeMultiplier in t.number(defaultValue, opts) must be a finite number. ${userReadableTypeOfValue(
              opts!.nudgeMultiplier,
            )} given.`,
          )
        }
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'nudgeFn')) {
        if (typeof opts?.nudgeFn !== 'function') {
          throw new Error(
            `opts.nudgeFn in t.number(defaultValue, opts) must be a function. ${userReadableTypeOfValue(
              opts!.nudgeFn,
            )} given.`,
          )
        }
      }
    }
  }

  return {
    type: 'number',
    valueType: 0,
    default: defaultValue,
    [propTypeSymbol]: 'TheatrePropType',
    ...(opts ? opts : {}),
    label: opts?.label,
    nudgeFn: opts?.nudgeFn ?? defaultNumberNudgeFn,
    nudgeMultiplier:
      typeof opts?.nudgeMultiplier === 'number' ? opts.nudgeMultiplier : 1,
    interpolate: _interpolateNumber,
    deserialize: numberDeserializer(opts?.range),
  }
}

const numberDeserializer = (range?: PropTypeConfig_Number['range']) =>
  range
    ? (json: unknown): undefined | number => {
        if (!(typeof json === 'number' && isFinite(json))) return undefined
        return clamp(json, range[0], range[1])
      }
    : _ensureNumber

const _ensureNumber = (value: unknown): undefined | number =>
  typeof value === 'number' && isFinite(value) ? value : undefined

const _interpolateNumber = (
  left: number,
  right: number,
  progression: number,
): number => {
  return left + progression * (right - left)
}

export const rgba = (
  defaultValue: Rgba = {r: 0, g: 0, b: 0, a: 1},
  opts?: {
    label?: string
  },
): PropTypeConfig_Rgba => {
  if (process.env.NODE_ENV !== 'production') {
    validateCommonOpts('t.rgba(defaultValue, opts)', opts)

    // Lots of duplicated code and stuff that probably shouldn't be here, mostly
    // because we are still figuring out how we are doing validation, sanitization,
    // decoding, decorating.

    // Validate default value
    let valid = true
    for (const p of ['r', 'g', 'b', 'a']) {
      if (
        !Object.prototype.hasOwnProperty.call(defaultValue, p) ||
        typeof (defaultValue as $IntentionalAny)[p] !== 'number'
      ) {
        valid = false
      }
    }

    if (!valid) {
      throw new Error(
        `Argument defaultValue in t.rgba(defaultValue) must be of the shape { r: number; g: number, b: number, a: number; }.`,
      )
    }
  }

  // Clamp defaultValue components between 0 and 1
  const sanitized = {}
  for (const component of ['r', 'g', 'b', 'a']) {
    ;(sanitized as $IntentionalAny)[component] = Math.min(
      Math.max((defaultValue as $IntentionalAny)[component], 0),
      1,
    )
  }

  return {
    type: 'rgba',
    valueType: null as $IntentionalAny,
    default: decorateRgba(sanitized as Rgba),
    [propTypeSymbol]: 'TheatrePropType',
    label: opts?.label,
    interpolate: _interpolateRgba,
    deserialize: _sanitizeRgba,
  }
}

const _sanitizeRgba = (val: unknown): Rgba | undefined => {
  let valid = true
  for (const c of ['r', 'g', 'b', 'a']) {
    if (
      !Object.prototype.hasOwnProperty.call(val, c) ||
      typeof (val as $IntentionalAny)[c] !== 'number'
    ) {
      valid = false
    }
  }

  if (!valid) return undefined

  // Clamp defaultValue components between 0 and 1
  const sanitized = {}
  for (const c of ['r', 'g', 'b', 'a']) {
    ;(sanitized as $IntentionalAny)[c] = Math.min(
      Math.max((val as $IntentionalAny)[c], 0),
      1,
    )
  }

  return decorateRgba(sanitized as Rgba)
}

const _interpolateRgba = (
  left: Rgba,
  right: Rgba,
  progression: number,
): Rgba => {
  const leftLab = linearSrgbToOklab(srgbToLinearSrgb(left))
  const rightLab = linearSrgbToOklab(srgbToLinearSrgb(right))

  const interpolatedLab = {
    L: (1 - progression) * leftLab.L + progression * rightLab.L,
    a: (1 - progression) * leftLab.a + progression * rightLab.a,
    b: (1 - progression) * leftLab.b + progression * rightLab.b,
    alpha: (1 - progression) * leftLab.alpha + progression * rightLab.alpha,
  }

  const interpolatedRgba = linearSrgbToSrgb(oklabToLinearSrgb(interpolatedLab))

  return decorateRgba(interpolatedRgba)
}

/**
 * A boolean prop type
 *
 * @example
 * Usage:
 * ```ts
 * // shorthand:
 * const obj = sheet.object('key', {isOn: true})
 *
 * // with a label:
 * const obj = sheet.object('key', {
 *   isOn: t.boolean(true, {
 *     label: 'Enabled'
 *   })
 * })
 * ```
 *
 * @param defaultValue - The default value (must be a boolean)
 * @param opts - Options (See usage examples)
 */
export const boolean = (
  defaultValue: boolean,
  opts?: {
    label?: string
    interpolate?: Interpolator<boolean>
  },
): PropTypeConfig_Boolean => {
  if (process.env.NODE_ENV !== 'production') {
    validateCommonOpts('t.boolean(defaultValue, opts)', opts)
    if (typeof defaultValue !== 'boolean') {
      throw new Error(
        `defaultValue in t.boolean(defaultValue) must be a boolean. ${userReadableTypeOfValue(
          defaultValue,
        )} given.`,
      )
    }
  }

  return {
    type: 'boolean',
    default: defaultValue,
    valueType: null as $IntentionalAny,
    [propTypeSymbol]: 'TheatrePropType',
    label: opts?.label,
    interpolate: opts?.interpolate ?? leftInterpolate,
    deserialize: _ensureBoolean,
  }
}

const _ensureBoolean = (val: unknown): boolean | undefined => {
  return typeof val === 'boolean' ? val : undefined
}

function leftInterpolate<T>(left: T): T {
  return left
}

/**
 * A string prop type
 *
 * @example
 * Usage:
 * ```ts
 * // shorthand:
 * const obj = sheet.object('key', {message: "Animation loading"})
 *
 * // with a label:
 * const obj = sheet.object('key', {
 *   message: t.string("Animation Loading", {
 *     label: 'The Message'
 *   })
 * })
 * ```
 *
 * @param defaultValue - The default value (must be a string)
 * @param opts - The options (See usage examples)
 * @returns A string prop type
 */
export const string = (
  defaultValue: string,
  opts?: {
    label?: string
    interpolate?: Interpolator<string>
  },
): PropTypeConfig_String => {
  if (process.env.NODE_ENV !== 'production') {
    validateCommonOpts('t.string(defaultValue, opts)', opts)
    if (typeof defaultValue !== 'string') {
      throw new Error(
        `defaultValue in t.string(defaultValue) must be a string. ${userReadableTypeOfValue(
          defaultValue,
        )} given.`,
      )
    }
  }
  return {
    type: 'string',
    default: defaultValue,
    valueType: null as $IntentionalAny,
    [propTypeSymbol]: 'TheatrePropType',
    label: opts?.label,
    interpolate: opts?.interpolate ?? leftInterpolate,
    deserialize: _ensureString,
  }
}

function _ensureString(s: unknown): string | undefined {
  return typeof s === 'string' ? s : undefined
}

/**
 * A stringLiteral prop type, useful for building menus or radio buttons.
 *
 * @example
 * Usage:
 * ```ts
 * // Basic usage
 * const obj = sheet.object('key', {
 *   light: t.stringLiteral("r", {r: "Red", "g": "Green"})
 * })
 *
 * // Shown as a radio switch with a custom label
 * const obj = sheet.object('key', {
 *   light: t.stringLiteral("r", {r: "Red", "g": "Green"})
 * }, {as: "switch", label: "Street Light"})
 * ```
 *
 * @returns A stringLiteral prop type
 *
 */
export function stringLiteral<Opts extends {[key in string]: string}>(
  /**
   * Default value (a string that equals one of the options)
   */
  defaultValue: Extract<keyof Opts, string>,
  /**
   * The options. Use the `"value": "Label"` format.
   *
   * An object like `{[value]: Label}`. Example: `{r: "Red", "g": "Green"}`
   */
  options: Opts,
  /**
   * opts.as Determines if editor is shown as a menu or a switch. Either 'menu' or 'switch'.  Default: 'menu'
   */
  opts?: {
    as?: 'menu' | 'switch'
    label?: string
    interpolate?: Interpolator<Extract<keyof Opts, string>>
  },
): PropTypeConfig_StringLiteral<Extract<keyof Opts, string>> {
  return {
    type: 'stringLiteral',
    default: defaultValue,
    options: {...options},
    [propTypeSymbol]: 'TheatrePropType',
    valueType: null as $IntentionalAny,
    as: opts?.as ?? 'menu',
    label: opts?.label,
    interpolate: opts?.interpolate ?? leftInterpolate,
    deserialize(json: unknown): undefined | Extract<keyof Opts, string> {
      if (typeof json !== 'string') return undefined
      if (Object.prototype.hasOwnProperty.call(options, json)) {
        return json as $IntentionalAny
      } else {
        return undefined
      }
    },
  }
}

export type Sanitizer<T> = (value: unknown) => T | undefined
export type Interpolator<T> = (left: T, right: T, progression: number) => T

export interface IBasePropType<
  LiteralIdentifier extends string,
  ValueType,
  DeserializeType = ValueType,
> {
  type: LiteralIdentifier
  valueType: ValueType
  [propTypeSymbol]: 'TheatrePropType'
  label: string | undefined
  default: ValueType
  deserialize: (json: unknown) => undefined | DeserializeType
}

interface ISimplePropType<LiteralIdentifier extends string, ValueType>
  extends IBasePropType<LiteralIdentifier, ValueType, ValueType> {
  interpolate: Interpolator<ValueType>
}

export interface PropTypeConfig_Number
  extends ISimplePropType<'number', number> {
  range?: [min: number, max: number]
  nudgeFn: NumberNudgeFn
  nudgeMultiplier: number
}

export type NumberNudgeFn = (p: {
  deltaX: number
  deltaFraction: number
  magnitude: number
  config: PropTypeConfig_Number
}) => number

const defaultNumberNudgeFn: NumberNudgeFn = ({
  config,
  deltaX,
  deltaFraction,
  magnitude,
}) => {
  const {range} = config
  if (range) {
    return (
      deltaFraction * (range[1] - range[0]) * magnitude * config.nudgeMultiplier
    )
  }

  return deltaX * magnitude * config.nudgeMultiplier
}

export interface PropTypeConfig_Boolean
  extends ISimplePropType<'boolean', boolean> {}

interface CommonOpts {
  label?: string
}

export interface PropTypeConfig_String
  extends ISimplePropType<'string', string> {}

export interface PropTypeConfig_StringLiteral<T extends string>
  extends ISimplePropType<'stringLiteral', T> {
  options: Record<T, string>
  as: 'menu' | 'switch'
}

export interface PropTypeConfig_Rgba extends ISimplePropType<'rgba', Rgba> {}

type DeepPartialCompound<Props extends IValidCompoundProps> = {
  [K in keyof Props]?: DeepPartial<Props[K]>
}

type DeepPartial<Conf extends PropTypeConfig> =
  Conf extends PropTypeConfig_AllNonCompounds
    ? Conf['valueType']
    : Conf extends PropTypeConfig_Compound<infer T>
    ? DeepPartialCompound<T>
    : never

export interface PropTypeConfig_Compound<Props extends IValidCompoundProps>
  extends IBasePropType<
    'compound',
    {[K in keyof Props]: Props[K]['valueType']},
    DeepPartialCompound<Props>
  > {
  props: Record<string, PropTypeConfig>
}

export interface PropTypeConfig_Enum extends IBasePropType<'enum', {}> {
  cases: Record<string, PropTypeConfig>
  defaultCase: string
}

export type PropTypeConfig_AllNonCompounds =
  | PropTypeConfig_Number
  | PropTypeConfig_Boolean
  | PropTypeConfig_String
  | PropTypeConfig_StringLiteral<$IntentionalAny>
  | PropTypeConfig_Rgba

export type PropTypeConfig =
  | PropTypeConfig_AllNonCompounds
  | PropTypeConfig_Compound<$IntentionalAny>
  | PropTypeConfig_Enum
