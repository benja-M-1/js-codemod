async function chained() {
  const foo = 'bar';

  const c = await b();
  const d = await c.foo();
  const e = await d.bar();

  return e.plop();
}

const fold = async () => {
  try {
    await this.unfoldedView.fadeOut(foldingDuration / 2);
    await this.foldedView.fadeIn(foldingDuration / 2);
    return this.setState({ isFolded: true });
  } catch (e) {
    console.log(e);
  }
};

const takeDeposit = async (app, booking, depositAmountCorrespondencyTable) => {
  const depositAmount = getDepositAmountFromCorrespondencyTable(
    booking,
    depositAmountCorrespondencyTable
  );
  const description = `Dépôt de garantie pour la réservation ${
    booking.voucherId
  }`;

  try {
    const result = await stripeService
      .createDeposit(booking, depositAmount, description);
    await booking.updateAttributes({
      depositDate: momentTz.unix(result.created).utc(),
      depositChargeId: result.id
    });
    logger.debug('Successfully took the deposit', { booking });
    if (booking.isAlertSent) {
      sendDepositAlert(app, booking, depositAmount, true);
    }
    return Promise.resolve();
  } catch (error) {
    logger.warn('Failed to take deposit', { booking, error });
    if (!booking.isAlertSent) {
      sendDepositAlert(app, booking, depositAmount, false);
    }
    return Promise.reject(error);
  }
};

async function simple() {
  const c = await b();
  return c.d;
}

async function embedded() {
  await first();
  await second();
  return third();
}

async function promiseArrowShorthand() {
  const result = await asyncFunc();
  return { result };
}

const functionExpression = async function() {
  const result = await asyncFunc();
  return result * 2;
};

async function countUserVotes(userIds) {
  const users = await getUsers(userIds);
  return Promise.reduce(users, async (acc, user) => {
    const count = await user.getVoteCount();
    return acc + count;
  });
}
