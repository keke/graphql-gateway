import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';



function handleGetRequest(jsSchema, req, resp, next){

};


function handlePostRequest(jsSchema, req, resp, next){
  let queryBody = req.body;
  let variables = JSON.parse(queryBody.variables || '{}');
  graphql(jsSchema, queryBody.query, {}, null,
    variables,queryBody.operationName).then((result) =>{
    console.log(result);
    resp.json(result).end();
    next();
  });
};

const METHODS = {
  'GET': handleGetRequest,
  'POST': handlePostRequest
};

export default function handleQuery(options){
  const getName = options.getName
  const loadSchema = options.loadSchema;
  const loadResolvers = options.loadResolvers;
  return function(req, resp, next){
    let name = getName(req);
    console.log(`Name is ${name}`);
    //To load content
    let schemaP = loadSchema(name);
    let resolversP = loadResolvers(name);
    Promise.all([schemaP, resolversP]).then((values)=>{
      let [schema, resolvers] = values;
      console.log("Schema is ", schema);
      console.log("Resolvers is ", resolvers);
      let jsSchema = makeExecutableSchema({
        typeDefs: schema,
        resolvers: resolvers
      });
      let method = req.method;
      METHODS[method](jsSchema, req, resp, next);
    }).catch((err)=>{
      console.error(`Schema for ${name} is not found`, err);
    });
    // schema.then((data)=>{
    //   console.log("Schema is ", data)
    // }).catch((err)=>{
    //   console.error(`Schema for ${name} is not found`, err);
    // });
    // let resolvers = loadResolvers(name);
  }
}
