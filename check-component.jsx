const Immutable = require('immutable');
const { PropTypes: {
  any,
  bool,
  func,
  node,
  number,
  string
} } = require('react');
const React = require('react');
const ReactTestUtils = require('react-addons-test-utils');
const sticky = require('@openride/sticky-test');
const harness = require('./harness');


const standardGenerators = Immutable.Map([
  [any, () =>
    null],
  [bool, () =>
    Math.random() < 0.5],
  [func, () =>
    () => null],
  [node, () =>
    'Strings are nodes'],
  [number, () =>  // TODO specify types of numbers
    Math.floor(Math.random() * 24)],
  [string, () =>
    Immutable.Range(0, Math.floor(Math.random() * 32))  // 0-31 chars
      .map(() => String.fromCharCode(Math.floor(Math.random() * Math.pow(2, 16))))  // random unicode from 16 bits
      .join('')]
]);

const requiredify = generators =>
  generators.flatMap((generator, checker) => Immutable.Map([
    [checker.isRequired, generator],
    [checker, () => Math.random() < 0.5 ? generator() : undefined]
  ]));


const getProps = (propTypes, generators) =>
  Object.keys(propTypes)
    .map(name => ({
      name,
      value: generators.get(propTypes[name])()
    }))
    .reduce((a, { name, value }) => Object.assign(a, {
      [name]: value
    }), {});


const test = harness((description) => sticky.compose(
  sticky.declare(description),
  sticky.assert,
  sticky.timeout(100),
  sticky.inject(ReactTestUtils.createRenderer())
));


const checkProps = tree => {
  if (tree && tree.type && tree.type.propTypes) {
    Object.keys(tree.type.propTypes)
      .forEach(prop => {
        const checkResult = tree.type.propTypes[prop](tree.props, prop, tree.type.displayName || tree.type.name || '<<anonymous>>');
        if (checkResult) {
          throw checkResult;
        }
      });
  }
  if (tree && tree.props && tree.props.children) {
    if (Array.isArray(tree.props.children)) {
      tree.props.children.forEach(checkProps);
    } else {
      checkProps(tree.props.children);
    }
  }
};


const checkComponent = (Component, invariants = [], extraGenerators = Immutable.Map()) => {
  if (!Component.propTypes) {
    throw new Error(`No propTypes to check for <${Component.displayName || Component.name || 'anonymous'}>`);
  }
  const generators = requiredify(standardGenerators.merge(extraGenerators));

  test(`Check component <${Component.displayName || Component.name || 'anonymous'}>`, (assert, renderer) => {
    let renderOk = true;
    let invariantsOk = Immutable.Range(0, invariants.length)
      .map(() => true)
      .toList();

    Immutable.Range(0, 50).forEach(() => {
      const props = getProps(Component.propTypes, generators);
      const repr = JSON.stringify(props);
      try {
        renderer.render((<Component {...props} />));
      } catch (err) {
        renderOk = false;
        assert.fail(`${String(err)} | props: ${repr}`);
      }
      let result;
      try {
        result = renderer.getRenderOutput();
      } catch (err) {
        assert.fail(`failed (throwing); props: ${repr}`);
        throw err;
      }
      checkProps(result);
      invariants.forEach(({ description, check }, i) => {
        if (invariantsOk.get(i) && !check(props, result)) {
          invariantsOk = invariantsOk.set(i, false);
          assert.fail(`Invariant violation: ${description} | props: ${props}`);
        }
      });
    });
    if (renderOk) {
      assert.pass(`Rendered 50 sets of props without throwing`);
    }
    invariants
      .filter((inv, i) => invariantsOk.get(i))
      .forEach(({ description }) =>
        assert.pass(`Invariant held: ${description}`));
  });
};

module.exports = checkComponent;