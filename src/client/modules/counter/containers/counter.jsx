import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';

import PageLayout from '../../../app/page_layout';
import AMOUNT_QUERY from '../graphql/count_get.graphql';
import ADD_COUNT_MUTATION from '../graphql/count_add_mutation.graphql';
import COUNT_SUBSCRIPTION from '../graphql/count_subscribe.graphql';

import CounterShow from '../components/counter_show';

class Counter extends React.Component {
  constructor(props) {
    super(props);

    this.subscription = null;
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.loading) {
      if (this.subscription) {
        this.subscription();
        this.subscription = null;
      }

      // Subscribe or re-subscribe
      if (!this.subscription) {
        this.subscribeToCount();
      }
    }
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription();
    }
  }

  subscribeToCount() {
    const { subscribeToMore } = this.props;
    this.subscription = subscribeToMore({
      document: COUNT_SUBSCRIPTION,
      variables: {},
      updateQuery: (prev, { subscriptionData: { data: { countUpdated: { amount } } } }) => {
        return update(prev, {
          count: {
            amount: {
              $set: amount,
            },
          }
        });
      }
    });
  }

  render() {
    const { loading, count, addCount, reduxCount, onReduxIncrement } = this.props;

    return (
      <PageLayout stockExample>
        <CounterShow
          loading={loading}
          count={count}
          addCount={addCount}
          reduxCount={reduxCount}
          onReduxIncrement={onReduxIncrement}/>
      </PageLayout>
    );
  }
}

Counter.propTypes = {
  loading: PropTypes.bool.isRequired,
  count: PropTypes.object,
  updateCountQuery: PropTypes.func,
  onReduxIncrement: PropTypes.func,
  addCount: PropTypes.func.isRequired,
  subscribeToMore: PropTypes.func.isRequired,
  reduxCount: PropTypes.number.isRequired,
};

const CounterWithApollo = compose(
  graphql(AMOUNT_QUERY, {
    props({ data: { loading, count, subscribeToMore } }) {
      return { loading, count, subscribeToMore };
    }
  }),
  graphql(ADD_COUNT_MUTATION, {
    props: ({ ownProps, mutate }) => ({
      addCount(amount) {
        return () => mutate({
          variables: { amount },
          updateQueries: {
            getCount: (prev, { mutationResult }) => {
              const newAmount = mutationResult.data.addCount.amount;
              return update(prev, {
                count: {
                  amount: {
                    $set: newAmount,
                  },
                },
              });
            },
          },
          optimisticResponse: {
            __typename: 'Mutation',
            addCount: {
              __typename: 'Count',
              amount: ownProps.count.amount + 1,
            },
          },
        });
      },
    }),
  })
)(Counter);

export default connect(
  (state) => ({ reduxCount: state.counter.reduxCount }),
  (dispatch) => ({
    onReduxIncrement(value) {
      return () => dispatch({
        type: 'COUNTER_INCREMENT',
        value: Number(value)
      });
    }
  }),
)(CounterWithApollo);
