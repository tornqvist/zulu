const path = require('path');
const test = require('tape');
const program = require('../src/index');

const createServer = options => program(path.resolve('./fixtures'), options);

test('throws when missing root option', assert => {
  assert.throws(() => program());
  assert.end();
});

test('throws when missing top route path', assert => {
  assert.throws(() => program({ routes: {}}));
  assert.end();
});

test('respects port option', assert => {
  createServer({ port: 3000 }).then(server => {
    assert.equal(server.address().port, 3000);
    server.close(assert.end);
  }, assert.end);
});
