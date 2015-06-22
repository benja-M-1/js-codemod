// -----------------------------------------------------------------------------
// Get rid of `copyProperties`
function rmCopyProperties(file, api, options) {
  const j = api.jscodeshift;

  const {getRequireCall, removeRequire} = require('./utils/require')(j);

  const printOptions = options.printOptions || {quote: 'single'};
  const root = j(file.source);

  const isOptionsOrConfig = node => {
    if (node.type == 'Identifier' &&
      (
        node.name == 'options' ||
        node.name == 'config'
      )
    ) {
      return true;
    }

    if (node.type == 'LogicalExpression' && node.operator == '||') {
      return (
        isOptionsOrConfig(node.left) &&
        node.right.type == 'ObjectExpression' &&
        !node.right.properties.length
      );
    }

    return false;
  };

  const checkArguments = path =>
    path.value.arguments.slice(1).every(argument =>
      argument.type == 'ObjectExpression' ||
      (
        options.arbiterMixin &&
        argument.type == 'Identifier' &&
        argument.name == 'ArbiterMixin'
      ) ||
      (
        options.optionsOrConfig &&
        isOptionsOrConfig(argument)
      )
    );

  const availableFilters = {
    onlyPrototypeAssignments(path) {
      var node = path.value.arguments[0];
      return (
        node.type == 'MemberExpression' &&
        node.object.type == 'Identifier' &&
        node.property.type == 'Identifier' &&
        node.property.name == 'prototype'
      );
    },
    onlyThisExpressions(path) {
      return path.value.arguments[0].type == 'ThisExpression';
    },
    onlyNewExpressions(path) {
      return path.value.arguments[0].type == 'NewExpression';
    },
    onlyCapitalizedIdentifiers(path) {
      var node = path.value.arguments[0];
      return (
        node.type == 'Identifier' &&
        node.name.charAt(0) == node.name.charAt(0).toUpperCase()
      );
    },
    onlyCallExpressions(path) {
      var node = path.parent.value;
      return node.type == 'ExpressionStatement';
    }
  };

  const rmCopyPropertyCalls = path =>
    j(path).replaceWith(j.callExpression(
      j.memberExpression(
        j.identifier('Object'),
        j.identifier('assign'),
        false
      ),
      path.value.arguments
    ));

  const filters =
    (options.filters || []).map(filterName => availableFilters[filterName]);

  const declarator = getRequireCall(root, 'copyProperties');
  if (declarator) {
    const variableName = declarator.value.id.name;
    const didTransform = root
      .find(j.CallExpression, {callee: {name: variableName}})
      .filter(checkArguments)
      .filter(p => filters.every(filter => filter(p)))
      .forEach(rmCopyPropertyCalls)
      .size() > 0;
    if (didTransform) {
      if (!root.find(j.CallExpression, {callee: {name: variableName}}).size()) {
        removeRequire(declarator);
      }
      return root.toSource(printOptions) + '\n';
    }
  }
  return null;
}

module.exports = rmCopyProperties;
