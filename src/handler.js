import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';
import winston from 'winston';

const level = process.env.LOG_LEVEL  || 'debug';
const LOG = new (winston.Logger)({
    level: level,
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            prettyPrint: true,
            timestamp: true,
            label: 'GQLG'
        })
    ]
});

function handleGetRequest(jsSchema, req, resp, next){

};


function handlePostRequest(jsSchema, req, resp, next){
  let queryBody = req.body;
  let variables = JSON.parse(queryBody.variables || '{}');
  graphql(jsSchema, queryBody.query, {}, null,
    variables,queryBody.operationName).then((result) =>{
    LOG.log("Result is ", result);
    resp.json(result).end();
    next();
  });
};

const METHODS = {
  'GET': handleGetRequest,
  'POST': handlePostRequest
};

export function handleQuery(options){
  const getName = options.getName
  const loadSchema = options.loadSchema;
  const loadResolvers = options.loadResolvers;
  return function(req, resp, next){
    let name = getName(req);
    LOG.info(`Name is ${name}`);
    if (!name){
      resp.status(404).end();
      next();
      return;
    }
    //To load content
    let schemaP = loadSchema(name);
    let resolversP = loadResolvers(name);
    Promise.all([schemaP, resolversP]).then((values)=>{
      let [schema, resolvers] = values;
      LOG.debug("Schema is ", schema);
      LOG.debug("Resolvers is ", resolvers);
      let jsSchema = makeExecutableSchema({
        typeDefs: schema,
        resolvers: resolvers
      });
      let method = req.method;
      METHODS[method](jsSchema, req, resp, next);
    }).catch((err)=>{
      LOG.error(`Schema for ${name} is not found`, err);
      resp.status(500).end();
      next();
    });
    // schema.then((data)=>{
    //   console.log("Schema is ", data)
    // }).catch((err)=>{
    //   console.error(`Schema for ${name} is not found`, err);
    // });
    // let resolvers = loadResolvers(name);
  }
}
