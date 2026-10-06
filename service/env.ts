// Whether the service is running on Deno Deploy, production or a preview, which sets
// DENO_DEPLOYMENT_ID on every deployment. Deployed services are served over HTTPS and must not
// expose development tools.
export const onDenoDeploy = () => Deno.env.has('DENO_DEPLOYMENT_ID');
