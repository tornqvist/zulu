const path = require('path');
const test = require('tape');
const program = require('../src/index');

const createServer = options => program(path.resolve('./fixtures'), options);

test('rejects when missing root option', assert => {
  program().then(assert.fail, () => assert.end());
});

test('rejects when missing route path', assert => {
  program({ routes: [{}]}).then(assert.fail, () => assert.end());
});

test('rejects when scripts are malformed', assert => {
  program({ routes: [{ path: '', scripts: 'foo' }] }).then(
    assert.fail,
    () => assert.end()
  );
});

test('respects port option', assert => {
  createServer({ port: 3000 }).then(server => {
    assert.equal(server.address().port, 3000);
    server.close(assert.end);
  }, assert.end);
});
