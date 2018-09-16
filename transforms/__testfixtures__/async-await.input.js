function chained() {
  const foo = 'bar';

  return b()
    .then(c => c.foo())
    .then(d => d.bar())
    .then(e => e.plop());
}

const fold = () => {
  return this.unfoldedView.fadeOut(foldingDuration / 2)
    .then(() => this.foldedView.fadeIn(foldingDuration / 2))
    .then(() => this.setState({ isFolded: true }))
    .catch(e => console.log(e));
};

const takeDeposit = (app, booking, depositAmountCorrespondencyTable) => {
  const depositAmount = getDepositAmountFromCorrespondencyTable(
    booking,
    depositAmountCorrespondencyTable
  );
  const description = `Dépôt de garantie pour la réservation ${
    booking.voucherId
  }`;
  return stripeService
    .createDeposit(booking, depositAmount, description)
    .then(result =>
      booking.updateAttributes({
        depositDate: momentTz.unix(result.created).utc(),
        depositChargeId: result.id
      })
    )
    .then(() => {
      logger.debug('Successfully took the deposit', { booking });
      if (booking.isAlertSent) {
        sendDepositAlert(app, booking, depositAmount, true);
      }
      return Promise.resolve();
    })
    .catch(error => {
      logger.warn('Failed to take deposit', { booking, error });
      if (!booking.isAlertSent) {
        sendDepositAlert(app, booking, depositAmount, false);
      }
      return Promise.reject(error);
    });
};

function simple() {
  return b().then(c => {
    return c.d;
  });
}

function embedded() {
  return first().then(() => {
    return second().then(() => {
      return third();
    });
  });
}

function promiseArrowShorthand() {
  return asyncFunc().then(result => ({ result }));
}

const functionExpression = function() {
  return asyncFunc().then(result => result * 2);
};

function countUserVotes(userIds) {
  return getUsers(userIds).then(users => {
    return Promise.reduce(users, (acc, user) => {
      return user.getVoteCount().then(count => acc + count);
    });
  });
}
