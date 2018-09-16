export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const isPromiseCall = node =>
    node.type === 'CallExpression' &&
    node.callee.property &&
    node.callee.property.name === 'then';

  const isPromiseCatchCall = node =>
    node.type === 'CallExpression' &&
    node.callee.property &&
    node.callee.property.name === 'catch';

  const isChainedPromiseCall = node =>
    node.type == 'ExpressionStatement' &&
    node.expression.type == 'AwaitExpression' &&
    isPromiseCall(node.expression.argument);

  const funcReturnsPromise = p => {
    const body = p.node.body.body;
    const last = body[body.length - 1];
    if (last.type !== 'ReturnStatement') {
      return false;
    }
    return isPromiseCall(last.argument);
  };

  const arrowReturnsPromise = p => {
    const node = p.node;
    if (node.body.type === 'BlockStatement') {
      const body = node.body.body;
      if (body.length == 0) {
        return false;
      }
      const last = body.length > 1 ? body[body.length - 1] : body[0];
      if (last.type !== 'ReturnStatement') {
        return false;
      }
      return isPromiseCall(last.argument) || isPromiseCatchCall(last.argument);
    }
    return isPromiseCall(node.body) || isPromiseCatchCall(node.body);
  };

  const genAwaitionDeclarator = (params, exp) => {
    let declaratorId;
    if (params.length > 1) {
      declaratorId = j.arrayPattern(
        params.map(param => j.identifier(param.name))
      );
    } else {
      declaratorId = j.identifier(params[0].name);
    }
    return j.variableDeclaration('const', [
      j.variableDeclarator(declaratorId, j.awaitExpression(exp))
    ]);
  };

  const genAwaition = (callExp, callBack) => {
    let awaition;
    if (callBack.params.length > 0) {
      awaition = genAwaitionDeclarator(callBack.params, callExp.callee.object);
    } else {
      awaition = j.expressionStatement(
        j.awaitExpression(callExp.callee.object)
      );
    }

    return awaition;
  };

  const genAwait = (exp, shouldReturn = true) => {
    let callExp;
    if (exp.type == 'ReturnStatement') {
      callExp = exp.argument;
    } else if (exp.type == 'CallExpression') {
      callExp = exp;
    } else {
      return exp;
    }

    const callBack = callExp.arguments[0];
    let blockStatements = [];
    let awaition;

    if (!isPromiseCall(callExp.callee.object)) {
      blockStatements = [genAwaition(callExp, callBack)];
    } else {
      const prevAwaition = genAwait(callExp.callee.object, false);

      // then append to the block statements the creation of the waition
      if (callBack.params.length > 0) {
        let declaratorId = j.identifier(callBack.params[0].name);
        awaition = j.variableDeclaration('const', [
          j.variableDeclarator(
            declaratorId,
            j.awaitExpression(callExp.callee.object.arguments[0].body)
          )
        ]);
      } else {
        awaition = j.expressionStatement(
          j.awaitExpression(callExp.callee.object.arguments[0].body)
        );
      }

      blockStatements = [...prevAwaition, awaition];
    }

    if (shouldReturn === false) {
      return blockStatements;
    }

    let rest;
    if (callBack.body.type === 'BlockStatement') {
      rest = callBack.body.body;
    } else {
      rest = [j.returnStatement(callBack.body)];
    }

    return [...blockStatements, ...rest];
  };

  const genCatchClause = (callExp, callBack) => {
    let catchClause;

    if (callBack.body.type == 'BlockStatement') {
      catchClause = j.catchClause(callBack.params[0], null, callBack.body);
    } else {
      catchClause = j.catchClause(
        callBack.body.arguments[0],
        null,
        j.blockStatement([j.expressionStatement(callBack.body)])
      );
    }

    const tryStatement = j.tryStatement(
      j.blockStatement([...genAwait(j.returnStatement(callExp.callee.object))]),
      catchClause
    );

    return tryStatement;
  };

  const transformFunction = p => {
    const node = p.node;

    // Set function to async
    node.async = true;

    // Transform return
    const bodyStatements = node.body.body;
    const returnExp = bodyStatements[bodyStatements.length - 1];
    const callExp = returnExp.argument;
    const callBack = callExp.arguments[0];

    // if there is a .catch method then surrond the block with try...catch
    if (isPromiseCatchCall(callExp)) {
      p.node.body = j.blockStatement([
        ...bodyStatements.slice(0, bodyStatements.length - 1),
        genCatchClause(callExp, callBack)
      ]);
    } else {
      // Replace the function's body with the new content
      p.node.body = j.blockStatement([
        ...bodyStatements.slice(0, bodyStatements.length - 1),
        ...genAwait(returnExp)
      ]);
    }

    return p.node;
  };

  const replaceType = (type, filterer = funcReturnsPromise) => {
    // Loop until all promises are gone
    while (true) {
      const paths = root.find(type).filter(filterer);
      if (paths.size() === 0) {
        break;
      }
      paths.forEach(transformFunction);
    }
  };

  replaceType(j.FunctionDeclaration);
  replaceType(j.FunctionExpression);
  replaceType(j.ArrowFunctionExpression, arrowReturnsPromise);

  return root.toSource();
}
