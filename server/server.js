import React from 'react'
import { renderToString } from 'react-dom/server'
import { Provider } from 'react-redux'
import {StaticRouter} from 'react-router-dom'

import Root from '../client/components/root'
import configureStore from '../client/store'
module.exports = function render(initialState) {
  // Model the initial state
  const store = configureStore(initialState)
  let content = renderToString(
    <Provider store={store} >
      <StaticRouter>
        <Root />
      </StaticRouter>
    </Provider>
  );
const preloadedState = store.getState()
return {content, preloadedState};
}