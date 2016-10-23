const fs = require('mz/fs');
const { join, normalize, dirname } = require('path');
const assert = require('assert');
const { createServer } = require('http');
const child_process = require('child_process');
const minimatch = require('minimatch');
const readPkg = require('read-pkg-up');
const { lookup } = require('mime-types');
const normalizePaths = require('./normalize-paths');

const GLOB = /\/?(@\(.+\)|\*\(.+\)|\+\(.+\)|\?\(.+\)|\!\(.+\)|\[.+\]|\*{1,2}|\?)+\/?/;

module.exports = (root, options = {}) => {
  return new Promise((resolve, reject) => {
    assert.ok(root, 'Root directory must be specified');

    let routes;
    if (!options.routes) {
      routes = [{ path: [ '.' ]}];
    } else {
      assert.ok(Array.isArray(options.routes), 'Routes should be an array');
      routes = normalizePaths(options.routes);
    }

    routes.forEach(route => {
      if (route.scripts) {
        assert.ok(Array.isArray(route.scripts), 'Scripts should be an array');
      }
    });

    const { pkg } = readPkg.sync({ cwd: root, normalize: false });
    const npmScripts = Object.keys(pkg.scripts);

    /**
     * Spawn given scripts as child processes
     * @param  {Array} script List of scripts to execute
     * @return {Array}        List of child processes
     */

    const spawn = script => {
      const cmd = script.split(' ');
      const options = { cwd: root, env: process.env };

      /**
       * Execute scripts defined in package.json using `npm run`.
       * If not listed in package.json, go for broke and execute script.
       */

      if (npmScripts.includes(cmd[0])) {
        return child_process.spawn('npm', [ 'run', '-s' ].concat(cmd), options);
      } else {
        return child_process.spawn(cmd[0], cmd.slice(1), options);
      }
    };

    /**
     * Request handler
     * @param  {http.ClientRequest}   req Request object
     * @param  {http.ServerResponse}  res Response object
     * @return {void}
     */

    const handler = async (req, res) => {
      const url = normalize(req.url.replace(/^\//, ''));

      const readFile = async (file) => {
        const stats = await fs.stat(file);

        if (stats.isFile()) {
          return fs.createReadStream(file);
        } else if (stats.isDirectory()) {
          const index = join(file, 'index.html');
          const fd = await fs.open(index, 'r');
          res.setHeader('Content-Type', 'text/html');
          return fs.createReadStream(index, { fd });
        }
      };

      /**
       * Guestimate mimetype based on file extension
       */

      res.setHeader('Content-Type', lookup(url) || 'application/octet-stream');

      /**
       * Lookup requested url on disk
       */

      let stream, scripts;
      for (const route of routes) {
        let path = route.path.slice();

        /**
         * Folders at root level are removed from path
         */

        let dir;
        if (GLOB.test(path[0])) {
          const parts = [];

          /**
           * Extract non-glob parts from root dir
           */

          for (const part of path[0].split('/')) {
            if (GLOB.test(part)) {
              break;
            } else {
              parts.push(part);
            }
          }

          dir = parts.join('/');
          path[0] = path[0].replace(`${ dir }/`, '');
        } else {
          dir = path.shift();
        }

        /**
         * Put path back together again
         */
        path = normalize(path.join('/'));

        /**
         * Match url with path
         */

        const isMatch = (GLOB.test(path) ?
          minimatch(url, path) :
          url.indexOf(path) === 0);

        if (!isMatch && dirname(url) !== path) {
          continue;
        }

        try {
          stream = await readFile(join(root, dir, url));
        } catch (err) {
          if (!isMatch) {
            continue;
          }
        }

        /**
         * Prepare script processes for associated route
         */

        scripts = route.scripts ? route.scripts.map(spawn) : [];

        break;
      }

      /**
       * Use the first script in place of missing file
       */

      if (!stream) {
        /**
         * If there are no scripts for route, exit
         */

        if (!scripts || !scripts.length) {
          res.writeHead(404, 'No file or script associated with route');
          res.end();
          return;
        }

        stream = scripts.shift().stdout;
      }

      /**
       * Pipe stream through all scripts in order
       */

      const program = scripts.reduce((stream, script) => {
        stream.pipe(script.stdin);
        return script.stdout;
      }, stream);

      /**
       * Finally, pipe the whole thing through to the response
       */

      program.pipe(res);
    };

    const server = createServer((req, res) => {
      handler(req, res).catch(err => {
        res.writeHead(500, err.message);
        res.end();
      });
    });

    server.listen(options.port || 0, err => {
      if (err) { return reject(err); }
      resolve(server);
    });
  });
};
