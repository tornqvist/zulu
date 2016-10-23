const assert = require('assert');

/**
 * Flatten tree of nested routes to single dimension array
 * @param  {Object} routes Route object
 * @return {Array}         Flat representation of all routes with normalized paths
 */

module.exports = routes => {
  const paths = [];
  const normalizePaths = parent => route => {
    assert.ok(route.path, 'Route must have a path');

    const path = parent.concat([ route.path ]);

    paths.push({
      path,
      scripts: route.scripts || []
    });

    if (route.routes) {
      route.routes.forEach(normalizePaths(path));
    }
  };

  routes.forEach(normalizePaths([]));

  return paths;
};
