import _ from 'lodash'
import localeData from './en'

// shamelessly taken from
// eslint-disable-next-line max-len
// https://stackoverflow.com/questions/6921588/is-it-possible-to-reflect-the-arguments-of-a-javascript-function
const introspectArgs =
  (f) => f.toString ()
    .replace (/[\r\n\s]+/g, ' ')
    .match (/(?:function\s*\w*)?\s*(?:\((.*?)\)|([^\s]+))/)
    .slice (1, 3)
    .join ('')
    .split (/\s*,\s*/)

const getType = (obj) => {
  if (_.isString(obj)) return 'string'
  if (_.isFunction(obj)) {
    const args = introspectArgs(obj)
    return [
      '(',
      args.map((a) => `${a}: any`).join(', '),
      ') => string',
    ].join('')
  }
  throw new Error('assert false')
}

const transform = (obj) =>
  _.isPlainObject(obj)
    ? _.mapValues(obj, (v) => transform(v))
    : getType(obj)

const header = `
// @flow
// eslint-disable
// WARNING: THIS FILE IS AUTOGENERATED BY update_type.sh
export type Translation =`

const type = transform(localeData)
// TODO(ppershing): enable this once we have setLanguage support
// type.setLanguage = '(lang: string) => void'

// eslint-disable-next-line no-console
console.log(header, JSON.stringify(type, null, 2))
