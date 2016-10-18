const { join } = require('path');

/**
 * Flatten tree of nested routes to single dimension array
 * @param  {Object} routes Route object
 * @return {Array}         Flat representation of all routes with normalized paths
 */

module.exports = routes => {
  const paths = [];
  const normalizePaths = root => route => {
    paths.push({
      path: join(root, route.path).replace(/\.\//, ''),
      scripts: route.scripts || []
    });

    if (route.routes) {
      route.routes.forEach(normalizePaths(route.path));
    }
  };

  normalizePaths('')(routes);

  return paths;
};
