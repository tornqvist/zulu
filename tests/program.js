
const fs = require('fs');
const path = require('path');
const http = require('http');
const got = require('got');
const test = require('tape');
const program = require('../src/index');

const FIXTURES = path.resolve(__dirname, 'fixtures');

const ROOT_HTML = fs.readFileSync(path.join(FIXTURES, 'index.html'), 'utf-8');
const DEEP_HTML = fs.readFileSync(path.join(FIXTURES, 'foo', 'index.html'), 'utf-8');
const createServer = options => program(FIXTURES, options);
const fetch = (path, next) => server => {
  const port = server.address().port;
  const url = `http://localhost:${ port }/${ path.replace(/^\//, '') }`;
  const close = () => {
    server.close(err => {
      if (err) { throw err; }
    });
  };

  return got(url)
    .then(res => next(res), err => { throw err; })
    .then(close, err => {
      close();
      throw err;
    });
};

test('returns a promise', assert => {
  const promise = createServer();

  assert.ok(promise instanceof Promise);
  promise.then(server => server.close(assert.end));
});

test('resolves to a server', assert => {
  createServer().then(server => {
    assert.ok(server instanceof http.Server);
    server.close(assert.end);
  }, assert.end);
});

test('serves static files', assert => {
  createServer().then(fetch('/index.html', res => {
    assert.equal(res.body, ROOT_HTML);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('defaults to index.html', assert => {
  createServer().then(fetch('/', res => {
    assert.equal(res.body, ROOT_HTML);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('defaults to index.html for routed paths', assert => {
  createServer({
    routes: [{
      path: 'foo'
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, DEEP_HTML);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('throws 404 when file is not found', assert => {
  createServer()
    .then(fetch('/noop', req => assert.fail(`Got: "${ req.body }"`)))
    .catch(err => assert.equal(err.statusCode, 404))
    .then(assert.end);
});

test('sets proper mime types', assert => {
  const options = {
    routes: [{
      path: '.'
    }, {
      path: 'dev/*',
      scripts: [ 'echo -n test' ]
    }]
  };

  assert.test('gets generated content right', assert => {
    createServer(options).then(fetch('/null.css', res => {
      assert.equal(res.headers['content-type'], 'text/css');
      assert.end();
    }), assert.end).catch(assert.end);
  });

  assert.test('gets static content right', assert => {
    createServer(options).then(fetch('/', res => {
      assert.equal(res.headers['content-type'], 'text/html');
      assert.end();
    }), assert.end).catch(assert.end);
  });

  assert.test('sets `application/octet-stream` for unrecognized types', assert => {
    createServer(options).then(fetch('/null.unrecognized', res => {
      assert.equal(res.headers['content-type'], 'application/octet-stream');
      assert.end();
    }), assert.end).catch(assert.end);
  });
});

test('executes scripts', assert => {
  createServer({
    routes: [{
      path: 'dev/null',
      scripts: [ 'echo -n test' ]
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, 'test');
    assert.end();
  }), assert.end).catch(assert.end);
});

test('scripts executes relative to root', assert => {
  createServer({
    routes: [{
      path: 'foo',
      scripts: [ 'cat index.html' ]
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, ROOT_HTML);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('scripts are piped through scripts', assert => {
  createServer({
    routes: [{
      path: 'dev/null',
      scripts: [ 'cat index.html', 'sed s/world/you/g' ]
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, ROOT_HTML.replace(/world/, 'you'));
    assert.end();
  }), assert.end).catch(assert.end);
});

test('files are piped through scripts', assert => {
  createServer({
    routes: [{
      path: './',
      scripts: [ 'sed s/world/you/g' ]
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, 'Hello you!\n');
    assert.end();
  }), assert.end).catch(assert.end);
});

test('pipes through npm scripts', assert => {
  createServer({
    routes: [{
      path: 'dev/null',
      scripts: [ 'echo -n world', 'greeting' ]
    }]
  }).then(fetch('/', res => {
    assert.equal(res.body, 'hello world');
    assert.end();
  }), assert.end).catch(assert.end);
});
