import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'

// https://github.com/TrySound/rollup-plugin-terser
import { terser } from 'rollup-plugin-terser'

// https://github.com/saf33r/rollup-plugin-cleaner
import cleaner from 'rollup-plugin-cleaner'

// https://github.com/egoist/rollup-plugin-postcss
import postcss from 'rollup-plugin-postcss'

import pkg from './package.json'

const path = require('path')
const fs = require('fs')
const _ = require('lodash')

const isDev = process.env.NODE_ENV === 'development'

const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const cssModulesConfig = isDev
  ? true
  : {
      generateScopedName: '[hash:base64:5]'
    }

const umdFileName = pkg['umd:main']
const filename = umdFileName.slice(
  umdFileName.indexOf('/') + 1,
  umdFileName.indexOf('.')
)

const out = [
  {
    file: pkg.main,
    format: 'cjs'
  },
  {
    file: pkg.module,
    format: 'esm'
  },
  {
    file: umdFileName,
    format: 'umd',
    name: _.upperFirst(_.camelCase(filename))
  }
]

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * (c) 2020-${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} License.
 */
`

const configGenerator = (module, index) => ({
  input: getInput(),
  output: [module, minify(module)],
  plugins: [
    index === 0
      ? cleaner({
          targets: ['./dist']
        })
      : null,
    json(),
    nodeResolve({
      mainFields: ['module', 'main', 'jsnext:main', 'browser'],
      extensions
    }),
    commonjs(),
    alias({
      entries: [{ find: '@', replacement: resolve('src') }]
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    babel({
      exclude: 'node_modules/**'
    }),
    postcss({
      extract:
        process.env.CSS_STATUS === 'inline'
          ? false
          : resolve(`dist/css/${filename}.css`),
      modules: cssModulesConfig
    })
  ].filter(Boolean)
})

export default out.map((o, i) => configGenerator(o, i))

/**
 * ????????????????????????
 * @param {String} dir ??????????????????
 */
function resolve(dir) {
  return path.join(__dirname, dir)
}

/**
 * ??????????????????????????????
 */
function getInput() {
  const index = resolve('src/index.js')
  const indexJSX = resolve('src/index.jsx')
  return fs.existsSync(index) ? index : indexJSX
}

/**
 * ???????????????
 * @param {Object} m out ?????????????????? output ??????
 */
function minify(m) {
  // ??????????????????
  m.file = resolve(m.file)

  // ?????????
  const minObj = _.cloneDeep(m)
  minObj.file = minObj.file.slice(0, minObj.file.lastIndexOf('.js')) + '.min.js'
  minObj.plugins = [
    terser({
      // ?????????????????? console
      compress: { drop_console: !isDev },
      // ??????????????? banner
      format: {
        comments: RegExp(`${pkg.name}`)
      }
    })
  ]
  minObj.banner = banner
  return minObj
}
