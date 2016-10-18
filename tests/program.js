
const fs = require('fs');
const path = require('path');
const http = require('http');
const got = require('got');
const test = require('tape');
const program = require('../src/index');

const FIXTURES = path.resolve(__dirname, 'fixtures');

const html = fs.readFileSync(path.join(FIXTURES, 'index.html'), 'utf-8');
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
    .then(res => next(res.body), err => { throw err; })
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

test('server static files', assert => {
  createServer().then(fetch('/index.html', body => {
    assert.equal(body, html);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('defaults to index.html', assert => {
  createServer().then(fetch('/', body => {
    assert.equal(body, html);
    assert.end();
  }), assert.end).catch(assert.end);
});

test.skip('throws 404 when file is not found', assert => {
  assert.end();
});

test('normalizes nested routes', assert => {
  createServer({
    routes: {
      path: 'foo',
      routes: [{
        path: '../index.html'
      }]
    }
  }).then(fetch('/', body => {
    assert.equal(body, html);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('executes scripts', assert => {
  createServer({
    routes: {
      path: 'dev/null',
      scripts: [ 'echo -n test' ]
    }
  }).then(fetch('/dev/null', body => {
    assert.equal(body, 'test');
    assert.end();
  }), assert.end).catch(assert.end);
});

test('scripts executes relative to root', assert => {
  createServer({
    routes: {
      path: 'foo',
      scripts: [ 'cat index.html' ]
    }
  }).then(fetch('/foo', body => {
    assert.equal(body, html);
    assert.end();
  }), assert.end).catch(assert.end);
});

test('scripts are piped through scripts', assert => {
  createServer({
    routes: {
      path: 'dev/null',
      scripts: [ 'cat index.html', 'sed s/world/you/g' ]
    }
  }).then(fetch('/dev/null', body => {
    assert.equal(body, html.replace(/world/, 'you'));
    assert.end();
  }), assert.end).catch(assert.end);
});

test('files are piped through scripts', assert => {
  createServer({
    routes: {
      path: './',
      scripts: [ 'sed s/world/you/g' ]
    }
  }).then(fetch('/', body => {
    assert.equal(body, html.replace(/world/, 'you'));
    assert.end();
  }), assert.end).catch(assert.end);
});

test.skip('runs npm scripts', assert => {
  assert.end();
});
