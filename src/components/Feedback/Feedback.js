/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import s from './Feedback.css';
import AdSense from 'react-adsense';

class Feedback extends React.Component {
  render() {
    return (
      <div className={s.root}>
        <div className={s.container}>
          <AdSense.Google
            client='ca-pub-9855341278243209'
            slot='2630593778'
            format='auto'
          />

          <a
            className={s.link}
            href="https://gitter.im/fixjson/Lobby?source=orgpage"
          >Ask a question</a>
          <span className={s.spacer}>|</span>
          <a
            className={s.link}
            href="https://gitter.im/fixjson/issues"
          >Report an issue</a>
        </div>
      </div>
    );
  }
}

export default withStyles(s)(Feedback);
