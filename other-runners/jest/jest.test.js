const comboTest = require('../../src');
const { number } = require('prop-types');

describe('checkPropTypes patching', () => {
  const Component = () => null;
  Component.propTypes = { x: number.isRequired };

  it('prevents propType errors from going to the console', () => {
    const spy = jest.spyOn(console, 'error');
    const assert = () => null;
    comboTest(Component, { assert, props: {} });
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails tests that trigger propType errors', () => {
    const assert = {
      pass: jest.fn(),
      fail: jest.fn(),
    };
    comboTest(Component, { assert, props: {} });
    expect(assert.pass).not.toHaveBeenCalled();
    expect(assert.fail).toHaveBeenCalled();
  });
});
