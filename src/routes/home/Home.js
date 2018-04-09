/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
import React, {PropTypes} from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import s from './Home.css';
import jsonic from 'jsonic';
import jsonFormat from 'json-format';
import ua from 'universal-analytics';
import {analytics} from '../../config';
import AdSense from 'react-adsense';
import clarinet from 'clarinet';


class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };

    this.handleChange = this.handleChange.bind(this);
    this.postInput = this.postInput.bind(this);
    this.fixJson = this.fixJson.bind(this);
  }

  static propTypes = {
    news: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired,
      link: PropTypes.string.isRequired,
      contentSnippet: PropTypes.string,
    })).isRequired,
  };

  handleChange(event) {
    this.setState({value: event.target.value});
  }


  fixJson(json, lastError) {
    const getJSONParseError = (json) => {
      var parser = clarinet.parser(),
        firstError = undefined;

      // generate a detailed error using the parser's state
      function makeError(e) {
        var currentNL = 0, nextNL = json.indexOf('\n'), line = 1;
        while (line < parser.line) {
          currentNL = nextNL;
          nextNL = json.indexOf('\n', currentNL + 1);
          ++line;
        }
        return {
          snippet: json.substr(currentNL + 1, nextNL - currentNL - 1),
          message: (e.message || '').split('\n', 1)[0],
          line: parser.line,
          column: parser.column
        }
      }

      // trigger the parse error
      parser.onerror = function (e) {
        firstError = makeError(e);
        parser.close();
      };
      try {
        parser.write(json).close();
      } catch (e) {
        if (firstError === undefined) {
          return makeError(e);
        } else {
          return firstError;
        }
      }

      return firstError;
    }

    const insertCharacter = (text, line, column, character) => {
      let lines = text.split(/\r?\n/);
      lines[line] = lines[line].slice(0, column) + character + lines[line].slice(column);

      return lines.join('\n');
    };

    const replacePairCharacter = (text, line, column, newChar, pairedChar) => {
      let lines = text.split(/\r?\n/);

      lines[line] = lines[line].slice(0, column) +
        newChar +
        lines[line].slice(column + 1).replace(pairedChar, newChar);

      return lines.join('\n');
    };

    const replaceCharacter = (text, line, newChar, oldChar) => {
      let lines = text.split(/\r?\n/);

      lines[line] = lines[line].replace(oldChar, newChar);

      return lines.join('\n');
    };

    try {
      console.log('Validating', json);

      // Execute first phase validator
      const result = jsonic(json);

      // Execute second phase validator (strict)
      const e = getJSONParseError(json);

      if (e && e.message === 'Bad value') {
        if (lastError && lastError.message === e.message &&
          lastError.column === e.column &&
          lastError.line === e.line) {
          // Bail out from recursive call, we cannot fix this error
          throw e;
        } else {
          if (e.snippet.indexOf('\u201C') > -1) {
            // try to fix error on validate again
            return this.fixJson(replaceCharacter(
              replaceCharacter(json, e.line - 1, '"', '\u201C'),
              e.line - 1, '"', '\u201D'));
          } else
            throw e;
        }

      } else
      // Valid json
        return json;
    }
    catch (e) {
      console.log('Error', e);

      // Missing ":" error
      if (e.message === 'Expected ":" but "\\"" found.') {
        if (lastError && lastError.message === e.message &&
          lastError.column === e.column &&
          lastError.line === e.line) {
          // Bail out from recursive call, we cannot fix this error
          throw e;
        } else
        // try to fix error on validate again
          return this.fixJson(insertCharacter(json, e.line - 1, e.column - 1, ':'), e);
      } else
      // Left quote/right quote error
      if (
        e.message === 'Expected ",", "}" or key but "\\u201C" found.' ||
        e.message === 'Expected "}" or key but "\\u201C" found.') {
        if (lastError && lastError.message === e.message &&
          lastError.column === e.column &&
          lastError.line === e.line) {
          // Bail out from recursive call, we cannot fix this error
          throw e;
        } else
        // try to fix error on validate again
          return this.fixJson(replacePairCharacter(json, e.line - 1, e.column - 1, '"', '\u201D'), e);
      } else
        throw e;
    }
  }

  addMissingCommas(str) {
    const regex = /([\"a-zA-Z0-9]+)([: ]+)([\"][\w]+[\"]([\s\n\}\]]{1,}))+(['"\w])/g;
    let m;

    while ((m = regex.exec(str)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      // console.log("m.index = " + m.index);
      // console.log("regex.lastIndex = " + regex.lastIndex);
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 5) {
          str = str.slice(0, regex.lastIndex - 1) + "," + str.slice(regex.lastIndex - 1);
        }
        // console.log(`Found match, group ${groupIndex}: ${match}`);
      });
    }

    return str;
  }

  processJson(obj) {
    let parsed = obj;

    // add if any missing commas
    parsed = this.addMissingCommas(parsed);

    parsed = this.fixJson(parsed);
    console.log("Fixed json", parsed);

    // fix the json as possible
    parsed = jsonic(parsed);

    // format json
    parsed = jsonFormat(parsed, {
      type: 'tab'
    });
    return parsed;
  }

  sendGAEvent(callback) {
    let visitor = ua(analytics.google.trackingId);
    visitor.event({
      ec: "Home",
      ea: "Submit",
      el: "Cannot Process",
      ev: JSON.stringify(this.state.value),
    }, callback);
  }

  postInput() {
    let parsed;

    try {
      parsed = this.processJson(this.state.value);
      this.setState({
        error: {
          type: 'success',
          message: 'Finished parsing.'
        },
        value: parsed
      });
    } catch (e) {
      this.setState({
          error: {
            type: 'error',
            message: e.name + " : " + e.message
          }
        }
      );
      this.sendGAEvent(function (err) {
        if (err)
          console.error(err);
      });
    }

  }


  render() {
    return (
      <div className={s.root}>
        <div className={s.container}>
          <AdSense.Google
            client='ca-pub-9855341278243209'
            slot='6033640406'
            format='link'
          />

          <h2 className={s.title}>Current support:</h2>
          <div>
            <ul>
              <li>add missing double quote(s)</li>
              <li>format json with indentations</li>
              <li>remove trailing commas</li>
              <li>try to add missing comma between properties</li>
            </ul>
          </div>
          <h2 className={s.title}>Place your json object here:</h2>

          <div>{(function (error) {
            if (error) {
              return (<div className={error.type === 'error' ? s.error : s.success}>{error.message}</div>);
            }
          })(this.state.error)}</div>
          <textarea rows="20" placeholder="Put your JSON object here." cols="120" value={this.state.value}
                    onChange={this.handleChange}>
          </textarea>
          <div>
            <button onClick={this.postInput}>Submit</button>
          </div>
        </div>

      </div>
    );
  }
}

export default withStyles(s)(Home);
