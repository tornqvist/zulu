const fs = require('mz/fs');
const path = require('path');
const assert = require('assert');
const { createServer } = require('http');
const child_process = require('child_process');
const minimatch = require('minimatch');
const readPkg = require('read-pkg-up');
const { lookup } = require('mime-types');
const normalizePaths = require('./normalize-paths');

module.exports = (root, options = {}) => {
  assert.ok(root, 'Root directory must be specified');

  if (options.routes) {
    assert.ok(options.routes.path, 'Top route must have a path');
  }

  const paths = normalizePaths(options.routes || { path: '/' });
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

  const server = createServer(async (req, res) => {
    let stream;
    const url = req.url.replace(/^\//, '');
    const file = path.resolve(root, url);
    const match = paths.find(route => minimatch(url, route.path));
    const scripts = (match && match.scripts) ? match.scripts.map(spawn) : [];

    /**
     * Guestimate mimetype based on file extension
     */

    res.setHeader('Content-Type', lookup(file) || 'application/octet-stream');

    /**
     * Lookup requested url on disk
     */

    try {
      const stats = await fs.stat(file);

      /**
       * Serve file at requested url or lookup index.html if requesting a dir
       */

      if (stats.isFile()) {
        stream = fs.createReadStream(file);
      } else if (stats.isDirectory()) {
        const index = path.join(file, 'index.html');
        const fd = await fs.open(index, 'r');
        stream = fs.createReadStream(index, { fd });
        res.setHeader('Content-Type', 'text/html');
      }
    } catch (err) {

      /**
       * If no file could be found and there are no scripts for route, exit
       */

      if (!scripts.length) {
        res.writeHead(404, err.message);
        res.end();
        return;
      }

      /**
       * Use the first script in place of missing file
       */

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
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port || 0, err => {
      if (err) { return reject(err); }
      resolve(server);
    });
  });
};
