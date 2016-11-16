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

function processQuery(p){


}

function handleGetRequest(jsSchema, req, resp, next, loadViews, name){
  let view = req.query.view;
  LOG.debug("To handle Get Request view=", view, loadViews, name);
  loadView(loadViews, name).then(views =>{
    let viewInfo = views[view];
    let variables = viewInfo.varFn(req);
    graphql(jsSchema, viewInfo.view, {}, null,
      variables, null).then((result) =>{
      LOG.log("Result is ", result);
      resp.json(result).end();
      next();
    });
  }).catch(err=>{
    resp.end(err);
  });
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
const SchemaCache = {};
const ViewCache = {};

function loadView(loadViews, name){
  return new Promise((resolve, reject)=>{
    let view = ViewCache[name];
    if(view){
      resolve(view);
    }else{
      LOG.debug("To load view by", name, loadViews);
      loadViews(name).then(v=>{
        ViewCache[name]=v;
        resolve(v);
      }).catch(reject);
    }
  });
};

function getExecutableSchema(loadSchema, loadResolvers, name){
  return new Promise((resolve, reject)=>{
    let r = SchemaCache[name];
    if(r){
      resolve(r);
    }else{
      let schemaP = loadSchema(name);
      let resolversP = loadResolvers(name);
      Promise.all([schemaP, resolversP]).then((values)=>{
        let [schema, resolvers] = values;
        LOG.debug("Schema is ", schema);
        LOG.debug("Resolvers is ", resolvers);
        let s = makeExecutableSchema({
          typeDefs: schema,
          resolvers: resolvers
        });
        SchemaCache[name] = s;
        resolve(s);
      }).catch(reject);
    }
  });
}

const METHODS = {
  'GET': handleGetRequest,
  'POST': handlePostRequest
};

export function handleQuery(options){
  const getName = options.getName
  const loadSchema = options.loadSchema;
  const loadResolvers = options.loadResolvers;
  const loadViews = options.loadViews;

  return function(req, resp, next){
    let name = getName(req);
    LOG.info(`Name is ${name}`);
    if (!name){
      resp.status(404).end();
      next();
      return;
    }
    //To load content
    getExecutableSchema(loadSchema, loadResolvers, name).then((s)=>{
      let method = req.method;
      METHODS[method](s, req, resp, next, loadViews, name);
    }).catch((err)=>{
      LOG.error(`Schema for ${name} is not found`, err);
      resp.status(500).end();
      next();
    });
  }
}
