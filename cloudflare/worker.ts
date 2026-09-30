import handler from 'vinext/server/fetch-handler';
export default {fetch(request:Request,env:any,ctx:ExecutionContext){return handler.fetch(request,env,ctx)}};
