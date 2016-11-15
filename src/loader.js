import Dataloader from 'dataloader';
import RP from 'request-promise';
import _ from 'lodash'
import winston from 'winston';

const level = process.env.LOG_LEVEL  || 'debug';
const LOG = new (winston.Logger)({
    level: level,
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            prettyPrint: true,
            timestamp: true,
            label: 'Loader'
        })
    ]
});

export function apiLoader(urlFn){
  return new Dataloader(keys => {
    LOG.debug("To load data by keys ", keys);
    let ps = _.map(keys, (key) => {
      return RP({
        uri:urlFn(key),
        json: true,
        transform: (body) => {
          return body.data;
        }
      });
    });
    LOG.debug("Promises", ps[0]);
    return Promise.all(ps);
  });
};
