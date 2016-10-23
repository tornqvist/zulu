#!/usr/bin/env node
/* eslint no-console: 0 */

try {
  // eslint-disable-next-line no-eval
  eval('async function noop() { await noop; }');
} catch (err) {
  require('babel-register');
}

const { basename } = require('path');
const subarg = require('subarg');
const chalk = require('chalk');
const createServer = require('../src');
const normalizePaths = require('../src/normalize-paths');

const alias = { p: 'port', r: 'route', s: 'script', h: 'help' };
const cwd = process.cwd();
const argv = subarg(process.argv.slice(2), { forward: true, alias });

let input;
if (argv._.length) {
  input = [ normalizeInput(argv) ];
} else if (argv.route) {
  input = asArray(argv.route).map(normalizeInput);
} else {
  input = [ normalizeInput(Object.assign({}, argv, { _: [ './' ] })) ];
}

const NAME = 'zulu';
const README = `
  ${ chalk.bold('Usage') }

    ${ chalk.cyan(`$ ${ NAME } [ path ] [ ...options ]`) }

  ${ chalk.bold('Options') }

    --port, -p    Server port
    --route, r    Create a route for path (relative to parent path)
    --script, -s  Pipe associated route through script (zero or more per route)
    --help, -h    Show this information

  ${ chalk.bold('Examples') }

    - Use it as a static file server

      ${ chalk.cyan(`$ ${ NAME } public`) }

      ${ chalk.dim('=> Serving files from "public"') }

    - Pipe just select routes through a script

      ${ chalk.cyan(`$ ${ NAME } src/*.js -s "browserify -t [ babelify --presets [ es2015 ]]"`) }

      ${ chalk.dim('=> Piping files from "src/*.js" through "browserify"') }

    - Use npm scripts

      ${ chalk.cyan(`$ ${ NAME } src/*.css -s build:css`) }

      ${ chalk.dim('=> Piping files from "src/*.css" through "build:css"') }

    - Putting it all together

      ${ chalk.cyan(`$ ${ NAME } -r [ public -r [ **/*.@(jpg|png) -s imgmin ]] -r [ src/*.js -s build:js -s uglifyjs ]`) }

      ${ chalk.dim(`
      => Serving files from "public"
      => Piping files from "public/**/*.@(jpg|png)" through "imgmin"
      => Piping files from "src/*.js" through "build:js" and "uglifyjs"
      `.trim()) }
`;

/**
 * Set title in terminal window
 */

process.title = NAME;

/**
 * Print help if missing base path/routes or if user is asking for it
 */

if (argv.help) {
  console.log(README);
  process.exit(0);
}

/**
 * Fire up server with options
 */

createServer(cwd, {
  routes: input,
  port: argv.port,
}).then(server => {
  const routes = normalizePaths(input);

  /**
   * Print information on server
   */

  console.log(`
    Server listening on http://localhost:${ server.address().port }

    ${ routes.map(route => {
      const path = route.path ? route.path.join('/') : basename(cwd);

      if (route.scripts.length) {
        const scripts = route.scripts.map((script, index, list) => {
          const delimiter = index === (list.length - 2) ? ' and' : ',';
          return `"${ script.split(' ')[0] }"${ index !== (list.length - 1) ? delimiter : '' }`;
        });

        return chalk.dim(`=> Piping files from ${ path } through ${ scripts.join(' ') }`);
      } else {
        return chalk.dim(`=> Piping files from ${ path }`);
      }
    }).join('\n    ') }
  `);
});

/**
 * Normalize output from minimist
 * @param  {String} _      Path to route
 * @param  {Mixed}  script Single script or list of scripts
 * @param  {Mixed}  route  Single sub-route or list of sub-routes
 * @return {Object}        Normalized route object
 */

function normalizeInput({ _: path, script, route }) {
  return {
    path: path.length ? path[0] : './',
    scripts: asArray(script),
    routes: asArray(route).map(normalizeInput)
  };
}

/**
 * Cast string to Array
 * @param  {Mixed} arr Object to cast
 * @return {Array}     Input as array
 */

function asArray(arr) {
  return Array.isArray(arr) ? arr : arr ? [ arr ] : [];
}
